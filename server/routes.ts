import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertReleaseSchema, insertStageSchema, insertTaskSchema, insertBlockerSchema, insertWorkspaceInvitationSchema } from "@shared/schema";
import { z } from "zod";
import { randomBytes } from "crypto";
import { sendInvitationEmail } from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
  // Helper: Get user's teams and validate access
  async function getUserTeams(userId: string) {
    const workspaces = await storage.getWorkspacesByUser(userId);
    if (workspaces.length === 0) return [];
    const teams = await storage.getTeamsByWorkspace(workspaces[0].id);
    return teams;
  }
  
  async function validateTeamAccess(userId: string, teamId: string) {
    const teams = await getUserTeams(userId);
    return teams.some(t => t.id === teamId);
  }

  // Setup authentication routes
  setupAuth(app);

  // Workspaces
  app.get("/api/workspaces", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const workspaces = await storage.getWorkspacesByUser(req.user!.id);
      res.json(workspaces);
    } catch (error) {
      next(error);
    }
  });

  // Teams (Projects)
  app.get("/api/teams", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const workspaces = await storage.getWorkspacesByUser(req.user!.id);
      if (workspaces.length === 0) {
        return res.json([]);
      }
      
      const teams = await storage.getTeamsByWorkspace(workspaces[0].id);
      res.json(teams);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/teams", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const workspaces = await storage.getWorkspacesByUser(req.user!.id);
      if (workspaces.length === 0) {
        return res.status(400).json({ message: "No workspace found" });
      }
      
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Team name is required" });
      }
      
      const team = await storage.createTeam({
        workspaceId: workspaces[0].id,
        name,
        description: description || null,
      });
      
      // Create default environments for the new team
      const defaultEnvs = [
        { name: "Staging", sortOrder: "1" },
        { name: "UAT", sortOrder: "2" },
        { name: "Production", sortOrder: "3" },
      ];
      
      for (const env of defaultEnvs) {
        await storage.createEnvironment({
          teamId: team.id,
          name: env.name,
          sortOrder: env.sortOrder,
          isDefault: true,
        });
      }
      
      res.status(201).json(team);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ message: "A project with this name already exists" });
      }
      next(error);
    }
  });

  app.delete("/api/teams/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const workspaces = await storage.getWorkspacesByUser(req.user!.id);
      if (workspaces.length === 0) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify team belongs to user's workspace
      if (team.workspaceId !== workspaces[0].id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteTeam(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      await storage.getReleases();
      res.json({ status: "ok", database: "connected" });
    } catch (error: any) {
      res.status(500).json({ 
        status: "error", 
        database: "disconnected",
        error: error.message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack })
      });
    }
  });

  // Environments
  app.post("/api/teams/:teamId/environments", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { teamId } = req.params;
      const hasAccess = await validateTeamAccess(req.user!.id, teamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { name, description, sortOrder } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Environment name is required" });
      }
      
      const environment = await storage.createEnvironment({
        teamId,
        name,
        description: description || undefined,
        sortOrder: sortOrder || "0",
        isDefault: false,
      });
      
      res.status(201).json(environment);
    } catch (error: any) {
      // Handle duplicate environment name error
      if (error.code === '23505' && error.constraint === 'environments_team_id_name_unique') {
        return res.status(400).json({ 
          message: `An environment with the name "${req.body.name}" already exists in this team.` 
        });
      }
      next(error);
    }
  });

  app.delete("/api/environments/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { id } = req.params;
      
      // Get the environment to verify team access
      const environment = await storage.getEnvironment(id);
      if (!environment) {
        return res.status(404).json({ message: "Environment not found" });
      }
      
      // Verify user has access to the team
      const hasAccess = await validateTeamAccess(req.user!.id, environment.teamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the environment (cascade will delete stages)
      await storage.deleteEnvironment(id);
      
      res.sendStatus(204);
    } catch (error: any) {
      // Handle foreign key constraint violations
      if (error.code === '23503') {
        return res.status(400).json({ 
          message: "Cannot delete environment because it's still being used. Please remove it from all releases first." 
        });
      }
      // Handle other database errors gracefully
      if (error.code) {
        return res.status(500).json({ message: "Failed to delete environment. Please try again." });
      }
      next(error);
    }
  });

  // Releases
  app.get("/api/releases", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      // Get user's workspaces and teams
      const workspaces = await storage.getWorkspacesByUser(req.user!.id);
      if (workspaces.length === 0) {
        return res.json([]);
      }
      
      const teams = await storage.getTeamsByWorkspace(workspaces[0].id);
      if (teams.length === 0) {
        return res.json([]);
      }
      
      // Validate teamId if provided
      const requestedTeamId = req.query.teamId as string | undefined;
      const teamId = requestedTeamId || teams[0].id;
      
      // Security: Verify teamId belongs to user's workspace
      const hasAccess = teams.some(t => t.id === teamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this team" });
      }
      
      const releases = await storage.getReleases({ teamId });
      
      // Attach stages, environments, and blockers to each release for filtering
      const releasesWithStages = await Promise.all(
        releases.map(async (release) => {
          const stages = await storage.getStagesByRelease(release.id);
          const stagesWithBlockers = await Promise.all(
            stages.map(async (stage) => {
              const environment = await storage.getEnvironment(stage.environmentId);
              const blockers = await storage.getBlockersByStage(stage.id, true);
              return { ...stage, environment, blockers };
            })
          );
          return { ...release, stages: stagesWithBlockers };
        })
      );
      
      res.json(releasesWithStages);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/releases/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const release = await storage.getRelease(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
      
      // Verify user has access to this release's team
      const hasAccess = await validateTeamAccess(req.user!.id, release.teamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get stages for this release
      const stages = await storage.getStagesByRelease(req.params.id);
      
      // Get tasks, environment, and blockers for each stage
      const stagesWithData = await Promise.all(
        stages.map(async (stage) => {
          const tasks = await storage.getTasksByStage(stage.id);
          const blockers = await storage.getBlockersByStage(stage.id, true);
          const environment = await storage.getEnvironment(stage.environmentId);
          return { ...stage, tasks, blockers, environment };
        })
      );
      
      res.json({ ...release, stages: stagesWithData });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/releases", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      // Get user's workspaces and teams
      const workspaces = await storage.getWorkspacesByUser(req.user!.id);
      if (workspaces.length === 0) {
        return res.status(400).json({ message: "No workspace found" });
      }
      
      const teams = await storage.getTeamsByWorkspace(workspaces[0].id);
      if (teams.length === 0) {
        return res.status(400).json({ message: "No team found" });
      }
      
      // Determine teamId and validate authorization
      const requestedTeamId = req.body.teamId || teams[0].id;
      
      // Security: Verify teamId belongs to user's workspace
      const hasAccess = teams.some(t => t.id === requestedTeamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this team" });
      }
      
      const data = insertReleaseSchema.parse({
        ...req.body,
        teamId: requestedTeamId,
        createdBy: req.user!.id,
      });
      
      const release = await storage.createRelease(data);
      
      // Get default environments for this team and create stages
      const environments = await storage.getEnvironmentsByTeam(data.teamId);
      for (const environment of environments) {
        await storage.createStage({
          releaseId: release.id,
          environmentId: environment.id,
          status: "not_started",
        });
      }
      
      // Log activity
      await storage.createActivityLog({
        workspaceId: workspaces[0].id,
        releaseId: release.id,
        actor: req.user!.username,
        action: "release.created",
        meta: { releaseName: release.name },
      });
      
      res.status(201).json(release);
    } catch (error: any) {
      console.error("Error creating release:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error.code) {
        console.error("Database error code:", error.code);
      }
      if (error.message) {
        console.error("Database error message:", error.message);
      }
      next(error);
    }
  });

  app.patch("/api/releases/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const existing = await storage.getRelease(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Release not found" });
      }
      
      const hasAccess = await validateTeamAccess(req.user!.id, existing.teamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const data = insertReleaseSchema.partial().parse(req.body);
      const release = await storage.updateRelease(req.params.id, data);
      res.json(release);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/releases/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const existing = await storage.getRelease(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Release not found" });
      }
      
      const hasAccess = await validateTeamAccess(req.user!.id, existing.teamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteRelease(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Stages
  app.post("/api/releases/:releaseId/stages", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { releaseId } = req.params;
      const release = await storage.getRelease(releaseId);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
      
      const hasAccess = await validateTeamAccess(req.user!.id, release.teamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const data = insertStageSchema.parse({
        ...req.body,
        releaseId,
      });
      
      const stage = await storage.createStage(data);
      res.status(201).json(stage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.get("/api/stages/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const stage = await storage.getStage(req.params.id);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }
      
      const release = await storage.getRelease(stage.releaseId);
      if (!release || !(await validateTeamAccess(req.user!.id, release.teamId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tasks = await storage.getTasksByStage(stage.id);
      const blockers = await storage.getBlockersByStage(stage.id);
      
      res.json({ ...stage, tasks, blockers });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/stages/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const existing = await storage.getStage(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Stage not found" });
      }
      
      const release = await storage.getRelease(existing.releaseId);
      if (!release || !(await validateTeamAccess(req.user!.id, release.teamId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const data = insertStageSchema.partial().parse(req.body);
      const stage = await storage.updateStage(req.params.id, data);
      
      // Log activity
      await storage.createActivityLog({
        workspaceId: (await storage.getWorkspacesByUser(req.user!.id))[0]?.id,
        releaseId: stage!.releaseId,
        stageId: stage!.id,
        actor: req.user!.username,
        action: "stage.updated",
        meta: { changes: data },
      });
      
      res.json(stage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.post("/api/stages/:id/approve", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const stage = await storage.getStage(req.params.id);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }
      
      const release = await storage.getRelease(stage.releaseId);
      if (!release || !(await validateTeamAccess(req.user!.id, release.teamId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { approver, note } = req.body;
      
      // Check if all required tasks are done
      const tasks = await storage.getTasksByStage(stage.id);
      const requiredTasks = tasks.filter(t => t.required);
      const allRequiredDone = requiredTasks.every(t => t.status === "done");
      
      if (!allRequiredDone) {
        return res.status(400).json({ 
          message: "Cannot approve stage: not all required tasks are completed" 
        });
      }
      
      // Update stage
      const updatedStage = await storage.updateStage(req.params.id, {
        approver,
        status: "done",
        endedAt: new Date(),
      });
      
      // Log activity
      await storage.createActivityLog({
        workspaceId: (await storage.getWorkspacesByUser(req.user!.id))[0]?.id,
        releaseId: stage.releaseId,
        stageId: stage.id,
        actor: approver || req.user!.username,
        action: "stage.approved",
        meta: { note },
      });
      
      res.json(updatedStage);
    } catch (error) {
      next(error);
    }
  });

  // Tasks
  app.post("/api/stages/:stageId/tasks", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const stage = await storage.getStage(req.params.stageId);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }
      
      const release = await storage.getRelease(stage.releaseId);
      if (!release || !(await validateTeamAccess(req.user!.id, release.teamId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const data = insertTaskSchema.parse({ ...req.body, stageId: req.params.stageId });
      const task = await storage.createTask(data);
      
      // Log activity
      await storage.createActivityLog({
        workspaceId: (await storage.getWorkspacesByUser(req.user!.id))[0]?.id,
        releaseId: stage.releaseId,
        stageId: stage.id,
        actor: req.user!.username,
        action: "task.created",
        meta: { taskId: task.id, taskTitle: task.title },
      });
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/tasks/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const stage = await storage.getStage(task.stageId);
      if (!stage) return res.sendStatus(404);
      
      const release = await storage.getRelease(stage.releaseId);
      if (!release || !(await validateTeamAccess(req.user!.id, release.teamId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const data = insertTaskSchema.partial().parse(req.body);
      const updatedTask = await storage.updateTask(req.params.id, data);
      
      await storage.createActivityLog({
        workspaceId: (await storage.getWorkspacesByUser(req.user!.id))[0]?.id,
        releaseId: stage.releaseId,
        stageId: stage.id,
        actor: req.user!.username,
        action: "task.updated",
        meta: { taskId: task.id, changes: data },
      });
      
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/tasks/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const stage = await storage.getStage(task.stageId);
      if (!stage) return res.sendStatus(404);
      
      const release = await storage.getRelease(stage.releaseId);
      if (!release || !(await validateTeamAccess(req.user!.id, release.teamId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Blockers
  app.post("/api/stages/:stageId/blockers", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const stage = await storage.getStage(req.params.stageId);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }
      
      const release = await storage.getRelease(stage.releaseId);
      if (!release || !(await validateTeamAccess(req.user!.id, release.teamId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const data = insertBlockerSchema.parse({ ...req.body, stageId: req.params.stageId });
      const blocker = await storage.createBlocker(data);
      
      // Update stage status to blocked if not already
      if (stage.status !== "blocked") {
        await storage.updateStage(stage.id, { status: "blocked" });
      }
      
      // Log activity
      await storage.createActivityLog({
        workspaceId: (await storage.getWorkspacesByUser(req.user!.id))[0]?.id,
        releaseId: stage.releaseId,
        stageId: stage.id,
        actor: req.user!.username,
        action: "blocker.created",
        meta: { blockerId: blocker.id, severity: blocker.severity },
      });
      
      res.status(201).json(blocker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/blockers/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const blocker = await storage.getBlocker(req.params.id);
      if (!blocker) {
        return res.status(404).json({ message: "Blocker not found" });
      }
      
      const stage = await storage.getStage(blocker.stageId);
      if (!stage) return res.sendStatus(404);
      
      const release = await storage.getRelease(stage.releaseId);
      if (!release || !(await validateTeamAccess(req.user!.id, release.teamId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const data = insertBlockerSchema.partial().parse(req.body);
      const updatedBlocker = await storage.updateBlocker(req.params.id, data);
      
      // If blocker is resolved, check if stage should be unblocked
      if (data.active === false) {
        const activeBlockers = await storage.getBlockersByStage(stage.id, true);
        if (activeBlockers.length === 0 && stage.status === "blocked") {
          await storage.updateStage(stage.id, { status: "in_progress" });
        }
      }
      
      await storage.createActivityLog({
        workspaceId: (await storage.getWorkspacesByUser(req.user!.id))[0]?.id,
        releaseId: stage.releaseId,
        stageId: stage.id,
        actor: req.user!.username,
        action: "blocker.updated",
        meta: { blockerId: blocker.id, changes: data },
      });
      
      res.json(updatedBlocker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/blockers/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const blocker = await storage.getBlocker(req.params.id);
      if (!blocker) {
        return res.status(404).json({ message: "Blocker not found" });
      }
      
      const stage = await storage.getStage(blocker.stageId);
      if (!stage) return res.sendStatus(404);
      
      const release = await storage.getRelease(stage.releaseId);
      if (!release || !(await validateTeamAccess(req.user!.id, release.teamId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteBlocker(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Diagrams
  app.get("/api/releases/:releaseId/diagram", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const release = await storage.getRelease(req.params.releaseId);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
      
      const hasAccess = await validateTeamAccess(req.user!.id, release.teamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const diagram = await storage.getDiagramByRelease(req.params.releaseId);
      if (!diagram) {
        return res.status(404).json({ message: "Diagram not found" });
      }
      res.json(diagram);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/releases/:releaseId/diagram", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const release = await storage.getRelease(req.params.releaseId);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
      
      const hasAccess = await validateTeamAccess(req.user!.id, release.teamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { layout } = req.body;
      const diagram = await storage.updateDiagramLayout(req.params.releaseId, layout);
      res.json(diagram);
    } catch (error) {
      next(error);
    }
  });

  // Activity Log
  app.get("/api/activity", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const releaseId = req.query.releaseId as string | undefined;
      const stageId = req.query.stageId as string | undefined;
      
      // Always validate access to the release
      let release;
      if (releaseId) {
        release = await storage.getRelease(releaseId);
      } else if (stageId) {
        const stage = await storage.getStage(stageId);
        if (stage) {
          release = await storage.getRelease(stage.releaseId);
        }
      }
      
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
      
      const hasAccess = await validateTeamAccess(req.user!.id, release.teamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const logs = await storage.getActivityLog({ releaseId, stageId });
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard
  app.get("/api/dashboard", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const teams = await getUserTeams(req.user!.id);
      if (teams.length === 0) {
        return res.json([]);
      }
      
      const requestedTeamId = req.query.teamId as string | undefined;
      const teamId = requestedTeamId || teams[0].id;
      
      const hasAccess = teams.some(t => t.id === teamId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const releases = await storage.getReleases({ teamId });
      
      // Calculate status and progress for each release
      const releasesWithStatus = await Promise.all(
        releases.map(async (release) => {
          const stages = await storage.getStagesByRelease(release.id);
          
          const stagesWithTasks = await Promise.all(
            stages.map(async (stage) => {
              const tasks = await storage.getTasksByStage(stage.id);
              return { ...stage, tasks };
            })
          );
          
          // Calculate overall progress
          const allTasks = stagesWithTasks.flatMap(s => s.tasks);
          const completedTasks = allTasks.filter(t => t.status === "done").length;
          const progress = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;
          
          // Determine overall status
          let status: "not_started" | "in_progress" | "blocked" | "done" = "not_started";
          if (stagesWithTasks.some(s => s.status === "blocked")) {
            status = "blocked";
          } else if (stagesWithTasks.some(s => s.status === "in_progress")) {
            status = "in_progress";
          } else if (stagesWithTasks.every(s => s.status === "done")) {
            status = "done";
          } else if (stagesWithTasks.some(s => s.status === "in_progress" || s.status === "done")) {
            status = "in_progress";
          }
          
          return {
            ...release,
            status,
            progress,
            stages: stagesWithTasks.length,
          };
        })
      );
      
      res.json({ releases: releasesWithStatus });
    } catch (error) {
      next(error);
    }
  });

  // Workspace Invitations
  app.post("/api/invitations", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      // Validate request body
      const validationResult = insertWorkspaceInvitationSchema.extend({
        workspaceId: z.string(),
      }).safeParse({
        email: req.body.email,
        role: req.body.role,
        workspaceId: req.body.workspaceId,
        inviterId: req.user!.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid invitation data",
          errors: validationResult.error.errors,
        });
      }

      const { email, role, workspaceId } = validationResult.data;

      // Verify user has admin access to the workspace
      const workspaces = await storage.getWorkspacesByUser(req.user!.id);
      const workspace = workspaces.find(w => w.id === workspaceId);
      
      if (!workspace) {
        return res.status(403).json({ message: "Access denied to this workspace" });
      }

      const workspaceMember = await storage.getWorkspaceMemberByUserAndWorkspace(req.user!.id, workspaceId);
      if (!workspaceMember || workspaceMember.role !== "admin") {
        return res.status(403).json({ message: "Only workspace admins can invite members" });
      }

      // Check if user already exists and is a member
      const existingInvitations = await storage.getWorkspaceInvitations(workspaceId);
      const hasPendingInvite = existingInvitations.some(
        inv => inv.email === email && inv.status === "pending"
      );
      
      if (hasPendingInvite) {
        return res.status(400).json({ message: "An invitation has already been sent to this email" });
      }

      // Create invitation
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const invitation = await storage.createWorkspaceInvitation({
        workspaceId,
        email,
        inviterId: req.user!.id,
        role: role || "developer",
        token,
        expiresAt,
      });

      // Send invitation email
      try {
        // Get base URL from request headers
        const host = req.get('host');
        await sendInvitationEmail(
          email,
          req.user!.username,
          workspace.name,
          role || "developer",
          token,
          host
        );
      } catch (emailError: any) {
        console.error("Failed to send invitation email:", emailError);
        // Don't fail the request if email fails, just log it
      }

      res.status(201).json(invitation);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/invitations", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const workspaces = await storage.getWorkspacesByUser(req.user!.id);
      if (workspaces.length === 0) {
        return res.json([]);
      }

      // Verify user is an admin of the workspace
      const workspaceMember = await storage.getWorkspaceMemberByUserAndWorkspace(
        req.user!.id,
        workspaces[0].id
      );
      if (!workspaceMember || workspaceMember.role !== "admin") {
        return res.status(403).json({ message: "Only workspace admins can view invitations" });
      }

      const invitations = await storage.getWorkspaceInvitations(workspaces[0].id);
      
      // Remove sensitive token data from response
      const sanitizedInvitations = invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
        acceptedAt: inv.acceptedAt,
        expiresAt: inv.expiresAt,
      }));
      
      res.json(sanitizedInvitations);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/invitations/:token", async (req, res, next) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getWorkspaceInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "This invitation has already been used" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ message: "This invitation has expired" });
      }

      const workspace = await storage.getWorkspace(invitation.workspaceId);
      const inviter = await storage.getUser(invitation.inviterId);

      res.json({
        ...invitation,
        workspaceName: workspace?.name,
        inviterName: inviter?.username,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/invitations/:token/accept", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const { token } = req.params;
      const invitation = await storage.getWorkspaceInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "This invitation has already been used" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ message: "This invitation has expired" });
      }

      // Check if user's email matches the invitation
      if (req.user!.email !== invitation.email) {
        return res.status(403).json({ 
          message: "This invitation was sent to a different email address" 
        });
      }

      // Add user to workspace
      await storage.createWorkspaceMember({
        workspaceId: invitation.workspaceId,
        userId: req.user!.id,
        role: invitation.role,
        status: "active",
      });

      // Update invitation status
      await storage.updateWorkspaceInvitation(invitation.id, {
        status: "accepted",
        acceptedAt: new Date(),
        invitedUserId: req.user!.id,
      });

      res.json({ message: "Invitation accepted successfully" });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReleaseSchema, insertStageSchema, insertTaskSchema, insertBlockerSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Releases
  app.get("/api/releases", async (req, res, next) => {
    try {
      const team = req.query.team as string | undefined;
      const status = req.query.status as string | undefined;
      const releases = await storage.getReleases({ team, status });
      res.json(releases);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/releases/:id", async (req, res, next) => {
    try {
      const release = await storage.getRelease(req.params.id);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
      
      // Get stages for this release
      const stages = await storage.getStagesByRelease(req.params.id);
      
      // Get tasks for each stage
      const stagesWithTasks = await Promise.all(
        stages.map(async (stage) => {
          const tasks = await storage.getTasksByStage(stage.id);
          const blockers = await storage.getBlockersByStage(stage.id, true);
          return { ...stage, tasks, blockers };
        })
      );
      
      res.json({ ...release, stages: stagesWithTasks });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/releases", async (req, res, next) => {
    try {
      const data = insertReleaseSchema.parse(req.body);
      const release = await storage.createRelease(data);
      
      // Create default stages for the release
      const defaultEnvs = ["staging", "uat", "prod"] as const;
      for (const env of defaultEnvs) {
        await storage.createStage({
          releaseId: release.id,
          env,
          status: "not_started",
        });
      }
      
      // Log activity
      await storage.createActivityLog({
        releaseId: release.id,
        actor: data.createdBy || "system",
        action: "release.created",
        meta: { releaseName: release.name },
      });
      
      res.status(201).json(release);
    } catch (error: any) {
      console.error("Error creating release:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      // Log database errors
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
      const data = insertReleaseSchema.partial().parse(req.body);
      const release = await storage.updateRelease(req.params.id, data);
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
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
      const deleted = await storage.deleteRelease(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Release not found" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Stages
  app.get("/api/stages/:id", async (req, res, next) => {
    try {
      const stage = await storage.getStage(req.params.id);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
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
      const data = insertStageSchema.partial().parse(req.body);
      const stage = await storage.updateStage(req.params.id, data);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        releaseId: stage.releaseId,
        stageId: stage.id,
        actor: "system",
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
      const stage = await storage.getStage(req.params.id);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
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
        endedAt: new Date().toISOString(),
      });
      
      // Log activity
      await storage.createActivityLog({
        releaseId: stage.releaseId,
        stageId: stage.id,
        actor: approver || "system",
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
      const stage = await storage.getStage(req.params.stageId);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }
      
      const data = insertTaskSchema.parse({ ...req.body, stageId: req.params.stageId });
      const task = await storage.createTask(data);
      
      // Log activity
      await storage.createActivityLog({
        releaseId: stage.releaseId,
        stageId: stage.id,
        actor: "system",
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
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const data = insertTaskSchema.partial().parse(req.body);
      const updatedTask = await storage.updateTask(req.params.id, {
        ...data,
        updatedAt: new Date(),
      });
      
      // Get stage for logging
      const stage = await storage.getStage(task.stageId);
      if (stage) {
        await storage.createActivityLog({
          releaseId: stage.releaseId,
          stageId: stage.id,
          actor: "system",
          action: "task.updated",
          meta: { taskId: task.id, changes: data },
        });
      }
      
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
      const deleted = await storage.deleteTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Blockers
  app.post("/api/stages/:stageId/blockers", async (req, res, next) => {
    try {
      const stage = await storage.getStage(req.params.stageId);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }
      
      const data = insertBlockerSchema.parse({ ...req.body, stageId: req.params.stageId });
      const blocker = await storage.createBlocker(data);
      
      // Update stage status to blocked if not already
      if (stage.status !== "blocked") {
        await storage.updateStage(stage.id, { status: "blocked" });
      }
      
      // Log activity
      await storage.createActivityLog({
        releaseId: stage.releaseId,
        stageId: stage.id,
        actor: "system",
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
      const blocker = await storage.getBlocker(req.params.id);
      if (!blocker) {
        return res.status(404).json({ message: "Blocker not found" });
      }
      
      const data = insertBlockerSchema.partial().parse(req.body);
      const updatedBlocker = await storage.updateBlocker(req.params.id, data);
      
      // If blocker is resolved, check if stage should be unblocked
      if (data.active === false) {
        const stage = await storage.getStage(blocker.stageId);
        if (stage) {
          const activeBlockers = await storage.getBlockersByStage(stage.id, true);
          if (activeBlockers.length === 0 && stage.status === "blocked") {
            await storage.updateStage(stage.id, { status: "in_progress" });
          }
        }
      }
      
      // Get stage for logging
      const stage = await storage.getStage(blocker.stageId);
      if (stage) {
        await storage.createActivityLog({
          releaseId: stage.releaseId,
          stageId: stage.id,
          actor: "system",
          action: "blocker.updated",
          meta: { blockerId: blocker.id, changes: data },
        });
      }
      
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
      const deleted = await storage.deleteBlocker(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Blocker not found" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Diagrams
  app.get("/api/releases/:releaseId/diagram", async (req, res, next) => {
    try {
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
      const releaseId = req.query.releaseId as string | undefined;
      const stageId = req.query.stageId as string | undefined;
      const logs = await storage.getActivityLog({ releaseId, stageId });
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  // Dashboard
  app.get("/api/dashboard", async (req, res, next) => {
    try {
      const team = req.query.team as string | undefined;
      const releases = await storage.getReleases({ team });
      
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

  const httpServer = createServer(app);

  return httpServer;
}

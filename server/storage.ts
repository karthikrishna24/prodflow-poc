import { db, pool } from "./db";
import {
  type User,
  type InsertUser,
  type Workspace,
  type InsertWorkspace,
  type WorkspaceMember,
  type InsertWorkspaceMember,
  type WorkspaceInvitation,
  type InsertWorkspaceInvitation,
  type Team,
  type InsertTeam,
  type TeamMember,
  type InsertTeamMember,
  type Environment,
  type InsertEnvironment,
  type Release,
  type InsertRelease,
  type Stage,
  type InsertStage,
  type Flow,
  type InsertFlow,
  type Task,
  type InsertTask,
  type Blocker,
  type InsertBlocker,
  type Diagram,
  type InsertDiagram,
  type ActivityLog,
  type InsertActivityLog,
  users,
  workspaces,
  workspaceMembers,
  workspaceInvitations,
  teams,
  teamMembers,
  environments,
  releases,
  stages,
  flows,
  tasks,
  blockers,
  diagrams,
  diagramNodes,
  stageDiagrams,
  activityLog,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Workspaces
  getWorkspace(id: string): Promise<Workspace | undefined>;
  getWorkspaceBySlug(slug: string): Promise<Workspace | undefined>;
  getWorkspacesByUser(userId: string): Promise<Workspace[]>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  updateWorkspace(id: string, data: Partial<InsertWorkspace>): Promise<Workspace | undefined>;
  deleteWorkspace(id: string): Promise<boolean>;

  // Workspace Members
  getWorkspaceMember(id: string): Promise<WorkspaceMember | undefined>;
  getWorkspaceMemberByUserAndWorkspace(userId: string, workspaceId: string): Promise<WorkspaceMember | undefined>;
  getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]>;
  createWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember>;
  updateWorkspaceMember(id: string, data: Partial<InsertWorkspaceMember>): Promise<WorkspaceMember | undefined>;
  deleteWorkspaceMember(id: string): Promise<boolean>;

  // Workspace Invitations
  getWorkspaceInvitation(id: string): Promise<WorkspaceInvitation | undefined>;
  getWorkspaceInvitationByToken(token: string): Promise<WorkspaceInvitation | undefined>;
  getWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]>;
  createWorkspaceInvitation(invitation: InsertWorkspaceInvitation & { token: string }): Promise<WorkspaceInvitation>;
  updateWorkspaceInvitation(id: string, data: Partial<WorkspaceInvitation>): Promise<WorkspaceInvitation | undefined>;
  deleteWorkspaceInvitation(id: string): Promise<boolean>;

  // Teams
  getTeam(id: string): Promise<Team | undefined>;
  getTeamsByWorkspace(workspaceId: string): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, data: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;

  // Team Members
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, data: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<boolean>;

  // Environments
  getEnvironment(id: string): Promise<Environment | undefined>;
  getEnvironmentsByTeam(teamId: string): Promise<Environment[]>;
  createEnvironment(environment: InsertEnvironment): Promise<Environment>;
  updateEnvironment(id: string, data: Partial<InsertEnvironment>): Promise<Environment | undefined>;
  deleteEnvironment(id: string): Promise<boolean>;

  // Releases
  getReleases(filters?: { teamId?: string }): Promise<Release[]>;
  getRelease(id: string): Promise<Release | undefined>;
  createRelease(release: InsertRelease): Promise<Release>;
  updateRelease(id: string, data: Partial<InsertRelease>): Promise<Release | undefined>;
  deleteRelease(id: string): Promise<boolean>;

  // Stages
  getStagesByRelease(releaseId: string): Promise<Stage[]>;
  getStage(id: string): Promise<Stage | undefined>;
  createStage(stage: InsertStage): Promise<Stage>;
  updateStage(id: string, data: Partial<InsertStage>): Promise<Stage | undefined>;
  deleteStage(id: string): Promise<boolean>;

  // Flows
  getFlowsByStage(stageId: string): Promise<Flow[]>;
  getFlow(id: string): Promise<Flow | undefined>;
  createFlow(flow: InsertFlow): Promise<Flow>;
  updateFlow(id: string, data: Partial<InsertFlow>): Promise<Flow | undefined>;
  deleteFlow(id: string): Promise<boolean>;

  // Tasks
  getTasksByStage(stageId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Blockers
  getBlockersByStage(stageId: string, activeOnly?: boolean): Promise<Blocker[]>;
  getBlocker(id: string): Promise<Blocker | undefined>;
  createBlocker(blocker: InsertBlocker): Promise<Blocker>;
  updateBlocker(id: string, data: Partial<InsertBlocker>): Promise<Blocker | undefined>;
  deleteBlocker(id: string): Promise<boolean>;

  // Diagrams
  getDiagramByRelease(releaseId: string): Promise<Diagram | undefined>;
  createOrUpdateDiagram(diagram: InsertDiagram): Promise<Diagram>;
  updateDiagramLayout(releaseId: string, layout: any): Promise<Diagram | undefined>;

  // Activity Log
  getActivityLog(filters?: { workspaceId?: string; releaseId?: string; stageId?: string }): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Session Store
  sessionStore: session.Store;
}

class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ pool, createTableIfMissing: true });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Workspaces
  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const result = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    return result[0];
  }

  async getWorkspaceBySlug(slug: string): Promise<Workspace | undefined> {
    const result = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
    return result[0];
  }

  async getWorkspacesByUser(userId: string): Promise<Workspace[]> {
    const result = await db
      .select({ workspace: workspaces })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId));
    return result.map(r => r.workspace);
  }

  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    const result = await db.insert(workspaces).values(workspace).returning();
    return result[0];
  }

  async updateWorkspace(id: string, data: Partial<InsertWorkspace>): Promise<Workspace | undefined> {
    const result = await db.update(workspaces).set(data).where(eq(workspaces.id, id)).returning();
    return result[0];
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    const result = await db.delete(workspaces).where(eq(workspaces.id, id)).returning();
    return result.length > 0;
  }

  // Workspace Members
  async getWorkspaceMember(id: string): Promise<WorkspaceMember | undefined> {
    const result = await db.select().from(workspaceMembers).where(eq(workspaceMembers.id, id)).limit(1);
    return result[0];
  }

  async getWorkspaceMemberByUserAndWorkspace(userId: string, workspaceId: string): Promise<WorkspaceMember | undefined> {
    const result = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))
      .limit(1);
    return result[0];
  }

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
  }

  async createWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember> {
    const result = await db.insert(workspaceMembers).values(member).returning();
    return result[0];
  }

  async updateWorkspaceMember(id: string, data: Partial<InsertWorkspaceMember>): Promise<WorkspaceMember | undefined> {
    const result = await db.update(workspaceMembers).set(data).where(eq(workspaceMembers.id, id)).returning();
    return result[0];
  }

  async deleteWorkspaceMember(id: string): Promise<boolean> {
    const result = await db.delete(workspaceMembers).where(eq(workspaceMembers.id, id)).returning();
    return result.length > 0;
  }

  // Workspace Invitations
  async getWorkspaceInvitation(id: string): Promise<WorkspaceInvitation | undefined> {
    const result = await db.select().from(workspaceInvitations).where(eq(workspaceInvitations.id, id)).limit(1);
    return result[0];
  }

  async getWorkspaceInvitationByToken(token: string): Promise<WorkspaceInvitation | undefined> {
    const result = await db.select().from(workspaceInvitations).where(eq(workspaceInvitations.token, token)).limit(1);
    return result[0];
  }

  async getWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    return await db.select().from(workspaceInvitations).where(eq(workspaceInvitations.workspaceId, workspaceId));
  }

  async createWorkspaceInvitation(invitation: InsertWorkspaceInvitation & { token: string }): Promise<WorkspaceInvitation> {
    const result = await db.insert(workspaceInvitations).values(invitation).returning();
    return result[0];
  }

  async updateWorkspaceInvitation(id: string, data: Partial<WorkspaceInvitation>): Promise<WorkspaceInvitation | undefined> {
    const result = await db.update(workspaceInvitations).set(data).where(eq(workspaceInvitations.id, id)).returning();
    return result[0];
  }

  async deleteWorkspaceInvitation(id: string): Promise<boolean> {
    const result = await db.delete(workspaceInvitations).where(eq(workspaceInvitations.id, id)).returning();
    return result.length > 0;
  }

  // Teams
  async getTeam(id: string): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return result[0];
  }

  async getTeamsByWorkspace(workspaceId: string): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.workspaceId, workspaceId));
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const result = await db.insert(teams).values(team).returning();
    return result[0];
  }

  async updateTeam(id: string, data: Partial<InsertTeam>): Promise<Team | undefined> {
    const result = await db.update(teams).set(data).where(eq(teams.id, id)).returning();
    return result[0];
  }

  async deleteTeam(id: string): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
  }

  // Team Members
  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const result = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
    return result[0];
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const result = await db.insert(teamMembers).values(member).returning();
    return result[0];
  }

  async updateTeamMember(id: string, data: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const result = await db.update(teamMembers).set(data).where(eq(teamMembers.id, id)).returning();
    return result[0];
  }

  async deleteTeamMember(id: string): Promise<boolean> {
    const result = await db.delete(teamMembers).where(eq(teamMembers.id, id)).returning();
    return result.length > 0;
  }

  // Environments
  async getEnvironment(id: string): Promise<Environment | undefined> {
    const result = await db.select().from(environments).where(eq(environments.id, id)).limit(1);
    return result[0];
  }

  async getEnvironmentsByTeam(teamId: string): Promise<Environment[]> {
    return await db.select().from(environments).where(eq(environments.teamId, teamId));
  }

  async createEnvironment(environment: InsertEnvironment): Promise<Environment> {
    const result = await db.insert(environments).values(environment).returning();
    return result[0];
  }

  async updateEnvironment(id: string, data: Partial<InsertEnvironment>): Promise<Environment | undefined> {
    const result = await db.update(environments).set(data).where(eq(environments.id, id)).returning();
    return result[0];
  }

  async deleteEnvironment(id: string): Promise<boolean> {
    const result = await db.delete(environments).where(eq(environments.id, id)).returning();
    return result.length > 0;
  }

  // Releases
  async getReleases(filters?: { teamId?: string }): Promise<Release[]> {
    const conditions = [];
    if (filters?.teamId) {
      conditions.push(eq(releases.teamId, filters.teamId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(releases).where(and(...conditions)).orderBy(desc(releases.createdAt));
    }
    
    return await db.select().from(releases).orderBy(desc(releases.createdAt));
  }

  async getRelease(id: string): Promise<Release | undefined> {
    const result = await db.select().from(releases).where(eq(releases.id, id)).limit(1);
    return result[0];
  }

  async createRelease(release: InsertRelease): Promise<Release> {
    const result = await db.insert(releases).values(release).returning();
    return result[0];
  }

  async updateRelease(id: string, data: Partial<InsertRelease>): Promise<Release | undefined> {
    const result = await db.update(releases).set(data).where(eq(releases.id, id)).returning();
    return result[0];
  }

  async deleteRelease(id: string): Promise<boolean> {
    const result = await db.delete(releases).where(eq(releases.id, id)).returning();
    return result.length > 0;
  }

  // Stages
  async getStagesByRelease(releaseId: string): Promise<Stage[]> {
    return await db.select().from(stages).where(eq(stages.releaseId, releaseId));
  }

  async getStage(id: string): Promise<Stage | undefined> {
    const result = await db.select().from(stages).where(eq(stages.id, id)).limit(1);
    return result[0];
  }

  async createStage(stage: InsertStage): Promise<Stage> {
    const result = await db.insert(stages).values(stage).returning();
    return result[0];
  }

  async updateStage(id: string, data: Partial<InsertStage>): Promise<Stage | undefined> {
    const result = await db.update(stages).set(data).where(eq(stages.id, id)).returning();
    return result[0];
  }

  async deleteStage(id: string): Promise<boolean> {
    const result = await db.delete(stages).where(eq(stages.id, id)).returning();
    return result.length > 0;
  }

  // Flows
  async getFlowsByStage(stageId: string): Promise<Flow[]> {
    return await db.select().from(flows).where(eq(flows.stageId, stageId));
  }

  async getFlow(id: string): Promise<Flow | undefined> {
    const result = await db.select().from(flows).where(eq(flows.id, id)).limit(1);
    return result[0];
  }

  async createFlow(flow: InsertFlow): Promise<Flow> {
    const result = await db.insert(flows).values(flow).returning();
    return result[0];
  }

  async updateFlow(id: string, data: Partial<InsertFlow>): Promise<Flow | undefined> {
    const result = await db.update(flows).set(data).where(eq(flows.id, id)).returning();
    return result[0];
  }

  async deleteFlow(id: string): Promise<boolean> {
    const result = await db.delete(flows).where(eq(flows.id, id)).returning();
    return result.length > 0;
  }

  // Tasks
  async getTasksByStage(stageId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.stageId, stageId)).orderBy(tasks.updatedAt);
  }

  async getTask(id: string): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return result[0];
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  // Blockers
  async getBlockersByStage(stageId: string, activeOnly: boolean = false): Promise<Blocker[]> {
    const conditions = [eq(blockers.stageId, stageId)];
    
    if (activeOnly) {
      conditions.push(eq(blockers.active, true));
    }
    
    return await db.select().from(blockers).where(and(...conditions)).orderBy(desc(blockers.createdAt));
  }

  async getBlocker(id: string): Promise<Blocker | undefined> {
    const result = await db.select().from(blockers).where(eq(blockers.id, id)).limit(1);
    return result[0];
  }

  async createBlocker(blocker: InsertBlocker): Promise<Blocker> {
    const result = await db.insert(blockers).values(blocker).returning();
    return result[0];
  }

  async updateBlocker(id: string, data: Partial<InsertBlocker>): Promise<Blocker | undefined> {
    const result = await db.update(blockers).set(data).where(eq(blockers.id, id)).returning();
    return result[0];
  }

  async deleteBlocker(id: string): Promise<boolean> {
    const result = await db.delete(blockers).where(eq(blockers.id, id)).returning();
    return result.length > 0;
  }

  // Diagrams
  async getDiagramByRelease(releaseId: string): Promise<Diagram | undefined> {
    const result = await db.select().from(diagrams).where(eq(diagrams.releaseId, releaseId)).limit(1);
    return result[0];
  }

  async createOrUpdateDiagram(diagram: InsertDiagram): Promise<Diagram> {
    const existing = await this.getDiagramByRelease(diagram.releaseId!);
    
    if (existing) {
      const result = await db.update(diagrams).set(diagram).where(eq(diagrams.id, existing.id)).returning();
      return result[0];
    } else {
      const result = await db.insert(diagrams).values(diagram).returning();
      return result[0];
    }
  }

  async updateDiagramLayout(releaseId: string, layout: any): Promise<Diagram | undefined> {
    const existing = await this.getDiagramByRelease(releaseId);
    
    if (existing) {
      const result = await db.update(diagrams).set({ layout }).where(eq(diagrams.id, existing.id)).returning();
      return result[0];
    } else {
      const result = await db.insert(diagrams).values({ releaseId, layout }).returning();
      return result[0];
    }
  }

  // Stage Diagrams
  async getStageDiagram(stageId: string): Promise<any | undefined> {
    const result = await db.select().from(stageDiagrams).where(eq(stageDiagrams.stageId, stageId)).limit(1);
    return result[0];
  }

  async saveStageDiagram(stageId: string, layout: any): Promise<any> {
    const existing = await this.getStageDiagram(stageId);
    
    if (existing) {
      const result = await db.update(stageDiagrams).set({ layout, updatedAt: new Date() }).where(eq(stageDiagrams.stageId, stageId)).returning();
      return result[0];
    } else {
      const result = await db.insert(stageDiagrams).values({ id: crypto.randomUUID(), stageId, layout }).returning();
      return result[0];
    }
  }

  // Activity Log
  async getActivityLog(filters?: { workspaceId?: string; releaseId?: string; stageId?: string }): Promise<ActivityLog[]> {
    const conditions = [];
    if (filters?.workspaceId) {
      conditions.push(eq(activityLog.workspaceId, filters.workspaceId));
    }
    if (filters?.releaseId) {
      conditions.push(eq(activityLog.releaseId, filters.releaseId));
    }
    if (filters?.stageId) {
      conditions.push(eq(activityLog.stageId, filters.stageId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(activityLog).where(and(...conditions)).orderBy(desc(activityLog.at)).limit(100);
    }
    
    return await db.select().from(activityLog).orderBy(desc(activityLog.at)).limit(100);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const result = await db.insert(activityLog).values(log).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();

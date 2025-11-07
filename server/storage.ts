import { db } from "./db";
import {
  type User,
  type InsertUser,
  type Release,
  type InsertRelease,
  type Stage,
  type InsertStage,
  type Task,
  type InsertTask,
  type Blocker,
  type InsertBlocker,
  type Diagram,
  type InsertDiagram,
  type ActivityLog,
  type InsertActivityLog,
  users,
  releases,
  stages,
  tasks,
  blockers,
  diagrams,
  diagramNodes,
  activityLog,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Releases
  getReleases(filters?: { team?: string; status?: string }): Promise<Release[]>;
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
  getActivityLog(filters?: { releaseId?: string; stageId?: string }): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
}

class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Releases
  async getReleases(filters?: { team?: string; status?: string }): Promise<Release[]> {
    const conditions = [];
    if (filters?.team) {
      conditions.push(eq(releases.team, filters.team));
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

  // Activity Log
  async getActivityLog(filters?: { releaseId?: string; stageId?: string }): Promise<ActivityLog[]> {
    const conditions = [];
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

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const envEnum = pgEnum("env", ["staging", "uat", "prod"]);
export const stageStatusEnum = pgEnum("stage_status", ["not_started", "in_progress", "blocked", "done"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "doing", "done", "na"]);
export const blockerSeverityEnum = pgEnum("blocker_severity", ["P1", "P2", "P3"]);

// Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Releases
export const releases = pgTable("releases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  version: text("version"),
  changeWindow: jsonb("change_window"), // tstzrange stored as jsonb
  team: text("team"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertReleaseSchema = createInsertSchema(releases).pick({
  name: true,
  version: true,
  team: true,
  createdBy: true,
  changeWindow: true,
});

export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type Release = typeof releases.$inferSelect;

// Stages
export const stages = pgTable("stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  releaseId: varchar("release_id").notNull().references(() => releases.id, { onDelete: "cascade" }),
  env: envEnum("env").notNull(),
  status: stageStatusEnum("status").default("not_started").notNull(),
  approver: text("approver"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  lastUpdate: timestamp("last_update", { withTimezone: true }).defaultNow().notNull(),
});

export const insertStageSchema = createInsertSchema(stages).pick({
  releaseId: true,
  env: true,
  status: true,
  approver: true,
  startedAt: true,
  endedAt: true,
});

export type InsertStage = z.infer<typeof insertStageSchema>;
export type Stage = typeof stages.$inferSelect;

// Tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  details: text("details"),
  owner: text("owner"),
  required: boolean("required").default(true).notNull(),
  status: taskStatusEnum("status").default("todo").notNull(),
  evidenceUrl: text("evidence_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  stageId: true,
  title: true,
  details: true,
  owner: true,
  required: true,
  status: true,
  evidenceUrl: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Blockers
export const blockers = pgTable("blockers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
  severity: blockerSeverityEnum("severity").default("P2").notNull(),
  reason: text("reason").notNull(),
  owner: text("owner"),
  eta: timestamp("eta", { withTimezone: true }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertBlockerSchema = createInsertSchema(blockers).pick({
  stageId: true,
  severity: true,
  reason: true,
  owner: true,
  eta: true,
  active: true,
});

export type InsertBlocker = z.infer<typeof insertBlockerSchema>;
export type Blocker = typeof blockers.$inferSelect;

// Diagrams
export const diagrams = pgTable("diagrams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  releaseId: varchar("release_id").notNull().references(() => releases.id, { onDelete: "cascade" }),
  name: text("name"),
  layout: jsonb("layout"),
  ydocSnapshot: jsonb("ydoc_snapshot"), // bytea stored as jsonb for simplicity
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertDiagramSchema = createInsertSchema(diagrams).pick({
  releaseId: true,
  name: true,
  layout: true,
  ydocSnapshot: true,
});

export type InsertDiagram = z.infer<typeof insertDiagramSchema>;
export type Diagram = typeof diagrams.$inferSelect;

// Diagram Nodes
export const diagramNodes = pgTable("diagram_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  diagramId: varchar("diagram_id").notNull().references(() => diagrams.id, { onDelete: "cascade" }),
  key: text("key"),
  meta: jsonb("meta"),
});

export const insertDiagramNodeSchema = createInsertSchema(diagramNodes).pick({
  diagramId: true,
  key: true,
  meta: true,
});

export type InsertDiagramNode = z.infer<typeof insertDiagramNodeSchema>;
export type DiagramNode = typeof diagramNodes.$inferSelect;

// Activity Log
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  releaseId: varchar("release_id").references(() => releases.id, { onDelete: "set null" }),
  stageId: varchar("stage_id").references(() => stages.id, { onDelete: "set null" }),
  actor: text("actor"),
  action: text("action").notNull(),
  meta: jsonb("meta"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).pick({
  releaseId: true,
  stageId: true,
  actor: true,
  action: true,
  meta: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

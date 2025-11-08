import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const workspaceTypeEnum = pgEnum("workspace_type", ["individual", "organization"]);
export const workspaceRoleEnum = pgEnum("workspace_role", ["admin", "developer"]);
export const memberStatusEnum = pgEnum("member_status", ["active", "inactive"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "declined", "expired"]);
export const teamRoleEnum = pgEnum("team_role", ["admin", "member"]);
export const stageStatusEnum = pgEnum("stage_status", ["not_started", "in_progress", "blocked", "done"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "doing", "done", "na"]);
export const blockerSeverityEnum = pgEnum("blocker_severity", ["P1", "P2", "P3"]);

// Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Workspaces
export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: workspaceTypeEnum("type").notNull(),
  slug: text("slug").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueSlug: unique().on(table.slug),
}));

export const insertWorkspaceSchema = createInsertSchema(workspaces).pick({
  name: true,
  type: true,
  slug: true,
  createdBy: true,
});

export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspaces.$inferSelect;

// Workspace Members
export const workspaceMembers = pgTable("workspace_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: workspaceRoleEnum("role").default("developer").notNull(),
  status: memberStatusEnum("status").default("active").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueMembership: unique().on(table.workspaceId, table.userId),
}));

export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers).pick({
  workspaceId: true,
  userId: true,
  role: true,
  status: true,
});

export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;

// Workspace Invitations
export const workspaceInvitations = pgTable("workspace_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  inviterId: varchar("inviter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: workspaceRoleEnum("role").default("developer").notNull(),
  token: text("token").notNull().unique(),
  status: invitationStatusEnum("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  invitedUserId: varchar("invited_user_id").references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  uniquePendingInvite: unique().on(table.workspaceId, table.email, table.status),
}));

export const insertWorkspaceInvitationSchema = createInsertSchema(workspaceInvitations).pick({
  workspaceId: true,
  email: true,
  inviterId: true,
  role: true,
  expiresAt: true,
});

export type InsertWorkspaceInvitation = z.infer<typeof insertWorkspaceInvitationSchema>;
export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect;

// Teams
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueTeamName: unique().on(table.workspaceId, table.name),
}));

export const insertTeamSchema = createInsertSchema(teams).pick({
  workspaceId: true,
  name: true,
  description: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Team Members
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  workspaceMemberId: varchar("workspace_member_id").notNull().references(() => workspaceMembers.id, { onDelete: "cascade" }),
  role: teamRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueTeamMembership: unique().on(table.teamId, table.workspaceMemberId),
}));

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  teamId: true,
  workspaceMemberId: true,
  role: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

// Environments (replaces hardcoded env enum)
export const environments = pgTable("environments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: text("sort_order").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueEnvName: unique().on(table.teamId, table.name),
}));

export const insertEnvironmentSchema = createInsertSchema(environments).pick({
  teamId: true,
  name: true,
  description: true,
  sortOrder: true,
  isDefault: true,
});

export type InsertEnvironment = z.infer<typeof insertEnvironmentSchema>;
export type Environment = typeof environments.$inferSelect;

// Releases (now belongs to teams)
export const releases = pgTable("releases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  version: text("version"),
  changeWindow: jsonb("change_window"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertReleaseSchema = createInsertSchema(releases).pick({
  teamId: true,
  name: true,
  version: true,
  changeWindow: true,
  createdBy: true,
});

export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type Release = typeof releases.$inferSelect;

// Stages (now references environment instead of enum)
export const stages = pgTable("stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  releaseId: varchar("release_id").notNull().references(() => releases.id, { onDelete: "cascade" }),
  environmentId: varchar("environment_id").notNull().references(() => environments.id, { onDelete: "cascade" }),
  status: stageStatusEnum("status").default("not_started").notNull(),
  approver: text("approver"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  lastUpdate: timestamp("last_update", { withTimezone: true }).defaultNow().notNull(),
});

export const insertStageSchema = createInsertSchema(stages).pick({
  releaseId: true,
  environmentId: true,
  status: true,
  approver: true,
  startedAt: true,
  endedAt: true,
});

export type InsertStage = z.infer<typeof insertStageSchema>;
export type Stage = typeof stages.$inferSelect;

// Flows (within environments/stages)
export const flows = pgTable("flows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  config: jsonb("config"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertFlowSchema = createInsertSchema(flows).pick({
  stageId: true,
  kind: true,
  config: true,
});

export type InsertFlow = z.infer<typeof insertFlowSchema>;
export type Flow = typeof flows.$inferSelect;

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
  ydocSnapshot: jsonb("ydoc_snapshot"),
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
  workspaceId: varchar("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  releaseId: varchar("release_id").references(() => releases.id, { onDelete: "set null" }),
  stageId: varchar("stage_id").references(() => stages.id, { onDelete: "set null" }),
  actor: text("actor"),
  action: text("action").notNull(),
  meta: jsonb("meta"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).pick({
  workspaceId: true,
  releaseId: true,
  stageId: true,
  actor: true,
  action: true,
  meta: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

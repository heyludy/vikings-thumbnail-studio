import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url").notNull(),
  tournamentLine1: text("tournament_line_1").notNull(),
  tournamentLine2: text("tournament_line_2").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const opponents = sqliteTable("opponents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url").notNull(),
  circularFrame: integer("circular_frame", { mode: "boolean" }).notNull().default(true),
  division: text("division", { enum: ["men", "women", "both"] }).notNull().default("both"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const thumbnails = sqliteTable("thumbnails", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  opponentId: text("opponent_id").notNull(),
  theme: text("theme").notNull(),
  stageText: text("stage_text").notNull(),
  photoName: text("photo_name"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

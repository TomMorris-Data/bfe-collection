import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const farms = sqliteTable("farms", {
  id: text("id").primaryKey(),
  client_ref: text("client_ref").notNull().unique(),
  name: text("name").notNull(),
  contact_name: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  // Stored as JSON string — SQLite has no ARRAY type
  enterprise_types_json: text("enterprise_types_json").notNull().default("[]"),
  sbi_no: text("sbi_no"),
  ahwp_agreement_no: text("ahwp_agreement_no"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const checkInTokens = sqliteTable("check_in_tokens", {
  id: text("id").primaryKey(),
  farm_id: text("farm_id").notNull().references(() => farms.id),
  token: text("token").notNull().unique(),
  period_start: text("period_start").notNull(), // ISO date: YYYY-MM-DD
  period_end: text("period_end").notNull(),
  expires_at: text("expires_at").notNull(),      // ISO datetime
  first_accessed_at: text("first_accessed_at"),
  completed_at: text("completed_at"),
  created_at: text("created_at").notNull(),
});

export const checkInResponses = sqliteTable("check_in_responses", {
  id: text("id").primaryKey(),
  farm_id: text("farm_id").notNull().references(() => farms.id),
  token_id: text("token_id").notNull().references(() => checkInTokens.id),
  period_start: text("period_start").notNull(),
  section: text("section").notNull(),
  question_key: text("question_key").notNull(),
  value_num: real("value_num"),
  value_text: text("value_text"),
  value_option: text("value_option"),
  submitted_at: text("submitted_at").notNull(),
});

export const benchmarks = sqliteTable("benchmarks", {
  id: text("id").primaryKey(),
  enterprise_type: text("enterprise_type").notNull(),
  kpi_key: text("kpi_key").notNull(),
  display_name: text("display_name").notNull(),
  unit: text("unit").notNull().default("%"),
  red_below: real("red_below"),
  amber_below: real("amber_below"),
  green_above: real("green_above"),
  higher_is_better: integer("higher_is_better", { mode: "boolean" }).notNull().default(true),
});

// ── Helper to parse enterprise_types from JSON string ──────────────────────
export function parseEnterpriseTypes(json: string | null): string[] {
  try { return JSON.parse(json ?? "[]"); } catch { return []; }
}

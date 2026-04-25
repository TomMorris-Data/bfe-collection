import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDb } from "../db/supabase";
import { getQuestionsForFarm } from "../services/questions";
import { isExpired } from "../services/magic_link";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_BASE_URL: string;
};

const router = new Hono<{ Bindings: Bindings }>();

const ResponseSchema = z.object({
  question_key: z.string(),
  section: z.string(),
  value_num: z.number().nullable().optional(),
  value_text: z.string().nullable().optional(),
  value_option: z.string().nullable().optional(),
});

const SubmitSchema = z.object({ responses: z.array(ResponseSchema) });

// GET /api/checkins/:token
router.get("/:token", async (c) => {
  const db = getDb(c.env);

  const { data: tok } = await db
    .from("check_in_tokens")
    .select("*")
    .eq("token", c.req.param("token"))
    .single();

  if (!tok) return c.json({ error: "Link not found or expired" }, 404);
  if (isExpired(tok.expires_at)) return c.json({ error: "Link not found or expired" }, 404);

  // Record first access
  if (!tok.first_accessed_at) {
    await db.from("check_in_tokens")
      .update({ first_accessed_at: new Date().toISOString() })
      .eq("id", tok.id);
  }

  const { data: farm } = await db.from("farms").select("*").eq("id", tok.farm_id).single();
  if (!farm) return c.json({ error: "Farm not found" }, 404);

  const month = new Date(tok.period_start).getMonth() + 1;
  const questions = getQuestionsForFarm(farm.enterprise_types, month);

  const { data: existing } = await db
    .from("check_in_responses")
    .select("question_key, value_num, value_text, value_option")
    .eq("token_id", tok.id);

  const existingMap: Record<string, string | number | null> = {};
  for (const r of existing ?? []) {
    existingMap[r.question_key] = r.value_num ?? r.value_option ?? r.value_text;
  }

  return c.json({
    farm,
    period_start: tok.period_start,
    period_end: tok.period_end,
    questions: questions.map((q) => ({
      key: q.key, section: q.section, label: q.label,
      type: q.type, unit: q.unit ?? null, options: q.options ?? null, hint: q.hint ?? null,
    })),
    existing_responses: existingMap,
    completed: tok.completed_at !== null,
  });
});

// POST /api/checkins/:token/save
router.post("/:token/save", zValidator("json", SubmitSchema), async (c) => {
  const db = getDb(c.env);

  const { data: tok } = await db
    .from("check_in_tokens").select("*").eq("token", c.req.param("token")).single();
  if (!tok || isExpired(tok.expires_at)) return c.json({ error: "Link not found or expired" }, 404);

  const { responses } = c.req.valid("json");
  const now = new Date().toISOString();

  for (const r of responses) {
    // Delete then re-insert to achieve upsert on (token_id, question_key)
    await db.from("check_in_responses")
      .delete()
      .eq("token_id", tok.id)
      .eq("question_key", r.question_key);

    await db.from("check_in_responses").insert({
      farm_id: tok.farm_id,
      token_id: tok.id,
      period_start: tok.period_start,
      section: r.section,
      question_key: r.question_key,
      value_num: r.value_num ?? null,
      value_text: r.value_text ?? null,
      value_option: r.value_option ?? null,
      submitted_at: now,
    });
  }

  return c.json({ saved: responses.length });
});

// POST /api/checkins/:token/complete
router.post("/:token/complete", zValidator("json", SubmitSchema), async (c) => {
  const db = getDb(c.env);

  const { data: tok } = await db
    .from("check_in_tokens").select("*").eq("token", c.req.param("token")).single();
  if (!tok || isExpired(tok.expires_at)) return c.json({ error: "Link not found or expired" }, 404);

  const { responses } = c.req.valid("json");
  const now = new Date().toISOString();

  for (const r of responses) {
    await db.from("check_in_responses")
      .delete().eq("token_id", tok.id).eq("question_key", r.question_key);

    await db.from("check_in_responses").insert({
      farm_id: tok.farm_id,
      token_id: tok.id,
      period_start: tok.period_start,
      section: r.section,
      question_key: r.question_key,
      value_num: r.value_num ?? null,
      value_text: r.value_text ?? null,
      value_option: r.value_option ?? null,
      submitted_at: now,
    });
  }

  await db.from("check_in_tokens")
    .update({ completed_at: now }).eq("id", tok.id);

  return c.json({ completed: true });
});

export default router;

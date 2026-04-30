import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDb } from "../db/supabase";
import { generateToken, checkinUrl, tokenExpiresAt, thisPeriodStart, periodEnd } from "../services/magic_link";
import { sendCheckinEmail } from "../services/email";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  APP_BASE_URL: string;
};

const router = new Hono<{ Bindings: Bindings }>();

const CreateFarmSchema = z.object({
  name: z.string().min(1),
  client_ref: z.string().min(1),
  contact_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  enterprise_types: z.array(z.enum(["sheep", "suckler", "calf_rearer"])).min(1),
  sbi_no: z.string().nullable().optional(),
  ahwp_agreement_no: z.string().nullable().optional(),
});

// POST /api/admin/farms
router.post("/farms", zValidator("json", CreateFarmSchema), async (c) => {
  const db = getDb(c.env);
  const body = c.req.valid("json");

  const { data: farm, error } = await db.from("farms").insert({
    name: body.name,
    client_ref: body.client_ref,
    contact_name: body.contact_name ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    enterprise_types: body.enterprise_types,
    sbi_no: body.sbi_no ?? null,
    ahwp_agreement_no: body.ahwp_agreement_no ?? null,
    active: true,
  }).select().single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(farm, 201);
});

// GET /api/admin/farms
router.get("/farms", async (c) => {
  const db = getDb(c.env);
  const thisYearStart = `${new Date().getFullYear()}-01-01`;

  const { data: farms, error } = await db
    .from("farms").select("id, name, client_ref, enterprise_types, email")
    .eq("active", true).order("name");

  if (error) return c.json({ error: error.message }, 500);

  const items = await Promise.all((farms ?? []).map(async (farm) => {
    const [lastRow, countRow] = await Promise.all([
      db.from("check_in_responses")
        .select("submitted_at")
        .eq("farm_id", farm.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from("check_in_responses")
        .select("period_start")
        .eq("farm_id", farm.id)
        .gte("period_start", thisYearStart),
    ]);

    const distinctPeriods = new Set(countRow.data?.map((r) => r.period_start) ?? []).size;
    const completionPct = Math.min(100, Math.round((distinctPeriods / 26) * 100));

    return {
      id: farm.id,
      name: farm.name,
      client_ref: farm.client_ref,
      enterprise_types: farm.enterprise_types,
      email: farm.email,
      completion_pct: completionPct,
      last_response: lastRow.data?.submitted_at ?? null,
      alert_count: 0,
    };
  }));

  return c.json(items);
});

// GET /api/admin/farms/:id
router.get("/farms/:id", async (c) => {
  const db = getDb(c.env);
  const { data: farm, error } = await db
    .from("farms").select("*").eq("id", c.req.param("id")).single();
  if (error || !farm) return c.json({ error: "Farm not found" }, 404);
  return c.json(farm);
});

// POST /api/admin/farms/:id/dispatch
router.post("/farms/:id/dispatch", async (c) => {
  const db = getDb(c.env);
  const { data: farm, error } = await db
    .from("farms").select("id, name, contact_name, email").eq("id", c.req.param("id")).single();
  if (error || !farm) return c.json({ error: "Farm not found" }, 404);
  if (!farm.email) return c.json({ error: "Farm has no email address" }, 400);

  const start = thisPeriodStart();
  const end = periodEnd(start);
  const token = generateToken();

  const { error: insertErr } = await db.from("check_in_tokens").insert({
    farm_id: farm.id,
    token,
    period_start: start,
    period_end: end,
    expires_at: tokenExpiresAt(7),
  });
  if (insertErr) return c.json({ error: insertErr.message }, 500);

  const url = checkinUrl(c.env.APP_BASE_URL, token);
  const sent = await sendCheckinEmail(
    { name: farm.name, contact_name: farm.contact_name, email: farm.email },
    { token, period_start: start, period_end: end },
    url,
    c.env.RESEND_API_KEY,
  );

  return c.json({ dispatched: sent, token, url });
});

// POST /api/admin/farms/:id/demo-dispatch
// Creates a check-in token for any simulated month without sending email.
router.post("/farms/:id/demo-dispatch", async (c) => {
  const db = getDb(c.env);
  const { data: farm, error } = await db
    .from("farms").select("id, name, contact_name, email").eq("id", c.req.param("id")).single();
  if (error || !farm) return c.json({ error: "Farm not found" }, 404);

  const body = await c.req.json().catch(() => ({})) as { month?: number };
  const month = typeof body.month === "number" && body.month >= 1 && body.month <= 12
    ? body.month
    : new Date().getMonth() + 1;

  // Build a period_start on the first Monday of the chosen month in the current year
  const year = new Date().getFullYear();
  const firstDay = new Date(year, month - 1, 1);
  const offset = firstDay.getDay() === 0 ? 1 : firstDay.getDay() === 1 ? 0 : 8 - firstDay.getDay();
  firstDay.setDate(firstDay.getDate() + offset);
  const start = firstDay.toISOString().slice(0, 10);
  const end = periodEnd(start);
  const token = generateToken();

  const { error: insertErr } = await db.from("check_in_tokens").insert({
    farm_id: farm.id,
    token,
    period_start: start,
    period_end: end,
    expires_at: tokenExpiresAt(7),
  });
  if (insertErr) return c.json({ error: insertErr.message }, 500);

  const url = checkinUrl(c.env.APP_BASE_URL, token);
  return c.json({ token, url, period_start: start, period_end: end, month });
});

export default router;

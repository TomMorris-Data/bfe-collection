import { Hono } from "hono";
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

export default router;

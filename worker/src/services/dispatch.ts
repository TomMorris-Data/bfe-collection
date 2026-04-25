import { getDb } from "../db/supabase";
import { generateToken, checkinUrl, tokenExpiresAt, thisPeriodStart, periodEnd } from "./magic_link";
import { sendCheckinEmail } from "./email";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  APP_BASE_URL: string;
}

export async function dispatchAll(env: Env): Promise<void> {
  const db = getDb(env);
  const start = thisPeriodStart();
  const end = periodEnd(start);
  console.log(`[DISPATCH] Period ${start} – ${end}`);

  const { data: farms, error } = await db
    .from("farms")
    .select("id, name, contact_name, email")
    .eq("active", true)
    .not("email", "is", null);

  if (error) { console.error(`[DISPATCH] DB error: ${error.message}`); return; }
  console.log(`[DISPATCH] ${farms?.length ?? 0} farms`);

  let sent = 0;
  for (const farm of farms ?? []) {
    try {
      const token = generateToken();

      const { error: insertErr } = await db.from("check_in_tokens").insert({
        farm_id: farm.id,
        token,
        period_start: start,
        period_end: end,
        expires_at: tokenExpiresAt(7),
      });

      if (insertErr) throw new Error(insertErr.message);

      const url = checkinUrl(env.APP_BASE_URL, token);
      const ok = await sendCheckinEmail(
        { name: farm.name, contact_name: farm.contact_name, email: farm.email },
        { token, period_start: start, period_end: end },
        url,
        env.RESEND_API_KEY,
      );

      if (ok) { sent++; console.log(`[DISPATCH] ✓ ${farm.name}`); }
      else console.error(`[DISPATCH] ✗ ${farm.name} — email failed`);
    } catch (err) {
      console.error(`[DISPATCH] ✗ ${farm.name} — ${err}`);
    }
  }

  console.log(`[DISPATCH] Done: ${sent}/${farms?.length ?? 0} sent`);
}

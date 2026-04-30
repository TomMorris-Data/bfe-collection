import { Hono } from "hono";
import { cors } from "hono/cors";
import checkinsRouter from "./routes/checkins";
import adminRouter from "./routes/admin";
import reportRouter from "./routes/report";
import antibioticsRouter from "./routes/antibiotics";
import { dispatchAll } from "./services/dispatch";
import { getDb } from "./db/supabase";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  APP_BASE_URL: string;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin) =>
      origin?.includes("localhost") || origin?.includes("pages.dev") ? origin : "https://bfe-health-frontend.pages.dev",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.route("/api/checkins", checkinsRouter);
app.route("/api/admin", adminRouter);
app.route("/api/report", reportRouter);
app.route("/api/antibiotics", antibioticsRouter);

// Custom error handler — exposes the actual exception so we can diagnose
app.onError((err, c) => {
  return c.json({
    type: String(err?.constructor?.name ?? "Unknown"),
    message: String((err as Error)?.message ?? err),
    stack: String((err as Error)?.stack ?? "").slice(0, 600),
  }, 500);
});

app.get("/health", (c) => c.json({ status: "ok", env: c.env.ENVIRONMENT }));
app.get("/health-async", async (c) => c.json({ status: "ok-async" }));
app.get("/health-db", async (c) => {
  try {
    const db = getDb(c.env);
    const result = await db.from("farms").select("id").limit(1);
    return c.json({ db: "ok", rows: result.data?.length ?? 0, error: result.error?.message ?? null });
  } catch (e) {
    return c.json({ db: "threw-caught", message: String(e) }, 500);
  }
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(dispatchAll(env));
  },
};

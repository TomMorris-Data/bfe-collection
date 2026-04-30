import { Hono } from "hono";
import { cors } from "hono/cors";
import checkinsRouter from "./routes/checkins";
import adminRouter from "./routes/admin";
import reportRouter from "./routes/report";
import antibioticsRouter from "./routes/antibiotics";
import { dispatchAll } from "./services/dispatch";

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

app.get("/health", (c) => c.json({ status: "ok", env: c.env.ENVIRONMENT }));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(dispatchAll(env));
  },
};

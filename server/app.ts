import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { runDueDebtReminders } from "./scheduled";
import { registerStorageProxy } from "./_core/storageProxy";
import { jsonInternalError } from "./_core/apiJson";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "4mb" }));
  app.use(express.urlencoded({ limit: "4mb", extended: true }));
  registerStorageProxy(app);
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      database: Boolean(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL),
      jwt: Boolean(process.env.JWT_SECRET),
    });
  });
  app.use("/api/trpc", createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error }) {
      console.error("[trpc]", error.code, error.message);
    },
  }));
  app.post("/api/scheduled/due-debt-reminders", runDueDebtReminders);
  app.use("/api", (req, res) => {
    res.status(404).json({
      error: {
        json: {
          message: "مسار API غير موجود.",
          code: -32601,
          data: { code: "NOT_FOUND", httpStatus: 404, path: req.path },
        },
      },
    });
  });
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[api]", error);
    if (res.headersSent) {
      next(error);
      return;
    }
    res.status(500).json(jsonInternalError("تعذر تنفيذ الطلب على الخادم."));
  });
  return app;
}

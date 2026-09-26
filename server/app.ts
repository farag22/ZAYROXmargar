import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { runDueDebtReminders } from "./scheduled";
import { registerStorageProxy } from "./_core/storageProxy";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  app.post("/api/scheduled/due-debt-reminders", runDueDebtReminders);
  return app;
}

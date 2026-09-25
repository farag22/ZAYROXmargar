import type { Request, Response } from "express";
import * as db from "./db";
import { sdk } from "./_core/sdk";

export async function runDueDebtReminders(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await db.generateDueDebtNotifications();
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "unknown_error",
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}

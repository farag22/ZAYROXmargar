import type { IncomingMessage, ServerResponse } from "node:http";
import type { Express } from "express";
import { humanizePlatformError, jsonInternalError, writeJson } from "../server/_core/apiJson";

process.on("unhandledRejection", error => {
  console.error("[api.unhandledRejection]", error);
});
process.on("uncaughtException", error => {
  console.error("[api.uncaughtException]", error);
});

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};

let app: Express | null = null;

async function getApp(): Promise<Express> {
  if (app) return app;
  const { createApp } = await import("../server/app");
  app = createApp();
  return app;
}

function runExpressApp(expressApp: Express, req: IncomingMessage, res: ServerResponse) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    res.once("finish", finish);
    res.once("close", finish);
    expressApp(req as never, res as never, (error?: unknown) => {
      if (error) {
        if (!settled) {
          settled = true;
          reject(error);
        }
        return;
      }
      finish();
    });
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const expressApp = await getApp();
    await runExpressApp(expressApp, req, res);
  } catch (error) {
    const message = error instanceof Error ? humanizePlatformError(error.message) : "تعذر تنفيذ الطلب على الخادم.";
    writeJson(res, 500, jsonInternalError(message));
  }
}

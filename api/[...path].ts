import type { IncomingMessage, ServerResponse } from "node:http";
import type { Express } from "express";
import { humanizePlatformError, jsonInternalError, writeJson } from "../server/_core/apiJson";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};

let appPromise: Promise<Express> | null = null;

function loadApp() {
  if (!appPromise) {
    appPromise = import("../server/app").then(({ createApp }) => createApp());
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await loadApp();
    await new Promise<void>((resolve, reject) => {
      const finish = () => resolve();
      res.once("finish", finish);
      res.once("close", finish);
      app(req as never, res as never, (error?: unknown) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } catch (error) {
    const message = error instanceof Error ? humanizePlatformError(error.message) : "تعذر تنفيذ الطلب على الخادم.";
    writeJson(res, 500, jsonInternalError(message));
  }
}

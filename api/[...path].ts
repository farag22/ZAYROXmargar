import "dotenv/config";
import { createApp } from "../server/app";

let app: any;
try {
  app = createApp();
} catch (error: any) {
  console.error("Initialization error:", error);
}

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      app = createApp();
    }
    return app(req, res);
  } catch (error: any) {
    console.error("Handler error:", error);
    return res.status(500).json({ 
      error: "Detailed Server Error", 
      message: error.message,
      stack: error.stack 
    });
  }
}

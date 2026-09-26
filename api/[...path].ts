import "dotenv/config";
import { createApp } from "../server/app";

let app: any;
try {
  app = createApp();
} catch (error) {
  console.error("Failed to initialize app:", error);
}

export default app;

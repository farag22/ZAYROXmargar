import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { normalizeDatabaseUrl } from "./server/_core/databaseUrl";

const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "");
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["zayrox"],
  dbCredentials: {
    url: connectionString,
  },
});

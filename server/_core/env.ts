import { normalizeDatabaseUrl } from "./databaseUrl";

export const ENV = {
  appId: process.env.VITE_APP_ID || "zayrox",
  cookieSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "zayrox-fallback-session-secret" : "zayrox-dev-session-secret"),
  databaseUrl: normalizeDatabaseUrl(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || ""),
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

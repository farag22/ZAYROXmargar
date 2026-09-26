import { describe, expect, it } from "vitest";
import { humanizePlatformError, jsonInternalError } from "./apiJson";
import { isDirectSupabaseHost, normalizeDatabaseUrl } from "./databaseUrl";

describe("normalizeDatabaseUrl", () => {
  it("encodes a password that starts with @ and prefers port 6543", () => {
    const input = "postgresql://postgres.abc:@Ff01003454288@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";
    expect(normalizeDatabaseUrl(input)).toBe(
      "postgresql://postgres.abc:%40Ff01003454288@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require",
    );
  });

  it("does not double-encode an already encoded password", () => {
    const input = "postgresql://postgres.abc:%40Ff01003454288@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require";
    expect(normalizeDatabaseUrl(input)).toBe(input);
  });

  it("detects the IPv6-only direct Supabase host", () => {
    expect(isDirectSupabaseHost("postgresql://postgres:@Ff01003454288@db.sieqdtkwuwhicdgbmqqt.supabase.co:5432/postgres")).toBe(true);
    expect(isDirectSupabaseHost("postgresql://postgres.abc:%40x@aws-0-eu-central-1.pooler.supabase.com:5432/postgres")).toBe(false);
  });
});

describe("platform JSON errors", () => {
  it("converts Vercel text errors into a JSON payload", () => {
    const payload = jsonInternalError(humanizePlatformError("A server error has occurred"));
    expect(payload.error.json.data.code).toBe("INTERNAL_SERVER_ERROR");
    expect(payload.error.json.message).not.toMatch(/^A server/);
  });
});

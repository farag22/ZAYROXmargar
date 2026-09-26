import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "../shared/const";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createLocalUser: vi.fn(),
    getUserByEmail: vi.fn(),
    recordLocalSignIn: vi.fn(),
  };
});

vi.mock("./_core/password", async importOriginal => {
  const actual = await importOriginal<typeof import("./_core/password")>();
  return {
    ...actual,
    verifyPassword: vi.fn(),
  };
});

vi.mock("./_core/sdk", async importOriginal => {
  const actual = await importOriginal<typeof import("./_core/sdk")>();
  return {
    ...actual,
    sdk: {
      ...actual.sdk,
      createSessionToken: vi.fn().mockResolvedValue("session-token"),
    },
  };
});

import * as db from "./db";
import { verifyPassword } from "./_core/password";
import { appRouter } from "./routers";

type CookieCall = { name: string; value?: string; options: Record<string, unknown> };

function publicContext() {
  const cookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies.push({ name, value, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        cookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, cookies };
}

const sampleUser = {
  id: 7,
  openId: "local_abc",
  name: "صاحب محل",
  email: "owner@example.com",
  passwordHash: "scrypt$salt$hash",
  loginMethod: "password",
  role: "shop_owner" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("auth.register و auth.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ينشئ حساباً ويضبط كوكي الجلسة", async () => {
    vi.mocked(db.createLocalUser).mockResolvedValueOnce(sampleUser);
    const { ctx, cookies } = publicContext();
    const result = await appRouter.createCaller(ctx).auth.register({
      name: "صاحب محل",
      email: "owner@example.com",
      password: "Secret123",
    });
    expect(result).toEqual({ success: true });
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    expect(cookies[0]?.value).toBe("session-token");
  });

  it("يرفض بريداً مستخدماً مسبقاً", async () => {
    vi.mocked(db.createLocalUser).mockRejectedValueOnce(new Error("EMAIL_TAKEN"));
    const { ctx } = publicContext();
    await expect(appRouter.createCaller(ctx).auth.register({
      name: "صاحب محل",
      email: "owner@example.com",
      password: "Secret123",
    })).rejects.toMatchObject<Partial<TRPCError>>({
      code: "CONFLICT",
      message: "هذا البريد الإلكتروني مستخدم بالفعل.",
    });
  });

  it("يسجّل الدخول عند صحة كلمة المرور", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce(sampleUser);
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);
    const { ctx, cookies } = publicContext();
    const result = await appRouter.createCaller(ctx).auth.login({
      email: "owner@example.com",
      password: "Secret123",
    });
    expect(result).toEqual({ success: true });
    expect(db.recordLocalSignIn).toHaveBeenCalledWith(7);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
  });

  it("يعيد خطأ JSON عند فشل غير متوقع أثناء الدخول", async () => {
    vi.mocked(db.getUserByEmail).mockRejectedValueOnce(new Error("db down"));
    const { ctx } = publicContext();
    await expect(appRouter.createCaller(ctx).auth.login({
      email: "owner@example.com",
      password: "Secret123",
    })).rejects.toMatchObject<Partial<TRPCError>>({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("يرفض كلمة مرور خاطئة", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValueOnce(sampleUser);
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);
    const { ctx } = publicContext();
    await expect(appRouter.createCaller(ctx).auth.login({
      email: "owner@example.com",
      password: "wrong",
    })).rejects.toMatchObject<Partial<TRPCError>>({
      code: "UNAUTHORIZED",
    });
  });
});

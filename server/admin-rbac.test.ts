import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { adminProcedure, router } from "./_core/trpc";

const guardedRouter = router({ protectedValue: adminProcedure.query(() => "ok") });

function context(role: "shop_owner" | "super_admin"): TrpcContext {
  return {
    user: { id: 9, openId: "role-test", name: "Role Test", email: null, loginMethod: null, role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Super Admin RBAC", () => {
  it("يمنع Shop Owner من استدعاء إجراءات المنصة", async () => {
    await expect(guardedRouter.createCaller(context("shop_owner")).protectedValue()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });

  it("يسمح لـ Super Admin باستدعاء إجراءات المنصة", async () => {
    await expect(guardedRouter.createCaller(context("super_admin")).protectedValue()).resolves.toBe("ok");
  });
});

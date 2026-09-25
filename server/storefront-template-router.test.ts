import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, listAdminStorefrontTemplates: vi.fn().mockResolvedValue([]), setAdminStorefrontTemplate: vi.fn().mockResolvedValue(undefined) };
});

import * as db from "./db";
import { appRouter } from "./routers";

function context(role: "shop_owner" | "super_admin"): TrpcContext {
  return { user: { id: 33, openId: "template-admin", name: "Admin", email: null, loginMethod: null, role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("قوالب واجهات المتاجر", () => {
  it("يجلب بيانات المعاينة الحية من دون استدعاء حفظ قالب المتجر", async () => {
    await appRouter.createCaller(context("super_admin")).storefrontAdmin.shops();
    expect(vi.mocked(db.listAdminStorefrontTemplates)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.setAdminStorefrontTemplate)).not.toHaveBeenCalled();
  });

  it("يمنع صاحب المتجر من تعيين قالب متجر", async () => {
    await expect(appRouter.createCaller(context("shop_owner")).storefrontAdmin.setTemplate({ shopId: 15, storefrontTemplate: "fashion" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
    expect(vi.mocked(db.setAdminStorefrontTemplate)).not.toHaveBeenCalled();
  });

  it("يمرر Super Admin القالب والمتجر الصحيحين إلى طبقة البيانات", async () => {
    await appRouter.createCaller(context("super_admin")).storefrontAdmin.setTemplate({ shopId: 15, storefrontTemplate: "electronics" });
    expect(vi.mocked(db.setAdminStorefrontTemplate)).toHaveBeenCalledWith(33, 15, "electronics");
  });
});

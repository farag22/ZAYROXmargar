import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, createShop: vi.fn().mockRejectedValue(new Error("PLAN_SHOP_LIMIT")) };
});

import * as db from "./db";
import { appRouter } from "./routers";

describe("shops.create عند الوصول إلى حد الخطة", () => {
  it("يعيد رسالة ترقية عربية واضحة بدلاً من رمز PLAN_SHOP_LIMIT", async () => {
    const caller = appRouter.createCaller({
      user: { id: 5, openId: "free-owner", name: "Free Owner", email: null, loginMethod: null, role: "shop_owner", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"], res: {} as TrpcContext["res"],
    });
    await expect(caller.shops.create({ name: "المتجر الثاني", currency: "EGP", timezone: "Africa/Cairo" })).rejects.toMatchObject<Partial<TRPCError>>({
      code: "FORBIDDEN",
      message: "لقد وصلت للحد الأقصى من المتاجر في خطتك الحالية. قم بالترقية لإنشاء المزيد.",
    });
    expect(vi.mocked(db.createShop)).toHaveBeenCalledWith(5, expect.objectContaining({ name: "المتجر الثاني" }));
  });
});

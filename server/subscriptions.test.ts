import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("subscriptions.paymentInstructions", () => {
  it("يعيد تعليمات Vodafone Cash من إعدادات الخادم بصيغة رقم هاتف صالحة", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 1, openId: "test-user", name: "Test User", email: "test@example.com", passwordHash: null, loginMethod: "password", role: "shop_owner",
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    const instructions = await caller.subscriptions.paymentInstructions();

    expect(instructions.provider).toBe("Vodafone Cash");
    expect(instructions.currency).toBe("EGP");
    expect(instructions.destinationPhone).toMatch(/^0[0-9]{10}$/);
  });
});

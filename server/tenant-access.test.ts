import { describe, expect, it } from "vitest";
import { resolveShopAccess } from "./db";

describe("عزل بيانات المحلات", () => {
  const memberships = [
    { userId: 11, shopId: 101, role: "owner" as const },
    { userId: 12, shopId: 101, role: "cashier" as const },
    { userId: 11, shopId: 202, role: "manager" as const },
  ];

  it("لا يمنح المستخدم وصولاً إلى محل غير عضو فيه", () => {
    expect(resolveShopAccess(memberships, 11, 303)).toBeUndefined();
    expect(resolveShopAccess(memberships, 99, 101)).toBeUndefined();
  });

  it("يفرض دور العضو المطلوب داخل المحل نفسه", () => {
    expect(resolveShopAccess(memberships, 12, 101, ["owner", "manager"])).toBeUndefined();
    expect(resolveShopAccess(memberships, 11, 202, ["owner", "manager"])?.role).toBe("manager");
  });
});

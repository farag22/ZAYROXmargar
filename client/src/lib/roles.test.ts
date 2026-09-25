import { describe, expect, it } from "vitest";
import { canAccessAdmin } from "./roles";

describe("حماية واجهة /admin", () => {
  it("تعرض لوحة الإدارة فقط لدور Super Admin", () => {
    expect(canAccessAdmin("shop_owner")).toBe(false);
    expect(canAccessAdmin(undefined)).toBe(false);
    expect(canAccessAdmin("super_admin")).toBe(true);
  });
});

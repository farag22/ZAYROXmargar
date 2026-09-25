import { describe, expect, it } from "vitest";
import { canAccessAdmin } from "../client/src/lib/roles";

describe("حارس واجهة الإدارة", () => {
  it("يمنع Shop Owner ويجيز Super Admin لمسار /admin", () => {
    expect(canAccessAdmin("shop_owner")).toBe(false);
    expect(canAccessAdmin(undefined)).toBe(false);
    expect(canAccessAdmin("super_admin")).toBe(true);
  });
});

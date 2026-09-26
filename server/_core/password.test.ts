import { describe, expect, it } from "vitest";
import { hashPassword, normalizeEmail, verifyPassword } from "./password";

describe("تشفير كلمة المرور", () => {
  it("يثبت كلمة المرور الصحيحة ويرفض الخاطئة", async () => {
    const hash = await hashPassword("Secret123");
    await expect(verifyPassword("Secret123", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-pass", hash)).resolves.toBe(false);
  });

  it("يوحّد البريد الإلكتروني إلى أحرف صغيرة", () => {
    expect(normalizeEmail("  Owner@Example.COM ")).toBe("owner@example.com");
  });
});

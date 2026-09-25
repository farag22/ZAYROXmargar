import { describe, expect, it } from "vitest";
import { isSupportedProductImage } from "./productImage";

describe("التحقق من ملفات صور المنتجات", () => {
  it("يقبل صيغ الصور المسموحة ضمن الحد الأعلى للملف", () => {
    expect(isSupportedProductImage({ type: "image/jpeg", size: 1024 })).toBe(true);
    expect(isSupportedProductImage({ type: "image/png", size: 10 * 1024 * 1024 })).toBe(true);
    expect(isSupportedProductImage({ type: "application/pdf", size: 1024 })).toBe(false);
    expect(isSupportedProductImage({ type: "image/webp", size: 10 * 1024 * 1024 + 1 })).toBe(false);
  });
});

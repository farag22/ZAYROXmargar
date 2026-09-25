import { describe, expect, it } from "vitest";
import { isSupportedProductImage } from "../client/src/lib/productImage";

describe("مدخلات صورة المنتج", () => {
  it("يقبل صورة هاتف شائعة ضمن الحد ويمنع الملفات أو الأحجام غير الآمنة", () => {
    expect(isSupportedProductImage({ type: "image/jpeg", size: 3 * 1024 * 1024 })).toBe(true);
    expect(isSupportedProductImage({ type: "image/png", size: 10 * 1024 * 1024 })).toBe(true);
    expect(isSupportedProductImage({ type: "image/gif", size: 1024 })).toBe(false);
    expect(isSupportedProductImage({ type: "image/webp", size: 0 })).toBe(false);
    expect(isSupportedProductImage({ type: "image/webp", size: 10 * 1024 * 1024 + 1 })).toBe(false);
  });
});

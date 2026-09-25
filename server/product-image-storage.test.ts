import { describe, expect, it } from "vitest";
import { parseProductImageData, productImageStoragePath } from "./db";

const minimalWebpDataUrl = `data:image/webp;base64,${Buffer.from("RIFF0000WEBPVP8 ", "ascii").toString("base64")}`;

describe("تخزين صور المنتجات", () => {
  it("يتحقق من بصمة WebP ويربط مسار الصورة بالمحل والمنتج الصحيحين", () => {
    const image = parseProductImageData(minimalWebpDataUrl, "image/webp");
    expect(image.bytes.length).toBeGreaterThan(12);
    expect(productImageStoragePath(12, 55)).toBe("product-images/shop-12/product-55.webp");
  });

  it("يرفض بايتات لا تطابق صيغة WebP رغم وجود عنوان صورة", () => {
    const fake = `data:image/webp;base64,${Buffer.from("not-a-real-image", "ascii").toString("base64")}`;
    expect(() => parseProductImageData(fake, "image/webp")).toThrow("INVALID_PRODUCT_IMAGE_TYPE");
  });
});

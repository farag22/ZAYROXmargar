import { describe, expect, it } from "vitest";
import { buildStoreSlug } from "./db";

describe("رابط المتجر العام", () => {
  it("ينتج رابطاً ثابتاً وآمناً من الاسم ومعرف المتجر", () => {
    expect(buildStoreSlug("Al Noor Market", 18)).toBe("al-noor-market-18");
    expect(buildStoreSlug("عباد الرحمن", 7)).toBe("store-7");
    expect(buildStoreSlug("  My__Shop!!! ", 3)).toBe("my-shop-3");
  });
});

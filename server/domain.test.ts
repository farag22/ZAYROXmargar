import { describe, expect, it } from "vitest";
import { calculateSaleTotals, canAddProduct, canCreateShop, customerBalances } from "./domain";

describe("calculateSaleTotals", () => {
  it("يحسب الإجمالي والتكلفة والدين بالوحدات النقدية الصغرى", () => {
    const result = calculateSaleTotals([
      { productId: 1, quantity: 2, unitPriceCents: 1500, costPriceCents: 700 },
      { productId: 2, quantity: 1, unitPriceCents: 1000, costPriceCents: 300 },
    ], 500, 2500);
    expect(result).toEqual({ grossCents: 4000, costCents: 1700, totalCents: 3500, debtCents: 1000 });
  });

  it("يرفض خصماً أو دفعة غير صالحين", () => {
    const lines = [{ productId: 1, quantity: 1, unitPriceCents: 1000, costPriceCents: 400 }];
    expect(() => calculateSaleTotals(lines, 1001, 0)).toThrow("INVALID_DISCOUNT");
    expect(() => calculateSaleTotals(lines, 0, 1001)).toThrow("INVALID_PAYMENT");
  });
});

describe("customerBalances", () => {
  it("يجمع الديون ويخصم المدفوعات لكل عميل بدقة", () => {
    expect(customerBalances([
      { customerId: 4, type: "debt", amountCents: 5000 },
      { customerId: 4, type: "payment", amountCents: 1750 },
      { customerId: 8, type: "debt", amountCents: 900 },
    ])).toEqual({ 4: 3250, 8: 900 });
  });
});

describe("canAddProduct", () => {
  it("يفرض حد المنتجات للخطة دون تجاوز", () => {
    expect(canAddProduct(74, 75)).toBe(true);
    expect(canAddProduct(75, 75)).toBe(false);
  });
});

describe("canCreateShop", () => {
  it("يسمح للخطة المجانية بمتجر واحد فقط ويسمح للخطط المدفوعة بحدها المحدد", () => {
    expect(canCreateShop(0, 1)).toBe(true);
    expect(canCreateShop(1, 1)).toBe(false);
    expect(canCreateShop(1, 2)).toBe(true);
    expect(canCreateShop(2, 2)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { calculateStorefrontPaymentAmount, externalWalletGateways, manualPaymentStatus } from "./storefront-payments";

describe("طبقة دفع طلبات المتجر", () => {
  it("تطالب بالإجمالي للدفع الكامل وبالعربون فقط للاستلام", () => {
    expect(calculateStorefrontPaymentAmount({ mode: "wallet", totalCents: 12500, codDepositCents: 3000 })).toBe(12500);
    expect(calculateStorefrontPaymentAmount({ mode: "cash_on_delivery", totalCents: 12500, codDepositCents: 3000 })).toBe(3000);
  });

  it("يبقي المحافظ الخارجية غير مفعلة بلا مفاتيح تاجر ويبدأ المسار اليدوي بالمراجعة", () => {
    expect(externalWalletGateways).toEqual({});
    expect(manualPaymentStatus()).toBe("pending_verification");
  });
});

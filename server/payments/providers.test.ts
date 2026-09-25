import { describe, expect, it } from "vitest";
import { getPaymentProvider, vodafoneCashProvider } from "./providers";

describe("vodafoneCashProvider", () => {
  const receipt = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

  it("يقبل رقم هاتف محمول وإيصالاً مدعوماً", () => {
    expect(() => vodafoneCashProvider.validateSubmission({ payerPhone: "01003454288", receiptBase64: receipt, receiptContentType: "image/png" })).not.toThrow();
    expect(getPaymentProvider("vodafone_cash")).toBe(vodafoneCashProvider);
  });

  it("يرفض أرقام الهاتف غير الصالحة قبل إنشاء طلب الدفع", () => {
    expect(() => vodafoneCashProvider.validateSubmission({ payerPhone: "123", receiptBase64: receipt, receiptContentType: "image/png" })).toThrow("INVALID_PHONE");
  });
});

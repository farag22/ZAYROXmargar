export type PaymentSubmission = {
  payerPhone: string;
  transferReference?: string;
  receiptBase64: string;
  receiptContentType: "image/jpeg" | "image/png" | "image/webp";
};

export interface PaymentProvider {
  code: string;
  mode: "manual_review" | "api_checkout";
  validateSubmission(input: PaymentSubmission): void;
  createOrderCode(): string;
}

export const vodafoneCashProvider: PaymentProvider = {
  code: "vodafone_cash",
  mode: "manual_review",
  validateSubmission(input) {
    if (!/^\+?[0-9]{9,16}$/.test(input.payerPhone.replace(/[\s-]/g, ""))) throw new Error("INVALID_PHONE");
    if (!input.receiptBase64) throw new Error("RECEIPT_REQUIRED");
  },
  createOrderCode() {
    return `ZRX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  },
};

const providers = new Map([[vodafoneCashProvider.code, vodafoneCashProvider]]);

/** Register future bank, wallet, or official Vodafone Cash API providers here. */
export function getPaymentProvider(code: string) {
  const provider = providers.get(code);
  if (!provider) throw new Error("PAYMENT_PROVIDER_UNAVAILABLE");
  return provider;
}

export type StorefrontCustomerPaymentMode = "wallet" | "cash_on_delivery";

export type ExternalWalletGateway = {
  code: "vodafone_cash" | "etisalat_cash" | "orange_cash" | "instapay";
  createPayment?: (input: { orderNo: string; amountCents: number; currency: string; callbackUrl?: string }) => Promise<{ providerReference: string; redirectUrl?: string }>;
  verifyPayment?: (input: { providerReference: string }) => Promise<{ approved: boolean; providerPayload?: Record<string, unknown> }>;
};

/**
 * Official gateways are deliberately absent until a merchant supplies approved
 * provider credentials. Keeping this registry isolated avoids changing order logic
 * when a provider is connected later.
 */
export const externalWalletGateways: Partial<Record<ExternalWalletGateway["code"], ExternalWalletGateway>> = {};

export function calculateStorefrontPaymentAmount(input: { mode: StorefrontCustomerPaymentMode; totalCents: number; codDepositCents: number }) {
  if (input.mode === "wallet") return input.totalCents;
  return input.codDepositCents;
}

export function manualPaymentStatus() {
  return "pending_verification" as const;
}

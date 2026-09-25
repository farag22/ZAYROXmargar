export type SaleLine = { productId: number; quantity: number; unitPriceCents: number; costPriceCents: number };
export type DebtEntry = { customerId: number; type: "debt" | "payment" | "adjustment"; amountCents: number };

export function calculateSaleTotals(lines: SaleLine[], discountCents: number, paidCents: number) {
  const grossCents = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);
  const costCents = lines.reduce((sum, line) => sum + line.quantity * line.costPriceCents, 0);
  const totalCents = Math.max(0, grossCents - discountCents);
  if (discountCents < 0 || discountCents > grossCents) throw new Error("INVALID_DISCOUNT");
  if (paidCents < 0 || paidCents > totalCents) throw new Error("INVALID_PAYMENT");
  return { grossCents, costCents, totalCents, debtCents: totalCents - paidCents };
}

export function customerBalances(entries: DebtEntry[]) {
  return entries.reduce<Record<number, number>>((balances, entry) => {
    const direction = entry.type === "debt" ? 1 : -1;
    balances[entry.customerId] = (balances[entry.customerId] ?? 0) + direction * entry.amountCents;
    return balances;
  }, {});
}

export function canAddProduct(currentCount: number, maxProducts: number) {
  return currentCount < maxProducts;
}

export function canCreateShop(currentCount: number, maxShops: number) {
  return currentCount < maxShops;
}

export const EGYPTIAN_GOVERNORATES = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "البحر الأحمر", "البحيرة", "الفيوم", "الغربية", "الإسماعيلية",
  "المنوفية", "المنيا", "القليوبية", "الوادي الجديد", "السويس", "أسوان", "أسيوط", "بني سويف", "بورسعيد",
  "دمياط", "الشرقية", "جنوب سيناء", "كفر الشيخ", "مطروح", "الأقصر", "قنا", "شمال سيناء", "سوهاج",
] as const;

export const WALLET_PAYMENT_METHODS = [
  { value: "vodafone_cash", label: "فودافون كاش" },
  { value: "etisalat_cash", label: "اتصالات كاش" },
  { value: "orange_cash", label: "أورنج كاش" },
  { value: "instapay", label: "إنستاباي" },
] as const;

export type WalletPaymentMethod = typeof WALLET_PAYMENT_METHODS[number]["value"];

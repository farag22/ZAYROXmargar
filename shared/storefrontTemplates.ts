export const STOREFRONT_TEMPLATES = [
  { code: "classic", name: "كلاسيك موثوق", specialty: "عام ومتعدد المنتجات", description: "واجهة هادئة وعملية تناسب أغلب المتاجر.", accent: "#133d33", surface: "#f7f8f6" },
  { code: "fashion", name: "إطلالة", specialty: "أزياء وإكسسوارات", description: "بطاقات ناعمة وصورة منتج بارزة لعرض الموضة.", accent: "#7c2d4f", surface: "#fff7fa" },
  { code: "grocery", name: "سلة يومية", specialty: "بقالة وسوبرماركت", description: "ألوان حيوية ومعلومات سريعة للمنتجات اليومية.", accent: "#245d32", surface: "#f5fbf2" },
  { code: "electronics", name: "تقنية", specialty: "إلكترونيات وإكسسوارات", description: "أسلوب تقني متباين لعرض الأجهزة والعروض.", accent: "#263c8f", surface: "#f5f7ff" },
  { code: "beauty", name: "لمسة", specialty: "تجميل وعناية", description: "ألوان دافئة ومساحات نظيفة لمنتجات العناية.", accent: "#a23e63", surface: "#fff7f8" },
  { code: "home", name: "منزل", specialty: "أثاث وديكور", description: "مظهر دافئ لعرض قطع المنزل والديكور.", accent: "#8a5528", surface: "#fffaf4" },
  { code: "food", name: "مذاق", specialty: "مطاعم وحلويات", description: "واجهة شهية سريعة للمنيو والطلبات.", accent: "#a63c1d", surface: "#fff7f3" },
  { code: "pharmacy", name: "عناية", specialty: "صيدلية وصحة", description: "نمط واضح ومنظم لمنتجات العناية والصحة.", accent: "#167367", surface: "#f2fbf9" },
] as const;

export type StorefrontTemplateCode = typeof STOREFRONT_TEMPLATES[number]["code"];
export const storefrontTemplateCodes = STOREFRONT_TEMPLATES.map(template => template.code) as [StorefrontTemplateCode, ...StorefrontTemplateCode[]];

export function hasUnappliedStorefrontTemplatePreview(saved: StorefrontTemplateCode, preview: StorefrontTemplateCode) {
  return saved !== preview;
}

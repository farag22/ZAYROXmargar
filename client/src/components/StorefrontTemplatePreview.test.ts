import { describe, expect, it } from "vitest";
import { hasUnappliedStorefrontTemplatePreview, STOREFRONT_TEMPLATES } from "@shared/storefrontTemplates";

describe("معاينة قوالب المتاجر", () => {
  it("تحتوي القوالب المعروضة على بيانات كافية لمعاينة واجهة قبل اعتمادها", () => {
    expect(STOREFRONT_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    expect(STOREFRONT_TEMPLATES.every(template => template.name && template.specialty && template.description && template.accent && template.surface)).toBe(true);
  });

  it("يبقى القالب المحفوظ مختلفاً عن قالب المعاينة حتى لحظة الاعتماد", () => {
    const saved = "classic";
    const preview = "fashion";
    expect(hasUnappliedStorefrontTemplatePreview(saved, preview)).toBe(true);
    expect(hasUnappliedStorefrontTemplatePreview(saved, saved)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { hasUnappliedStorefrontTemplatePreview } from "../shared/storefrontTemplates";

describe("اختيار قالب معاينة المتجر", () => {
  it("لا يعتبر القالب الحالي تغييراً معلقاً", () => {
    expect(hasUnappliedStorefrontTemplatePreview("classic", "classic")).toBe(false);
  });

  it("يعتبر القالب المختلف معاينة معلقة حتى يُعتمد", () => {
    expect(hasUnappliedStorefrontTemplatePreview("classic", "fashion")).toBe(true);
  });
});

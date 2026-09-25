import { describe, expect, it } from "vitest";

describe("اعتمادات تصدير PDF", () => {
  it("يوفر محرك الالتقاط المتوافق ومكتبة إنشاء PDF الدوال المطلوبة", async () => {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);

    expect(html2canvas).toBeTypeOf("function");
    expect(jsPDF).toBeTypeOf("function");
  });
});

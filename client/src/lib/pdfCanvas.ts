import html2canvasPro from "html2canvas-pro";

type CaptureOptions = Parameters<typeof html2canvasPro>[1];

/**
 * يحافظ على هوية التقرير نصياً عند تحويله إلى Canvas.
 * صور الشعار الخارجية قد لا تسمح بخاصية CORS في بعض متصفحات الهاتف،
 * فتمنع إنشاء PDF كاملاً. لذلك تستبدل داخل النسخة المستنسخة فقط.
 */
export default async function captureReport(element: HTMLElement, options?: CaptureOptions) {
  const onclone = options?.onclone;

  return html2canvasPro(element, {
    ...options,
    onclone: document => {
      document.querySelectorAll<HTMLImageElement>("#zayrox-report-pdf img").forEach(image => {
        const replacement = document.createElement("span");
        replacement.textContent = "ZAYROX";
        replacement.setAttribute("aria-label", image.alt || "شعار المتجر");
        replacement.style.cssText = "display:grid;width:36px;height:36px;place-items:center;border-radius:10px;background:#e6f3ee;color:#0f766e;font:700 9px Arial,sans-serif;";
        image.replaceWith(replacement);
      });
      onclone?.(document, element);
    },
  });
}

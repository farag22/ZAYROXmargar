import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Banknote, BarChart3, FileDown, Loader2, TrendingUp, UsersRound, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export function ReportsView({ shopId, shop, activePlan }: { shopId: number; shop: any; activePlan: string }) {
  const initial = useMemo(() => { const now = new Date(); return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }; }, []);
  const [from, setFrom] = useState(initial.from); const [to, setTo] = useState(initial.to); const [exporting, setExporting] = useState(false);
  const report = trpc.analytics.report.useQuery({ shopId, from: new Date(`${from}T00:00:00`), to: new Date(`${to}T23:59:59`) }, { enabled: activePlan !== "free" });
  const [, setLocation] = useLocation();
  const exportPdf = async () => {
    const element = document.getElementById("zayrox-report-pdf");
    if (!element) return toast.error("لم يتم العثور على محتوى التقرير. حدّث الصفحة ثم أعد المحاولة.");
    let phase = "تحميل أدوات التصدير";
    try {
      setExporting(true);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      phase = "التقاط محتوى التقرير";
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      phase = "إنشاء ملف PDF";
      const image = canvas.toDataURL("image/png"); const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const width = 190; const height = (canvas.height / canvas.width) * width; let remaining = height; let y = 10;
      pdf.addImage(image, "PNG", 10, y, width, height); remaining -= 277;
      while (remaining > 0) { pdf.addPage(); y = 10 - (height - remaining); pdf.addImage(image, "PNG", 10, y, width, height); remaining -= 277; }
      phase = "تنزيل الملف"; pdf.save(`zayrox-report-${from}-${to}.pdf`); toast.success("تم إنشاء ملف PDF للتقرير");
    } catch (error) {
      console.error("PDF export failed", { phase, error });
      const suffix = phase === "تحميل أدوات التصدير" ? "تحقق من اتصالك ثم أعد المحاولة." : phase === "التقاط محتوى التقرير" ? "تحقق من الصور المرفوعة في هوية المتجر ثم أعد المحاولة." : phase === "تنزيل الملف" ? "اسمح للمتصفح بتنزيل الملفات ثم أعد المحاولة." : "حدّث الصفحة ثم أعد المحاولة.";
      toast.error(`تعذر التصدير أثناء ${phase}. ${suffix}`);
    } finally { setExporting(false); }
  };
  if (activePlan === "free") return <Card><CardContent className="p-10 text-center"><BarChart3 className="mx-auto size-9 text-primary"/><h3 className="mt-4 text-lg font-extrabold">التقارير المتقدمة متاحة في الخطة الأساسية</h3><p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">قم بالترقية لعرض تقارير الفترة وتصديرها كملف PDF قابل للمشاركة.</p><Button className="mt-5" onClick={() => setLocation("/billing")}>عرض الخطط</Button></CardContent></Card>;
  const data = report.data;
  return <div id="zayrox-report-pdf" className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-wide text-primary">تحليل الأداء</p><h1 className="mt-1 text-2xl font-extrabold">التقارير</h1><p className="mt-2 text-sm text-muted-foreground">تابع المبيعات والأرباح للفترة التي تختارها.</p></div><Button variant="outline" className="no-print" disabled={exporting} onClick={exportPdf}>{exporting ? <Loader2 className="ml-2 size-4 animate-spin"/> : <FileDown className="ml-2 size-4"/>}تصدير PDF</Button></div><Card className="no-print"><CardContent className="flex flex-wrap items-end gap-3 p-5"><ReportField label="من"><Input type="date" value={from} onChange={event => setFrom(event.target.value)}/></ReportField><ReportField label="إلى"><Input type="date" value={to} onChange={event => setTo(event.target.value)}/></ReportField><Button variant="secondary" onClick={() => report.refetch()}>تحديث التقرير</Button></CardContent></Card>{data ? <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Banknote} label="إجمالي المبيعات" value={formatMoney(data.salesCents, shop.currency)}/><Metric icon={TrendingUp} label="صافي الربح" value={formatMoney(data.profitCents, shop.currency)}/><Metric icon={WalletCards} label="المصروفات" value={formatMoney(data.expensesCents, shop.currency)}/><Metric icon={UsersRound} label="ديون العملاء" value={formatMoney(data.debtCents, shop.currency)}/></div><Card><CardHeader><CardTitle>ملخص الفترة</CardTitle></CardHeader><CardContent><p className="text-sm leading-8 text-muted-foreground">يعكس التقرير إجمالي المبيعات المحفوظة، بعد احتساب تكلفة المنتجات والمصروفات المسجلة. يظهر سبب الفشل ومرحلته إذا تعذر التصدير.</p></CardContent></Card></> : <div className="grid min-h-48 place-items-center"><Loader2 className="size-7 animate-spin text-primary"/></div>}</div>;
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) { return <Card><CardContent className="flex items-start justify-between p-5"><div><p className="text-xs text-muted-foreground">{label}</p><b className="mt-2 block text-xl">{value}</b></div><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5"/></span></CardContent></Card>; }
function ReportField({ label, children }: { label: string; children: React.ReactNode }) { return <Label className="grid gap-1.5 text-sm"><span>{label}</span>{children}</Label>; }

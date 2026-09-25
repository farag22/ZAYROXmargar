import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatMoney } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Circle, ClipboardCheck, Loader2, MessageCircle, PackageCheck, Search, Store, Truck, XCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";

const stages = ["new", "processing", "ready_to_ship", "shipped", "delivered"] as const;
const emptyTrackingInput = { orderNo: "pending", customerPhone: "pending" };
const statusMeta = {
  new: { label: "طلب جديد", detail: "تم استلام طلبك", icon: ClipboardCheck },
  processing: { label: "جاري التجهيز", detail: "يجري تجهيز المنتجات", icon: PackageCheck },
  ready_to_ship: { label: "جاهز للشحن", detail: "طلبك جاهز لمغادرة المتجر", icon: PackageCheck },
  shipped: { label: "تم الشحن", detail: "طلبك في الطريق إليك", icon: Truck },
  delivered: { label: "تم التسليم", detail: "تم تسليم طلبك بنجاح", icon: CheckCircle2 },
  cancelled: { label: "ملغي", detail: "تم إلغاء هذا الطلب", icon: XCircle },
} as const;

type TrackingStatus = keyof typeof statusMeta;

export default function TrackOrder() {
  const [orderNo, setOrderNo] = useState(() => new URLSearchParams(window.location.search).get("orderNo")?.trim().toUpperCase() ?? "");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState<{ orderNo: string; customerPhone: string } | null>(null);
  const tracking = trpc.storefront.trackOrder.useQuery(submitted ?? emptyTrackingInput, { enabled: Boolean(submitted), retry: false, refetchInterval: submitted ? 15000 : false, refetchIntervalInBackground: false });
  const data = tracking.data;
  const currentStatus = (data?.order.status ?? "new") as TrackingStatus;
  const currentIndex = currentStatus !== "cancelled" ? stages.indexOf(currentStatus as typeof stages[number]) : -1;
  const submit = (event: FormEvent) => { event.preventDefault(); setSubmitted({ orderNo: orderNo.trim().toUpperCase(), customerPhone: phone.trim() }); };
  const safeOrderNo = data?.order.orderNo ?? orderNo.trim().toUpperCase();
  const trackingLink = `${window.location.origin}/track-order?orderNo=${encodeURIComponent(safeOrderNo)}`;
  const whatsAppHref = data ? `https://wa.me/?text=${encodeURIComponent(`مرحباً، يمكنك متابعة حالة طلبك رقم ${data.order.orderNo} من ${data.shop.name} عبر الرابط التالي:\n${trackingLink}\n\nستحتاج رقم الهاتف المسجل في الطلب لعرض الحالة.`)}` : "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#d8f4e8_0,_#f8faf9_38%,_#fff_75%)] px-4 py-8 text-foreground sm:py-14" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <header className="mb-7 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Search className="size-6"/></div>
          <p className="mt-5 text-xs font-bold tracking-[0.16em] text-primary">ZAYROX TRACK</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">تتبّع طلبك</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">أدخل رقم الطلب ورقم الهاتف الذي استخدمته عند الشراء لمتابعة حالة طلبك مباشرة.</p>
        </header>

        <Card className="border-primary/10 shadow-xl shadow-primary/5">
          <CardContent className="p-5 sm:p-7">
            <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={submit}>
              <Field label="رقم الطلب"><Input dir="ltr" value={orderNo} onChange={event => setOrderNo(event.target.value)} placeholder="WEB-..." required/></Field>
              <Field label="رقم الهاتف"><Input dir="ltr" inputMode="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="01000000000" required/></Field>
              <Button type="submit" className="sm:h-10" disabled={tracking.isFetching}><Search className="ml-1.5 size-4"/>بحث</Button>
            </form>
            {tracking.isError && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">تعذر العثور على طلب مطابق لرقم الطلب ورقم الهاتف. تأكد من البيانات ثم حاول مرة أخرى.</p>}
            <div className="mt-4">{data ? <Button asChild className="w-full bg-[#25D366] text-white hover:bg-[#1da851]"><a href={whatsAppHref} target="_blank" rel="noopener noreferrer"><MessageCircle className="ml-1.5 size-4"/>إرسال رابط التتبع عبر واتساب</a></Button> : <Button disabled className="w-full"><MessageCircle className="ml-1.5 size-4"/>ابحث عن الطلب أولاً لإرسال رابط التتبع</Button>}</div>
          </CardContent>
        </Card>

        {tracking.isFetching && !data && <div className="grid min-h-48 place-items-center"><Loader2 className="size-7 animate-spin text-primary"/></div>}

        {data && <section className="mt-6 overflow-hidden rounded-3xl border bg-card shadow-xl shadow-primary/5">
          <div className="border-b bg-gradient-to-l from-primary to-[#167a63] p-6 text-primary-foreground">
            <div className="flex items-center gap-3"><span className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-white/15">{data.shop.logoUrl ? <img src={data.shop.logoUrl} alt={`شعار ${data.shop.name}`} className="size-full object-cover"/> : <Store className="size-5"/>}</span><div className="min-w-0"><p className="text-xs text-white/75">متجر</p><h2 className="truncate text-lg font-extrabold">{data.shop.name}</h2></div></div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black/15 px-4 py-3"><span className="text-xs text-white/75">رقم الطلب</span><b dir="ltr" className="text-sm tracking-wide">{data.order.orderNo}</b></div>
          </div>

          <div className="p-5 sm:p-7">
            <div className="mb-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border bg-muted/20 p-4"><p className="text-xs font-bold text-muted-foreground">التوصيل</p><p className="mt-1 text-sm font-bold">{data.order.deliveryGovernorate ?? "لم تحدد المحافظة"}</p><p className="mt-1 text-xs text-muted-foreground">الرسوم: {formatMoney(data.order.deliveryFeeCents ?? 0, "EGP")}</p></div><div className="rounded-2xl border bg-muted/20 p-4"><p className="text-xs font-bold text-muted-foreground">حالة الدفع</p><p className="mt-1 text-sm font-bold">{data.order.paymentStatus === "approved" ? "تم اعتماد الدفع" : data.order.paymentStatus === "rejected" ? "يرجى مراجعة إثبات الدفع مع المتجر" : "بانتظار مراجعة التاجر"}</p><p className="mt-1 text-xs text-muted-foreground">الإجمالي: {formatMoney(data.order.totalCents, "EGP")}</p></div></div>
            {currentStatus === "cancelled" ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900"><div className="flex items-center gap-2 font-bold"><XCircle className="size-5"/>تم إلغاء الطلب</div><p className="mt-2 text-sm">يرجى التواصل مع المتجر إذا احتجت إلى مزيد من التفاصيل.</p></div> : <div className="relative mr-2 space-y-0 border-r-2 border-dashed border-primary/20 pr-7">{stages.map((status, index) => { const meta = statusMeta[status]; const Icon = meta.icon; const done = currentIndex >= index; const current = currentStatus === status; return <div className="relative pb-7 last:pb-0" key={status}><span className={`absolute -right-[2.1rem] top-0 grid size-7 place-items-center rounded-full border-4 border-card ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{done ? <Icon className="size-3.5"/> : <Circle className="size-3.5"/>}</span><div className={current ? "rounded-2xl border border-primary/20 bg-primary/5 p-3" : "p-1"}><div className="flex items-center justify-between gap-3"><b className={done ? "text-foreground" : "text-muted-foreground"}>{meta.label}</b>{current && <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">الحالة الحالية</span>}</div><p className="mt-1 text-xs text-muted-foreground">{meta.detail}</p></div></div>; })}</div>}

            <div className="mt-7 rounded-2xl bg-secondary/70 p-4"><p className="text-xs font-bold text-muted-foreground">آخر تحديث</p><p className="mt-1 text-sm font-bold">{data.events.at(-1)?.message ?? statusMeta[currentStatus].detail}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(data.events.at(-1)?.createdAt ?? data.order.updatedAt)}</p></div>
            <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">تتحدث هذه الصفحة تلقائياً أثناء فتحها. يمكنك مشاركة رابط التتبع عبر واتساب، وستتوفر لاحقاً إشعارات تلقائية عند تغيير الحالة.</p>
            {data.shop.slug && <Button asChild variant="outline" className="mt-4 w-full"><Link href={`/store/${data.shop.slug}`}>العودة إلى المتجر</Link></Button>}
          </div>
        </section>}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <Label className="grid gap-1.5 text-sm font-bold"><span>{label}</span>{children}</Label>; }

import { ImageSourcePicker } from "@/components/ImageSourcePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { compressProductImage, type CompressedProductImage } from "@/lib/productImage";
import { trpc } from "@/lib/trpc";
import { DeliveryPaymentSettings } from "@/components/DeliveryPaymentSettings";
import { Copy, ImageIcon, Link2, Loader2, Store } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

export default function ShopBranding({ shopId, shop }: { shopId: number; shop: any }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(shop.name);
  const [description, setDescription] = useState(shop.description ?? "");
  const [phone, setPhone] = useState(shop.phone ?? "");
  const [address, setAddress] = useState(shop.address ?? "");
  const [businessHours, setBusinessHours] = useState(shop.businessHours ?? "");
  const [logo, setLogo] = useState<CompressedProductImage | null>(null);
  const [cover, setCover] = useState<CompressedProductImage | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [processing, setProcessing] = useState<"logo" | "cover" | null>(null);

  useEffect(() => { setName(shop.name); setDescription(shop.description ?? ""); setPhone(shop.phone ?? ""); setAddress(shop.address ?? ""); setBusinessHours(shop.businessHours ?? ""); }, [shop]);
  const update = trpc.shops.updateIdentity.useMutation({ onSuccess: () => { utils.shops.list.invalidate(); toast.success("تم حفظ هوية المتجر"); }, onError: error => toast.error(error.message) });
  const selectImage = async (kind: "logo" | "cover", event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { setProcessing(kind); const compressed = await compressProductImage(file); if (kind === "logo") { setLogo(compressed); setRemoveLogo(false); } else { setCover(compressed); setRemoveCover(false); } toast.success("تم ضغط الصورة وتجهيز المعاينة"); } catch { toast.error("استخدم صورة JPG أو PNG أو WEBP لا تزيد عن 10 ميغابايت."); } finally { setProcessing(null); } };
  const submit = (event: FormEvent) => { event.preventDefault(); update.mutate({ shopId, name, description: description || undefined, phone: phone || undefined, address: address || undefined, businessHours: businessHours || undefined, logoBase64: logo?.dataUrl, coverBase64: cover?.dataUrl, removeLogo, removeCover }); };
  const storeUrl = shop.slug ? `${window.location.origin}/store/${shop.slug}` : "";
  const logoPreview = logo?.previewUrl || (!removeLogo ? shop.logoUrl : null);
  const coverPreview = cover?.previewUrl || (!removeCover ? shop.coverImageUrl : null);

  return <div className="mx-auto max-w-5xl space-y-5"><header><p className="text-xs font-bold tracking-wide text-primary">هوية متجرك</p><h1 className="mt-1 text-2xl font-extrabold">تخصيص المتجر</h1><p className="mt-2 text-sm text-muted-foreground">اختر صورة من الاستوديو أو التقطها بالكاميرا، ثم احفظها فوراً ضمن هوية متجرك.</p></header><form className="space-y-5" onSubmit={submit}><Card className="overflow-hidden"><div className="relative h-52 bg-gradient-to-br from-[#103a31] via-primary to-[#63c5a3] sm:h-64">{coverPreview && <img src={coverPreview} alt="غلاف المتجر" className="absolute inset-0 size-full object-cover"/>}<div className="absolute inset-x-4 bottom-4 rounded-2xl bg-black/45 p-3 backdrop-blur"><p className="mb-2 text-xs font-bold text-white">صورة الغلاف</p><ImageSourcePicker onSelect={event => selectImage("cover", event)} disabled={Boolean(processing) || update.isPending} compact/></div>{coverPreview && <button type="button" className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-bold text-destructive" onClick={() => { setCover(null); setRemoveCover(true); }}>إزالة الغلاف</button>}<div className="absolute -bottom-11 right-5 grid size-24 place-items-center overflow-hidden rounded-3xl border-4 border-card bg-white shadow-lg">{logoPreview ? <img src={logoPreview} alt="شعار المتجر" className="size-full object-cover"/> : <Store className="size-8 text-primary"/>}</div></div><CardContent className="pt-16"><div className="flex flex-col gap-3"><div><h2 className="font-bold">شعار المتجر</h2><p className="mt-1 text-xs text-muted-foreground">يفضّل شعار مربع أو قريب من المربع ليظهر بوضوح في المتجر والفواتير.</p></div><ImageSourcePicker onSelect={event => selectImage("logo", event)} disabled={Boolean(processing) || update.isPending}/>{logoPreview && <button type="button" className="w-fit text-xs font-bold text-destructive" onClick={() => { setLogo(null); setRemoveLogo(true); }}>إزالة الشعار</button>}</div></CardContent></Card><Card><CardHeader><CardTitle>بيانات المتجر</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><BrandField label="اسم المتجر"><Input value={name} onChange={event => setName(event.target.value)} required/></BrandField><BrandField label="رقم التواصل"><Input dir="ltr" value={phone} onChange={event => setPhone(event.target.value)} placeholder="01000000000"/></BrandField><BrandField label="الوصف المختصر" className="md:col-span-2"><Textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="عرّف العملاء بمتجرك وما تقدمه"/></BrandField><BrandField label="العنوان" className="md:col-span-2"><Textarea value={address} onChange={event => setAddress(event.target.value)} placeholder="المدينة، الحي، الشارع"/></BrandField><BrandField label="ساعات العمل" className="md:col-span-2"><Input value={businessHours} onChange={event => setBusinessHours(event.target.value)} placeholder="يومياً من 10 ص إلى 10 م"/></BrandField></CardContent></Card><Card><CardContent className="flex flex-wrap items-center gap-4 p-5"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Link2 className="size-5"/></span><div className="min-w-0 flex-1"><b className="block">رابط متجرك العام</b><p dir="ltr" className="mt-1 truncate text-xs text-muted-foreground">{storeUrl || "سيُنشأ الرابط عند حفظ المتجر"}</p></div><Button type="button" variant="outline" disabled={!storeUrl} onClick={async () => { await navigator.clipboard.writeText(storeUrl); toast.success("تم نسخ رابط المتجر"); }}><Copy className="ml-1 size-4"/>نسخ الرابط</Button></CardContent></Card><Button type="submit" size="lg" disabled={update.isPending || Boolean(processing)}>{(update.isPending || processing) && <Loader2 className="ml-2 size-4 animate-spin"/>}حفظ الهوية</Button></form><DeliveryPaymentSettings shopId={shopId} currency={shop.currency}/></div>;
}

function BrandField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) { return <Label className={`grid gap-1.5 text-sm ${className ?? ""}`}><span>{label}</span>{children}</Label>; }

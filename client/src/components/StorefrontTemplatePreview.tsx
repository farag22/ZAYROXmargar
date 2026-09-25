import { STOREFRONT_TEMPLATES, type StorefrontTemplateCode } from "@shared/storefrontTemplates";
import { Image as ImageIcon, Plus, ShoppingBag } from "lucide-react";
import React from "react";

type PreviewShop = { shopName: string; logoUrl?: string | null; coverImageUrl?: string | null; description?: string | null };

export function StorefrontTemplatePreview({ shop, templateCode }: { shop: PreviewShop; templateCode: StorefrontTemplateCode }) {
  const template = STOREFRONT_TEMPLATES.find(item => item.code === templateCode) ?? STOREFRONT_TEMPLATES[0];
  const portrait = ["fashion", "beauty"].includes(template.code);
  const softCorners = ["beauty", "food"].includes(template.code);
  const angular = template.code === "electronics";
  const warmBorder = template.code === "home";
  return <div className="overflow-hidden rounded-2xl border bg-white shadow-sm" aria-label={`معاينة قالب ${template.name}`}>
    <div className={`relative flex min-h-28 items-end overflow-hidden p-3 text-white ${template.code === "food" || template.code === "fashion" ? "min-h-36" : ""} ${angular ? "rounded-none" : ""}`} style={{ background: shop.coverImageUrl ? `linear-gradient(110deg, ${template.accent}e8, ${template.accent}a8), url(${shop.coverImageUrl}) center / cover` : `linear-gradient(120deg, ${template.accent}, ${template.accent}b3)` }}>
      <span className="absolute left-3 top-3 rounded-full bg-white/20 px-2 py-1 text-[9px] font-bold backdrop-blur">معاينة مباشرة</span>
      <div className="flex min-w-0 items-end gap-2"><PreviewLogo url={shop.logoUrl} name={shop.shopName}/><div className="min-w-0"><b className="block truncate text-sm">{shop.shopName}</b><p className="mt-0.5 line-clamp-1 text-[10px] text-white/80">{shop.description || "واجهة المتجر حسب القالب المختار"}</p></div></div>
    </div>
    <div className="p-3" style={{ backgroundColor: template.surface }}>
      <div className="mb-3 flex items-center justify-between"><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold" style={{ color: template.accent }}>الكل</span><span className="text-[9px] text-slate-500">{template.specialty}</span></div>
      <div className="grid grid-cols-3 gap-2">{["منتج مميز", "عرض اليوم", "إضافة للسلة"].map((name, index) => <div key={name} className={`overflow-hidden bg-white shadow-sm ${softCorners ? "rounded-2xl" : angular ? "rounded-md" : "rounded-xl"} ${warmBorder ? "border border-amber-900/15" : ""}`}><div className={`grid place-items-center bg-gradient-to-br from-white to-black/5 ${portrait ? "aspect-[4/5]" : template.code === "home" || template.code === "food" || angular ? "aspect-[4/3]" : "aspect-square"}`}><ImageIcon className="size-4" style={{ color: template.accent }}/></div><div className="p-1.5"><b className="block truncate text-[8px]">{name}</b><span className="mt-1 block text-[8px] font-bold" style={{ color: template.accent }}>{index === 1 ? "عرض" : "99 ج.م"}</span><span className={`mt-1 grid h-5 place-items-center text-white ${softCorners ? "rounded-full" : angular ? "rounded-sm" : "rounded-md"}`} style={{ backgroundColor: template.accent }}><Plus className="size-3"/></span></div></div>)}</div>
      <div className="mt-3 flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-[10px] font-bold text-white" style={{ backgroundColor: template.accent }}><ShoppingBag className="size-3"/>السلة · 0</div>
    </div>
  </div>;
}

function PreviewLogo({ url, name }: { url?: string | null; name: string }) { if (!url) return <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/20 text-sm font-extrabold">{name.slice(0, 1)}</span>; return <img src={url} alt="" className="size-9 shrink-0 rounded-xl border border-white/50 bg-white object-cover"/>; }

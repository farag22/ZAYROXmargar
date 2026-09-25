import { StorefrontTemplatePreview } from "@/components/StorefrontTemplatePreview";
import { hasUnappliedStorefrontTemplatePreview, STOREFRONT_TEMPLATES, type StorefrontTemplateCode } from "@shared/storefrontTemplates";
import React, { useState } from "react";

export type AdminStorefrontRow = { shopId: number; shopName: string; shopSlug?: string | null; storefrontTemplate: string; logoUrl?: string | null; coverImageUrl?: string | null; description?: string | null; ownerName?: string | null; ownerEmail?: string | null };

export function StorefrontTemplateManager({ rows, pending, onCommit }: { rows: AdminStorefrontRow[]; pending: boolean; onCommit: (shopId: number, storefrontTemplate: StorefrontTemplateCode) => void }) {
  const [previewTemplates, setPreviewTemplates] = useState<Record<number, StorefrontTemplateCode>>({});
  return <div className="grid gap-5 xl:grid-cols-2">{rows.map(row => {
    const savedCode = (STOREFRONT_TEMPLATES.find(template => template.code === row.storefrontTemplate)?.code ?? "classic") as StorefrontTemplateCode;
    const previewCode = previewTemplates[row.shopId] ?? savedCode;
    const preview = STOREFRONT_TEMPLATES.find(template => template.code === previewCode) ?? STOREFRONT_TEMPLATES[0];
    const hasUnappliedPreview = hasUnappliedStorefrontTemplatePreview(savedCode, previewCode);
    return <article key={row.shopId} className={`rounded-2xl border bg-white p-4 ${hasUnappliedPreview ? "border-primary/40 shadow-md shadow-primary/5" : ""}`}>
      <div className="mb-3 flex items-start gap-3"><span className="mt-1 size-10 rounded-xl" style={{ backgroundColor: preview.accent }}/><div className="min-w-0"><h2 className="truncate text-base font-bold">{row.shopName}</h2><p className="mt-1 truncate text-xs text-muted-foreground">{row.ownerName ?? row.ownerEmail ?? "صاحب المتجر"}{row.shopSlug ? ` · /store/${row.shopSlug}` : ""}</p></div></div>
      <label className="grid gap-1.5 text-xs font-bold text-muted-foreground"><span>اختيار قالب المعاينة</span><select aria-label={`معاينة قالب ${row.shopName}`} value={previewCode} disabled={pending} className="h-10 rounded-lg border bg-white px-3 text-sm text-foreground" onChange={event => setPreviewTemplates(current => ({ ...current, [row.shopId]: event.target.value as StorefrontTemplateCode }))}>{STOREFRONT_TEMPLATES.map(template => <option value={template.code} key={template.code}>{template.name} — {template.specialty}</option>)}</select></label>
      <div className="mt-3"><StorefrontTemplatePreview shop={row} templateCode={previewCode}/></div>
      <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">{preview.description}</p>
      <div className="mt-3 flex gap-2"><button type="button" className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" disabled={pending || !hasUnappliedPreview} onClick={() => onCommit(row.shopId, previewCode)}>اعتماد القالب</button><button type="button" className="rounded-lg border px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50" disabled={!hasUnappliedPreview || pending} onClick={() => setPreviewTemplates(current => { const next = { ...current }; delete next[row.shopId]; return next; })}>إلغاء المعاينة</button></div>
      {hasUnappliedPreview && <p className="mt-2 text-center text-[11px] font-bold text-primary">هذه معاينة مؤقتة؛ لم يُطبّق أي تغيير على المتجر.</p>}
    </article>;
  })}</div>;
}

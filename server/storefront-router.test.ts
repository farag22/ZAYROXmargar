import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createStorefrontOrder: vi.fn(),
    getPublicOrderTracking: vi.fn(),
    listStorefrontOrders: vi.fn().mockResolvedValue([]),
    updateStorefrontOrderStatus: vi.fn().mockResolvedValue(undefined),
    updateStorefrontOrderPaymentStatus: vi.fn().mockResolvedValue(undefined),
    listDeliveryZones: vi.fn().mockResolvedValue([]),
    saveDeliveryZones: vi.fn().mockResolvedValue(undefined),
    listShopPaymentMethods: vi.fn().mockResolvedValue([]),
    saveShopPaymentMethods: vi.fn().mockResolvedValue(undefined),
  };
});

import * as db from "./db";
import { appRouter } from "./routers";

const owner = {
  id: 5, openId: "shop-owner", name: "Shop Owner", email: null, loginMethod: null,
  role: "shop_owner" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

function caller(user = owner) {
  return appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

describe("عقود Customer Storefront", () => {
  it("يعيد رقم الطلب والإجمالي اللذين يحسبهما الخادم عند نجاح إنشاء الطلب", async () => {
    vi.mocked(db.createStorefrontOrder).mockResolvedValueOnce({ id: 18, orderNo: "WEB-TEST-123", subtotalCents: 8000, deliveryFeeCents: 1500, totalCents: 9500, paymentAmountCents: 9500, currency: "EGP" });
    await expect(caller(null).storefront.createOrder({
      slug: "store-1", customerName: "عميل", customerPhone: "01000000000", customerAddress: "القاهرة", deliveryGovernorate: "القاهرة",
      payment: { mode: "wallet", method: "vodafone_cash", proofBase64: "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vuUAAA=", proofContentType: "image/webp" },
      items: [{ productId: 9, quantity: 1 }],
    })).resolves.toEqual({ id: 18, orderNo: "WEB-TEST-123", subtotalCents: 8000, deliveryFeeCents: 1500, totalCents: 9500, paymentAmountCents: 9500, currency: "EGP" });
  });

  it("يعرض رسالة عربية مفهومة عند تغير المخزون قبل الإرسال", async () => {
    vi.mocked(db.createStorefrontOrder).mockRejectedValueOnce(new Error("INSUFFICIENT_STOCK"));
    await expect(caller(null).storefront.createOrder({
      slug: "store-1", customerName: "عميل", customerPhone: "01000000000", customerAddress: "القاهرة", deliveryGovernorate: "القاهرة",
      payment: { mode: "wallet", method: "vodafone_cash", proofBase64: "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vuUAAA=", proofContentType: "image/webp" },
      items: [{ productId: 9, quantity: 2 }],
    })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST", message: "الكمية المطلوبة لم تعد متاحة في المخزون." });
    expect(vi.mocked(db.createStorefrontOrder)).toHaveBeenCalledWith("store-1", expect.objectContaining({ customerName: "عميل" }));
  });

  it("يمرر معرف المتجر ومعرف الطلب عند تحديث حالته للتاجر", async () => {
    await caller().storefrontOrders.updateStatus({ shopId: 42, orderId: 77, status: "ready_to_ship" });
    expect(vi.mocked(db.updateStorefrontOrderStatus)).toHaveBeenCalledWith(5, 42, 77, "ready_to_ship");
  });

  it("يعرض رسالة عربية عند عدم تفعيل التوصيل للمحافظة المختارة", async () => {
    vi.mocked(db.createStorefrontOrder).mockRejectedValueOnce(new Error("DELIVERY_NOT_AVAILABLE"));
    await expect(caller(null).storefront.createOrder({
      slug: "store-1", customerName: "عميل", customerPhone: "01000000000", customerAddress: "القاهرة", deliveryGovernorate: "القاهرة",
      payment: { mode: "cash_on_delivery", method: "vodafone_cash", proofBase64: "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vuUAAA=", proofContentType: "image/webp" }, items: [{ productId: 9, quantity: 1 }],
    })).rejects.toMatchObject<Partial<TRPCError>>({ code: "BAD_REQUEST", message: "التوصيل غير متاح إلى هذه المحافظة حالياً." });
  });

  it("يمرر قرار مراجعة العربون ضمن متجر التاجر فقط", async () => {
    await caller().storefrontOrders.updatePaymentStatus({ shopId: 42, orderId: 77, paymentStatus: "approved" });
    expect(vi.mocked(db.updateStorefrontOrderPaymentStatus)).toHaveBeenCalledWith(5, 42, 77, "approved");
  });

  it("يحفظ إعدادات التوصيل والمحفظة مقيّدة بمعرف المتجر", async () => {
    await caller().deliveryZones.save({ shopId: 42, zones: [{ governorate: "القاهرة", feeCents: 2500, isActive: true }] });
    await caller().shopPaymentMethods.save({ shopId: 42, methods: [{ method: "vodafone_cash", accountNumber: "01000000000", isActive: true, isCodDepositMethod: true, codDepositCents: 5000 }] });
    expect(vi.mocked(db.saveDeliveryZones)).toHaveBeenCalledWith(5, 42, [{ governorate: "القاهرة", feeCents: 2500, isActive: true }]);
    expect(vi.mocked(db.saveShopPaymentMethods)).toHaveBeenCalledWith(5, 42, [{ method: "vodafone_cash", accountNumber: "01000000000", isActive: true, isCodDepositMethod: true, codDepositCents: 5000 }]);
  });

  it("يعرض التتبع العام عند تطابق رقم الطلب والهاتف فقط", async () => {
    vi.mocked(db.getPublicOrderTracking).mockResolvedValueOnce({ order: { orderNo: "WEB-TEST-123", status: "processing", createdAt: new Date(), updatedAt: new Date() }, shop: { name: "متجر الاختبار", logoUrl: null, slug: "store-1" }, events: [{ status: "processing", message: "طلبك قيد التجهيز.", createdAt: new Date() }] });
    await expect(caller(null).storefront.trackOrder({ orderNo: "WEB-TEST-123", customerPhone: "01000000000" })).resolves.toMatchObject({ order: { orderNo: "WEB-TEST-123", status: "processing" }, shop: { slug: "store-1" } });
    expect(vi.mocked(db.getPublicOrderTracking)).toHaveBeenCalledWith("WEB-TEST-123", "01000000000");
  });

  it("لا يكشف وجود الطلب عندما لا يطابق الهاتف", async () => {
    vi.mocked(db.getPublicOrderTracking).mockRejectedValueOnce(new Error("ORDER_NOT_FOUND"));
    await expect(caller(null).storefront.trackOrder({ orderNo: "WEB-TEST-123", customerPhone: "01099999999" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "NOT_FOUND", message: "تعذر العثور على طلب مطابق لرقم الطلب ورقم الهاتف." });
  });

  it("يرفض قائمة الطلبات للزوار غير المسجلين", async () => {
    await expect(caller(null).storefrontOrders.list({ shopId: 42 })).rejects.toMatchObject<Partial<TRPCError>>({ code: "UNAUTHORIZED" });
    expect(vi.mocked(db.listStorefrontOrders)).not.toHaveBeenCalledWith(undefined, 42);
  });
});

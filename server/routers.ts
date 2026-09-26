import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { verifyPassword } from "./_core/password";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storefrontTemplateCodes } from "../shared/storefrontTemplates";

const shopInput = z.object({ shopId: z.number().int().positive() });
const money = z.number().int().min(0);
const text = (max: number) => z.string().trim().min(1).max(max);
const productImageInput = {
  productImageBase64: z.string().startsWith("data:image/webp;base64,").max(3_000_000).optional(),
  productImageContentType: z.literal("image/webp").optional(),
};

function todayRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return safeUser;
    }),
    register: publicProcedure
      .input(
        z.object({
          name: text(80),
          email: z.string().trim().email().max(320),
          password: z.string().min(8).max(72),
        })
      )
      .mutation(async ({ ctx, input }) => {
        console.log("1. Starting registration for:", input.email);

        if (ctx.user) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "أنت مسجّل الدخول بالفعل." });
        }

        const email = input.email.trim().toLowerCase();
        const name = input.name.trim();

        try {
          console.log("2. Calling db.createLocalUser...");
          const user = await db.createLocalUser({
            name,
            email,
            password: input.password,
          });
          console.log("3. User created successfully:", user?.id);

          console.log("4. Creating session token...");
          const sessionToken = await sdk.createSessionToken(user.openId, {
            name: user.name || name,
            expiresInMs: ONE_YEAR_MS,
          });
          console.log("5. Session token created.");

          console.log("6. Setting cookie...");
          ctx.res.cookie(COOKIE_NAME, sessionToken, {
            ...getSessionCookieOptions(ctx.req),
            maxAge: ONE_YEAR_MS,
          });
          console.log("7. Cookie set. Returning success.");

          return { success: true } as const;
        } catch (error) {
          console.error("8. CAUGHT ERROR IN REGISTER:", error);
          if (error instanceof Error && error.message === "EMAIL_TAKEN") {
            throw new TRPCError({ code: "CONFLICT", message: "هذا البريد الإلكتروني مستخدم بالفعل." });
          }
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "حدث خطأ غير معروف",
          });
        }
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().trim().email().max(320),
        password: z.string().min(1).max(72),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user?.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
        }
        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
        }
        await db.recordLocalSignIn(user.id);
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.email || "user",
          expiresInMs: ONE_YEAR_MS,
        });
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: router({
    me: protectedProcedure.query(({ ctx }) => ({ id: ctx.user.id, name: ctx.user.name, email: ctx.user.email, role: ctx.user.role })),
  }),
  shops: router({
    list: protectedProcedure.query(({ ctx }) => db.listUserShops(ctx.user.id)),
    create: protectedProcedure.input(z.object({ name: text(120), currency: z.string().length(3).default("EGP"), timezone: z.string().min(3).max(64).default("Africa/Cairo") })).mutation(async ({ ctx, input }) => {
      try {
        return await db.createShop(ctx.user.id, input);
      } catch (error) {
        if (error instanceof Error && error.message === "PLAN_SHOP_LIMIT") {
          throw new TRPCError({ code: "FORBIDDEN", message: "لقد وصلت للحد الأقصى من المتاجر في خطتك الحالية. قم بالترقية لإنشاء المزيد." });
        }
        throw error;
      }
    }),
    update: protectedProcedure.input(shopInput.extend({ name: text(120), currency: z.string().length(3), timezone: z.string().min(3).max(64) })).mutation(({ ctx, input }) => db.updateShop(ctx.user.id, input.shopId, input)),
    updateIdentity: protectedProcedure.input(shopInput.extend({ name: text(120), description: z.string().trim().max(1000).optional(), phone: z.string().trim().max(32).optional(), address: z.string().trim().max(500).optional(), businessHours: z.string().trim().max(255).optional(), logoBase64: z.string().startsWith("data:image/webp;base64,").max(3_000_000).optional(), coverBase64: z.string().startsWith("data:image/webp;base64,").max(3_000_000).optional(), removeLogo: z.boolean().optional(), removeCover: z.boolean().optional() })).mutation(({ ctx, input }) => db.updateShopIdentity(ctx.user.id, input.shopId, input)),
  }),
  storefront: router({
    get: publicProcedure.input(z.object({ slug: z.string().trim().regex(/^[a-z0-9-]{1,120}$/) })).query(({ input }) => db.getPublicStorefront(input.slug)),
    trackOrder: publicProcedure.input(z.object({ orderNo: z.string().trim().min(6).max(48), customerPhone: z.string().trim().min(7).max(32) })).query(async ({ input }) => {
      try { return await db.getPublicOrderTracking(input.orderNo, input.customerPhone); }
      catch { throw new TRPCError({ code: "NOT_FOUND", message: "تعذر العثور على طلب مطابق لرقم الطلب ورقم الهاتف." }); }
    }),
    createOrder: publicProcedure.input(z.object({
      slug: z.string().trim().regex(/^[a-z0-9-]{1,120}$/), customerName: text(150), customerPhone: z.string().trim().min(7).max(32), customerAddress: text(500), customerNote: z.string().trim().max(1000).optional(), deliveryGovernorate: text(80),
      payment: z.object({ mode: z.enum(["wallet", "cash_on_delivery"]), method: z.enum(["vodafone_cash", "etisalat_cash", "orange_cash", "instapay"]), payerPhone: z.string().trim().max(32).optional(), reference: z.string().trim().max(120).optional(), proofBase64: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/).max(6_000_000), proofContentType: z.enum(["image/jpeg", "image/png", "image/webp"]) }),
      items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) })).min(1).max(50),
    })).mutation(async ({ input }) => {
      try { return await db.createStorefrontOrder(input.slug, input); }
      catch (error) {
        const code = error instanceof Error ? error.message : "";
        const messages: Record<string, string> = { EMPTY_CART: "سلة المشتريات فارغة.", PRODUCT_NOT_FOUND: "أحد المنتجات لم يعد متاحاً.", INSUFFICIENT_STOCK: "الكمية المطلوبة لم تعد متاحة في المخزون.", STOREFRONT_NOT_FOUND: "هذا المتجر غير متاح حالياً.", DELIVERY_GOVERNORATE_REQUIRED: "اختر المحافظة لإتمام حساب رسوم التوصيل.", DELIVERY_NOT_AVAILABLE: "التوصيل غير متاح إلى هذه المحافظة حالياً.", PAYMENT_METHOD_NOT_AVAILABLE: "طريقة الدفع المختارة غير متاحة حالياً.", COD_DEPOSIT_NOT_AVAILABLE: "لا يتوفر عربون للدفع عند الاستلام عبر هذه المحفظة.", PAYMENT_AMOUNT_REQUIRED: "لم يحدد التاجر مبلغاً صالحاً للدفع أو العربون." };
        throw new TRPCError({ code: "BAD_REQUEST", message: messages[code] ?? "تعذر إتمام الطلب الآن. حاول مرة أخرى." });
      }
    }),
  }),
  deliveryZones: router({
    list: protectedProcedure.input(shopInput).query(({ ctx, input }) => db.listDeliveryZones(ctx.user.id, input.shopId)),
    save: protectedProcedure.input(shopInput.extend({ zones: z.array(z.object({ governorate: text(80), feeCents: money, isActive: z.boolean() })).max(27) })).mutation(({ ctx, input }) => db.saveDeliveryZones(ctx.user.id, input.shopId, input.zones)),
  }),
  shopPaymentMethods: router({
    list: protectedProcedure.input(shopInput).query(({ ctx, input }) => db.listShopPaymentMethods(ctx.user.id, input.shopId)),
    save: protectedProcedure.input(shopInput.extend({ methods: z.array(z.object({ method: z.enum(["vodafone_cash", "etisalat_cash", "orange_cash", "instapay"]), accountName: z.string().trim().max(120).optional(), accountNumber: text(96), isActive: z.boolean(), isCodDepositMethod: z.boolean(), codDepositCents: money })).max(4) })).mutation(({ ctx, input }) => db.saveShopPaymentMethods(ctx.user.id, input.shopId, input.methods)),
  }),
  storefrontOrders: router({
    list: protectedProcedure.input(shopInput).query(({ ctx, input }) => db.listStorefrontOrders(ctx.user.id, input.shopId)),
    updateStatus: protectedProcedure.input(shopInput.extend({ orderId: z.number().int().positive(), status: z.enum(["new", "processing", "ready_to_ship", "shipped", "delivered", "cancelled"]) })).mutation(({ ctx, input }) => db.updateStorefrontOrderStatus(ctx.user.id, input.shopId, input.orderId, input.status)),
    updatePaymentStatus: protectedProcedure.input(shopInput.extend({ orderId: z.number().int().positive(), paymentStatus: z.enum(["approved", "rejected"]) })).mutation(({ ctx, input }) => db.updateStorefrontOrderPaymentStatus(ctx.user.id, input.shopId, input.orderId, input.paymentStatus)),
  }),
  categories: router({
    list: protectedProcedure.input(shopInput).query(({ ctx, input }) => db.listCategories(ctx.user.id, input.shopId)),
    create: protectedProcedure.input(shopInput.extend({ name: text(80), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).mutation(({ ctx, input }) => db.createCategory(ctx.user.id, input.shopId, input)),
  }),
  products: router({
    list: protectedProcedure.input(shopInput.extend({ search: z.string().max(100).optional() })).query(({ ctx, input }) => db.listProducts(ctx.user.id, input.shopId, input.search)),
    create: protectedProcedure.input(shopInput.extend({
      name: text(160), sku: z.string().trim().max(80).optional(), categoryId: z.number().int().positive().nullable().optional(), sellingPriceCents: money.min(1), costPriceCents: money, quantityInStock: z.number().int().min(0), reorderPoint: z.number().int().min(0), ...productImageInput,
    })).mutation(({ ctx, input }) => db.createProduct(ctx.user.id, input.shopId, input)),
    update: protectedProcedure.input(shopInput.extend({
      productId: z.number().int().positive(), name: text(160), sku: z.string().trim().max(80).optional(), categoryId: z.number().int().positive().nullable().optional(), sellingPriceCents: money.min(1), costPriceCents: money, quantityInStock: z.number().int().min(0), reorderPoint: z.number().int().min(0), removeProductImage: z.boolean().optional(), ...productImageInput,
    })).mutation(({ ctx, input }) => db.updateProduct(ctx.user.id, input.shopId, input)),
    adjustStock: protectedProcedure.input(shopInput.extend({ productId: z.number().int().positive(), quantityDelta: z.number().int().refine(value => value !== 0), note: z.string().trim().max(255).optional() })).mutation(({ ctx, input }) => db.adjustProductStock(ctx.user.id, input.shopId, input)),
  }),
  customers: router({
    list: protectedProcedure.input(shopInput.extend({ search: z.string().max(100).optional() })).query(({ ctx, input }) => db.listCustomersWithBalances(ctx.user.id, input.shopId, input.search)),
    create: protectedProcedure.input(shopInput.extend({ name: text(150), phone: z.string().trim().max(32).optional(), email: z.string().email().max(320).optional(), note: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) => db.createCustomer(ctx.user.id, input.shopId, input)),
    recordPayment: protectedProcedure.input(shopInput.extend({ customerId: z.number().int().positive(), amountCents: money.min(1), note: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) => db.recordDebtPayment(ctx.user.id, input.shopId, input)),
  }),
  sales: router({
    list: protectedProcedure.input(shopInput.extend({ search: z.string().max(100).optional() })).query(({ ctx, input }) => db.listSales(ctx.user.id, input.shopId, input.search)),
    create: protectedProcedure.input(shopInput.extend({
      lines: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1) })).min(1).max(100), customerId: z.number().int().positive().nullable().optional(), paidCents: money, discountCents: money, paymentMethod: z.enum(["cash", "card", "transfer", "credit"]), note: z.string().trim().max(2000).optional(), dueDate: z.coerce.date().nullable().optional(),
    })).mutation(({ ctx, input }) => db.createSale(ctx.user.id, input.shopId, input)),
  }),
  expenses: router({
    list: protectedProcedure.input(shopInput).query(({ ctx, input }) => db.listExpenses(ctx.user.id, input.shopId)),
    create: protectedProcedure.input(shopInput.extend({ category: text(80), amountCents: money.min(1), note: z.string().trim().max(2000).optional(), spentAt: z.coerce.date().optional() })).mutation(({ ctx, input }) => db.createExpense(ctx.user.id, input.shopId, input)),
  }),
  analytics: router({
    dashboard: protectedProcedure.input(shopInput).query(({ ctx, input }) => {
      const { from, to } = todayRange();
      return db.getDashboard(ctx.user.id, input.shopId, from, to);
    }),
    report: protectedProcedure.input(shopInput.extend({ from: z.coerce.date(), to: z.coerce.date() })).query(({ ctx, input }) => db.getPaidReport(ctx.user.id, input.shopId, input.from, input.to)),
  }),
  notifications: router({
    list: protectedProcedure.input(shopInput).query(({ ctx, input }) => db.listNotifications(ctx.user.id, input.shopId)),
    markRead: protectedProcedure.input(shopInput.extend({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => db.markNotificationRead(ctx.user.id, input.shopId, input.notificationId)),
  }),
  subscriptions: router({
    plans: publicProcedure.query(() => db.listPlans()),
    get: protectedProcedure.input(shopInput).query(({ ctx, input }) => db.getSubscription(ctx.user.id, input.shopId)),
    paymentInstructions: protectedProcedure.query(() => ({ provider: "Vodafone Cash", destinationPhone: process.env.VODAFONE_CASH_NUMBER ?? "سيُعرض رقم التحويل بعد إعداد Vodafone Cash", currency: "EGP" })),
    createVodafoneCashRequest: protectedProcedure.input(shopInput.extend({
      plan: z.enum(["basic", "pro"]), billingMonths: z.number().int().min(1).max(12), payerPhone: z.string().trim().min(9).max(32), transferReference: z.string().trim().max(96).optional(), receiptBase64: z.string().min(50).max(6_000_000), receiptContentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    })).mutation(({ ctx, input }) => db.createVodafoneCashRequest(ctx.user.id, input.shopId, input)),
    requests: protectedProcedure.input(shopInput).query(({ ctx, input }) => db.listPaymentRequestsForShop(ctx.user.id, input.shopId)),
  }),
  billingAdmin: router({
    metrics: adminProcedure.query(() => db.getAdminSubscriptionMetrics()),
    paymentRequests: adminProcedure.input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() })).query(({ ctx, input }) => db.listAdminPaymentRequests(ctx.user.id, input.status)),
    review: adminProcedure.input(z.object({ paymentRequestId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), rejectionReason: z.string().trim().min(3).max(255).optional() })).mutation(({ ctx, input }) => db.reviewPaymentRequest(ctx.user.id, input)),
    plans: adminProcedure.query(() => db.listPlans(true)),
    updatePlan: adminProcedure.input(z.object({ code: z.enum(["free", "basic", "pro"]), name: text(80), priceCents: money, maxProducts: z.number().int().min(1), maxShops: z.number().int().min(1), reportsEnabled: z.boolean(), pdfExportEnabled: z.boolean(), isActive: z.boolean() })).mutation(({ ctx, input }) => db.updatePlanDefinition(ctx.user.id, input)),
    setSubscriptionStatus: adminProcedure.input(z.object({ shopId: z.number().int().positive(), status: z.enum(["active", "canceled", "past_due"]) })).mutation(({ ctx, input }) => db.setSubscriptionStatus(ctx.user.id, input)),
    subscriptions: adminProcedure.query(() => db.listAdminSubscriptions()),
    auditLogs: adminProcedure.query(() => db.listAdminAuditLogs()),
  }),
  storefrontAdmin: router({
    shops: adminProcedure.query(() => db.listAdminStorefrontTemplates()),
    setTemplate: adminProcedure.input(z.object({ shopId: z.number().int().positive(), storefrontTemplate: z.enum(storefrontTemplateCodes) })).mutation(({ ctx, input }) => db.setAdminStorefrontTemplate(ctx.user.id, input.shopId, input.storefrontTemplate)),
  }),
});

export type AppRouter = typeof appRouter;

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, like, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  adminAuditLogs,
  categories,
  customers,
  debtTransactions,
  expenses,
  inventoryMovements,
  notifications,
  paymentAuditLogs,
  paymentRequests,
  plans,
  products,
  saleItems,
  sales,
  shopDeliveryZones,
  shopMembers,
  shopPaymentMethods,
  shops,
  storefrontOrderItems,
  storefrontOrderStatusEvents,
  storefrontOrders,
  subscriptions,
  type InsertUser,
  type ShopMemberRole,
  type User,
  users,
} from "../drizzle/schema";
import { calculateSaleTotals, canCreateShop, customerBalances } from "./domain";
import { isDirectSupabaseHost } from "./_core/databaseUrl";
import { ENV } from "./_core/env";
import { hashPassword, normalizeEmail } from "./_core/password";
import { storagePut } from "./storage";
import { getPaymentProvider } from "./payments/providers";
import { WALLET_PAYMENT_METHODS, type WalletPaymentMethod } from "../shared/commerce";
import { storefrontTemplateCodes, type StorefrontTemplateCode } from "../shared/storefrontTemplates";
import { calculateStorefrontPaymentAmount, manualPaymentStatus, type StorefrontCustomerPaymentMode } from "./storefront-payments";

export type AppPlan = "free" | "basic" | "pro";
export type SaleInputLine = { productId: number; quantity: number };
export type StorefrontOrderStatus = "new" | "processing" | "ready_to_ship" | "shipped" | "delivered" | "cancelled";
type StorefrontPaymentMode = StorefrontCustomerPaymentMode;
type StorefrontPaymentStatus = "not_required" | "pending_verification" | "approved" | "rejected" | "cash_on_delivery";
type PaymentMethodInput = {
  method: WalletPaymentMethod;
  accountName?: string;
  accountNumber: string;
  isActive: boolean;
  isCodDepositMethod: boolean;
  codDepositCents: number;
};

const walletMethodCodes = new Set(WALLET_PAYMENT_METHODS.map(method => method.value));

const orderStatusMessages: Record<StorefrontOrderStatus, string> = {
  new: "تم استلام طلبك.",
  processing: "طلبك قيد التجهيز.",
  ready_to_ship: "طلبك جاهز للشحن.",
  shipped: "تم شحن طلبك وهو في الطريق إليك.",
  delivered: "تم تسليم طلبك بنجاح.",
  cancelled: "تم إلغاء الطلب.",
};

function legacyTrackingStatus(status: "new" | "processing" | "shipped" | "completed"): StorefrontOrderStatus {
  return status === "completed" ? "delivered" : status;
}

function persistedLegacyStatus(status: StorefrontOrderStatus): "new" | "processing" | "shipped" | "completed" {
  if (status === "ready_to_ship") return "processing";
  if (status === "delivered" || status === "cancelled") return "completed";
  return status;
}

let _db: ReturnType<typeof drizzle> | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  const url = ENV.databaseUrl;
  if (url && isDirectSupabaseHost(url)) {
    throw new Error("استخدم Session pooler من Supabase (aws-0-....pooler.supabase.com) وليس db.xxx.supabase.co");
  }
  if (!_db && url) {
    _sql = postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
      ssl: url.includes("supabase.co") || url.includes("pooler.supabase.com") ? "require" : undefined,
    });
    _db = drizzle(_sql);
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod", "passwordHash"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "super_admin";
    updateSet.role = "super_admin";
  }
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getUserByEmail(email: string) {
  const db = await requireDb();
  const normalized = normalizeEmail(email);
  return (await db.select().from(users).where(eq(users.email, normalized)).limit(1))[0];
}

export async function createLocalUser(input: { name: string; email: string; password: string }): Promise<User> {
  const db = await requireDb();
  const email = normalizeEmail(input.email);
  const existing = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
  if (existing) throw new Error("EMAIL_TAKEN");
  const openId = `local_${randomUUID()}`;
  const passwordHash = await hashPassword(input.password);
  const role = openId === ENV.ownerOpenId ? "super_admin" : "shop_owner";
  const inserted = await db.insert(users).values({
    openId,
    name: input.name.trim(),
    email,
    passwordHash,
    loginMethod: "password",
    role,
    lastSignedIn: new Date(),
  }).returning();
  const created = inserted[0];
  if (!created) throw new Error("USER_CREATE_FAILED");
  return created;
}

export async function recordLocalSignIn(userId: number) {
  const db = await requireDb();
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function listUserShops(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ shop: shops, role: shopMembers.role, plan: subscriptions.plan, subscriptionStatus: subscriptions.status })
    .from(shopMembers)
    .innerJoin(shops, eq(shopMembers.shopId, shops.id))
    .leftJoin(subscriptions, eq(subscriptions.shopId, shops.id))
    .where(eq(shopMembers.userId, userId))
    .orderBy(desc(shops.createdAt));
  return rows.map(row => ({
    ...row,
    plan: row.plan && ["basic", "pro"].includes(row.plan) && ["active", "trialing"].includes(row.subscriptionStatus ?? "") ? row.plan : "free" as AppPlan,
  }));
}

export function resolveShopAccess(
  memberships: Array<{ userId: number; shopId: number; role: ShopMemberRole }>,
  userId: number,
  shopId: number,
  allowedRoles?: ShopMemberRole[],
) {
  const membership = memberships.find(item => item.userId === userId && item.shopId === shopId);
  if (!membership) return undefined;
  if (allowedRoles && !allowedRoles.includes(membership.role)) return undefined;
  return membership;
}

export async function assertShopAccess(userId: number, shopId: number, allowedRoles?: ShopMemberRole[]) {
  const db = await requireDb();
  const memberships = await db
    .select()
    .from(shopMembers)
    .where(and(eq(shopMembers.userId, userId), eq(shopMembers.shopId, shopId)))
    .limit(1);
  const membership = resolveShopAccess(memberships, userId, shopId, allowedRoles);
  if (!membership) throw new Error("FORBIDDEN_SHOP");
  return membership;
}

export async function listPlans(includeInactive = false) {
  await ensureDefaultPlans();
  const db = await requireDb();
  return db.select().from(plans).where(includeInactive ? undefined : eq(plans.isActive, 1)).orderBy(plans.priceCents);
}

async function ensureDefaultPlans() {
  const db = await requireDb();
  await db.insert(plans).values([
    { code: "free", name: "مجانية", priceCents: 0, maxProducts: 50, maxShops: 1, reportsEnabled: 0, pdfExportEnabled: 0, isActive: 1 },
    { code: "basic", name: "أساسية", priceCents: 9900, maxProducts: 300, maxShops: 3, reportsEnabled: 1, pdfExportEnabled: 0, isActive: 1 },
    { code: "pro", name: "احترافية", priceCents: 19900, maxProducts: 5000, maxShops: 10, reportsEnabled: 1, pdfExportEnabled: 1, isActive: 1 },
  ]).onConflictDoNothing();
}

export async function getPlanDefinition(code: AppPlan) {
  const db = await requireDb();
  let plan = (await db.select().from(plans).where(eq(plans.code, code)).limit(1))[0];
  if (!plan) {
    await ensureDefaultPlans();
    plan = (await db.select().from(plans).where(eq(plans.code, code)).limit(1))[0];
  }
  if (!plan) throw new Error("PLAN_CONFIGURATION_MISSING");
  return plan;
}

export async function getPlanForShop(shopId: number): Promise<AppPlan> {
  const db = await requireDb();
  const subscription = (await db.select().from(subscriptions).where(eq(subscriptions.shopId, shopId)).limit(1))[0];
  if (subscription && subscription.endsAt && subscription.endsAt < new Date()) return "free";
  return subscription && ["basic", "pro"].includes(subscription.plan) && ["active", "trialing"].includes(subscription.status)
    ? subscription.plan
    : "free";
}

export async function assertPlanFeature(shopId: number, feature: "reports" | "pdfExport") {
  const plan = await getPlanDefinition(await getPlanForShop(shopId));
  if (feature === "reports" && !plan.reportsEnabled) throw new Error("PLAN_FEATURE_REQUIRED");
  if (feature === "pdfExport" && !plan.pdfExportEnabled) throw new Error("PLAN_FEATURE_REQUIRED");
}

async function getOwnerPlan(userId: number) {
  const db = await requireDb();
  const ownerSubscriptions = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status, endsAt: subscriptions.endsAt })
    .from(shops)
    .leftJoin(subscriptions, eq(subscriptions.shopId, shops.id))
    .where(eq(shops.ownerUserId, userId));
  const now = new Date();
  if (ownerSubscriptions.some(item => item.plan === "pro" && ["active", "trialing"].includes(item.status ?? "") && (!item.endsAt || item.endsAt > now))) return "pro" as const;
  if (ownerSubscriptions.some(item => item.plan === "basic" && ["active", "trialing"].includes(item.status ?? "") && (!item.endsAt || item.endsAt > now))) return "basic" as const;
  return "free" as const;
}

export function buildStoreSlug(name: string, shopId: number) {
  const normalized = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const base = normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "store";
  return `${base}-${shopId}`;
}

export async function createShop(userId: number, input: { name: string; currency: string; timezone: string }) {
  const db = await requireDb();
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(shops).where(eq(shops.ownerUserId, userId));
  const currentPlan = await getOwnerPlan(userId);
  const plan = await getPlanDefinition(currentPlan);
  if (!plan.isActive || !canCreateShop(Number(count), plan.maxShops)) throw new Error("PLAN_SHOP_LIMIT");
  return db.transaction(async tx => {
    const [created] = await tx.insert(shops).values({ ...input, ownerUserId: userId }).returning({ id: shops.id });
    await tx.update(shops).set({ slug: buildStoreSlug(input.name, created.id) }).where(eq(shops.id, created.id));
    await tx.insert(shopMembers).values({ shopId: created.id, userId, role: "owner" });
    await tx.insert(subscriptions).values({ shopId: created.id, plan: "free", status: "active" });
    return created;
  });
}

export async function updateShop(userId: number, shopId: number, input: { name: string; currency: string; timezone: string }) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  await db.update(shops).set(input).where(eq(shops.id, shopId));
}

async function uploadShopIdentityImage(shopId: number, kind: "logo" | "cover", base64: string) {
  const image = parseProductImageData(base64, "image/webp");
  return storagePut(`shop-identities/shop-${shopId}/${kind}.webp`, image.bytes, image.contentType);
}

export async function updateShopIdentity(userId: number, shopId: number, input: {
  name: string; description?: string; phone?: string; address?: string; businessHours?: string; logoBase64?: string; coverBase64?: string; removeLogo?: boolean; removeCover?: boolean;
}) {
  await assertShopAccess(userId, shopId, ["owner"]);
  const db = await requireDb();
  const shop = (await db.select().from(shops).where(eq(shops.id, shopId)).limit(1))[0];
  if (!shop) throw new Error("SHOP_NOT_FOUND");
  const [logo, cover] = await Promise.all([
    input.logoBase64 ? uploadShopIdentityImage(shopId, "logo", input.logoBase64) : undefined,
    input.coverBase64 ? uploadShopIdentityImage(shopId, "cover", input.coverBase64) : undefined,
  ]);
  await db.update(shops).set({
    name: input.name,
    description: input.description?.trim() || null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    businessHours: input.businessHours?.trim() || null,
    logoUrl: input.removeLogo ? null : (logo?.url ?? shop.logoUrl),
    coverImageUrl: input.removeCover ? null : (cover?.url ?? shop.coverImageUrl),
  }).where(eq(shops.id, shopId));
}

export async function getPublicStorefront(slug: string) {
  const db = await requireDb();
  const shop = (await db.select().from(shops).where(and(eq(shops.slug, slug), eq(shops.isStorefrontActive, 1))).limit(1))[0];
  if (!shop) throw new Error("STOREFRONT_NOT_FOUND");
  const [categoryRows, productRows, deliveryZones, paymentMethods] = await Promise.all([
    db.select().from(categories).where(eq(categories.shopId, shop.id)).orderBy(categories.name),
    db.select({ product: products, categoryName: categories.name, categoryColor: categories.color }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(eq(products.shopId, shop.id), eq(products.isActive, 1))).orderBy(desc(products.updatedAt)),
    db.select({ governorate: shopDeliveryZones.governorate, feeCents: shopDeliveryZones.feeCents }).from(shopDeliveryZones).where(and(eq(shopDeliveryZones.shopId, shop.id), eq(shopDeliveryZones.isActive, 1))).orderBy(asc(shopDeliveryZones.governorate)),
    db.select({ method: shopPaymentMethods.method, accountName: shopPaymentMethods.accountName, accountNumber: shopPaymentMethods.accountNumber, isCodDepositMethod: shopPaymentMethods.isCodDepositMethod, codDepositCents: shopPaymentMethods.codDepositCents }).from(shopPaymentMethods).where(and(eq(shopPaymentMethods.shopId, shop.id), eq(shopPaymentMethods.isActive, 1))).orderBy(asc(shopPaymentMethods.method)),
  ]);
  return { shop, categories: categoryRows, products: productRows, deliveryZones, paymentMethods };
}

export async function listDeliveryZones(userId: number, shopId: number) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  return db.select().from(shopDeliveryZones).where(eq(shopDeliveryZones.shopId, shopId)).orderBy(asc(shopDeliveryZones.governorate));
}

export async function saveDeliveryZones(userId: number, shopId: number, zones: Array<{ governorate: string; feeCents: number; isActive: boolean }>) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  const normalized = Array.from(new Map(zones.map(zone => [zone.governorate.trim(), { ...zone, governorate: zone.governorate.trim() }])).values());
  if (normalized.some(zone => !zone.governorate || !Number.isInteger(zone.feeCents) || zone.feeCents < 0)) throw new Error("INVALID_DELIVERY_ZONE");
  await db.transaction(async tx => {
    await tx.delete(shopDeliveryZones).where(eq(shopDeliveryZones.shopId, shopId));
    if (normalized.length) await tx.insert(shopDeliveryZones).values(normalized.map(zone => ({ shopId, governorate: zone.governorate, feeCents: zone.feeCents, isActive: zone.isActive ? 1 : 0 })));
  });
}

export async function listShopPaymentMethods(userId: number, shopId: number) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  return db.select().from(shopPaymentMethods).where(eq(shopPaymentMethods.shopId, shopId)).orderBy(asc(shopPaymentMethods.method));
}

export async function saveShopPaymentMethods(userId: number, shopId: number, methods: PaymentMethodInput[]) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  const normalized = Array.from(new Map(methods.map(method => [method.method, { ...method, accountName: method.accountName?.trim() || null, accountNumber: method.accountNumber.trim() }])).values());
  if (normalized.some(method => !walletMethodCodes.has(method.method) || !method.accountNumber || !Number.isInteger(method.codDepositCents) || method.codDepositCents < 0)) throw new Error("INVALID_PAYMENT_METHOD");
  await db.transaction(async tx => {
    await tx.delete(shopPaymentMethods).where(eq(shopPaymentMethods.shopId, shopId));
    if (normalized.length) await tx.insert(shopPaymentMethods).values(normalized.map(method => ({
      shopId, method: method.method, accountName: method.accountName, accountNumber: method.accountNumber,
      isActive: method.isActive ? 1 : 0, isCodDepositMethod: method.isCodDepositMethod ? 1 : 0, codDepositCents: method.codDepositCents,
    })));
  });
}

async function uploadStorefrontPaymentProof(shopId: number, orderNo: string, base64: string, contentType: "image/jpeg" | "image/png" | "image/webp") {
  const bytes = decodeReceipt(base64);
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return storagePut(`storefront-payment-proofs/shop-${shopId}/${orderNo}.${extension}`, bytes, contentType);
}

export async function createStorefrontOrder(slug: string, input: {
  customerName: string; customerPhone: string; customerAddress: string; customerNote?: string; deliveryGovernorate?: string;
  payment: { mode: StorefrontPaymentMode; method: WalletPaymentMethod; payerPhone?: string; reference?: string; proofBase64: string; proofContentType: "image/jpeg" | "image/png" | "image/webp" };
  items: Array<{ productId: number; quantity: number }>;
}) {
  const db = await requireDb();
  const shop = (await db.select().from(shops).where(and(eq(shops.slug, slug), eq(shops.isStorefrontActive, 1))).limit(1))[0];
  if (!shop) throw new Error("STOREFRONT_NOT_FOUND");
  const quantityByProduct = new Map<number, number>();
  input.items.forEach(item => quantityByProduct.set(item.productId, (quantityByProduct.get(item.productId) ?? 0) + item.quantity));
  const productIds = Array.from(quantityByProduct.keys());
  if (!productIds.length) throw new Error("EMPTY_CART");
  const matched = await db.select().from(products).where(and(eq(products.shopId, shop.id), eq(products.isActive, 1), inArray(products.id, productIds)));
  if (matched.length !== productIds.length) throw new Error("PRODUCT_NOT_FOUND");
  for (const product of matched) if (product.quantityInStock < (quantityByProduct.get(product.id) ?? 0)) throw new Error("INSUFFICIENT_STOCK");
  const subtotalCents = matched.reduce((sum, product) => sum + product.sellingPriceCents * (quantityByProduct.get(product.id) ?? 0), 0);
  const governorate = input.deliveryGovernorate?.trim();
  if (!governorate) throw new Error("DELIVERY_GOVERNORATE_REQUIRED");
  const deliveryZone = (await db.select().from(shopDeliveryZones).where(and(eq(shopDeliveryZones.shopId, shop.id), eq(shopDeliveryZones.governorate, governorate), eq(shopDeliveryZones.isActive, 1))).limit(1))[0];
  if (!deliveryZone) throw new Error("DELIVERY_NOT_AVAILABLE");
  const paymentMethod = (await db.select().from(shopPaymentMethods).where(and(eq(shopPaymentMethods.shopId, shop.id), eq(shopPaymentMethods.method, input.payment.method), eq(shopPaymentMethods.isActive, 1))).limit(1))[0];
  if (!paymentMethod) throw new Error("PAYMENT_METHOD_NOT_AVAILABLE");
  if (input.payment.mode === "cash_on_delivery" && !paymentMethod.isCodDepositMethod) throw new Error("COD_DEPOSIT_NOT_AVAILABLE");
  const deliveryFeeCents = deliveryZone.feeCents;
  const totalCents = subtotalCents + deliveryFeeCents;
  const paymentAmountCents = calculateStorefrontPaymentAmount({ mode: input.payment.mode, totalCents, codDepositCents: paymentMethod.codDepositCents });
  if (paymentAmountCents <= 0) throw new Error("PAYMENT_AMOUNT_REQUIRED");
  const orderNo = `WEB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  const proof = await uploadStorefrontPaymentProof(shop.id, orderNo, input.payment.proofBase64, input.payment.proofContentType);
  return db.transaction(async tx => {
    const [created] = await tx.insert(storefrontOrders).values({
      shopId: shop.id, orderNo, customerName: input.customerName, customerPhone: input.customerPhone, customerAddress: input.customerAddress, customerNote: input.customerNote || null,
      subtotalCents, deliveryGovernorate: governorate, deliveryFeeCents, totalCents, paymentMode: input.payment.mode, paymentMethod: paymentMethod.method,
      paymentAccountNumber: paymentMethod.accountNumber, paymentAmountCents, paymentStatus: manualPaymentStatus(), paymentPayerPhone: input.payment.payerPhone?.trim() || null,
      paymentReference: input.payment.reference?.trim() || null, paymentProofUrl: proof.url,
    }).returning({ id: storefrontOrders.id });
    await tx.insert(storefrontOrderStatusEvents).values({ shopId: shop.id, orderId: created.id, status: "new", channel: "in_app", message: orderStatusMessages.new });
    await tx.insert(storefrontOrderItems).values(matched.map(product => { const quantity = quantityByProduct.get(product.id) ?? 0; return { shopId: shop.id, orderId: created.id, productId: product.id, productName: product.name, productImage: product.productImage, unitPriceCents: product.sellingPriceCents, quantity, lineTotalCents: product.sellingPriceCents * quantity }; }));
    for (const product of matched) {
      const quantity = quantityByProduct.get(product.id) ?? 0;
      const updated = await tx.update(products).set({ quantityInStock: sql`${products.quantityInStock} - ${quantity}` }).where(and(eq(products.id, product.id), eq(products.shopId, shop.id), eq(products.isActive, 1), gte(products.quantityInStock, quantity))).returning({ id: products.id });
      if (updated.length !== 1) throw new Error("INSUFFICIENT_STOCK");
      await tx.insert(inventoryMovements).values({ shopId: shop.id, productId: product.id, type: "sale", quantityDelta: -quantity, note: `طلب متجر ${orderNo}`, createdByUserId: shop.ownerUserId });
    }
    await tx.insert(notifications).values({ shopId: shop.id, type: "system", title: "طلب متجر جديد", body: `وصل طلب ${orderNo} إلى ${governorate} بقيمة ${(totalCents / 100).toFixed(2)} ${shop.currency} وبانتظار مراجعة الدفع.`, entityType: "storefront_order", entityId: created.id });
    return { id: created.id, orderNo, subtotalCents, deliveryFeeCents, totalCents, paymentAmountCents, currency: shop.currency };
  });
}

export async function listStorefrontOrders(userId: number, shopId: number) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  const [orders, items, events] = await Promise.all([
    db.select().from(storefrontOrders).where(eq(storefrontOrders.shopId, shopId)).orderBy(desc(storefrontOrders.createdAt)).limit(100),
    db.select().from(storefrontOrderItems).where(eq(storefrontOrderItems.shopId, shopId)),
    db.select().from(storefrontOrderStatusEvents).where(eq(storefrontOrderStatusEvents.shopId, shopId)).orderBy(asc(storefrontOrderStatusEvents.createdAt)),
  ]);
  return orders.map(order => { const orderEvents = events.filter(event => event.orderId === order.id); const latestStatus = orderEvents.at(-1)?.status ?? legacyTrackingStatus(order.status); return { order: { ...order, status: latestStatus }, items: items.filter(item => item.orderId === order.id), events: orderEvents }; });
}

export async function updateStorefrontOrderStatus(userId: number, shopId: number, orderId: number, status: StorefrontOrderStatus) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  const order = (await db.select({ id: storefrontOrders.id, status: storefrontOrders.status }).from(storefrontOrders).where(and(eq(storefrontOrders.id, orderId), eq(storefrontOrders.shopId, shopId))).limit(1))[0];
  if (!order) throw new Error("ORDER_NOT_FOUND");
  const latestEvent = (await db.select({ status: storefrontOrderStatusEvents.status }).from(storefrontOrderStatusEvents).where(and(eq(storefrontOrderStatusEvents.orderId, orderId), eq(storefrontOrderStatusEvents.shopId, shopId))).orderBy(desc(storefrontOrderStatusEvents.createdAt)).limit(1))[0];
  if ((latestEvent?.status ?? legacyTrackingStatus(order.status)) === status) return;
  await db.transaction(async tx => {
    await tx.update(storefrontOrders).set({ status: persistedLegacyStatus(status) }).where(and(eq(storefrontOrders.id, orderId), eq(storefrontOrders.shopId, shopId)));
    await tx.insert(storefrontOrderStatusEvents).values({ shopId, orderId, status, channel: "in_app", message: orderStatusMessages[status] });
  });
}

export async function updateStorefrontOrderPaymentStatus(userId: number, shopId: number, orderId: number, paymentStatus: Extract<StorefrontPaymentStatus, "approved" | "rejected">) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  const order = (await db.select({ id: storefrontOrders.id, orderNo: storefrontOrders.orderNo, paymentStatus: storefrontOrders.paymentStatus }).from(storefrontOrders).where(and(eq(storefrontOrders.id, orderId), eq(storefrontOrders.shopId, shopId))).limit(1))[0];
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.paymentStatus !== "pending_verification") throw new Error("PAYMENT_STATUS_NOT_REVIEWABLE");
  await db.transaction(async tx => {
    await tx.update(storefrontOrders).set({ paymentStatus }).where(and(eq(storefrontOrders.id, orderId), eq(storefrontOrders.shopId, shopId)));
    await tx.insert(notifications).values({ shopId, type: "system", title: paymentStatus === "approved" ? "تم اعتماد عربون الطلب" : "تم رفض إثبات الدفع", body: `تم ${paymentStatus === "approved" ? "اعتماد" : "رفض"} الدفع المرتبط بالطلب ${order.orderNo}.`, entityType: "storefront_order", entityId: orderId });
  });
}

export async function getPublicOrderTracking(orderNo: string, customerPhone: string) {
  const db = await requireDb();
  const normalizedOrderNo = orderNo.trim().toUpperCase();
  const normalizedPhone = customerPhone.replace(/[^0-9]/g, "");
  if (normalizedPhone.length < 7) throw new Error("ORDER_NOT_FOUND");
  const phoneDigits = sql`regexp_replace(${storefrontOrders.customerPhone}, '[\\s\\-()+]', '', 'g')`;
  const result = (await db.select({ order: storefrontOrders, shopName: shops.name, shopLogoUrl: shops.logoUrl, shopSlug: shops.slug }).from(storefrontOrders).innerJoin(shops, eq(storefrontOrders.shopId, shops.id)).where(and(eq(storefrontOrders.orderNo, normalizedOrderNo), sql`${phoneDigits} = ${normalizedPhone}`)).limit(1))[0];
  if (!result) throw new Error("ORDER_NOT_FOUND");
  const events = await db.select({ status: storefrontOrderStatusEvents.status, message: storefrontOrderStatusEvents.message, createdAt: storefrontOrderStatusEvents.createdAt }).from(storefrontOrderStatusEvents).where(and(eq(storefrontOrderStatusEvents.orderId, result.order.id), eq(storefrontOrderStatusEvents.shopId, result.order.shopId))).orderBy(asc(storefrontOrderStatusEvents.createdAt));
  const currentStatus = events.at(-1)?.status ?? legacyTrackingStatus(result.order.status);
  return {
    order: {
      orderNo: result.order.orderNo, status: currentStatus, createdAt: result.order.createdAt, updatedAt: result.order.updatedAt,
      subtotalCents: result.order.subtotalCents, deliveryGovernorate: result.order.deliveryGovernorate, deliveryFeeCents: result.order.deliveryFeeCents,
      totalCents: result.order.totalCents, paymentMode: result.order.paymentMode, paymentAmountCents: result.order.paymentAmountCents, paymentStatus: result.order.paymentStatus,
    },
    shop: { name: result.shopName, logoUrl: result.shopLogoUrl, slug: result.shopSlug }, events,
  };
}

export async function listCategories(userId: number, shopId: number) {
  await assertShopAccess(userId, shopId);
  const db = await requireDb();
  return db.select().from(categories).where(eq(categories.shopId, shopId)).orderBy(categories.name);
}

export async function createCategory(userId: number, shopId: number, input: { name: string; color: string }) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  const [created] = await db.insert(categories).values({ shopId, ...input }).returning({ id: categories.id });
  return created;
}

export async function listProducts(userId: number, shopId: number, search?: string) {
  await assertShopAccess(userId, shopId);
  const db = await requireDb();
  const clauses = [eq(products.shopId, shopId)];
  if (search?.trim()) clauses.push(like(products.name, `%${search.trim()}%`));
  return db
    .select({ product: products, categoryName: categories.name, categoryColor: categories.color })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...clauses))
    .orderBy(desc(products.updatedAt));
}

export function parseProductImageData(base64: string, contentType: "image/webp") {
  const normalized = base64.replace(/^data:image\/webp;base64,/, "");
  const bytes = Buffer.from(normalized, "base64");
  if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new Error("INVALID_PRODUCT_IMAGE_SIZE");
  if (!base64.startsWith("data:image/webp;base64,")) throw new Error("INVALID_PRODUCT_IMAGE_TYPE");
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") throw new Error("INVALID_PRODUCT_IMAGE_TYPE");
  return { bytes, contentType };
}

export function productImageStoragePath(shopId: number, productId: number) {
  return `product-images/shop-${shopId}/product-${productId}.webp`;
}

async function uploadProductImage(shopId: number, productId: number, base64: string, contentType: "image/webp") {
  const image = parseProductImageData(base64, contentType);
  return storagePut(productImageStoragePath(shopId, productId), image.bytes, image.contentType);
}

export async function createProduct(userId: number, shopId: number, input: {
  name: string; sku?: string; categoryId?: number | null; sellingPriceCents: number; costPriceCents: number; quantityInStock: number; reorderPoint: number; productImageBase64?: string; productImageContentType?: "image/webp";
}) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  const plan = await getPlanDefinition(await getPlanForShop(shopId));
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.shopId, shopId));
  if (Number(count) >= plan.maxProducts) throw new Error("PLAN_PRODUCT_LIMIT");
  if (input.categoryId) {
    const category = (await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.shopId, shopId))).limit(1))[0];
    if (!category) throw new Error("INVALID_CATEGORY");
  }
  const [created] = await db.insert(products).values({ shopId, name: input.name, sku: input.sku || null, categoryId: input.categoryId ?? null, sellingPriceCents: input.sellingPriceCents, costPriceCents: input.costPriceCents, quantityInStock: input.quantityInStock, reorderPoint: input.reorderPoint }).returning({ id: products.id });
  if (input.productImageBase64 && input.productImageContentType) {
    const image = await uploadProductImage(shopId, created.id, input.productImageBase64, input.productImageContentType);
    await db.update(products).set({ productImage: image.url }).where(and(eq(products.id, created.id), eq(products.shopId, shopId)));
  }
  return created;
}

export async function updateProduct(userId: number, shopId: number, input: {
  productId: number; name: string; sku?: string; categoryId?: number | null; sellingPriceCents: number; costPriceCents: number; quantityInStock: number; reorderPoint: number; productImageBase64?: string; productImageContentType?: "image/webp"; removeProductImage?: boolean;
}) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  const existing = (await db.select().from(products).where(and(eq(products.id, input.productId), eq(products.shopId, shopId))).limit(1))[0];
  if (!existing) throw new Error("PRODUCT_NOT_FOUND");
  if (input.categoryId) {
    const category = (await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.shopId, shopId))).limit(1))[0];
    if (!category) throw new Error("INVALID_CATEGORY");
  }
  const image = input.productImageBase64 && input.productImageContentType ? await uploadProductImage(shopId, input.productId, input.productImageBase64, input.productImageContentType) : undefined;
  await db.transaction(async tx => {
    await tx.update(products).set({
      name: input.name, sku: input.sku || null, categoryId: input.categoryId ?? null, sellingPriceCents: input.sellingPriceCents, costPriceCents: input.costPriceCents,
      quantityInStock: input.quantityInStock, reorderPoint: input.reorderPoint, productImage: input.removeProductImage ? null : (image?.url ?? existing.productImage),
    }).where(and(eq(products.id, input.productId), eq(products.shopId, shopId)));
    const quantityDelta = input.quantityInStock - existing.quantityInStock;
    if (quantityDelta) await tx.insert(inventoryMovements).values({ shopId, productId: input.productId, type: "adjustment", quantityDelta, note: "تعديل كمية من بيانات المنتج", createdByUserId: userId });
  });
}

export async function adjustProductStock(userId: number, shopId: number, input: { productId: number; quantityDelta: number; note?: string }) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  const product = (await db.select().from(products).where(and(eq(products.id, input.productId), eq(products.shopId, shopId))).limit(1))[0];
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  if (product.quantityInStock + input.quantityDelta < 0) throw new Error("INSUFFICIENT_STOCK");
  await db.transaction(async tx => {
    await tx.update(products).set({ quantityInStock: sql`${products.quantityInStock} + ${input.quantityDelta}` }).where(eq(products.id, input.productId));
    await tx.insert(inventoryMovements).values({ shopId, productId: input.productId, type: input.quantityDelta >= 0 ? "restock" : "adjustment", quantityDelta: input.quantityDelta, note: input.note || null, createdByUserId: userId });
  });
}

export async function createSale(userId: number, shopId: number, input: { lines: SaleInputLine[]; customerId?: number | null; paidCents: number; discountCents: number; paymentMethod: "cash" | "card" | "transfer" | "credit"; note?: string; dueDate?: Date | null }) {
  await assertShopAccess(userId, shopId, ["owner", "manager", "cashier"]);
  if (!input.lines.length) throw new Error("EMPTY_SALE");
  if (input.lines.some(line => !Number.isInteger(line.quantity) || line.quantity <= 0)) throw new Error("INVALID_QUANTITY");
  const db = await requireDb();
  const productIds = Array.from(new Set(input.lines.map(line => line.productId)));
  const foundProducts = await db.select().from(products).where(and(eq(products.shopId, shopId), inArray(products.id, productIds), eq(products.isActive, 1)));
  if (foundProducts.length !== productIds.length) throw new Error("PRODUCT_NOT_FOUND");
  const byId = new Map(foundProducts.map(product => [product.id, product]));
  const normalizedLines = input.lines.map(line => {
    const product = byId.get(line.productId)!;
    if (product.quantityInStock < line.quantity) throw new Error("INSUFFICIENT_STOCK");
    return { ...line, product, unitPriceCents: product.sellingPriceCents, costPriceCents: product.costPriceCents };
  });
  const totals = calculateSaleTotals(normalizedLines, input.discountCents, input.paidCents);
  if (totals.debtCents > 0 && !input.customerId) throw new Error("CUSTOMER_REQUIRED_FOR_DEBT");
  if (input.customerId) {
    const customer = (await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, input.customerId), eq(customers.shopId, shopId))).limit(1))[0];
    if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
  }
  const invoiceNo = `ZRX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  return db.transaction(async tx => {
    const [created] = await tx.insert(sales).values({
      shopId, invoiceNo, customerId: input.customerId ?? null, totalCents: totals.totalCents, paidCents: input.paidCents, debtCents: totals.debtCents,
      discountCents: input.discountCents, paymentMethod: totals.debtCents > 0 ? "credit" : input.paymentMethod, note: input.note || null, createdByUserId: userId,
    }).returning({ id: sales.id });
    await tx.insert(saleItems).values(normalizedLines.map(line => ({
      shopId, saleId: created.id, productId: line.productId, productName: line.product.name, unitPriceCents: line.unitPriceCents,
      costPriceCents: line.costPriceCents, quantity: line.quantity, lineTotalCents: line.quantity * line.unitPriceCents,
    })));
    for (const line of normalizedLines) {
      const product = line.product;
      const updatedStock = product.quantityInStock - line.quantity;
      await tx.update(products).set({ quantityInStock: updatedStock }).where(and(eq(products.id, product.id), eq(products.shopId, shopId)));
      await tx.insert(inventoryMovements).values({ shopId, productId: product.id, saleId: created.id, type: "sale", quantityDelta: -line.quantity, createdByUserId: userId, note: `فاتورة ${invoiceNo}` });
      if (updatedStock <= product.reorderPoint) {
        await tx.insert(notifications).values({ shopId, type: "low_stock", title: "مخزون منخفض", body: `المنتج «${product.name}» وصل إلى ${updatedStock} وحدات.`, entityType: "product", entityId: product.id });
      }
    }
    if (totals.debtCents > 0 && input.customerId) {
      await tx.insert(debtTransactions).values({ shopId, customerId: input.customerId, saleId: created.id, type: "debt", amountCents: totals.debtCents, dueDate: input.dueDate ?? null, createdByUserId: userId, note: `دين من الفاتورة ${invoiceNo}` });
      if (input.dueDate) {
        await tx.insert(notifications).values({ shopId, type: "debt_due", title: "دين يحتاج متابعة", body: `تم تسجيل دين بقيمة ${totals.debtCents / 100} وله تاريخ استحقاق ${input.dueDate.toLocaleDateString("ar-EG")}.`, entityType: "sale", entityId: created.id });
      }
    }
    return { id: created.id, invoiceNo, ...totals };
  });
}

export async function listSales(userId: number, shopId: number, search?: string) {
  await assertShopAccess(userId, shopId);
  const db = await requireDb();
  const clauses = [eq(sales.shopId, shopId)];
  if (search?.trim()) clauses.push(like(sales.invoiceNo, `%${search.trim()}%`));
  return db
    .select({ sale: sales, customerName: customers.name })
    .from(sales)
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(and(...clauses))
    .orderBy(desc(sales.soldAt))
    .limit(100);
}

export async function listCustomersWithBalances(userId: number, shopId: number, search?: string) {
  await assertShopAccess(userId, shopId);
  const db = await requireDb();
  const clauses = [eq(customers.shopId, shopId)];
  if (search?.trim()) clauses.push(like(customers.name, `%${search.trim()}%`));
  const customerRows = await db.select().from(customers).where(and(...clauses)).orderBy(desc(customers.updatedAt));
  const entries = await db.select().from(debtTransactions).where(eq(debtTransactions.shopId, shopId));
  const balances = customerBalances(entries.map(entry => ({ customerId: entry.customerId, type: entry.type, amountCents: entry.amountCents })));
  return customerRows.map(customer => ({ ...customer, balanceCents: balances[customer.id] ?? 0 }));
}

export async function createCustomer(userId: number, shopId: number, input: { name: string; phone?: string; email?: string; note?: string }) {
  await assertShopAccess(userId, shopId, ["owner", "manager", "cashier"]);
  const db = await requireDb();
  const [created] = await db.insert(customers).values({ shopId, name: input.name, phone: input.phone || null, email: input.email || null, note: input.note || null }).returning({ id: customers.id });
  return created;
}

export async function recordDebtPayment(userId: number, shopId: number, input: { customerId: number; amountCents: number; note?: string }) {
  await assertShopAccess(userId, shopId, ["owner", "manager", "cashier"]);
  if (input.amountCents <= 0) throw new Error("INVALID_AMOUNT");
  const db = await requireDb();
  const customer = (await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, input.customerId), eq(customers.shopId, shopId))).limit(1))[0];
  if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
  const entries = await db.select().from(debtTransactions).where(and(eq(debtTransactions.shopId, shopId), eq(debtTransactions.customerId, input.customerId)));
  const balance = customerBalances(entries.map(entry => ({ customerId: entry.customerId, type: entry.type, amountCents: entry.amountCents })))[input.customerId] ?? 0;
  if (input.amountCents > balance) throw new Error("PAYMENT_EXCEEDS_BALANCE");
  const [created] = await db.insert(debtTransactions).values({ shopId, customerId: input.customerId, type: "payment", amountCents: input.amountCents, note: input.note || null, createdByUserId: userId }).returning({ id: debtTransactions.id });
  return created;
}

export async function listExpenses(userId: number, shopId: number) {
  await assertShopAccess(userId, shopId);
  const db = await requireDb();
  return db.select().from(expenses).where(eq(expenses.shopId, shopId)).orderBy(desc(expenses.spentAt)).limit(100);
}

export async function createExpense(userId: number, shopId: number, input: { category: string; amountCents: number; note?: string; spentAt?: Date }) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  if (input.amountCents <= 0) throw new Error("INVALID_AMOUNT");
  const db = await requireDb();
  const [created] = await db.insert(expenses).values({ shopId, category: input.category, amountCents: input.amountCents, note: input.note || null, spentAt: input.spentAt ?? new Date(), createdByUserId: userId }).returning({ id: expenses.id });
  return created;
}

export async function getDashboard(userId: number, shopId: number, from: Date, to: Date) {
  await assertShopAccess(userId, shopId);
  const db = await requireDb();
  const [periodSales, periodExpenses, periodItems, productRows, debtRows, dueDebtRows] = await Promise.all([
    db.select().from(sales).where(and(eq(sales.shopId, shopId), eq(sales.status, "completed"), gte(sales.soldAt, from), lte(sales.soldAt, to))),
    db.select().from(expenses).where(and(eq(expenses.shopId, shopId), gte(expenses.spentAt, from), lte(expenses.spentAt, to))),
    db.select({ item: saleItems }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(and(eq(saleItems.shopId, shopId), eq(sales.status, "completed"), gte(sales.soldAt, from), lte(sales.soldAt, to))),
    db.select().from(products).where(eq(products.shopId, shopId)),
    db.select().from(debtTransactions).where(eq(debtTransactions.shopId, shopId)),
    db.select({ id: debtTransactions.id }).from(debtTransactions).where(and(eq(debtTransactions.shopId, shopId), eq(debtTransactions.type, "debt"), lte(debtTransactions.dueDate, new Date()))),
  ]);
  const salesCents = periodSales.reduce((sum, sale) => sum + sale.totalCents, 0);
  const paidCents = periodSales.reduce((sum, sale) => sum + sale.paidCents, 0);
  const expensesCents = periodExpenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const productCostCents = periodItems.reduce((sum, row) => sum + row.item.costPriceCents * row.item.quantity, 0);
  const balances = customerBalances(debtRows.map(entry => ({ customerId: entry.customerId, type: entry.type, amountCents: entry.amountCents })));
  const debtCents = Object.values(balances).reduce((sum, balance) => sum + Math.max(0, balance), 0);
  const topProductMap = periodItems.reduce<Map<number, { productId: number; name: string; quantity: number; revenueCents: number }>>((map, row) => {
    const item = map.get(row.item.productId) ?? { productId: row.item.productId, name: row.item.productName, quantity: 0, revenueCents: 0 };
    item.quantity += row.item.quantity;
    item.revenueCents += row.item.lineTotalCents;
    map.set(row.item.productId, item);
    return map;
  }, new Map());
  return {
    salesCents, paidCents, expensesCents, profitCents: salesCents - productCostCents - expensesCents, debtCents,
    lowStock: productRows.filter(product => product.isActive === 1 && product.quantityInStock <= product.reorderPoint),
    dueDebtCount: dueDebtRows.length,
    topProducts: Array.from(topProductMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5),
  };
}

export async function getPaidReport(userId: number, shopId: number, from: Date, to: Date) {
  await assertPlanFeature(shopId, "reports");
  return getDashboard(userId, shopId, from, to);
}

export async function listNotifications(userId: number, shopId: number) {
  await assertShopAccess(userId, shopId);
  const db = await requireDb();
  return db.select().from(notifications).where(eq(notifications.shopId, shopId)).orderBy(desc(notifications.createdAt)).limit(30);
}

export async function markNotificationRead(userId: number, shopId: number, notificationId: number) {
  await assertShopAccess(userId, shopId);
  const db = await requireDb();
  await db.update(notifications).set({ isRead: 1 }).where(and(eq(notifications.id, notificationId), eq(notifications.shopId, shopId)));
}

export async function generateDueDebtNotifications() {
  const db = await requireDb();
  const dueDebts = await db
    .select({ debt: debtTransactions, customerName: customers.name })
    .from(debtTransactions)
    .innerJoin(customers, eq(debtTransactions.customerId, customers.id))
    .where(and(eq(debtTransactions.type, "debt"), lte(debtTransactions.dueDate, new Date())));
  let created = 0;
  for (const row of dueDebts) {
    const existing = (await db.select({ id: notifications.id }).from(notifications).where(and(
      eq(notifications.shopId, row.debt.shopId), eq(notifications.type, "debt_due"), eq(notifications.entityType, "debt_transaction"), eq(notifications.entityId, row.debt.id),
    )).limit(1))[0];
    if (existing) continue;
    await db.insert(notifications).values({
      shopId: row.debt.shopId,
      type: "debt_due",
      title: "موعد دين مستحق",
      body: `دين العميل «${row.customerName}» بقيمة ${row.debt.amountCents / 100} تجاوز موعد استحقاقه.`,
      entityType: "debt_transaction",
      entityId: row.debt.id,
    });
    created += 1;
  }
  return { scanned: dueDebts.length, created };
}

function monthEnd(from: Date, months: number) {
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  return end;
}

function decodeReceipt(base64: string) {
  const normalized = base64.replace(/^data:image\/(png|jpe?g|webp);base64,/, "");
  const bytes = Buffer.from(normalized, "base64");
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) throw new Error("INVALID_RECEIPT_SIZE");
  return bytes;
}

export async function createVodafoneCashRequest(userId: number, shopId: number, input: {
  plan: "basic" | "pro"; billingMonths: number; payerPhone: string; transferReference?: string; receiptBase64: string; receiptContentType: "image/jpeg" | "image/png" | "image/webp";
}) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  if (!Number.isInteger(input.billingMonths) || input.billingMonths < 1 || input.billingMonths > 12) throw new Error("INVALID_BILLING_PERIOD");
  const provider = getPaymentProvider("vodafone_cash");
  provider.validateSubmission(input);
  const db = await requireDb();
  const [pending] = await db.select({ id: paymentRequests.id }).from(paymentRequests).where(and(eq(paymentRequests.shopId, shopId), eq(paymentRequests.status, "pending"))).limit(1);
  if (pending) throw new Error("PENDING_PAYMENT_EXISTS");
  const extension = input.receiptContentType === "image/png" ? "png" : input.receiptContentType === "image/webp" ? "webp" : "jpg";
  const receipt = await storagePut(`payment-receipts/shop-${shopId}/receipt.${extension}`, decodeReceipt(input.receiptBase64), input.receiptContentType);
  const orderCode = provider.createOrderCode();
  const selectedPlan = await getPlanDefinition(input.plan);
  if (!selectedPlan.isActive) throw new Error("PLAN_UNAVAILABLE");
  const amountCents = selectedPlan.priceCents * input.billingMonths;
  const [created] = await db.insert(paymentRequests).values({
    shopId, requestedByUserId: userId, orderCode, plan: input.plan, billingMonths: input.billingMonths, amountCents,
    payerPhone: input.payerPhone.replace(/[\s-]/g, ""), transferReference: input.transferReference || null, receiptKey: receipt.key, receiptUrl: receipt.url,
  }).returning({ id: paymentRequests.id });
  await db.insert(paymentAuditLogs).values({ paymentRequestId: created.id, actorUserId: userId, action: "created", detail: `طلب ${input.plan} لمدة ${input.billingMonths} شهر` });
  return { id: created.id, orderCode, amountCents, receiptUrl: receipt.url, status: "pending" as const };
}

export async function getSubscription(userId: number, shopId: number) {
  await assertShopAccess(userId, shopId);
  const db = await requireDb();
  const subscription = (await db.select().from(subscriptions).where(eq(subscriptions.shopId, shopId)).limit(1))[0];
  const pendingRequest = (await db.select().from(paymentRequests).where(and(eq(paymentRequests.shopId, shopId), eq(paymentRequests.status, "pending"))).orderBy(desc(paymentRequests.createdAt)).limit(1))[0];
  const plan = subscription && ["basic", "pro"].includes(subscription.plan) && ["active", "trialing"].includes(subscription.status) && (!subscription.endsAt || subscription.endsAt >= new Date()) ? subscription.plan : "free";
  return { plan, status: subscription?.status ?? "active", startsAt: subscription?.startsAt ?? null, endsAt: subscription?.endsAt ?? null, pendingRequest: pendingRequest ? { orderCode: pendingRequest.orderCode, plan: pendingRequest.plan, status: pendingRequest.status, createdAt: pendingRequest.createdAt } : null };
}

export async function listPaymentRequestsForShop(userId: number, shopId: number) {
  await assertShopAccess(userId, shopId, ["owner", "manager"]);
  const db = await requireDb();
  return db.select().from(paymentRequests).where(eq(paymentRequests.shopId, shopId)).orderBy(desc(paymentRequests.createdAt)).limit(25);
}

export async function listAdminPaymentRequests(adminUserId: number, status?: "pending" | "approved" | "rejected") {
  const db = await requireDb();
  const where = status ? eq(paymentRequests.status, status) : undefined;
  const rows = await db
    .select({ request: paymentRequests, shopName: shops.name, userName: users.name, userEmail: users.email })
    .from(paymentRequests)
    .innerJoin(shops, eq(paymentRequests.shopId, shops.id))
    .innerJoin(users, eq(paymentRequests.requestedByUserId, users.id))
    .where(where)
    .orderBy(desc(paymentRequests.createdAt))
    .limit(100);
  return rows;
}

export async function reviewPaymentRequest(adminUserId: number, input: { paymentRequestId: number; decision: "approved" | "rejected"; rejectionReason?: string }) {
  const db = await requireDb();
  const request = (await db.select().from(paymentRequests).where(eq(paymentRequests.id, input.paymentRequestId)).limit(1))[0];
  if (!request) throw new Error("PAYMENT_REQUEST_NOT_FOUND");
  if (request.status !== "pending") throw new Error("PAYMENT_ALREADY_REVIEWED");
  if (input.decision === "rejected" && !input.rejectionReason?.trim()) throw new Error("REJECTION_REASON_REQUIRED");
  await db.transaction(async tx => {
    if (input.decision === "rejected") {
      await tx.update(paymentRequests).set({ status: "rejected", reviewedByUserId: adminUserId, reviewedAt: new Date(), rejectionReason: input.rejectionReason!.trim() }).where(eq(paymentRequests.id, request.id));
      await tx.insert(paymentAuditLogs).values({ paymentRequestId: request.id, actorUserId: adminUserId, action: "rejected", detail: input.rejectionReason!.trim() });
      await tx.insert(adminAuditLogs).values({ actorUserId: adminUserId, action: "payment_rejected", entityType: "payment_request", entityId: String(request.id), detail: input.rejectionReason!.trim() });
      return;
    }
    const current = (await tx.select().from(subscriptions).where(eq(subscriptions.shopId, request.shopId)).limit(1))[0];
    const start = current?.endsAt && current.endsAt > new Date() ? current.endsAt : new Date();
    const endsAt = monthEnd(start, request.billingMonths);
    if (current) {
      await tx.update(subscriptions).set({ plan: request.plan, status: "active", startsAt: start, endsAt, provider: "vodafone_cash", externalReference: request.orderCode }).where(eq(subscriptions.shopId, request.shopId));
    } else {
      await tx.insert(subscriptions).values({ shopId: request.shopId, plan: request.plan, status: "active", startsAt: start, endsAt, provider: "vodafone_cash", externalReference: request.orderCode });
    }
    await tx.update(paymentRequests).set({ status: "approved", reviewedByUserId: adminUserId, reviewedAt: new Date() }).where(eq(paymentRequests.id, request.id));
    await tx.insert(paymentAuditLogs).values({ paymentRequestId: request.id, actorUserId: adminUserId, action: "approved", detail: `تفعيل خطة ${request.plan} حتى ${endsAt.toISOString()}` });
    await tx.insert(adminAuditLogs).values({ actorUserId: adminUserId, action: "payment_approved", entityType: "payment_request", entityId: String(request.id), detail: `تفعيل ${request.plan} للمحل ${request.shopId}` });
  });
}

export async function getAdminSubscriptionMetrics() {
  const db = await requireDb();
  const [allSubscriptions, allRequests, userRows, shopRows] = await Promise.all([db.select().from(subscriptions), db.select().from(paymentRequests), db.select({ id: users.id }).from(users), db.select({ id: shops.id }).from(shops)]);
  const now = new Date();
  const active = allSubscriptions.filter(subscription => ["basic", "pro"].includes(subscription.plan) && subscription.status === "active" && (!subscription.endsAt || subscription.endsAt > now)).length;
  return {
    activeSubscriptions: active,
    pendingRequests: allRequests.filter(request => request.status === "pending").length,
    approvedRevenueCents: allRequests.filter(request => request.status === "approved").reduce((sum, request) => sum + request.amountCents, 0),
    paidSubscribers: new Set(allRequests.filter(request => request.status === "approved").map(request => request.shopId)).size,
    totalUsers: userRows.length,
    totalShops: shopRows.length,
  };
}

export async function updatePlanDefinition(adminUserId: number, input: { code: AppPlan; name: string; priceCents: number; maxProducts: number; maxShops: number; reportsEnabled: boolean; pdfExportEnabled: boolean; isActive: boolean }) {
  const db = await requireDb();
  if (input.priceCents < 0 || input.maxProducts < 1 || input.maxShops < 1) throw new Error("INVALID_PLAN_CONFIGURATION");
  await db.transaction(async tx => {
    await tx.update(plans).set({ name: input.name, priceCents: input.priceCents, maxProducts: input.maxProducts, maxShops: input.maxShops, reportsEnabled: input.reportsEnabled ? 1 : 0, pdfExportEnabled: input.pdfExportEnabled ? 1 : 0, isActive: input.isActive ? 1 : 0 }).where(eq(plans.code, input.code));
    await tx.insert(adminAuditLogs).values({ actorUserId: adminUserId, action: "plan_updated", entityType: "plan", entityId: input.code, detail: `تم تحديث باقة ${input.code}` });
  });
}

export async function setSubscriptionStatus(adminUserId: number, input: { shopId: number; status: "active" | "canceled" | "past_due" }) {
  const db = await requireDb();
  await db.transaction(async tx => {
    await tx.update(subscriptions).set({ status: input.status }).where(eq(subscriptions.shopId, input.shopId));
    await tx.insert(adminAuditLogs).values({ actorUserId: adminUserId, action: "subscription_status_updated", entityType: "shop", entityId: String(input.shopId), detail: `حالة الاشتراك: ${input.status}` });
  });
}

export async function listAdminStorefrontTemplates() {
  const db = await requireDb();
  return db.select({ shopId: shops.id, shopName: shops.name, shopSlug: shops.slug, storefrontTemplate: shops.storefrontTemplate, logoUrl: shops.logoUrl, coverImageUrl: shops.coverImageUrl, description: shops.description, ownerName: users.name, ownerEmail: users.email }).from(shops).leftJoin(users, eq(shops.ownerUserId, users.id)).orderBy(desc(shops.createdAt));
}

export async function setAdminStorefrontTemplate(adminUserId: number, shopId: number, storefrontTemplate: StorefrontTemplateCode) {
  if (!storefrontTemplateCodes.includes(storefrontTemplate)) throw new Error("INVALID_STOREFRONT_TEMPLATE");
  const db = await requireDb();
  const shop = (await db.select({ id: shops.id, name: shops.name }).from(shops).where(eq(shops.id, shopId)).limit(1))[0];
  if (!shop) throw new Error("SHOP_NOT_FOUND");
  await db.transaction(async tx => {
    await tx.update(shops).set({ storefrontTemplate }).where(eq(shops.id, shopId));
    await tx.insert(adminAuditLogs).values({ actorUserId: adminUserId, action: "storefront_template_updated", entityType: "shop", entityId: String(shopId), detail: `تم تعيين قالب ${storefrontTemplate} لمتجر ${shop.name}` });
  });
}

export async function listAdminAuditLogs() {
  const db = await requireDb();
  return db.select({ log: adminAuditLogs, actorName: users.name, actorEmail: users.email }).from(adminAuditLogs).innerJoin(users, eq(adminAuditLogs.actorUserId, users.id)).orderBy(desc(adminAuditLogs.createdAt)).limit(100);
}

export async function listAdminSubscriptions() {
  const db = await requireDb();
  return db.select({ subscription: subscriptions, shopName: shops.name, ownerName: users.name, ownerEmail: users.email })
    .from(subscriptions)
    .innerJoin(shops, eq(subscriptions.shopId, shops.id))
    .innerJoin(users, eq(shops.ownerUserId, users.id))
    .orderBy(desc(subscriptions.updatedAt))
    .limit(100);
}

import {
  index,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { mode: "date", withTimezone: true });
export const zayrox = pgSchema("zayrox");

export const userRoleEnum = zayrox.enum("user_role", ["shop_owner", "super_admin"]);
export const shopMemberRoleEnum = zayrox.enum("shop_member_role", ["owner", "manager", "cashier"]);
export const saleStatusEnum = zayrox.enum("sale_status", ["completed", "void"]);
export const salePaymentMethodEnum = zayrox.enum("sale_payment_method", ["cash", "card", "transfer", "credit"]);
export const storefrontOrderStatusEnum = zayrox.enum("storefront_order_status", ["new", "processing", "shipped", "completed"]);
export const storefrontOrderEventStatusEnum = zayrox.enum("storefront_order_event_status", ["new", "processing", "ready_to_ship", "shipped", "delivered", "cancelled"]);
export const notificationChannelEnum = zayrox.enum("notification_channel", ["in_app", "sms", "whatsapp"]);
export const inventoryMovementTypeEnum = zayrox.enum("inventory_movement_type", ["sale", "restock", "adjustment", "return"]);
export const debtTransactionTypeEnum = zayrox.enum("debt_transaction_type", ["debt", "payment", "adjustment"]);
export const planCodeEnum = zayrox.enum("plan_code", ["free", "basic", "pro"]);
export const subscriptionStatusEnum = zayrox.enum("subscription_status", ["active", "trialing", "past_due", "canceled"]);
export const paymentPlanEnum = zayrox.enum("payment_plan", ["basic", "pro"]);
export const paymentRequestStatusEnum = zayrox.enum("payment_request_status", ["pending", "approved", "rejected", "expired"]);
export const paymentAuditActionEnum = zayrox.enum("payment_audit_action", ["created", "approved", "rejected", "status_viewed"]);
export const notificationTypeEnum = zayrox.enum("notification_type", ["low_stock", "debt_due", "system"]);

/**
 * Monetary values are stored as integer minor units to avoid floating-point
 * rounding errors. All business rows belong to a shop, which is the tenant.
 */
export const users = zayrox.table("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("shop_owner").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignedIn: timestamptz("lastSignedIn").defaultNow().notNull(),
}, table => [uniqueIndex("users_email_unique").on(table.email)]);

export const shops = zayrox.table("shops", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }),
  isStorefrontActive: integer("is_storefront_active").default(1).notNull(),
  storefrontTemplate: varchar("storefront_template", { length: 32 }).default("classic").notNull(),
  logoUrl: varchar("logo_url", { length: 768 }),
  coverImageUrl: varchar("cover_image_url", { length: 768 }),
  description: text("description"),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  businessHours: varchar("business_hours", { length: 255 }),
  currency: varchar("currency", { length: 3 }).default("SAR").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("Asia/Riyadh").notNull(),
  ownerUserId: integer("ownerUserId").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, table => [index("shops_owner_idx").on(table.ownerUserId), uniqueIndex("shops_slug_unique").on(table.slug)]);

export const shopMembers = zayrox.table("shop_members", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  userId: integer("userId").notNull(),
  role: shopMemberRoleEnum("role").default("cashier").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("shop_members_shop_user_unique").on(table.shopId, table.userId),
  index("shop_members_user_idx").on(table.userId),
]);

export const shopDeliveryZones = zayrox.table("shop_delivery_zones", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  governorate: varchar("governorate", { length: 80 }).notNull(),
  feeCents: integer("feeCents").default(0).notNull(),
  isActive: integer("isActive").default(0).notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex("delivery_zones_shop_governorate_unique").on(table.shopId, table.governorate),
  index("delivery_zones_shop_active_idx").on(table.shopId, table.isActive),
]);

export const shopPaymentMethods = zayrox.table("shop_payment_methods", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  method: varchar("method", { length: 32 }).notNull(),
  accountName: varchar("accountName", { length: 120 }),
  accountNumber: varchar("accountNumber", { length: 96 }).notNull(),
  isActive: integer("isActive").default(0).notNull(),
  isCodDepositMethod: integer("isCodDepositMethod").default(0).notNull(),
  codDepositCents: integer("codDepositCents").default(0).notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex("payment_methods_shop_method_unique").on(table.shopId, table.method),
  index("payment_methods_shop_active_idx").on(table.shopId, table.isActive),
]);

export const categories = zayrox.table("categories", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  color: varchar("color", { length: 16 }).default("#0f766e").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("categories_shop_name_unique").on(table.shopId, table.name),
  index("categories_shop_idx").on(table.shopId),
]);

export const products = zayrox.table("products", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  categoryId: integer("categoryId"),
  name: varchar("name", { length: 160 }).notNull(),
  sku: varchar("sku", { length: 80 }),
  productImage: varchar("product_image", { length: 768 }),
  sellingPriceCents: integer("sellingPriceCents").notNull(),
  costPriceCents: integer("costPriceCents").default(0).notNull(),
  quantityInStock: integer("quantityInStock").default(0).notNull(),
  reorderPoint: integer("reorderPoint").default(5).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex("products_shop_sku_unique").on(table.shopId, table.sku),
  index("products_shop_idx").on(table.shopId),
  index("products_stock_idx").on(table.shopId, table.quantityInStock),
]);

export const customers = zayrox.table("customers", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  note: text("note"),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, table => [index("customers_shop_idx").on(table.shopId)]);

export const sales = zayrox.table("sales", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  invoiceNo: varchar("invoiceNo", { length: 48 }).notNull(),
  customerId: integer("customerId"),
  status: saleStatusEnum("status").default("completed").notNull(),
  totalCents: integer("totalCents").notNull(),
  paidCents: integer("paidCents").notNull(),
  debtCents: integer("debtCents").default(0).notNull(),
  discountCents: integer("discountCents").default(0).notNull(),
  paymentMethod: salePaymentMethodEnum("paymentMethod").default("cash").notNull(),
  note: text("note"),
  soldAt: timestamptz("soldAt").defaultNow().notNull(),
  createdByUserId: integer("createdByUserId").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("sales_shop_invoice_unique").on(table.shopId, table.invoiceNo),
  index("sales_shop_sold_idx").on(table.shopId, table.soldAt),
  index("sales_customer_idx").on(table.customerId),
]);

export const saleItems = zayrox.table("sale_items", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  saleId: integer("saleId").notNull(),
  productId: integer("productId").notNull(),
  productName: varchar("productName", { length: 160 }).notNull(),
  unitPriceCents: integer("unitPriceCents").notNull(),
  costPriceCents: integer("costPriceCents").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotalCents: integer("lineTotalCents").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [
  index("sale_items_sale_idx").on(table.saleId),
  index("sale_items_product_idx").on(table.shopId, table.productId),
]);

export const storefrontOrders = zayrox.table("storefront_orders", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  orderNo: varchar("orderNo", { length: 48 }).notNull(),
  customerName: varchar("customerName", { length: 150 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  customerAddress: text("customerAddress").notNull(),
  customerNote: text("customerNote"),
  deliveryGovernorate: varchar("delivery_governorate", { length: 80 }),
  deliveryFeeCents: integer("delivery_fee_cents").default(0).notNull(),
  paymentMode: varchar("payment_mode", { length: 32 }),
  paymentMethod: varchar("payment_method", { length: 32 }),
  paymentAccountNumber: varchar("payment_account_number", { length: 96 }),
  paymentAmountCents: integer("payment_amount_cents").default(0).notNull(),
  paymentStatus: varchar("payment_status", { length: 32 }).default("not_required").notNull(),
  paymentPayerPhone: varchar("payment_payer_phone", { length: 32 }),
  paymentReference: varchar("payment_reference", { length: 120 }),
  paymentProofUrl: varchar("payment_proof_url", { length: 768 }),
  status: storefrontOrderStatusEnum("status").default("new").notNull(),
  subtotalCents: integer("subtotalCents").notNull(),
  totalCents: integer("totalCents").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex("storefront_orders_shop_order_unique").on(table.shopId, table.orderNo),
  index("storefront_orders_shop_status_idx").on(table.shopId, table.status, table.createdAt),
]);

export const storefrontOrderStatusEvents = zayrox.table("storefront_order_status_events", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  orderId: integer("orderId").notNull(),
  status: storefrontOrderEventStatusEnum("status").notNull(),
  channel: notificationChannelEnum("channel").default("in_app").notNull(),
  message: varchar("message", { length: 255 }).notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [
  index("storefront_order_status_events_order_idx").on(table.orderId, table.createdAt),
  index("storefront_order_status_events_shop_idx").on(table.shopId, table.createdAt),
]);

export const storefrontOrderItems = zayrox.table("storefront_order_items", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  orderId: integer("orderId").notNull(),
  productId: integer("productId").notNull(),
  productName: varchar("productName", { length: 160 }).notNull(),
  productImage: varchar("productImage", { length: 768 }),
  unitPriceCents: integer("unitPriceCents").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotalCents: integer("lineTotalCents").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [
  index("storefront_order_items_order_idx").on(table.orderId),
  index("storefront_order_items_shop_product_idx").on(table.shopId, table.productId),
]);

export const inventoryMovements = zayrox.table("inventory_movements", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  productId: integer("productId").notNull(),
  saleId: integer("saleId"),
  type: inventoryMovementTypeEnum("type").notNull(),
  quantityDelta: integer("quantityDelta").notNull(),
  note: varchar("note", { length: 255 }),
  createdByUserId: integer("createdByUserId").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [
  index("inventory_shop_product_idx").on(table.shopId, table.productId),
  index("inventory_sale_idx").on(table.saleId),
]);

export const debtTransactions = zayrox.table("debt_transactions", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  customerId: integer("customerId").notNull(),
  saleId: integer("saleId"),
  type: debtTransactionTypeEnum("type").notNull(),
  amountCents: integer("amountCents").notNull(),
  dueDate: timestamptz("dueDate"),
  note: text("note"),
  createdByUserId: integer("createdByUserId").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [
  index("debt_shop_customer_idx").on(table.shopId, table.customerId),
  index("debt_due_idx").on(table.shopId, table.dueDate),
]);

export const expenses = zayrox.table("expenses", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  amountCents: integer("amountCents").notNull(),
  note: text("note"),
  spentAt: timestamptz("spentAt").defaultNow().notNull(),
  createdByUserId: integer("createdByUserId").notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [index("expenses_shop_spent_idx").on(table.shopId, table.spentAt)]);

export const subscriptions = zayrox.table("subscriptions", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  plan: planCodeEnum("plan").default("free").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  startsAt: timestamptz("startsAt"),
  endsAt: timestamptz("endsAt"),
  provider: varchar("provider", { length: 32 }).default("manual").notNull(),
  externalReference: varchar("externalReference", { length: 255 }),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("subscriptions_shop_unique").on(table.shopId)]);

export const plans = zayrox.table("plans", {
  code: planCodeEnum("code").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  priceCents: integer("priceCents").notNull(),
  maxProducts: integer("maxProducts").notNull(),
  maxShops: integer("maxShops").notNull(),
  reportsEnabled: integer("reportsEnabled").default(0).notNull(),
  pdfExportEnabled: integer("pdfExportEnabled").default(0).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
});

export const adminAuditLogs = zayrox.table("admin_audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actorUserId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  detail: text("detail"),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [
  index("admin_audit_actor_idx").on(table.actorUserId),
  index("admin_audit_created_idx").on(table.createdAt),
]);

export const paymentRequests = zayrox.table("payment_requests", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  requestedByUserId: integer("requestedByUserId").notNull(),
  orderCode: varchar("orderCode", { length: 48 }).notNull(),
  plan: paymentPlanEnum("plan").notNull(),
  billingMonths: integer("billingMonths").default(1).notNull(),
  amountCents: integer("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).default("EGP").notNull(),
  provider: varchar("provider", { length: 32 }).default("vodafone_cash").notNull(),
  payerPhone: varchar("payerPhone", { length: 32 }).notNull(),
  transferReference: varchar("transferReference", { length: 96 }),
  receiptKey: varchar("receiptKey", { length: 512 }).notNull(),
  receiptUrl: varchar("receiptUrl", { length: 768 }).notNull(),
  status: paymentRequestStatusEnum("status").default("pending").notNull(),
  reviewedByUserId: integer("reviewedByUserId"),
  reviewedAt: timestamptz("reviewedAt"),
  rejectionReason: varchar("rejectionReason", { length: 255 }),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
  updatedAt: timestamptz("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
}, table => [
  uniqueIndex("payment_requests_order_code_unique").on(table.orderCode),
  index("payment_requests_shop_idx").on(table.shopId),
  index("payment_requests_status_idx").on(table.status, table.createdAt),
]);

export const paymentAuditLogs = zayrox.table("payment_audit_logs", {
  id: serial("id").primaryKey(),
  paymentRequestId: integer("paymentRequestId").notNull(),
  actorUserId: integer("actorUserId").notNull(),
  action: paymentAuditActionEnum("action").notNull(),
  detail: varchar("detail", { length: 255 }),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [index("payment_audit_request_idx").on(table.paymentRequestId)]);

export const notifications = zayrox.table("notifications", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: integer("entityId"),
  isRead: integer("isRead").default(0).notNull(),
  createdAt: timestamptz("createdAt").defaultNow().notNull(),
}, table => [index("notifications_shop_read_idx").on(table.shopId, table.isRead)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ShopMemberRole = "owner" | "manager" | "cashier";
export type PlatformRole = "shop_owner" | "super_admin";

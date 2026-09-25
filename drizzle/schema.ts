import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Monetary values are stored as integer minor units to avoid floating-point
 * rounding errors. All business rows belong to a shop, which is the tenant.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["shop_owner", "super_admin"]).default("shop_owner").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const shops = mysqlTable("shops", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }),
  isStorefrontActive: int("is_storefront_active").default(1).notNull(),
  storefrontTemplate: varchar("storefront_template", { length: 32 }).default("classic").notNull(),
  logoUrl: varchar("logo_url", { length: 768 }),
  coverImageUrl: varchar("cover_image_url", { length: 768 }),
  description: text("description"),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  businessHours: varchar("business_hours", { length: 255 }),
  currency: varchar("currency", { length: 3 }).default("SAR").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("Asia/Riyadh").notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("shops_owner_idx").on(table.ownerUserId), uniqueIndex("shops_slug_unique").on(table.slug)]);

export const shopMembers = mysqlTable("shop_members", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "manager", "cashier"]).default("cashier").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("shop_members_shop_user_unique").on(table.shopId, table.userId),
  index("shop_members_user_idx").on(table.userId),
]);

export const shopDeliveryZones = mysqlTable("shop_delivery_zones", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  governorate: varchar("governorate", { length: 80 }).notNull(),
  feeCents: int("feeCents").default(0).notNull(),
  isActive: int("isActive").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("delivery_zones_shop_governorate_unique").on(table.shopId, table.governorate),
  index("delivery_zones_shop_active_idx").on(table.shopId, table.isActive),
]);

export const shopPaymentMethods = mysqlTable("shop_payment_methods", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  method: varchar("method", { length: 32 }).notNull(),
  accountName: varchar("accountName", { length: 120 }),
  accountNumber: varchar("accountNumber", { length: 96 }).notNull(),
  isActive: int("isActive").default(0).notNull(),
  isCodDepositMethod: int("isCodDepositMethod").default(0).notNull(),
  codDepositCents: int("codDepositCents").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("payment_methods_shop_method_unique").on(table.shopId, table.method),
  index("payment_methods_shop_active_idx").on(table.shopId, table.isActive),
]);

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  color: varchar("color", { length: 16 }).default("#0f766e").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("categories_shop_name_unique").on(table.shopId, table.name),
  index("categories_shop_idx").on(table.shopId),
]);

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  categoryId: int("categoryId"),
  name: varchar("name", { length: 160 }).notNull(),
  sku: varchar("sku", { length: 80 }),
  productImage: varchar("product_image", { length: 768 }),
  sellingPriceCents: int("sellingPriceCents").notNull(),
  costPriceCents: int("costPriceCents").default(0).notNull(),
  quantityInStock: int("quantityInStock").default(0).notNull(),
  reorderPoint: int("reorderPoint").default(5).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("products_shop_sku_unique").on(table.shopId, table.sku),
  index("products_shop_idx").on(table.shopId),
  index("products_stock_idx").on(table.shopId, table.quantityInStock),
]);

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("customers_shop_idx").on(table.shopId)]);

export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  invoiceNo: varchar("invoiceNo", { length: 48 }).notNull(),
  customerId: int("customerId"),
  status: mysqlEnum("status", ["completed", "void"]).default("completed").notNull(),
  totalCents: int("totalCents").notNull(),
  paidCents: int("paidCents").notNull(),
  debtCents: int("debtCents").default(0).notNull(),
  discountCents: int("discountCents").default(0).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "transfer", "credit"]).default("cash").notNull(),
  note: text("note"),
  soldAt: timestamp("soldAt").defaultNow().notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("sales_shop_invoice_unique").on(table.shopId, table.invoiceNo),
  index("sales_shop_sold_idx").on(table.shopId, table.soldAt),
  index("sales_customer_idx").on(table.customerId),
]);

export const saleItems = mysqlTable("sale_items", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  saleId: int("saleId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 160 }).notNull(),
  unitPriceCents: int("unitPriceCents").notNull(),
  costPriceCents: int("costPriceCents").notNull(),
  quantity: int("quantity").notNull(),
  lineTotalCents: int("lineTotalCents").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("sale_items_sale_idx").on(table.saleId),
  index("sale_items_product_idx").on(table.shopId, table.productId),
]);

export const storefrontOrders = mysqlTable("storefront_orders", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  orderNo: varchar("orderNo", { length: 48 }).notNull(),
  customerName: varchar("customerName", { length: 150 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  customerAddress: text("customerAddress").notNull(),
  customerNote: text("customerNote"),
  deliveryGovernorate: varchar("delivery_governorate", { length: 80 }),
  deliveryFeeCents: int("delivery_fee_cents").default(0).notNull(),
  paymentMode: varchar("payment_mode", { length: 32 }),
  paymentMethod: varchar("payment_method", { length: 32 }),
  paymentAccountNumber: varchar("payment_account_number", { length: 96 }),
  paymentAmountCents: int("payment_amount_cents").default(0).notNull(),
  paymentStatus: varchar("payment_status", { length: 32 }).default("not_required").notNull(),
  paymentPayerPhone: varchar("payment_payer_phone", { length: 32 }),
  paymentReference: varchar("payment_reference", { length: 120 }),
  paymentProofUrl: varchar("payment_proof_url", { length: 768 }),
  status: mysqlEnum("status", ["new", "processing", "shipped", "completed"]).default("new").notNull(),
  subtotalCents: int("subtotalCents").notNull(),
  totalCents: int("totalCents").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("storefront_orders_shop_order_unique").on(table.shopId, table.orderNo),
  index("storefront_orders_shop_status_idx").on(table.shopId, table.status, table.createdAt),
]);

export const storefrontOrderStatusEvents = mysqlTable("storefront_order_status_events", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  orderId: int("orderId").notNull(),
  status: mysqlEnum("status", ["new", "processing", "ready_to_ship", "shipped", "delivered", "cancelled"]).notNull(),
  channel: mysqlEnum("channel", ["in_app", "sms", "whatsapp"]).default("in_app").notNull(),
  message: varchar("message", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("storefront_order_status_events_order_idx").on(table.orderId, table.createdAt),
  index("storefront_order_status_events_shop_idx").on(table.shopId, table.createdAt),
]);

export const storefrontOrderItems = mysqlTable("storefront_order_items", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 160 }).notNull(),
  productImage: varchar("productImage", { length: 768 }),
  unitPriceCents: int("unitPriceCents").notNull(),
  quantity: int("quantity").notNull(),
  lineTotalCents: int("lineTotalCents").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("storefront_order_items_order_idx").on(table.orderId),
  index("storefront_order_items_shop_product_idx").on(table.shopId, table.productId),
]);

export const inventoryMovements = mysqlTable("inventory_movements", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  productId: int("productId").notNull(),
  saleId: int("saleId"),
  type: mysqlEnum("type", ["sale", "restock", "adjustment", "return"]).notNull(),
  quantityDelta: int("quantityDelta").notNull(),
  note: varchar("note", { length: 255 }),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("inventory_shop_product_idx").on(table.shopId, table.productId),
  index("inventory_sale_idx").on(table.saleId),
]);

export const debtTransactions = mysqlTable("debt_transactions", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  customerId: int("customerId").notNull(),
  saleId: int("saleId"),
  type: mysqlEnum("type", ["debt", "payment", "adjustment"]).notNull(),
  amountCents: int("amountCents").notNull(),
  dueDate: timestamp("dueDate"),
  note: text("note"),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("debt_shop_customer_idx").on(table.shopId, table.customerId),
  index("debt_due_idx").on(table.shopId, table.dueDate),
]);

export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  amountCents: int("amountCents").notNull(),
  note: text("note"),
  spentAt: timestamp("spentAt").defaultNow().notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("expenses_shop_spent_idx").on(table.shopId, table.spentAt)]);

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  plan: mysqlEnum("plan", ["free", "basic", "pro"]).default("free").notNull(),
  status: mysqlEnum("status", ["active", "trialing", "past_due", "canceled"]).default("active").notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  provider: varchar("provider", { length: 32 }).default("manual").notNull(),
  externalReference: varchar("externalReference", { length: 255 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("subscriptions_shop_unique").on(table.shopId)]);

export const plans = mysqlTable("plans", {
  code: mysqlEnum("code", ["free", "basic", "pro"]).primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  priceCents: int("priceCents").notNull(),
  maxProducts: int("maxProducts").notNull(),
  maxShops: int("maxShops").notNull(),
  reportsEnabled: int("reportsEnabled").default(0).notNull(),
  pdfExportEnabled: int("pdfExportEnabled").default(0).notNull(),
  isActive: int("isActive").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const adminAuditLogs = mysqlTable("admin_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entityType", { length: 80 }).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  detail: text("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("admin_audit_actor_idx").on(table.actorUserId),
  index("admin_audit_created_idx").on(table.createdAt),
]);

export const paymentRequests = mysqlTable("payment_requests", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  orderCode: varchar("orderCode", { length: 48 }).notNull(),
  plan: mysqlEnum("plan", ["basic", "pro"]).notNull(),
  billingMonths: int("billingMonths").default(1).notNull(),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).default("EGP").notNull(),
  provider: varchar("provider", { length: 32 }).default("vodafone_cash").notNull(),
  payerPhone: varchar("payerPhone", { length: 32 }).notNull(),
  transferReference: varchar("transferReference", { length: 96 }),
  receiptKey: varchar("receiptKey", { length: 512 }).notNull(),
  receiptUrl: varchar("receiptUrl", { length: 768 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "expired"]).default("pending").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  rejectionReason: varchar("rejectionReason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("payment_requests_order_code_unique").on(table.orderCode),
  index("payment_requests_shop_idx").on(table.shopId),
  index("payment_requests_status_idx").on(table.status, table.createdAt),
]);

export const paymentAuditLogs = mysqlTable("payment_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  paymentRequestId: int("paymentRequestId").notNull(),
  actorUserId: int("actorUserId").notNull(),
  action: mysqlEnum("action", ["created", "approved", "rejected", "status_viewed"]).notNull(),
  detail: varchar("detail", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("payment_audit_request_idx").on(table.paymentRequestId)]);

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  type: mysqlEnum("type", ["low_stock", "debt_due", "system"]).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("notifications_shop_read_idx").on(table.shopId, table.isRead)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ShopMemberRole = "owner" | "manager" | "cashier";
export type PlatformRole = "shop_owner" | "super_admin";

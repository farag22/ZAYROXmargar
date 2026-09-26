create schema if not exists zayrox;
set search_path to zayrox, public;

create type user_role as enum ('shop_owner', 'super_admin');
create type shop_member_role as enum ('owner', 'manager', 'cashier');
create type sale_status as enum ('completed', 'void');
create type sale_payment_method as enum ('cash', 'card', 'transfer', 'credit');
create type storefront_order_status as enum ('new', 'processing', 'shipped', 'completed');
create type storefront_order_event_status as enum ('new', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled');
create type notification_channel as enum ('in_app', 'sms', 'whatsapp');
create type inventory_movement_type as enum ('sale', 'restock', 'adjustment', 'return');
create type debt_transaction_type as enum ('debt', 'payment', 'adjustment');
create type plan_code as enum ('free', 'basic', 'pro');
create type subscription_status as enum ('active', 'trialing', 'past_due', 'canceled');
create type payment_plan as enum ('basic', 'pro');
create type payment_request_status as enum ('pending', 'approved', 'rejected', 'expired');
create type payment_audit_action as enum ('created', 'approved', 'rejected', 'status_viewed');
create type notification_type as enum ('low_stock', 'debt_due', 'system');

create table users (
  id serial primary key,
  "openId" varchar(64) not null unique,
  name text,
  email varchar(320),
  "passwordHash" varchar(255),
  "loginMethod" varchar(64),
  role user_role not null default 'shop_owner',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "lastSignedIn" timestamptz not null default now()
);
create unique index users_email_unique on users (email);

create table shops (
  id serial primary key,
  name varchar(120) not null,
  slug varchar(120),
  is_storefront_active integer not null default 1,
  storefront_template varchar(32) not null default 'classic',
  logo_url varchar(768),
  cover_image_url varchar(768),
  description text,
  phone varchar(32),
  address text,
  business_hours varchar(255),
  currency varchar(3) not null default 'SAR',
  timezone varchar(64) not null default 'Asia/Riyadh',
  "ownerUserId" integer not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index shops_owner_idx on shops ("ownerUserId");
create unique index shops_slug_unique on shops (slug);

create table shop_members (
  id serial primary key,
  "shopId" integer not null,
  "userId" integer not null,
  role shop_member_role not null default 'cashier',
  "createdAt" timestamptz not null default now()
);
create unique index shop_members_shop_user_unique on shop_members ("shopId", "userId");
create index shop_members_user_idx on shop_members ("userId");

create table shop_delivery_zones (
  id serial primary key,
  "shopId" integer not null,
  governorate varchar(80) not null,
  "feeCents" integer not null default 0,
  "isActive" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create unique index delivery_zones_shop_governorate_unique on shop_delivery_zones ("shopId", governorate);
create index delivery_zones_shop_active_idx on shop_delivery_zones ("shopId", "isActive");

create table shop_payment_methods (
  id serial primary key,
  "shopId" integer not null,
  method varchar(32) not null,
  "accountName" varchar(120),
  "accountNumber" varchar(96) not null,
  "isActive" integer not null default 0,
  "isCodDepositMethod" integer not null default 0,
  "codDepositCents" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create unique index payment_methods_shop_method_unique on shop_payment_methods ("shopId", method);
create index payment_methods_shop_active_idx on shop_payment_methods ("shopId", "isActive");

create table categories (
  id serial primary key,
  "shopId" integer not null,
  name varchar(80) not null,
  color varchar(16) not null default '#0f766e',
  "createdAt" timestamptz not null default now()
);
create unique index categories_shop_name_unique on categories ("shopId", name);
create index categories_shop_idx on categories ("shopId");

create table products (
  id serial primary key,
  "shopId" integer not null,
  "categoryId" integer,
  name varchar(160) not null,
  sku varchar(80),
  product_image varchar(768),
  "sellingPriceCents" integer not null,
  "costPriceCents" integer not null default 0,
  "quantityInStock" integer not null default 0,
  "reorderPoint" integer not null default 5,
  "isActive" integer not null default 1,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create unique index products_shop_sku_unique on products ("shopId", sku);
create index products_shop_idx on products ("shopId");
create index products_stock_idx on products ("shopId", "quantityInStock");

create table customers (
  id serial primary key,
  "shopId" integer not null,
  name varchar(150) not null,
  phone varchar(32),
  email varchar(320),
  note text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index customers_shop_idx on customers ("shopId");

create table sales (
  id serial primary key,
  "shopId" integer not null,
  "invoiceNo" varchar(48) not null,
  "customerId" integer,
  status sale_status not null default 'completed',
  "totalCents" integer not null,
  "paidCents" integer not null,
  "debtCents" integer not null default 0,
  "discountCents" integer not null default 0,
  "paymentMethod" sale_payment_method not null default 'cash',
  note text,
  "soldAt" timestamptz not null default now(),
  "createdByUserId" integer not null,
  "createdAt" timestamptz not null default now()
);
create unique index sales_shop_invoice_unique on sales ("shopId", "invoiceNo");
create index sales_shop_sold_idx on sales ("shopId", "soldAt");
create index sales_customer_idx on sales ("customerId");

create table sale_items (
  id serial primary key,
  "shopId" integer not null,
  "saleId" integer not null,
  "productId" integer not null,
  "productName" varchar(160) not null,
  "unitPriceCents" integer not null,
  "costPriceCents" integer not null,
  quantity integer not null,
  "lineTotalCents" integer not null,
  "createdAt" timestamptz not null default now()
);
create index sale_items_sale_idx on sale_items ("saleId");
create index sale_items_product_idx on sale_items ("shopId", "productId");

create table storefront_orders (
  id serial primary key,
  "shopId" integer not null,
  "orderNo" varchar(48) not null,
  "customerName" varchar(150) not null,
  "customerPhone" varchar(32) not null,
  "customerAddress" text not null,
  "customerNote" text,
  delivery_governorate varchar(80),
  delivery_fee_cents integer not null default 0,
  payment_mode varchar(32),
  payment_method varchar(32),
  payment_account_number varchar(96),
  payment_amount_cents integer not null default 0,
  payment_status varchar(32) not null default 'not_required',
  payment_payer_phone varchar(32),
  payment_reference varchar(120),
  payment_proof_url varchar(768),
  status storefront_order_status not null default 'new',
  "subtotalCents" integer not null,
  "totalCents" integer not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create unique index storefront_orders_shop_order_unique on storefront_orders ("shopId", "orderNo");
create index storefront_orders_shop_status_idx on storefront_orders ("shopId", status, "createdAt");

create table storefront_order_status_events (
  id serial primary key,
  "shopId" integer not null,
  "orderId" integer not null,
  status storefront_order_event_status not null,
  channel notification_channel not null default 'in_app',
  message varchar(255) not null,
  "createdAt" timestamptz not null default now()
);
create index storefront_order_status_events_order_idx on storefront_order_status_events ("orderId", "createdAt");
create index storefront_order_status_events_shop_idx on storefront_order_status_events ("shopId", "createdAt");

create table storefront_order_items (
  id serial primary key,
  "shopId" integer not null,
  "orderId" integer not null,
  "productId" integer not null,
  "productName" varchar(160) not null,
  "productImage" varchar(768),
  "unitPriceCents" integer not null,
  quantity integer not null,
  "lineTotalCents" integer not null,
  "createdAt" timestamptz not null default now()
);
create index storefront_order_items_order_idx on storefront_order_items ("orderId");
create index storefront_order_items_shop_product_idx on storefront_order_items ("shopId", "productId");

create table inventory_movements (
  id serial primary key,
  "shopId" integer not null,
  "productId" integer not null,
  "saleId" integer,
  type inventory_movement_type not null,
  "quantityDelta" integer not null,
  note varchar(255),
  "createdByUserId" integer not null,
  "createdAt" timestamptz not null default now()
);
create index inventory_shop_product_idx on inventory_movements ("shopId", "productId");
create index inventory_sale_idx on inventory_movements ("saleId");

create table debt_transactions (
  id serial primary key,
  "shopId" integer not null,
  "customerId" integer not null,
  "saleId" integer,
  type debt_transaction_type not null,
  "amountCents" integer not null,
  "dueDate" timestamptz,
  note text,
  "createdByUserId" integer not null,
  "createdAt" timestamptz not null default now()
);
create index debt_shop_customer_idx on debt_transactions ("shopId", "customerId");
create index debt_due_idx on debt_transactions ("shopId", "dueDate");

create table expenses (
  id serial primary key,
  "shopId" integer not null,
  category varchar(80) not null,
  "amountCents" integer not null,
  note text,
  "spentAt" timestamptz not null default now(),
  "createdByUserId" integer not null,
  "createdAt" timestamptz not null default now()
);
create index expenses_shop_spent_idx on expenses ("shopId", "spentAt");

create table subscriptions (
  id serial primary key,
  "shopId" integer not null,
  plan plan_code not null default 'free',
  status subscription_status not null default 'active',
  "startsAt" timestamptz,
  "endsAt" timestamptz,
  provider varchar(32) not null default 'manual',
  "externalReference" varchar(255),
  "updatedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now()
);
create unique index subscriptions_shop_unique on subscriptions ("shopId");

create table plans (
  code plan_code primary key,
  name varchar(80) not null,
  "priceCents" integer not null,
  "maxProducts" integer not null,
  "maxShops" integer not null,
  "reportsEnabled" integer not null default 0,
  "pdfExportEnabled" integer not null default 0,
  "isActive" integer not null default 1,
  "updatedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now()
);

create table admin_audit_logs (
  id serial primary key,
  "actorUserId" integer not null,
  action varchar(80) not null,
  "entityType" varchar(80) not null,
  "entityId" varchar(80),
  detail text,
  "createdAt" timestamptz not null default now()
);
create index admin_audit_actor_idx on admin_audit_logs ("actorUserId");
create index admin_audit_created_idx on admin_audit_logs ("createdAt");

create table payment_requests (
  id serial primary key,
  "shopId" integer not null,
  "requestedByUserId" integer not null,
  "orderCode" varchar(48) not null,
  plan payment_plan not null,
  "billingMonths" integer not null default 1,
  "amountCents" integer not null,
  currency varchar(3) not null default 'EGP',
  provider varchar(32) not null default 'vodafone_cash',
  "payerPhone" varchar(32) not null,
  "transferReference" varchar(96),
  "receiptKey" varchar(512) not null,
  "receiptUrl" varchar(768) not null,
  status payment_request_status not null default 'pending',
  "reviewedByUserId" integer,
  "reviewedAt" timestamptz,
  "rejectionReason" varchar(255),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create unique index payment_requests_order_code_unique on payment_requests ("orderCode");
create index payment_requests_shop_idx on payment_requests ("shopId");
create index payment_requests_status_idx on payment_requests (status, "createdAt");

create table payment_audit_logs (
  id serial primary key,
  "paymentRequestId" integer not null,
  "actorUserId" integer not null,
  action payment_audit_action not null,
  detail varchar(255),
  "createdAt" timestamptz not null default now()
);
create index payment_audit_request_idx on payment_audit_logs ("paymentRequestId");

create table notifications (
  id serial primary key,
  "shopId" integer not null,
  type notification_type not null,
  title varchar(160) not null,
  body text not null,
  "entityType" varchar(64),
  "entityId" integer,
  "isRead" integer not null default 0,
  "createdAt" timestamptz not null default now()
);
create index notifications_shop_read_idx on notifications ("shopId", "isRead");

insert into plans (code, name, "priceCents", "maxProducts", "maxShops", "reportsEnabled", "pdfExportEnabled", "isActive")
values
  ('free', 'مجانية', 0, 50, 1, 0, 0, 1),
  ('basic', 'أساسية', 9900, 300, 3, 1, 0, 1),
  ('pro', 'احترافية', 19900, 5000, 10, 1, 1, 1)
on conflict do nothing;

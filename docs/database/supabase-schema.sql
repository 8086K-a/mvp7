-- Supabase schema (snapshot)
-- Source of truth: files under supabase/migrations/

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public."user" (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  credits integer not null default 300 check (credits >= 0),
  subscription_tier text not null default 'free',
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id bigserial primary key,
  user_id uuid not null references public."user" (id) on delete cascade,
  type text not null check (type in ('purchase', 'consume', 'refund', 'adjustment')),
  amount integer not null,
  description text,
  reference_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_transactions (
  id bigserial primary key,
  user_email text not null,
  plan_type text,
  billing_cycle text,
  credit_amount integer,
  amount_usd numeric(12, 2),
  amount_cny numeric(12, 2),
  payment_method text not null,
  transaction_id text not null unique,
  wechat_transaction_id text,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id bigserial primary key,
  user_email text not null unique,
  plan_type text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'cancelled', 'past_due')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.web_subscriptions (
  id bigserial primary key,
  user_email text not null unique,
  platform text not null default 'web',
  payment_method text,
  plan_type text,
  billing_cycle text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'cancelled', 'past_due')),
  start_time timestamptz,
  expire_time timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  auto_renew boolean not null default false,
  next_billing_date timestamptz,
  stripe_session_id text,
  paypal_order_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.web_payment_transactions (
  id bigserial primary key,
  subscription_id bigint references public.web_subscriptions (id) on delete set null,
  user_email text not null,
  product_name text,
  plan_type text,
  billing_cycle text,
  payment_method text not null,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  transaction_type text not null default 'purchase',
  currency text not null default 'USD',
  gross_amount integer,
  payment_fee integer,
  net_amount integer,
  service_cost integer not null default 0,
  profit integer,
  transaction_id text unique,
  wechat_transaction_id text,
  stripe_session_id text,
  stripe_payment_intent_id text,
  paypal_order_id text,
  paypal_capture_id text,
  payment_time timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id bigserial primary key,
  provider text not null
    check (provider in ('stripe', 'paypal', 'alipay', 'wechatpay')),
  event_id text not null,
  event_type text,
  transaction_id text,
  status text not null default 'received'
    check (status in ('received', 'processed', 'failed', 'ignored')),
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  wechat_openid text unique,
  wechat_unionid text,
  city text,
  province text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_credit_transactions_user_created
  on public.credit_transactions (user_id, created_at desc);

create index if not exists idx_credit_transactions_created
  on public.credit_transactions (created_at desc);

create index if not exists idx_payment_transactions_user_created
  on public.payment_transactions (user_email, created_at desc);

create index if not exists idx_payment_transactions_status_created
  on public.payment_transactions (status, created_at desc);

create index if not exists idx_subscriptions_status_end
  on public.subscriptions (status, current_period_end);

create index if not exists idx_web_subscriptions_status_expire
  on public.web_subscriptions (status, expire_time);

create index if not exists idx_web_subscriptions_next_billing
  on public.web_subscriptions (next_billing_date);

create index if not exists idx_web_payment_transactions_user_created
  on public.web_payment_transactions (user_email, created_at desc);

create index if not exists idx_web_payment_transactions_status_created
  on public.web_payment_transactions (payment_status, created_at desc);

create index if not exists idx_web_payment_transactions_method_status
  on public.web_payment_transactions (payment_method, payment_status);

create index if not exists idx_web_payment_transactions_stripe_session
  on public.web_payment_transactions (stripe_session_id);

create index if not exists idx_web_payment_transactions_paypal_order
  on public.web_payment_transactions (paypal_order_id);

create unique index if not exists ux_webhook_events_provider_event
  on public.webhook_events (provider, event_id);

create index if not exists idx_webhook_events_status_received
  on public.webhook_events (status, received_at desc);

create index if not exists idx_webhook_events_transaction
  on public.webhook_events (transaction_id);

drop trigger if exists trg_user_set_updated_at on public."user";
create trigger trg_user_set_updated_at
before update on public."user"
for each row execute function public.set_updated_at();

drop trigger if exists trg_payment_transactions_set_updated_at on public.payment_transactions;
create trigger trg_payment_transactions_set_updated_at
before update on public.payment_transactions
for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_set_updated_at on public.subscriptions;
create trigger trg_subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists trg_web_subscriptions_set_updated_at on public.web_subscriptions;
create trigger trg_web_subscriptions_set_updated_at
before update on public.web_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists trg_web_payment_transactions_set_updated_at on public.web_payment_transactions;
create trigger trg_web_payment_transactions_set_updated_at
before update on public.web_payment_transactions
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

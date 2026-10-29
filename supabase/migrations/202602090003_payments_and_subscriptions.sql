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

drop trigger if exists trg_payment_transactions_set_updated_at on public.payment_transactions;
create trigger trg_payment_transactions_set_updated_at
before update on public.payment_transactions
for each row
execute function public.set_updated_at();

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

drop trigger if exists trg_subscriptions_set_updated_at on public.subscriptions;
create trigger trg_subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

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

drop trigger if exists trg_web_subscriptions_set_updated_at on public.web_subscriptions;
create trigger trg_web_subscriptions_set_updated_at
before update on public.web_subscriptions
for each row
execute function public.set_updated_at();

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

drop trigger if exists trg_web_payment_transactions_set_updated_at on public.web_payment_transactions;
create trigger trg_web_payment_transactions_set_updated_at
before update on public.web_payment_transactions
for each row
execute function public.set_updated_at();

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

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


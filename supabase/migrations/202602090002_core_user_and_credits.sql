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

drop trigger if exists trg_user_set_updated_at on public."user";
create trigger trg_user_set_updated_at
before update on public."user"
for each row
execute function public.set_updated_at();

create table if not exists public.credit_transactions (
  id bigserial primary key,
  user_id uuid not null references public."user" (id) on delete cascade,
  type text not null check (type in ('purchase', 'consume', 'refund', 'adjustment')),
  amount integer not null,
  description text,
  reference_id text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_transactions_user_created
  on public.credit_transactions (user_id, created_at desc);

create index if not exists idx_credit_transactions_created
  on public.credit_transactions (created_at desc);


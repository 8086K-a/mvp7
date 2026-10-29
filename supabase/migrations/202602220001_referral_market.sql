alter table public."user"
  add column if not exists referral_code text;

alter table public."user"
  add column if not exists referred_by uuid references public."user" (id) on delete set null;

alter table public."user"
  add column if not exists referred_at timestamptz;

create unique index if not exists idx_user_referral_code_unique
  on public."user" (referral_code)
  where referral_code is not null;

create index if not exists idx_user_referred_by
  on public."user" (referred_by);

create table if not exists public.referral_links (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public."user" (id) on delete cascade,
  tool_slug text not null,
  share_code text not null unique,
  source_default text,
  is_active boolean not null default true,
  click_count bigint not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_referral_links_creator_created
  on public.referral_links (creator_user_id, created_at desc);

create index if not exists idx_referral_links_share_active
  on public.referral_links (share_code, is_active);

create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  share_code text not null,
  source text,
  ip_hash text,
  user_agent_hash text,
  landing_path text,
  created_at timestamptz not null default now(),
  registered_user_id uuid references public."user" (id) on delete set null
);

create index if not exists idx_referral_clicks_share_created
  on public.referral_clicks (share_code, created_at desc);

create index if not exists idx_referral_clicks_created
  on public.referral_clicks (created_at desc);

create index if not exists idx_referral_clicks_registered_user
  on public.referral_clicks (registered_user_id);

create table if not exists public.referral_relations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references public."user" (id) on delete cascade,
  invited_user_id uuid not null references public."user" (id) on delete cascade,
  share_code text not null,
  tool_slug text,
  first_tool_id text,
  status text not null default 'bound',
  created_at timestamptz not null default now(),
  activated_at timestamptz
);

alter table public.referral_relations
  add column if not exists first_tool_id text;

alter table public.referral_relations
  add column if not exists activated_at timestamptz;

create unique index if not exists idx_referral_relations_invited_unique
  on public.referral_relations (invited_user_id);

create unique index if not exists idx_referral_relations_pair_unique
  on public.referral_relations (inviter_user_id, invited_user_id);

create index if not exists idx_referral_relations_inviter_created
  on public.referral_relations (inviter_user_id, created_at desc);

create index if not exists idx_referral_relations_activated
  on public.referral_relations (activated_at desc);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  relation_id uuid references public.referral_relations (id) on delete set null,
  user_id uuid not null references public."user" (id) on delete cascade,
  reward_type text not null,
  amount integer not null check (amount > 0),
  status text not null default 'granted',
  reference_id text not null unique,
  created_at timestamptz not null default now(),
  granted_at timestamptz
);

create index if not exists idx_referral_rewards_user_created
  on public.referral_rewards (user_id, created_at desc);

create index if not exists idx_referral_rewards_relation
  on public.referral_rewards (relation_id);

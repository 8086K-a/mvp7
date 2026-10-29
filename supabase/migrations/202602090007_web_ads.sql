create table if not exists public.web_ads (
  id uuid primary key default gen_random_uuid(),
  region text not null default 'INTL',
  title text not null,
  image_url text not null,
  link_url text not null,
  placement text not null default 'dashboard_top',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_web_ads_region_active
  on public.web_ads(region, is_active, placement, sort_order);

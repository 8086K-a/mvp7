create table if not exists public.web_ad_clicks (
  id uuid primary key default gen_random_uuid(),
  ad_id text not null,
  region text not null,
  placement text not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_web_ad_clicks_created_at
  on public.web_ad_clicks(created_at desc);

create index if not exists idx_web_ad_clicks_region_placement
  on public.web_ad_clicks(region, placement);

create index if not exists idx_web_ad_clicks_ad_id
  on public.web_ad_clicks(ad_id);

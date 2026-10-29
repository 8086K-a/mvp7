create table if not exists public.download_packages (
  id uuid primary key default gen_random_uuid(),
  region text not null default 'INTL',
  platform text not null,
  version text not null,
  title text not null,
  file_name text not null,
  file_size bigint not null default 0,
  mime_type text not null default 'application/octet-stream',
  release_notes text,
  is_active boolean not null default true,
  download_count integer not null default 0,
  storage_provider text not null default 'supabase',
  file_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_download_packages_region_active
  on public.download_packages(region, is_active);

create table if not exists public.download_events (
  id bigserial primary key,
  package_id uuid not null,
  region text not null default 'INTL',
  user_id text,
  user_email text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_download_events_package
  on public.download_events(package_id, created_at desc);

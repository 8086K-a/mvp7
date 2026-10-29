create table if not exists public.tool_history (
  id bigserial primary key,
  user_id uuid not null references public."user" (id) on delete cascade,
  user_email text,
  tool_id text not null,
  tool_title text not null,
  tool_description text,
  tool_url text,
  event_type text not null default 'open',
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tool_history_set_updated_at on public.tool_history;
create trigger trg_tool_history_set_updated_at
before update on public.tool_history
for each row
execute function public.set_updated_at();

create index if not exists idx_tool_history_user_created
  on public.tool_history (user_id, created_at desc);

create index if not exists idx_tool_history_user_tool_created
  on public.tool_history (user_id, tool_id, created_at desc);

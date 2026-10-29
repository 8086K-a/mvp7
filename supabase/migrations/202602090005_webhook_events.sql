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

create unique index if not exists ux_webhook_events_provider_event
  on public.webhook_events (provider, event_id);

create index if not exists idx_webhook_events_status_received
  on public.webhook_events (status, received_at desc);

create index if not exists idx_webhook_events_transaction
  on public.webhook_events (transaction_id);


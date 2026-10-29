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


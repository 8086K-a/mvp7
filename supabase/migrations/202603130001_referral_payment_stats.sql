-- 为邀请支付统计添加索引
create index if not exists idx_web_payment_transactions_user_profit
  on public.web_payment_transactions (user_email, payment_status, profit)
  where payment_status = 'completed';

create index if not exists idx_referral_relations_inviter_invited
  on public.referral_relations (inviter_user_id, invited_user_id);

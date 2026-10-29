# CloudBase -> Supabase Migration Map

## 目标

把当前业务里已使用的数据结构统一到 Supabase，并兼容现有代码中的两套命名：

- 旧版：`payment_transactions`、`subscriptions`
- 新版 Web：`web_payment_transactions`、`web_subscriptions`

## 集合/表映射

| CloudBase 集合 | Supabase 表 | 说明 |
| --- | --- | --- |
| `web_users` | `public."user"` | 用户信息、积分、订阅等级 |
| `web_credit_transactions` | `public.credit_transactions` | 积分流水 |
| `web_payment_transactions` | `public.web_payment_transactions` | Web 订阅支付流水（Stripe/PayPal/Wechat） |
| `web_subscriptions` | `public.web_subscriptions` | Web 订阅状态 |
| `webhook_events` | `public.webhook_events` | 支付回调事件审计与幂等去重 |
| *(旧流程无 CloudBase 对应)* | `public.payment_transactions` | 旧支付流程流水（Alipay/PayPal/Crypto/Credits） |
| *(旧流程无 CloudBase 对应)* | `public.subscriptions` | 旧订阅状态 |
| *(社交登录扩展)* | `public.profiles` | WeChat profile 信息 |

## 迁移文件顺序

1. `supabase/migrations/202602090001_extensions_and_helpers.sql`
2. `supabase/migrations/202602090002_core_user_and_credits.sql`
3. `supabase/migrations/202602090003_payments_and_subscriptions.sql`
4. `supabase/migrations/202602090004_indexes.sql`
5. `supabase/migrations/202602090005_webhook_events.sql`

## 关键兼容点

- `public."user"` 保持表名为 `user`（和代码 `.from('user')` 一致）。
- `web_subscriptions` 同时保留 `start_time/expire_time` 与 `current_period_start/current_period_end`，兼容不同支付回调写法。
- `credit_transactions.reference_id` 唯一，保证积分发放幂等（避免重复加分）。
- `payment_transactions.transaction_id` 与 `web_payment_transactions.transaction_id` 设为唯一，便于回调幂等更新。
- `webhook_events(provider, event_id)` 唯一，保证 webhook 重试不会重复发放权益。

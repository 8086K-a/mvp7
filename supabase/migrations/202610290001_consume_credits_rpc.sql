-- 积分扣减：占位 + 扣减 在同一个数据库事务内完成
--
-- 设计要点：
-- 1. 先插入 credit_transactions 占位（reference_id 上有 UNIQUE 约束）。
--    唯一冲突 = 该笔业务已经处理过，直接返回 already_processed，不再扣分。
-- 2. 再执行原子扣减 credits = credits - cost WHERE credits >= cost。
--    不读出来再写回，避免并发下的丢更新（lost update）。
-- 3. 余额不足时 raise exception，整个函数事务回滚，
--    连同第 1 步的占位一起撤销 —— 否则这张单会被标记成"已处理但没扣钱"。
--
-- 调用方式（服务端 service_role）：
--   select * from public.consume_credits(p_user_id, p_cost, p_tool_id, p_reference_id);

create or replace function public.consume_credits(
  p_user_id uuid,
  p_cost integer,
  p_tool_id text,
  p_reference_id text
)
returns table (new_credits integer, already_processed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new_credits integer;
  v_current_credits integer;
begin
  if p_cost is null or p_cost <= 0 then
    raise exception 'INVALID_COST' using errcode = 'P0001';
  end if;

  if p_reference_id is null or length(btrim(p_reference_id)) = 0 then
    raise exception 'INVALID_REFERENCE_ID' using errcode = 'P0001';
  end if;

  -- 步骤 1：占位。unique_violation 只会回滚这个 begin/exception 子块，不影响外层事务。
  begin
    insert into public.credit_transactions (user_id, type, amount, description, reference_id)
    values (
      p_user_id,
      'consume',
      -p_cost,
      format('Consumed %s credits for tool %s', p_cost, p_tool_id),
      p_reference_id
    );
  exception
    when unique_violation then
      select u.credits into v_current_credits from public."user" u where u.id = p_user_id;
      return query select coalesce(v_current_credits, 0), true;
      return;
    when foreign_key_violation then
      raise exception 'USER_NOT_FOUND' using errcode = 'P0001';
  end;

  -- 步骤 2：原子扣减。条件更新同时负责"防超扣"和"防丢更新"。
  update public."user"
     set credits = credits - p_cost
   where id = p_user_id
     and credits >= p_cost
  returning credits into v_new_credits;

  if v_new_credits is null then
    -- 余额不足：抛异常让整个函数（含上面的占位）回滚
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  return query select v_new_credits, false;
end;
$$;

comment on function public.consume_credits(uuid, integer, text, text)
  is '原子扣减积分：先唯一占位再条件扣减，余额不足整体回滚';

revoke all on function public.consume_credits(uuid, integer, text, text) from public;
grant execute on function public.consume_credits(uuid, integer, text, text) to service_role;

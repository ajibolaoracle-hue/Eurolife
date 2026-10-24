-- Transactional job operations. Review and test in a staging Supabase project before enabling.
-- Clients call these through authenticated RPC; auth.uid() determines the acting player.
-- The service-role key must never be shipped in the Unity client.

create or replace function public.create_job_with_escrow(
  p_business_name text,
  p_title text,
  p_description text,
  p_wage_euros integer,
  p_estimated_minutes integer,
  p_idempotency_key text
)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_existing public.jobs;
  v_job public.jobs;
  v_balance bigint;
begin
  if v_user is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 or length(p_idempotency_key) > 128 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  select j.* into v_existing
    from public.jobs j
    join public.wallet_ledger l on l.job_id = j.id
   where j.employer_id = v_user
     and l.user_id = v_user
     and l.reason = 'job_escrow'
     and l.idempotency_key = p_idempotency_key
   limit 1;
  if found then return v_existing; end if;

  if p_title is null or length(trim(p_title)) not between 1 and 80 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;
  if coalesce(length(p_description), 0) > 2000 then raise exception 'description_too_long' using errcode = '22023'; end if;
  if coalesce(length(trim(p_business_name)), 0) not between 1 and 80 then raise exception 'invalid_business_name' using errcode = '22023'; end if;
  if p_wage_euros is null or p_wage_euros not between 1 and 100000 then raise exception 'invalid_wage' using errcode = '22023'; end if;
  if p_estimated_minutes is null or p_estimated_minutes not between 5 and 1440 then raise exception 'invalid_duration' using errcode = '22023'; end if;

  select balance_euros into v_balance from public.wallet_accounts where user_id = v_user for update;
  if not found or v_balance < p_wage_euros then
    raise exception 'insufficient_funds' using errcode = 'P0001';
  end if;

  insert into public.jobs(employer_id, business_name, title, description, wage_euros, estimated_minutes, status)
  values (v_user, trim(p_business_name), trim(p_title), coalesce(trim(p_description), ''),
          p_wage_euros, p_estimated_minutes, 'open')
  returning * into v_job;

  update public.wallet_accounts
     set balance_euros = balance_euros - p_wage_euros, updated_at = now()
   where user_id = v_user;

  insert into public.wallet_ledger(user_id, amount_euros, reason, job_id, idempotency_key)
  values (v_user, -p_wage_euros, 'job_escrow', v_job.id, p_idempotency_key);

  return v_job;
end;
$$;

create or replace function public.transition_player_job(
  p_job_id uuid,
  p_action text,
  p_idempotency_key text
)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_job public.jobs;
  v_wallet_balance bigint;
  v_existing_job_id uuid;
begin
  if v_user is null then raise exception 'unauthorized' using errcode = '28000'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 or length(p_idempotency_key) > 128 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  -- Idempotent replay: if this player already recorded this action key, return its job.
  select job_id into v_existing_job_id from public.wallet_ledger
   where user_id = v_user and idempotency_key = p_idempotency_key limit 1;
  if found then
    select * into v_job from public.jobs where id = coalesce(v_existing_job_id, p_job_id);
    if found then return v_job; end if;
  end if;

  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then raise exception 'job_not_found' using errcode = 'P0002'; end if;

  if p_action = 'apply' then
    if v_job.status <> 'open' then raise exception 'job_not_open' using errcode = 'P0001'; end if;
    if v_job.employer_id = v_user then raise exception 'cannot_apply_own_job' using errcode = '42501'; end if;
    insert into public.job_applications(job_id, applicant_id, status)
      values (v_job.id, v_user, 'pending')
      on conflict (job_id, applicant_id) do update set status = 'pending';
    update public.jobs set status = 'applied', worker_id = v_user, updated_at = now()
      where id = v_job.id returning * into v_job;

  elsif p_action = 'hire' then
    if v_job.employer_id <> v_user then raise exception 'employer_only' using errcode = '42501'; end if;
    if v_job.status <> 'applied' or v_job.worker_id is null then raise exception 'no_pending_applicant' using errcode = 'P0001'; end if;
    update public.jobs set status = 'hired', updated_at = now() where id = v_job.id returning * into v_job;
    update public.job_applications set status = case when applicant_id = v_job.worker_id then 'accepted' else 'rejected' end
      where job_id = v_job.id and status = 'pending';

  elsif p_action = 'start' then
    if v_job.worker_id <> v_user then raise exception 'worker_only' using errcode = '42501'; end if;
    if v_job.status <> 'hired' then raise exception 'job_not_hired' using errcode = 'P0001'; end if;
    update public.jobs set status = 'in_progress', updated_at = now() where id = v_job.id returning * into v_job;

  elsif p_action = 'submit' then
    if v_job.worker_id <> v_user then raise exception 'worker_only' using errcode = '42501'; end if;
    if v_job.status <> 'in_progress' then raise exception 'job_not_in_progress' using errcode = 'P0001'; end if;
    update public.jobs set status = 'submitted', updated_at = now() where id = v_job.id returning * into v_job;

  elsif p_action = 'approve' then
    if v_job.employer_id <> v_user then raise exception 'employer_only' using errcode = '42501'; end if;
    if v_job.status <> 'submitted' then raise exception 'job_not_submitted' using errcode = 'P0001'; end if;
    if v_job.worker_id is null then raise exception 'worker_missing' using errcode = 'P0001'; end if;

    insert into public.wallet_accounts(user_id, balance_euros)
      values (v_job.worker_id, 0) on conflict (user_id) do nothing;
    update public.wallet_accounts set balance_euros = balance_euros + v_job.wage_euros, updated_at = now()
      where user_id = v_job.worker_id;
    insert into public.wallet_ledger(user_id, amount_euros, reason, job_id, idempotency_key)
      values (v_job.worker_id, v_job.wage_euros, 'job_payment', v_job.id, p_idempotency_key);
    update public.jobs set status = 'completed', updated_at = now() where id = v_job.id returning * into v_job;

  elsif p_action = 'cancel' then
    if v_job.employer_id <> v_user then raise exception 'employer_only' using errcode = '42501'; end if;
    if v_job.status not in ('open','applied','hired') then raise exception 'job_cannot_be_cancelled' using errcode = 'P0001'; end if;
    insert into public.wallet_accounts(user_id, balance_euros)
      values (v_job.employer_id, 0) on conflict (user_id) do nothing;
    update public.wallet_accounts set balance_euros = balance_euros + v_job.wage_euros, updated_at = now()
      where user_id = v_job.employer_id;
    insert into public.wallet_ledger(user_id, amount_euros, reason, job_id, idempotency_key)
      values (v_job.employer_id, v_job.wage_euros, 'job_refund', v_job.id, p_idempotency_key);
    update public.jobs set status = 'cancelled', updated_at = now() where id = v_job.id returning * into v_job;

  else
    raise exception 'unsupported_action' using errcode = '22023';
  end if;

  return v_job;
end;
$$;

revoke all on function public.create_job_with_escrow(text,text,text,integer,integer,text) from public, anon;
revoke all on function public.transition_player_job(uuid,text,text) from public, anon;
grant execute on function public.create_job_with_escrow(text,text,text,integer,integer,text) to authenticated;
grant execute on function public.transition_player_job(uuid,text,text) to authenticated;

-- Do not grant direct client updates to wallet balances, jobs, or ledger.
-- Important: this is a starter migration; validate transaction idempotency and all edge cases
-- with automated tests in staging before enabling for production.

-- EURO LIFE live backend hardening migration (applied to Supabase staging project).
-- Adds transition idempotency independent of wallet movements and supports multiple applicants.
create table if not exists public.job_action_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  idempotency_key text not null,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, action, idempotency_key)
);
alter table public.job_action_requests enable row level security;
revoke all on public.job_action_requests from public, anon, authenticated;

create or replace function public.create_job_with_escrow(
  p_business_name text, p_title text, p_description text,
  p_wage_euros integer, p_estimated_minutes integer, p_idempotency_key text
) returns public.jobs language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_existing public.jobs; v_job public.jobs; v_balance bigint;
begin
  if v_user is null then raise exception 'unauthorized' using errcode='28000'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 or length(p_idempotency_key)>128 then raise exception 'invalid_idempotency_key' using errcode='22023'; end if;
  if p_title is null or length(trim(p_title)) not between 1 and 80 then raise exception 'invalid_title' using errcode='22023'; end if;
  if coalesce(length(p_description),0)>2000 then raise exception 'description_too_long' using errcode='22023'; end if;
  if coalesce(length(trim(p_business_name)),0) not between 1 and 80 then raise exception 'invalid_business_name' using errcode='22023'; end if;
  if p_wage_euros is null or p_wage_euros not between 1 and 100000 then raise exception 'invalid_wage' using errcode='22023'; end if;
  if p_estimated_minutes is null or p_estimated_minutes not between 5 and 1440 then raise exception 'invalid_duration' using errcode='22023'; end if;
  select balance_euros into v_balance from public.wallet_accounts where user_id=v_user for update;
  if not found then raise exception 'wallet_not_initialized' using errcode='P0001'; end if;
  select j.* into v_existing from public.jobs j join public.wallet_ledger l on l.job_id=j.id
   where j.employer_id=v_user and l.user_id=v_user and l.reason='job_escrow' and l.idempotency_key=p_idempotency_key limit 1;
  if found then return v_existing; end if;
  if v_balance<p_wage_euros then raise exception 'insufficient_funds' using errcode='P0001'; end if;
  insert into public.jobs(employer_id,business_name,title,description,wage_euros,estimated_minutes,status)
   values(v_user,trim(p_business_name),trim(p_title),coalesce(trim(p_description),''),p_wage_euros,p_estimated_minutes,'open') returning * into v_job;
  update public.wallet_accounts set balance_euros=balance_euros-p_wage_euros,updated_at=now() where user_id=v_user;
  insert into public.wallet_ledger(user_id,amount_euros,reason,job_id,idempotency_key) values(v_user,-p_wage_euros,'job_escrow',v_job.id,p_idempotency_key);
  return v_job;
end; $$;

drop function if exists public.transition_player_job(uuid,text,text);
create or replace function public.transition_player_job(
 p_job_id uuid,p_action text,p_idempotency_key text,p_target_worker_id uuid default null
) returns public.jobs language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_job public.jobs; v_replay_job_id uuid; v_worker uuid;
begin
 if v_user is null then raise exception 'unauthorized' using errcode='28000'; end if;
 if p_idempotency_key is null or length(trim(p_idempotency_key))<8 or length(p_idempotency_key)>128 then raise exception 'invalid_idempotency_key' using errcode='22023'; end if;
 if p_action not in ('apply','hire','start','submit','approve','cancel') then raise exception 'unsupported_action' using errcode='22023'; end if;
 select job_id into v_replay_job_id from public.job_action_requests where user_id=v_user and action=p_action and idempotency_key=p_idempotency_key;
 if found then select * into v_job from public.jobs where id=v_replay_job_id; if found then return v_job; end if; end if;
 select * into v_job from public.jobs where id=p_job_id for update;
 if not found then raise exception 'job_not_found' using errcode='P0002'; end if;
 select job_id into v_replay_job_id from public.job_action_requests where user_id=v_user and action=p_action and idempotency_key=p_idempotency_key;
 if found then select * into v_job from public.jobs where id=v_replay_job_id; if found then return v_job; end if; end if;
 if p_action='apply' then
  if v_job.status<>'open' then raise exception 'job_not_open' using errcode='P0001'; end if;
  if v_job.employer_id=v_user then raise exception 'cannot_apply_own_job' using errcode='42501'; end if;
  insert into public.job_applications(job_id,applicant_id,status) values(v_job.id,v_user,'pending')
   on conflict(job_id,applicant_id) do update set status='pending' where public.job_applications.status in ('withdrawn','rejected');
 elsif p_action='hire' then
  if v_job.employer_id<>v_user then raise exception 'employer_only' using errcode='42501'; end if;
  if v_job.status<>'open' then raise exception 'job_not_open' using errcode='P0001'; end if;
  v_worker:=p_target_worker_id;
  if v_worker is null or not exists(select 1 from public.job_applications a where a.job_id=v_job.id and a.applicant_id=v_worker and a.status='pending') then raise exception 'pending_application_required' using errcode='P0001'; end if;
  update public.jobs set status='hired',worker_id=v_worker,updated_at=now() where id=v_job.id returning * into v_job;
  update public.job_applications set status=case when applicant_id=v_worker then 'accepted' else 'rejected' end where job_id=v_job.id and status='pending';
 elsif p_action='start' then
  if v_job.worker_id<>v_user then raise exception 'worker_only' using errcode='42501'; end if;
  if v_job.status<>'hired' then raise exception 'job_not_hired' using errcode='P0001'; end if;
  update public.jobs set status='in_progress',updated_at=now() where id=v_job.id returning * into v_job;
 elsif p_action='submit' then
  if v_job.worker_id<>v_user then raise exception 'worker_only' using errcode='42501'; end if;
  if v_job.status<>'in_progress' then raise exception 'job_not_in_progress' using errcode='P0001'; end if;
  update public.jobs set status='submitted',updated_at=now() where id=v_job.id returning * into v_job;
 elsif p_action='approve' then
  if v_job.employer_id<>v_user then raise exception 'employer_only' using errcode='42501'; end if;
  if v_job.status<>'submitted' or v_job.worker_id is null then raise exception 'job_not_submitted_or_worker_missing' using errcode='P0001'; end if;
  insert into public.wallet_accounts(user_id,balance_euros) values(v_job.worker_id,0) on conflict(user_id) do nothing;
  update public.wallet_accounts set balance_euros=balance_euros+v_job.wage_euros,updated_at=now() where user_id=v_job.worker_id;
  insert into public.wallet_ledger(user_id,amount_euros,reason,job_id,idempotency_key) values(v_job.worker_id,v_job.wage_euros,'job_payment',v_job.id,'payment:'||p_idempotency_key);
  update public.jobs set status='completed',updated_at=now() where id=v_job.id returning * into v_job;
 elsif p_action='cancel' then
  if v_job.employer_id<>v_user then raise exception 'employer_only' using errcode='42501'; end if;
  if v_job.status not in ('open','hired') then raise exception 'job_cannot_be_cancelled' using errcode='P0001'; end if;
  update public.wallet_accounts set balance_euros=balance_euros+v_job.wage_euros,updated_at=now() where user_id=v_job.employer_id;
  insert into public.wallet_ledger(user_id,amount_euros,reason,job_id,idempotency_key) values(v_job.employer_id,v_job.wage_euros,'job_refund',v_job.id,'refund:'||p_idempotency_key);
  update public.jobs set status='cancelled',updated_at=now() where id=v_job.id returning * into v_job;
  update public.job_applications set status='rejected' where job_id=v_job.id and status='pending';
 end if;
 insert into public.job_action_requests(user_id,action,idempotency_key,job_id) values(v_user,p_action,p_idempotency_key,v_job.id);
 return v_job;
end; $$;
revoke all on function public.create_job_with_escrow(text,text,text,integer,integer,text) from public,anon;
revoke all on function public.transition_player_job(uuid,text,text,uuid) from public,anon;
grant execute on function public.create_job_with_escrow(text,text,text,integer,integer,text) to authenticated;
grant execute on function public.transition_player_job(uuid,text,text,uuid) to authenticated;

insert into public.wallet_accounts(user_id,balance_euros) select id,0 from auth.users on conflict(user_id) do nothing;
create or replace function public.initialize_player_wallet() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.wallet_accounts(user_id,balance_euros) values(new.id,0) on conflict(user_id) do nothing; return new; end; $$;
revoke all on function public.initialize_player_wallet() from public,anon,authenticated;
drop trigger if exists on_auth_user_created_wallet on auth.users;
create trigger on_auth_user_created_wallet after insert on auth.users for each row execute function public.initialize_player_wallet();

create index if not exists job_applications_job_status_created_idx on public.job_applications(job_id,status,created_at);
create index if not exists chat_messages_sender_created_idx on public.chat_messages(sender_id,created_at desc);
create index if not exists conversation_members_user_idx on public.conversation_members(user_id,conversation_id);
create index if not exists player_blocks_blocked_idx on public.player_blocks(blocked_id,blocker_id);
create index if not exists player_reports_reported_idx on public.player_reports(reported_id,created_at desc);
create index if not exists wallet_ledger_job_reason_idx on public.wallet_ledger(job_id,reason);

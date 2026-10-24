-- EURO LIFE multiplayer backend schema (Supabase/Postgres)
-- Apply only to a new or reviewed Supabase project. Never expose service_role keys in Unity.
-- Financial/job state changes should be implemented as server-side RPC/Edge Functions.

create extension if not exists pgcrypto;

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 24),
  avatar_id text not null default 'default',
  reputation integer not null default 0 check (reputation between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references auth.users(id) on delete restrict,
  worker_id uuid references auth.users(id) on delete set null,
  business_name text not null default 'Independent business' check (char_length(business_name) <= 80),
  title text not null check (char_length(trim(title)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  wage_euros integer not null check (wage_euros between 1 and 100000),
  estimated_minutes integer not null check (estimated_minutes between 5 and 1440),
  status text not null default 'open'
    check (status in ('open','applied','hired','in_progress','submitted','completed','cancelled','disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_created_idx on public.jobs(status, created_at desc);
create index if not exists jobs_employer_idx on public.jobs(employer_id);
create index if not exists jobs_worker_idx on public.jobs(worker_id);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  unique(job_id, applicant_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct','group','business')),
  title text check (title is null or char_length(title) <= 80),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  muted boolean not null default false,
  primary key (conversation_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages(conversation_id, created_at desc);

create table if not exists public.wallet_accounts (
  user_id uuid primary key references auth.users(id) on delete restrict,
  balance_euros bigint not null default 0 check (balance_euros >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  amount_euros bigint not null check (amount_euros <> 0),
  reason text not null check (reason in ('job_escrow','job_payment','job_refund','admin_adjustment')),
  job_id uuid references public.jobs(id) on delete restrict,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);

create table if not exists public.player_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete restrict,
  reported_id uuid not null references auth.users(id) on delete restrict,
  category text not null check (char_length(trim(category)) between 1 and 60),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

-- Turn on RLS everywhere. Policies intentionally do not grant direct client writes to
-- job lifecycle, wallet balances/ledger, or moderation status. Use trusted server functions.
alter table public.player_profiles enable row level security;
alter table public.player_blocks enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.player_reports enable row level security;

drop policy if exists "profiles are readable by signed-in players" on public.player_profiles;
create policy "profiles are readable by signed-in players"
  on public.player_profiles for select to authenticated using (true);
drop policy if exists "players create own profile" on public.player_profiles;
create policy "players create own profile"
  on public.player_profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "players update own profile" on public.player_profiles;
create policy "players update own profile"
  on public.player_profiles for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "blocks visible to blocker" on public.player_blocks;
create policy "blocks visible to blocker" on public.player_blocks for select to authenticated using (auth.uid() = blocker_id);
drop policy if exists "players create own blocks" on public.player_blocks;
create policy "players create own blocks" on public.player_blocks for insert to authenticated with check (auth.uid() = blocker_id);
drop policy if exists "players remove own blocks" on public.player_blocks;
create policy "players remove own blocks" on public.player_blocks for delete to authenticated using (auth.uid() = blocker_id);

drop policy if exists "signed-in players browse jobs" on public.jobs;
create policy "signed-in players browse jobs"
  on public.jobs for select to authenticated
  using (status = 'open' or employer_id = auth.uid() or worker_id = auth.uid());
-- No client INSERT/UPDATE/DELETE policies for jobs: create and transition jobs via trusted server functions.

drop policy if exists "applicants and job owners read applications" on public.job_applications;
create policy "applicants and job owners read applications"
  on public.job_applications for select to authenticated
  using (applicant_id = auth.uid() or exists (
    select 1 from public.jobs j where j.id = job_id and j.employer_id = auth.uid()
  ));
-- Application writes are server-mediated to enforce job state and prevent self-hiring.

drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations"
  on public.conversations for select to authenticated
  using (exists (select 1 from public.conversation_members m
    where m.conversation_id = id and m.user_id = auth.uid()));

drop policy if exists "members see membership" on public.conversation_members;
create policy "members see membership"
  on public.conversation_members for select to authenticated
  using (exists (select 1 from public.conversation_members m
    where m.conversation_id = conversation_id and m.user_id = auth.uid()));

drop policy if exists "members read chat messages" on public.chat_messages;
create policy "members read chat messages"
  on public.chat_messages for select to authenticated
  using (exists (select 1 from public.conversation_members m
    where m.conversation_id = conversation_id and m.user_id = auth.uid()));

-- No client message INSERT policy by design: a trusted endpoint checks conversation membership,
-- both users' block lists, rate limits and moderation before inserting.

drop policy if exists "players read own wallet" on public.wallet_accounts;
create policy "players read own wallet"
  on public.wallet_accounts for select to authenticated using (auth.uid() = user_id);
drop policy if exists "players read own ledger" on public.wallet_ledger;
create policy "players read own ledger"
  on public.wallet_ledger for select to authenticated using (auth.uid() = user_id);

drop policy if exists "reporters create reports as themselves" on public.player_reports;
create policy "reporters create reports as themselves"
  on public.player_reports for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists "reporters read their own reports" on public.player_reports;
create policy "reporters read their own reports"
  on public.player_reports for select to authenticated using (auth.uid() = reporter_id);

-- NOTE: this migration defines the schema and baseline read policies only.
-- A server-side function/Edge Function is still required for all privileged writes,
-- payment escrow/transfer, membership management, and moderation review.

# EURO LIFE multiplayer backend

This folder begins the server-side data layer for player profiles, jobs, chat, blocks/reports and wallet records.

## Included
- `supabase/migrations/001_eurolife_multiplayer.sql` — initial Postgres schema, indexes and row-level security (RLS) policies.
- RLS deliberately prevents direct client writes to job state, chat messages, wallet balances and ledger entries. These operations must go through trusted server-side functions.

## Not deployed yet
No Supabase project has been provisioned from this repository, and there are no live API endpoints yet. Do not add production secrets to GitHub or the Unity app.

## Setup sequence
1. Create a Supabase project and enable the desired sign-in provider(s).
2. Review the SQL migration, then apply it to that project.
3. Create server-side Edge Functions for profile setup, job creation/applications/hiring/status changes, chat send, reports and moderation.
4. Use transactions and idempotency keys for job transitions and wallet ledger transfers; reserve funds before hiring.
5. Add realtime delivery only after membership and block checks are enforced.
6. Configure Unity with the project URL and public/anon key only. Never ship the service-role key in a game build.
7. Add tests for RLS, unauthorized access, blocked users, repeated requests, wage limits and insufficient funds.
8. Implement an authenticated access-token provider and the concrete Unity gateway adapter; then build and test on a computer.

## Data model notes
- Wallet amounts are whole in-game euros, not real money.
- The current schema is a starting point; it is not a finished economy or moderation system.
- Privileged write operations must be server-only. The Unity client is not trusted to declare its own identity, job completion or payment amount.

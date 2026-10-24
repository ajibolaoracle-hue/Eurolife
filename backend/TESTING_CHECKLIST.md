# EURO LIFE backend staging checklist

Do not describe online play as live until these checks pass against a deployed staging project.

## Setup
- [ ] Create a dedicated Supabase staging project.
- [ ] Apply migrations in order: `001_eurolife_multiplayer.sql`, then `002_job_escrow_functions.sql`.
- [ ] Set Edge Function secrets in Supabase's secret manager; never commit them.
- [ ] Deploy functions listed in `supabase/config.toml`.
- [ ] Configure sign-in and create two test player accounts, Player A and Player B.
- [ ] Create each test player's profile and wallet account through a controlled test fixture.
- [ ] Confirm no production credentials or real-money payment integration are used.

## Authentication and profiles
- [ ] Missing/invalid token is rejected for every endpoint.
- [ ] A player cannot write a profile for another user ID.
- [ ] Display names are trimmed and length/character rules are enforced.
- [ ] Avatar IDs are checked against the game's allowed avatar catalogue before production.

## Jobs and wallet
- [ ] Player A can create a job only with sufficient wallet balance.
- [ ] Creating a job reduces A's balance by exactly the wage and creates one escrow ledger entry.
- [ ] Retrying the same request with the same idempotency key does not create a second job or debit.
- [ ] Player B can apply to an open job but cannot hire themselves.
- [ ] Only the employer can hire or cancel; only the assigned worker can start or submit.
- [ ] Only the employer can approve a submitted job.
- [ ] Approval transfers the wage exactly once, including under concurrent/retried requests.
- [ ] Cancellation refunds escrow exactly once.
- [ ] Concurrent applications, cancellation, hiring and approval are tested for race conditions.
- [ ] Any transition failure rolls back all related wallet, ledger and job changes.

## Chat, blocks and reports
- [ ] Non-members cannot read or send to a conversation.
- [ ] Blocked players cannot message one another, including group conversations.
- [ ] Empty, oversized and high-frequency messages are rejected.
- [ ] Reports are validated, visible only to the reporter and authorized moderators, and cannot be self-reports.
- [ ] Moderator review and retention process exists before public launch.

## Operational readiness
- [ ] CORS is restricted to the actual game/web origins where feasible.
- [ ] Rate limits are enabled for sign-in, chat, job creation and reports.
- [ ] Logs exclude bearer tokens, secrets and unnecessary message content.
- [ ] Database backup/restore and incident response are tested.
- [ ] API contracts match Unity DTOs and have automated integration tests.
- [ ] Unity compiles and an Android build is tested on a physical device.

## Current limitation
This checklist is a plan, not evidence that tests have passed. The repository's backend is source code only until a Supabase project is configured and deployment/testing is performed.

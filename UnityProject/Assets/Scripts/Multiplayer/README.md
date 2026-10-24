# EURO LIFE multiplayer foundation

This folder contains **data models and local prototype logic**, not a live multiplayer service yet.

## Included
- `PlayerChatMessage.cs`: validates required message fields and limits text to 500 characters.
- `EmploymentContract.cs`: job contract fields and lifecycle states.
- `PlayerJobBoard.cs`: local in-memory prototype for posting jobs, applying, hiring, starting work, submitting and approving completion.

## Important limitations
- Chat messages are not sent to other devices yet.
- Job listings exist only in memory and disappear when the game session ends.
- Approving a job returns the wage amount for prototype UI only; it does **not** transfer money.
- Client-side checks are not a security boundary. A modified game client could bypass them.

## Online implementation plan
1. **Identity and profiles:** authenticated player IDs, display names, avatar/profile data, block list and report flow.
2. **Persistent jobs:** server-backed job listings with owner, wage, description, status, applicant and timestamps.
3. **Atomic job state changes:** server validates who may apply, hire, start, submit, approve, cancel or dispute. Prevent duplicate completion and double payment with idempotency keys.
4. **Wallet ledger:** store immutable debit/credit entries; only the server can issue wages. Require sufficient employer funds or an escrow reservation before hiring.
5. **Chat delivery:** authenticated real-time transport, conversation membership checks, message length/rate limits, mute/block/report, moderation and retention controls.
6. **Abuse and safety:** rate limits, spam detection, audit trail, dispute flow and tools for player reports.
7. **Testing:** unit tests for permissions, invalid transitions, duplicate requests, insufficient funds, blocked users and reconnect behavior.

## Suggested server API shape
- `POST /jobs` — create a listing; authenticated employer.
- `GET /jobs?status=open` — browse open listings.
- `POST /jobs/{id}/applications` — apply as a worker.
- `POST /jobs/{id}/hire` — employer hires one applicant.
- `POST /jobs/{id}/start` — hired worker starts.
- `POST /jobs/{id}/submit` — worker submits completed work.
- `POST /jobs/{id}/approve` — employer approves; server performs a single ledger transfer.
- `POST /conversations/{id}/messages` — send a message after checking membership.
- Real-time event channel — deliver authorized chat and job-status updates.

These routes are a design proposal, not deployed endpoints. The Unity project still needs a chosen backend, authentication, server implementation, scene setup and a successful Unity build before these features can be considered playable online.

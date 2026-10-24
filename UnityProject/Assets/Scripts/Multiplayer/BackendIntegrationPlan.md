# EURO LIFE backend integration checklist

## Current state
The Unity code defines data contracts for online profiles, jobs and chat. There is **no deployed backend or live network adapter** yet. Do not present the prototype job board as persistent or secure multiplayer.

## Recommended first online milestone
Implement an authenticated API plus a real-time message channel. Keep all economy and permissions on the server. The Unity client is untrusted.

## Minimum server rules
- Resolve the acting player from a verified access token; never trust a client-supplied employer/sender ID as proof of identity.
- Validate job title/description lengths, wage bounds, business ownership, and job-state transitions.
- Reserve or escrow funds before hiring. Use a transactional ledger and idempotency keys so retries cannot pay twice.
- Only the hired worker may start/submit a job; only the employer may approve or dispute it.
- Store chat with conversation membership checks; enforce rate limits, block/mute, report, moderation and retention rules.
- Use HTTPS in production, rotate signing keys, keep secrets server-side, and avoid logging message bodies or tokens unnecessarily.
- Add server-side audit events for hiring, status changes, wallet movements, reports and moderation actions.

## API acceptance tests
1. Unauthenticated request to any private endpoint returns 401.
2. Player A cannot hire, approve, or cancel Player B's job without ownership.
3. A worker cannot start or submit a job before being hired.
4. A job cannot be approved twice; repeating the same idempotency key returns the original result without another transfer.
5. Hiring fails if the employer cannot fund the agreed wage.
6. A blocked player cannot deliver a direct message to the blocking player.
7. A non-member cannot read or send to a conversation.
8. Empty, oversized, or rate-limited chat messages are rejected.
9. A reconnecting client can recover job status and chat history from the server.
10. Every wallet transfer has matching ledger entries and a traceable contract ID.

## Ready-to-build requirements
- Select and provision a backend provider.
- Implement identity/auth, database schema and migrations, REST endpoints and real-time chat.
- Add a concrete Unity implementation of `IMultiplayerGateway` and authentication token lifecycle.
- Add Unity scenes, UI prefabs, serialization setup and tests.
- Configure backend URL in a ScriptableObject for each environment.
- Run Unity Editor compilation and Android build on a computer with the appropriate Unity modules/license.

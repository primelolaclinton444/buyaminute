# BuyAMinute API Contract (Frozen)

This document summarizes the current API contract used by the frontend and internal services.

## Error Response Shape

New/updated endpoints return JSON errors shaped as:

```json
{
  "error": {
    "message": "string",
    "code": "string | undefined",
    "details": "object | string | undefined"
  }
}
```

Legacy endpoints may return plain-text errors or alternate JSON shapes; those are called out per endpoint.

---

## Public Auth API

### POST /api/auth/signup
Request body:
```json
{ "name": "string", "email": "string", "password": "string" }
```
Success (200):
```json
{ "user": { "id": "string", "name": "string", "email": "string" } }
```
Errors: JSON error shape.

### POST /api/auth/login
Request body:
```json
{ "email": "string", "password": "string" }
```
Success (200):
```json
{ "user": { "id": "string", "name": "string", "email": "string" } }
```
Errors: JSON error shape.

### POST /api/auth/logout
Request body: none.
Success (200):
```json
{ "success": true }
```
Errors: JSON error shape.

### GET /api/auth/session
Request params: none.
Success (200):
```json
{ "user": { "id": "string", "name": "string", "email": "string" } | null }
```
Errors: JSON error shape.

---

## Public Browse + Profiles

### GET /api/browse
Request params: none.
Success (200):
```json
{
  "categories": ["string"],
  "featured": [{
    "id": "string",
    "name": "string",
    "username": "string",
    "rate": 0,
    "tagline": "string",
    "categories": ["string"],
    "status": "available | busy | offline"
  }],
  "profiles": [/* same shape as featured */]
}
```
Errors: plain-text response with HTTP status.

### GET /api/profile?username=...
Request params:
- `username` (string, optional)

Success (200):
```json
{
  "profile": {
    "id": "string",
    "name": "string",
    "username": "string",
    "rate": 0,
    "tagline": "string",
    "categories": ["string"],
    "status": "available | busy | offline",
    "bio": "string",
    "responseTime": "string",
    "languages": ["string"],
    "reviews": [{ "id": "string", "author": "string", "rating": 0, "quote": "string" }]
  }
}
```
Errors: plain-text response with HTTP status.

### GET /api/profile/public?userId=...
Request params:
- `userId` (string, required)

Success (200):
```json
{
  "ok": true,
  "userId": "string",
  "earningsVisible": true,
  "totalEarningsTokens": 0,
  "minutesSold": 0
}
```
Notes: If `earningsVisible` is false, `totalEarningsTokens` and `minutesSold` are omitted.
Errors: plain-text response with HTTP status.

---

## Public Wallet + Settings + Pings (Frontend)

### GET /api/wallet
Auth: session cookie required.
Request params: none.
Success (200):
```json
{
  "balanceTokens": 0,
  "availableUsd": 0,
  "transactions": [
    {
      "id": "string",
      "type": "deposit | withdrawal | earning",
      "amount": 0,
      "status": "pending | completed | failed",
      "createdAt": "ISO-8601"
    }
  ]
}
```
Errors: JSON error shape.

### POST /api/wallet
Auth: session cookie required.
Request body:
```json
{ "amount": 0 }
```
Success (200):
```json
{ "success": true }
```
Errors: JSON error shape.

### GET /api/wallet/ledger?limit=...&cursor=...
Auth: session cookie required.
Success (200):
```json
{
  "entries": [
    {
      "id": "string",
      "type": "credit | debit",
      "source": "call_billing | crypto_deposit | withdrawal | availability_ping",
      "amountTokens": 0,
      "callId": "string | null",
      "withdrawalRequestId": "string | null",
      "txHash": "string | null",
      "createdAt": "ISO-8601"
    }
  ],
  "nextCursor": "string | null"
}
```
Errors: JSON error shape.

### GET /api/wallet/deposit_address
Auth: session cookie required.
Success (200):
```json
{ "userId": "string", "tronAddress": "string" }
```
Errors: JSON error shape.

### POST /api/wallet/withdraw
Auth: session cookie required, or `x-internal-key` for internal callers.
Request body (session):
```json
{ "amount": 0 }
```
Request body (internal):
```json
{ "userId": "string", "amountTokens": 0, "destinationTronAddress": "string" }
```
Success (200):
```json
{ "ok": true, "withdrawalId": "string" }
```
Errors: JSON error shape.

### GET /api/settings
Request params: none.
Success (200):
```json
{ "settings": { "displayName": "string", "email": "string", "timezone": "string", "marketingOptIn": true } }
```
Errors: plain-text response with HTTP status.

### POST /api/settings
Request body:
```json
{ "displayName": "string", "email": "string", "timezone": "string", "marketingOptIn": true }
```
Success (200):
```json
{ "settings": { "displayName": "string", "email": "string", "timezone": "string", "marketingOptIn": true } }
```
Errors: plain-text response with HTTP status.

### GET /api/pings
Request params: none.
Success (200):
```json
{ "pings": [{ "id": "string", "requester": "string", "topic": "string", "status": "new | accepted | missed | completed", "createdAt": "ISO-8601" }] }
```
Errors: plain-text response with HTTP status.

### POST /api/pings
Request body:
```json
{ "topic": "string", "requestedFor": "string", "details": "string (optional)" }
```
Success (201):
```json
{ "ping": { "id": "string", "requester": "string", "topic": "string", "status": "new", "createdAt": "ISO-8601" } }
```
Errors: plain-text response with HTTP status.

### GET /api/pings/inbox
Auth: session cookie required.
Success (200):
```json
{ "pings": [{
  "id": "string",
  "callerId": "string",
  "receiverId": "string",
  "question": "available_now | available_later | when_good_time",
  "response": "available_now | available_later | not_available | null",
  "status": "sent | delivered | replied",
  "feeTokens": 0,
  "createdAt": "ISO-8601",
  "respondedAt": "ISO-8601 | null"
}] }
```
Errors: JSON error shape.

### GET /api/pings/outbox
Auth: session cookie required.
Success (200):
```json
{ "pings": [{
  "id": "string",
  "callerId": "string",
  "receiverId": "string",
  "question": "available_now | available_later | when_good_time",
  "response": "available_now | available_later | not_available | null",
  "status": "sent | delivered | replied",
  "feeTokens": 0,
  "createdAt": "ISO-8601",
  "respondedAt": "ISO-8601 | null"
}] }
```
Errors: JSON error shape.

### POST /api/pings/{id}/reply
Auth: session cookie required.
Request body:
```json
{ "response": "available_now | available_later | not_available" }
```
Success (200):
```json
{ "ping": {
  "id": "string",
  "callerId": "string",
  "receiverId": "string",
  "question": "available_now | available_later | when_good_time",
  "response": "available_now | available_later | not_available",
  "status": "replied",
  "feeTokens": 0,
  "createdAt": "ISO-8601",
  "respondedAt": "ISO-8601"
} }
```
Errors: JSON error shape.

---

## Calls (Frontend)

### POST /api/calls/request
Auth: session cookie required.
Request body:
```json
{ "username": "string", "mode": "voice | video", "minIntendedSeconds": 0 }
```
Success (200):
```json
{ "requestId": "string | null", "status": "pending | insufficient | offline", "username": "string", "mode": "voice | video", "expiresAt": "ISO-8601 | null" }
```
Errors: JSON error shape.

### GET /api/calls/active?id=...
Auth: session cookie required.
Success (200):
```json
{ "call": { "id": "string", "caller": "string", "receiver": "string", "mode": "voice | video" } }
```
Errors: JSON error shape.

### GET /api/calls/[id]/state
Auth: session cookie required.
Success (200):
```json
{ "call": { "id": "string", "caller": "string", "receiver": "string", "mode": "voice | video" } }
```
Errors: JSON error shape.

### GET /api/calls/incoming
Auth: session cookie required.
Success (200):
```json
{
  "requests": [
    {
      "id": "string",
      "caller": "string",
      "mode": "voice | video",
      "ratePerMinute": "string",
      "expiresAt": "ISO-8601",
      "status": "pending",
      "summary": "string"
    }
  ]
}
```
Errors: JSON error shape.

### POST /api/calls/respond
Auth: session cookie required.
Request body:
```json
{ "requestId": "string", "action": "accept | decline" }
```
Success (200):
```json
{ "requestId": "string", "status": "accepted | declined", "updatedAt": "ISO-8601" }
```
Errors: JSON error shape.

### POST /api/calls/[id]/accept
Auth: session cookie required.
Request body: none.
Success (200):
```json
{ "requestId": "string", "status": "accepted", "updatedAt": "ISO-8601" }
```
Errors: JSON error shape.

### POST /api/calls/[id]/decline
Auth: session cookie required.
Request body: none.
Success (200):
```json
{ "requestId": "string", "status": "declined", "updatedAt": "ISO-8601" }
```
Errors: JSON error shape.

### POST /api/calls/end
Auth: session cookie required, or `x-internal-key` for internal callers.
Request body:
```json
{ "callId": "string", "endedBy": "caller | receiver | system" }
```
Success (200):
```json
{ "ok": true }
```
Errors: JSON error shape.

### POST /api/calls/[id]/end
Auth: session cookie required.
Request body: none.
Success (200):
```json
{ "ok": true }
```
Errors: JSON error shape.

### GET /api/calls/receipt?id=...
Auth: session cookie required.
Success (200):
```json
{
  "receipt": {
    "id": "string",
    "caller": "string",
    "receiver": "string",
    "duration": "mm:ss",
    "previewApplied": "mm:ss",
    "totalCharged": "string",
    "refunded": "string"
  }
}
```
Errors: JSON error shape.

### GET /api/calls/[id]/receipt
Auth: session cookie required.
Success (200):
```json
{
  "receipt": {
    "id": "string",
    "caller": "string",
    "receiver": "string",
    "duration": "mm:ss",
    "previewApplied": "mm:ss",
    "totalCharged": "string",
    "refunded": "string"
  }
}
```
Errors: JSON error shape.

---

## Internal Secured API (x-internal-key required)

### GET /api/wallet/balance?userId=...
Success (200):
```json
{ "ok": true, "userId": "string", "balanceTokens": 0 }
```
Errors: plain-text response with HTTP status.

### GET /api/wallet/deposit-address?userId=...
Success (200):
```json
{ "ok": true, "userId": "string", "tronAddress": "string" }
```
Errors: plain-text response with HTTP status.

### POST /api/wallet/deposit-address
Request body:
```json
{ "userId": "string", "tronAddress": "string" }
```
Success (200):
```json
{ "ok": true, "userId": "string", "tronAddress": "string" }
```
Errors: plain-text response with HTTP status.

### POST /api/wallet/withdraw
Request body:
```json
{ "userId": "string", "amountTokens": 0, "destinationTronAddress": "string" }
```
Success (200):
```json
{ "ok": true, "withdrawalId": "string" }
```
Errors: plain-text response with HTTP status.

### POST /api/admin/withdrawals/process
Request body:
```json
{ "withdrawalId": "string", "txHash": "string" }
```
Success (200):
```json
{ "ok": true, "withdrawal": { "id": "string", "userId": "string", "amountTokens": 0, "destinationTronAddress": "string", "status": "pending | sent | failed", "txHash": "string | null", "createdAt": "ISO-8601", "processedAt": "ISO-8601 | null" } }
```
Errors: plain-text response with HTTP status.

### POST /api/availability/ping
Request body:
```json
{ "callerId": "string", "receiverId": "string", "question": "available_now | available_later | when_good_time" }
```
Success (200):
```json
{ "ok": true, "pingId": "string" }
```
Notes: Uses `idempotency-key` header to avoid double charging ping fees.
Errors: plain-text response with HTTP status.

### GET /api/availability/ping?receiverId=...&limit=...
Success (200):
```json
{ "ok": true, "pings": [
  {
    "id": "string",
    "callerId": "string",
    "receiverId": "string",
    "question": "available_now | available_later | when_good_time",
    "response": "available_now | available_later | not_available | null",
    "feeTokens": 0,
    "createdAt": "ISO-8601",
    "respondedAt": "ISO-8601 | null"
  }
] }
```
Errors: plain-text response with HTTP status.

### POST /api/availability/ping/respond
Request body:
```json
{ "pingId": "string", "userId": "string", "response": "available_now | available_later | not_available" }
```
Success (200):
```json
{ "ok": true, "ping": { /* AvailabilityPing */ } }
```
Errors: plain-text response with HTTP status.

### POST /api/receiver/profile/upsert
Request body:
```json
{ "userId": "string", "ratePerSecondTokens": 0, "isAvailable": true, "isVideoEnabled": true }
```
Success (200):
```json
{ "ok": true, "profile": { "userId": "string", "ratePerSecondTokens": 0, "isAvailable": true, "isVideoEnabled": true, "lastRateChangeAt": "ISO-8601 | null", "updatedAt": "ISO-8601" } }
```
Errors: plain-text response with HTTP status.

### GET /api/receiver/profile/get?userId=...
Success (200):
```json
{ "ok": true, "profile": { "userId": "string", "ratePerSecondTokens": 0, "isAvailable": true, "isVideoEnabled": true, "lastRateChangeAt": "ISO-8601 | null", "updatedAt": "ISO-8601" } }
```
Errors: plain-text response with HTTP status.

### POST /api/calls/create
Request body:
```json
{ "callerId": "string", "receiverId": "string", "minIntendedSeconds": 0 }
```
Success (200):
```json
{ "ok": true, "callId": "string" }
```
Errors: plain-text response with HTTP status.

### POST /api/calls/accept
Request body:
```json
{ "callId": "string" }
```
Success (200):
```json
{ "ok": true }
```
Errors: plain-text response with HTTP status.

### POST /api/calls/end
Request body:
```json
{ "callId": "string", "endedBy": "caller | receiver | system" }
```
Success (200):
```json
{ "ok": true }
```
Errors: plain-text response with HTTP status.

### POST /api/user/privacy/earnings
Request body:
```json
{ "userId": "string", "earningsVisible": true }
```
Success (200):
```json
{ "ok": true, "user": { "id": "string", "earningsVisible": true, "earningsVisibilityLockedUntil": "ISO-8601 | null" } }
```
Errors: plain-text response with HTTP status.

---

## UI Proxy API (Rate-Limited)

These endpoints proxy to the internal secured APIs and return the same response bodies as their upstream targets.

- POST /api/ui/availability/ping → /api/availability/ping
- GET /api/ui/availability/ping → /api/availability/ping
- POST /api/ui/availability/ping/respond → /api/availability/ping/respond
- GET /api/ui/wallet/balance → /api/wallet/balance
- POST /api/ui/wallet/deposit-address → /api/wallet/deposit-address
- GET /api/ui/wallet/deposit-address → /api/wallet/deposit-address
- POST /api/ui/wallet/withdraw → /api/wallet/withdraw
- POST /api/ui/calls/create → /api/calls/create
- POST /api/ui/calls/accept → /api/calls/accept
- POST /api/ui/calls/end → /api/calls/end
- POST /api/ui/receiver/profile/upsert → /api/receiver/profile/upsert
- GET /api/ui/receiver/profile/get → /api/receiver/profile/get

Errors: proxied from upstream; rate-limiting errors return plain-text `Too Many Requests` with HTTP 429.

---

## Webhooks + Scheduled Jobs

### POST /api/crypto/deposit-webhook
Headers: `x-deposit-secret: <secret>`
Request body:
```json
{ "userId": "string", "tronAddress": "string", "amountUsdtAtomic": 0, "txHash": "string", "confirmations": 0 }
```
Success (200):
```json
{ "ok": true }
```
Errors: plain-text response with HTTP status.

### POST /api/crypto/run-watcher
Headers: `x-cron-secret: <secret>`
Success (200):
```json
{ "ok": true, "ms": 0 }
```
Errors: JSON `{ "ok": false, "error": "string" }` with HTTP status.

### POST /api/livekit/webhook
Headers: one of `authorization`, `x-livekit-signature`, or `x-livekit-webhook-signature`.
Request body: LiveKit webhook payloads (participant connected/disconnected).
Success (200):
```json
{ "ok": true }
```
Errors: JSON `{ "ok": false, "error": "string" }` with HTTP status.

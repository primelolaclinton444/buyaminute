# buyaminute

## Environment setup

Copy the example environment file and adjust as needed:

```bash
cp .env.example .env
```

## Testing

Run the test suite:

```bash
npm test
```

## Launch Ops: Kill Switches

Set `ADMIN_API_KEY` and send it via `x-admin-key` headers.

### Freeze or unfreeze a user

```bash
curl -X POST http://localhost:3000/api/admin/users/freeze \
  -H "content-type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"userId":"USER_ID","freeze":true,"reason":"fraud review"}'
```

### End a call and settle

```bash
curl -X POST http://localhost:3000/api/admin/calls/end \
  -H "content-type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"callId":"CALL_ID","reason":"stuck session"}'
```

### Reverse a ledger entry (idempotent)

```bash
curl -X POST http://localhost:3000/api/admin/ledger/reverse \
  -H "content-type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"ledgerEntryId":"LEDGER_ID","idempotencyKey":"reverse:LEDGER_ID:1"}'
```

### Disable or enable payouts

```bash
curl -X POST http://localhost:3000/api/admin/payouts/disable \
  -H "content-type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"disabled":true}'
```

### If X happens, do Y

- Paid but call stuck: use `/api/admin/calls/end` to end and settle, then confirm the receipt shows refunded.
- Fraud or abuse: freeze the user with `/api/admin/users/freeze` to block calls and withdrawals.
- Abuse spike or treasury risk: disable payouts with `/api/admin/payouts/disable` and retry when safe.

# Verifications

## Required commands
Run migrations and tests with a configured Postgres connection string:

```bash
DATABASE_URL=... npm run prisma:migrate
DATABASE_URL=... npm test
```

Expected outcomes:
- Prisma migrations apply cleanly.
- All tests pass, including invariant checks.

## No-Drift Proof checklist
- `prisma/schema.prisma` keeps `provider = "postgresql"`.
- `tests/security.invariants.test.ts` passes with no banned-term matches.
- No local database fallback is introduced; missing `DATABASE_URL` fails fast.

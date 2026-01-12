# Security Invariants

## Password hashing
- Password hashing uses Argon2id only.
- No s‑crypt algorithm is allowed.
- Canonical implementation lives in `lib/auth.ts` (`hashPassword` and `verifyPassword`).

## Rotation guidance
- Increase Argon2id cost parameters as needed and rehash on successful login when the stored parameters are weaker than current defaults.
- Keep the hash format stable and add a migration path if parameters or encoding ever change.

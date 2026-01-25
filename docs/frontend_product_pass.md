# Frontend Product Pass

## Checklist
- [x] Call request page states (pending/timeout/insufficient/offline) with voice/video selection.
- [x] Incoming request queue with countdown, accept/decline, and status updates.
- [x] In-call shell with connection states, timer, and accessible controls.
- [x] Receipt view for completed calls.
- [x] Accessibility pass (focus states, keyboard navigation, aria labels, reduced motion).
- [x] Smoke tests for landing/auth/core/call routes and auth guard redirects.
- [x] Build passes (`npm run build`).

## PR status
- **PR1:** Completed (Landing + marketing pages)
- **PR2:** Completed (Wallet + receiver onboarding)
- **PR3:** Completed (Availability + previews)
- **PR4:** Completed (Call flows + a11y + smoke tests)

## Backend-owned remaining
- LiveKit session orchestration + token issuance
- Billing settlement + receipt persistence
- Notifications + availability updates
- Production analytics + audit logging

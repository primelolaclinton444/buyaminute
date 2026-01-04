// ================================
// BuyAMinute — Phase 0 Constants
// ================================

// Money system
export const TOKEN_UNIT_USD = 0.01; // 1 token = $0.01
export const TOKENS_PER_USD = 100;  // derived, for clarity

// Call preview rules
export const PREVIEW_SECONDS = 30;
export const PREVIEW_LOCK_HOURS = 24;

// Call eligibility
export const MIN_CALL_BALANCE_SECONDS = 60; // caller must afford at least 1 minute

// Time
export const SECONDS_IN_MINUTE = 60;

// Crypto (locked for MVP)
export const SUPPORTED_CHAIN = "TRON";
export const SUPPORTED_ASSET = "USDT-TRC20";

// System invariants (do not change in MVP)
export const LEDGER_APPEND_ONLY = true;
export const BILLING_PER_SECOND = true;
export const NO_SESSION_STITCHING = true;


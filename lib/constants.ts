// ================================
// BuyAMinute — Phase 0 Constants
// ================================

// Money system
export const TOKEN_UNIT_USD = 0.01; // 1 token = $0.01
export const TOKENS_PER_USD = 100;  // derived, for clarity
export const USDT_DECIMALS = 6;
export const USDT_ATOMIC_MULTIPLIER = 10 ** USDT_DECIMALS;

// Call preview rules
export const PREVIEW_SECONDS = 30;
export const PREVIEW_LOCK_HOURS = 24;

/**
 * How long the caller's ring request stays open before auto-expiring.
 *
 * Originally 20 seconds — far too short. On mobile, a push notification
 * can take 5-10 seconds to arrive, and then the receiver still needs to
 * unlock their phone and tap Accept. 90 seconds is a reasonable window
 * that matches industry norms (WhatsApp, FaceTime use 90-120s).
 *
 * Raise RING_TIMEOUT_SECONDS in tandem — it must always be > this value
 * divided by 1000 so that a call that expires here also gets a
 * connect_timeout refund path if the room never connects.
 */
export const CALL_REQUEST_WINDOW_MS = 90_000; // 90 seconds

const ringTimeoutRaw = Number(process.env.RING_TIMEOUT_SECONDS ?? "120");
export const RING_TIMEOUT_SECONDS =
  Number.isFinite(ringTimeoutRaw) && ringTimeoutRaw > 0 ? ringTimeoutRaw : 120;

// Call eligibility
export const MIN_CALL_BALANCE_SECONDS = 60; // caller must afford at least 1 minute
export const RATE_CHANGE_COOLDOWN_HOURS = 24;
export const EARNINGS_VISIBILITY_COOLDOWN_HOURS = 24;

// Time
export const SECONDS_IN_MINUTE = 60;

// Pricing
export const MIN_RATE_PER_SECOND_TOKENS = 1;
export const DEFAULT_RATE_PER_SECOND_TOKENS = 1;
export const AVAILABILITY_PING_FEE_TOKENS = 25;
export const MIN_WITHDRAWAL_TOKENS = 100;

// Crypto
export const SUPPORTED_CHAIN = "TRON";
export const SUPPORTED_ASSET = "USDT-TRC20";

// System invariants
export const LEDGER_APPEND_ONLY = true;
export const BILLING_PER_SECOND = true;
export const NO_SESSION_STITCHING = true;

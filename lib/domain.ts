export const LedgerType = {
  credit: "credit",
  debit: "debit",
} as const;

export type LedgerType = (typeof LedgerType)[keyof typeof LedgerType];

export const LedgerSource = {
  call_billing: "call_billing",
  crypto_deposit: "crypto_deposit",
  withdrawal: "withdrawal",
  availability_ping: "availability_ping",
  admin_mint: "admin_mint",
} as const;

export type LedgerSource = (typeof LedgerSource)[keyof typeof LedgerSource];

export const CallStatus = {
  created: "created",
  ringing: "ringing",
  connected: "connected",
  ended: "ended",
} as const;

export type CallStatus = (typeof CallStatus)[keyof typeof CallStatus];

export const WithdrawalStatus = {
  pending: "pending",
  sent: "sent",
  failed: "failed",
} as const;

export type WithdrawalStatus = (typeof WithdrawalStatus)[keyof typeof WithdrawalStatus];

export const AvailabilityPingStatus = {
  sent: "sent",
  delivered: "delivered",
  replied: "replied",
} as const;

export type AvailabilityPingStatus =
  (typeof AvailabilityPingStatus)[keyof typeof AvailabilityPingStatus];

export const AvailabilityQuestion = {
  available_now: "available_now",
  available_later: "available_later",
  when_good_time: "when_good_time",
} as const;

export type AvailabilityQuestion =
  (typeof AvailabilityQuestion)[keyof typeof AvailabilityQuestion];

export const AvailabilityResponse = {
  available_now: "available_now",
  available_later: "available_later",
  not_available: "not_available",
} as const;

export type AvailabilityResponse =
  (typeof AvailabilityResponse)[keyof typeof AvailabilityResponse];

// app/landing-data.ts
// Single source of truth for all landing page copy, data, and types.
// No "use client" — this is a plain data module, safe to import anywhere.

import type { ReactNode } from "react";

export interface StatData {
  value: string;
  label: string;
  sub: string;
}

export interface BeatData {
  index: number;
  label: string;
  text?: string;
  quote?: string;
  quoteHighlight?: string; // the <em> portion inside the quote
  meta?: Array<{ value: string; label: string }>;
  tag?: string;
  active?: boolean;
}

export interface PanelData {
  eyebrow: string;
  headline: ReactNode;
  body: ReactNode;
  stats: [StatData, StatData];
  ctaText: string;
  ctaKicker: string;
  route: string;
}

// ─── BUYER PANEL ─────────────────────────────────────────────────────────────
export const BUYER: Omit<PanelData, "headline" | "body"> & {
  headlinePrefix: string;
  headlineEm: string;
  bodyStrong: string;
  bodyMechanic: string;
} = {
  eyebrow: "You want to reach someone",
  headlinePrefix: "Stop hoping for a reply or attention when you can",
  headlineEm: "buy it.",
  bodyStrong: "Your crush. Your mentor.",
  bodyMechanic: "They'll answer when there's money on the line.",
  stats: [
    { value: "2 min", label: "Avg pickup time", sub: "vs. 4 days on cold DM" },
    { value: "95%",   label: "Accept rate",      sub: "paid invites sent" },
  ],
  ctaText:   "Reach People Through BuyAMinute",
  ctaKicker: "See the buyer/caller experience. Send paid call offers. Sign up or log in.",
  route: "/buyer",
};

// ─── SELLER PANEL ─────────────────────────────────────────────────────────────
export const SELLER: typeof BUYER = {
  eyebrow: "Someone wants to reach you",
  headlinePrefix:
    "Get paid by fans, friends, or anyone who wants a voice or video call",
  headlineEm: "with you.",
  bodyStrong:   "You set the call rates.",
  bodyMechanic: "Earn by the minute.",
  stats: [
    { value: "$94k",  label: "Earned this week", sub: "all categories"  },
    { value: "2,847", label: "Calls today",       sub: "across the line" },
  ],
  ctaText:   "Explore the Earning Side of BuyAMinute",
  ctaKicker: "Calculate your potential income. Set your rates. Start earning.",
  route: "/seller",
};

// ─── SELLER PULL QUOTE (desktop only) ─────────────────────────────────────────
// Per design spec: on seller side the second body line comes AFTER "You set the
// call rates. Earn by the minute." and the pull uses a different ordering.
export const SELLER_PULL = "No ceiling. No floor. Your phone, your rules.";

// ─── MARKET PANEL ─────────────────────────────────────────────────────────────
export const MARKET = {
  eyebrow: "The market",
  headlinePrefix: "BuyAMinute turns reachability",
  headlineEm: "into a market.",
  body: [
    "One side pays to get through. The other gets paid to answer.",
    "Voice and video calls become metered interactions priced by the minute.",
    "Create a call offer and share it anywhere — DMs, email, comment sections, anywhere attention exists.",
  ],
  ctaText:   "See our main landing page — both sides",
  ctaKicker: "Voice & video · paid by the second",
  route: "/main",
};

// ─── NARRATIVE BEATS ─────────────────────────────────────────────────────────
export const BEATS: BeatData[] = [
  {
    index: 1,
    label: "The Setup",
    text: "Mark has been following Kayla on Instagram for 8 months. She has 45k followers. She has never seen his name. He is willing to spend $60 to buy her attention, so he makes her an offer.",
    active: false,
  },
  {
    index: 2,
    label: "The Offer",
    text: "He drops a BuyAMinute link in her DMs.",
    quote: '"Hi Kayla, on BuyAMinute we could talk for 10 minutes at $6 a minute. Is that good?"',
    meta: [
      { value: "$6/min", label: "Rate offered" },
      { value: "$60",    label: "Escrowed"     },
    ],
    active: false,
  },
  {
    index: 3,
    label: "Kayla's Reaction",
    quote: '"Wow — so I\'d be making',
    quoteHighlight: "$60 in 10 minutes",
    tag: "Accepts the call · 2 min later",
    active: true,
  },
  {
    index: 4,
    label: "The Outcome",
    text: "They talk. The meter runs.",
    meta: [
      { value: "8m 42s", label: "Call duration"  },
      { value: "$52.20", label: "Kayla earned"   },
      { value: "$7.80",  label: "Mark refunded"  },
    ],
    active: false,
  },
];

// ─── QUEUE DATA (desktop market panel live feed) ──────────────────────────────
export interface QueueItem {
  caller: string;
  target: string;
  amount: string;
  badge: "hot" | "up" | "new";
}

export const QUEUE_SEED: QueueItem[] = [
  { caller: "@founder_k",  target: "→ @naval",        amount: "$150/min", badge: "hot" },
  { caller: "@sarah.m",    target: "→ @dr_park",       amount: "$45/min",  badge: "up"  },
  { caller: "@vc_partner", target: "→ @lila.mood",     amount: "$40/min",  badge: "up"  },
  { caller: "@user_jay",   target: "→ @coach_jay",     amount: "$30/min",  badge: "new" },
  { caller: "@maya_fan",   target: "→ @maya_creator",  amount: "$12/min",  badge: "new" },
  { caller: "@curious_99", target: "→ @dr_park",       amount: "$8/min",   badge: "new" },
  { caller: "@biz_dev22",  target: "→ @founder_k",     amount: "$60/min",  badge: "up"  },
  { caller: "@writer_lee", target: "→ @coach_jay",     amount: "$25/min",  badge: "new" },
];

// ─── NAV ──────────────────────────────────────────────────────────────────────
export const NAV = {
  logo: "BuyAMinute",
  loginLabel: "Log in",
  signupLabel: "Start earning",
};

"use client";

/**
 * BuyAMinute — Buyer page (Panel 00 → Q1 → Q2 → Q3 → Reckoning).
 *
 * Self-contained. Matches the app's editorial system:
 *   - Playfair Display (loaded via next/font) as the serif voice
 *   - color tokens: #f4ead2 cream · #72d7ff cyan · #00ff88 green · #e9b949 gold · #ff7ab8 pink
 *   - single inline <style> block, "bam-" class prefix, no external deps
 *
 * Routing:
 *   goBrowse       → /browse     (call anyone / live now — public)
 *   goSignup       → /signup     (logged-out: send first offer / post an offer)
 *   gated("/...")  → real route if logged in, else /signup (soft gate)
 *
 * The app shell renders the global nav; this page does not render its own.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Playfair_Display } from "next/font/google";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair-bam",
});

/* ── Deck data ─────────────────────────────────────────── */
type OfferCard = {
  kind: "offer";
  pill: string;
  time: string;
  av: string;
  tov: string;
  amt: string;
  rate: string;
  cap: string;
  msg: string;
  sv: string;
  sc: "green" | "gold" | "rose";
  sn: string;
};
type CaseCard = {
  kind: "case";
  pill: string;
  time: string;
  av: string;
  tov: string;
  hook: string;
  body: string;
  kl: string;
  kr: string;
  tamt: string;
  tmid: string;
  tout: string;
  tc: "green" | "gold" | "rose";
};
type Card = OfferCard | CaseCard;

const COLOR: Record<string, string> = {
  green: "#00ff88",
  gold: "#e9b949",
  rose: "#ff7ab8",
};

const CARDS: Card[] = [
  {
    kind: "offer",
    pill: "OUTGOING OFFER",
    time: "2m 46s ago",
    av: "A",
    tov: "@anyone \u2014 even if they've never heard of you",
    amt: "$120",
    rate: "@ $8 / min",
    cap: "cap 15 min",
    msg: "\u201cHey \u2014 I\u2019m building in your space and want 10 min of your honest take on a wedge problem. Offer attached, no slides.\u201d",
    sv: "Picked up in 47s",
    sc: "green",
    sn: "Charged only for the time you\u2019re connected. Hang up early \u2192 you only pay the seconds you used.",
  },
  {
    kind: "offer",
    pill: "OUTGOING OFFER",
    time: "12h ago",
    av: "\u2665",
    tov: "@crush \u2014 the one you couldn\u2019t stop typing to",
    amt: "$80",
    rate: "@ $5 / min",
    cap: "cap 16 min",
    msg: "\u201cOne call. One question I\u2019ve been sitting on for six months. Ten minutes of your Tuesday.\u201d",
    sv: "Accepted \u00b7 call scheduled",
    sc: "green",
    sn: "Auto-syncs a slot on both your calendars. Preview 30s free. Bill starts on second 31.",
  },
  {
    kind: "offer",
    pill: "OUTGOING OFFER",
    time: "3d ago",
    av: "M",
    tov: "@mentor \u2014 the one whose calendar is a wall",
    amt: "$500",
    rate: "@ $40 / min",
    cap: "cap 12 min",
    msg: "\u201cThe pivot decision you asked me about last quarter. Ten minutes, my numbers, your read.\u201d",
    sv: "Read \u00b7 reply pending",
    sc: "gold",
    sn: "Money changes what silence costs them. Response arrives on the schedule you paid for.",
  },
  {
    kind: "case",
    pill: "CASE 001 \u00b7 REPLIED",
    time: "4mo ago",
    av: "M",
    tov: "MARCUS \u00b7 mentor",
    hook: "Marcus never replied.",
    body: "Three DMs over four months. He read all of them. He answered none of them. Then someone offered him $500 for a twelve-minute call. He replied in nine minutes.",
    kl: "That someone wasn\u2019t smarter than you. They just ",
    kr: "stopped asking for free.",
    tamt: "$500",
    tmid: "@ $42/min \u00b7 cap 12 min",
    tout: "Replied in 9m",
    tc: "green",
  },
  {
    kind: "case",
    pill: "CASE 002 \u00b7 IN FLIGHT",
    time: "8mo ago",
    av: "A",
    tov: "AMARA \u00b7 crush",
    hook: "You\u2019ve been thinking about Amara for eight months.",
    body: "Two messages after the trip. Neither got a reply. Somewhere in her phone, right now, is a screen where a $200 offer would open before anything else. Twelve minutes. Video. Ask the question you actually wanted to ask.",
    kl: "She wasn\u2019t ignoring you. She was ",
    kr: "waiting for the ask to be worth the answer.",
    tamt: "$200",
    tmid: "@ $17/min \u00b7 cap 12 min",
    tout: "Video \u00b7 ready to send",
    tc: "rose",
  },
  {
    kind: "case",
    pill: "CASE 003 \u00b7 REPLIED",
    time: "5d ago",
    av: "I",
    tov: "DR. IWU \u00b7 specialist",
    hook: "Dr. Iwu answers 4% of her inbound.",
    body: "She\u2019s a pediatric oncologist. Your niece\u2019s scan came back last Tuesday. You\u2019ve sent two emails and one LinkedIn message. A $1,200 offer for a fifteen-minute video call reaches her inbox differently. She replied to the last one in twenty-two minutes.",
    kl: "The wall wasn\u2019t her. It was ",
    kr: "the price of asking.",
    tamt: "$1,200",
    tmid: "@ $80/min \u00b7 cap 15 min",
    tout: "Replied in 22m",
    tc: "green",
  },
  {
    kind: "case",
    pill: "CASE 004 \u00b7 OPENED",
    time: "7mo ago",
    av: "N",
    tov: "NAVAL \u00b7 founder",
    hook: "Naval doesn\u2019t know you exist.",
    body: "He\u2019s got 400,000 followers and an inbox he stopped reading in 2019. Your @-reply from March is somewhere in a folder he\u2019ll never open. But a $500 offer for eight minutes lands in a queue he actually checks. Not because he\u2019s mercenary. Because you finally made an ask worth the eight minutes.",
    kl: "He was reachable the whole time. ",
    kr: "You were unreachable.",
    tamt: "$500",
    tmid: "@ $62/min \u00b7 cap 8 min",
    tout: "Opened \u00b7 reading now",
    tc: "gold",
  },
  {
    kind: "case",
    pill: "CASE 005 \u00b7 READY",
    time: "6yr silence",
    av: "F",
    tov: "FATHER \u00b7 estranged",
    hook: "Your father hasn\u2019t called in six years.",
    body: "You\u2019ve stopped trying. Not because you don\u2019t want to. Because the silence hurts more than the distance did. Somewhere in a country you\u2019ve never visited, a $50 offer for a ten-minute video call would land on his screen. Just enough to matter. Not so much it feels like a stunt.",
    kl: "Some silences are habit. ",
    kr: "Money is what interrupts habits.",
    tamt: "$50",
    tmid: "@ $5/min \u00b7 cap 10 min",
    tout: "Video \u00b7 ready to send",
    tc: "rose",
  },
  {
    kind: "case",
    pill: "CASE 006 \u00b7 FOUND",
    time: "7 weeks ago",
    av: "?",
    tov: "THE STRANGER \u00b7 unknown",
    hook: "You don\u2019t know her name.",
    body: "You saw a two-minute clip of her explaining something on a stage, and it lodged in your head. Seven weeks later, you\u2019re still thinking about the one question you\u2019d ask her if you could. A $300 offer for six minutes finds her. Six minutes is nothing. Six minutes is the whole thing.",
    kl: "You didn\u2019t need access. ",
    kr: "You needed an ask worth answering.",
    tamt: "$300",
    tmid: "@ $50/min \u00b7 cap 6 min",
    tout: "Located \u00b7 reachable now",
    tc: "gold",
  },
];

const CHANNELS = [
  {
    label: "DM",
    path: "M1.5 2.5h9v6h-5l-2.5 2v-2h-1.5z",
  },
  {
    label: "Comment",
    path: "M2 2h8v5h-4l-2 2v-2h-2z",
  },
  {
    label: "Email",
    email: true,
  },
  {
    label: "Bio link",
    link: true,
  },
] as const;

/* ── Console shortcuts (logged-in launcher) ──────────────
 * NOTE: confirm/adjust these routes to match your app. Only
 * /browse and /main are known-good from the current buyer page;
 * the rest are sensible placeholders — swap to your real paths.
 */
type Shortcut = { label: string; hint: string; route: string; icon: string };
const SHORTCUTS: Shortcut[] = [
  { label: "New offer", hint: "Draft a paid call offer", route: "/offer/new", icon: "+" },
  { label: "My offers", hint: "Sent, opened, replied", route: "/offers", icon: "\u25C8" },
  { label: "Browse live", hint: "People accepting calls now", route: "/browse", icon: "\u25C9" },
  { label: "Wallet", hint: "Balance, deposits, payouts", route: "/wallet", icon: "\u25CE" },
  { label: "Inbox", hint: "Incoming offers and replies", route: "/inbox", icon: "\u25A3" },
];

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return "00:0" + m + ":" + String(r).padStart(2, "0");
}
function fmtMoney(c: number) {
  return "$" + (c / 100).toFixed(2);
}

export default function BuyerPage() {
  const router = useRouter();
  const auth = useAuth() as Record<string, unknown>;
  /* Robust logged-in detection: your AuthProvider only surfaced `expired`
     in the original file, so we defensively check the common session field
     names. If your provider uses a different one, add it to this list. */
  const loggedIn = Boolean(
    auth.user ??
      auth.currentUser ??
      auth.session ??
      auth.isAuthenticated ??
      auth.authenticated ??
      auth.isLoggedIn ??
      auth.loggedIn ??
      auth.profile ??
      auth.account,
  );

  const goBrowse = () => router.push("/browse");
  const goSignup = () => router.push("/signup");

  /* Logged-out clicks on gated actions route to signup; logged-in go straight. */
  const gated = useCallback(
    (route: string) => {
      if (loggedIn) router.push(route);
      else router.push("/signup");
    },
    [loggedIn, router],
  );

  /* ── Console (command palette) — logged-in only ── */
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SHORTCUTS;
    return SHORTCUTS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) || s.hint.toLowerCase().includes(q),
    );
  }, [query]);
  useEffect(() => {
    setActive(0);
  }, [query]);

  const openConsole = () => {
    setQuery("");
    setActive(0);
    setConsoleOpen(true);
  };
  const runShortcut = (s: Shortcut) => {
    setConsoleOpen(false);
    router.push(s.route);
  };
  useEffect(() => {
    if (!consoleOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConsoleOpen(false);
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter" && filtered[active]) {
        e.preventDefault();
        runShortcut(filtered[active]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consoleOpen, filtered, active]);

  /* ── Deck state ── */
  const [idx, setIdx] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((dir: number) => {
    setInteracted(true);
    setIdx((i) => (i + dir + CARDS.length) % CARDS.length);
  }, []);
  const setCard = useCallback((i: number) => {
    setInteracted(true);
    setIdx(i);
  }, []);

  useEffect(() => {
    if (interacted) return;
    const id = window.setInterval(
      () => setIdx((i) => (i + 1) % CARDS.length),
      5500,
    );
    return () => window.clearInterval(id);
  }, [interacted]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  /* ── Live tickers (Q1 receipt + Q2 preview→billing) ── */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 900);
    return () => window.clearInterval(id);
  }, []);

  const q1Sec = 8 * 60 + 44 + (tick % 60);
  const q1Cent = 4367 + (tick % 60) * 8;
  const q1Billed = fmtTime(q1Sec);
  const q1Amount = fmtMoney(q1Cent);
  const q1Saved = fmtMoney(30000 - q1Cent);

  const q2pv = 30 - (tick % 44);
  const q2Preview = q2pv > 0;
  const q2Over = q2pv > 0 ? 0 : -q2pv;
  const [waveHeights, setWaveHeights] = useState<number[]>(
    Array.from({ length: 16 }, () => 55),
  );
  useEffect(() => {
    setWaveHeights(
      Array.from({ length: 16 }, () => 30 + Math.floor(Math.random() * 65)),
    );
  }, [tick]);

  const relClass = (i: number) => {
    const rel = (i - idx + CARDS.length) % CARDS.length;
    return rel === 0 ? "on" : rel === 1 ? "b1" : rel === 2 ? "b2" : "";
  };

  return (
    <div className={`bam-root ${playfair.variable}`}>
      <style>{`
        .bam-root{background:#050403;color:#f4ead2;font-family:var(--font-playfair-bam),Georgia,serif;position:relative}
        .bam-root *{box-sizing:border-box}
        @keyframes bam-pulse{0%,100%{opacity:.45;transform:scale(.9)}50%{opacity:1;transform:scale(1.35)}}
        @keyframes bam-cardin{from{opacity:0;transform:translateX(26px) scale(.965)}to{opacity:1;transform:translateX(0) scale(1)}}
        .bam-dot{width:6px;height:6px;border-radius:50%;display:inline-block;animation:bam-pulse 1.4s ease-in-out infinite;flex-shrink:0}
        .bam-glow{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none;z-index:0}
        .bam-mono{font-family:ui-monospace,'SF Mono','JetBrains Mono',monospace;font-variant-numeric:tabular-nums}

        /* nav */
        .bam-nav{position:sticky;top:0;z-index:20;display:flex;justify-content:space-between;align-items:center;padding:16px 28px;border-bottom:1px solid rgba(244,234,210,.07);background:rgba(5,4,3,.82);backdrop-filter:blur(18px)}
        .bam-logo{font-style:italic;font-size:19px;letter-spacing:-.03em;color:#f4ead2}
        .bam-navlinks{display:flex;gap:20px;align-items:center;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(244,234,210,.5)}
        .bam-navlinks button{color:inherit;background:none;border:0;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:.2em;text-transform:uppercase;padding:0}
        .bam-navlinks button.a{color:#e9b949}

        /* ── PANEL 00 ── */
        .bam-p0{position:relative;overflow:hidden}
        .bam-p0-num{position:absolute;font-style:italic;font-weight:500;color:#ff7ab8;opacity:.06;line-height:.85;letter-spacing:-.05em;pointer-events:none;user-select:none;z-index:0}
        .bam-p0-body{position:relative;z-index:1;padding:22px 28px 52px}
        .bam-p0-mark{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        .bam-p0-eye{display:inline-flex;align-items:center;gap:10px;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.28em;text-transform:uppercase;font-weight:500;color:#ff7ab8}
        .bam-p0-chap{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.28em;color:rgba(244,234,210,.35)}
        .bam-p0-chap b{color:rgba(244,234,210,.75);font-weight:400}

        .bam-hero{font-weight:400;font-size:clamp(42px,8.5vw,58px);line-height:1.04;letter-spacing:-.03em;margin:0;color:#f4ead2;font-style:italic}
        .bam-hero .anchor{font-style:normal;font-weight:600;font-variant:small-caps;text-transform:lowercase;letter-spacing:.01em;color:#f4ead2}
        .bam-hero .peak{font-style:italic;font-weight:500;color:#ff7ab8}
        .bam-hero .stamp{font-style:normal;font-weight:600;color:#ff7ab8;text-transform:uppercase;letter-spacing:-.005em}
        .bam-hero .pd{font-style:normal;color:#ff7ab8}
        .bam-hero .lead{font-style:italic;font-weight:400;color:rgba(244,234,210,.92)}

        .bam-sub{font-style:italic;font-size:15px;line-height:1.7;color:rgba(244,234,210,.62);margin:22px 0 0;max-width:520px}
        .bam-sub.t{margin-top:13px}
        .bam-sub em{color:rgba(255,122,184,.9);font-weight:500;font-style:italic}
        .bam-sub b{font-weight:600;font-style:italic;color:#f4ead2}

        .bam-herocta{margin-top:28px}
        .bam-hcta{width:100%;padding:18px 22px;border-radius:14px;text-align:left;cursor:pointer;font-family:inherit;border:1px solid rgba(255,122,184,.55);background:linear-gradient(180deg,rgba(255,122,184,.15),rgba(255,122,184,.03));color:#ff7ab8;box-shadow:0 10px 32px rgba(255,122,184,.08);transition:transform .2s,border-color .2s,background .2s;display:block}
        .bam-hcta:hover{transform:translateY(-2px);border-color:rgba(255,122,184,.75);background:linear-gradient(180deg,rgba(255,122,184,.22),rgba(255,122,184,.06))}
        .bam-hcta-k{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,122,184,.8);display:block;margin-bottom:8px}
        .bam-hcta-l{font-style:italic;font-size:clamp(21px,2.6vw,25px);letter-spacing:-.02em;display:flex;justify-content:space-between;align-items:baseline}
        .bam-hcta-a{font-family:ui-monospace,monospace;font-style:normal}
        .bam-hcta-console .bam-hcta-a{font-size:11px;letter-spacing:.1em;border:1px solid rgba(255,122,184,.4);border-radius:6px;padding:3px 7px}

        /* command palette */
        @keyframes bam-ovin{from{opacity:0}to{opacity:1}}
        @keyframes bam-palin{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        .bam-overlay{position:fixed;inset:0;z-index:9998;background:rgba(2,2,2,.72);backdrop-filter:blur(12px);display:flex;align-items:flex-start;justify-content:center;padding:12vh 20px 20px;animation:bam-ovin .18s ease-out;overflow-y:auto}
        .bam-pal{width:100%;max-width:520px;background:linear-gradient(180deg,#12080e,#08050a);border:1px solid rgba(255,122,184,.28);border-radius:18px;box-shadow:0 40px 100px rgba(0,0,0,.7);animation:bam-palin .24s cubic-bezier(.2,.8,.2,1);overflow:hidden}
        .bam-pal-search{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid rgba(255,122,184,.15)}
        .bam-pal-search .ic{color:rgba(255,122,184,.7);font-family:ui-monospace,monospace;font-size:14px}
        .bam-pal-input{flex:1;background:none;border:0;outline:0;color:#f4ead2;font-family:var(--font-playfair-bam),Georgia,serif;font-style:italic;font-size:18px;letter-spacing:-.01em}
        .bam-pal-input::placeholder{color:rgba(244,234,210,.35)}
        .bam-pal-esc{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:rgba(244,234,210,.4);border:1px solid rgba(244,234,210,.15);border-radius:5px;padding:3px 7px;text-transform:uppercase}
        .bam-pal-list{padding:8px;max-height:56vh;overflow-y:auto}
        .bam-pal-item{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:12px;cursor:pointer;border:1px solid transparent;background:none;width:100%;text-align:left;font-family:inherit;transition:background .12s,border-color .12s}
        .bam-pal-item:hover,.bam-pal-item.on{background:rgba(255,122,184,.08);border-color:rgba(255,122,184,.25)}
        .bam-pal-ic{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;font-family:ui-monospace,monospace;font-size:15px;color:#ff7ab8;background:rgba(255,122,184,.1);border:1px solid rgba(255,122,184,.28);flex-shrink:0}
        .bam-pal-lab{font-style:italic;font-size:17px;color:#f4ead2;letter-spacing:-.01em;line-height:1.2}
        .bam-pal-hint{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.08em;color:rgba(244,234,210,.42);text-transform:uppercase;margin-top:2px}
        .bam-pal-enter{margin-left:auto;font-family:ui-monospace,monospace;font-size:10px;color:rgba(255,122,184,.6);opacity:0;transition:opacity .12s}
        .bam-pal-item.on .bam-pal-enter{opacity:1}
        .bam-pal-empty{padding:28px 18px;text-align:center;font-style:italic;font-size:14px;color:rgba(244,234,210,.4)}
        .bam-pal-foot{padding:11px 16px;border-top:1px solid rgba(255,122,184,.12);display:flex;justify-content:space-between;font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.14em;color:rgba(244,234,210,.4);text-transform:uppercase}

        .bam-scrollcue{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:22px;font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,122,184,.55)}
        .bam-scrollcue .ar{animation:bam-pulse 1.6s ease-in-out infinite}

        .bam-p0-grid{display:grid;grid-template-columns:1fr;gap:34px}

        .bam-stackwrap{position:relative}
        .bam-sh{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px;font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.24em;text-transform:uppercase}
        .bam-sh .l{color:rgba(255,122,184,.75);display:inline-flex;align-items:center;gap:8px}
        .bam-sh .r{color:rgba(244,234,210,.5)}
        .bam-stack{position:relative;min-height:560px}
        .bam-card{position:absolute;inset:0;opacity:0;pointer-events:none;transition:opacity .25s}
        .bam-card.on{opacity:1;pointer-events:auto;animation:bam-cardin .45s cubic-bezier(.2,.9,.35,1);z-index:3}
        .bam-card.b1{opacity:.32;transform:translate(10px,12px) scale(.965);filter:blur(1px);z-index:2}
        .bam-card.b2{opacity:.15;transform:translate(20px,24px) scale(.93);filter:blur(2px);z-index:1}

        .bam-cb{border-radius:18px;border:1px solid;padding:22px;overflow:hidden;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.03)}
        .bam-card.offer .bam-cb{border-color:rgba(114,215,255,.28);background:linear-gradient(180deg,rgba(114,215,255,.05),rgba(255,255,255,.004)),#06120f}
        .bam-card.casey .bam-cb{border-color:rgba(255,122,184,.28);background:linear-gradient(180deg,rgba(255,122,184,.06),rgba(255,255,255,.004)),#140a10}
        .bam-chead{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
        .bam-pill{display:inline-flex;align-items:center;gap:6px;font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;padding:5px 10px;border-radius:999px;font-weight:500}
        .bam-card.offer .bam-pill{color:#72d7ff;background:rgba(114,215,255,.1);border:1px solid rgba(114,215,255,.35)}
        .bam-card.casey .bam-pill{color:#ff7ab8;background:rgba(255,122,184,.1);border:1px solid rgba(255,122,184,.4)}
        .bam-ctime{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:rgba(244,234,210,.42);text-transform:uppercase}
        .bam-to{display:flex;gap:12px;align-items:center;margin-bottom:18px}
        .bam-av{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-style:italic;font-size:20px;flex-shrink:0}
        .bam-card.offer .bam-av{background:rgba(114,215,255,.1);border:1px solid rgba(114,215,255,.5);color:#72d7ff}
        .bam-card.casey .bam-av{background:rgba(255,122,184,.1);border:1px solid rgba(255,122,184,.5);color:#ff7ab8}
        .bam-tolbl{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.2em;color:rgba(244,234,210,.5);text-transform:uppercase;margin-bottom:3px}
        .bam-toval{font-size:17px;color:#f4ead2;letter-spacing:-.01em;line-height:1.25}

        .bam-oin{border-radius:12px;border:1px solid rgba(114,215,255,.15);padding:18px;background:rgba(0,0,0,.3);margin-bottom:12px}
        .bam-olbl{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.24em;color:rgba(114,215,255,.75);text-transform:uppercase;margin-bottom:10px}
        .bam-orow{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px}
        .bam-oamt{font-size:clamp(48px,6vw,64px);line-height:.9;color:#72d7ff;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
        .bam-oterms{text-align:right}
        .bam-otl{font-family:ui-monospace,monospace;font-size:8px;letter-spacing:.2em;color:rgba(244,234,210,.4);text-transform:uppercase;margin-bottom:5px}
        .bam-term{font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.06em;color:#72d7ff;padding:4px 10px;background:rgba(114,215,255,.1);border:1px solid rgba(114,215,255,.22);border-radius:6px;margin-bottom:5px;display:block;white-space:nowrap}
        .bam-term.cap{color:rgba(244,234,210,.72);background:rgba(244,234,210,.05);border-color:rgba(244,234,210,.1)}
        .bam-omsg{border:1px solid rgba(244,234,210,.08);border-radius:8px;padding:10px 12px;font-style:italic;font-size:13px;color:rgba(244,234,210,.8);line-height:1.5;background:rgba(0,0,0,.4)}

        .bam-deliv{border:1px dashed rgba(114,215,255,.28);border-radius:12px;padding:13px 15px;background:rgba(114,215,255,.03);margin-bottom:12px}
        .bam-deliv-top{display:flex;align-items:center;gap:8px;margin-bottom:11px}
        .bam-deliv-lbl{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.22em;color:rgba(114,215,255,.8);text-transform:uppercase}
        .bam-deliv-line{flex:1;height:1px;background:linear-gradient(90deg,rgba(114,215,255,.25),transparent)}
        .bam-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
        .bam-chip{display:inline-flex;align-items:center;gap:5px;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.05em;color:rgba(244,234,210,.82);background:rgba(114,215,255,.08);border:1px solid rgba(114,215,255,.22);border-radius:7px;padding:5px 9px}
        .bam-chip svg{width:11px;height:11px;flex-shrink:0}
        .bam-deliv-note{font-style:italic;font-size:12px;line-height:1.45;color:rgba(244,234,210,.5)}
        .bam-deliv-note em{color:rgba(114,215,255,.85);font-style:italic;font-weight:500}

        .bam-st{border:1px solid rgba(244,234,210,.08);border-radius:10px;padding:14px 16px;background:rgba(0,0,0,.4)}
        .bam-strow{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:6px}
        .bam-stl{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.22em;color:rgba(114,215,255,.75);text-transform:uppercase}
        .bam-stv{font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.08em;display:inline-flex;align-items:center;gap:6px}
        .bam-stn{font-style:italic;font-size:12px;color:rgba(244,234,210,.42);line-height:1.45}

        .bam-hook{font-style:italic;font-weight:400;font-size:clamp(22px,3vw,25px);line-height:1.15;color:#f4ead2;letter-spacing:-.02em;margin-bottom:12px}
        .bam-cbody{font-style:italic;font-size:13.5px;line-height:1.55;color:rgba(244,234,210,.72);margin-bottom:14px}
        .bam-kill{font-style:italic;font-weight:500;font-size:15px;line-height:1.4;color:#f4ead2;padding:12px 14px;background:rgba(255,122,184,.1);border-left:3px solid #ff7ab8;border-radius:0 6px 6px 0;margin-bottom:16px}
        .bam-kill .r{color:#ff7ab8}
        .bam-terms{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:12px 14px;background:rgba(0,0,0,.4);border-radius:10px;border:1px solid rgba(255,122,184,.15)}
        .bam-tamt{font-style:italic;font-weight:500;font-size:clamp(22px,3vw,25px);color:#ff7ab8;line-height:1}
        .bam-tmid{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.12em;color:rgba(244,234,210,.55);text-transform:uppercase}
        .bam-tout{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;display:inline-flex;align-items:center;gap:5px}

        .bam-ctrl{display:flex;justify-content:space-between;align-items:center;margin-top:20px}
        .bam-dots{display:flex;gap:5px}
        .bam-db{width:6px;height:6px;border-radius:50%;background:rgba(244,234,210,.15);cursor:pointer;transition:all .2s;border:0;padding:0}
        .bam-db:hover{background:rgba(255,122,184,.4)}
        .bam-db.on{background:#ff7ab8;box-shadow:0 0 8px rgba(255,122,184,.7);width:20px;border-radius:3px}
        .bam-nb{display:flex;gap:8px}
        .bam-navbtn{width:40px;height:40px;border-radius:50%;background:rgba(255,122,184,.06);border:1px solid rgba(255,122,184,.3);color:#ff7ab8;font-family:ui-monospace,monospace;font-size:16px;cursor:pointer;display:grid;place-items:center;transition:all .2s}
        .bam-navbtn:hover{background:rgba(255,122,184,.15);border-color:rgba(255,122,184,.6);transform:scale(1.05)}

        .bam-ctas{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:36px;position:relative;z-index:2}
        .bam-cta{padding:20px 22px;border-radius:14px;text-align:left;cursor:pointer;font-family:inherit;border:1px solid rgba(244,234,210,.15);background:rgba(244,234,210,.02);color:#f4ead2;transition:transform .2s,border-color .2s,background .2s}
        .bam-cta:hover{transform:translateY(-2px)}
        .bam-cta.rose{background:linear-gradient(180deg,rgba(255,122,184,.15),rgba(255,122,184,.03));border-color:rgba(255,122,184,.55);box-shadow:0 10px 32px rgba(255,122,184,.08)}
        .bam-cta.rose:hover{border-color:rgba(255,122,184,.75);background:linear-gradient(180deg,rgba(255,122,184,.22),rgba(255,122,184,.06))}
        .bam-cta.dash{border-style:dashed}
        .bam-ck{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:rgba(244,234,210,.55);display:block;margin-bottom:10px}
        .bam-cta.rose .bam-ck{color:rgba(255,122,184,.8)}
        .bam-cl{font-style:italic;font-size:clamp(20px,2.4vw,23px);letter-spacing:-.02em;display:flex;justify-content:space-between;align-items:baseline}
        .bam-cta.rose .bam-cl{color:#ff7ab8}
        .bam-ca{font-family:ui-monospace,monospace;font-style:normal;color:rgba(244,234,210,.5)}
        .bam-cta.rose .bam-ca{color:#ff7ab8}

        /* ── Q PANELS ── */
        .bam-panel{position:relative;padding:56px 24px;border-top:1px solid rgba(244,234,210,.05);overflow:hidden}
        .bam-qnum{position:absolute;font-style:italic;font-weight:500;font-size:clamp(200px,34vw,380px);line-height:.85;opacity:.07;right:-4%;top:0;letter-spacing:-.05em;pointer-events:none;user-select:none;z-index:0}
        .bam-qmark{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;position:relative;z-index:2}
        .bam-qeye{display:inline-flex;align-items:center;gap:10px;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.28em;text-transform:uppercase;font-weight:500}
        .bam-qchap{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.28em;color:rgba(244,234,210,.35)}
        .bam-qchap b{color:rgba(244,234,210,.75);font-weight:400}
        .bam-qgrid{display:grid;grid-template-columns:1fr;gap:40px;position:relative;z-index:2}
        .bam-qh{font-style:italic;font-weight:400;font-size:clamp(34px,5vw,48px);line-height:1.1;letter-spacing:-.025em;margin:0;color:#f4ead2}
        .bam-qh em{font-weight:500}
        .bam-qs{font-style:italic;font-size:15px;line-height:1.65;color:rgba(244,234,210,.6);margin:20px 0 0;max-width:480px}
        .bam-qd{font-style:italic;font-size:16px;line-height:1.45;color:rgba(244,234,210,.75);margin:24px 0 0;padding:16px 0 0;border-top:1px solid;max-width:480px}

        .bam-rc{background:linear-gradient(180deg,#08131a,#050b10);border:1px solid rgba(114,215,255,.22);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
        .bam-rc-h{padding:12px 16px;background:linear-gradient(90deg,rgba(114,215,255,.08),rgba(114,215,255,.02));border-bottom:1px solid rgba(114,215,255,.15);display:flex;justify-content:space-between;align-items:center}
        .bam-rc-hl{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.2em;color:rgba(114,215,255,.75);text-transform:uppercase}
        .bam-rc-hr{font-family:ui-monospace,monospace;font-size:9px;color:#00ff88;display:flex;align-items:center;gap:6px;letter-spacing:.15em}
        .bam-rc-b{padding:20px 16px;position:relative;display:grid;grid-template-columns:1fr 1fr}
        .bam-rc-b::before{content:'';position:absolute;top:0;bottom:0;left:50%;width:1px;background:repeating-linear-gradient(180deg,rgba(114,215,255,.15) 0 4px,transparent 4px 8px)}
        .bam-rc-col{padding:0 12px}
        .bam-rc-l{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.22em;text-transform:uppercase;margin-bottom:14px}
        .bam-rc-m{font-family:ui-monospace,monospace;font-size:12px;line-height:2}
        .bam-rc-m .k{color:rgba(244,234,210,.4);display:inline-block;width:62px}
        .bam-rc-amt{font-family:ui-monospace,monospace;font-size:28px;font-weight:500;margin-top:14px;letter-spacing:-.02em}
        .bam-rc-f{padding:16px;background:linear-gradient(90deg,rgba(0,255,136,.05),rgba(0,255,136,.02));border-top:1px dashed rgba(0,255,136,.3);display:flex;justify-content:space-between;align-items:baseline}
        .bam-rc-fl{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.24em;color:rgba(0,255,136,.8);text-transform:uppercase}
        .bam-rc-fr{font-family:ui-monospace,monospace;font-size:32px;font-weight:500;color:#00ff88;letter-spacing:-.02em}
        .bam-rc-perf{height:12px;background-image:radial-gradient(circle at 6px 6px,transparent 3px,#050403 3px);background-size:12px 12px;background-position:0 -6px;margin-top:-1px}

        .bam-vd{background:#000;border:1px solid rgba(0,255,136,.25);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
        .bam-vd-f{position:relative;height:240px;background:radial-gradient(ellipse at 40% 40%,#0f1a14,#050805 70%);overflow:hidden}
        .bam-vd-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,136,.03) 3px 4px);pointer-events:none}
        .bam-vd-tag{position:absolute;font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.18em;padding:4px 8px;border-radius:4px;color:rgba(0,255,136,.9);background:rgba(0,255,136,.08);border:1px solid rgba(0,255,136,.3)}
        .bam-vd-timer{position:absolute;top:14px;right:14px;font-family:ui-monospace,monospace;padding:6px 14px;border-radius:999px;font-size:13px;letter-spacing:.08em}
        .bam-vd-name{position:absolute;top:14px;left:14px;font-style:italic;font-size:14px;color:rgba(244,234,210,.75)}
        .bam-vd-wave{position:absolute;bottom:20px;left:14px;right:14px;display:flex;gap:3px;align-items:flex-end;height:32px}
        .bam-vd-wave div{flex:1;background:#00ff88;opacity:.7;border-radius:1px}
        .bam-vd-checks{padding:14px 16px;background:linear-gradient(90deg,rgba(0,255,136,.06),rgba(0,255,136,.02));border-top:1px solid rgba(0,255,136,.15);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
        .bam-vd-check{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.12em;color:rgba(0,255,136,.85);display:inline-flex;align-items:center;gap:6px}
        .bam-vd-check svg{width:12px;height:12px}
        .bam-vd-mb{padding:12px 16px;background:rgba(0,0,0,.5);border-top:1px solid rgba(244,234,210,.05);display:flex;justify-content:space-between;align-items:center}
        .bam-vd-ml{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase}
        .bam-vd-mr{font-family:ui-monospace,monospace;font-size:15px}

        .bam-cmp{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .bam-dm{background:rgba(255,255,255,.015);border:1px solid rgba(244,234,210,.06);border-radius:14px;padding:18px;position:relative}
        .bam-dm::before{content:'IGNORED';position:absolute;top:12px;right:12px;font-family:ui-monospace,monospace;font-size:8px;letter-spacing:.22em;color:rgba(244,234,210,.28);border:1px solid rgba(244,234,210,.12);padding:3px 7px;border-radius:4px}
        .bam-dm-l{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:rgba(244,234,210,.35);margin-bottom:30px}
        .bam-dm-m{font-style:italic;font-size:14px;color:rgba(244,234,210,.42);line-height:1.55;margin-bottom:18px}
        .bam-dm-t{font-family:ui-monospace,monospace;font-size:10px;line-height:1.9;color:rgba(244,234,210,.32)}
        .bam-of{background:linear-gradient(180deg,rgba(233,185,73,.08),rgba(233,185,73,.02));border:1px solid rgba(233,185,73,.4);border-radius:14px;padding:18px;position:relative;box-shadow:0 12px 40px rgba(233,185,73,.08)}
        .bam-of::before{content:'OPENED';position:absolute;top:12px;right:12px;font-family:ui-monospace,monospace;font-size:8px;letter-spacing:.22em;color:#e9b949;border:1px solid rgba(233,185,73,.55);padding:3px 7px;border-radius:4px;background:rgba(233,185,73,.1)}
        .bam-of-l{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#e9b949;margin-bottom:14px}
        .bam-of-a{font-style:italic;font-size:30px;color:#e9b949;letter-spacing:-.02em;margin-bottom:2px}
        .bam-of-s{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.12em;color:rgba(244,234,210,.55);margin-bottom:14px}
        .bam-of-m{font-style:italic;font-size:13px;color:rgba(244,234,210,.85);line-height:1.55;margin-bottom:14px;padding-top:12px;border-top:1px dashed rgba(233,185,73,.2)}
        .bam-of-t{font-family:ui-monospace,monospace;font-size:10px;line-height:1.9;color:rgba(244,234,210,.6)}
        .bam-of-t .live{color:#e9b949}
        .bam-vs{display:none;font-style:italic;font-size:20px;color:rgba(244,234,210,.3);align-items:center;justify-content:center}

        /* ── RECKONING ── */
        .bam-rk{padding:72px 24px;background:linear-gradient(180deg,#050403,#08070a 50%,#050403);border-top:1px solid rgba(233,185,73,.4);position:relative;overflow:hidden}
        .bam-rk::before{content:'';position:absolute;top:-1px;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,#e9b949,transparent);box-shadow:0 0 20px rgba(233,185,73,.6)}
        .bam-rk-eye{text-align:center;margin-bottom:40px}
        .bam-rk-eye span{display:inline-flex;align-items:center;gap:14px;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.34em;color:#e9b949;text-transform:uppercase}
        .bam-rk-hl{font-style:italic;font-weight:400;font-size:clamp(26px,4vw,36px);line-height:1.3;color:rgba(244,234,210,.9);text-align:center;margin:0 auto 40px;max-width:560px;letter-spacing:-.02em}
        .bam-rk-hl .a{color:#e9b949}
        .bam-rk-vs{display:flex;flex-direction:column;gap:18px;max-width:620px;margin:0 auto 40px}
        .bam-rk-v{display:grid;grid-template-columns:40px 1fr;gap:18px;padding:18px 20px;border-radius:12px;border:1px solid;background:linear-gradient(180deg,rgba(255,255,255,.015),transparent)}
        .bam-rk-v.ro{border-color:rgba(255,122,184,.22)}.bam-rk-v.cy{border-color:rgba(114,215,255,.2)}.bam-rk-v.gr{border-color:rgba(0,255,136,.2)}.bam-rk-v.gd{border-color:rgba(233,185,73,.28)}
        .bam-rk-vn{font-family:ui-monospace,monospace;font-size:20px;padding-top:2px}
        .bam-rk-v.ro .bam-rk-vn{color:#ff7ab8}.bam-rk-v.cy .bam-rk-vn{color:#72d7ff}.bam-rk-v.gr .bam-rk-vn{color:#00ff88}.bam-rk-v.gd .bam-rk-vn{color:#e9b949}
        .bam-rk-vq{font-style:italic;font-size:13px;color:rgba(244,234,210,.42);margin-bottom:6px}
        .bam-rk-va{font-size:16px;line-height:1.5;color:#f4ead2}
        .bam-rk-va b{font-weight:500;font-style:italic}
        .bam-rk-v.ro .bam-rk-va b{color:#ff7ab8}.bam-rk-v.cy .bam-rk-va b{color:#72d7ff}.bam-rk-v.gr .bam-rk-va b{color:#00ff88}.bam-rk-v.gd .bam-rk-va b{color:#e9b949}
        .bam-rk-pause{display:flex;align-items:center;justify-content:center;gap:16px;margin:40px 0}
        .bam-rk-pause .ln{height:1px;width:70px;background:linear-gradient(90deg,transparent,#e9b949)}
        .bam-rk-pause .ln.r{background:linear-gradient(90deg,#e9b949,transparent)}
        .bam-rk-pause .d{color:#e9b949;font-family:ui-monospace,monospace}
        .bam-rk-mic{font-style:italic;font-size:clamp(24px,3.4vw,30px);line-height:1.4;color:#f4ead2;text-align:center;max-width:560px;margin:0 auto;letter-spacing:-.02em}
        .bam-rk-mic em{color:rgba(244,234,210,.5)}.bam-rk-mic .gd{color:#e9b949;font-weight:500}.bam-rk-mic .ro{color:#ff7ab8;font-weight:500}
        .bam-rk-note{text-align:center;margin:32px 0 22px;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.28em;color:rgba(244,234,210,.4)}
        .bam-rk-fin{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:560px;margin:22px auto 0}
        .bam-rk-fc{padding:24px 20px;border-radius:16px;text-align:left;cursor:pointer;font-family:inherit;border:1px solid;transition:transform .2s}
        .bam-rk-fc:hover{transform:translateY(-3px)}
        .bam-rk-fc.cy{background:linear-gradient(180deg,rgba(114,215,255,.15),rgba(114,215,255,.03));border-color:rgba(114,215,255,.6);box-shadow:0 12px 40px rgba(114,215,255,.08)}
        .bam-rk-fc.gd{background:linear-gradient(180deg,rgba(233,185,73,.15),rgba(233,185,73,.03));border-color:rgba(233,185,73,.6);box-shadow:0 12px 40px rgba(233,185,73,.08)}
        .bam-rk-fk{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.28em;text-transform:uppercase;display:block;margin-bottom:10px}
        .bam-rk-fc.cy .bam-rk-fk{color:rgba(114,215,255,.85)}.bam-rk-fc.gd .bam-rk-fk{color:rgba(233,185,73,.85)}
        .bam-rk-fl{font-style:italic;font-size:22px;letter-spacing:-.02em;display:flex;justify-content:space-between;align-items:baseline}
        .bam-rk-fc.cy .bam-rk-fl{color:#72d7ff}.bam-rk-fc.gd .bam-rk-fl{color:#e9b949}
        .bam-rk-fa{font-family:ui-monospace,monospace;font-style:normal}.bam-rk-fc.cy .bam-rk-fa{color:#72d7ff}.bam-rk-fc.gd .bam-rk-fa{color:#e9b949}
        .bam-rk-sig{text-align:center;font-style:italic;font-size:13px;color:rgba(244,234,210,.55);margin:30px auto 0;padding:20px 0 0;border-top:1px solid rgba(244,234,210,.06);max-width:500px}
        .bam-rk-sig .gd{color:#e9b949;font-weight:500}

        .bam-footer{padding:2rem 28px;border-top:1px solid rgba(244,234,210,.08);display:flex;justify-content:space-between;font-family:ui-monospace,monospace;font-size:11px;color:rgba(244,234,210,.3);letter-spacing:.1em;text-transform:uppercase;flex-wrap:wrap;gap:12px}
        .bam-footer-logo{font-style:italic;color:rgba(244,234,210,.5);text-transform:none;letter-spacing:-.02em;font-size:14px}

        /* ── DESKTOP ── */
        @media(min-width:920px){
          .bam-p0-body{padding:34px 48px 72px}
          .bam-p0-grid{grid-template-columns:1.05fr 0.62fr 1.35fr;gap:40px;align-items:start}
          .bam-hero{font-size:clamp(46px,4.4vw,60px)}
          .bam-lane-sub{border-left:1px solid rgba(255,122,184,.18);border-right:1px solid rgba(244,234,210,.06);padding:2px 24px 0;position:relative}
          .bam-lane-sub::before{content:'';position:absolute;top:0;left:-1px;width:1px;height:46px;background:#ff7ab8;box-shadow:0 0 12px #ff7ab8}
          .bam-sub{font-size:13.5px;max-width:none}
          .bam-spine-lbl{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.26em;text-transform:uppercase;color:rgba(255,122,184,.6);margin-bottom:16px;display:block}
          .bam-scrollcue{display:none}
          .bam-p0-num{font-size:clamp(300px,26vw,420px);top:-30px;right:-2%}
        }
        @media(max-width:919px){
          .bam-p0-num{font-size:clamp(220px,44vw,340px);top:-14px;right:-6%}
          .bam-spine-lbl{display:none}
          .bam-stack{min-height:548px}
        }
        @media(min-width:780px){
          .bam-panel{padding:84px 56px}
          .bam-qnum{font-size:clamp(300px,26vw,380px);top:-20px;right:-3%}
          .bam-qgrid{grid-template-columns:5fr 6fr;gap:56px;align-items:center}
          .bam-qh{font-size:clamp(40px,4.4vw,48px)}
          .bam-qs{font-size:17px}.bam-qd{font-size:18px}
          .bam-cmp{grid-template-columns:1fr 40px 1fr}
          .bam-vs{display:flex}
          .bam-rk{padding:100px 56px}
        }
        @media(max-width:560px){
          .bam-ctas{grid-template-columns:1fr}
          .bam-nav{padding:14px 20px}
        }
      `}</style>

      {/* NOTE: the app shell renders the global nav. This page intentionally
         does NOT render its own nav to avoid a duplicate bar. */}

      {/* ══════════ PANEL 00 ══════════ */}
      <section className="bam-p0">
        <div
          className="bam-glow"
          style={{
            width: "min(560px,82vw)",
            height: "min(560px,82vw)",
            background: "rgba(255,122,184,.08)",
            top: "4%",
            right: "-14%",
          }}
        />
        <div
          className="bam-glow"
          style={{
            width: "min(420px,64vw)",
            height: "min(420px,64vw)",
            background: "rgba(114,215,255,.04)",
            bottom: "4%",
            left: "-12%",
          }}
        />
        <div className="bam-p0-num">00</div>

        <div className="bam-p0-body">
          <div className="bam-p0-mark">
            <span className="bam-p0-eye">
              <span
                className="bam-dot"
                style={{ background: "#ff7ab8", boxShadow: "0 0 12px #ff7ab8" }}
              />
              Nine offers &middot; one shortcut
            </span>
            <span className="bam-p0-chap">
              <b>00</b> &middot; Prologue
            </span>
          </div>

          <div className="bam-p0-grid">
            {/* LANE 1 — HERO */}
            <div className="bam-lane-hero">
              <h1 className="bam-hero">
                <span className="lead">Money makes your</span>{" "}
                <span className="anchor">Calls</span>{" "}
                <span className="peak">impossible</span>{" "}
                <span className="lead">to ignore</span>{" "}
                <span className="stamp">
                  or&nbsp;decline<span className="pd">.</span>
                </span>
              </h1>

              <div className="bam-herocta">
                {loggedIn ? (
                  <button className="bam-hcta bam-hcta-console" onClick={openConsole}>
                    <span className="bam-hcta-k">&#9670; Welcome back &middot; jump in</span>
                    <span className="bam-hcta-l">
                      <span>Open your console</span>
                      <span className="bam-hcta-a">&#8984;K</span>
                    </span>
                  </button>
                ) : (
                  <button className="bam-hcta" onClick={goSignup}>
                    <span className="bam-hcta-k">&#9670; New here? Start free</span>
                    <span className="bam-hcta-l">
                      <span>Send your first offer</span>
                      <span className="bam-hcta-a">&rarr;</span>
                    </span>
                  </button>
                )}
              </div>

              <div className="bam-scrollcue">
                <span>Swipe the offers</span>
                <span className="ar">&darr;</span>
              </div>
            </div>

            {/* LANE 2 — SUB SPINE */}
            <div className="bam-lane-sub">
              <span className="bam-spine-lbl">Why it works</span>
              <p className="bam-sub">
                A paid call offer is your <b>ultimate shortcut</b> to that voice
                or video call session you&rsquo;ve been craving for with a crush,
                friend or mentor. Unlock new connections and conversations by{" "}
                <em>giving them a financial reason to engage with you.</em>
              </p>
              <p className="bam-sub t">
                Just drop your custom offer link into their inbox or comment
                section &mdash; our system auto-syncs and brings them{" "}
                <b>straight to the line.</b>
              </p>
              <p className="bam-sub t">
                No overpriced hourly blocks. No wasted money. If the conversation
                wraps up early, you only pay for the{" "}
                <em>connected time &mdash; down to the second.</em>
              </p>
            </div>

            {/* LANE 3 — DECK */}
            <div className="bam-lane-cards">
              <div className="bam-stackwrap">
                <div className="bam-sh">
                  <span className="l">
                    <span
                      className="bam-dot"
                      style={{
                        background: "#ff7ab8",
                        boxShadow: "0 0 8px #ff7ab8",
                      }}
                    />
                    Swipe through the deck
                  </span>
                  <span className="r">
                    {String(idx + 1).padStart(2, "0")} / 09
                  </span>
                </div>

                <div
                  className="bam-stack"
                  onTouchStart={onTouchStart}
                  onTouchEnd={onTouchEnd}
                >
                  {CARDS.map((c, i) => (
                    <div
                      key={i}
                      className={`bam-card ${c.kind === "offer" ? "offer" : "casey"} ${relClass(i)}`}
                      aria-hidden={((i - idx + CARDS.length) % CARDS.length) !== 0}
                    >
                      <div className="bam-cb">
                        <div className="bam-chead">
                          <span className="bam-pill">{c.pill}</span>
                          <span className="bam-ctime">{c.time}</span>
                        </div>
                        <div className="bam-to">
                          <div className="bam-av">{c.av}</div>
                          <div>
                            <div className="bam-tolbl">
                              {c.kind === "offer" ? "To" : "Case"}
                            </div>
                            <div className="bam-toval">{c.tov}</div>
                          </div>
                        </div>

                        {c.kind === "offer" ? (
                          <>
                            <div className="bam-oin">
                              <div className="bam-olbl">Your offer</div>
                              <div className="bam-orow">
                                <div className="bam-oamt">{c.amt}</div>
                                <div className="bam-oterms">
                                  <div className="bam-otl">rate &middot; cap</div>
                                  <span className="bam-term">{c.rate}</span>
                                  <span className="bam-term cap">{c.cap}</span>
                                </div>
                              </div>
                              <div className="bam-omsg">{c.msg}</div>
                            </div>

                            <div className="bam-deliv">
                              <div className="bam-deliv-top">
                                <span className="bam-deliv-lbl">Delivery</span>
                                <span className="bam-deliv-line" />
                              </div>
                              <div className="bam-chips">
                                {CHANNELS.map((ch, k) => (
                                  <span className="bam-chip" key={k}>
                                    <svg viewBox="0 0 12 12" fill="none">
                                      {"email" in ch && ch.email ? (
                                        <>
                                          <rect
                                            x="1.5"
                                            y="2.5"
                                            width="9"
                                            height="7"
                                            rx="1"
                                            stroke="#72d7ff"
                                            strokeWidth="1"
                                          />
                                          <path
                                            d="M1.5 3.5l4.5 3 4.5-3"
                                            stroke="#72d7ff"
                                            strokeWidth="1"
                                          />
                                        </>
                                      ) : "link" in ch && ch.link ? (
                                        <path
                                          d="M4.5 7.5l3-3M5 3.5l1-1a2 2 0 013 3l-1 1M7 8.5l-1 1a2 2 0 01-3-3l1-1"
                                          stroke="#72d7ff"
                                          strokeWidth="1"
                                        />
                                      ) : (
                                        <path
                                          d={"path" in ch ? ch.path : ""}
                                          stroke="#72d7ff"
                                          strokeWidth="1"
                                        />
                                      )}
                                    </svg>
                                    {ch.label}
                                  </span>
                                ))}
                              </div>
                              <div className="bam-deliv-note">
                                Paste your offer link anywhere &mdash;{" "}
                                <em>
                                  our system auto-syncs and brings them straight
                                  to the line.
                                </em>
                              </div>
                            </div>

                            <div className="bam-st">
                              <div className="bam-strow">
                                <span className="bam-stl">Status</span>
                                <span
                                  className="bam-stv"
                                  style={{ color: COLOR[c.sc] }}
                                >
                                  <span
                                    className="bam-dot"
                                    style={{
                                      background: COLOR[c.sc],
                                      boxShadow: `0 0 8px ${COLOR[c.sc]}`,
                                    }}
                                  />
                                  {c.sv}
                                </span>
                              </div>
                              <div className="bam-stn">{c.sn}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bam-hook">{c.hook}</div>
                            <div className="bam-cbody">{c.body}</div>
                            <div className="bam-kill">
                              {c.kl}
                              <span className="r">{c.kr}</span>
                            </div>
                            <div className="bam-terms">
                              <span className="bam-tamt">{c.tamt}</span>
                              <span className="bam-tmid">{c.tmid}</span>
                              <span
                                className="bam-tout"
                                style={{ color: COLOR[c.tc] }}
                              >
                                <span
                                  className="bam-dot"
                                  style={{
                                    background: COLOR[c.tc],
                                    boxShadow: `0 0 6px ${COLOR[c.tc]}`,
                                  }}
                                />
                                {c.tout}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bam-ctrl">
                  <div className="bam-dots">
                    {CARDS.map((_, i) => (
                      <button
                        key={i}
                        className={`bam-db ${i === idx ? "on" : ""}`}
                        onClick={() => setCard(i)}
                        aria-label={`Card ${i + 1}`}
                      />
                    ))}
                  </div>
                  <div className="bam-nb">
                    <button
                      className="bam-navbtn"
                      onClick={() => go(-1)}
                      aria-label="Previous"
                    >
                      &larr;
                    </button>
                    <button
                      className="bam-navbtn"
                      onClick={() => go(1)}
                      aria-label="Next"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PANEL 00 CTAs */}
          <div className="bam-ctas">
            <button className="bam-cta rose" onClick={() => gated("/offer/new")}>
              <span className="bam-ck">&#9670; Make it impossible to decline</span>
              <span className="bam-cl">
                <span>Post an offer</span>
                <span className="bam-ca">&rarr;</span>
              </span>
            </button>
            <button className="bam-cta dash" onClick={goBrowse}>
              <span className="bam-ck">&#9671; Or, live now</span>
              <span className="bam-cl">
                <span style={{ color: "rgba(244,234,210,.85)" }}>
                  Call anyone
                </span>
                <span className="bam-ca">&rarr;</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ Q1 — RECEIPT ══════════ */}
      <section className="bam-panel">
        <div
          className="bam-glow"
          style={{
            width: 500,
            height: 500,
            background: "rgba(114,215,255,.06)",
            top: "40%",
            right: "-20%",
          }}
        />
        <div className="bam-qnum" style={{ color: "#72d7ff" }}>
          01
        </div>
        <div className="bam-qmark">
          <span className="bam-qeye" style={{ color: "#72d7ff" }}>
            <span
              className="bam-dot"
              style={{ background: "#72d7ff", boxShadow: "0 0 12px #72d7ff" }}
            />
            The buyer&rsquo;s edge
          </span>
          <span className="bam-qchap">
            <b>01</b> / 03
          </span>
        </div>
        <div className="bam-qgrid">
          <div>
            <h2 className="bam-qh">
              Why pay for the hour
              <br />
              when you needed{" "}
              <em style={{ color: "#72d7ff" }}>eleven minutes?</em>
            </h2>
            <p className="bam-qs">
              Their meter locks the sixty. Ours meters the eleven &mdash; down to
              the second &mdash; and stops the instant you hang up.
            </p>
            <p
              className="bam-qd"
              style={{ borderTopColor: "rgba(114,215,255,.25)" }}
            >
              Fifty-one minutes you didn&rsquo;t need. Two-hundred-fifty-six
              dollars they&rsquo;d have kept.
            </p>
          </div>
          <div>
            <div className="bam-rc">
              <div className="bam-rc-h">
                <span className="bam-rc-hl">SESSION &middot; #A7F2</span>
                <span className="bam-rc-hr">
                  <span
                    className="bam-dot"
                    style={{
                      background: "#00ff88",
                      boxShadow: "0 0 8px #00ff88",
                    }}
                  />
                  LIVE
                </span>
              </div>
              <div className="bam-rc-b">
                <div className="bam-rc-col">
                  <div
                    className="bam-rc-l"
                    style={{ color: "rgba(244,234,210,.5)" }}
                  >
                    Theirs &middot; Hourly
                  </div>
                  <div className="bam-rc-m">
                    <div>
                      <span className="k">Booked</span>
                      <span style={{ color: "rgba(244,234,210,.55)" }}>
                        01:00:00
                      </span>
                    </div>
                    <div>
                      <span className="k">Talked</span>
                      <span style={{ color: "rgba(244,234,210,.55)" }}>
                        00:09:14
                      </span>
                    </div>
                    <div>
                      <span className="k">Wasted</span>
                      <span style={{ color: "rgba(244,234,210,.55)" }}>
                        00:50:46
                      </span>
                    </div>
                  </div>
                  <div
                    className="bam-rc-amt"
                    style={{
                      color: "rgba(244,234,210,.4)",
                      textDecoration: "line-through",
                      textDecorationColor: "rgba(255,80,80,.5)",
                    }}
                  >
                    $300.00
                  </div>
                </div>
                <div className="bam-rc-col">
                  <div className="bam-rc-l" style={{ color: "#72d7ff" }}>
                    Ours &middot; Per second
                  </div>
                  <div className="bam-rc-m">
                    <div>
                      <span className="k">Preview</span>
                      <span style={{ color: "#00ff88" }}>00:00:30&middot;free</span>
                    </div>
                    <div>
                      <span className="k">Talked</span>
                      <span style={{ color: "rgba(244,234,210,.75)" }}>
                        00:09:14
                      </span>
                    </div>
                    <div>
                      <span className="k">Billed</span>
                      <span style={{ color: "#72d7ff" }}>{q1Billed}</span>
                    </div>
                  </div>
                  <div className="bam-rc-amt" style={{ color: "#72d7ff" }}>
                    {q1Amount}
                  </div>
                </div>
              </div>
              <div className="bam-rc-perf" />
              <div className="bam-rc-f">
                <span className="bam-rc-fl">You kept</span>
                <span className="bam-rc-fr">{q1Saved}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bam-ctas">
          <button className="bam-cta rose" onClick={goBrowse}>
            <span className="bam-ck">&#9670; Live now</span>
            <span className="bam-cl">
              <span>Call anyone</span>
              <span className="bam-ca">&rarr;</span>
            </span>
          </button>
          <button className="bam-cta dash" onClick={() => gated("/offer/new")}>
            <span className="bam-ck">&#9671; Or bid</span>
            <span className="bam-cl">
              <span style={{ color: "rgba(244,234,210,.85)" }}>Post an offer</span>
              <span className="bam-ca">&rarr;</span>
            </span>
          </button>
        </div>
      </section>

      {/* ══════════ Q2 — PREVIEW ══════════ */}
      <section className="bam-panel">
        <div
          className="bam-glow"
          style={{
            width: 480,
            height: 480,
            background: "rgba(0,255,136,.05)",
            top: "30%",
            left: "-15%",
          }}
        />
        <div className="bam-qnum" style={{ color: "#00ff88" }}>
          02
        </div>
        <div className="bam-qmark">
          <span className="bam-qeye" style={{ color: "#00ff88" }}>
            <span
              className="bam-dot"
              style={{ background: "#00ff88", boxShadow: "0 0 12px #00ff88" }}
            />
            Thirty on the house
          </span>
          <span className="bam-qchap">
            <b>02</b> / 03
          </span>
        </div>
        <div className="bam-qgrid">
          <div>
            <h2 className="bam-qh">
              Why gamble on a stranger
              <br />
              before you&rsquo;ve{" "}
              <em style={{ color: "#00ff88" }}>seen their face?</em>
            </h2>
            <p className="bam-qs">
              Every call opens with a thirty-second window. Free. Live. Off the
              meter. Voice or video. If they&rsquo;re not who they said they were,
              you&rsquo;re gone before a cent moves.
            </p>
            <p
              className="bam-qd"
              style={{ borderTopColor: "rgba(0,255,136,.25)" }}
            >
              Thirty seconds to sniff them out. Every call. Even the expensive
              ones.
            </p>
          </div>
          <div>
            <div className="bam-vd">
              <div className="bam-vd-f">
                <div className="bam-vd-scan" />
                <div className="bam-vd-tag" style={{ top: 50, left: 14 }}>
                  HD &middot; 1080p
                </div>
                <div className="bam-vd-tag" style={{ top: 78, left: 14 }}>
                  END-TO-END
                </div>
                <span className="bam-vd-name">Naval R.</span>
                <div
                  className="bam-vd-timer"
                  style={{
                    background: q2Preview
                      ? "rgba(0,255,136,.15)"
                      : "rgba(233,185,73,.15)",
                    border: `1px solid ${q2Preview ? "rgba(0,255,136,.55)" : "rgba(233,185,73,.55)"}`,
                    color: q2Preview ? "#00ff88" : "#e9b949",
                    boxShadow: `0 0 20px ${q2Preview ? "rgba(0,255,136,.3)" : "rgba(233,185,73,.3)"}`,
                  }}
                >
                  {q2Preview
                    ? `PREVIEW · ${fmtTime(q2pv).slice(3)}`
                    : `BILLING · ${String(q2Over).padStart(2, "0")}s`}
                </div>
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 100 100"
                  style={{
                    opacity: 0.4,
                    position: "absolute",
                    top: "55%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                  }}
                >
                  <circle
                    cx="50"
                    cy="34"
                    r="16"
                    fill="none"
                    stroke="#00ff88"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M18 96Q18 62 50 62Q82 62 82 96Z"
                    fill="none"
                    stroke="#00ff88"
                    strokeWidth="1.5"
                  />
                </svg>
                <div className="bam-vd-wave">
                  {waveHeights.map((h, i) => (
                    <div key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="bam-vd-checks">
                {["FACE", "VOICE", "VIBE", "PROOF"].map((t) => (
                  <span className="bam-vd-check" key={t}>
                    <svg viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6 5 9 10 3"
                        stroke="#00ff88"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {t}
                  </span>
                ))}
              </div>
              <div className="bam-vd-mb">
                <span
                  className="bam-vd-ml"
                  style={{
                    color: q2Preview
                      ? "rgba(0,255,136,.75)"
                      : "rgba(233,185,73,.85)",
                  }}
                >
                  {q2Preview
                    ? "Preview · off meter"
                    : "Billing · per second · hang up anytime"}
                </span>
                <span
                  className="bam-vd-mr"
                  style={{
                    color: q2Preview ? "rgba(244,234,210,.35)" : "#e9b949",
                  }}
                >
                  {q2Preview ? "$0.00" : "$" + (q2Over * 0.15).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="bam-ctas">
          <button className="bam-cta rose" onClick={goBrowse}>
            <span className="bam-ck">&#9670; Preview first</span>
            <span className="bam-cl">
              <span>Call anyone</span>
              <span className="bam-ca">&rarr;</span>
            </span>
          </button>
          <button className="bam-cta dash" onClick={() => gated("/offer/new")}>
            <span className="bam-ck">&#9671; Or bid</span>
            <span className="bam-cl">
              <span style={{ color: "rgba(244,234,210,.85)" }}>Post an offer</span>
              <span className="bam-ca">&rarr;</span>
            </span>
          </button>
        </div>
      </section>

      {/* ══════════ Q3 — COMPARE ══════════ */}
      <section className="bam-panel">
        <div
          className="bam-glow"
          style={{
            width: 520,
            height: 520,
            background: "rgba(233,185,73,.05)",
            top: "25%",
            right: "-10%",
          }}
        />
        <div className="bam-qnum" style={{ color: "#e9b949" }}>
          03
        </div>
        <div className="bam-qmark">
          <span className="bam-qeye" style={{ color: "#e9b949" }}>
            <span
              className="bam-dot"
              style={{ background: "#e9b949", boxShadow: "0 0 12px #e9b949" }}
            />
            Make it worth their while
          </span>
          <span className="bam-qchap">
            <b>03</b> / 03
          </span>
        </div>
        <div className="bam-qgrid">
          <div>
            <h2 className="bam-qh">
              Why send another DM
              <br />
              into the <em style={{ color: "#e9b949" }}>void?</em>
            </h2>
            <p className="bam-qs">
              Cold messages die in inboxes. Paid offers don&rsquo;t. Attach the
              number that makes their eyebrow lift &mdash; watch what happens to
              your reply rate.
            </p>
            <p
              className="bam-qd"
              style={{ borderTopColor: "rgba(233,185,73,.25)" }}
            >
              One begs. The other bids. Guess which one gets answered.
            </p>
          </div>
          <div>
            <div className="bam-cmp">
              <div className="bam-dm">
                <div className="bam-dm-l">Cold DM</div>
                <div className="bam-dm-m">
                  &ldquo;Hey! Huge fan. Would mean the world if we could jump on a
                  quick call sometime &#128591;&rdquo;
                </div>
                <div className="bam-dm-t">
                  Delivered &middot; 6d ago
                  <br />
                  Read &middot; never
                  <br />
                  Reply &middot; &mdash;
                </div>
              </div>
              <div className="bam-vs">vs.</div>
              <div className="bam-of">
                <div className="bam-of-l">Paid offer</div>
                <div className="bam-of-a">$500</div>
                <div className="bam-of-s">FOR 8 MIN &middot; CAP $75/MIN</div>
                <div className="bam-of-m">
                  &ldquo;Wednesday, any time. Ten questions, that&rsquo;s it. Yes
                  or no?&rdquo;
                </div>
                <div className="bam-of-t">
                  Opened &middot; 3m ago
                  <br />
                  Read &middot; yes
                  <br />
                  Reply &middot; <span className="live">drafting&hellip;</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bam-ctas">
          <button className="bam-cta dash" onClick={goBrowse}>
            <span className="bam-ck">&#9671; Or just</span>
            <span className="bam-cl">
              <span style={{ color: "rgba(244,234,210,.85)" }}>Call anyone</span>
              <span className="bam-ca">&rarr;</span>
            </span>
          </button>
          <button className="bam-cta rose" onClick={() => gated("/offer/new")}>
            <span className="bam-ck">&#9670; Recommended</span>
            <span className="bam-cl">
              <span>Post an offer</span>
              <span className="bam-ca">&rarr;</span>
            </span>
          </button>
        </div>
      </section>

      {/* ══════════ RECKONING ══════════ */}
      <section className="bam-rk">
        <div
          className="bam-glow"
          style={{
            width: 700,
            height: 400,
            background: "rgba(233,185,73,.04)",
            top: "40%",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
        <div className="bam-rk-eye">
          <span>
            <span>&#9670;</span>The reckoning<span>&#9670;</span>
          </span>
        </div>
        <h2 className="bam-rk-hl">
          Every platform before this one was built for the seller.
          <br />
          <span className="a">This one was built for you.</span>
        </h2>
        <div className="bam-rk-vs">
          <div className="bam-rk-v ro">
            <div className="bam-rk-vn">00</div>
            <div>
              <div className="bam-rk-vq">
                Have you been snubbed, ignored, or avoided by someone you needed
                to reach?
              </div>
              <div className="bam-rk-va">
                <b>Not anymore.</b> Attach a number to the ask. Money changes what
                silence costs them. The reply arrives on the schedule you paid
                for.
              </div>
            </div>
          </div>
          <div className="bam-rk-v cy">
            <div className="bam-rk-vn">01</div>
            <div>
              <div className="bam-rk-vq">
                Why pay for the hour when you needed eleven minutes?
              </div>
              <div className="bam-rk-va">
                <b>You don&rsquo;t anymore.</b> The meter runs by the second,
                starts when the preview ends, stops when you hang up. Not a beat
                before, not a beat after.
              </div>
            </div>
          </div>
          <div className="bam-rk-v gr">
            <div className="bam-rk-vn">02</div>
            <div>
              <div className="bam-rk-vq">
                Why gamble on a stranger before you&rsquo;ve seen their face?
              </div>
              <div className="bam-rk-va">
                <b>You don&rsquo;t anymore.</b> Thirty free seconds open every call
                &mdash; face, voice, vibe &mdash; verified on your dime, which is
                to say, no dime. Fraud can&rsquo;t survive the first breath.
              </div>
            </div>
          </div>
          <div className="bam-rk-v gd">
            <div className="bam-rk-vn">03</div>
            <div>
              <div className="bam-rk-vq">Why send another DM into the void?</div>
              <div className="bam-rk-va">
                <b>You don&rsquo;t anymore.</b> Post an offer with a real number
                attached. Watch it get opened. Watch what money does to a reply
                rate.
              </div>
            </div>
          </div>
        </div>
        <div className="bam-rk-pause">
          <div className="ln" />
          <span className="d">&#9670;</span>
          <div className="ln r" />
        </div>
        <div className="bam-rk-mic">
          &ldquo;You used to pay for <em>their</em> time.
          <br />
          Now you pay for <span className="gd">yours</span>.
          <br />
          You used to hope they&rsquo;d pick up.
          <br />
          Now you make it <span className="ro">worth their while</span>.&rdquo;
        </div>
        <div className="bam-rk-note">
          PREVIEW &middot; 30s FREE &nbsp;&middot;&nbsp; BILLING &middot; PER
          SECOND &nbsp;&middot;&nbsp; SILENCE &middot; NEVER AGAIN
        </div>
        <div className="bam-rk-fin">
          <button className="bam-rk-fc cy" onClick={goBrowse}>
            <span className="bam-rk-fk">&#9670; Live now</span>
            <span className="bam-rk-fl">
              <span>Call anyone</span>
              <span className="bam-rk-fa">&rarr;</span>
            </span>
          </button>
          <button className="bam-rk-fc gd" onClick={() => gated("/offer/new")}>
            <span className="bam-rk-fk">&#9670; Make an offer</span>
            <span className="bam-rk-fl">
              <span>Post an offer</span>
              <span className="bam-rk-fa">&rarr;</span>
            </span>
          </button>
        </div>
        <div className="bam-rk-sig">
          You are not the customer. You are the <span className="gd">operator</span>.
          Act like it.
        </div>
      </section>

      <footer className="bam-footer">
        <span className="bam-footer-logo">BuyAMinute</span>
        <span>Preview 30s free &middot; Billed per second &middot; &copy; 2026</span>
      </footer>

      {/* ══════════ CONSOLE / COMMAND PALETTE (logged-in) ══════════ */}
      {consoleOpen && (
        <div
          className="bam-overlay"
          onClick={() => setConsoleOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Console"
        >
          <div className="bam-pal" onClick={(e) => e.stopPropagation()}>
            <div className="bam-pal-search">
              <span className="ic">&#9670;</span>
              <input
                className="bam-pal-input"
                autoFocus
                placeholder="Jump to&hellip; new offer, wallet, inbox"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span className="bam-pal-esc">Esc</span>
            </div>
            <div className="bam-pal-list">
              {filtered.length === 0 ? (
                <div className="bam-pal-empty">Nothing matches &ldquo;{query}&rdquo;</div>
              ) : (
                filtered.map((s, i) => (
                  <button
                    key={s.route}
                    className={`bam-pal-item ${i === active ? "on" : ""}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => runShortcut(s)}
                  >
                    <span className="bam-pal-ic">{s.icon}</span>
                    <span>
                      <span className="bam-pal-lab">{s.label}</span>
                      <span className="bam-pal-hint">{s.hint}</span>
                    </span>
                    <span className="bam-pal-enter">&#8629;</span>
                  </button>
                ))
              )}
            </div>
            <div className="bam-pal-foot">
              <span>&#8593;&#8595; navigate &middot; &#8629; open</span>
              <span>Operator console</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

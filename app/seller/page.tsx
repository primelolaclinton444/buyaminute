"use client";

/**
 * BuyAMinute — Seller page.
 *
 * Two-lane (duality):
 *   LEFT  = the fantasy — hero, key facts, the @alex_r live-call card with a
 *           real rate instrument, and the sellers-live button.
 *   RIGHT = the mechanism — the seller's edge, three live-demo tactic cards
 *           (each opens a "how it works" screen), and the CTAs.
 *
 * Conventions:
 *   - Playfair Display via next/font (Georgia fallback)
 *   - tokens: #f4ead2 cream · #e9b949/#ffcf4d gold · #00ff88 green · #050403 canvas
 *   - single inline <style> block, no external deps
 *   - class prefix "sel-" (scoped to this page so it can't collide with the
 *     buyer page's "bam-" block during route transitions)
 *
 * Routing (mirrors the existing seller page helpers):
 *   goSignup → /signup   (Start earning)
 *   goLogin  → buildAuthRedirect({ pathname, expired })   (Log in)
 *
 * NOTE: this component does NOT render a <nav>. The app shell provides the
 * global nav; the previous seller-page.tsx rendered its own, which produced a
 * duplicate bar. If this route is excluded from the global nav, re-add one here.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Playfair_Display } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildAuthRedirect } from "@/components/auth/AuthGuard";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair-sel",
});

const RATE_MIN = 1;
const RATE_MAX = 500;
const START_SECS = 356; // 00:05:56

/* ── Sellers currently live ───────────────────────────── */
type Persona = {
  handle: string;
  initial: string;
  label: string;
  accent: string;
  bg: string;
  rate: number;
  startSecs: number;
  status: string;
};

const PERSONAS: Persona[] = [
  { handle: "@maya_creator", initial: "M", label: "Music artist", accent: "#ff7ab8", bg: "#1a0d14", rate: 4.0, startSecs: 11, status: "Free preview" },
  { handle: "@coach_jay", initial: "J", label: "Strategy coach", accent: "#00ff88", bg: "#0a1d14", rate: 7.5, startSecs: 510, status: "Connected" },
  { handle: "@lila.fit", initial: "L", label: "Personal trainer", accent: "#72d7ff", bg: "#0a1620", rate: 9.0, startSecs: 1112, status: "Connected" },
  { handle: "@marcus.re", initial: "M", label: "Real estate consultant", accent: "#e9b949", bg: "#2a1d10", rate: 15.0, startSecs: 423, status: "Screen share" },
  { handle: "@dr_park", initial: "P", label: "Legal consult", accent: "#ff8a8a", bg: "#1a0a0a", rate: 30.0, startSecs: 210, status: "Recording" },
  { handle: "@lila.mood", initial: "L", label: "IG \u00b7 OF creator", accent: "#ff7ab8", bg: "#1a0d14", rate: 40.0, startSecs: 324, status: "Video" },
];

/* ── The three tactics + their screens ────────────────── */
type Tactic = {
  id: "1" | "2" | "3";
  num: string;
  title: string;
  blurb: string;
  eyebrow: string;
  headLead: string;
  headAccent: string;
  intro: React.ReactNode;
  chips: string[];
  second: React.ReactNode;
  steps: React.ReactNode[];
  kickLead: string;
  kickAccent: string;
};

const TACTICS: Tactic[] = [
  {
    id: "1",
    num: "01",
    title: "DM Blast",
    blurb:
      "Send invitations to everyone in your request queue. They wanted access \u2014 now they can pay for it.",
    eyebrow: "Tactic 01 \u00b7 DM Blast",
    headLead: "Your message requests are a queue of people who ",
    headAccent: "already want you.",
    intro: (
      <>
        Every unanswered message request is somebody who wanted your attention
        badly enough to reach out cold. On Instagram, TikTok, X &mdash; they pile
        up in a folder you stopped opening months ago. Hundreds of raised hands,
        filtered out of view.
      </>
    ),
    chips: ["Instagram", "TikTok", "X", "Snapchat", "WhatsApp", "LinkedIn"],
    second: (
      <>
        You don&rsquo;t owe any of them a free reply.{" "}
        <b>Send them an invitation to call you instead.</b> They already proved
        they want the access &mdash; this just puts a price on it.
      </>
    ),
    steps: [
      <>Open your <b>message requests</b> &mdash; wherever the strangers pile up.</>,
      <>Reply with your <b>BuyAMinute invite link</b>. One paste, or blast the whole queue.</>,
      <>They book, you set the rate, <b>the meter does the rest.</b></>,
    ],
    kickLead: "They wanted access for free. ",
    kickAccent: "Now access has a price.",
  },
  {
    id: "2",
    num: "02",
    title: "Comment Drop",
    blurb:
      "Drop your invite link wherever your audience already is. One comment. Multiple offers.",
    eyebrow: "Tactic 02 \u00b7 Comment Drop",
    headLead: "Your audience is already gathered. ",
    headAccent: "Drop the link where they\u2019re standing.",
    intro: (
      <>
        You don&rsquo;t need a bigger following or a new platform. The comment
        section under your last post is a room full of people who already showed
        up. Your bio is a door thousands walk past every day.{" "}
        <b>One link turns either into offers.</b>
      </>
    ),
    chips: ["Post comments", "Pinned comment", "Bio link", "Story", "Newsletter"],
    second: (
      <>
        It&rsquo;s one action with no expiry. The comment sits there. The link
        keeps working while you sleep, while you post, while you do nothing at
        all.
      </>
    ),
    steps: [
      <>Drop your invite link in a <b>comment, caption, or bio</b> &mdash; wherever your people already are.</>,
      <>Anyone who taps it can <b>send you a paid call offer</b> on the spot.</>,
      <>Take the ones worth taking. <b>Ignore the rest, no cost.</b></>,
    ],
    kickLead: "One comment. ",
    kickAccent: "Multiple offers.",
  },
  {
    id: "3",
    num: "03",
    title: "Cold Invite",
    blurb:
      "Reach out to anyone cold. The payment offer does the convincing \u2014 it signals you're serious.",
    eyebrow: "Tactic 03 \u00b7 Cold Invite",
    headLead: "A cold message asks for something. ",
    headAccent: "A paid invitation offers something.",
    intro: (
      <>
        Reaching someone who&rsquo;s never heard of you is usually a coin flip.
        Attach a rate and the whole exchange inverts &mdash; you&rsquo;re not
        begging for a minute, you&rsquo;re{" "}
        <b>opening a line and naming its price.</b> That reads as confidence, and
        confidence gets opened.
      </>
    ),
    chips: ["Prospects", "Collaborators", "Leads", "Old contacts", "Anyone, cold"],
    second: (
      <>
        It costs you nothing to send. There&rsquo;s no pitch to write, no
        calendar to negotiate, no follow-up to chase. The number does the
        talking.
      </>
    ),
    steps: [
      <>Pick anyone &mdash; <b>a client you want, a lead, a name on a list.</b></>,
      <>Send the invite with <b>your rate attached.</b> No pitch required.</>,
      <>They accept and pay, or they don&rsquo;t. <b>Either way it cost you one message.</b></>,
    ],
    kickLead: "The payment offer ",
    kickAccent: "does the convincing.",
  },
];

const TICKS = [1, 25, 100, 250, 500];

/* ── Console shortcuts (logged-in sellers) ────────────────
 * TODO: confirm these routes against your app. Only /browse and /signup are
 * verified from the existing pages; the rest are placeholders — swap them for
 * your real seller paths (receiver dashboard, invite composer, wallet, etc).
 */
type Shortcut = { label: string; hint: string; route: string; icon: string };
const SHORTCUTS: Shortcut[] = [
  { label: "Go live", hint: "Set your rate \u00b7 open your line", route: "/receiver", icon: "\u25C9" },
  { label: "Send an invite", hint: "Paid call invitation \u00b7 anyone", route: "/invite", icon: "+" },
  { label: "Call requests", hint: "Who wants you on the line", route: "/requests", icon: "\u25A3" },
  { label: "My earnings", hint: "Balance \u00b7 payouts \u00b7 withdraw", route: "/wallet", icon: "\u25CE" },
  { label: "Browse live", hint: "See who else is on the line", route: "/browse", icon: "\u25C8" },
];

function fmtClock(s: number) {
  const m = Math.floor(s / 60);
  const x = s % 60;
  return "00:" + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0");
}
function money(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type ModalId = "1" | "2" | "3" | "live" | "calc" | "console" | null;

export default function SellerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth() as Record<string, unknown>;
  const expired = Boolean(auth.expired);

  /* Robust logged-in detection: the AuthProvider only surfaced `expired` where
     we could see it, so check every common session field. If yours uses a name
     outside this list, replace the whole expression with that one field. */
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

  const goSignup = () => router.push("/signup");
  const goLogin = () => router.push(buildAuthRedirect({ pathname, expired }));

  /* Logged-out clicks on gated actions fall back to signup. */
  const gated = useCallback(
    (route: string) => {
      router.push(loggedIn ? route : "/signup");
    },
    [loggedIn, router],
  );

  /* ── meter ── */
  const [rate, setRate] = useState(12);
  const [secs, setSecs] = useState(START_SECS);

  const setRateClamped = useCallback((v: number) => {
    setRate(Math.max(RATE_MIN, Math.min(RATE_MAX, Math.round(v))));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* earnings are DERIVED, never accumulated — changing the rate
     reprices the whole call instantly. */
  const earned = (secs / 60) * rate;
  const perSec = rate / 60;
  const elapsed = secs - START_SECS;

  /* ── drag the rate figure ── */
  const dragRef = useRef<{ on: boolean; x: number; r: number }>({
    on: false,
    x: 0,
    r: 12,
  });
  const onRateDown = (clientX: number) => {
    dragRef.current = { on: true, x: clientX, r: rate };
  };
  useEffect(() => {
    const move = (x: number) => {
      if (!dragRef.current.on) return;
      setRateClamped(dragRef.current.r + (x - dragRef.current.x) / 3);
    };
    const onMove = (e: MouseEvent) => move(e.clientX);
    const onTouch = (e: TouchEvent) => {
      if (dragRef.current.on) move(e.touches[0].clientX);
    };
    const onUp = () => {
      dragRef.current.on = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onUp);
    };
  }, [setRateClamped]);

  /* ── modals ── */
  const [modal, setModal] = useState<ModalId>(null);
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  /* ── console (command palette) — logged-in only ── */
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
    setModal("console");
  };
  const runShortcut = useCallback(
    (s: Shortcut) => {
      setModal(null);
      router.push(s.route);
    },
    [router],
  );

  useEffect(() => {
    if (modal !== "console") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
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
  }, [modal, filtered, active, runShortcut]);

  /* ⌘K / Ctrl+K opens the console for logged-in sellers */
  useEffect(() => {
    if (!loggedIn) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setActive(0);
        setModal("console");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loggedIn]);

  /* ── earn calculator ── */
  const [cRate, setCRate] = useState(8);
  const [cMin, setCMin] = useState(30);
  const [cDays, setCDays] = useState(5);
  const monthly = Math.round(cRate * cMin * cDays * 4.33);

  const openTactic = TACTICS.find((t) => t.id === modal);

  return (
    <div className={`sel-root ${playfair.variable}`}>
      <style>{`
        .sel-root{background:#050403;color:#f4ead2;font-family:var(--font-playfair-sel),Georgia,serif;position:relative;overflow:hidden;min-height:100vh}
        .sel-root *{box-sizing:border-box}
        @keyframes sel-pulse{0%,100%{opacity:.45;transform:scale(.9)}50%{opacity:1;transform:scale(1.35)}}
        @keyframes sel-ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.6);opacity:0}}
        @keyframes sel-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes sel-drift{0%,100%{transform:translate(0,0)}50%{transform:translate(14px,-12px)}}
        @keyframes sel-fire{0%{transform:translateX(0);opacity:1}100%{transform:translateX(26px);opacity:0}}
        @keyframes sel-land{0%{transform:translateY(-8px);opacity:0}100%{transform:translateY(0);opacity:1}}
        @keyframes sel-ov{from{opacity:0}to{opacity:1}}
        @keyframes sel-pop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}

        .sel-grain{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:.15;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E")}
        .sel-dot{width:7px;height:7px;border-radius:50%;display:inline-block;animation:sel-pulse 1.4s ease-in-out infinite;flex-shrink:0}
        .sel-ring{position:relative;display:inline-grid;place-items:center;width:7px;height:7px;flex-shrink:0}
        .sel-ring::after{content:'';position:absolute;inset:0;border-radius:50%;border:1px solid currentColor;animation:sel-ring 1.8s ease-out infinite}
        .sel-glow{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0;animation:sel-drift 14s ease-in-out infinite}
        .sel-big{position:absolute;font-style:italic;font-weight:700;color:#e9b949;opacity:.09;line-height:.85;pointer-events:none;user-select:none;z-index:0}
        .sel-metal{background:linear-gradient(175deg,#fff3c4 0%,#ffd75e 26%,#e9b949 55%,#a8791f 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}

        .sel-body{position:relative;z-index:1;padding:24px 20px 44px}
        .sel-mark{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:10px;flex-wrap:wrap}
        .sel-eye{display:inline-flex;align-items:center;gap:10px;font-family:ui-monospace,'SF Mono',monospace;font-size:10px;letter-spacing:.28em;text-transform:uppercase;font-weight:600;color:#ffcf4d}
        .sel-chap{font-family:ui-monospace,'SF Mono',monospace;font-size:10px;letter-spacing:.28em;color:rgba(244,234,210,.4)}
        .sel-chap b{color:rgba(244,234,210,.8);font-weight:400}
        .sel-grid{display:grid;grid-template-columns:1fr;gap:32px}

        .sel-hero{font-weight:400;font-size:clamp(38px,8.4vw,58px);line-height:1.02;letter-spacing:-.032em;margin:0;font-style:italic}
        .sel-hero .reg{font-style:normal;font-weight:700;text-transform:uppercase;letter-spacing:-.015em;filter:drop-shadow(0 0 26px rgba(233,185,73,.4))}
        .sel-hero .pd{font-style:normal;color:#ffcf4d}
        .sel-sub{font-style:italic;font-size:14.5px;line-height:1.6;color:rgba(244,234,210,.72);margin:16px 0 0;max-width:470px}
        .sel-sub em{color:#ffcf4d;font-weight:600}

        .sel-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin:18px 0 0;border:1px solid rgba(233,185,73,.3);border-radius:12px;overflow:hidden;background:rgba(233,185,73,.14)}
        .sel-fact{background:#0b0806;padding:12px 10px;text-align:center}
        .sel-fact-v{font-style:italic;font-weight:600;font-size:clamp(17px,3.4vw,22px);line-height:1.1;margin-bottom:3px}
        .sel-fact-l{font-family:ui-monospace,monospace;font-size:7.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(244,234,210,.5);line-height:1.4}

        .sel-imagine{font-style:italic;font-size:14px;color:#ffcf4d;margin:20px 0 10px;display:flex;align-items:center;gap:10px}
        .sel-imagine .u{font-weight:700}
        .sel-imagine .ln{flex:1;height:1px;background:linear-gradient(90deg,rgba(233,185,73,.6),transparent)}

        .sel-stack{position:relative}
        .sel-ghost{position:absolute;left:0;right:0;border-radius:20px;border:1px solid rgba(233,185,73,.16);background:#0a0805;pointer-events:none;height:100%}
        .sel-ghost.g1{top:10px;transform:scale(.968);opacity:.5;filter:blur(1px)}
        .sel-ghost.g2{top:20px;transform:scale(.936);opacity:.24;filter:blur(2px)}
        .sel-clock{position:relative;background:linear-gradient(180deg,#1a1409,#0b0806);border:1px solid rgba(233,185,73,.5);border-radius:20px;padding:18px;box-shadow:0 26px 70px rgba(0,0,0,.65),0 0 60px rgba(233,185,73,.09),inset 0 1px 0 rgba(255,215,94,.16);overflow:hidden;z-index:3}
        .sel-clock::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 72% 8%,rgba(255,207,77,.14),transparent 58%);pointer-events:none}
        .sel-clock>*{position:relative;z-index:1}
        .sel-ct{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
        .sel-conn{display:inline-flex;align-items:center;gap:9px;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#00ff88;font-weight:600}
        .sel-clockt{font-family:ui-monospace,monospace;font-size:13px;color:#ffcf4d;letter-spacing:.06em}
        .sel-caller{display:flex;align-items:center;gap:12px;margin-bottom:14px}
        .sel-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3d2a12,#1a130a);border:1px solid rgba(233,185,73,.7);display:grid;place-items:center;font-style:italic;font-size:21px;color:#ffcf4d;flex-shrink:0;box-shadow:0 0 24px rgba(233,185,73,.22)}
        .sel-cname{font-style:italic;font-size:18px;letter-spacing:-.02em}
        .sel-csub{font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(244,234,210,.42);margin-top:2px}

        .sel-inst{border:1px solid rgba(233,185,73,.42);border-radius:14px;background:linear-gradient(180deg,rgba(233,185,73,.09),rgba(0,0,0,.3));padding:12px 13px;margin-bottom:13px}
        .sel-inst-t{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;gap:8px}
        .sel-inst-l{font-family:ui-monospace,monospace;font-size:8px;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,207,77,.8);display:inline-flex;align-items:center;gap:6px}
        .sel-nocap{font-family:ui-monospace,monospace;font-size:7.5px;letter-spacing:.14em;text-transform:uppercase;color:#00ff88;border:1px solid rgba(0,255,136,.45);background:rgba(0,255,136,.08);border-radius:5px;padding:2px 6px;white-space:nowrap}
        .sel-inst-r{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .sel-step{width:30px;height:30px;border-radius:9px;border:1px solid rgba(233,185,73,.4);background:rgba(233,185,73,.06);color:#ffcf4d;font-family:ui-monospace,monospace;font-size:15px;cursor:pointer;display:grid;place-items:center;transition:all .15s;flex-shrink:0;user-select:none}
        .sel-step:hover{background:rgba(233,185,73,.2);border-color:#e9b949;box-shadow:0 0 16px rgba(233,185,73,.35)}
        .sel-step:active{transform:scale(.92)}
        .sel-ratebig{flex:1;text-align:center;font-style:italic;font-weight:600;font-size:clamp(26px,5.4vw,34px);line-height:1.3;padding-bottom:2px;cursor:ew-resize;letter-spacing:-.01em;user-select:none;touch-action:none}
        .sel-ratebig .un{font-size:.42em;font-weight:400;color:rgba(244,234,210,.5);-webkit-text-fill-color:rgba(244,234,210,.5);margin-left:3px}
        .sel-slider{width:100%;-webkit-appearance:none;appearance:none;height:5px;border-radius:3px;background:linear-gradient(90deg,#ffd75e,#e9b949 40%,rgba(233,185,73,.12));outline:none;display:block}
        .sel-slider::-webkit-slider-thumb{-webkit-appearance:none;width:19px;height:19px;border-radius:50%;background:linear-gradient(180deg,#fff3c4,#e9b949);cursor:grab;box-shadow:0 0 20px rgba(255,207,77,.8)}
        .sel-slider::-moz-range-thumb{width:19px;height:19px;border-radius:50%;background:linear-gradient(180deg,#fff3c4,#e9b949);cursor:grab;border:0;box-shadow:0 0 20px rgba(255,207,77,.8)}
        .sel-ticks{display:flex;justify-content:space-between;margin-top:6px}
        .sel-tick{font-family:ui-monospace,monospace;font-size:7px;letter-spacing:.08em;color:rgba(244,234,210,.32);cursor:pointer;padding:2px 4px;border-radius:4px;transition:all .15s;background:none;border:0}
        .sel-tick:hover{color:#ffcf4d;background:rgba(233,185,73,.12)}

        .sel-earnbox{background:radial-gradient(ellipse at 50% 120%,rgba(233,185,73,.13),rgba(0,0,0,.55) 70%);border:1px solid rgba(233,185,73,.35);border-radius:16px;padding:16px 12px 18px;text-align:center;margin-bottom:13px;position:relative;overflow:visible}
        .sel-earnbox::after{content:'';position:absolute;top:0;left:12%;right:12%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,94,.7),transparent)}
        .sel-earnlbl{font-style:italic;font-size:9.5px;letter-spacing:.34em;text-transform:uppercase;color:rgba(255,207,77,.78);margin-bottom:6px}
        .sel-earnval{font-style:italic;font-weight:500;font-size:clamp(40px,8.4vw,62px);line-height:1.24;letter-spacing:-.015em;padding:0 4px 4px;overflow:visible;filter:drop-shadow(0 0 26px rgba(233,185,73,.4))}
        .sel-cur{display:inline-block;width:3px;height:.62em;background:#ffd75e;margin-left:4px;animation:sel-blink 1.1s step-end infinite;box-shadow:0 0 12px #ffd75e;vertical-align:baseline}
        .sel-earnsec{font-style:italic;font-size:11px;color:rgba(255,207,77,.6);margin-top:2px;letter-spacing:.08em}

        .sel-cbtns{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-bottom:11px}
        .sel-cbtn{height:44px;border-radius:13px;display:grid;place-items:center;cursor:pointer;border:1px solid;transition:all .2s;background:none}
        .sel-cbtn svg{width:19px;height:19px;fill:none;stroke-width:1.6}
        .sel-cbtn.m{background:rgba(244,234,210,.04);border-color:rgba(244,234,210,.16)}
        .sel-cbtn.m:hover{background:rgba(233,185,73,.1);border-color:rgba(233,185,73,.5)}
        .sel-cbtn.m svg{stroke:rgba(244,234,210,.8)}
        .sel-cbtn.e{background:rgba(255,60,60,.12);border-color:rgba(255,60,60,.5)}
        .sel-cbtn.e svg{stroke:#ff6b6b}
        .sel-cfoot{text-align:center;font-style:italic;font-size:11.5px;color:rgba(244,234,210,.5)}

        .sel-live-btn{display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:18px;padding:15px 16px;border-radius:14px;border:1px solid rgba(0,255,136,.45);background:linear-gradient(90deg,rgba(0,255,136,.1),rgba(0,255,136,.02));cursor:pointer;font-family:inherit;transition:all .2s;gap:10px}
        .sel-live-btn:hover{border-color:#00ff88;transform:translateY(-2px);box-shadow:0 0 40px rgba(0,255,136,.16)}
        .sel-live-l{display:inline-flex;align-items:center;gap:10px;font-family:ui-monospace,monospace;font-size:10.5px;letter-spacing:.1em;color:#00ff88;text-transform:uppercase;text-align:left;font-weight:500}
        .sel-live-count{min-width:23px;height:23px;padding:0 5px;border-radius:999px;background:rgba(0,255,136,.18);border:1px solid rgba(0,255,136,.6);display:inline-grid;place-items:center;font-size:10px;color:#00ff88;flex-shrink:0}
        .sel-live-r{font-family:ui-monospace,monospace;font-size:14px;color:#00ff88}

        .sel-edge-eye{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#ffcf4d;margin-bottom:15px;display:inline-flex;align-items:center;gap:9px;font-weight:600}
        .sel-edge-h{font-style:italic;font-weight:400;font-size:clamp(24px,3.3vw,34px);line-height:1.16;letter-spacing:-.025em;margin:0 0 14px}
        .sel-edge-h em{font-weight:700;font-style:italic}
        .sel-edge-p{font-style:italic;font-size:14px;line-height:1.68;color:rgba(244,234,210,.72);margin:0 0 8px;max-width:520px}
        .sel-edge-p b{color:#ffcf4d;font-weight:700}

        .sel-dcard{border:1px solid rgba(233,185,73,.28);border-radius:14px;padding:14px;margin-top:12px;background:linear-gradient(180deg,rgba(233,185,73,.05),transparent);transition:all .2s;cursor:pointer;font-family:inherit;text-align:left;width:100%;display:block;position:relative}
        .sel-dcard:hover{border-color:rgba(233,185,73,.6);background:linear-gradient(180deg,rgba(233,185,73,.1),transparent);box-shadow:0 0 34px rgba(233,185,73,.07);transform:translateY(-2px)}
        .sel-dh{display:flex;align-items:center;gap:9px;margin-bottom:5px}
        .sel-dnum{font-family:ui-monospace,monospace;font-size:8px;color:#ffcf4d;width:22px;height:22px;border:1px solid rgba(233,185,73,.5);border-radius:6px;display:grid;place-items:center;background:rgba(233,185,73,.1);flex-shrink:0}
        .sel-dt{font-style:italic;font-size:17px;letter-spacing:-.01em;flex:1;color:#f4ead2}
        .sel-more{font-family:ui-monospace,monospace;font-size:7px;letter-spacing:.14em;text-transform:uppercase;color:rgba(233,185,73,.5);border:1px solid rgba(233,185,73,.25);border-radius:5px;padding:3px 6px;transition:all .2s;flex-shrink:0}
        .sel-dcard:hover .sel-more{color:#ffcf4d;border-color:rgba(233,185,73,.7);background:rgba(233,185,73,.12)}
        .sel-dp{font-size:12.5px;line-height:1.55;color:rgba(244,234,210,.6);margin-bottom:11px}
        .sel-demo{background:rgba(0,0,0,.45);border:1px solid rgba(244,234,210,.07);border-radius:9px;padding:9px 10px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-height:38px}
        .sel-av2{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#2a1d10,#0f0b06);border:1px solid rgba(233,185,73,.45);display:grid;place-items:center;font-style:italic;font-size:10px;color:#ffcf4d;flex-shrink:0}
        .sel-chip{font-family:ui-monospace,monospace;font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;padding:3px 6px;border-radius:5px;border:1px solid rgba(233,185,73,.4);background:rgba(233,185,73,.1);color:#ffcf4d}
        .sel-chip.g{border-color:rgba(0,255,136,.45);background:rgba(0,255,136,.1);color:#00ff88}
        .sel-chip.fire{animation:sel-fire 1.6s ease-out infinite}
        .sel-chip.land{animation:sel-land 3.2s ease-out infinite}
        .sel-chip.land.d2{animation-delay:.4s}
        .sel-mini{font-style:italic;font-size:11px;color:rgba(244,234,210,.55);flex:1;min-width:90px}

        .sel-ctas{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:24px}
        .sel-cta{padding:16px;border-radius:14px;text-align:left;cursor:pointer;font-family:inherit;border:1px solid;transition:all .2s}
        .sel-cta:hover{transform:translateY(-3px)}
        .sel-cta.gold{background:linear-gradient(180deg,rgba(233,185,73,.26),rgba(233,185,73,.05));border-color:#e9b949;box-shadow:0 12px 34px rgba(233,185,73,.16),inset 0 1px 0 rgba(255,215,94,.25)}
        .sel-cta.ghost{border-color:rgba(244,234,210,.2);background:rgba(244,234,210,.025);border-style:dashed}
        .sel-cta.ghost:hover{border-color:rgba(233,185,73,.6)}
        .sel-ck{font-family:ui-monospace,monospace;font-size:8px;letter-spacing:.24em;text-transform:uppercase;display:block;margin-bottom:7px}
        .sel-cta.gold .sel-ck{color:#ffcf4d}
        .sel-cta.ghost .sel-ck{color:rgba(244,234,210,.55)}
        .sel-cl{font-style:italic;font-size:18px;letter-spacing:-.02em;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
        .sel-cta.gold .sel-cl{color:#ffdf7a}
        .sel-cta.ghost .sel-cl{color:#f4ead2}
        .sel-ca{font-family:ui-monospace,monospace;font-style:normal;opacity:.7}
        .sel-cta.full{grid-column:1/-1}
        .sel-kbd{font-size:11px;letter-spacing:.08em;border:1px solid rgba(233,185,73,.4);border-radius:6px;padding:3px 7px;opacity:1}

        /* command palette */
        .sel-pal{width:100%;max-width:520px;background:linear-gradient(180deg,#100c07,#06050a);border:1px solid rgba(233,185,73,.4);border-radius:18px;box-shadow:0 40px 100px rgba(0,0,0,.75);animation:sel-pop .24s cubic-bezier(.2,.8,.2,1);overflow:hidden;margin:auto}
        .sel-pal-s{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid rgba(233,185,73,.2)}
        .sel-pal-ic{color:rgba(255,207,77,.8);font-family:ui-monospace,monospace;font-size:14px}
        .sel-pal-in{flex:1;background:none;border:0;outline:0;color:#f4ead2;font-family:var(--font-playfair-sel),Georgia,serif;font-style:italic;font-size:18px;letter-spacing:-.01em}
        .sel-pal-in::placeholder{color:rgba(244,234,210,.35)}
        .sel-pal-esc{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.16em;color:rgba(244,234,210,.4);border:1px solid rgba(244,234,210,.15);border-radius:5px;padding:3px 7px;text-transform:uppercase}
        .sel-pal-l{padding:8px;max-height:56vh;overflow-y:auto}
        .sel-pal-i{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:12px;cursor:pointer;border:1px solid transparent;background:none;width:100%;text-align:left;font-family:inherit;transition:background .12s,border-color .12s}
        .sel-pal-i:hover,.sel-pal-i.on{background:rgba(233,185,73,.1);border-color:rgba(233,185,73,.3)}
        .sel-pal-ii{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;font-family:ui-monospace,monospace;font-size:15px;color:#ffcf4d;background:rgba(233,185,73,.1);border:1px solid rgba(233,185,73,.35);flex-shrink:0}
        .sel-pal-lab{font-style:italic;font-size:17px;color:#f4ead2;letter-spacing:-.01em;line-height:1.2;display:block}
        .sel-pal-h{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.08em;color:rgba(244,234,210,.42);text-transform:uppercase;margin-top:2px;display:block}
        .sel-pal-e{margin-left:auto;font-family:ui-monospace,monospace;font-size:10px;color:rgba(255,207,77,.7);opacity:0;transition:opacity .12s}
        .sel-pal-i.on .sel-pal-e{opacity:1}
        .sel-pal-none{padding:28px 18px;text-align:center;font-style:italic;font-size:14px;color:rgba(244,234,210,.4)}
        .sel-pal-f{padding:11px 16px;border-top:1px solid rgba(233,185,73,.16);display:flex;justify-content:space-between;font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.14em;color:rgba(244,234,210,.4);text-transform:uppercase}

        .sel-ov{position:fixed;inset:0;z-index:9999;background:rgba(2,2,2,.88);backdrop-filter:blur(12px);display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;animation:sel-ov .2s ease;overflow-y:auto}
        .sel-modal{width:100%;max-width:560px;background:linear-gradient(180deg,#100c07,#06050a);border:1px solid rgba(233,185,73,.35);border-radius:24px;padding:28px;box-shadow:0 40px 100px rgba(0,0,0,.75);animation:sel-pop .28s cubic-bezier(.2,.8,.2,1);position:relative;margin:auto}
        .sel-mclose{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;background:rgba(244,234,210,.06);border:1px solid rgba(244,234,210,.14);color:rgba(244,234,210,.7);font-size:16px;cursor:pointer;display:grid;place-items:center;z-index:2;font-family:ui-monospace,monospace}
        .sel-mclose:hover{background:rgba(244,234,210,.14)}
        .sel-meye{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:#ffcf4d;margin-bottom:12px;display:inline-flex;align-items:center;gap:9px;font-weight:600}
        .sel-mh{font-style:italic;font-weight:400;font-size:clamp(22px,4.2vw,30px);letter-spacing:-.025em;margin:0 0 16px;line-height:1.16;color:#f4ead2}
        .sel-mh em{font-weight:700;font-style:italic}
        .sel-mp{font-style:italic;font-size:14px;line-height:1.68;color:rgba(244,234,210,.7);margin:0 0 14px}
        .sel-mp b{color:#ffcf4d;font-weight:700}
        .sel-plat{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 18px}
        .sel-pchip{font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;padding:5px 9px;border-radius:7px;border:1px solid rgba(233,185,73,.35);background:rgba(233,185,73,.07);color:rgba(255,207,77,.9)}
        .sel-steps{border-top:1px solid rgba(233,185,73,.25);margin-bottom:18px}
        .sel-st{display:grid;grid-template-columns:auto 1fr;gap:13px;padding:13px 0;border-bottom:1px solid rgba(233,185,73,.1);align-items:start}
        .sel-stn{font-family:ui-monospace,monospace;font-size:8px;color:#ffcf4d;width:22px;height:22px;border:1px solid rgba(233,185,73,.45);border-radius:50%;display:grid;place-items:center;background:rgba(233,185,73,.08);flex-shrink:0;margin-top:1px}
        .sel-stt{font-size:13.5px;line-height:1.55;color:rgba(244,234,210,.78)}
        .sel-stt b{color:#f4ead2;font-weight:600;font-style:italic}
        .sel-kick{font-style:italic;font-weight:500;font-size:17px;line-height:1.4;padding:14px 16px;background:rgba(233,185,73,.09);border-left:3px solid #e9b949;border-radius:0 8px 8px 0;color:#f4ead2;margin-bottom:18px}
        .sel-kick .g{font-weight:700}
        .sel-mcta{width:100%;padding:15px;border-radius:13px;border:1px solid #e9b949;background:linear-gradient(180deg,rgba(233,185,73,.26),rgba(233,185,73,.05));cursor:pointer;font-family:inherit;font-style:italic;font-size:17px;color:#ffdf7a;display:flex;justify-content:space-between;align-items:center;transition:all .2s}
        .sel-mcta:hover{background:linear-gradient(180deg,rgba(233,185,73,.36),rgba(233,185,73,.1));transform:translateY(-2px)}
        .sel-mcta .ar{font-family:ui-monospace,monospace;font-style:normal;font-size:14px}

        .sel-pc{border-radius:18px;padding:16px;border:1px solid;background:#0a0805}
        .sel-pc-t{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px;gap:8px}
        .sel-tag{display:inline-flex;align-items:center;gap:7px;font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.16em;text-transform:uppercase;padding:5px 9px;border-radius:999px;font-weight:600}
        .sel-ptime{font-family:ui-monospace,monospace;font-size:12px;color:#ffcf4d}
        .sel-pc-c{display:flex;align-items:center;gap:12px;margin-bottom:13px}
        .sel-pav{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-style:italic;font-size:21px;flex-shrink:0}
        .sel-ph{font-style:italic;font-size:18px;color:#f4ead2;margin-bottom:3px}
        .sel-pl{font-size:12px;color:rgba(244,234,210,.75)}
        .sel-pl .lb{color:rgba(244,234,210,.5)}
        .sel-pl b{color:#ffcf4d;font-weight:600}
        .sel-pe{background:radial-gradient(ellipse at 50% 130%,rgba(233,185,73,.1),rgba(0,0,0,.55) 70%);border:1px solid rgba(233,185,73,.28);border-radius:14px;padding:15px 12px;text-align:center}
        .sel-pel{font-style:italic;font-size:8.5px;letter-spacing:.32em;text-transform:uppercase;color:rgba(255,207,77,.7);margin-bottom:7px}
        .sel-pev{font-style:italic;font-weight:500;font-size:clamp(28px,6vw,38px);line-height:1.24;padding-bottom:3px}
        .sel-pes{font-style:italic;font-size:10px;color:rgba(255,207,77,.55)}

        .sel-cr{margin-bottom:13px}
        .sel-cr-top{display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:7px;color:rgba(244,234,210,.6);font-family:ui-monospace,monospace;letter-spacing:.06em}
        .sel-cr-top .v{color:#00ff88}
        .sel-slider.grn{background:linear-gradient(90deg,#00ff88,rgba(0,255,136,.12))}
        .sel-slider.grn::-webkit-slider-thumb{background:linear-gradient(180deg,#c4ffe0,#00ff88);box-shadow:0 0 18px rgba(0,255,136,.7)}
        .sel-slider.grn::-moz-range-thumb{background:linear-gradient(180deg,#c4ffe0,#00ff88);box-shadow:0 0 18px rgba(0,255,136,.7)}
        .sel-result{margin-top:18px;padding:18px;background:radial-gradient(ellipse at 50% 130%,rgba(0,255,136,.12),rgba(0,255,136,.02) 70%);border:1px solid rgba(0,255,136,.4);border-radius:14px;text-align:center}
        .sel-result-l{font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.22em;text-transform:uppercase;color:rgba(0,255,136,.8);margin-bottom:6px}
        .sel-result-v{font-family:ui-monospace,monospace;font-size:36px;font-weight:600;color:#00ff88;letter-spacing:-.02em;text-shadow:0 0 30px rgba(0,255,136,.45)}
        .sel-result-s{font-size:11px;font-style:italic;color:rgba(244,234,210,.5);margin-top:6px}

        @media(min-width:900px){
          .sel-body{padding:30px 44px 56px}
          .sel-grid{grid-template-columns:1fr 1fr;gap:48px;align-items:start}
          .sel-hero{font-size:clamp(44px,4.3vw,58px)}
          .sel-big{font-size:clamp(320px,28vw,460px);top:-40px;right:-3%}
          .sel-right{border-left:1px solid rgba(233,185,73,.3);padding-left:40px}
        }
        @media(max-width:899px){
          .sel-big{font-size:clamp(190px,42vw,300px);top:-8px;right:-8%;opacity:.07}
          .sel-right{margin-top:6px;padding-top:28px;border-top:1px solid rgba(233,185,73,.3)}
        }
        @media(max-width:400px){.sel-ctas{grid-template-columns:1fr}}
      `}</style>

      <div className="sel-glow" style={{ width: "min(620px,86vw)", height: "min(620px,86vw)", background: "rgba(233,185,73,.16)", top: "4%", left: "-16%" }} />
      <div className="sel-glow" style={{ width: "min(460px,68vw)", height: "min(460px,68vw)", background: "rgba(0,255,136,.06)", bottom: "4%", right: "-12%", animationDelay: "-7s" }} />
      <div className="sel-big">$</div>
      <div className="sel-grain" />

      <div className="sel-body">
        <div className="sel-mark">
          <span className="sel-eye">
            <span className="sel-ring" style={{ color: "#e9b949" }}>
              <span className="sel-dot" style={{ background: "#ffcf4d", boxShadow: "0 0 16px #e9b949" }} />
            </span>
            Your line &middot; your price
          </span>
          <span className="sel-chap"><b>00</b> &middot; For sellers</span>
        </div>

        <div className="sel-grid">
          {/* ══════ LEFT — the fantasy ══════ */}
          <div className="sel-left">
            <h1 className="sel-hero">
              Your phone is now a{" "}
              <span className="reg sel-metal">cash register</span>
              <span className="pd">.</span>
            </h1>
            <p className="sel-sub">
              Get paid by fans, friends, or anyone who wants a voice or video
              call with you. You set the rate. <em>Every second has a price.</em>
            </p>

            <div className="sel-facts">
              <div className="sel-fact">
                <div className="sel-fact-v sel-metal">No cap</div>
                <div className="sel-fact-l">$1 &rarr; $500+/min<br />you name it</div>
              </div>
              <div className="sel-fact">
                <div className="sel-fact-v sel-metal">Per second</div>
                <div className="sel-fact-l">no hourly blocks<br />no rounding up</div>
              </div>
              <div className="sel-fact">
                <div className="sel-fact-v sel-metal">Free to list</div>
                <div className="sel-fact-l">no subscription<br />withdraw anytime</div>
              </div>
            </div>

            <div className="sel-imagine">
              Imagine you are <span className="u">@alex_r</span>
              <span className="ln" />
            </div>

            <div className="sel-stack">
              <div className="sel-ghost g2" />
              <div className="sel-ghost g1" />
              <div className="sel-clock">
                <div className="sel-ct">
                  <span className="sel-conn">
                    <span className="sel-ring" style={{ color: "#00ff88" }}>
                      <span className="sel-dot" style={{ background: "#00ff88", boxShadow: "0 0 12px #00ff88" }} />
                    </span>
                    Connected
                  </span>
                  <span className="sel-clockt">{fmtClock(secs)}</span>
                </div>

                <div className="sel-caller">
                  <div className="sel-avatar">A</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sel-cname">@alex_r</div>
                    <div className="sel-csub">Incoming &middot; video</div>
                  </div>
                </div>

                {/* rate instrument */}
                <div className="sel-inst">
                  <div className="sel-inst-t">
                    <span className="sel-inst-l">
                      <span className="sel-dot" style={{ background: "#ffcf4d", width: 5, height: 5 }} />
                      Your rate &mdash; drag it
                    </span>
                    <span className="sel-nocap">No cap</span>
                  </div>
                  <div className="sel-inst-r">
                    <button className="sel-step" onClick={() => setRateClamped(rate - 1)} aria-label="Lower rate">&minus;</button>
                    <div
                      className="sel-ratebig sel-metal"
                      onMouseDown={(e) => onRateDown(e.clientX)}
                      onTouchStart={(e) => onRateDown(e.touches[0].clientX)}
                      role="slider"
                      aria-valuenow={rate}
                      aria-valuemin={RATE_MIN}
                      aria-valuemax={RATE_MAX}
                      tabIndex={0}
                    >
                      ${rate}
                      <span className="un">/min</span>
                    </div>
                    <button className="sel-step" onClick={() => setRateClamped(rate + 1)} aria-label="Raise rate">+</button>
                  </div>
                  <input
                    className="sel-slider"
                    type="range"
                    min={RATE_MIN}
                    max={RATE_MAX}
                    value={rate}
                    onChange={(e) => setRateClamped(Number(e.target.value))}
                    aria-label="Rate per minute"
                  />
                  <div className="sel-ticks">
                    {TICKS.map((t) => (
                      <button key={t} className="sel-tick" onClick={() => setRateClamped(t)}>
                        ${t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sel-earnbox">
                  <div className="sel-earnlbl">Your earnings &middot; this call</div>
                  <div className="sel-earnval sel-metal">
                    ${money(earned)}
                    <span className="sel-cur" />
                  </div>
                  <div className="sel-earnsec">
                    +${perSec.toFixed(2)} / sec &middot; straight to your wallet
                  </div>
                </div>

                <div className="sel-cbtns">
                  <button className="sel-cbtn m" aria-label="Mute">
                    <svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
                  </button>
                  <button className="sel-cbtn m" aria-label="Video">
                    <svg viewBox="0 0 24 24"><rect x="2" y="6" width="14" height="12" rx="2" /><path d="M22 8l-6 4 6 4V8z" /></svg>
                  </button>
                  <button className="sel-cbtn e" aria-label="End call">
                    <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </button>
                </div>
                <div className="sel-cfoot">Either side hangs up &middot; meter stops</div>
              </div>
            </div>

            <button className="sel-live-btn" onClick={() => setModal("live")}>
              <span className="sel-live-l">
                <span className="sel-live-count">{PERSONAS.length}</span>
                See other sellers earning right now
              </span>
              <span className="sel-live-r">&rarr;</span>
            </button>
          </div>

          {/* ══════ RIGHT — the mechanism ══════ */}
          <div className="sel-right">
            <span className="sel-edge-eye">
              <span className="sel-ring" style={{ color: "#e9b949" }}>
                <span className="sel-dot" style={{ background: "#ffcf4d", boxShadow: "0 0 14px #e9b949" }} />
              </span>
              The seller&rsquo;s edge
            </span>
            <h2 className="sel-edge-h">
              You don&rsquo;t wait or hope someone calls. You{" "}
              <em className="sel-metal">generate your own demand.</em>
            </h2>
            <p className="sel-edge-p">
              Most platforms make you passive. You post, you hope, you wait.{" "}
              <b>BuyAMinute is different.</b> As a seller you send a paid call
              invitation to anyone, anywhere &mdash; and the money does the
              convincing.
            </p>

            {/* 01 — DM Blast */}
            <button className="sel-dcard" onClick={() => setModal("1")}>
              <div className="sel-dh">
                <span className="sel-dnum">01</span>
                <span className="sel-dt">DM Blast</span>
                <span className="sel-more">How it works &rarr;</span>
              </div>
              <div className="sel-dp">{TACTICS[0].blurb}</div>
              <div className="sel-demo">
                <span className="sel-av2">J</span>
                <span className="sel-av2">K</span>
                <span className="sel-av2">R</span>
                <span className="sel-mini">142 in queue</span>
                <span className="sel-chip fire">Invite &rarr;</span>
              </div>
            </button>

            {/* 02 — Comment Drop */}
            <button className="sel-dcard" onClick={() => setModal("2")}>
              <div className="sel-dh">
                <span className="sel-dnum">02</span>
                <span className="sel-dt">Comment Drop</span>
                <span className="sel-more">How it works &rarr;</span>
              </div>
              <div className="sel-dp">{TACTICS[1].blurb}</div>
              <div className="sel-demo">
                <span className="sel-mini">&ldquo;buyaminute.com/@alex_r&rdquo;</span>
                <span className="sel-chip g land">$40 offer</span>
                <span className="sel-chip g land d2">$25 offer</span>
              </div>
            </button>

            {/* 03 — Cold Invite */}
            <button className="sel-dcard" onClick={() => setModal("3")}>
              <div className="sel-dh">
                <span className="sel-dnum">03</span>
                <span className="sel-dt">Cold Invite</span>
                <span className="sel-more">How it works &rarr;</span>
              </div>
              <div className="sel-dp">{TACTICS[2].blurb}</div>
              <div className="sel-demo">
                <span className="sel-mini">To @stranger &mdash; 10 min?</span>
                <span className="sel-chip">$120 attached</span>
                <span className="sel-chip g">Opened</span>
              </div>
            </button>

            <div className="sel-ctas">
              {loggedIn ? (
                <>
                  <button className="sel-cta gold" onClick={() => gated("/receiver")}>
                    <span className="sel-ck">&#9670; Open your line</span>
                    <span className="sel-cl"><span>Go live now</span><span className="sel-ca">&rarr;</span></span>
                  </button>
                  <button className="sel-cta ghost" onClick={openConsole}>
                    <span className="sel-ck">&#9671; Welcome back</span>
                    <span className="sel-cl"><span>Your console</span><span className="sel-ca sel-kbd">&#8984;K</span></span>
                  </button>
                </>
              ) : (
                <>
                  <button className="sel-cta gold" onClick={goSignup}>
                    <span className="sel-ck">&#9670; Be available</span>
                    <span className="sel-cl"><span>Start earning</span><span className="sel-ca">&rarr;</span></span>
                  </button>
                  <button className="sel-cta ghost" onClick={goLogin}>
                    <span className="sel-ck">&#9671; Returning</span>
                    <span className="sel-cl"><span>Log in</span><span className="sel-ca">&rarr;</span></span>
                  </button>
                </>
              )}
              <button className="sel-cta ghost full" onClick={() => setModal("calc")}>
                <span className="sel-ck">&#9671; Do the math</span>
                <span className="sel-cl"><span>Calculate your potential income</span><span className="sel-ca">&rarr;</span></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ TACTIC MODALS ══════ */}
      {openTactic && (
        <div className="sel-ov" onClick={() => setModal(null)} role="dialog" aria-modal="true">
          <div className="sel-modal" onClick={(e) => e.stopPropagation()}>
            <button className="sel-mclose" onClick={() => setModal(null)} aria-label="Close">&times;</button>
            <div className="sel-meye">
              <span className="sel-dot" style={{ background: "#ffcf4d" }} />
              {openTactic.eyebrow}
            </div>
            <h2 className="sel-mh">
              {openTactic.headLead}
              <em className="sel-metal">{openTactic.headAccent}</em>
            </h2>
            <p className="sel-mp">{openTactic.intro}</p>
            <div className="sel-plat">
              {openTactic.chips.map((c) => (
                <span className="sel-pchip" key={c}>{c}</span>
              ))}
            </div>
            <p className="sel-mp">{openTactic.second}</p>
            <div className="sel-steps">
              {openTactic.steps.map((s, i) => (
                <div className="sel-st" key={i}>
                  <span className="sel-stn">{i + 1}</span>
                  <div className="sel-stt">{s}</div>
                </div>
              ))}
            </div>
            <div className="sel-kick">
              {openTactic.kickLead}
              <span className="g sel-metal">{openTactic.kickAccent}</span>
            </div>
            {loggedIn ? (
              <button className="sel-mcta" onClick={() => gated("/invite")}>
                <span>Send an invite</span>
                <span className="ar">&rarr;</span>
              </button>
            ) : (
              <button className="sel-mcta" onClick={goSignup}>
                <span>Start earning</span>
                <span className="ar">&rarr;</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════ SELLERS LIVE ══════ */}
      {modal === "live" && (
        <div className="sel-ov" onClick={() => setModal(null)} role="dialog" aria-modal="true">
          <div
            className="sel-modal"
            style={{ maxWidth: 620, borderColor: "rgba(0,255,136,.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="sel-mclose" onClick={() => setModal(null)} aria-label="Close">&times;</button>
            <div className="sel-meye" style={{ color: "#00ff88" }}>
              <span className="sel-ring" style={{ color: "#00ff88" }}>
                <span className="sel-dot" style={{ background: "#00ff88" }} />
              </span>
              Other sellers &middot; live
            </div>
            <h2 className="sel-mh" style={{ fontStyle: "normal" }}>
              Six phones. Six rates.{" "}
              <em style={{ color: "#00ff88" }}>All running.</em>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {PERSONAS.map((p) => {
                const ps = p.startSecs + elapsed;
                return (
                  <div
                    key={p.handle}
                    className="sel-pc"
                    style={{ borderColor: `${p.accent}55`, boxShadow: `0 0 40px ${p.accent}0d` }}
                  >
                    <div className="sel-pc-t">
                      <span
                        className="sel-tag"
                        style={{ background: `${p.accent}1a`, border: `1px solid ${p.accent}55`, color: p.accent }}
                      >
                        <span className="sel-dot" style={{ background: p.accent, boxShadow: `0 0 10px ${p.accent}` }} />
                        {p.status}
                      </span>
                      <span className="sel-ptime">{fmtClock(ps)}</span>
                    </div>
                    <div className="sel-pc-c">
                      <div
                        className="sel-pav"
                        style={{
                          background: `linear-gradient(135deg,${p.bg},#0a0805)`,
                          border: `1px solid ${p.accent}99`,
                          color: p.accent,
                        }}
                      >
                        {p.initial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="sel-ph">{p.handle}</div>
                        <div className="sel-pl">
                          <span className="lb">{p.label} &middot;</span> Charging{" "}
                          <b>${p.rate.toFixed(2)}/min</b>
                        </div>
                      </div>
                    </div>
                    <div className="sel-pe">
                      <div className="sel-pel">Their earnings &middot; this call</div>
                      <div className="sel-pev sel-metal">${money((ps / 60) * p.rate)}</div>
                      <div className="sel-pes">+${(p.rate / 60).toFixed(2)} / sec</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════ EARN CALCULATOR ══════ */}
      {modal === "calc" && (
        <div className="sel-ov" onClick={() => setModal(null)} role="dialog" aria-modal="true">
          <div className="sel-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <button className="sel-mclose" onClick={() => setModal(null)} aria-label="Close">&times;</button>
            <div className="sel-meye" style={{ color: "#00ff88" }}>&#9670; Earn calculator</div>
            <h2 className="sel-mh" style={{ fontStyle: "normal" }}>
              What could <em style={{ color: "#00ff88" }}>you</em> earn by the second?
            </h2>
            <div className="sel-cr">
              <div className="sel-cr-top"><span>Rate</span><span className="v">${cRate}/min</span></div>
              <input className="sel-slider grn" type="range" min={1} max={500} value={cRate} onChange={(e) => setCRate(Number(e.target.value))} />
            </div>
            <div className="sel-cr">
              <div className="sel-cr-top"><span>Minutes / day</span><span className="v">{cMin} min</span></div>
              <input className="sel-slider grn" type="range" min={5} max={180} value={cMin} onChange={(e) => setCMin(Number(e.target.value))} />
            </div>
            <div className="sel-cr">
              <div className="sel-cr-top"><span>Days / week</span><span className="v">{cDays} days</span></div>
              <input className="sel-slider grn" type="range" min={1} max={7} value={cDays} onChange={(e) => setCDays(Number(e.target.value))} />
            </div>
            <div className="sel-result">
              <div className="sel-result-l">Potential monthly income</div>
              <div className="sel-result-v">${monthly.toLocaleString()}</div>
              <div className="sel-result-s">at your rate, before fees</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ CONSOLE / COMMAND PALETTE (logged-in) ══════ */}
      {modal === "console" && (
        <div
          className="sel-ov"
          onClick={() => setModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Seller console"
          style={{ paddingTop: "12vh" }}
        >
          <div className="sel-pal" onClick={(e) => e.stopPropagation()}>
            <div className="sel-pal-s">
              <span className="sel-pal-ic">&#9670;</span>
              <input
                className="sel-pal-in"
                autoFocus
                placeholder="Jump to&hellip; go live, invite, earnings"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span className="sel-pal-esc">Esc</span>
            </div>
            <div className="sel-pal-l">
              {filtered.length === 0 ? (
                <div className="sel-pal-none">
                  Nothing matches &ldquo;{query}&rdquo;
                </div>
              ) : (
                filtered.map((s, i) => (
                  <button
                    key={s.route}
                    className={`sel-pal-i ${i === active ? "on" : ""}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => runShortcut(s)}
                  >
                    <span className="sel-pal-ii">{s.icon}</span>
                    <span>
                      <span className="sel-pal-lab">{s.label}</span>
                      <span className="sel-pal-h">{s.hint}</span>
                    </span>
                    <span className="sel-pal-e">&#8629;</span>
                  </button>
                ))
              )}
            </div>
            <div className="sel-pal-f">
              <span>&#8593;&#8595; navigate &middot; &#8629; open</span>
              <span>Seller console</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

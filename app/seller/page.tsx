"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Inter } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildAuthRedirect } from "@/components/auth/AuthGuard";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-inter-bam",
});

/* ── Formatting helpers (from the original inline script) ── */
function fmt(n: number, dec: number) {
  return n.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function fmtTimer(secs: number) {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return m + ":" + s;
}

type PersonaStatus =
  | "free-preview"
  | "connected"
  | "screen-share"
  | "recording"
  | "video";

type Persona = {
  handle: string;
  initial: string;
  label: string;
  accent: string;
  cardClass: string;
  rate: number;
  startSecs: number;
  startTotal: number;
  status: PersonaStatus;
};

const PERSONAS: Persona[] = [
  { handle: "@maya_creator", initial: "M", label: "Music artist", accent: "#ff7ab8", cardClass: "bam-clock-card-pink", rate: 4.0, startSecs: 11, startTotal: 0.73, status: "free-preview" },
  { handle: "@coach_jay", initial: "J", label: "Strategy coach", accent: "#00ff88", cardClass: "bam-clock-card", rate: 7.5, startSecs: 510, startTotal: 63.75, status: "connected" },
  { handle: "@lila.fit", initial: "L", label: "Personal trainer", accent: "#72d7ff", cardClass: "bam-clock-card-blue", rate: 9.0, startSecs: 1112, startTotal: 166.8, status: "connected" },
  { handle: "@marcus.re", initial: "M", label: "Real estate consultant", accent: "#e9b949", cardClass: "bam-clock-card", rate: 15.0, startSecs: 423, startTotal: 105.75, status: "screen-share" },
  { handle: "@dr_park", initial: "P", label: "Legal consult", accent: "#ff8a8a", cardClass: "bam-clock-card", rate: 30.0, startSecs: 210, startTotal: 105.0, status: "recording" },
  { handle: "@lila.mood", initial: "L", label: "IG · OF creator", accent: "#ff7ab8", cardClass: "bam-clock-card-pink", rate: 40.0, startSecs: 324, startTotal: 216.0, status: "video" },
];

function accentBgFor(accent: string) {
  if (accent === "#e9b949") return "#2a1d10";
  if (accent === "#ff7ab8") return "#1a0d14";
  if (accent === "#72d7ff") return "#0a1620";
  if (accent === "#ff8a8a") return "#1a0a0a";
  return "#0a1d14";
}

function StatusTag({ status }: { status: PersonaStatus }) {
  if (status === "free-preview") {
    return (
      <span
        className="bam-status-tag"
        style={{
          background: "rgba(0,255,136,0.06)",
          border: "1px solid rgba(0,255,136,0.25)",
          color: "#00ff88",
        }}
      >
        <span className="bam-pulse"></span> Free preview
      </span>
    );
  }
  if (status === "screen-share") {
    return (
      <span
        className="bam-status-tag"
        style={{
          background: "rgba(114,215,255,0.06)",
          border: "1px solid rgba(114,215,255,0.22)",
          color: "#72d7ff",
        }}
      >
        <span className="bam-pulse bam-pulse-blue"></span> Screen share
      </span>
    );
  }
  if (status === "recording") {
    return (
      <span
        className="bam-status-tag"
        style={{
          background: "rgba(255,87,87,0.05)",
          border: "1px solid rgba(255,87,87,0.2)",
          color: "#ff8a8a",
        }}
      >
        <span className="bam-pulse bam-pulse-red"></span> Recording
      </span>
    );
  }
  if (status === "video") {
    return (
      <span
        className="bam-status-tag"
        style={{
          background: "rgba(255,122,184,0.08)",
          border: "1px solid rgba(255,122,184,0.3)",
          color: "#ff7ab8",
        }}
      >
        <span className="bam-pulse bam-pulse-pink"></span> Video
      </span>
    );
  }
  return (
    <span
      className="bam-status-tag"
      style={{
        background: "rgba(0,255,136,0.06)",
        border: "1px solid rgba(0,255,136,0.25)",
        color: "#00ff88",
      }}
    >
      <span className="bam-pulse"></span> Connected
    </span>
  );
}

/* Mute / camera / end-call control row used in every clock card */
function CallButtons() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 10,
        marginBottom: 16,
      }}
    >
      <div className="bam-call-btn bam-call-btn-mute">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(244,234,210,0.85)"
          strokeWidth="1.6"
        >
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
        </svg>
      </div>
      <div className="bam-call-btn bam-call-btn-mute">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(244,234,210,0.85)"
          strokeWidth="1.6"
        >
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      </div>
      <div className="bam-call-btn bam-call-btn-end">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ff7a7a"
          strokeWidth="1.6"
        >
          <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 014.43 13a19.79 19.79 0 01-3.07-8.67A2 2 0 013.34 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.32 9.9" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      </div>
    </div>
  );
}

export default function SellerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { expired } = useAuth();

  /* ── Routing helpers ─────────────────────────────── */
  const goSignup = () => router.push("/signup");
  const goBrowse = () => router.push("/browse");
  const goLogin = () => router.push(buildAuthRedirect({ pathname, expired }));
  const goMain = () => router.push("/main");

  /* ── Live tick (replaces setInterval) ────────────── */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* ── Hero clock card ─────────────────────────────── */
  const heroStartSecs = 16 * 60 + 45;
  const heroStartTotal = 210.91;
  const [heroRate, setHeroRate] = useState(24.99);
  const [rateEditorOpen, setRateEditorOpen] = useState(false);

  const heroPerSec = heroRate / 60;
  const callClock = fmtTimer(heroStartSecs + tick);
  const heroTotal = fmt(heroStartTotal + heroPerSec * tick, 2);
  const heroRateSec = fmt(heroPerSec, 2);

  const onRateSlider = (v: number) => {
    setHeroRate(v - 0.01 < 1 ? 1 : v - 0.01);
  };

  /* ── Earn calculator ─────────────────────────────── */
  const [eRate, setERate] = useState(5);
  const [eCalls, setECalls] = useState(8);
  const [eMins, setEMins] = useState(10);
  const eMonthly = useMemo(
    () => Math.round(eRate * eCalls * eMins * 4).toLocaleString(),
    [eRate, eCalls, eMins]
  );

  /* ── Sellers modal ───────────────────────────────── */
  const [modalOpen, setModalOpen] = useState(false);
  const closeModal = useCallback(() => setModalOpen(false), []);
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  return (
    <div
      className={inter.variable}
      style={{
        fontFamily:
          "var(--font-inter-bam), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "linear-gradient(180deg, #0a0805, #050403 48%, #020202)",
        color: "#f4ead2",
        WebkitFontSmoothing: "antialiased",
        minHeight: "100dvh",
      }}
    >
      <style>{`
        @keyframes bam-pulse { 0%, 100% { opacity: 0.45; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.35); } }
        @keyframes bam-cursor { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        @keyframes bam-modal-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes bam-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bam-pencil-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes bam-typing { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        .bam-pulse { width: 7px; height: 7px; background: #00ff88; border-radius: 50%; box-shadow: 0 0 18px #00ff88; animation: bam-pulse 1.25s ease-in-out infinite; display: inline-block; }
        .bam-pulse-blue { background: #72d7ff; box-shadow: 0 0 18px #72d7ff; }
        .bam-pulse-pink { background: #ff7ab8; box-shadow: 0 0 14px rgba(255,122,184,0.6); }
        .bam-pulse-red { background: #ff5757; box-shadow: 0 0 14px rgba(255,87,87,0.5); animation: bam-typing 2s ease-in-out infinite; }
        .bam-cursor { display: inline-block; width: 2px; height: 0.85em; background: currentColor; vertical-align: -2px; animation: bam-cursor 1s steps(1) infinite; margin-left: 3px; }

        .bam-card { border: 1px solid rgba(244,234,210,0.1); border-radius: 22px; padding: 22px; background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.005)), #0c0907; box-shadow: 0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.03); }
        .bam-clock-card { border: 1px solid rgba(233,185,73,0.18); border-radius: 24px; padding: 26px 24px; background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(233,185,73,0.07), transparent 70%), linear-gradient(180deg, #1a130a, #100b07); box-shadow: 0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04); }
        .bam-clock-card-pink { border-color: rgba(255,122,184,0.22); background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,122,184,0.07), transparent 70%), linear-gradient(180deg, #14080f, #0a0407); }
        .bam-clock-card-blue { border-color: rgba(114,215,255,0.2); background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(114,215,255,0.07), transparent 70%), linear-gradient(180deg, #08111a, #04080f); }
        .bam-slider { width: 100%; height: 3px; background: rgba(244,234,210,0.1); -webkit-appearance: none; appearance: none; outline: none; cursor: pointer; border-radius: 2px; }
        .bam-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; cursor: pointer; }
        .bam-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; cursor: pointer; border: none; }
        .bam-s-green::-webkit-slider-thumb { background: #00ff88; box-shadow: 0 0 12px rgba(0,255,136,0.6); }
        .bam-s-green::-moz-range-thumb { background: #00ff88; box-shadow: 0 0 12px rgba(0,255,136,0.6); }
        .bam-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; border-radius: 999px; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; }
        .bam-num { font-variant-numeric: tabular-nums; font-family: Georgia, 'Times New Roman', serif; letter-spacing: -0.04em; }

        .bam-cta-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .bam-cta { padding: 18px 20px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; text-align: left; text-decoration: none; color: #f4ead2; position: relative; overflow: hidden; isolation: isolate; transition: transform 0.25s, background 0.25s, border-color 0.25s; cursor: pointer; border-radius: 18px; border: 1px solid; font-family: inherit; }
        .bam-cta::before { content: ''; position: absolute; inset: 0; opacity: 0.4; transition: opacity 0.25s; z-index: -1; }
        .bam-cta.bam-cta-earn { background: linear-gradient(180deg, rgba(0,255,136,0.08), rgba(0,255,136,0.02)); border-color: rgba(0,255,136,0.35); }
        .bam-cta.bam-cta-earn::before { background: radial-gradient(circle at 20% 25%, rgba(0,255,136,0.28), transparent 55%); }
        .bam-cta.bam-cta-invite { background: linear-gradient(180deg, rgba(0,255,136,0.045), rgba(0,255,136,0.012)); border-color: rgba(0,255,136,0.22); border-style: dashed; }
        .bam-cta.bam-cta-invite::before { background: radial-gradient(circle at 80% 25%, rgba(0,255,136,0.16), transparent 55%); }
        .bam-cta:hover { transform: translateY(-2px); border-style: solid; }
        .bam-cta.bam-cta-earn:hover { background: linear-gradient(180deg, rgba(0,255,136,0.13), rgba(0,255,136,0.04)); border-color: rgba(0,255,136,0.6); }
        .bam-cta.bam-cta-invite:hover { background: linear-gradient(180deg, rgba(0,255,136,0.09), rgba(0,255,136,0.03)); border-color: rgba(0,255,136,0.5); }
        .bam-cta:hover::before { opacity: 0.7; }
        .bam-cta-kicker { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(244,234,210,0.55); margin-bottom: 8px; }
        .bam-cta strong { font-family: Georgia, serif; font-size: 22px; font-weight: 400; letter-spacing: -0.035em; line-height: 1; margin-bottom: 8px; display: block; color: #00ff88; }
        .bam-cta em { font-style: normal; color: rgba(244,234,210,0.55); font-size: 11px; letter-spacing: 0.04em; }

        .bam-blade { font-family: Georgia, serif; font-style: italic; font-size: clamp(22px, 3vw, 34px); line-height: 1.2; letter-spacing: -0.025em; color: rgba(244,234,210,0.55); padding: 8px 4px; text-align: center; }
        .bam-blade span { color: #00ff88; }
        .bam-sellers-btn { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: rgba(0,255,136,0.04); border: 1px dashed rgba(0,255,136,0.32); border-radius: 14px; color: #00ff88; font-size: 13px; letter-spacing: 0.05em; cursor: pointer; transition: background 0.2s, border-color 0.2s; font-family: inherit; width: 100%; }
        .bam-sellers-btn:hover { background: rgba(0,255,136,0.08); border-color: rgba(0,255,136,0.55); border-style: solid; }
        .bam-rate-edit { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 999px; background: rgba(233,185,73,0.06); border: 1px dashed rgba(233,185,73,0.22); color: rgba(233,185,73,0.85); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; transition: background 0.2s; font-family: inherit; }
        .bam-rate-edit:hover { background: rgba(233,185,73,0.12); border-style: solid; }
        .bam-pencil { display: inline-block; opacity: 0.6; animation: bam-pencil-pulse 2.4s ease-in-out infinite; }
        .bam-call-btn { aspect-ratio: 1.35; border-radius: 16px; display: grid; place-items: center; cursor: pointer; }
        .bam-call-btn-mute { background: rgba(244,234,210,0.05); border: 1px solid rgba(244,234,210,0.08); }
        .bam-call-btn-end { background: rgba(255,87,87,0.08); border: 1px solid rgba(255,87,87,0.22); }
        .bam-status-tag { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; }
        .bam-overlay { position: fixed; inset: 0; background: rgba(2,2,2,0.78); backdrop-filter: blur(14px); z-index: 9998; display: none; animation: bam-overlay-in 0.2s ease-out; }
        .bam-overlay.is-open { display: flex; align-items: flex-start; justify-content: center; padding: 6vh 24px; overflow-y: auto; }
        .bam-modal { max-width: 620px; width: 100%; background: linear-gradient(180deg, #0d0a07, #06050a); border: 1px solid rgba(244,234,210,0.13); border-radius: 26px; padding: 28px; position: relative; box-shadow: 0 40px 100px rgba(0,0,0,0.7); animation: bam-modal-in 0.28s cubic-bezier(.2,.8,.2,1); display: flex; flex-direction: column; gap: 14px; }
        .bam-modal-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border-radius: 50%; background: rgba(244,234,210,0.06); border: 1px solid rgba(244,234,210,0.12); color: rgba(244,234,210,0.7); font-size: 16px; line-height: 1; cursor: pointer; display: grid; place-items: center; }
        .bam-modal-close:hover { background: rgba(244,234,210,0.12); }

        .bam-nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 32px; border-bottom: 1px solid rgba(244,234,210,0.08); background: rgba(5,4,3,0.78); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(18px); }
        .bam-nav-logo { font-family: Georgia, serif; font-style: italic; font-size: 22px; letter-spacing: -0.03em; }
        .bam-nav-links { display: flex; gap: 22px; align-items: center; font-size: 11px; letter-spacing: 0.13em; text-transform: uppercase; color: rgba(244,234,210,0.55); }
        .bam-nav-links a, .bam-nav-links button { color: inherit; text-decoration: none; background: none; border: none; cursor: pointer; font-family: inherit; font-size: 11px; letter-spacing: 0.13em; text-transform: uppercase; padding: 0; }
        .bam-nav-links a.accent, .bam-nav-links button.accent { color: #e9b949; }

        .bam-hero { max-width: 760px; margin: 0 auto; padding: clamp(48px, 8vw, 96px) 24px clamp(32px, 4vw, 48px); text-align: center; }
        .bam-hero-eyebrow { display: inline-flex; align-items: center; gap: 10px; padding: 7px 13px; border-radius: 999px; background: rgba(0,255,136,0.08); color: #00ff88; border: 1px solid rgba(0,255,136,0.2); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 24px; }
        .bam-hero-headline { font-family: Georgia, serif; font-weight: 400; font-style: italic; font-size: clamp(38px, 6vw, 72px); line-height: 1.02; letter-spacing: -0.045em; margin: 0 0 20px; }
        .bam-hero-headline em { font-style: normal; color: #00ff88; }
        .bam-hero-copy { color: rgba(244,234,210,0.6); font-size: clamp(15px, 1.5vw, 18px); line-height: 1.6; max-width: 560px; margin: 0 auto; }

        .bam-body { max-width: 620px; margin: 0 auto; padding: 0 24px clamp(64px, 8vw, 112px); display: flex; flex-direction: column; gap: 18px; }
        .bam-imagine { font-family: Georgia, serif; font-style: italic; font-size: 18px; color: rgba(233,185,73,0.75); padding-left: 4px; letter-spacing: -0.01em; }

        .bam-footer { padding: 2rem; border-top: 1px solid rgba(244,234,210,0.08); display: flex; justify-content: space-between; font-size: 11px; color: rgba(244,234,210,0.3); letter-spacing: 0.1em; text-transform: uppercase; flex-wrap: wrap; gap: 12px; }
        .bam-footer-logo { font-family: Georgia, serif; font-style: italic; color: rgba(244,234,210,0.5); text-transform: none; letter-spacing: -0.02em; font-size: 14px; }

        @media (max-width: 600px) {
          .bam-cta-pair { grid-template-columns: 1fr; }
          .bam-nav { padding: 14px 20px; }
        }
      `}</style>

      <nav className="bam-nav">
        <div className="bam-nav-logo">buyaminute</div>
        <div className="bam-nav-links">
          <button type="button" onClick={goMain}>
            How it works
          </button>
          <button type="button" onClick={goBrowse}>
            Browse
          </button>
          <button type="button" className="accent" onClick={goSignup}>
            Start earning
          </button>
        </div>
      </nav>

      <header className="bam-hero">
        <div className="bam-hero-eyebrow">
          <span className="bam-pulse"></span>
          If you&apos;re answering
        </div>
        <h1 className="bam-hero-headline">
          Your phone is now a <em>cash register.</em>
        </h1>
        <p className="bam-hero-copy">
          Pick up. The meter starts. Every second has a price — and it&apos;s{" "}
          <em>your</em> price. You set it. You change it. No ceiling.
        </p>
      </header>

      <main className="bam-body">
        <div className="bam-imagine">
          Imagine you are <span style={{ color: "#e9b949" }}>@alex_r</span>.
        </div>

        <div className="bam-clock-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 22,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#00ff88",
                fontWeight: 500,
              }}
            >
              <span className="bam-pulse"></span> Connected
            </span>
            <span
              style={{
                fontFamily: "'SFMono-Regular', monospace",
                fontSize: 13,
                color: "#e9b949",
                letterSpacing: "0.04em",
              }}
            >
              {callClock}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2a1d10, #1a130a)",
                border: "1px solid rgba(233,185,73,0.4)",
                display: "grid",
                placeItems: "center",
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: 26,
                color: "#e9b949",
              }}
            >
              A
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 22,
                  color: "#f4ead2",
                  letterSpacing: "-0.02em",
                  marginBottom: 4,
                }}
              >
                @alex_r
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 13, color: "rgba(244,234,210,0.7)" }}>
                  Charging{" "}
                  <span style={{ color: "#e9b949", fontWeight: 500 }}>
                    ${heroRate.toFixed(2)}/min
                  </span>
                </span>
                <span
                  className="bam-rate-edit"
                  role="button"
                  tabIndex={0}
                  onClick={() => setRateEditorOpen((o) => !o)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setRateEditorOpen((o) => !o);
                    }
                  }}
                >
                  <span className="bam-pencil">✎</span> your rate · tap to
                  change
                </span>
              </div>
            </div>
          </div>

          {rateEditorOpen && (
            <div
              style={{
                background: "rgba(233,185,73,0.05)",
                border: "1px solid rgba(233,185,73,0.25)",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "rgba(244,234,210,0.5)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                <span>Set your rate</span>
                <span style={{ color: "#e9b949" }}>
                  ${heroRate.toFixed(2)}/min
                </span>
              </div>
              <input
                className="bam-slider"
                type="range"
                min={1}
                max={500}
                step={1}
                defaultValue={25}
                style={{ background: "rgba(244,234,210,0.1)" }}
                onChange={(e) => onRateSlider(parseInt(e.target.value, 10))}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 9,
                  color: "rgba(244,234,210,0.35)",
                  letterSpacing: "0.1em",
                  marginTop: 6,
                }}
              >
                <span>$1/min</span>
                <span>$500/min</span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(244,234,210,0.45)",
                  marginTop: 10,
                  lineHeight: 1.55,
                }}
              >
                No earnings cap. No ceiling. Your phone, your rules — Set any
                rate BEFORE the call.
              </div>
            </div>
          )}

          <div
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.55))",
              border: "1px solid rgba(233,185,73,0.18)",
              borderRadius: 18,
              padding: "22px 18px",
              textAlign: "center",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: 11,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "rgba(233,185,73,0.65)",
                marginBottom: 12,
              }}
            >
              Your earnings · this call
            </div>
            <div
              className="bam-num"
              style={{
                fontStyle: "italic",
                fontSize: "clamp(56px, 8vw, 84px)",
                lineHeight: 1,
                color: "#e9b949",
              }}
            >
              ${heroTotal}
              <span className="bam-cursor" style={{ color: "#e9b949" }}></span>
            </div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: 11,
                color: "rgba(244,234,210,0.45)",
                marginTop: 12,
                letterSpacing: "0.06em",
              }}
            >
              +${heroRateSec} / sec
            </div>
          </div>

          <CallButtons />

          <div
            style={{
              textAlign: "center",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontSize: 12,
              color: "rgba(244,234,210,0.4)",
              letterSpacing: "0.04em",
            }}
          >
            Either side hangs up · meter stops
          </div>
        </div>

        <div className="bam-cta-pair">
          <button
            type="button"
            className="bam-cta bam-cta-earn"
            onClick={goSignup}
          >
            <span className="bam-cta-kicker">Be available</span>
            <strong>Enter to Earn</strong>
            <em>Set your line · go online</em>
          </button>
          <button
            type="button"
            className="bam-cta bam-cta-invite"
            onClick={goSignup}
          >
            <span className="bam-cta-kicker">Reach your audience</span>
            <strong>Invite someone to call you</strong>
            <em>Push your line to fans, clients, lists</em>
          </button>
        </div>

        <div className="bam-blade">
          Don&apos;t wait to be <span>discovered.</span>
        </div>

        <button
          className="bam-sellers-btn"
          type="button"
          onClick={() => setModalOpen(true)}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "rgba(0,255,136,0.12)",
                border: "1px solid rgba(0,255,136,0.4)",
                display: "grid",
                placeItems: "center",
                fontSize: 13,
              }}
            >
              +
            </span>
            See other sellers on the line right now
          </span>
          <span style={{ fontSize: 14, opacity: 0.7 }}>→</span>
        </button>

        <div className="bam-card">
          <div
            className="bam-eyebrow"
            style={{
              background: "rgba(244,234,210,0.05)",
              color: "rgba(244,234,210,0.6)",
              marginBottom: 16,
            }}
          >
            Earn calculator
          </div>
          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontWeight: 400,
              fontSize: 26,
              letterSpacing: "-0.025em",
              margin: "0 0 18px",
              lineHeight: 1.15,
            }}
          >
            What could{" "}
            <span style={{ fontStyle: "italic", color: "#00ff88" }}>you</span>{" "}
            earn by the second?
          </h2>
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                marginBottom: 8,
                color: "rgba(244,234,210,0.55)",
              }}
            >
              <span>Rate</span>
              <span style={{ color: "#00ff88" }}>${eRate}/min</span>
            </div>
            <input
              className="bam-slider bam-s-green"
              type="range"
              min={1}
              max={50}
              value={eRate}
              step={1}
              onChange={(e) => setERate(parseInt(e.target.value, 10))}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                marginBottom: 8,
                color: "rgba(244,234,210,0.55)",
              }}
            >
              <span>Calls / week</span>
              <span style={{ color: "#00ff88" }}>{eCalls}</span>
            </div>
            <input
              className="bam-slider bam-s-green"
              type="range"
              min={1}
              max={30}
              value={eCalls}
              step={1}
              onChange={(e) => setECalls(parseInt(e.target.value, 10))}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                marginBottom: 8,
                color: "rgba(244,234,210,0.55)",
              }}
            >
              <span>Avg length</span>
              <span style={{ color: "#00ff88" }}>{eMins} min</span>
            </div>
            <input
              className="bam-slider bam-s-green"
              type="range"
              min={3}
              max={60}
              value={eMins}
              step={1}
              onChange={(e) => setEMins(parseInt(e.target.value, 10))}
            />
          </div>
          <div
            style={{
              paddingTop: 16,
              borderTop: "1px solid rgba(244,234,210,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "rgba(244,234,210,0.42)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Earned / month
            </div>
            <div
              className="bam-num"
              style={{ fontSize: 44, color: "#00ff88", lineHeight: 0.9 }}
            >
              ${eMonthly}
            </div>
          </div>
        </div>

        <div
          className="bam-card"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,255,136,0.06), rgba(0,255,136,0.02))",
            borderColor: "rgba(0,255,136,0.25)",
            textAlign: "center",
            padding: "40px 24px",
          }}
        >
          <div
            className="bam-num"
            style={{
              fontStyle: "italic",
              fontSize: 32,
              lineHeight: 1.2,
              color: "rgba(244,234,210,0.85)",
              marginBottom: 22,
            }}
          >
            Your phone is the
            <br />
            <span style={{ color: "#00ff88" }}>storefront.</span>
          </div>
          <button
            type="button"
            className="bam-cta bam-cta-earn"
            style={{ display: "inline-flex", width: "auto", alignItems: "center" }}
            onClick={goSignup}
          >
            <strong style={{ marginBottom: 0, fontSize: 20 }}>
              Enter to Earn&nbsp;&nbsp;→
            </strong>
          </button>
        </div>
      </main>

      <footer className="bam-footer">
        <span className="bam-footer-logo">buyaminute</span>
        <span>Voice &amp; video · paid by the second · 2026</span>
      </footer>

      <div
        className={`bam-overlay${modalOpen ? " is-open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="bam-modal">
          <button
            className="bam-modal-close"
            type="button"
            aria-label="Close"
            onClick={closeModal}
          >
            ×
          </button>
          <div>
            <div
              className="bam-eyebrow"
              style={{
                background: "rgba(0,255,136,0.08)",
                color: "#00ff88",
                border: "1px solid rgba(0,255,136,0.2)",
                marginBottom: 14,
              }}
            >
              Other sellers · live
            </div>
            <h3
              style={{
                fontFamily: "Georgia, serif",
                fontWeight: 400,
                fontSize: 28,
                letterSpacing: "-0.03em",
                margin: "0 0 8px",
                lineHeight: 1.1,
              }}
            >
              Six phones. Six rates.{" "}
              <span style={{ fontStyle: "italic", color: "#00ff88" }}>
                All running.
              </span>
            </h3>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {PERSONAS.map((p, idx) => {
              const accentBg = accentBgFor(p.accent);
              const accentBorder = p.accent + "66";
              return (
                <div
                  key={p.handle + idx}
                  className={`bam-clock-card ${p.cardClass}`}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 22,
                    }}
                  >
                    <StatusTag status={p.status} />
                    <span
                      style={{
                        fontFamily: "'SFMono-Regular', monospace",
                        fontSize: 13,
                        color: "#e9b949",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {fmtTimer(p.startSecs + tick)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      marginBottom: 22,
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${accentBg}, #0a0805)`,
                        border: `1px solid ${accentBorder}`,
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "Georgia, serif",
                        fontStyle: "italic",
                        fontSize: 26,
                        color: p.accent,
                      }}
                    >
                      {p.initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "Georgia, serif",
                          fontStyle: "italic",
                          fontSize: 22,
                          color: "#f4ead2",
                          letterSpacing: "-0.02em",
                          marginBottom: 4,
                        }}
                      >
                        {p.handle}
                      </div>
                      <div
                        style={{ fontSize: 13, color: "rgba(244,234,210,0.7)" }}
                      >
                        <span style={{ color: "rgba(244,234,210,0.55)" }}>
                          {p.label} ·
                        </span>{" "}
                        Charging{" "}
                        <span style={{ color: "#e9b949", fontWeight: 500 }}>
                          ${p.rate.toFixed(2)}/min
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.55))",
                      border: "1px solid rgba(233,185,73,0.18)",
                      borderRadius: 18,
                      padding: "22px 18px",
                      textAlign: "center",
                      marginBottom: 18,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "Georgia, serif",
                        fontStyle: "italic",
                        fontSize: 11,
                        letterSpacing: "0.32em",
                        textTransform: "uppercase",
                        color: "rgba(233,185,73,0.65)",
                        marginBottom: 12,
                      }}
                    >
                      Their earnings · so far
                    </div>
                    <div
                      className="bam-num"
                      style={{
                        fontStyle: "italic",
                        fontSize: "clamp(48px, 6vw, 72px)",
                        lineHeight: 1,
                        color: "#e9b949",
                      }}
                    >
                      ${fmt(p.startTotal + (p.rate / 60) * tick, 2)}
                      <span
                        className="bam-cursor"
                        style={{ color: "#e9b949" }}
                      ></span>
                    </div>
                    <div
                      style={{
                        fontFamily: "Georgia, serif",
                        fontStyle: "italic",
                        fontSize: 11,
                        color: "rgba(244,234,210,0.45)",
                        marginTop: 12,
                        letterSpacing: "0.06em",
                      }}
                    >
                      +${(p.rate / 60).toFixed(2)} / sec
                    </div>
                  </div>
                  <CallButtons />
                  <div
                    style={{
                      textAlign: "center",
                      fontFamily: "Georgia, serif",
                      fontStyle: "italic",
                      fontSize: 12,
                      color: "rgba(244,234,210,0.4)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Either side hangs up · meter stops
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

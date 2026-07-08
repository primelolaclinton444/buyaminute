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

function fmt(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function BuyerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { expired } = useAuth();

  /* ── Routing helpers ─────────────────────────────── */
  const goBrowse = () => router.push("/browse");
  const goSignup = () => router.push("/signup");
  const goLogin = () => router.push(buildAuthRedirect({ pathname, expired }));
  const goMain = () => router.push("/main");

  /* ── Live ticker state ────────────────────────────── */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const offerTimeText = useMemo(() => {
    const offerSecs = 47 + tick;
    if (offerSecs < 60) return offerSecs + "s ago";
    return Math.floor(offerSecs / 60) + "m " + (offerSecs % 60) + "s ago";
  }, [tick]);

  const previewText = useMemo(() => {
    const preview = Math.max(0, 30 - tick);
    return "00:" + String(preview).padStart(2, "0");
  }, [tick]);

  /* ── Save calculator state ───────────────────────── */
  const [hourly, setHourly] = useState(300);
  const [actualMins, setActualMins] = useState(18);
  const [callsPerMonth, setCallsPerMonth] = useState(4);

  const yearlySaved = useMemo(() => {
    const perMin = hourly / 60;
    const saved = (hourly - perMin * actualMins) * callsPerMonth * 12;
    return fmt(Math.max(0, saved));
  }, [hourly, actualMins, callsPerMonth]);

  /* ── Scenarios modal ─────────────────────────────── */
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
        @keyframes bam-modal-in { from { opacity: 0; transform: translateY(12px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes bam-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        
        .bam-pulse { width: 8px; height: 8px; background: #00ff88; border-radius: 50%; box-shadow: 0 0 20px #00ff88; animation: bam-pulse 1.25s ease-in-out infinite; display: inline-block; }
        .bam-pulse-blue { background: #72d7ff; box-shadow: 0 0 20px #72d7ff; }
        .bam-cursor { display: inline-block; width: 3px; height: 0.85em; background: currentColor; vertical-align: -2px; animation: bam-cursor 1s steps(1) infinite; margin-left: 4px; }

        .bam-card { border: 1px solid rgba(244,234,210,0.1); border-radius: 24px; padding: 28px; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.005)), #0c0907; box-shadow: 0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05); transition: transform 0.2s; }
        .bam-card:hover { transform: translateY(-2px); }
        .bam-card-buyer { background: linear-gradient(180deg, rgba(114,215,255,0.06), rgba(255,255,255,0.005)), #06120f; border-color: rgba(114,215,255,0.25); }
        .bam-card-buyer-pink { background: linear-gradient(180deg, rgba(255,122,184,0.08), rgba(255,255,255,0.005)), #140a10; border-color: rgba(255,122,184,0.3); }
        .bam-card-buyer-gold { background: linear-gradient(180deg, rgba(233,185,73,0.08), rgba(255,255,255,0.005)), #14100a; border-color: rgba(233,185,73,0.3); }
        
        .bam-slider { width: 100%; height: 6px; background: rgba(244,234,210,0.15); -webkit-appearance: none; appearance: none; outline: none; cursor: pointer; border-radius: 4px; margin: 12px 0; }
        .bam-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; transition: transform 0.1s; }
        .bam-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .bam-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: none; transition: transform 0.1s; }
        .bam-s-blue::-webkit-slider-thumb { background: #72d7ff; box-shadow: 0 0 16px rgba(114,215,255,0.8); }
        .bam-s-blue::-moz-range-thumb { background: #72d7ff; box-shadow: 0 0 16px rgba(114,215,255,0.8); }
        
        .bam-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; }
        .bam-num { font-variant-numeric: tabular-nums; font-family: Georgia, 'Times New Roman', serif; letter-spacing: -0.04em; }
        
        .bam-msg-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; padding: 16px; border-radius: 16px; font-size: 13px; margin-bottom: 12px; }
        .bam-msg-dead { background: rgba(255,255,255,0.02); border: 1px solid rgba(244,234,210,0.08); color: rgba(244,234,210,0.5); }
        .bam-msg-live { background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.4); color: #b9fbe0; box-shadow: 0 0 15px rgba(0,255,136,0.1) inset; }

        .bam-cta-stack { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .bam-cta { padding: 22px 24px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; text-align: left; text-decoration: none; color: #f4ead2; position: relative; overflow: hidden; isolation: isolate; transition: transform 0.25s, background 0.25s, border-color 0.25s, box-shadow 0.25s; cursor: pointer; border-radius: 20px; border: 1px solid; font-family: inherit; }
        .bam-cta::before { content: ''; position: absolute; inset: 0; opacity: 0.4; transition: opacity 0.25s; z-index: -1; }
        .bam-cta.bam-cta-call { background: linear-gradient(180deg, rgba(114,215,255,0.1), rgba(114,215,255,0.03)); border-color: rgba(114,215,255,0.5); box-shadow: 0 10px 30px rgba(114,215,255,0.1); }
        .bam-cta.bam-cta-call::before { background: radial-gradient(circle at 20% 25%, rgba(114,215,255,0.4), transparent 60%); }
        .bam-cta.bam-cta-offer { background: linear-gradient(180deg, rgba(114,215,255,0.05), rgba(114,215,255,0.01)); border-color: rgba(114,215,255,0.3); border-style: dashed; }
        .bam-cta:hover { transform: translateY(-4px); border-style: solid; }
        .bam-cta.bam-cta-call:hover { background: linear-gradient(180deg, rgba(114,215,255,0.18), rgba(114,215,255,0.06)); border-color: rgba(114,215,255,0.8); box-shadow: 0 15px 40px rgba(114,215,255,0.2); }
        .bam-cta.bam-cta-offer:hover { background: linear-gradient(180deg, rgba(114,215,255,0.1), rgba(114,215,255,0.04)); border-color: rgba(114,215,255,0.6); }
        
        .bam-cta-row { display: flex; align-items: baseline; justify-content: space-between; width: 100%; gap: 12px; margin-bottom: 6px; }
        .bam-cta-kicker { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(244,234,210,0.7); }
        .bam-cta-arrow { font-size: 20px; color: rgba(244,234,210,0.5); transition: transform 0.25s, color 0.25s; }
        .bam-cta:hover .bam-cta-arrow { transform: translateX(6px); color: #72d7ff; }
        .bam-cta strong { font-family: Georgia, serif; font-size: 26px; font-weight: 400; letter-spacing: -0.035em; line-height: 1.1; margin-bottom: 6px; display: block; color: #72d7ff; }
        .bam-cta em { font-style: normal; color: rgba(244,234,210,0.6); font-size: 13px; letter-spacing: 0.02em; }

        .bam-blade { font-family: Georgia, serif; font-style: italic; font-size: clamp(26px, 4vw, 42px); line-height: 1.2; letter-spacing: -0.025em; color: rgba(244,234,210,0.7); padding: 16px 4px; text-align: center; }
        .bam-blade span { color: #72d7ff; font-weight: bold; }
        
        .bam-scenarios-btn { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; background: rgba(114,215,255,0.06); border: 1px dashed rgba(114,215,255,0.4); border-radius: 16px; color: #72d7ff; font-size: 15px; font-weight: 500; letter-spacing: 0.03em; cursor: pointer; transition: all 0.2s; font-family: inherit; width: 100%; }
        .bam-scenarios-btn:hover { background: rgba(114,215,255,0.12); border-color: rgba(114,215,255,0.7); border-style: solid; transform: scale(1.02); }
        
        .bam-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(16px); z-index: 9998; display: none; animation: bam-overlay-in 0.2s ease-out; }
        .bam-overlay.is-open { display: flex; align-items: flex-start; justify-content: center; padding: 5vh 20px; overflow-y: auto; }
        .bam-modal { max-width: 600px; width: 100%; background: linear-gradient(180deg, #110d0a, #06050a); border: 1px solid rgba(244,234,210,0.15); border-radius: 28px; padding: 32px; position: relative; box-shadow: 0 40px 100px rgba(0,0,0,0.8); animation: bam-modal-in 0.3s cubic-bezier(.2,.8,.2,1); display: flex; flex-direction: column; gap: 20px; }
        .bam-modal-close { position: absolute; top: 20px; right: 20px; width: 36px; height: 36px; border-radius: 50%; background: rgba(244,234,210,0.08); border: 1px solid rgba(244,234,210,0.2); color: rgba(244,234,210,0.8); font-size: 20px; line-height: 1; cursor: pointer; display: grid; place-items: center; transition: background 0.2s; }
        .bam-modal-close:hover { background: rgba(244,234,210,0.18); }

        .bam-nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 40px; border-bottom: 1px solid rgba(244,234,210,0.1); background: rgba(5,4,3,0.85); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(20px); }
        .bam-nav-logo { font-family: Georgia, serif; font-style: italic; font-size: 24px; font-weight: bold; letter-spacing: -0.03em; }
        .bam-nav-links { display: flex; gap: 28px; align-items: center; font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(244,234,210,0.6); }
        .bam-nav-links a, .bam-nav-links button { color: inherit; text-decoration: none; background: none; border: none; cursor: pointer; font-family: inherit; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; padding: 0; transition: color 0.2s; }
        .bam-nav-links button:hover { color: #f4ead2; }
        .bam-nav-links a.accent, .bam-nav-links button.accent { color: #e9b949; }

        .bam-hero { max-width: 800px; margin: 0 auto; padding: clamp(60px, 10vw, 120px) 24px clamp(40px, 6vw, 60px); text-align: center; }
        .bam-hero-eyebrow { display: inline-flex; align-items: center; gap: 12px; padding: 8px 16px; border-radius: 999px; background: rgba(114,215,255,0.1); color: #72d7ff; border: 1px solid rgba(114,215,255,0.3); font-size: 12px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 32px; }
        .bam-hero-headline { font-family: Georgia, serif; font-weight: 400; font-style: italic; font-size: clamp(42px, 7vw, 84px); line-height: 1.05; letter-spacing: -0.03em; margin: 0 0 24px; text-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .bam-hero-headline em { font-style: normal; color: #72d7ff; font-weight: 700; }
        .bam-hero-copy { color: rgba(244,234,210,0.7); font-size: clamp(16px, 2vw, 20px); line-height: 1.7; max-width: 600px; margin: 0 auto; }

        .bam-body { max-width: 680px; margin: 0 auto; padding: 0 24px clamp(80px, 10vw, 140px); display: flex; flex-direction: column; gap: 24px; }
        .bam-section-title { font-family: Georgia, serif; font-weight: 400; font-size: 32px; letter-spacing: -0.025em; margin: 0 0 16px; line-height: 1.2; }
        
        .bam-risk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

        .bam-footer { padding: 3rem 2rem; border-top: 1px solid rgba(244,234,210,0.1); display: flex; justify-content: space-between; font-size: 12px; color: rgba(244,234,210,0.4); letter-spacing: 0.1em; text-transform: uppercase; flex-wrap: wrap; gap: 16px; }
        .bam-footer-logo { font-family: Georgia, serif; font-style: italic; color: rgba(244,234,210,0.6); text-transform: none; letter-spacing: -0.02em; font-size: 16px; font-weight: bold; }

        /* Responsive Improvements */
        @media (max-width: 768px) {
          .bam-cta-stack { grid-template-columns: 1fr; }
          .bam-nav { padding: 16px 20px; }
          .bam-nav-links { gap: 16px; font-size: 10px; }
          .bam-risk-grid { grid-template-columns: 1fr; }
          .bam-card { padding: 20px; }
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
          <span className="bam-pulse bam-pulse-blue"></span>
          The Access Network
        </div>
        <h1 className="bam-hero-headline">
          Skip the inbox.<br />Talk to <em>anybody.</em>
        </h1>
        <p className="bam-hero-copy">
          A free DM is just asking for a favor. A paid offer is an <strong>invitation</strong>. People who ignore emails for weeks pick up in seconds when their time is instantly valued.
        </p>
      </header>

      <main className="bam-body">
        <div className="bam-card bam-card-buyer">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div
              className="bam-eyebrow"
              style={{ background: "rgba(114,215,255,0.1)", color: "#72d7ff" }}
            >
              Outgoing offer
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(244,234,210,0.6)",
                fontFamily: "'SFMono-Regular', monospace",
              }}
            >
              {offerTimeText}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(114,215,255,0.1)",
                border: "2px solid rgba(114,215,255,0.5)",
                display: "grid",
                placeItems: "center",
                fontFamily: "Georgia, serif",
                fontSize: 26,
                fontWeight: "bold",
                color: "#72d7ff",
              }}
            >
              A
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(244,234,210,0.6)" }}>
                Ringing
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>
                @anyone — even off-platform
              </div>
            </div>
          </div>
          <div
            style={{
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(114,215,255,0.2)",
              borderRadius: 20,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.25em",
                color: "rgba(114,215,255,0.8)",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Your offer
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div
                className="bam-num"
                style={{ fontSize: 72, lineHeight: 1, color: "#72d7ff", textShadow: "0 0 30px rgba(114,215,255,0.3)" }}
              >
                $120
                <span className="bam-cursor" style={{ color: "#72d7ff" }}></span>
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: 13,
                  color: "rgba(244,234,210,0.6)",
                  lineHeight: 1.6,
                }}
              >
                @$8/min
                <br />
                cap 15 min
              </div>
            </div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "rgba(244,234,210,0.85)",
                padding: 16,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 14,
                border: "1px solid rgba(244,234,210,0.1)",
              }}
            >
              &quot;Hey — I&apos;m building in your space and want 10 min of your
              honest take on a wedge problem. Offer attached, no slides.&quot;
            </div>
          </div>
          <div
            style={{
              background: "rgba(0,255,136,0.05)",
              border: "1px solid rgba(0,255,136,0.2)",
              borderRadius: 16,
              padding: 18,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "8px 16px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "rgba(0,255,136,0.6)",
                textTransform: "uppercase",
              }}
            >
              Live Status
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 600,
                color: "#00ff88",
              }}
            >
              <span className="bam-pulse"></span> Connected in 47s
            </div>
            <div
              style={{
                gridColumn: "1 / -1",
                fontSize: 12,
                lineHeight: 1.5,
                color: "rgba(244,234,210,0.5)",
                marginTop: 4,
              }}
            >
              Charged only for the exact seconds connected. Hangs up early →
              you keep the difference.
            </div>
          </div>
        </div>

        <div className="bam-cta-stack">
          <button
            type="button"
            className="bam-cta bam-cta-call"
            onClick={goBrowse}
          >
            <div className="bam-cta-row">
              <span className="bam-cta-kicker">Browse the line</span>
              <span className="bam-cta-arrow">→</span>
            </div>
            <strong>Enter to Call</strong>
            <em>See who&apos;s online and dial directly</em>
          </button>
          <button
            type="button"
            className="bam-cta bam-cta-offer"
            onClick={goBrowse}
          >
            <div className="bam-cta-row">
              <span className="bam-cta-kicker">Target anyone</span>
              <span className="bam-cta-arrow">→</span>
            </div>
            <strong>Send a custom offer</strong>
            <em>Generate a link for off-platform experts</em>
          </button>
        </div>

        <div className="bam-blade">
          Stop waiting to be <span>chosen.</span> Create access.
        </div>

        <button
          className="bam-scenarios-btn"
          type="button"
          onClick={() => setModalOpen(true)}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "rgba(114,215,255,0.15)",
                border: "1px solid rgba(114,215,255,0.5)",
                display: "grid",
                placeItems: "center",
                fontSize: 16,
              }}
            >
              +
            </span>
            Discover who else you could reach
          </span>
          <span style={{ fontSize: 18, opacity: 0.8 }}>→</span>
        </button>

        <div className="bam-card">
          <div
            className="bam-eyebrow"
            style={{
              background: "rgba(244,234,210,0.08)",
              color: "rgba(244,234,210,0.7)",
              marginBottom: 20,
            }}
          >
            The Ultimate Filter
          </div>
          <h2 className="bam-section-title">
            One sits in{" "}
            <span style={{ fontStyle: "italic", color: "rgba(244,234,210,0.4)" }}>
              silence
            </span>
            . The other
            <br />
            <span style={{ fontStyle: "italic", color: "#72d7ff" }}>rings their phone.</span>
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "rgba(244,234,210,0.65)",
              lineHeight: 1.6,
              margin: "0 0 24px",
            }}
          >
            Free messages are just noise in a crowded inbox. A paid offer acts as an undeniable signal that you value their time.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="bam-msg-row bam-msg-dead">
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(244,234,210,0.6)",
                    marginBottom: 4,
                  }}
                >
                  Standard Cold DM
                </div>
                <div style={{ fontSize: 14 }}>
                  &quot;Hey, would love to chat sometime…&quot;
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  className="bam-num"
                  style={{ fontSize: 20, color: "rgba(244,234,210,0.42)" }}
                >
                  read 0%
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(244,234,210,0.4)",
                    marginTop: 4,
                    letterSpacing: "0.06em",
                  }}
                >
                  7 days, no reply
                </div>
              </div>
            </div>
            <div className="bam-msg-row bam-msg-live">
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(0,255,136,0.9)",
                    marginBottom: 4,
                  }}
                >
                  BuyAMinute Offer · $120
                </div>
                <div style={{ fontSize: 14, color: "rgba(244,234,210,0.95)" }}>
                  &quot;10 min on a wedge problem.&quot;
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="bam-num" style={{ fontSize: 20, fontWeight: "bold", color: "#00ff88" }}>
                  picked up
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(0,255,136,0.8)",
                    marginTop: 4,
                    letterSpacing: "0.06em",
                  }}
                >
                  47 seconds
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bam-card">
          <div
            className="bam-eyebrow"
            style={{
              background: "rgba(244,234,210,0.08)",
              color: "rgba(244,234,210,0.7)",
              marginBottom: 20,
            }}
          >
            Zero Risk
          </div>
          <h2 className="bam-section-title">
            Pay only while you&apos;re{" "}
            <span style={{ fontStyle: "italic", color: "#00ff88" }}>
              talking.
            </span>
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "rgba(244,234,210,0.65)",
              lineHeight: 1.6,
              margin: "0 0 24px",
            }}
          >
            The first 30 seconds are free—bail if the vibe is off. If they
            don&apos;t answer, the funds never leave your wallet.
          </p>
          <div className="bam-risk-grid">
            <div
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(244,234,210,0.1)",
                borderRadius: 16,
                padding: 20,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(244,234,210,0.5)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Preview Mode
              </div>
              <div className="bam-num" style={{ fontSize: 26, fontWeight: "bold" }}>
                {previewText}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(244,234,210,0.45)",
                  marginTop: 6,
                }}
              >
                100% Free
              </div>
            </div>
            <div
              style={{
                background: "rgba(0,255,136,0.05)",
                border: "1px solid rgba(0,255,136,0.25)",
                borderRadius: 16,
                padding: 20,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(244,234,210,0.5)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                If Ignored
              </div>
              <div
                style={{
                  fontSize: 22,
                  color: "#00ff88",
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                Full Refund
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(244,234,210,0.45)",
                  marginTop: 6,
                }}
              >
                Automatic
              </div>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(244,234,210,0.1)",
                borderRadius: 16,
                padding: 20,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(244,234,210,0.5)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Hang up early
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}>
                Billing Stops
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(244,234,210,0.45)",
                  marginTop: 6,
                }}
              >
                Instantly
              </div>
            </div>
          </div>
        </div>

        <div className="bam-card">
          <div
            className="bam-eyebrow"
            style={{
              background: "rgba(244,234,210,0.08)",
              color: "rgba(244,234,210,0.7)",
              marginBottom: 20,
            }}
          >
            ROI Calculator
          </div>
          <h2 className="bam-section-title">
            Your time is money.<br />
            <span style={{ fontStyle: "italic", color: "#72d7ff" }}>Stop wasting it on dead ends.</span>
          </h2>
          <div style={{ marginBottom: 16, marginTop: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 10,
                color: "rgba(244,234,210,0.65)",
              }}
            >
              <span>Your Hourly Rate</span>
              <span style={{ color: "#72d7ff", fontWeight: "bold" }}>${hourly}/hr</span>
            </div>
            <input
              className="bam-slider bam-s-blue"
              type="range"
              min={50}
              max={1000}
              value={hourly}
              step={25}
              onChange={(e) => setHourly(parseInt(e.target.value, 10))}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 10,
                color: "rgba(244,234,210,0.65)",
              }}
            >
              <span>Actual Call Length</span>
              <span style={{ color: "#72d7ff", fontWeight: "bold" }}>{actualMins} min</span>
            </div>
            <input
              className="bam-slider bam-s-blue"
              type="range"
              min={5}
              max={60}
              value={actualMins}
              step={1}
              onChange={(e) => setActualMins(parseInt(e.target.value, 10))}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 10,
                color: "rgba(244,234,210,0.65)",
              }}
            >
              <span>Calls Attempted / Month</span>
              <span style={{ color: "#72d7ff", fontWeight: "bold" }}>{callsPerMonth}</span>
            </div>
            <input
              className="bam-slider bam-s-blue"
              type="range"
              min={1}
              max={20}
              value={callsPerMonth}
              step={1}
              onChange={(e) => setCallsPerMonth(parseInt(e.target.value, 10))}
            />
          </div>
          <div
            style={{
              paddingTop: 24,
              borderTop: "1px solid rgba(244,234,210,0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "rgba(244,234,210,0.5)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Time Saved / Year
            </div>
            <div
              className="bam-num"
              style={{ fontSize: 52, fontWeight: "bold", color: "#72d7ff", lineHeight: 0.9, textShadow: "0 0 20px rgba(114,215,255,0.2)" }}
            >
              ${yearlySaved}
            </div>
          </div>
        </div>

        <div
          className="bam-card"
          style={{
            background:
              "linear-gradient(180deg, rgba(114,215,255,0.08), rgba(114,215,255,0.02))",
            borderColor: "rgba(114,215,255,0.3)",
            textAlign: "center",
            padding: "56px 24px",
          }}
        >
          <div
            className="bam-num"
            style={{
              fontStyle: "italic",
              fontSize: clamp(28px, 5vw, 38px),
              lineHeight: 1.25,
              color: "rgba(244,234,210,0.9)",
              marginBottom: 32,
            }}
          >
            You don&apos;t need connections.<br />
            <span style={{ color: "#72d7ff", fontWeight: "bold" }}>You create them.</span>
          </div>
          <button
            type="button"
            className="bam-cta bam-cta-call"
            style={{ display: "inline-flex", width: "auto", margin: "0 auto", padding: "24px 36px" }}
            onClick={goBrowse}
          >
            <div className="bam-cta-row" style={{ marginBottom: 0 }}>
              <strong style={{ marginBottom: 0, fontSize: 24 }}>
                Send your first offer&nbsp;&nbsp;→
              </strong>
            </div>
          </button>
        </div>
      </main>

      <footer className="bam-footer">
        <span className="bam-footer-logo">buyaminute</span>
        <span>Voice &amp; video · paid by the second · 2026</span>
      </footer>

      {/* MODAL */}
      <div className={`bam-overlay${modalOpen ? " is-open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
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
                background: "rgba(114,215,255,0.1)",
                color: "#72d7ff",
                border: "1px solid rgba(114,215,255,0.3)",
                marginBottom: 16,
              }}
            >
              The Network Effect
            </div>
            <h3
              style={{
                fontFamily: "Georgia, serif",
                fontWeight: 400,
                fontSize: 34,
                letterSpacing: "-0.03em",
                margin: "0 0 12px",
                lineHeight: 1.15,
              }}
            >
              Who will you reach when{" "}
              <span style={{ fontStyle: "italic", color: "#72d7ff", fontWeight: "bold" }}>
                money
              </span>{" "}
              does the talking?
            </h3>
            <p
              style={{
                fontSize: 15,
                color: "rgba(244,234,210,0.65)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Whether it&apos;s securing an influencer for a campaign or grabbing 10 minutes with an industry veteran, paid links cut the line.
            </p>
          </div>
          <div className="bam-card bam-card-buyer-pink" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div
                className="bam-eyebrow"
                style={{ background: "rgba(255,122,184,0.1)", color: "#ff7ab8" }}
              >
                Creator Access
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(244,234,210,0.6)",
                  fontFamily: "'SFMono-Regular', monospace",
                }}
              >
                2m ago
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(255,122,184,0.1)",
                  border: "2px solid rgba(255,122,184,0.5)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "Georgia, serif",
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#ff7ab8",
                }}
              >
                L
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(244,234,210,0.6)" }}>
                  Connecting
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>
                  @lila.mood — IG · TikTok
                </div>
              </div>
            </div>
            <div
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,122,184,0.2)",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.25em",
                  color: "rgba(255,122,184,0.8)",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                Your offer
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <div
                  className="bam-num"
                  style={{ fontSize: 56, fontWeight: "bold", lineHeight: 1, color: "#ff7ab8", textShadow: "0 0 20px rgba(255,122,184,0.2)" }}
                >
                  $200
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 13,
                    color: "rgba(244,234,210,0.65)",
                    lineHeight: 1.6,
                  }}
                >
                  @$25/min
                  <br />
                  cap 8 min
                </div>
              </div>
            </div>
          </div>
          
          {/* Note: The 'Naval' scenario card remains structurally identical to the original[cite: 1], but adapted with these global CSS upgrades for spacing and readability. */}
          <div className="bam-card bam-card-buyer-gold" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div
                className="bam-eyebrow"
                style={{ background: "rgba(233,185,73,0.1)", color: "#e9b949" }}
              >
                Mentor Access
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(244,234,210,0.6)",
                  fontFamily: "'SFMono-Regular', monospace",
                }}
              >
                11m ago
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(233,185,73,0.1)",
                  border: "2px solid rgba(233,185,73,0.5)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "Georgia, serif",
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#e9b949",
                }}
              >
                N
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(244,234,210,0.6)" }}>
                  Connecting
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>
                  Naval — author, founder
                </div>
              </div>
            </div>
            <div
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(233,185,73,0.2)",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.25em",
                  color: "rgba(233,185,73,0.85)",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                Your offer
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <div
                  className="bam-num"
                  style={{ fontSize: 56, fontWeight: "bold", lineHeight: 1, color: "#e9b949", textShadow: "0 0 20px rgba(233,185,73,0.2)" }}
                >
                  $1,500
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 13,
                    color: "rgba(244,234,210,0.65)",
                    lineHeight: 1.6,
                  }}
                >
                  @$150/min
                  <br />
                  cap 10 min
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

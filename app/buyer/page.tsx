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

  /* ── Live ticker state (replaces setInterval/DOM JS) ── */
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
        @keyframes bam-modal-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes bam-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        .bam-pulse { width: 7px; height: 7px; background: #00ff88; border-radius: 50%; box-shadow: 0 0 18px #00ff88; animation: bam-pulse 1.25s ease-in-out infinite; display: inline-block; }
        .bam-pulse-blue { background: #72d7ff; box-shadow: 0 0 18px #72d7ff; }
        .bam-cursor { display: inline-block; width: 2px; height: 0.85em; background: currentColor; vertical-align: -2px; animation: bam-cursor 1s steps(1) infinite; margin-left: 3px; }

        .bam-card { border: 1px solid rgba(244,234,210,0.1); border-radius: 22px; padding: 22px; background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.005)), #0c0907; box-shadow: 0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.03); }
        .bam-card-buyer { background: linear-gradient(180deg, rgba(114,215,255,0.05), rgba(255,255,255,0.005)), #06120f; border-color: rgba(114,215,255,0.18); }
        .bam-card-buyer-pink { background: linear-gradient(180deg, rgba(255,122,184,0.06), rgba(255,255,255,0.005)), #140a10; border-color: rgba(255,122,184,0.22); }
        .bam-card-buyer-gold { background: linear-gradient(180deg, rgba(233,185,73,0.05), rgba(255,255,255,0.005)), #14100a; border-color: rgba(233,185,73,0.22); }
        .bam-slider { width: 100%; height: 3px; background: rgba(244,234,210,0.1); -webkit-appearance: none; appearance: none; outline: none; cursor: pointer; border-radius: 2px; }
        .bam-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; cursor: pointer; }
        .bam-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; cursor: pointer; border: none; }
        .bam-s-blue::-webkit-slider-thumb { background: #72d7ff; box-shadow: 0 0 12px rgba(114,215,255,0.6); }
        .bam-s-blue::-moz-range-thumb { background: #72d7ff; box-shadow: 0 0 12px rgba(114,215,255,0.6); }
        .bam-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; border-radius: 999px; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; }
        .bam-num { font-variant-numeric: tabular-nums; font-family: Georgia, 'Times New Roman', serif; letter-spacing: -0.04em; }
        .bam-msg-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 14px; font-size: 12px; }
        .bam-msg-dead { background: rgba(255,255,255,0.025); border: 1px solid rgba(244,234,210,0.06); color: rgba(244,234,210,0.42); }
        .bam-msg-live { background: rgba(0,255,136,0.05); border: 1px solid rgba(0,255,136,0.28); color: #b9fbe0; box-shadow: 0 0 0 1px rgba(0,255,136,0.05) inset; }

        .bam-cta-stack { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .bam-cta { padding: 18px 20px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; text-align: left; text-decoration: none; color: #f4ead2; position: relative; overflow: hidden; isolation: isolate; transition: transform 0.25s, background 0.25s, border-color 0.25s; cursor: pointer; border-radius: 18px; border: 1px solid; font-family: inherit; }
        .bam-cta::before { content: ''; position: absolute; inset: 0; opacity: 0.4; transition: opacity 0.25s; z-index: -1; }
        .bam-cta.bam-cta-call { background: linear-gradient(180deg, rgba(114,215,255,0.08), rgba(114,215,255,0.02)); border-color: rgba(114,215,255,0.35); }
        .bam-cta.bam-cta-call::before { background: radial-gradient(circle at 20% 25%, rgba(114,215,255,0.3), transparent 55%); }
        .bam-cta.bam-cta-offer { background: linear-gradient(180deg, rgba(114,215,255,0.045), rgba(114,215,255,0.012)); border-color: rgba(114,215,255,0.22); border-style: dashed; }
        .bam-cta.bam-cta-offer::before { background: radial-gradient(circle at 80% 25%, rgba(114,215,255,0.18), transparent 55%); }
        .bam-cta:hover { transform: translateY(-2px); border-style: solid; }
        .bam-cta.bam-cta-call:hover { background: linear-gradient(180deg, rgba(114,215,255,0.13), rgba(114,215,255,0.04)); border-color: rgba(114,215,255,0.6); }
        .bam-cta.bam-cta-offer:hover { background: linear-gradient(180deg, rgba(114,215,255,0.09), rgba(114,215,255,0.03)); border-color: rgba(114,215,255,0.5); }
        .bam-cta:hover::before { opacity: 0.7; }
        .bam-cta-row { display: flex; align-items: baseline; justify-content: space-between; width: 100%; gap: 12px; margin-bottom: 4px; }
        .bam-cta-kicker { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(244,234,210,0.55); }
        .bam-cta-arrow { font-size: 18px; color: rgba(244,234,210,0.5); transition: transform 0.25s, color 0.25s; }
        .bam-cta:hover .bam-cta-arrow { transform: translateX(3px); color: #72d7ff; }
        .bam-cta strong { font-family: Georgia, serif; font-size: 22px; font-weight: 400; letter-spacing: -0.035em; line-height: 1; margin-bottom: 4px; display: block; color: #72d7ff; }
        .bam-cta em { font-style: normal; color: rgba(244,234,210,0.55); font-size: 11px; letter-spacing: 0.04em; }

        .bam-blade { font-family: Georgia, serif; font-style: italic; font-size: clamp(22px, 3vw, 34px); line-height: 1.2; letter-spacing: -0.025em; color: rgba(244,234,210,0.55); padding: 8px 4px; text-align: center; }
        .bam-blade span { color: #72d7ff; }
        .bam-scenarios-btn { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: rgba(114,215,255,0.04); border: 1px dashed rgba(114,215,255,0.32); border-radius: 14px; color: #72d7ff; font-size: 13px; letter-spacing: 0.05em; cursor: pointer; transition: background 0.2s, border-color 0.2s; font-family: inherit; width: 100%; }
        .bam-scenarios-btn:hover { background: rgba(114,215,255,0.08); border-color: rgba(114,215,255,0.55); border-style: solid; }
        .bam-overlay { position: fixed; inset: 0; background: rgba(2,2,2,0.78); backdrop-filter: blur(14px); z-index: 9998; display: none; animation: bam-overlay-in 0.2s ease-out; }
        .bam-overlay.is-open { display: flex; align-items: flex-start; justify-content: center; padding: 6vh 24px; overflow-y: auto; }
        .bam-modal { max-width: 560px; width: 100%; background: linear-gradient(180deg, #0d0a07, #06050a); border: 1px solid rgba(244,234,210,0.13); border-radius: 26px; padding: 28px; position: relative; box-shadow: 0 40px 100px rgba(0,0,0,0.7); animation: bam-modal-in 0.28s cubic-bezier(.2,.8,.2,1); display: flex; flex-direction: column; gap: 14px; }
        .bam-modal-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border-radius: 50%; background: rgba(244,234,210,0.06); border: 1px solid rgba(244,234,210,0.12); color: rgba(244,234,210,0.7); font-size: 16px; line-height: 1; cursor: pointer; display: grid; place-items: center; }
        .bam-modal-close:hover { background: rgba(244,234,210,0.12); }

        .bam-nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 32px; border-bottom: 1px solid rgba(244,234,210,0.08); background: rgba(5,4,3,0.78); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(18px); }
        .bam-nav-logo { font-family: Georgia, serif; font-style: italic; font-size: 22px; letter-spacing: -0.03em; }
        .bam-nav-links { display: flex; gap: 22px; align-items: center; font-size: 11px; letter-spacing: 0.13em; text-transform: uppercase; color: rgba(244,234,210,0.55); }
        .bam-nav-links a, .bam-nav-links button { color: inherit; text-decoration: none; background: none; border: none; cursor: pointer; font-family: inherit; font-size: 11px; letter-spacing: 0.13em; text-transform: uppercase; padding: 0; }
        .bam-nav-links a.accent, .bam-nav-links button.accent { color: #e9b949; }

        .bam-hero { max-width: 760px; margin: 0 auto; padding: clamp(48px, 8vw, 96px) 24px clamp(32px, 4vw, 48px); text-align: center; }
        .bam-hero-eyebrow { display: inline-flex; align-items: center; gap: 10px; padding: 7px 13px; border-radius: 999px; background: rgba(114,215,255,0.08); color: #72d7ff; border: 1px solid rgba(114,215,255,0.2); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 24px; }
        .bam-hero-headline { font-family: Georgia, serif; font-weight: 400; font-style: italic; font-size: clamp(38px, 6vw, 72px); line-height: 1.02; letter-spacing: -0.045em; margin: 0 0 20px; }
        .bam-hero-headline em { font-style: normal; color: #72d7ff; }
        .bam-hero-copy { color: rgba(244,234,210,0.6); font-size: clamp(15px, 1.5vw, 18px); line-height: 1.6; max-width: 560px; margin: 0 auto; }

        .bam-body { max-width: 620px; margin: 0 auto; padding: 0 24px clamp(64px, 8vw, 112px); display: flex; flex-direction: column; gap: 18px; }
        .bam-section-title { font-family: Georgia, serif; font-weight: 400; font-size: 26px; letter-spacing: -0.025em; margin: 0 0 14px; line-height: 1.15; }

        .bam-footer { padding: 2rem; border-top: 1px solid rgba(244,234,210,0.08); display: flex; justify-content: space-between; font-size: 11px; color: rgba(244,234,210,0.3); letter-spacing: 0.1em; text-transform: uppercase; flex-wrap: wrap; gap: 12px; }
        .bam-footer-logo { font-family: Georgia, serif; font-style: italic; color: rgba(244,234,210,0.5); text-transform: none; letter-spacing: -0.02em; font-size: 14px; }

        @media (max-width: 600px) {
          .bam-cta-stack { grid-template-columns: 1fr; }
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
          <span className="bam-pulse bam-pulse-blue"></span>
          If you&apos;re calling
        </div>
        <h1 className="bam-hero-headline">
          Money turns silence into a <em>reply.</em>
        </h1>
        <p className="bam-hero-copy">
          A free DM is asking. A paid offer is <em>arriving</em>. The same
          person who wouldn&apos;t reply for a week picks up in under a minute
          when there&apos;s money on the line.
        </p>
      </header>

      <main className="bam-body">
        <div className="bam-card bam-card-buyer">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <div
              className="bam-eyebrow"
              style={{ background: "rgba(114,215,255,0.06)", color: "#72d7ff" }}
            >
              Outgoing offer
            </div>
            <span
              style={{
                fontSize: 11,
                color: "rgba(244,234,210,0.5)",
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
              gap: 14,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(114,215,255,0.08)",
                border: "1px solid rgba(114,215,255,0.4)",
                display: "grid",
                placeItems: "center",
                fontFamily: "Georgia, serif",
                fontSize: 22,
                color: "#72d7ff",
              }}
            >
              A
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: "rgba(244,234,210,0.5)" }}>
                To
              </div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                @anyone — even if they&apos;ve never heard of you
              </div>
            </div>
          </div>
          <div
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(114,215,255,0.16)",
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.22em",
                color: "rgba(114,215,255,0.7)",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Your offer
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <div
                className="bam-num"
                style={{ fontSize: 64, lineHeight: 1, color: "#72d7ff" }}
              >
                $120
                <span className="bam-cursor" style={{ color: "#72d7ff" }}></span>
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: 11,
                  color: "rgba(244,234,210,0.55)",
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
                fontSize: 12,
                lineHeight: 1.6,
                color: "rgba(244,234,210,0.78)",
                padding: 14,
                background: "rgba(255,255,255,0.025)",
                borderRadius: 12,
                border: "1px solid rgba(244,234,210,0.06)",
              }}
            >
              &quot;Hey — I&apos;m building in your space and want 10 min of your
              honest take on a wedge problem. Offer attached, no slides.&quot;
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(244,234,210,0.08)",
              borderRadius: 14,
              padding: 14,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "4px 14px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                color: "rgba(244,234,210,0.45)",
                textTransform: "uppercase",
              }}
            >
              Status
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "#00ff88",
              }}
            >
              <span className="bam-pulse"></span> Picked up in 47s
            </div>
            <div
              style={{
                gridColumn: "1 / -1",
                fontSize: 11,
                color: "rgba(244,234,210,0.4)",
                marginTop: 4,
              }}
            >
              Charged only for the time you&apos;re connected. Hangs up early →
              you only pay the seconds you used.
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
            <em>See who&apos;s online · dial in</em>
          </button>
          <button
            type="button"
            className="bam-cta bam-cta-offer"
            onClick={goBrowse}
          >
            <div className="bam-cta-row">
              <span className="bam-cta-kicker">Pick someone specific</span>
              <span className="bam-cta-arrow">→</span>
            </div>
            <strong>Create a paid call offer</strong>
            <em>Invite anyone — even off-platform</em>
          </button>
        </div>

        <div className="bam-blade">
          Don&apos;t wait to be <span>replied to.</span>
        </div>

        <button
          className="bam-scenarios-btn"
          type="button"
          onClick={() => setModalOpen(true)}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "rgba(114,215,255,0.12)",
                border: "1px solid rgba(114,215,255,0.4)",
                display: "grid",
                placeItems: "center",
                fontSize: 13,
              }}
            >
              +
            </span>
            See other scenarios where a call offer wins
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
            Same person · two requests
          </div>
          <h2 className="bam-section-title">
            One sits in{" "}
            <span style={{ fontStyle: "italic", color: "rgba(244,234,210,0.4)" }}>
              silence
            </span>
            . The other
            <br />
            <span style={{ fontStyle: "italic", color: "#72d7ff" }}>rings.</span>
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(244,234,210,0.55)",
              lineHeight: 1.6,
              margin: "0 0 18px",
            }}
          >
            Free messages are noise. A paid offer is a real signal — money is
            the universal language for &quot;this is worth your time.&quot;
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            <div className="bam-msg-row bam-msg-dead">
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(244,234,210,0.55)",
                    marginBottom: 3,
                  }}
                >
                  Cold DM
                </div>
                <div style={{ fontSize: 13 }}>
                  &quot;Hey, would love to chat sometime…&quot;
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  className="bam-num"
                  style={{ fontSize: 18, color: "rgba(244,234,210,0.42)" }}
                >
                  read 0%
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(244,234,210,0.35)",
                    marginTop: 3,
                    letterSpacing: "0.06em",
                  }}
                >
                  7 days, no reply
                </div>
              </div>
            </div>
            <div className="bam-msg-row bam-msg-dead">
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(244,234,210,0.55)",
                    marginBottom: 3,
                  }}
                >
                  Cold email
                </div>
                <div style={{ fontSize: 13 }}>
                  &quot;Quick favor: 15 min on Zoom?&quot;
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  className="bam-num"
                  style={{ fontSize: 18, color: "rgba(244,234,210,0.42)" }}
                >
                  spam
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(244,234,210,0.35)",
                    marginTop: 3,
                    letterSpacing: "0.06em",
                  }}
                >
                  never opened
                </div>
              </div>
            </div>
            <div className="bam-msg-row bam-msg-live">
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(0,255,136,0.85)",
                    marginBottom: 3,
                  }}
                >
                  Paid offer · $120
                </div>
                <div style={{ fontSize: 13, color: "rgba(244,234,210,0.92)" }}>
                  &quot;10 min on a wedge problem.&quot;
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="bam-num" style={{ fontSize: 18, color: "#00ff88" }}>
                  picked up
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(0,255,136,0.7)",
                    marginTop: 3,
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
              background: "rgba(244,234,210,0.05)",
              color: "rgba(244,234,210,0.6)",
              marginBottom: 16,
            }}
          >
            No risk to send
          </div>
          <h2 className="bam-section-title">
            Pay only while you&apos;re{" "}
            <span style={{ fontStyle: "italic", color: "#00ff88" }}>
              connected.
            </span>
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(244,234,210,0.55)",
              lineHeight: 1.6,
              margin: "0 0 20px",
            }}
          >
            First 30 seconds are free — bail if the vibe is off. If they
            don&apos;t pick up at all, your money never leaves your wallet.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            <div
              style={{
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(244,234,210,0.08)",
                borderRadius: 14,
                padding: 14,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(244,234,210,0.45)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Preview
              </div>
              <div className="bam-num" style={{ fontSize: 22 }}>
                {previewText}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(244,234,210,0.4)",
                  marginTop: 4,
                }}
              >
                Free
              </div>
            </div>
            <div
              style={{
                background: "rgba(0,255,136,0.04)",
                border: "1px solid rgba(0,255,136,0.22)",
                borderRadius: 14,
                padding: 14,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(244,234,210,0.45)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                No answer
              </div>
              <div
                style={{
                  fontSize: 18,
                  color: "#00ff88",
                  fontWeight: 500,
                  marginTop: 2,
                }}
              >
                Refund
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(244,234,210,0.4)",
                  marginTop: 4,
                }}
              >
                Auto
              </div>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(244,234,210,0.08)",
                borderRadius: 14,
                padding: 14,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(244,234,210,0.45)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Hang up
              </div>
              <div style={{ fontSize: 18, fontWeight: 500, marginTop: 2 }}>
                Stops
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(244,234,210,0.4)",
                  marginTop: 4,
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
              background: "rgba(244,234,210,0.05)",
              color: "rgba(244,234,210,0.6)",
              marginBottom: 16,
            }}
          >
            Save calculator
          </div>
          <h2 className="bam-section-title">
            What could{" "}
            <span style={{ fontStyle: "italic", color: "#72d7ff" }}>you</span>{" "}
            save by the second?
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
              <span>Hourly rate</span>
              <span style={{ color: "#72d7ff" }}>${hourly}/hr</span>
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
              <span>Actual length</span>
              <span style={{ color: "#72d7ff" }}>{actualMins} min</span>
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
              <span>Calls / month</span>
              <span style={{ color: "#72d7ff" }}>{callsPerMonth}</span>
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
              Saved / year
            </div>
            <div
              className="bam-num"
              style={{ fontSize: 44, color: "#72d7ff", lineHeight: 0.9 }}
            >
              ${yearlySaved}
            </div>
          </div>
        </div>

        <div
          className="bam-card"
          style={{
            background:
              "linear-gradient(180deg, rgba(114,215,255,0.06), rgba(114,215,255,0.02))",
            borderColor: "rgba(114,215,255,0.25)",
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
            You don&apos;t need access.
            <br />
            <span style={{ color: "#72d7ff" }}>You create it.</span>
          </div>
          <button
            type="button"
            className="bam-cta bam-cta-call"
            style={{ display: "inline-flex", width: "auto" }}
            onClick={goBrowse}
          >
            <div className="bam-cta-row" style={{ marginBottom: 0 }}>
              <strong style={{ marginBottom: 0, fontSize: 20 }}>
                Create a paid call offer&nbsp;&nbsp;→
              </strong>
            </div>
          </button>
        </div>
      </main>

      <footer className="bam-footer">
        <span className="bam-footer-logo">buyaminute</span>
        <span>Voice &amp; video · paid by the second · 2026</span>
      </footer>

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
                background: "rgba(114,215,255,0.08)",
                color: "#72d7ff",
                border: "1px solid rgba(114,215,255,0.2)",
                marginBottom: 14,
              }}
            >
              More scenarios
            </div>
            <h3
              style={{
                fontFamily: "Georgia, serif",
                fontWeight: 400,
                fontSize: 30,
                letterSpacing: "-0.03em",
                margin: "0 0 8px",
                lineHeight: 1.1,
              }}
            >
              Two more places where{" "}
              <span style={{ fontStyle: "italic", color: "#72d7ff" }}>
                money
              </span>{" "}
              makes the phone ring.
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "rgba(244,234,210,0.55)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Same mechanic, different rooms.
            </p>
          </div>
          <div className="bam-card bam-card-buyer-pink" style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div
                className="bam-eyebrow"
                style={{ background: "rgba(255,122,184,0.08)", color: "#ff7ab8" }}
              >
                Outgoing offer · DM-land
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(244,234,210,0.5)",
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
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,122,184,0.08)",
                  border: "1px solid rgba(255,122,184,0.4)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "Georgia, serif",
                  fontSize: 20,
                  color: "#ff7ab8",
                }}
              >
                L
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "rgba(244,234,210,0.5)" }}>
                  To
                </div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>
                  @lila.mood — IG · TikTok · OF
                </div>
              </div>
            </div>
            <div
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,122,184,0.16)",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  color: "rgba(255,122,184,0.7)",
                  textTransform: "uppercase",
                  marginBottom: 12,
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
                  style={{ fontSize: 48, lineHeight: 1, color: "#ff7ab8" }}
                >
                  $200
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 11,
                    color: "rgba(244,234,210,0.55)",
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
          <div className="bam-card bam-card-buyer-gold" style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div
                className="bam-eyebrow"
                style={{ background: "rgba(233,185,73,0.08)", color: "#e9b949" }}
              >
                Outgoing offer · Mentor-land
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(244,234,210,0.5)",
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
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(233,185,73,0.08)",
                  border: "1px solid rgba(233,185,73,0.4)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "Georgia, serif",
                  fontSize: 20,
                  color: "#e9b949",
                }}
              >
                N
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "rgba(244,234,210,0.5)" }}>
                  To
                </div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>
                  Naval — author, founder, late-replier
                </div>
              </div>
            </div>
            <div
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(233,185,73,0.16)",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  color: "rgba(233,185,73,0.75)",
                  textTransform: "uppercase",
                  marginBottom: 12,
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
                  style={{ fontSize: 48, lineHeight: 1, color: "#e9b949" }}
                >
                  $1,500
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 11,
                    color: "rgba(244,234,210,0.55)",
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

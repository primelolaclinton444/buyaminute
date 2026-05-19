"use client";

import { Inter } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildAuthRedirect } from "@/components/auth/AuthGuard";

/* ── Font ───────────────────────────────────────────
   Inter for UI text; Georgia stays as the editorial
   serif the design is built around. */
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter-bam",
});

/* ── Count-up hook: animates a number once on mount ── */
function useCountUp(target: number, duration = 1400, decimals = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(target * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return decimals > 0 ? value.toFixed(decimals) : Math.round(value);
}

export default function OrientationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { expired } = useAuth();

  /* ── Routing helpers ─────────────────────────────── */
  const goBuyer = () => router.push("/buyer");
  const goSeller = () => router.push("/seller");
  const goMain = () => router.push("/main");
  const goSignup = () => router.push("/signup");
  const goLogin = () => router.push(buildAuthRedirect({ pathname, expired }));

  /* ── Which side is being hovered (tension effect) ── */
  const [lean, setLean] = useState<"buyer" | "seller" | null>(null);

  /* ── Animated stat values ────────────────────────── */
  const pickup = useCountUp(11, 1100);
  const accept = useCountUp(68, 1500);
  const earned = useCountUp(94, 1300);
  const calls = useCountUp(2847, 1700);

  /* ── Reveal-on-mount flag for staggered entrance ─── */
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(t);
  }, []);

  /* ── Synthesis section scroll-reveal ─────────────── */
  const synthRef = useRef<HTMLElement | null>(null);
  const [synthIn, setSynthIn] = useState(false);
  useEffect(() => {
    const el = synthRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSynthIn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`${inter.variable} bam-root${revealed ? " is-revealed" : ""}`}
      data-lean={lean ?? "none"}
      style={{
        fontFamily:
          "var(--font-inter-bam), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#f4ead2",
        margin: 0,
        padding: 0,
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflowX: "hidden",
        background: "#040303",
      }}
    >
      <style>{`
        /* ─────────── KEYFRAMES ─────────── */
        @keyframes bam-pulse { 0%, 100% { opacity: 0.4; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes bam-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes bam-seam-flow {
          0% { background-position: 0 0, 0 -200px; }
          100% { background-position: 0 0, 0 200px; }
        }
        @keyframes bam-glow-drift-l {
          0%, 100% { transform: translate(-4%, -2%) scale(1); opacity: 0.5; }
          50% { transform: translate(4%, 3%) scale(1.12); opacity: 0.78; }
        }
        @keyframes bam-glow-drift-r {
          0%, 100% { transform: translate(4%, 2%) scale(1.08); opacity: 0.55; }
          50% { transform: translate(-4%, -3%) scale(1); opacity: 0.82; }
        }
        @keyframes bam-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bam-seam-node {
          0%, 100% { box-shadow: 0 0 14px rgba(244,234,210,0.18), 0 0 0 0 rgba(244,234,210,0.12); }
          50% { box-shadow: 0 0 22px rgba(244,234,210,0.32), 0 0 0 7px rgba(244,234,210,0); }
        }
        @keyframes bam-grain {
          0%, 100% { transform: translate(0,0); }
          25% { transform: translate(-2%, 1%); }
          50% { transform: translate(1%, -2%); }
          75% { transform: translate(2%, 2%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .bam-glow-l, .bam-glow-r, .bam-seam, .bam-seam-node,
          .bam-grain, .bam-dot { animation: none !important; }
          .bam-rise-item { opacity: 1 !important; transform: none !important; }
        }

        /* ─────────── ATMOSPHERE ─────────── */
        .bam-root::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(120% 80% at 50% -10%, rgba(28,22,12,0.55), transparent 60%),
            radial-gradient(100% 100% at 50% 120%, rgba(0,0,0,0.9), transparent 55%),
            linear-gradient(180deg, #0a0805, #050403 46%, #020202);
        }
        .bam-grain {
          position: fixed; inset: -50%; z-index: 1; pointer-events: none;
          opacity: 0.5; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
          animation: bam-grain 8s steps(4) infinite;
        }
        .bam-root > * { position: relative; z-index: 2; }

        /* ─────────── NAV ─────────── */
        .bam-nav {
          height: 60px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 clamp(20px, 4vw, 44px);
          border-bottom: 1px solid rgba(244,234,210,0.07);
          background: rgba(5,4,3,0.7);
          backdrop-filter: blur(20px) saturate(1.2);
          -webkit-backdrop-filter: blur(20px) saturate(1.2);
        }
        .bam-logo {
          font-family: Georgia, "Times New Roman", serif;
          font-style: italic; font-size: clamp(19px, 2vw, 23px);
          letter-spacing: -0.035em; color: #f4ead2;
          position: relative;
        }
        .bam-logo::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -3px;
          height: 1px; background: linear-gradient(90deg, #72d7ff, #00ff88);
          transition: right 0.5s cubic-bezier(.2,.8,.2,1);
        }
        .bam-logo:hover::after { right: 0; }
        .bam-nav-links { display: flex; gap: clamp(14px, 2.4vw, 26px); align-items: center; }
        .bam-nav-links button {
          background: none; border: none; cursor: pointer; padding: 6px 2px;
          font-family: inherit; color: rgba(244,234,210,0.6);
          font-size: clamp(9px, 1vw, 11px); letter-spacing: 0.18em; text-transform: uppercase;
          transition: color 0.25s;
        }
        .bam-nav-links button:hover { color: #f4ead2; }
        .bam-nav-cta {
          color: #0a0805 !important;
          background: linear-gradient(135deg, #f3cc6d, #e9b949) !important;
          padding: 8px 16px !important; border-radius: 999px;
          letter-spacing: 0.14em !important; font-weight: 600;
          box-shadow: 0 4px 18px rgba(233,185,73,0.28);
          transition: transform 0.22s, box-shadow 0.22s !important;
        }
        .bam-nav-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 26px rgba(233,185,73,0.42);
        }

        /* ─────────── STAGE / TWO FORCES ─────────── */
        .bam-stage {
          flex: 1; display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
          max-width: 1500px; width: 100%; margin: 0 auto;
          min-height: calc(100dvh - 60px - 56px);
        }
        @media (max-width: 900px) {
          .bam-stage { grid-template-columns: 1fr; }
        }

        .bam-side {
          position: relative; isolation: isolate;
          padding: clamp(28px, 4.5vh, 60px) clamp(26px, 4vw, 64px);
          display: flex; flex-direction: column; justify-content: center;
          gap: clamp(14px, 2vh, 22px);
          transition: filter 0.5s cubic-bezier(.2,.8,.2,1),
                      transform 0.5s cubic-bezier(.2,.8,.2,1),
                      opacity 0.5s;
          overflow: hidden;
        }
        .bam-side-buyer  { padding-right: clamp(36px, 5vw, 84px); }
        .bam-side-seller { padding-left:  clamp(36px, 5vw, 84px); }
        @media (max-width: 900px) {
          .bam-side { padding: clamp(40px,7vh,72px) clamp(24px,7vw,40px); min-height: 84vh; }
          .bam-side-buyer { border-bottom: 1px solid rgba(244,234,210,0.08); }
        }

        /* ambient glow behind each side */
        .bam-glow-l, .bam-glow-r {
          position: absolute; z-index: -2; border-radius: 50%;
          filter: blur(70px); pointer-events: none;
        }
        .bam-glow-l {
          width: 60%; aspect-ratio: 1; top: 8%; left: -8%;
          background: radial-gradient(circle, rgba(114,215,255,0.22), transparent 68%);
          animation: bam-glow-drift-l 14s ease-in-out infinite;
        }
        .bam-glow-r {
          width: 60%; aspect-ratio: 1; bottom: 6%; right: -8%;
          background: radial-gradient(circle, rgba(0,255,136,0.2), transparent 68%);
          animation: bam-glow-drift-r 16s ease-in-out infinite;
        }

        /* the tension: hovered side leans in & brightens, other recedes */
        .bam-root[data-lean="buyer"]  .bam-side-seller,
        .bam-root[data-lean="seller"] .bam-side-buyer {
          filter: brightness(0.6) saturate(0.7);
          opacity: 0.82;
        }
        .bam-root[data-lean="buyer"]  .bam-side-buyer  { transform: translateX(6px); }
        .bam-root[data-lean="seller"] .bam-side-seller { transform: translateX(-6px); }
        @media (max-width: 900px) {
          .bam-root[data-lean] .bam-side { transform: none; }
        }

        /* ─────────── CENTER SEAM ─────────── */
        .bam-seam {
          position: absolute; top: 0; bottom: 0; left: 50%;
          width: 1px; transform: translateX(-50%); z-index: 5;
          background:
            linear-gradient(180deg,
              transparent, rgba(244,234,210,0.16) 14%,
              rgba(244,234,210,0.16) 86%, transparent),
            linear-gradient(180deg,
              rgba(114,215,255,0.5), rgba(244,234,210,0.1) 45%,
              rgba(0,255,136,0.5));
          background-size: 100% 100%, 100% 400px;
          background-repeat: no-repeat, repeat-y;
          animation: bam-seam-flow 6s linear infinite;
        }
        .bam-seam-node {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 30px; height: 30px; border-radius: 50%; z-index: 6;
          background: #0a0805;
          border: 1px solid rgba(244,234,210,0.16);
          display: grid; place-items: center;
          font-family: Georgia, serif; font-size: 13px;
          color: rgba(244,234,210,0.45);
          animation: bam-seam-node 3.4s ease-in-out infinite;
        }
        @media (max-width: 900px) {
          .bam-seam, .bam-seam-node { display: none; }
        }

        /* ─────────── STAGGERED REVEAL ─────────── */
        .bam-rise-item { opacity: 0; }
        .bam-root.is-revealed .bam-rise-item {
          animation: bam-rise 0.7s cubic-bezier(.2,.8,.2,1) forwards;
        }
        .bam-root.is-revealed .bam-d1 { animation-delay: 0.05s; }
        .bam-root.is-revealed .bam-d2 { animation-delay: 0.15s; }
        .bam-root.is-revealed .bam-d3 { animation-delay: 0.27s; }
        .bam-root.is-revealed .bam-d4 { animation-delay: 0.4s; }
        .bam-root.is-revealed .bam-d5 { animation-delay: 0.54s; }
        .bam-root.is-revealed .bam-d6 { animation-delay: 0.66s; }

        /* ─────────── TYPOGRAPHY / CONTENT ─────────── */
        .bam-eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: clamp(9px, 0.95vw, 11px); letter-spacing: 0.24em;
          text-transform: uppercase; font-weight: 500;
        }
        .bam-eyebrow-buyer  { color: #72d7ff; }
        .bam-eyebrow-seller { color: #00ff88; }
        .bam-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          display: inline-block;
        }
        .bam-dot-buyer  { background: #72d7ff; box-shadow: 0 0 16px #72d7ff;
          animation: bam-pulse 1.4s ease-in-out infinite; }
        .bam-dot-seller { background: #00ff88; box-shadow: 0 0 16px #00ff88;
          animation: bam-pulse 1.4s ease-in-out infinite; }

        .bam-headline {
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 400; font-style: italic;
          font-size: clamp(30px, 3.6vw, 52px);
          line-height: 1.04; letter-spacing: -0.04em;
          margin: 0; max-width: 15ch;
        }
        .bam-headline em { font-style: normal; }
        .bam-side-buyer  .bam-headline em { color: #72d7ff;
          text-shadow: 0 0 36px rgba(114,215,255,0.45); }
        .bam-side-seller .bam-headline em { color: #00ff88;
          text-shadow: 0 0 36px rgba(0,255,136,0.4); }

        /* PROMOTED supporting line — was grey fine print, now a pull-quote */
        .bam-pull {
          position: relative;
          padding-left: 18px;
          margin: 2px 0;
          font-family: Georgia, "Times New Roman", serif;
          font-style: italic;
          font-size: clamp(15px, 1.5vw, 20px);
          line-height: 1.4; letter-spacing: -0.015em;
          color: rgba(244,234,210,0.92);
          max-width: 24ch;
        }
        .bam-pull::before {
          content: ''; position: absolute; left: 0; top: 4px; bottom: 4px;
          width: 2px; border-radius: 2px;
        }
        .bam-side-buyer  .bam-pull::before {
          background: linear-gradient(180deg, #72d7ff, rgba(114,215,255,0.1)); }
        .bam-side-seller .bam-pull::before {
          background: linear-gradient(180deg, #00ff88, rgba(0,255,136,0.1)); }

        /* audience caption — small, supporting, clearly secondary */
        .bam-caption {
          font-size: clamp(12px, 1.1vw, 13.5px);
          line-height: 1.5; letter-spacing: 0.005em;
          color: rgba(244,234,210,0.5);
          max-width: 30ch; margin: 0;
        }
        .bam-caption strong { color: rgba(244,234,210,0.78); font-weight: 500; }

        /* ─────────── STAT STRIP ─────────── */
        .bam-stats {
          display: flex; align-items: stretch; gap: 0;
          border-radius: 14px; overflow: hidden;
          border: 1px solid rgba(244,234,210,0.09);
          background: rgba(255,255,255,0.018);
          backdrop-filter: blur(6px);
          max-width: 440px;
        }
        .bam-side-buyer  .bam-stats { border-color: rgba(114,215,255,0.2); }
        .bam-side-seller .bam-stats { border-color: rgba(0,255,136,0.2); }
        .bam-stat { padding: 13px 16px; flex: 1; }
        .bam-stat + .bam-stat { border-left: 1px solid rgba(244,234,210,0.08); }
        .bam-stat-value {
          font-family: Georgia, serif; font-variant-numeric: tabular-nums;
          font-size: clamp(20px, 2.1vw, 28px); line-height: 1;
          letter-spacing: -0.04em;
        }
        .bam-side-buyer  .bam-stat-value { color: #72d7ff; }
        .bam-side-seller .bam-stat-value { color: #00ff88; }
        .bam-stat-label {
          font-size: clamp(7.5px, 0.7vw, 9px); letter-spacing: 0.16em;
          text-transform: uppercase; color: rgba(244,234,210,0.5);
          margin-top: 6px;
        }
        .bam-stat-sub {
          font-size: clamp(7.5px, 0.65vw, 9px); font-style: italic;
          color: rgba(244,234,210,0.34); margin-top: 2px;
        }

        /* ─────────── DOOR (CTA) ─────────── */
        .bam-door {
          margin-top: 4px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; width: 100%; cursor: pointer;
          padding: 16px 18px; border-radius: 16px;
          text-align: left; font-family: inherit;
          position: relative; isolation: isolate; overflow: hidden;
          border: 1px solid; background: transparent;
          transition: transform 0.3s cubic-bezier(.2,.8,.2,1),
                      box-shadow 0.3s, border-color 0.3s;
        }
        .bam-door::before {
          content: ''; position: absolute; inset: 0; z-index: -1;
          opacity: 0.5; transition: opacity 0.3s;
        }
        .bam-door::after {
          content: ''; position: absolute; inset: 0; z-index: -1;
          background: linear-gradient(115deg, transparent 38%,
            rgba(255,255,255,0.13) 50%, transparent 62%);
          transform: translateX(-120%); transition: transform 0.6s ease;
        }
        .bam-door:hover::after { transform: translateX(120%); }
        .bam-door-buyer {
          border-color: rgba(114,215,255,0.42);
          box-shadow: 0 10px 34px rgba(0,0,0,0.5),
                      inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .bam-door-buyer::before {
          background: linear-gradient(135deg,
            rgba(114,215,255,0.16), rgba(114,215,255,0.03)); }
        .bam-door-seller {
          border-color: rgba(0,255,136,0.42);
          box-shadow: 0 10px 34px rgba(0,0,0,0.5),
                      inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .bam-door-seller::before {
          background: linear-gradient(135deg,
            rgba(0,255,136,0.15), rgba(0,255,136,0.03)); }
        .bam-door:hover { transform: translateY(-4px); }
        .bam-door-buyer:hover {
          border-color: rgba(114,215,255,0.85);
          box-shadow: 0 18px 46px rgba(114,215,255,0.2),
                      0 0 0 1px rgba(114,215,255,0.25),
                      inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .bam-door-seller:hover {
          border-color: rgba(0,255,136,0.85);
          box-shadow: 0 18px 46px rgba(0,255,136,0.18),
                      0 0 0 1px rgba(0,255,136,0.22),
                      inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .bam-door-text { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .bam-door-kicker {
          font-size: clamp(8px, 0.72vw, 9.5px); letter-spacing: 0.16em;
          text-transform: uppercase; color: rgba(244,234,210,0.5);
          line-height: 1.5;
        }
        .bam-door-title {
          font-family: Georgia, serif; font-weight: 400;
          font-size: clamp(17px, 1.9vw, 25px); letter-spacing: -0.035em;
          line-height: 1;
        }
        .bam-door-buyer  .bam-door-title { color: #72d7ff; }
        .bam-door-seller .bam-door-title { color: #00ff88; }
        .bam-door-arrow {
          flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%;
          display: grid; place-items: center;
          font-size: 17px; color: #f4ead2;
          border: 1px solid rgba(244,234,210,0.18);
          background: rgba(255,255,255,0.04);
          transition: transform 0.3s cubic-bezier(.2,.8,.2,1),
                      background 0.3s, border-color 0.3s;
        }
        .bam-door-buyer:hover .bam-door-arrow {
          transform: translateX(5px); border-color: rgba(114,215,255,0.6);
          background: rgba(114,215,255,0.14);
        }
        .bam-door-seller:hover .bam-door-arrow {
          transform: translateX(5px); border-color: rgba(0,255,136,0.6);
          background: rgba(0,255,136,0.14);
        }

        /* ─────────── TICKER ─────────── */
        .bam-ticker {
          height: 56px; flex-shrink: 0;
          background: rgba(4,3,3,0.96);
          border-top: 1px solid rgba(244,234,210,0.08);
          border-bottom: 1px solid rgba(244,234,210,0.08);
          overflow: hidden; display: flex; align-items: center;
          position: relative;
        }
        .bam-ticker::before, .bam-ticker::after {
          content: ''; position: absolute; top: 0; bottom: 0;
          width: 150px; z-index: 2; pointer-events: none;
        }
        .bam-ticker::before { left: 0;
          background: linear-gradient(90deg, #040303, transparent); }
        .bam-ticker::after { right: 0;
          background: linear-gradient(-90deg, #040303, transparent); }
        .bam-ticker-track {
          display: flex; gap: 46px; white-space: nowrap;
          animation: bam-marquee 58s linear infinite; will-change: transform;
        }
        .bam-ticker:hover .bam-ticker-track { animation-play-state: paused; }
        .bam-ti {
          display: inline-flex; align-items: center; gap: 9px;
          font-size: 12px; letter-spacing: 0.03em; color: rgba(244,234,210,0.5);
        }
        .bam-ti strong { color: #f4ead2; font-weight: 500; }
        .bam-ti .amt-g, .bam-ti .amt-b {
          font-family: Georgia, serif; font-style: italic;
          font-size: 14px; letter-spacing: -0.02em;
        }
        .bam-ti .amt-g { color: #00ff88; }
        .bam-ti .amt-b { color: #72d7ff; }

        /* ─────────── SYNTHESIS ─────────── */
        .bam-synth {
          text-align: center;
          padding: clamp(80px, 11vw, 150px) clamp(24px, 4vw, 48px) clamp(60px, 8vw, 100px);
          max-width: 760px; margin: 0 auto;
          display: flex; flex-direction: column; align-items: center;
          gap: clamp(22px, 2.6vw, 30px);
        }
        .bam-synth-item {
          opacity: 0; transform: translateY(22px);
          transition: opacity 0.8s cubic-bezier(.2,.8,.2,1),
                      transform 0.8s cubic-bezier(.2,.8,.2,1);
        }
        .bam-synth.is-in .bam-synth-item { opacity: 1; transform: translateY(0); }
        .bam-synth.is-in .bam-sy2 { transition-delay: 0.12s; }
        .bam-synth.is-in .bam-sy3 { transition-delay: 0.24s; }
        .bam-synth.is-in .bam-sy4 { transition-delay: 0.36s; }
        .bam-synth-eyebrow {
          font-size: clamp(9px, 0.85vw, 11px); letter-spacing: 0.34em;
          text-transform: uppercase; color: rgba(233,185,73,0.62);
          display: inline-flex; align-items: center; gap: 14px;
        }
        .bam-synth-eyebrow::before, .bam-synth-eyebrow::after {
          content: ''; width: clamp(28px, 4vw, 52px); height: 1px;
          background: rgba(233,185,73,0.32);
        }
        .bam-synth-headline {
          font-family: Georgia, "Times New Roman", serif;
          font-style: italic; font-weight: 400;
          font-size: clamp(28px, 3.6vw, 48px); line-height: 1.16;
          letter-spacing: -0.035em; color: #f4ead2; margin: 0;
          max-width: 20ch;
        }
        .bam-synth-headline em { font-style: italic; color: #e9b949;
          text-shadow: 0 0 40px rgba(233,185,73,0.4); }
        .bam-synth-body {
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(14px, 1.15vw, 17px); line-height: 1.7;
          color: rgba(244,234,210,0.58); margin: 0; max-width: 54ch;
        }
        .bam-synth-body p { margin: 0 0 0.7em; }
        .bam-synth-body p:last-child { margin-bottom: 0; }
        .bam-synth-link {
          display: inline-flex; align-items: center; gap: 9px;
          margin-top: 4px; padding: 9px 4px 11px;
          font-family: Georgia, "Times New Roman", serif; font-style: italic;
          font-size: clamp(14px, 1.1vw, 16px); letter-spacing: -0.01em;
          color: #e9b949; background: none; border: none; cursor: pointer;
          border-bottom: 1px solid rgba(233,185,73,0.3);
          transition: border-color 0.25s, color 0.25s, gap 0.25s;
        }
        .bam-synth-link:hover { color: #f3cc6d; gap: 13px;
          border-color: rgba(233,185,73,0.75); }
        .bam-synth-link .ar { font-size: 0.9em; color: rgba(233,185,73,0.7);
          transition: transform 0.25s; }
        .bam-synth-link:hover .ar { transform: translate(2px,-2px); }

        /* ─────────── FOOTER ─────────── */
        .bam-footer {
          padding: 26px clamp(20px,4vw,44px);
          border-top: 1px solid rgba(244,234,210,0.07);
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 12px;
          font-size: 11px; color: rgba(244,234,210,0.3);
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        .bam-footer-logo {
          font-family: Georgia, serif; font-style: italic;
          color: rgba(244,234,210,0.5); text-transform: none;
          letter-spacing: -0.02em; font-size: 14px;
        }
      `}</style>

      <div className="bam-grain" aria-hidden="true"></div>

      {/* ─────────── NAV ─────────── */}
      <nav className="bam-nav">
        <div className="bam-logo">buyaminute</div>
        <div className="bam-nav-links">
          <button onClick={goLogin}>Log in</button>
          <button className="bam-nav-cta" onClick={goSignup}>
            Start earning
          </button>
        </div>
      </nav>

      {/* ─────────── STAGE: TWO FORCES ─────────── */}
      <div className="bam-stage">
        {/* BUYER SIDE */}
        <section
          className="bam-side bam-side-buyer"
          onMouseEnter={() => setLean("buyer")}
          onMouseLeave={() => setLean(null)}
        >
          <div className="bam-glow-l" aria-hidden="true"></div>

          <div className="bam-rise-item bam-d1 bam-eyebrow bam-eyebrow-buyer">
            <span className="bam-dot bam-dot-buyer"></span>
            You want to reach someone
          </div>

          <h1 className="bam-rise-item bam-d2 bam-headline">
            Stop hoping for a reply or attention when you can <em>buy it.</em>
          </h1>

          <p className="bam-rise-item bam-d3 bam-pull">
            They&apos;ll answer when there&apos;s money on the line.
          </p>

          <p className="bam-rise-item bam-d4 bam-caption">
            <strong>Your crush. Your mentor.</strong> The random stranger on
            TikTok or IG.
          </p>

          <div className="bam-rise-item bam-d5 bam-stats">
            <div className="bam-stat">
              <div className="bam-stat-value">{pickup} min</div>
              <div className="bam-stat-label">Avg pickup time</div>
              <div className="bam-stat-sub">vs. 4 days on cold DM</div>
            </div>
            <div className="bam-stat">
              <div className="bam-stat-value">{accept}%</div>
              <div className="bam-stat-label">Accept rate</div>
              <div className="bam-stat-sub">paid invites sent</div>
            </div>
          </div>

          <button
            className="bam-rise-item bam-d6 bam-door bam-door-buyer"
            type="button"
            onClick={goBuyer}
          >
            <span className="bam-door-text">
              <span className="bam-door-kicker">
                See the buyer/caller experience. Send paid call offers. Sign up
                or log in.
              </span>
              <span className="bam-door-title">
                Reach People Through BuyAMinute
              </span>
            </span>
            <span className="bam-door-arrow">→</span>
          </button>
        </section>

        {/* SELLER SIDE */}
        <section
          className="bam-side bam-side-seller"
          onMouseEnter={() => setLean("seller")}
          onMouseLeave={() => setLean(null)}
        >
          <div className="bam-glow-r" aria-hidden="true"></div>

          <div className="bam-rise-item bam-d1 bam-eyebrow bam-eyebrow-seller">
            <span className="bam-dot bam-dot-seller"></span>
            Someone wants to reach you
          </div>

          <h1 className="bam-rise-item bam-d2 bam-headline">
            Get paid by fans, friends, or anyone who wants a voice or video call{" "}
            <em>with you.</em>
          </h1>

          <p className="bam-rise-item bam-d3 bam-pull">
            No ceiling. No floor. Your phone, your rules.
          </p>

          <p className="bam-rise-item bam-d4 bam-caption">
            <strong>You set the call rates.</strong> Earn by the minute.
          </p>

          <div className="bam-rise-item bam-d5 bam-stats">
            <div className="bam-stat">
              <div className="bam-stat-value">${earned}k</div>
              <div className="bam-stat-label">Earned this week</div>
              <div className="bam-stat-sub">all categories</div>
            </div>
            <div className="bam-stat">
              <div className="bam-stat-value">
                {Number(calls).toLocaleString()}
              </div>
              <div className="bam-stat-label">Calls today</div>
              <div className="bam-stat-sub">across the line</div>
            </div>
          </div>

          <button
            className="bam-rise-item bam-d6 bam-door bam-door-seller"
            type="button"
            onClick={goSeller}
          >
            <span className="bam-door-text">
              <span className="bam-door-kicker">
                Calculate your potential income. Set your rates. Start earning.
              </span>
              <span className="bam-door-title">
                Explore the Earning Side of BuyAMinute
              </span>
            </span>
            <span className="bam-door-arrow">→</span>
          </button>
        </section>

        {/* live center seam */}
        <div className="bam-seam" aria-hidden="true"></div>
        <div className="bam-seam-node" aria-hidden="true">
          ·
        </div>
      </div>

      {/* ─────────── TICKER ─────────── */}
      <div className="bam-ticker">
        <div className="bam-ticker-track">
          <span className="bam-ti">
            <span className="bam-dot bam-dot-seller"></span>{" "}
            <strong>@lila.mood</strong> picked up ·{" "}
            <span className="amt-g">+$40.00</span> in flight
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-buyer"></span> Offer sent to{" "}
            <strong>@vc_partner</strong> · <span className="amt-b">$1,500</span>{" "}
            on the line
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-seller"></span>{" "}
            <strong>@dr_park</strong> connected ·{" "}
            <span className="amt-g">+$30.00</span> /min running
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-buyer"></span>{" "}
            <strong>@maya_creator</strong> opened a fan call ·{" "}
            <span className="amt-b">$4/min</span>
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-seller"></span>{" "}
            <strong>@coach_jay</strong> rate just set ·{" "}
            <span className="amt-g">$7.50/min</span>
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-buyer"></span>{" "}
            <strong>@founder.k</strong> reached <strong>@naval</strong> ·{" "}
            <span className="amt-b">$150/min</span> · picked up
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-seller"></span>{" "}
            <strong>@marcus.re</strong> closed a 9-min consult ·{" "}
            <span className="amt-g">+$135.00</span>
          </span>

          {/* duplicate for seamless marquee */}
          <span className="bam-ti">
            <span className="bam-dot bam-dot-seller"></span>{" "}
            <strong>@lila.mood</strong> picked up ·{" "}
            <span className="amt-g">+$40.00</span> in flight
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-buyer"></span> Offer sent to{" "}
            <strong>@vc_partner</strong> · <span className="amt-b">$1,500</span>{" "}
            on the line
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-seller"></span>{" "}
            <strong>@dr_park</strong> connected ·{" "}
            <span className="amt-g">+$30.00</span> /min running
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-buyer"></span>{" "}
            <strong>@maya_creator</strong> opened a fan call ·{" "}
            <span className="amt-b">$4/min</span>
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-seller"></span>{" "}
            <strong>@coach_jay</strong> rate just set ·{" "}
            <span className="amt-g">$7.50/min</span>
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-buyer"></span>{" "}
            <strong>@founder.k</strong> reached <strong>@naval</strong> ·{" "}
            <span className="amt-b">$150/min</span> · picked up
          </span>
          <span className="bam-ti">
            <span className="bam-dot bam-dot-seller"></span>{" "}
            <strong>@marcus.re</strong> closed a 9-min consult ·{" "}
            <span className="amt-g">+$135.00</span>
          </span>
        </div>
      </div>

      {/* ─────────── SYNTHESIS ─────────── */}
      <section className={`bam-synth${synthIn ? " is-in" : ""}`} ref={synthRef}>
        <div className="bam-synth-item bam-sy1 bam-synth-eyebrow">
          The market
        </div>
        <h2 className="bam-synth-item bam-sy2 bam-synth-headline">
          BuyAMinute turns reachability <em>into a market.</em>
        </h2>
        <div className="bam-synth-item bam-sy3 bam-synth-body">
          <p>One side pays to get through. The other gets paid to answer.</p>
          <p>
            Voice and video calls become metered interactions priced by the
            minute.
          </p>
          <p>
            Create a call offer and share it anywhere — DMs, email, comment
            sections, anywhere attention exists.
          </p>
        </div>
        <button
          className="bam-synth-item bam-sy4 bam-synth-link"
          type="button"
          onClick={goMain}
        >
          See our main landing page — both sides
          <span className="ar">↗</span>
        </button>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <div className="bam-footer">
        <span className="bam-footer-logo">buyaminute</span>
        <span>Voice &amp; video · paid by the second · 2026</span>
      </div>
    </div>
  );
}

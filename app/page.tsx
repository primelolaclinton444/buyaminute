"use client";

import { Playfair_Display, Archivo } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildAuthRedirect } from "@/components/auth/AuthGuard";
import {
  BUYER,
  SELLER,
  SELLER_PULL,
  MARKET,
  BEATS,
  QUEUE_SEED,
  NAV,
  type QueueItem,
} from "@/app/landing-data";

// ─── Fonts ────────────────────────────────────────────────────────────────────
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

// ─── Narrative Beat (shared sub-component, used in both layouts) ──────────────
function NarrativeBeat({
  beat,
  accentClass,
}: {
  beat: (typeof BEATS)[number];
  accentClass: string;
}) {
  return (
    <div className={`beat${beat.active ? " active" : ""}`} data-accent={accentClass}>
      <div className="beat-index">{beat.index}</div>
      <div className="beat-content">
        <span className="beat-label">{beat.label}</span>
        {beat.text && (
          <div
            className="beat-text"
            dangerouslySetInnerHTML={{
              __html: beat.text.replace(/\bMark\b/, "<strong>Mark</strong>"),
            }}
          />
        )}
        {beat.quote && beat.index === 3 ? (
          <span className="beat-quote">
            {beat.quote}{" "}
            <em>{beat.quoteHighlight}</em> just to talk with a fan? Let me try
            this.&quot;
          </span>
        ) : beat.quote ? (
          <span className="beat-quote">{beat.quote}</span>
        ) : null}
        {beat.meta && (
          <div className="beat-meta">
            {beat.meta.map((m) => (
              <div key={m.label} className="beat-meta-item">
                <div className="beat-meta-val">{m.value}</div>
                <div className="beat-meta-lbl">{m.label}</div>
              </div>
            ))}
          </div>
        )}
        {beat.tag && <div className="beat-tag">{beat.tag}</div>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrientationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { expired } = useAuth();

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goBuyer  = () => router.push(BUYER.route);
  const goSeller = () => router.push(SELLER.route);
  const goMain   = () => router.push(MARKET.route);
  const goLogin  = () => router.push(buildAuthRedirect({ pathname, expired }));
  const goSignup = () => router.push("/signup");

  // ── Desktop: panel hover lean ───────────────────────────────────────────────
  const [hoveredPanel, setHoveredPanel] = useState<"buy" | "sell" | "market" | null>(null);

  // ── Mobile: accordion (single-open) ─────────────────────────────────────────
  const [openSection, setOpenSection] = useState<"buy" | "sell" | null>(null);
  const buyRef  = useRef<HTMLDivElement>(null);
  const sellRef = useRef<HTMLDivElement>(null);

  const toggleSection = useCallback(
    (id: "buy" | "sell") => {
      const next = openSection === id ? null : id;
      setOpenSection(next);
      if (next) {
        const ref = id === "buy" ? buyRef : sellRef;
        setTimeout(() => {
          ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    },
    [openSection]
  );

  // ── Desktop: queue terminal ──────────────────────────────────────────────────
  const [queue, setQueue] = useState<QueueItem[]>(QUEUE_SEED.slice(0, 5));

  useEffect(() => {
    const tick = () => {
      setQueue((prev) => {
        const next = [...prev];
        const r = Math.random();
        if (r < 0.4 && next.length > 1) {
          const idx = Math.floor(Math.random() * (next.length - 1)) + 1;
          const [item] = next.splice(idx, 1);
          const moved: QueueItem = { ...item, badge: "up" };
          next.splice(Math.max(0, idx - 1), 0, moved);
        } else if (r < 0.7) {
          const seed = QUEUE_SEED[Math.floor(Math.random() * QUEUE_SEED.length)];
          next.pop();
          next.push({ ...seed, badge: "new" });
        } else {
          next.shift();
          const seed = QUEUE_SEED[Math.floor(Math.random() * QUEUE_SEED.length)];
          next.push({ ...seed, badge: "new" });
        }
        return next;
      });
    };
    const id = setInterval(tick, 2200);
    return () => clearInterval(id);
  }, []);

  // ── Staggered entrance ───────────────────────────────────────────────────────
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`
        ${playfair.variable} ${archivo.variable}
        bam-root${revealed ? " is-revealed" : ""}
        ${hoveredPanel ? `lean-${hoveredPanel}` : ""}
      `}
    >
      {/* ───────────────────── INLINE STYLES ──────────────────────────────── */}
      <style>{`
        /* ── Reset & Root ─────────────────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html { scroll-behavior: smooth; }

        .bam-root {
          font-family: var(--font-archivo), 'Archivo', sans-serif;
          background: #000;
          color: #e8e4df;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          position: relative;
        }

        /* ── Keyframes ───────────────────────────────────────────────── */
        @keyframes bam-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes qpulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 5px currentColor; }
          50%       { opacity: 0.35; box-shadow: none; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bam-rise-item { opacity: 1 !important; transform: none !important; }
          .queue-dot { animation: none !important; }
        }

        /* ── Staggered reveal ────────────────────────────────────────── */
        .bam-rise-item { opacity: 0; }
        .is-revealed .bam-rise-item { animation: bam-rise 0.65s cubic-bezier(.2,.8,.2,1) forwards; }
        .is-revealed .d1 { animation-delay: 0.04s; }
        .is-revealed .d2 { animation-delay: 0.12s; }
        .is-revealed .d3 { animation-delay: 0.22s; }
        .is-revealed .d4 { animation-delay: 0.34s; }
        .is-revealed .d5 { animation-delay: 0.46s; }
        .is-revealed .d6 { animation-delay: 0.58s; }
        .is-revealed .d1b { animation-delay: 0.08s; }
        .is-revealed .d2b { animation-delay: 0.18s; }
        .is-revealed .d3b { animation-delay: 0.30s; }
        .is-revealed .d4b { animation-delay: 0.42s; }
        .is-revealed .d5b { animation-delay: 0.54s; }
        .is-revealed .d6b { animation-delay: 0.66s; }

        /* ────────────────────────────────────────────────────────────── */
        /*  SHARED NAV                                                     */
        /* ────────────────────────────────────────────────────────────── */
        .bam-nav {
          height: 48px;
          border-bottom: 1px solid #1a1a1a;
          display: grid;
          grid-template-columns: 1fr auto auto;
          padding: 0 32px;
          align-items: center;
          background: #0a0a0a;
          position: sticky;
          top: 0;
          z-index: 100;
          flex-shrink: 0;
        }
        .bam-logo {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-style: italic;
          font-size: 18px;
          color: #e8e4df;
        }
        .bam-nav-btn {
          background: none;
          border: none;
          font-family: var(--font-archivo), 'Archivo', sans-serif;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #888580;
          cursor: pointer;
          padding: 0 16px;
          font-weight: 600;
          transition: color 0.2s;
        }
        .bam-nav-btn:hover { color: #e8e4df; }
        .bam-nav-btn.primary { color: #e8e4df; }
        @media (max-width: 900px) {
          .bam-nav { padding: 0 24px; }
        }

        /* ────────────────────────────────────────────────────────────── */
        /*  DESKTOP LAYOUT  (≥ 901px)                                     */
        /* ────────────────────────────────────────────────────────────── */
        .bam-desktop {
          display: none;
        }
        @media (min-width: 901px) {
          .bam-desktop {
            display: flex;
            flex: 1;
            flex-direction: column;
          }
          .bam-mobile { display: none !important; }
        }

        /* Three-panel grid */
        .bam-panels {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          min-height: 0;
          height: calc(100dvh - 48px);
        }

        .bam-panel {
          border-right: 1px solid #1a1a1a;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #000;
          position: relative;
          transition: background 0.35s ease;
        }
        .bam-panel:last-child { border-right: none; }
        .bam-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
        }

        /* Accent tops */
        .bam-panel-buy::before    { background: #00d9ff; }
        .bam-panel-sell::before   { background: #ff1493; }
        .bam-panel-market::before { background: #8b5cf6; }

        /* Panel ambient glows */
        .bam-panel-buy {
          background:
            radial-gradient(ellipse 120% 70% at 0% 0%, rgba(0,217,255,0.35) 0%, rgba(0,100,180,0.12) 40%, #000 70%),
            radial-gradient(ellipse 80% 50% at 30% 100%, rgba(0,80,140,0.15) 0%, transparent 60%);
        }
        .bam-panel-sell {
          background:
            radial-gradient(ellipse 120% 70% at 0% 0%, rgba(255,20,147,0.35) 0%, rgba(180,0,80,0.12) 40%, #000 70%),
            radial-gradient(ellipse 80% 50% at 30% 100%, rgba(140,0,60,0.15) 0%, transparent 60%);
        }
        .bam-panel-market {
          background:
            radial-gradient(ellipse 120% 70% at 0% 0%, rgba(139,92,246,0.35) 0%, rgba(80,40,180,0.12) 40%, #000 70%),
            radial-gradient(ellipse 80% 50% at 30% 100%, rgba(60,20,140,0.15) 0%, transparent 60%);
          overflow-y: auto;
          scrollbar-width: none;
        }
        .bam-panel-market::-webkit-scrollbar { display: none; }

        /* Hover intensification */
        .bam-panel-buy:hover {
          background:
            radial-gradient(ellipse 120% 70% at 0% 0%, rgba(0,217,255,0.48) 0%, rgba(0,100,180,0.2) 40%, #000 70%),
            radial-gradient(ellipse 80% 50% at 30% 100%, rgba(0,80,140,0.22) 0%, transparent 60%);
        }
        .bam-panel-sell:hover {
          background:
            radial-gradient(ellipse 120% 70% at 0% 0%, rgba(255,20,147,0.48) 0%, rgba(180,0,80,0.2) 40%, #000 70%),
            radial-gradient(ellipse 80% 50% at 30% 100%, rgba(140,0,60,0.22) 0%, transparent 60%);
        }
        .bam-panel-market:hover {
          background:
            radial-gradient(ellipse 120% 70% at 0% 0%, rgba(139,92,246,0.48) 0%, rgba(80,40,180,0.2) 40%, #000 70%),
            radial-gradient(ellipse 80% 50% at 30% 100%, rgba(60,20,140,0.22) 0%, transparent 60%);
        }

        /* Desktop panel dimming on sibling hover */
        .lean-buy    .bam-panel-sell,
        .lean-buy    .bam-panel-market,
        .lean-sell   .bam-panel-buy,
        .lean-sell   .bam-panel-market,
        .lean-market .bam-panel-buy,
        .lean-market .bam-panel-sell {
          filter: brightness(0.55) saturate(0.6);
          transition: filter 0.4s ease, background 0.35s ease;
        }
        .lean-buy    .bam-panel-buy,
        .lean-sell   .bam-panel-sell,
        .lean-market .bam-panel-market {
          filter: brightness(1.08);
          transition: filter 0.4s ease, background 0.35s ease;
        }

        /* Desktop typography */
        .bam-eyebrow-d {
          font-size: 8px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 18px;
          font-weight: 600;
        }
        .bam-panel-buy    .bam-eyebrow-d { color: #00d9ff; }
        .bam-panel-sell   .bam-eyebrow-d { color: #ff1493; }
        .bam-panel-market .bam-eyebrow-d { color: #8b5cf6; }

        .bam-headline-d {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 34px;
          line-height: 1.1;
          color: #e8e4df;
          margin-bottom: 16px;
          font-weight: 400;
        }
        .bam-panel-buy    .bam-headline-d em { font-style: italic; color: #00d9ff; }
        .bam-panel-sell   .bam-headline-d em { font-style: italic; color: #ff1493; }
        .bam-panel-market .bam-headline-d em { font-style: italic; color: #8b5cf6; }

        .bam-body-d {
          font-size: 12px;
          line-height: 1.55;
          color: #a39990;
          margin-bottom: 16px;
          font-weight: 300;
        }
        .bam-body-d p + p { margin-top: 10px; }
        .bam-body-d strong { font-weight: 600; color: #e8e4df; }

        /* Desktop stats */
        .bam-stats-d {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
          padding: 20px 0;
          border-top: 1px solid #1a1a1a;
          border-bottom: 1px solid #1a1a1a;
          gap: 0;
        }
        .bam-stat-d { flex: 1; }
        .bam-stat-divider {
          width: 1px; height: 48px;
          flex-shrink: 0; margin: 0 24px;
        }
        .bam-panel-buy    .bam-stat-divider { background: #00d9ff; }
        .bam-panel-sell   .bam-stat-divider { background: #ff1493; }
        .bam-panel-market .bam-stat-divider { background: #8b5cf6; }

        .bam-stat-val-d {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 48px;
          margin-bottom: 6px;
          line-height: 1;
          letter-spacing: -0.03em;
        }
        .bam-panel-buy    .bam-stat-val-d { color: #00d9ff; }
        .bam-panel-sell   .bam-stat-val-d { color: #ff1493; }
        .bam-panel-market .bam-stat-val-d { color: #8b5cf6; }

        .bam-stat-lbl-d {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #888580;
          font-weight: 600;
          display: block;
        }
        .bam-stat-sub-d {
          font-size: 9px;
          color: #444;
          margin-top: 3px;
          display: block;
        }

        /* Desktop CTA zone */
        .bam-cta-zone-d { margin-top: auto; padding-top: 16px; }
        .bam-panel-market .bam-cta-zone-d { padding-top: 20px; }

        .bam-cta-link-d {
          font-family: var(--font-archivo), 'Archivo', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          transition: all 0.3s ease;
        }
        .bam-cta-link-d::after { content: '→'; font-size: 14px; transition: transform 0.3s ease; }
        .bam-cta-link-d:hover::after { transform: translateX(4px); }
        .bam-panel-buy    .bam-cta-link-d { color: #00d9ff; }
        .bam-panel-sell   .bam-cta-link-d { color: #ff1493; }
        .bam-panel-market .bam-cta-link-d { color: #8b5cf6; }
        .bam-panel-buy    .bam-cta-link-d:hover { color: #33e0ff; }
        .bam-panel-sell   .bam-cta-link-d:hover { color: #ff47a6; }
        .bam-panel-market .bam-cta-link-d:hover { color: #a078f7; }

        .bam-cta-kicker-d {
          font-size: 12px;
          color: #555;
          margin-top: 10px;
          display: block;
          letter-spacing: 0.01em;
          line-height: 1.5;
          font-weight: 300;
        }

        /* ── Queue Terminal ───────────────────────────────────────────── */
        .bam-queue {
          background: rgba(139,92,246,0.04);
          border: 1px solid #1a1a1a;
          margin-bottom: 20px;
          overflow: hidden;
        }
        .bam-queue-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid #1a1a1a;
        }
        .bam-queue-title {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #8b5cf6;
        }
        .bam-queue-live {
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #666;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .queue-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #8b5cf6;
          animation: qpulse 1.5s ease-in-out infinite;
        }
        .bam-queue-list { padding: 6px 0; min-height: 150px; }
        .bam-queue-row {
          display: grid;
          grid-template-columns: 28px 1fr auto auto;
          align-items: center;
          padding: 7px 14px;
          gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          animation: slideIn 0.4s ease-out;
        }
        .bam-queue-row:last-child { border-bottom: none; }
        .bam-queue-pos {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 13px;
          color: #333;
          font-style: italic;
        }
        .bam-queue-row:first-child .bam-queue-pos { color: #8b5cf6; }
        .bam-queue-names { display: flex; flex-direction: column; gap: 1px; }
        .bam-queue-caller {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-style: italic;
          font-size: 11px;
          color: #e8e4df;
        }
        .bam-queue-target { font-size: 9px; color: #555; letter-spacing: 0.02em; }
        .bam-queue-amount {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 13px;
          color: #8b5cf6;
          text-align: right;
        }
        .bam-queue-row:first-child .bam-queue-amount { color: #a78bfa; }
        .bam-queue-badge {
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 2px 5px;
          border-radius: 2px;
          min-width: 28px;
          text-align: center;
        }
        .bam-queue-badge.hot { background: rgba(139,92,246,0.35); color: #c4b5fd; }
        .bam-queue-badge.up  { background: rgba(139,92,246,0.2);  color: #8b5cf6; }
        .bam-queue-badge.new { background: rgba(255,255,255,0.05); color: #555; }

        /* ────────────────────────────────────────────────────────────── */
        /*  NARRATIVE BEATS  (shared, used in both layouts)               */
        /* ────────────────────────────────────────────────────────────── */
        .bam-narrative {
          display: flex;
          flex-direction: column;
          border: 1px solid #1a1a1a;
          margin-bottom: 20px;
        }
        .beat {
          padding: 10px 14px;
          border-bottom: 1px solid #111;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .beat:last-child { border-bottom: none; }
        .beat-index {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-style: italic;
          font-size: 18px;
          color: #222;
          line-height: 1;
          flex-shrink: 0;
          width: 18px;
          text-align: right;
          margin-top: 1px;
        }
        .beat.active .beat-index { color: #8b5cf6; }
        .beat-content { flex: 1; }
        .beat-label {
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #444;
          margin-bottom: 5px;
          display: block;
        }
        .beat.active .beat-label { color: #8b5cf6; }
        .beat-text {
          font-size: 11px;
          color: #a39990;
          line-height: 1.55;
          font-weight: 300;
        }
        .beat-text strong { color: #e8e4df; font-weight: 600; }
        .beat-quote {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-style: italic;
          font-size: 12px;
          color: #c8c0bb;
          line-height: 1.55;
          margin-top: 6px;
          display: block;
        }
        .beat-quote em { color: #8b5cf6; font-style: normal; font-weight: 600; }
        .beat-meta {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .beat-meta-item { display: flex; flex-direction: column; gap: 2px; }
        .beat-meta-val {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 15px;
          color: #8b5cf6;
        }
        .beat-meta-lbl {
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #555;
          font-weight: 600;
        }
        .beat-tag {
          display: inline-block;
          background: rgba(139,92,246,0.1);
          border: 1px solid rgba(139,92,246,0.2);
          padding: 3px 8px;
          font-size: 7px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #8b5cf6;
          margin-top: 7px;
        }

        /* ────────────────────────────────────────────────────────────── */
        /*  MOBILE LAYOUT  (≤ 900px)                                      */
        /* ────────────────────────────────────────────────────────────── */
        .bam-mobile {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        @media (min-width: 901px) {
          .bam-mobile { display: none !important; }
        }

        /* Mobile Hero */
        .bam-hero-m {
          padding: 48px 24px 56px;
          background: #000;
          border-bottom: 1px solid #1a1a1a;
          text-align: center;
        }
        .bam-hero-eyebrow-m {
          font-size: 9px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #555;
          font-weight: 600;
          margin-bottom: 22px;
        }
        .bam-hero-headline-m {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: clamp(36px, 11vw, 52px);
          line-height: 1.08;
          color: #e8e4df;
          margin-bottom: 18px;
          font-weight: 400;
          letter-spacing: -0.025em;
        }
        .bam-hero-headline-m em {
          font-style: italic;
          color: #888580;
          display: block;
        }
        .bam-hero-body-m {
          font-size: 15px;
          line-height: 1.7;
          color: #666;
          margin-bottom: 40px;
          font-weight: 300;
        }
        .bam-hero-divider-m {
          font-size: 9px;
          letter-spacing: 0.1em;
          color: #444;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 22px;
        }

        /* Mobile accordion choices */
        .bam-choices-m { display: flex; flex-direction: column; gap: 10px; }

        .bam-choice-btn-m {
          background: #000;
          border: 1px solid #1a1a1a;
          padding: 20px 24px;
          font-family: var(--font-archivo), 'Archivo', sans-serif;
          cursor: pointer;
          text-align: left;
          position: relative;
          width: 100%;
          transition: border-color 0.25s;
        }
        .bam-choice-btn-m::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
        }
        .bam-choice-btn-m.buy::before  { background: #00d9ff; }
        .bam-choice-btn-m.sell::before { background: #ff1493; }
        .bam-choice-btn-m.buy.open   { border-color: rgba(0,217,255,0.4); }
        .bam-choice-btn-m.sell.open  { border-color: rgba(255,20,147,0.4); }
        .bam-choice-btn-m:active { transform: scale(0.99); }

        .bam-choice-label-m {
          font-size: 8px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 7px;
          display: block;
        }
        .bam-choice-btn-m.buy  .bam-choice-label-m { color: #00d9ff; }
        .bam-choice-btn-m.sell .bam-choice-label-m { color: #ff1493; }

        .bam-choice-title-m {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 22px;
          color: #e8e4df;
          font-weight: 400;
          line-height: 1.2;
        }
        .bam-choice-arrow-m {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          color: #444;
          transition: transform 0.3s, color 0.25s;
        }
        .bam-choice-btn-m.open .bam-choice-arrow-m {
          transform: translateY(-50%) rotate(90deg);
        }
        .bam-choice-btn-m.buy.open  .bam-choice-arrow-m { color: #00d9ff; }
        .bam-choice-btn-m.sell.open .bam-choice-arrow-m { color: #ff1493; }

        /* Expandable content */
        .bam-expandable-m {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .bam-expandable-m.open { max-height: 1200px; }

        .bam-exp-content-m {
          padding: 36px 24px 44px;
          background: #050505;
          border-bottom: 1px solid #1a1a1a;
        }

        .bam-exp-eyebrow-m {
          font-size: 8px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 14px;
        }
        .bam-exp-eyebrow-m.buy  { color: #00d9ff; }
        .bam-exp-eyebrow-m.sell { color: #ff1493; }

        .bam-exp-headline-m {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 30px;
          line-height: 1.15;
          color: #e8e4df;
          margin-bottom: 16px;
          font-weight: 400;
          letter-spacing: -0.015em;
        }
        .bam-exp-headline-m.buy  em { font-style: italic; color: #00d9ff; }
        .bam-exp-headline-m.sell em { font-style: italic; color: #ff1493; }

        .bam-exp-body-m {
          font-size: 14px;
          line-height: 1.7;
          color: #666;
          margin-bottom: 22px;
          font-weight: 300;
        }
        .bam-exp-body-m p + p { margin-top: 10px; }
        .bam-exp-body-m strong { color: #e8e4df; font-weight: 600; }

        /* Mobile stats */
        .bam-stats-m {
          display: flex;
          align-items: center;
          padding: 18px 0;
          border-top: 1px solid #1a1a1a;
          border-bottom: 1px solid #1a1a1a;
          margin-bottom: 26px;
        }
        .bam-stat-m { flex: 1; }
        .bam-stat-divider-m {
          width: 1px; height: 44px;
          flex-shrink: 0; margin: 0 20px;
        }
        .buy  .bam-stat-divider-m { background: #00d9ff; }
        .sell .bam-stat-divider-m { background: #ff1493; }

        .bam-stat-val-m {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: 38px;
          line-height: 1;
          letter-spacing: -0.03em;
          margin-bottom: 4px;
        }
        .buy  .bam-stat-val-m { color: #00d9ff; }
        .sell .bam-stat-val-m { color: #ff1493; }

        .bam-stat-lbl-m {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #555;
          font-weight: 600;
          display: block;
        }
        .bam-stat-sub-m {
          font-size: 9px;
          color: #333;
          margin-top: 2px;
          display: block;
        }

        /* Mobile CTA */
        .bam-exp-cta-m {
          font-family: var(--font-archivo), 'Archivo', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
        }
        .bam-exp-cta-m::after { content: '→'; font-size: 14px; }
        .bam-exp-cta-m.buy  { color: #00d9ff; }
        .bam-exp-cta-m.sell { color: #ff1493; }

        .bam-exp-cta-kicker-m {
          font-size: 12px;
          color: #555;
          font-weight: 300;
          line-height: 1.55;
          display: block;
        }

        /* Mobile Market section */
        .bam-mkt-m {
          padding: 52px 24px 72px;
          background: #000;
          border-top: 1px solid #333;
        }
        .bam-mkt-eyebrow-m {
          font-size: 8px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #8b5cf6;
          font-weight: 600;
          margin-bottom: 14px;
        }
        .bam-mkt-headline-m {
          font-family: var(--font-playfair), 'Playfair Display', serif;
          font-size: clamp(28px, 8vw, 36px);
          line-height: 1.15;
          color: #e8e4df;
          margin-bottom: 26px;
          font-weight: 400;
          letter-spacing: -0.015em;
        }
        .bam-mkt-headline-m em { font-style: italic; color: #8b5cf6; }

        /* Mobile narrative beats - overrides shared .bam-narrative styles */
        .bam-mkt-m .bam-narrative {
          margin-bottom: 26px;
        }
        .bam-mkt-m .beat-text {
          font-size: 13px;
          line-height: 1.6;
        }
        .bam-mkt-m .beat-quote {
          font-size: 13px;
        }
        .bam-mkt-m .beat-meta-val {
          font-size: 16px;
        }

        .bam-mkt-body-m {
          font-size: 14px;
          line-height: 1.7;
          color: #666;
          margin-bottom: 26px;
          font-weight: 300;
        }
        .bam-mkt-body-m p + p { margin-top: 12px; }

        .bam-mkt-cta-m {
          font-family: var(--font-archivo), 'Archivo', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #8b5cf6;
          margin-bottom: 8px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
        }
        .bam-mkt-cta-m::after { content: '→'; font-size: 14px; }
        .bam-mkt-cta-m:hover { color: #a078f7; }

        .bam-mkt-kicker-m {
          font-size: 12px;
          color: #555;
          font-weight: 300;
          line-height: 1.55;
          display: block;
        }
      `}</style>

      {/* ─── NAV (shared) ───────────────────────────────────────────────────── */}
      <nav className="bam-nav">
        <div className="bam-logo">{NAV.logo}</div>
        <button className="bam-nav-btn" onClick={goLogin}>{NAV.loginLabel}</button>
        <button className="bam-nav-btn primary" onClick={goSignup}>{NAV.signupLabel}</button>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
          Three fixed-height panels, market independently scrollable,
          live queue terminal, hover dimming via .lean-* class on root.
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="bam-desktop">
        <div className="bam-panels">

          {/* ── BUY PANEL ─────────────────────────────────────────────────── */}
          <div
            className="bam-panel bam-panel-buy"
            onMouseEnter={() => setHoveredPanel("buy")}
            onMouseLeave={() => setHoveredPanel(null)}
          >
            <div className="bam-rise-item d1 bam-eyebrow-d">{BUYER.eyebrow}</div>
            <h1 className="bam-rise-item d2 bam-headline-d">
              {BUYER.headlinePrefix} <em>{BUYER.headlineEm}</em>
            </h1>
            <div className="bam-rise-item d3 bam-body-d">
              <p>
                <strong>{BUYER.bodyStrong}</strong> The random stranger on TikTok or IG.
              </p>
              <p>{BUYER.bodyMechanic}</p>
            </div>
            <div className="bam-rise-item d4 bam-stats-d">
              <div className="bam-stat-d">
                <div className="bam-stat-val-d">{BUYER.stats[0].value}</div>
                <span className="bam-stat-lbl-d">{BUYER.stats[0].label}</span>
                <span className="bam-stat-sub-d">{BUYER.stats[0].sub}</span>
              </div>
              <div className="bam-stat-divider" />
              <div className="bam-stat-d">
                <div className="bam-stat-val-d">{BUYER.stats[1].value}</div>
                <span className="bam-stat-lbl-d">{BUYER.stats[1].label}</span>
                <span className="bam-stat-sub-d">{BUYER.stats[1].sub}</span>
              </div>
            </div>
            <div className="bam-rise-item d5 bam-cta-zone-d">
              <button className="bam-cta-link-d" onClick={goBuyer} type="button">
                {BUYER.ctaText}
              </button>
              <span className="bam-cta-kicker-d">{BUYER.ctaKicker}</span>
            </div>
          </div>

          {/* ── SELL PANEL ─────────────────────────────────────────────────── */}
          <div
            className="bam-panel bam-panel-sell"
            onMouseEnter={() => setHoveredPanel("sell")}
            onMouseLeave={() => setHoveredPanel(null)}
          >
            <div className="bam-rise-item d1b bam-eyebrow-d">{SELLER.eyebrow}</div>
            <h1 className="bam-rise-item d2b bam-headline-d">
              {SELLER.headlinePrefix} <em>{SELLER.headlineEm}</em>
            </h1>
            <div className="bam-rise-item d3b bam-body-d">
              <p>
                <strong>{SELLER.bodyStrong}</strong> {SELLER.bodyMechanic}
              </p>
              <p>{SELLER_PULL}</p>
            </div>
            <div className="bam-rise-item d4b bam-stats-d">
              <div className="bam-stat-d">
                <div className="bam-stat-val-d">{SELLER.stats[0].value}</div>
                <span className="bam-stat-lbl-d">{SELLER.stats[0].label}</span>
                <span className="bam-stat-sub-d">{SELLER.stats[0].sub}</span>
              </div>
              <div className="bam-stat-divider" />
              <div className="bam-stat-d">
                <div className="bam-stat-val-d">{SELLER.stats[1].value}</div>
                <span className="bam-stat-lbl-d">{SELLER.stats[1].label}</span>
                <span className="bam-stat-sub-d">{SELLER.stats[1].sub}</span>
              </div>
            </div>
            <div className="bam-rise-item d5b bam-cta-zone-d">
              <button className="bam-cta-link-d" onClick={goSeller} type="button">
                {SELLER.ctaText}
              </button>
              <span className="bam-cta-kicker-d">{SELLER.ctaKicker}</span>
            </div>
          </div>

          {/* ── MARKET PANEL (independently scrollable) ────────────────────── */}
          <div
            className="bam-panel bam-panel-market"
            onMouseEnter={() => setHoveredPanel("market")}
            onMouseLeave={() => setHoveredPanel(null)}
          >
            <div className="bam-rise-item d1 bam-eyebrow-d">{MARKET.eyebrow}</div>
            <h1 className="bam-rise-item d2 bam-headline-d">
              {MARKET.headlinePrefix} <em>{MARKET.headlineEm}</em>
            </h1>

            {/* Live queue terminal */}
            <div className="bam-rise-item d3 bam-queue">
              <div className="bam-queue-header">
                <span className="bam-queue-title">Live offer queue</span>
                <span className="bam-queue-live">
                  <span className="queue-dot" />
                  Active
                </span>
              </div>
              <div className="bam-queue-list">
                {queue.map((item, i) => (
                  <div key={`${item.caller}-${i}`} className="bam-queue-row">
                    <div className="bam-queue-pos">{i + 1}</div>
                    <div className="bam-queue-names">
                      <div className="bam-queue-caller">{item.caller}</div>
                      <div className="bam-queue-target">{item.target}</div>
                    </div>
                    <div className="bam-queue-amount">{item.amount}</div>
                    <div className={`bam-queue-badge ${item.badge}`}>{item.badge}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Narrative */}
            <div className="bam-rise-item d4 bam-narrative">
              {BEATS.map((beat) => (
                <NarrativeBeat key={beat.index} beat={beat} accentClass="market" />
              ))}
            </div>

            <div className="bam-rise-item d5 bam-body-d">
              {MARKET.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="bam-rise-item d6 bam-cta-zone-d">
              <button className="bam-cta-link-d" onClick={goMain} type="button">
                {MARKET.ctaText}
              </button>
              <span className="bam-cta-kicker-d">{MARKET.ctaKicker}</span>
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
          Sticky header → hero → accordion (buy/sell, single-open)
          → market section (separate scrollable zone)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="bam-mobile">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="bam-hero-m">
          <div className="bam-rise-item d1 bam-hero-eyebrow-m">
            The Marketplace for Human Connection
          </div>
          <h1 className="bam-rise-item d2 bam-hero-headline-m">
            We didn&apos;t invent attention.
            <em>We gave it a price.</em>
          </h1>
          <p className="bam-rise-item d3 bam-hero-body-m">
            Pay to reach anyone. Get paid to be reachable. Voice and video calls priced by the minute.
          </p>
          <div className="bam-rise-item d4 bam-hero-divider-m">Choose your path</div>

          {/* ── Accordion choices ─────────────────────────────────────────── */}
          <div className="bam-choices-m">

            {/* BUY */}
            <div ref={buyRef}>
              <button
                className={`bam-choice-btn-m buy${openSection === "buy" ? " open" : ""}`}
                onClick={() => toggleSection("buy")}
                type="button"
                aria-expanded={openSection === "buy"}
              >
                <span className="bam-choice-label-m">I want to reach someone</span>
                <span className="bam-choice-title-m">Buy their attention</span>
                <span className="bam-choice-arrow-m">→</span>
              </button>
              <div className={`bam-expandable-m${openSection === "buy" ? " open" : ""}`}>
                <div className="bam-exp-content-m buy">
                  <div className="bam-exp-eyebrow-m buy">{BUYER.eyebrow}</div>
                  <h2 className="bam-exp-headline-m buy">
                    Stop hoping for a reply or attention when you can <em>{BUYER.headlineEm}</em>
                  </h2>
                  <div className="bam-exp-body-m">
                    <p><strong>{BUYER.bodyStrong}</strong> The random stranger on TikTok or IG.</p>
                    <p>{BUYER.bodyMechanic}</p>
                  </div>
                  <div className="bam-stats-m buy">
                    <div className="bam-stat-m">
                      <div className="bam-stat-val-m">{BUYER.stats[0].value}</div>
                      <span className="bam-stat-lbl-m">{BUYER.stats[0].label}</span>
                      <span className="bam-stat-sub-m">{BUYER.stats[0].sub}</span>
                    </div>
                    <div className="bam-stat-divider-m" />
                    <div className="bam-stat-m">
                      <div className="bam-stat-val-m">{BUYER.stats[1].value}</div>
                      <span className="bam-stat-lbl-m">{BUYER.stats[1].label}</span>
                      <span className="bam-stat-sub-m">{BUYER.stats[1].sub}</span>
                    </div>
                  </div>
                  <button className="bam-exp-cta-m buy" onClick={goBuyer} type="button">
                    {BUYER.ctaText}
                  </button>
                  <span className="bam-exp-cta-kicker-m">{BUYER.ctaKicker}</span>
                </div>
              </div>
            </div>

            {/* SELL */}
            <div ref={sellRef}>
              <button
                className={`bam-choice-btn-m sell${openSection === "sell" ? " open" : ""}`}
                onClick={() => toggleSection("sell")}
                type="button"
                aria-expanded={openSection === "sell"}
              >
                <span className="bam-choice-label-m">I want to earn money</span>
                <span className="bam-choice-title-m">Get paid for your time</span>
                <span className="bam-choice-arrow-m">→</span>
              </button>
              <div className={`bam-expandable-m${openSection === "sell" ? " open" : ""}`}>
                <div className="bam-exp-content-m sell">
                  <div className="bam-exp-eyebrow-m sell">{SELLER.eyebrow}</div>
                  <h2 className="bam-exp-headline-m sell">
                    {SELLER.headlinePrefix} <em>{SELLER.headlineEm}</em>
                  </h2>
                  <div className="bam-exp-body-m">
                    <p><strong>{SELLER.bodyStrong}</strong> {SELLER.bodyMechanic}</p>
                    <p>{SELLER_PULL}</p>
                  </div>
                  <div className="bam-stats-m sell">
                    <div className="bam-stat-m">
                      <div className="bam-stat-val-m">{SELLER.stats[0].value}</div>
                      <span className="bam-stat-lbl-m">{SELLER.stats[0].label}</span>
                      <span className="bam-stat-sub-m">{SELLER.stats[0].sub}</span>
                    </div>
                    <div className="bam-stat-divider-m" />
                    <div className="bam-stat-m">
                      <div className="bam-stat-val-m">{SELLER.stats[1].value}</div>
                      <span className="bam-stat-lbl-m">{SELLER.stats[1].label}</span>
                      <span className="bam-stat-sub-m">{SELLER.stats[1].sub}</span>
                    </div>
                  </div>
                  <button className="bam-exp-cta-m sell" onClick={goSeller} type="button">
                    {SELLER.ctaText}
                  </button>
                  <span className="bam-exp-cta-kicker-m">{SELLER.ctaKicker}</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Market Section (mobile) ───────────────────────────────────────── */}
        <section className="bam-mkt-m">
          <div className="bam-mkt-eyebrow-m">{MARKET.eyebrow}</div>
          <h2 className="bam-mkt-headline-m">
            {MARKET.headlinePrefix} <em>{MARKET.headlineEm}</em>
          </h2>
          <div className="bam-narrative">
            {BEATS.map((beat) => (
              <NarrativeBeat key={beat.index} beat={beat} accentClass="market" />
            ))}
          </div>
          <div className="bam-mkt-body-m">
            {MARKET.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <button className="bam-mkt-cta-m" onClick={goMain} type="button">
            {MARKET.ctaText}
          </button>
          <span className="bam-mkt-kicker-m">{MARKET.ctaKicker}</span>
        </section>

      </div>
    </div>
  );
}

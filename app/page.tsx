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
  NAV,
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

// ─── Narrative Beat (renders in both layouts; dark vs light via CSS scope) ────
function NarrativeBeat({ beat, mobile = false }: { beat: (typeof BEATS)[number]; mobile?: boolean }) {
  return (
    <div className={`beat${beat.active ? " active" : ""}`}>
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
            <em>{beat.quoteHighlight}</em> just to talk with a fan? Let me try this.&quot;
          </span>
        ) : beat.quote ? (
          <span className="beat-quote">{beat.quote}</span>
        ) : null}
        {beat.meta && (
          <div className="beat-meta">
            {beat.meta.map((m) => (
              <div key={m.label} className="beat-meta-item">
                <div className="beat-meta-val">{m.value}</div>
                <div className="beat-meta-lbl">{mobile && m.mobileLabel ? m.mobileLabel : m.label}</div>
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
  const router   = useRouter();
  const pathname = usePathname();
  const { expired } = useAuth();

  const goBuyer  = () => router.push(BUYER.route);
  const goSeller = () => router.push(SELLER.route);
  const goMain   = () => router.push(MARKET.route);
  const goLogin  = () => router.push(buildAuthRedirect({ pathname, expired }));
  const goSignup = () => router.push("/signup");

  // ── Mobile: single-open accordion ───────────────────────────────────────────
  const [openSection, setOpenSection] = useState<"buy" | "sell" | null>(null);
  const buyRef  = useRef<HTMLButtonElement>(null);
  const sellRef = useRef<HTMLButtonElement>(null);

  const toggleSection = useCallback(
    (id: "buy" | "sell") => {
      const next = openSection === id ? null : id;
      setOpenSection(next);
      if (next) {
        const ref = id === "buy" ? buyRef : sellRef;
        setTimeout(() => {
          ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    },
    [openSection]
  );

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
      `}
    >
      <style>{`
        /* ── Reset ───────────────────────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html { scroll-behavior: smooth; }

        /* ── Root ────────────────────────────────────────────────────── */
        .bam-root {
          font-family: var(--font-archivo), 'Archivo', sans-serif;
          background: #000;
          color: #e8e4df;
          height: 100dvh;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        /* ── Keyframes ───────────────────────────────────────────────── */
        @keyframes bam-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bam-rise-item { opacity: 1 !important; transform: none !important; }
        }

        /* ── Staggered reveal ────────────────────────────────────────── */
        .bam-rise-item { opacity: 0; }
        .is-revealed .bam-rise-item { animation: bam-rise 0.65s cubic-bezier(.2,.8,.2,1) forwards; }
        .is-revealed .d1  { animation-delay: 0.04s; }
        .is-revealed .d2  { animation-delay: 0.12s; }
        .is-revealed .d3  { animation-delay: 0.22s; }
        .is-revealed .d4  { animation-delay: 0.34s; }
        .is-revealed .d5  { animation-delay: 0.46s; }
        .is-revealed .d6  { animation-delay: 0.58s; }
        .is-revealed .d1b { animation-delay: 0.08s; }
        .is-revealed .d2b { animation-delay: 0.18s; }
        .is-revealed .d3b { animation-delay: 0.30s; }
        .is-revealed .d4b { animation-delay: 0.42s; }
        .is-revealed .d5b { animation-delay: 0.54s; }
        .is-revealed .d6b { animation-delay: 0.66s; }

        /* ══════════════════════════════════════════════════════════════ */
        /*  NAV — desktop dark base, mobile light override               */
        /* ══════════════════════════════════════════════════════════════ */
        .bam-nav {
          height: 48px;
          border-bottom: 1px solid #1a1a1a;
          display: grid;
          grid-template-columns: 1fr auto auto;
          padding: 0 32px;
          align-items: center;
          background: #0a0a0a;
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
          .bam-root { height: auto; min-height: 100dvh; overflow: visible; overflow-x: hidden; background: #fdfcfa; color: #1a1816; }
          .bam-nav {
            position: sticky;
            top: 0;
            height: 52px;
            background: #f9f7f4;
            border-bottom: 1px solid #e8e4df;
            display: flex;
            justify-content: space-between;
            padding: 0 24px;
          }
          .bam-logo { color: #1a1816; }
          .bam-nav-btn { color: #1a1816; padding: 0; }
          .bam-nav-btn:hover { color: #1a1816; }
          .bam-nav-btn.primary { display: none; }
        }

        /* ══════════════════════════════════════════════════════════════ */
        /*  DESKTOP LAYOUT  (≥ 901px)                                    */
        /* ══════════════════════════════════════════════════════════════ */
        .bam-desktop { display: none; }
        @media (min-width: 901px) {
          .bam-desktop { display: flex; flex: 1; flex-direction: column; min-height: 0; overflow: hidden; }
          .bam-mobile  { display: none !important; }
        }

        .bam-panels {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          min-height: 0;
          overflow: hidden;
        }

        .bam-panel {
          border-right: 1px solid #1a1a1a;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #000;
          position: relative;
          transition: background 0.3s ease;
        }
        .bam-panel:last-child { border-right: none; }
        .bam-panel::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 3px;
        }
        .bam-panel-buy::before    { background: #00d9ff; }
        .bam-panel-sell::before   { background: #ff1493; }
        .bam-panel-market::before { background: #8b5cf6; }

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
        .bam-panel-buy:hover {
          background:
            radial-gradient(ellipse 120% 70% at 0% 0%, rgba(0,217,255,0.45) 0%, rgba(0,100,180,0.18) 40%, #000 70%),
            radial-gradient(ellipse 80% 50% at 30% 100%, rgba(0,80,140,0.2) 0%, transparent 60%);
        }
        .bam-panel-sell:hover {
          background:
            radial-gradient(ellipse 120% 70% at 0% 0%, rgba(255,20,147,0.45) 0%, rgba(180,0,80,0.18) 40%, #000 70%),
            radial-gradient(ellipse 80% 50% at 30% 100%, rgba(140,0,60,0.2) 0%, transparent 60%);
        }
        .bam-panel-market:hover {
          background:
            radial-gradient(ellipse 120% 70% at 0% 0%, rgba(139,92,246,0.45) 0%, rgba(80,40,180,0.18) 40%, #000 70%),
            radial-gradient(ellipse 80% 50% at 30% 100%, rgba(60,20,140,0.2) 0%, transparent 60%);
        }

        /* Desktop typography */
        .bam-eyebrow-d { font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 18px; font-weight: 600; }
        .bam-panel-buy    .bam-eyebrow-d { color: #00d9ff; }
        .bam-panel-sell   .bam-eyebrow-d { color: #ff1493; }
        .bam-panel-market .bam-eyebrow-d { color: #8b5cf6; }

        .bam-headline-d { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 34px; line-height: 1.1; color: #e8e4df; margin-bottom: 16px; font-weight: 400; }
        .bam-panel-buy    .bam-headline-d em { font-style: italic; color: #00d9ff; }
        .bam-panel-sell   .bam-headline-d em { font-style: italic; color: #ff1493; }
        .bam-panel-market .bam-headline-d em { font-style: italic; color: #8b5cf6; }

        .bam-body-d { font-size: 12px; line-height: 1.5; color: #a39990; margin-bottom: 16px; font-weight: 300; }
        .bam-body-d p + p { margin-top: 10px; }
        .bam-body-d strong { font-weight: 600; color: #e8e4df; }

        .bam-stats-d { display: flex; align-items: center; margin-bottom: 16px; padding: 20px 0; border-top: 1px solid #1a1a1a; border-bottom: 1px solid #1a1a1a; gap: 0; }
        .bam-stat-d { flex: 1; padding: 0 24px 0 0; }
        .bam-stat-divider { width: 1px; height: 48px; flex-shrink: 0; margin: 0 24px; }
        .bam-panel-buy    .bam-stat-divider { background: #00d9ff; }
        .bam-panel-sell   .bam-stat-divider { background: #ff1493; }
        .bam-panel-market .bam-stat-divider { background: #8b5cf6; }

        .bam-stat-val-d { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 48px; margin-bottom: 6px; line-height: 1; letter-spacing: -0.03em; }
        .bam-panel-buy    .bam-stat-val-d { color: #00d9ff; }
        .bam-panel-sell   .bam-stat-val-d { color: #ff1493; }
        .bam-panel-market .bam-stat-val-d { color: #8b5cf6; }

        .bam-stat-lbl-d { font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #888580; font-weight: 600; display: block; }
        .bam-stat-sub-d { font-size: 9px; color: #666; margin-top: 2px; display: block; }

        .bam-cta-zone-d { margin-top: auto; padding-top: 16px; }
        .bam-panel-market .bam-cta-zone-d { margin-top: 0; padding-top: 20px; }

        .bam-cta-link-d { font-family: var(--font-archivo), 'Archivo', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; display: flex; align-items: center; gap: 10px; cursor: pointer; background: none; border: none; padding: 0; transition: all 0.3s ease; }
        .bam-cta-link-d::after { content: '→'; font-size: 14px; transition: transform 0.3s ease; }
        .bam-cta-link-d:hover::after { transform: translateX(4px); }
        .bam-panel-buy    .bam-cta-link-d { color: #00d9ff; }
        .bam-panel-sell   .bam-cta-link-d { color: #ff1493; }
        .bam-panel-market .bam-cta-link-d { color: #8b5cf6; }
        .bam-panel-buy    .bam-cta-link-d:hover { color: #33e0ff; }
        .bam-panel-sell   .bam-cta-link-d:hover { color: #ff47a6; }
        .bam-panel-market .bam-cta-link-d:hover { color: #a078f7; }

        .bam-cta-kicker-d { font-size: 12px; color: #555; margin-top: 10px; display: block; letter-spacing: 0.01em; line-height: 1.5; font-weight: 300; }

        /* ══════════════════════════════════════════════════════════════ */
        /*  NARRATIVE BEATS — dark base (desktop)                        */
        /* ══════════════════════════════════════════════════════════════ */
        .bam-narrative { display: flex; flex-direction: column; border: 1px solid #2a2a2a; margin-bottom: 20px; }
        .beat { padding: 10px 14px; border-bottom: 1px solid #1e1e1e; display: flex; gap: 12px; align-items: flex-start; }
        .beat:last-child { border-bottom: none; }
        .beat-index { font-family: var(--font-playfair), 'Playfair Display', serif; font-style: italic; font-size: 18px; color: #555; line-height: 1; flex-shrink: 0; width: 18px; text-align: right; margin-top: 1px; }
        .beat.active .beat-index { color: #8b5cf6; }
        .beat-content { flex: 1; }
        .beat-label { font-size: 7px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #555; margin-bottom: 5px; display: block; }
        .beat.active .beat-label { color: #8b5cf6; }
        .beat-text { font-size: 11px; color: #b8b0a8; line-height: 1.5; font-weight: 300; }
        .beat.active .beat-text { color: #c8c0bb; }
        .beat-text strong { color: #e8e4df; font-weight: 600; }
        .beat-quote { font-family: var(--font-playfair), 'Playfair Display', serif; font-style: italic; font-size: 12px; color: #c8c0bb; line-height: 1.5; margin-top: 6px; display: block; }
        .beat-quote em { color: #8b5cf6; font-style: normal; font-weight: 600; }
        .beat-meta { display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap; }
        .beat-meta-item { display: flex; flex-direction: column; gap: 2px; }
        .beat-meta-val { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 15px; color: #8b5cf6; }
        .beat-meta-lbl { font-size: 7px; text-transform: uppercase; letter-spacing: 0.08em; color: #555; font-weight: 600; }
        .beat-tag { display: inline-block; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); padding: 3px 8px; font-size: 7px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #8b5cf6; margin-top: 7px; }

        /* ══════════════════════════════════════════════════════════════ */
        /*  MOBILE LAYOUT  (≤ 900px) — LIGHT WARM THEME                  */
        /* ══════════════════════════════════════════════════════════════ */
        .bam-mobile { display: flex; flex-direction: column; flex: 1; }
        @media (min-width: 901px) { .bam-mobile { display: none !important; } }

        /* Hero */
        .bam-hero-m { padding: 52px 24px 60px; background: #fdfcfa; border-bottom: 1px solid #e8e4df; }
        .bam-hero-eyebrow-m { font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #8a8580; font-weight: 600; margin-bottom: 24px; text-align: center; }
        .bam-hero-headline-m { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 44px; line-height: 1.1; color: #1a1816; margin-bottom: 20px; font-weight: 400; text-align: center; letter-spacing: -0.02em; }
        .bam-hero-headline-m em { font-style: italic; color: #6b645d; display: block; }
        .bam-hero-body-m { font-size: 15px; line-height: 1.7; color: #5a544f; margin-bottom: 44px; font-weight: 300; text-align: center; }
        .bam-hero-divider-m { font-size: 10px; letter-spacing: 0.08em; color: #8a8580; text-align: center; margin-bottom: 24px; }

        /* Choices */
        .bam-choices-m { display: flex; flex-direction: column; gap: 12px; }
        .bam-choice-btn-m { background: #fff; border: 1px solid #1a1816; padding: 22px 24px; font-family: var(--font-archivo), 'Archivo', sans-serif; cursor: pointer; text-align: left; position: relative; transition: all 0.3s; width: 100%; }
        .bam-choice-btn-m::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: #1a1816; }
        .bam-choice-btn-m:active { transform: scale(0.98); }
        .bam-choice-label-m { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #8a8580; font-weight: 600; margin-bottom: 8px; display: block; }
        .bam-choice-title-m { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 22px; color: #1a1816; font-weight: 400; line-height: 1.2; }
        .bam-choice-arrow-m { position: absolute; right: 24px; top: 50%; transform: translateY(-50%); font-size: 20px; color: #1a1816; transition: transform 0.3s; }
        .bam-choice-btn-m.open .bam-choice-arrow-m { transform: translateY(-50%) rotate(90deg); }

        /* Expandable — breaks out of hero side padding to sit edge-to-edge */
        .bam-expandable-m { max-height: 0; overflow: hidden; transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1); margin: 0 -24px; }
        .bam-expandable-m.open { max-height: 2000px; }

        .bam-exp-content-m { padding: 40px 24px; background: #f9f7f4; border-bottom: 1px solid #e8e4df; }
        .bam-exp-eyebrow-m { font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 600; margin-bottom: 16px; color: #1a1816; }
        .bam-exp-headline-m { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 32px; line-height: 1.15; color: #1a1816; margin-bottom: 18px; font-weight: 400; letter-spacing: -0.01em; }
        .bam-exp-headline-m em { font-style: italic; color: #6b645d; }
        .bam-exp-body-m { font-size: 14px; line-height: 1.7; color: #5a544f; margin-bottom: 24px; font-weight: 300; }
        .bam-exp-body-m p + p { margin-top: 12px; }
        .bam-exp-body-m strong { color: #1a1816; font-weight: 600; }

        /* Mobile stats */
        .bam-stats-m { display: flex; align-items: center; padding: 20px 0; border-top: 1px solid #e8e4df; border-bottom: 1px solid #e8e4df; margin-bottom: 28px; }
        .bam-stat-m { flex: 1; }
        .bam-stat-divider-m { width: 1px; height: 44px; flex-shrink: 0; margin: 0 20px; background: #1a1816; }
        .bam-stat-val-m { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 40px; line-height: 1; letter-spacing: -0.03em; margin-bottom: 5px; color: #1a1816; }
        .bam-stat-lbl-m { font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: #8a8580; font-weight: 600; display: block; }
        .bam-stat-sub-m { font-size: 9px; color: #8a8580; margin-top: 2px; display: block; }

        /* Mobile CTA */
        .bam-exp-cta-m { font-family: var(--font-archivo), 'Archivo', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; cursor: pointer; background: none; border: none; padding: 0; color: #1a1816; }
        .bam-exp-cta-m::after { content: '→'; font-size: 14px; }
        .bam-exp-cta-kicker-m { font-size: 12px; color: #8a8580; font-weight: 300; line-height: 1.5; display: block; }

        /* Market section */
        .bam-mkt-m { padding: 52px 24px 72px; background: #fdfcfa; border-top: 2px solid #1a1816; }
        .bam-mkt-eyebrow-m { font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase; color: #8a8580; font-weight: 600; margin-bottom: 14px; }
        .bam-mkt-headline-m { font-family: var(--font-playfair), 'Playfair Display', serif; font-size: 34px; line-height: 1.15; color: #1a1816; margin-bottom: 28px; font-weight: 400; letter-spacing: -0.01em; }
        .bam-mkt-headline-m em { font-style: italic; color: #6b645d; }
        .bam-mkt-body-m { font-size: 14px; line-height: 1.7; color: #5a544f; margin-bottom: 28px; font-weight: 300; }
        .bam-mkt-body-m p + p { margin-top: 14px; }
        .bam-mkt-cta-m { font-family: var(--font-archivo), 'Archivo', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; display: flex; align-items: center; gap: 10px; color: #1a1816; margin-bottom: 10px; cursor: pointer; background: none; border: none; padding: 0; }
        .bam-mkt-cta-m::after { content: '→'; font-size: 14px; }
        .bam-mkt-kicker-m { font-size: 12px; color: #8a8580; font-weight: 300; line-height: 1.5; display: block; }

        /* Mobile narrative — light theme overrides over dark base */
        .bam-mobile .bam-narrative { border: 2px solid #e8e4df; margin-bottom: 28px; }
        .bam-mobile .beat { padding: 12px 16px; gap: 14px; border-bottom: 1px solid #e8e4df; }
        .bam-mobile .beat-index { color: #1a1816; margin-top: 2px; }
        .bam-mobile .beat.active .beat-index { color: #6b645d; }
        .bam-mobile .beat-label { color: #8a8580; margin-bottom: 6px; }
        .bam-mobile .beat.active .beat-label { color: #1a1816; }
        .bam-mobile .beat-text { font-size: 13px; color: #5a544f; line-height: 1.6; }
        .bam-mobile .beat.active .beat-text { color: #5a544f; }
        .bam-mobile .beat-text strong { color: #1a1816; }
        .bam-mobile .beat-quote { font-size: 14px; color: #5a544f; line-height: 1.6; margin-top: 8px; }
        .bam-mobile .beat.active .beat-quote { color: #1a1816; }
        .bam-mobile .beat-quote em { color: #1a1816; font-style: normal; font-weight: 700; }
        .bam-mobile .beat-meta { gap: 20px; margin-top: 10px; }
        .bam-mobile .beat-meta-val { font-size: 18px; color: #1a1816; }
        .bam-mobile .beat-meta-lbl { color: #8a8580; }
        .bam-mobile .beat-tag { border: 1px solid #1a1816; background: none; color: #1a1816; padding: 4px 10px; margin-top: 8px; }
      `}</style>

      {/* ─── NAV ────────────────────────────────────────────────────────────── */}
      <nav className="bam-nav">
        <div className="bam-logo">{NAV.logo}</div>
        <button className="bam-nav-btn" onClick={goLogin}>{NAV.loginLabel}</button>
        <button className="bam-nav-btn primary" onClick={goSignup}>{NAV.signupLabel}</button>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP — three fixed panels, market scrollable
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="bam-desktop">
        <div className="bam-panels">

          {/* BUY */}
          <div className="bam-panel bam-panel-buy">
            <div className="bam-rise-item d1 bam-eyebrow-d">{BUYER.eyebrow}</div>
            <h1 className="bam-rise-item d2 bam-headline-d">
              {BUYER.headlinePrefix} <em>{BUYER.headlineEm}</em>
            </h1>
            <div className="bam-rise-item d3 bam-body-d">
              <p><strong>{BUYER.bodyStrong}</strong> The random stranger on TikTok or IG.</p>
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
              <button className="bam-cta-link-d" onClick={goBuyer} type="button">{BUYER.ctaText}</button>
              <span className="bam-cta-kicker-d">{BUYER.ctaKicker}</span>
            </div>
          </div>

          {/* SELL */}
          <div className="bam-panel bam-panel-sell">
            <div className="bam-rise-item d1b bam-eyebrow-d">{SELLER.eyebrow}</div>
            <h1 className="bam-rise-item d2b bam-headline-d">
              {SELLER.headlinePrefix} <em>{SELLER.headlineEm}</em>
            </h1>
            <div className="bam-rise-item d3b bam-body-d">
              <p><strong>{SELLER.bodyStrong}</strong> {SELLER.bodyMechanic}</p>
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
              <button className="bam-cta-link-d" onClick={goSeller} type="button">{SELLER.ctaText}</button>
              <span className="bam-cta-kicker-d">{SELLER.ctaKicker}</span>
            </div>
          </div>

          {/* MARKET — independently scrollable */}
          <div className="bam-panel bam-panel-market">
            <div className="bam-rise-item d1 bam-eyebrow-d">{MARKET.eyebrow}</div>
            <h1 className="bam-rise-item d2 bam-headline-d">
              {MARKET.headlinePrefix} <em>{MARKET.headlineEm}</em>
            </h1>
            <div className="bam-rise-item d3 bam-narrative">
              {BEATS.map((beat) => <NarrativeBeat key={beat.index} beat={beat} />)}
            </div>
            <div className="bam-rise-item d4 bam-body-d">
              {MARKET.body.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="bam-rise-item d5 bam-cta-zone-d">
              <button className="bam-cta-link-d" onClick={goMain} type="button">{MARKET.ctaText}</button>
              <span className="bam-cta-kicker-d">{MARKET.ctaKicker}</span>
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE — light warm theme, accordion, scrollable market
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="bam-mobile">

        <section className="bam-hero-m">
          <div className="bam-rise-item d1 bam-hero-eyebrow-m">The Marketplace for Human Connection</div>
          <h1 className="bam-rise-item d2 bam-hero-headline-m">
            We didn&apos;t invent attention.<em>We gave it a price.</em>
          </h1>
          <p className="bam-rise-item d3 bam-hero-body-m">
            Pay to reach anyone. Get paid to be reachable. Voice and video calls priced by the minute.
          </p>
          <div className="bam-rise-item d4 bam-hero-divider-m">Choose your path</div>

          <div className="bam-choices-m">

            {/* BUY */}
            <button
              ref={buyRef}
              className={`bam-choice-btn-m${openSection === "buy" ? " open" : ""}`}
              onClick={() => toggleSection("buy")}
              type="button"
              aria-expanded={openSection === "buy"}
            >
              <span className="bam-choice-label-m">I want to reach someone</span>
              <span className="bam-choice-title-m">Buy their attention</span>
              <span className="bam-choice-arrow-m">→</span>
            </button>
            <div className={`bam-expandable-m${openSection === "buy" ? " open" : ""}`}>
              <div className="bam-exp-content-m">
                <div className="bam-exp-eyebrow-m">{BUYER.eyebrow}</div>
                <h2 className="bam-exp-headline-m">
                  Stop hoping for a reply or attention when you can <em>{BUYER.headlineEm}</em>
                </h2>
                <div className="bam-exp-body-m">
                  <p><strong>{BUYER.bodyStrong}</strong> The random stranger on TikTok or IG.</p>
                  <p>{BUYER.bodyMechanic}</p>
                </div>
                <div className="bam-stats-m">
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
                <button className="bam-exp-cta-m" onClick={goBuyer} type="button">{BUYER.ctaText}</button>
                <span className="bam-exp-cta-kicker-m">{BUYER.ctaKicker}</span>
              </div>
            </div>

            {/* SELL */}
            <button
              ref={sellRef}
              className={`bam-choice-btn-m${openSection === "sell" ? " open" : ""}`}
              onClick={() => toggleSection("sell")}
              type="button"
              aria-expanded={openSection === "sell"}
            >
              <span className="bam-choice-label-m">I want to earn money</span>
              <span className="bam-choice-title-m">Get paid for your time</span>
              <span className="bam-choice-arrow-m">→</span>
            </button>
            <div className={`bam-expandable-m${openSection === "sell" ? " open" : ""}`}>
              <div className="bam-exp-content-m">
                <div className="bam-exp-eyebrow-m">{SELLER.eyebrow}</div>
                <h2 className="bam-exp-headline-m">
                  {SELLER.headlinePrefix} <em>{SELLER.headlineEm}</em>
                </h2>
                <div className="bam-exp-body-m">
                  <p><strong>{SELLER.bodyStrong}</strong> {SELLER.bodyMechanic}</p>
                  <p>{SELLER_PULL}</p>
                </div>
                <div className="bam-stats-m">
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
                <button className="bam-exp-cta-m" onClick={goSeller} type="button">{SELLER.ctaText}</button>
                <span className="bam-exp-cta-kicker-m">{SELLER.ctaKicker}</span>
              </div>
            </div>

          </div>
        </section>

        {/* Market */}
        <section className="bam-mkt-m">
          <div className="bam-mkt-eyebrow-m">{MARKET.eyebrow}</div>
          <h2 className="bam-mkt-headline-m">
            {MARKET.headlinePrefix} <em>{MARKET.headlineEm}</em>
          </h2>
          <div className="bam-narrative">
            {BEATS.map((beat) => <NarrativeBeat key={beat.index} beat={beat} mobile />)}
          </div>
          <div className="bam-mkt-body-m">
            {MARKET.body.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <button className="bam-mkt-cta-m" onClick={goMain} type="button">{MARKET.ctaText}</button>
          <span className="bam-mkt-kicker-m">{MARKET.ctaKicker}</span>
        </section>

      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Syne, Josefin_Sans, DM_Serif_Display } from "next/font/google";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildAuthRedirect } from "@/components/auth/AuthGuard";
import { usePathname } from "next/navigation";

/* ── Fonts ──────────────────────────────────────────── */
const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
});

const josefin = Josefin_Sans({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700"],
  variable: "--font-josefin",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
});

/* ── Token map (mirrors CSS :root) ─────────────────── */
const t = {
  mag:      "#ff2070",
  magGlow:  "rgba(255,32,112,0.28)",
  cyn:      "#00e5ff",
  cynGlow:  "rgba(0,229,255,0.22)",
  amb:      "#ffb830",
  ambGlow:  "rgba(255,184,48,0.22)",
  line:     "rgba(255,255,255,0.055)",
  line2:    "rgba(255,255,255,0.1)",
  ph:       "clamp(13px, 3vw, 40px)",
};

/* ── Shared style helpers ───────────────────────────── */
const s = {
  fontHead:  "clamp(1.1rem, 2vw, 1.8rem)" as const,
  fontCopy:  "clamp(0.52rem, 0.7vw, 0.63rem)" as const,
  fontSv:    "clamp(1.2rem, 2vw, 1.9rem)" as const,
  fontSl:    "0.26rem" as const,
  fontCta:   "0.56rem" as const,
  fontQnav:  "0.3rem" as const,
  fontLabel: "0.37rem" as const,
};

/* ════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════ */
export default function HomePage() {
  const { status, expired } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  /* calculator state */
  const [rate,  setRate]  = useState(5);
  const [calls, setCalls] = useState(8);
  const [mins,  setMins]  = useState(10);
  const monthly = rate * mins * calls * 4;

  /* ── Scroll helpers ─────────────────────────────── */
  const laneScrollTo = useCallback((targetId: string, laneClass: string) => {
    const target = document.getElementById(targetId);
    const lane   = document.querySelector(`.${laneClass}`) as HTMLElement | null;
    if (!target || !lane) return;
    let offset = 0;
    let el: HTMLElement | null = target;
    while (el && el !== lane) {
      offset += el.offsetTop;
      el = el.offsetParent as HTMLElement | null;
    }
    lane.scrollTo({ top: offset - 36, behavior: "smooth" });
  }, []);

  const pageScrollTo = useCallback((targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /* ── Auth-aware nav routing ─────────────────────── */
  const isAuthed = status === "authenticated";
  const goSignup = () => router.push("/signup");
  const goLogin  = () => router.push(buildAuthRedirect({ pathname, expired }));
  const goBrowse = () => router.push("/browse");

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */
  return (
    <div className={`${syne.variable} ${josefin.variable} ${dmSerif.variable}`} style={{
      background: "#020108",
      color: "#ede8d8",
      fontFamily: "var(--font-josefin), 'Josefin Sans', sans-serif",
      overflowX: "hidden",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      minHeight: "100dvh",
    }}>

      {/* ── Global styles injected once ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-size: 16px; -webkit-text-size-adjust: 100%; }
        a { text-decoration: none; }
        button { background: none; border: none; font-family: inherit; cursor: pointer; }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.15} }

        /* ── tokens ── */
        :root {
          --mag: #ff2070; --mag-glow: rgba(255,32,112,0.28);
          --cyn: #00e5ff; --cyn-glow: rgba(0,229,255,0.22);
          --amb: #ffb830; --amb-glow: rgba(255,184,48,0.22);
          --line: rgba(255,255,255,0.055);
          --line2: rgba(255,255,255,0.1);
          --ph: clamp(13px, 3vw, 40px);
          --font-head:  clamp(1.1rem,2vw,1.8rem);
          --font-copy:  clamp(0.52rem,0.7vw,0.63rem);
          --font-sv:    clamp(1.2rem,2vw,1.9rem);
          --font-sl:    0.26rem;
          --font-cta:   0.56rem;
          --font-qnav:  0.3rem;
          --font-label: 0.37rem;
        }
        @media(max-width:900px){:root{
          --font-head:clamp(0.95rem,3.2vw,1.35rem);
          --font-copy:clamp(0.44rem,1.5vw,0.54rem);
          --font-sv:clamp(1.0rem,3.5vw,1.5rem);
          --font-sl:0.23rem; --font-cta:0.44rem;
          --font-qnav:0.26rem; --font-label:0.31rem;
        }}
        @media(max-width:600px){:root{
          --font-head:clamp(0.8rem,4vw,1.05rem);
          --font-copy:clamp(0.38rem,1.8vw,0.48rem);
          --font-sv:clamp(0.9rem,4.2vw,1.25rem);
          --font-sl:0.19rem; --font-cta:0.36rem;
          --font-qnav:0.22rem; --font-label:0.27rem;
        }}

        /* ── NAV ── */
        .bam-nav {
          height:52px; flex-shrink:0;
          display:flex; align-items:center; justify-content:space-between;
          padding:0 var(--ph);
          border-bottom:1px solid var(--line);
          background:rgba(2,1,8,0.97);
          position:sticky; top:0; z-index:100; gap:12px;
        }
        @media(max-width:600px){.bam-nav{height:46px;}}
        .bam-nav-logo {
          font-family:var(--font-syne),'Syne',sans-serif;
          font-size:clamp(0.68rem,1.4vw,0.9rem); font-weight:800;
          letter-spacing:0.16em; white-space:nowrap; flex-shrink:0; color:#ede8d8;
        }
        .bam-nav-logo .a { color:var(--mag); text-shadow:0 0 16px rgba(255,32,112,0.8); }
        .bam-nav-links { display:flex; align-items:center; gap:16px; flex-shrink:0; }
        .bam-nav-links a, .bam-nav-links button {
          font-size:clamp(0.3rem,1vw,0.42rem); font-weight:700;
          letter-spacing:0.18em; text-transform:uppercase;
          color:rgba(237,232,216,0.55); white-space:nowrap;
          background:none; border:none; cursor:pointer;
        }
        .bam-nav-meta { display:flex; align-items:center; gap:12px; }
        .bam-nav-sep  { color:rgba(255,255,255,0.1); }
        .bam-nav-user {
          font-size:0.37rem; letter-spacing:0.12em; text-transform:uppercase;
          color:rgba(237,232,216,0.32); white-space:nowrap;
        }
        .bam-nav-out {
          font-size:0.37rem; font-weight:700; letter-spacing:0.12em;
          text-transform:uppercase; color:rgba(237,232,216,0.32);
        }
        @media(max-width:720px){.bam-nav-meta{display:none;}}

        /* ── LANES ── */
        .bam-lanes {
          height:calc(100dvh - 52px); flex-shrink:0;
          display:grid; grid-template-columns:1fr 1fr;
          position:relative;
        }
        @media(max-width:600px){.bam-lanes{height:calc(100dvh - 46px);}}
        .bam-lanes::after {
          content:''; position:absolute; top:0; bottom:0;
          left:calc(50% - 1px); width:1px;
          background:linear-gradient(to bottom,var(--mag) 0%,rgba(255,32,112,0.25) 65%,transparent 100%);
          box-shadow:0 0 18px rgba(255,32,112,0.3);
          z-index:50; pointer-events:none;
        }
        .bam-lane {
          overflow-y:auto; overflow-x:hidden;
          scroll-behavior:smooth; scrollbar-width:none; position:relative;
        }
        .bam-lane::-webkit-scrollbar{display:none;}
        .bam-lane-buyer {
          background:
            radial-gradient(ellipse 120% 70% at 30% 35%, rgba(0,50,180,0.45), transparent 65%),
            radial-gradient(ellipse 80% 50% at 0% 80%, rgba(0,80,220,0.2), transparent 60%),
            #020108;
        }
        .bam-lane-seller {
          background:
            radial-gradient(ellipse 120% 70% at 70% 35%, rgba(160,0,50,0.45), transparent 65%),
            radial-gradient(ellipse 80% 50% at 100% 80%, rgba(200,0,60,0.22), transparent 60%),
            #020108;
        }

        /* ── LABEL ── */
        .bam-lane-label {
          position:sticky; top:0; z-index:40;
          padding:7px var(--ph);
          display:flex; align-items:center; gap:8px;
          border-bottom:1px solid var(--line);
          background:rgba(2,1,8,0.9);
          backdrop-filter:blur(6px);
        }
        .bam-label-dot {
          width:5px; height:5px; border-radius:50%; flex-shrink:0;
          animation:pulse 2s ease-in-out infinite;
        }
        @media(max-width:600px){.bam-label-dot{width:4px;height:4px;}}
        .bam-label-dot-cyn { background:var(--cyn); box-shadow:0 0 8px var(--cyn-glow); }
        .bam-label-dot-mag { background:var(--mag); box-shadow:0 0 8px var(--mag-glow); animation-delay:.5s; }
        .bam-label-text { font-size:var(--font-label); font-weight:700; letter-spacing:0.2em; text-transform:uppercase; line-height:1.3; }
        .bam-label-cyn { color:var(--cyn); }
        .bam-label-mag { color:var(--mag); }

        /* ── HERO ZONE ── */
        .bam-hero-zone {
          min-height:calc(100dvh - 52px - 34px);
          padding:20px var(--ph) 0;
          display:flex; flex-direction:column;
          border-bottom:1px solid var(--line);
        }
        @media(max-width:600px){.bam-hero-zone{min-height:0; padding:16px var(--ph) 0;}}

        .bam-headline {
          font-family:var(--font-syne),'Syne',sans-serif;
          font-size:var(--font-head); font-weight:800;
          text-transform:uppercase; letter-spacing:0.03em; line-height:1.1;
          color:#ede8d8; margin-bottom:12px;
        }
        .bam-hl-cyn { color:var(--cyn); text-shadow:0 0 18px var(--cyn-glow); }
        .bam-hl-mag { color:var(--mag); text-shadow:0 0 18px var(--mag-glow); }

        .bam-copy {
          font-size:var(--font-copy); font-weight:300;
          letter-spacing:0.08em; text-transform:uppercase;
          color:rgba(237,232,216,0.82); line-height:1.82; margin-bottom:12px;
        }
        .bam-copy strong { font-weight:700; color:#ede8d8; }
        .bam-copy .strike { text-decoration:line-through; text-decoration-thickness:1.5px; color:rgba(237,232,216,0.38); }
        .bam-copy .strike-cyn { text-decoration-color:var(--cyn); }
        .bam-copy .strike-mag { text-decoration-color:var(--mag); }
        .bam-copy .sub { display:block; color:rgba(237,232,216,0.44); font-size:.9em; margin-top:2px; }
        .bam-copy p { margin-bottom:.75em; }
        .bam-copy p:last-child { margin-bottom:0; }

        /* stat box */
        .bam-hero-stat {
          border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.03);
          padding:10px; display:grid; grid-template-columns:1fr 1fr; margin-bottom:14px;
        }
        .bam-hero-stat-cyn { border-color:rgba(0,229,255,0.2); background:rgba(0,229,255,0.04); }
        .bam-hero-stat-mag { border-color:rgba(255,32,112,0.2); background:rgba(255,32,112,0.04); }
        .bam-hs-item { padding:0 8px; }
        .bam-hs-item:first-child { padding-left:0; border-right:1px solid var(--line); }
        .bam-hs-item:last-child  { padding-right:0; }
        .bam-hs-val {
          font-family:var(--font-syne),'Syne',sans-serif;
          font-size:var(--font-sv); font-weight:800; line-height:1; margin-bottom:3px;
        }
        .bam-hs-val-cyn { color:var(--cyn); text-shadow:0 0 18px var(--cyn-glow); }
        .bam-hs-val-mag { color:var(--mag); text-shadow:0 0 18px var(--mag-glow); }
        .bam-hs-lbl { font-size:var(--font-sl); font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:rgba(237,232,216,0.38); line-height:1.3; }
        .bam-hs-sub { font-size:calc(var(--font-sl)*.88); letter-spacing:.1em; text-transform:uppercase; color:rgba(237,232,216,0.22); margin-top:2px; }

        /* hero CTAs */
        .bam-hero-ctas { margin-top:auto; border-top:1px solid var(--line); }
        .bam-cta-primary {
          display:flex; align-items:center; justify-content:space-between;
          padding:12px 0; border-bottom:1px solid var(--line); cursor:pointer;
          background:none; width:100%; position:relative; overflow:hidden; transition:background .15s;
        }
        .bam-cta-primary:hover { background:rgba(255,255,255,0.02); }
        .bam-cta-p-lbl {
          font-family:var(--font-syne),'Syne',sans-serif;
          font-size:var(--font-cta); font-weight:800; letter-spacing:.08em;
          text-transform:uppercase; line-height:1.2;
        }
        .bam-cta-p-lbl-cyn { color:var(--cyn); text-shadow:0 0 12px var(--cyn-glow); }
        .bam-cta-p-lbl-mag { color:var(--mag); text-shadow:0 0 12px var(--mag-glow); }
        .bam-cta-p-arr { font-size:clamp(.9rem,1.5vw,1.1rem); transition:transform .2s; }
        .bam-cta-primary:hover .bam-cta-p-arr { transform:translateX(4px); }
        .bam-cta-p-arr-cyn { color:rgba(0,229,255,0.5); }
        .bam-cta-p-arr-mag { color:rgba(255,32,112,0.5); }
        .bam-cta-secondary {
          display:flex; align-items:center; justify-content:space-between;
          padding:9px 0; border-bottom:1px solid var(--line); cursor:pointer;
          background:none; width:100%; transition:background .15s;
        }
        .bam-cta-secondary:hover { background:rgba(255,255,255,0.02); }
        .bam-cta-s-lbl { font-size:var(--font-cta); font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:rgba(237,232,216,0.6); line-height:1.2; }
        .bam-cta-s-arr { font-size:clamp(.75rem,1.2vw,.9rem); color:rgba(237,232,216,0.2); }
        .bam-quick-nav { display:flex; align-items:center; flex-wrap:wrap; gap:6px 10px; padding:9px 0 18px; }
        .bam-quick-nav a, .bam-quick-nav button {
          font-size:var(--font-qnav); font-weight:700; letter-spacing:.14em;
          text-transform:uppercase; color:rgba(237,232,216,0.35);
          background:none; border:none; cursor:pointer; padding:0;
        }
        .bam-quick-nav a:hover, .bam-quick-nav button:hover { color:rgba(237,232,216,.7); }
        .bam-qn-sep { color:rgba(255,255,255,0.1); font-size:var(--font-qnav); }

        /* ── SNAP SECTIONS ── */
        .bam-snap { padding:32px var(--ph); border-bottom:2px solid var(--line); }
        .bam-snap:last-child { border-bottom:none; }
        .bam-sec-tag { font-size:.34rem; font-weight:700; letter-spacing:.3em; text-transform:uppercase; margin-bottom:6px; }
        .bam-sec-tag-cyn { color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); }
        .bam-sec-tag-mag { color:var(--mag); text-shadow:0 0 8px var(--mag-glow); }
        .bam-sec-title {
          font-family:var(--font-syne),'Syne',sans-serif;
          font-size:clamp(1.0rem,3vw,2.6rem); font-weight:800;
          text-transform:uppercase; letter-spacing:.04em; line-height:1.05;
          color:#ede8d8; margin-bottom:10px;
          overflow-wrap:break-word; word-break:break-word; hyphens:auto;
        }
        @media(max-width:600px){ .bam-sec-title { font-size:clamp(0.9rem,5.5vw,1.35rem); letter-spacing:.02em; } }
        .bam-sec-body { font-size:clamp(.52rem,.72vw,.66rem); font-weight:300; letter-spacing:.09em; text-transform:uppercase; color:rgba(237,232,216,.72); line-height:1.85; margin-bottom:24px; max-width:480px; }

        /* persona cards */
        .bam-persona { display:flex; flex-direction:column; gap:0; }
        .bam-card { padding:22px 0; border-bottom:1px solid var(--line); }
        .bam-card:last-child { border-bottom:none; }
        .bam-p-eyebrow { font-size:.34rem; font-weight:700; letter-spacing:.28em; text-transform:uppercase; margin-bottom:6px; }
        .bam-p-eyebrow-cyn { color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); }
        .bam-p-eyebrow-mag { color:var(--mag); text-shadow:0 0 8px var(--mag-glow); }
        .bam-p-eyebrow-amb { color:var(--amb); text-shadow:0 0 8px var(--amb-glow); }
        .bam-p-hook { font-family:var(--font-dm-serif),'DM Serif Display',serif; font-style:italic; font-size:clamp(.8rem,1.4vw,1.2rem); color:#ede8d8; line-height:1.25; margin-bottom:10px; }
        .bam-p-body { font-size:clamp(.5rem,.66vw,.62rem); font-weight:300; letter-spacing:.08em; text-transform:uppercase; color:rgba(237,232,216,.75); line-height:1.85; margin-bottom:12px; }
        .bam-p-example { font-size:clamp(.44rem,.58vw,.54rem); font-weight:300; letter-spacing:.08em; text-transform:uppercase; color:rgba(237,232,216,.5); line-height:1.7; margin-bottom:12px; padding-left:10px; border-left:2px solid var(--line2); }
        .bam-p-calc { border:1px solid var(--line2); background:rgba(255,255,255,.02); }
        .bam-pc-row { display:flex; align-items:center; justify-content:space-between; padding:7px 12px; border-bottom:1px solid var(--line); font-size:clamp(.44rem,.58vw,.54rem); font-weight:300; letter-spacing:.1em; text-transform:uppercase; }
        .bam-pc-row:last-child { border-bottom:none; }
        .bam-pc-row-hi { background:rgba(255,255,255,.02); }
        .bam-pc-lbl { color:rgba(237,232,216,.5); }
        .bam-pc-val { font-weight:700; color:#ede8d8; }
        .bam-pc-val-mag { color:var(--mag); text-shadow:0 0 10px var(--mag-glow); }
        .bam-pc-val-cyn { color:var(--cyn); text-shadow:0 0 10px var(--cyn-glow); }
        .bam-pc-val-amb { color:var(--amb); text-shadow:0 0 10px var(--amb-glow); }
        .bam-pc-val-ghost { color:rgba(237,232,216,.2); }
        .bam-beh-stat { margin-top:auto; padding-top:14px; border-top:1px solid var(--line); font-size:.44rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:var(--mag); text-shadow:0 0 8px var(--mag-glow); }

        /* hustle tactics */
        .bam-ht { display:flex; align-items:flex-start; gap:10px; padding:8px 0; border-top:1px solid var(--line); }
        .bam-ht-icon { color:var(--cyn); font-size:.54rem; flex-shrink:0; margin-top:1px; }
        .bam-ht-title { font-size:.32rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:#ede8d8; margin-bottom:3px; }
        .bam-ht-desc { font-size:.3rem; font-weight:300; letter-spacing:.08em; text-transform:uppercase; color:rgba(237,232,216,.55); line-height:1.7; }

        /* terminal card */
        .bam-terminal { border:1px solid rgba(255,32,112,.18); background:rgba(255,32,112,.03); padding:16px; margin-top:4px; }
        .bam-tc-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--line); }
        .bam-tc-label { font-size:.3rem; font-weight:700; letter-spacing:.24em; text-transform:uppercase; color:rgba(237,232,216,.4); }
        .bam-tc-live { display:flex; align-items:center; gap:5px; font-size:.3rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--mag); }
        .bam-tc-live-dot { width:5px; height:5px; border-radius:50%; background:var(--mag); box-shadow:0 0 8px var(--mag); animation:pulse 1.4s ease-in-out infinite; display:inline-block; }
        .bam-tc-profile { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
        .bam-tc-avatar { width:40px; height:40px; border-radius:50%; background:rgba(255,32,112,.12); border:1px solid rgba(255,32,112,.2); display:flex; align-items:center; justify-content:center; font-size:.54rem; font-weight:700; color:var(--mag); flex-shrink:0; }
        .bam-tc-handle { font-size:.38rem; font-weight:700; letter-spacing:.12em; color:#ede8d8; display:block; }
        .bam-tc-rate { font-size:.3rem; letter-spacing:.1em; text-transform:uppercase; color:rgba(237,232,216,.5); display:block; margin-top:2px; }
        .bam-tc-avail { font-size:.28rem; letter-spacing:.1em; text-transform:uppercase; color:var(--cyn); display:block; margin-top:2px; }
        .bam-tc-ticker { font-size:.3rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--mag); padding:7px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); margin-bottom:10px; display:flex; align-items:center; gap:6px; }
        .bam-tc-ticker::before { content:''; width:4px; height:4px; border-radius:50%; background:var(--mag); box-shadow:0 0 6px var(--mag); flex-shrink:0; animation:pulse 1.5s ease-in-out infinite; }
        .bam-tc-stats { display:grid; grid-template-columns:1fr 1fr 1fr; border:1px solid var(--line); margin-bottom:10px; }
        .bam-tc-stat { padding:9px 8px; border-right:1px solid var(--line); text-align:center; }
        .bam-tc-stat:last-child { border-right:none; }
        .bam-tc-sv { font-size:clamp(.8rem,1.6vw,1.2rem); font-weight:700; color:#ede8d8; line-height:1; margin-bottom:2px; }
        .bam-tc-sv-mag { color:var(--mag); text-shadow:0 0 10px var(--mag-glow); }
        .bam-tc-sl { font-size:.22rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:rgba(237,232,216,.35); line-height:1.3; }
        .bam-tc-meta { border-top:1px solid var(--line); padding-top:8px; }
        .bam-tc-meta-row { display:flex; align-items:center; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--line); }
        .bam-tc-meta-row:last-child { border-bottom:none; }
        .bam-tc-ml { font-size:.27rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:rgba(237,232,216,.35); }
        .bam-tc-mv { font-size:.27rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:rgba(237,232,216,.6); }
        .bam-tc-mv-cyn { color:var(--cyn); }
        .bam-tc-feed { margin-top:8px; padding-top:8px; border-top:1px solid var(--line); }
        .bam-tc-feed-row { font-size:.28rem; font-weight:300; letter-spacing:.1em; text-transform:uppercase; color:rgba(237,232,216,.45); padding:3px 0; }
        .bam-tc-feed-row b { font-weight:700; color:#ede8d8; }

        /* calculator */
        .bam-calc { border:1px solid var(--line2); background:rgba(255,255,255,.02); padding:18px; }
        .bam-ec-label { font-size:.32rem; font-weight:700; letter-spacing:.26em; text-transform:uppercase; color:rgba(237,232,216,.4); margin-bottom:4px; }
        .bam-ec-hint  { font-size:.28rem; font-weight:300; letter-spacing:.1em; text-transform:uppercase; color:rgba(237,232,216,.35); margin-bottom:16px; }
        .bam-ec-sg { margin-bottom:12px; }
        .bam-ec-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
        .bam-ec-lbl { font-size:.3rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:rgba(237,232,216,.5); }
        .bam-ec-val { font-size:.3rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--mag); }
        input[type=range].bam-range {
          width:100%; height:3px; background:rgba(255,255,255,.1);
          -webkit-appearance:none; appearance:none; outline:none; cursor:pointer;
        }
        input[type=range].bam-range::-webkit-slider-thumb {
          -webkit-appearance:none; width:14px; height:14px; border-radius:50%;
          background:var(--mag); box-shadow:0 0 8px var(--mag-glow); cursor:pointer;
        }
        .bam-ec-divider { height:1px; background:var(--line); margin:16px 0; }
        .bam-ec-out-lbl { font-size:.3rem; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:rgba(237,232,216,.4); margin-bottom:4px; }
        .bam-ec-out-val { font-family:var(--font-syne),'Syne',sans-serif; font-size:clamp(1.8rem,4vw,3rem); font-weight:800; color:var(--mag); text-shadow:0 0 40px var(--mag-glow); line-height:1; margin-bottom:6px; }
        .bam-ec-out-sub { font-size:.28rem; font-weight:300; letter-spacing:.1em; text-transform:uppercase; color:rgba(237,232,216,.4); margin-bottom:14px; }
        .bam-ec-cta { display:inline-flex; align-items:center; gap:8px; padding:12px 20px; background:var(--mag); color:#020108; font-size:.5rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; cursor:pointer; border:none; font-family:inherit; }

        /* buyer CTA */
        .bam-buyer-cta-wrap { padding:20px 0 4px; border-top:1px solid var(--line); margin-top:4px; }
        .bam-buyer-cta { display:inline-flex; align-items:center; gap:8px; padding:12px 20px; background:var(--cyn); color:#020108; font-size:.5rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; cursor:pointer; border:none; font-family:inherit; }

        /* crush + reach */
        .bam-crush-desc p { font-size:clamp(.5rem,.66vw,.62rem); font-weight:300; letter-spacing:.08em; text-transform:uppercase; color:rgba(237,232,216,.75); line-height:1.85; margin-bottom:.8em; }
        .bam-cs-item { display:flex; align-items:flex-start; gap:10px; padding:10px 0; border-top:1px solid var(--line); }
        .bam-cs-icon { color:var(--mag); font-size:.62rem; flex-shrink:0; margin-top:1px; }
        .bam-cs-title { font-size:.32rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:#ede8d8; margin-bottom:3px; }
        .bam-cs-desc { font-size:.3rem; font-weight:300; letter-spacing:.08em; text-transform:uppercase; color:rgba(237,232,216,.55); line-height:1.7; }
        .bam-reach-desc { font-size:clamp(.5rem,.66vw,.62rem); font-weight:300; letter-spacing:.08em; text-transform:uppercase; color:rgba(237,232,216,.75); line-height:1.85; margin-bottom:16px; }
        .bam-rt-item { display:flex; align-items:flex-start; gap:10px; padding:10px 0; border-top:1px solid var(--line); }
        .bam-rt-icon { font-size:.54rem; flex-shrink:0; margin-top:1px; color:var(--cyn); }
        .bam-rt-title { font-size:.32rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:#ede8d8; margin-bottom:3px; }
        .bam-rt-desc { font-size:.3rem; font-weight:300; letter-spacing:.08em; text-transform:uppercase; color:rgba(237,232,216,.55); line-height:1.7; }

        /* ── FULL-WIDTH SECTIONS ── */
        .bam-full { width:100%; border-top:1px solid var(--line); background:#020108; position:relative; }
        .bam-merge-line { display:flex; align-items:center; padding:0 var(--ph); height:52px; border-bottom:1px solid var(--line); background:rgba(2,1,8,0.98); position:sticky; top:0; z-index:30; }
        .bam-ml-left  { flex:1; height:1px; background:linear-gradient(to right, transparent, rgba(0,229,255,0.4)); }
        .bam-ml-right { flex:1; height:1px; background:linear-gradient(to left, transparent, rgba(255,32,112,0.4)); }
        .bam-ml-label { padding:0 20px; flex-shrink:0; }
        .bam-ml-tag { font-size:.34rem; font-weight:700; letter-spacing:.32em; text-transform:uppercase; color:rgba(237,232,216,.4); white-space:nowrap; }

        /* exchange */
        .bam-fs-header { padding:40px var(--ph) 32px; max-width:680px; }
        .bam-fs-title { font-family:var(--font-syne),'Syne',sans-serif; font-size:clamp(1.8rem,4vw,3.6rem); font-weight:800; text-transform:uppercase; letter-spacing:.04em; line-height:1.05; color:#ede8d8; margin-bottom:12px; }
        .bam-fs-sub { font-size:clamp(.52rem,.72vw,.66rem); font-weight:300; letter-spacing:.09em; text-transform:uppercase; color:rgba(237,232,216,.65); line-height:1.85; }
        .bam-modes { display:grid; grid-template-columns:1fr auto 1fr; align-items:stretch; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
        @media(max-width:700px){.bam-modes{grid-template-columns:1fr;} .bam-mode-divider{display:none;} .bam-mode-buyer{border-right:none!important;border-bottom:1px solid var(--line);}}
        .bam-mode { padding:32px var(--ph); }
        .bam-mode-buyer { border-right:1px solid var(--line); }
        .bam-mode-divider { width:1px; background:var(--line); flex-shrink:0; }
        .bam-mode-eyebrow { font-size:.38rem; font-weight:700; letter-spacing:.28em; text-transform:uppercase; margin-bottom:5px; }
        .bam-mode-eyebrow-cyn { color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); }
        .bam-mode-eyebrow-mag { color:var(--mag); text-shadow:0 0 8px var(--mag-glow); }
        .bam-mode-subtitle { font-size:.3rem; font-weight:300; letter-spacing:.14em; text-transform:uppercase; color:rgba(237,232,216,.35); margin-bottom:18px; }
        .bam-mode-bullets { display:flex; flex-direction:column; gap:0; margin-bottom:18px; }
        .bam-mb { display:flex; align-items:flex-start; gap:10px; padding:8px 0; border-bottom:1px solid var(--line); font-size:clamp(.5rem,.68vw,.64rem); font-weight:300; letter-spacing:.08em; text-transform:uppercase; color:rgba(237,232,216,.72); line-height:1.7; }
        .bam-mb:first-child { border-top:1px solid var(--line); }
        .bam-mb-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; margin-top:5px; animation:pulse 2.5s ease-in-out infinite; }
        .bam-mb-dot-cyn { background:var(--cyn); box-shadow:0 0 6px var(--cyn-glow); }
        .bam-mb-dot-mag { background:var(--mag); box-shadow:0 0 6px var(--mag-glow); animation-delay:.4s; }
        .bam-hl { font-weight:700; }
        .bam-hl-c { color:var(--cyn); }
        .bam-hl-m { color:var(--mag); }
        .bam-mode-risk { display:flex; align-items:center; gap:8px; padding:10px 12px; font-size:.3rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; }
        .bam-cyn-risk { background:rgba(0,229,255,.04); border:1px solid rgba(0,229,255,.1); color:var(--cyn); }
        .bam-mag-risk { background:rgba(255,32,112,.04); border:1px solid rgba(255,32,112,.1); color:var(--mag); }

        /* flow steps */
        .bam-flow-wrap { padding:28px var(--ph); border-bottom:1px solid var(--line); }
        .bam-flow-lbl { font-size:.3rem; font-weight:700; letter-spacing:.28em; text-transform:uppercase; color:rgba(237,232,216,.3); margin-bottom:20px; }
        .bam-flow-steps { display:grid; grid-template-columns:repeat(4,1fr); gap:0; }
        @media(max-width:700px){.bam-flow-steps{grid-template-columns:1fr 1fr;}}
        @media(max-width:400px){.bam-flow-steps{grid-template-columns:1fr;}}
        .bam-fs-step { padding:16px 20px 16px 0; border-right:1px solid var(--line); display:flex; flex-direction:column; gap:6px; }
        .bam-fs-step:last-child { border-right:none; }
        .bam-fs-step:not(:first-child) { padding-left:20px; }
        @media(max-width:700px){
          .bam-fs-step{border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:14px;}
          .bam-fs-step:nth-child(2n){border-right:none;}
          .bam-fs-step:nth-child(3),.bam-fs-step:nth-child(4){border-bottom:none;}
        }
        .bam-fs-n { font-size:.26rem; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:rgba(237,232,216,.25); }
        .bam-fs-node { width:6px; height:6px; border-radius:50%; background:rgba(237,232,216,.15); border:1px solid rgba(237,232,216,.3); }
        .bam-fs-title { font-family:var(--font-syne),'Syne',sans-serif; font-size:clamp(.8rem,1.4vw,1.1rem); font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:#ede8d8; }
        .bam-fs-desc { font-size:clamp(.46rem,.62vw,.58rem); font-weight:300; letter-spacing:.08em; text-transform:uppercase; color:rgba(237,232,216,.62); line-height:1.8; flex:1; }
        .bam-fs-tag { display:inline-block; font-size:.26rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase; padding:3px 8px; align-self:flex-start; }
        .bam-buyer-tag  { background:rgba(0,229,255,.08); color:var(--cyn); }
        .bam-seller-tag { background:rgba(255,32,112,.08); color:var(--mag); }
        .bam-both-tag   { background:rgba(255,255,255,.05); color:rgba(237,232,216,.5); }
        .bam-auto-tag   { background:rgba(255,184,48,.08); color:var(--amb); }
        .bam-exch-closing { padding:28px var(--ph); font-family:var(--font-dm-serif),'DM Serif Display',serif; font-style:italic; font-size:clamp(.9rem,1.6vw,1.4rem); color:rgba(237,232,216,.45); line-height:1.4; border-top:1px solid var(--line); }

        /* sovereign */
        #bam-sovereign { background:linear-gradient(to bottom,#02010a,#030212); overflow:hidden; }
        #bam-sovereign::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 60% 50% at 20% 40%,rgba(0,229,255,.04),transparent 70%), radial-gradient(ellipse 50% 60% at 80% 60%,rgba(255,32,112,.04),transparent 70%); pointer-events:none; }
        .bam-sov-inner { padding:40px var(--ph) 32px; position:relative; z-index:1; }
        .bam-sov-tag { font-size:.34rem; font-weight:700; letter-spacing:.32em; text-transform:uppercase; color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); margin-bottom:10px; }
        .bam-sov-title { font-family:var(--font-syne),'Syne',sans-serif; font-size:clamp(1.8rem,4vw,3.6rem); font-weight:800; text-transform:uppercase; letter-spacing:.04em; line-height:1.05; color:#ede8d8; margin-bottom:14px; }
        .bam-sov-title em { color:var(--cyn); text-shadow:0 0 40px var(--cyn-glow); font-style:italic; }
        .bam-sov-sub { font-size:clamp(.52rem,.72vw,.66rem); font-weight:300; letter-spacing:.09em; text-transform:uppercase; color:rgba(237,232,216,.65); line-height:1.85; max-width:600px; }
        .bam-pillars { display:grid; grid-template-columns:1fr 1fr 1fr; border-top:1px solid var(--line); border-bottom:1px solid var(--line); position:relative; z-index:1; }
        @media(max-width:700px){.bam-pillars{grid-template-columns:1fr;}}
        .bam-pillar { padding:28px var(--ph) 28px 0; border-right:1px solid var(--line); }
        .bam-pillar:first-child { padding-left:var(--ph); }
        .bam-pillar:last-child  { border-right:none; padding-left:var(--ph); }
        .bam-pillar:not(:first-child):not(:last-child) { padding-left:var(--ph); }
        @media(max-width:700px){.bam-pillar{border-right:none;border-bottom:1px solid var(--line);padding:20px var(--ph);} .bam-pillar:last-child{border-bottom:none;}}
        .bam-pillar-glyph { display:block; font-size:1.2rem; color:var(--cyn); text-shadow:0 0 12px var(--cyn-glow); margin-bottom:10px; opacity:.7; }
        .bam-pillar-head { font-family:var(--font-syne),'Syne',sans-serif; font-size:clamp(.7rem,1.2vw,.95rem); font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:#ede8d8; margin-bottom:8px; }
        .bam-pillar-body { font-size:clamp(.5rem,.68vw,.62rem); font-weight:300; letter-spacing:.08em; text-transform:uppercase; color:rgba(237,232,216,.65); line-height:1.85; }
        .bam-pillar-body strong { font-weight:700; color:rgba(237,232,216,.85); }

        /* sovereign flow grid */
        .bam-sfg { display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid var(--line); position:relative; z-index:1; }
        .bam-sfg-cell { padding:20px var(--ph); border-right:1px solid var(--line); position:relative; }
        .bam-sfg-cell:last-child { border-right:none; }
        .bam-sfg-cell:not(:last-child)::after { content:"→"; position:absolute; right:-.7em; top:50%; transform:translateY(-50%); font-size:.75rem; color:rgba(237,232,216,.2); z-index:2; background:#020108; padding:2px 0; line-height:1; }
        @media(max-width:700px){
          .bam-sfg{grid-template-columns:1fr 1fr;}
          .bam-sfg-cell{border-bottom:1px solid var(--line);}
          .bam-sfg-cell:nth-child(3),.bam-sfg-cell:nth-child(4){border-bottom:none;}
          .bam-sfg-cell:nth-child(even){border-right:none;}
          .bam-sfg-cell:nth-child(odd){border-right:1px solid var(--line);}
          .bam-sfg-cell::after{display:none;}
        }
        .bam-fn-tag { font-size:.26rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:rgba(237,232,216,.3); margin-bottom:4px; }
        .bam-fn-val { font-family:var(--font-syne),'Syne',sans-serif; font-size:clamp(1rem,1.8vw,1.5rem); font-weight:800; letter-spacing:.06em; text-transform:uppercase; line-height:1; margin-bottom:3px; }
        .bam-fn-val-usdt { color:var(--cyn); text-shadow:0 0 16px var(--cyn-glow); }
        .bam-fn-val-tok  { color:var(--mag); text-shadow:0 0 16px var(--mag-glow); }
        .bam-fn-sub { font-size:.26rem; font-weight:300; letter-spacing:.12em; text-transform:uppercase; color:rgba(237,232,216,.3); }

        /* footer */
        .bam-footer { padding:20px var(--ph); border-top:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; background:rgba(2,1,8,.98); }
        .bam-footer-logo { font-family:var(--font-syne),'Syne',sans-serif; font-size:.7rem; font-weight:800; letter-spacing:.18em; color:#ede8d8; }
        .bam-footer-logo .a { color:var(--mag); }
        .bam-footer-copy { font-size:.3rem; font-weight:300; letter-spacing:.16em; text-transform:uppercase; color:rgba(237,232,216,.3); }
      `}</style>

      {/* ════════════════════════════════════════════════
          NAV
      ════════════════════════════════════════════════ */}
      <nav className="bam-nav">
        <div className="bam-nav-logo">BUY<span className="a">A</span>MINUTE</div>

        {/* Always-visible links — adapt by auth state */}
        <div className="bam-nav-links">
          {isAuthed ? (
            <>
              <a href="/wallet">Wallet</a>
              <a href="/call">Call</a>
              <a href="/receiver">Dashboard</a>
            </>
          ) : (
            <>
              <button onClick={goLogin}>Log in</button>
              <button onClick={goSignup}>Start Earning</button>
            </>
          )}
        </div>

        {/* Meta — hidden below 720px via CSS */}
        {isAuthed && (
          <div className="bam-nav-meta">
            <span className="bam-nav-sep">|</span>
            <span className="bam-nav-user">Hi lolaclinton444</span>
            <button className="bam-nav-out">Log out</button>
          </div>
        )}
      </nav>

      {/* ════════════════════════════════════════════════
          TWO LANES
      ════════════════════════════════════════════════ */}
      <div className="bam-lanes">

        {/* ── LEFT — BUYER ── */}
        <div className="bam-lane bam-lane-buyer">

          <div className="bam-lane-label">
            <span className="bam-label-dot bam-label-dot-cyn" />
            <span className="bam-label-text bam-label-cyn">You want to reach someone</span>
          </div>

          {/* Hero zone */}
          <div className="bam-hero-zone">
            <div className="bam-headline">
              That random stranger,<br />
              crush, friend or mentor<br />
              <span className="bam-hl-cyn">will take your call.</span>
            </div>
            <div className="bam-copy">
              <p>When it earns them money, they pick up.</p>
              <p>This is the death of{" "}
                <span className="strike strike-cyn">cold DMs</span>,{" "}
                <span className="strike strike-cyn">unreplied texts</span> and{" "}
                <span className="strike strike-cyn">unanswered calls</span>.
              </p>
              <p><strong>BuyAMinute gives you power to incentivise a response</strong> from anyone you want access to.
                <span className="sub">(increase your odds by attaching money to the call)</span>
              </p>
            </div>
            <div className="bam-hero-stat bam-hero-stat-cyn">
              <div className="bam-hs-item">
                <div className="bam-hs-val bam-hs-val-cyn">11 min</div>
                <div className="bam-hs-lbl">Avg response</div>
                <div className="bam-hs-sub">vs 4 days cold DM</div>
              </div>
              <div className="bam-hs-item">
                <div className="bam-hs-val bam-hs-val-cyn">68%</div>
                <div className="bam-hs-lbl">Accept rate</div>
                <div className="bam-hs-sub">paid invites sent</div>
              </div>
            </div>
            <div className="bam-hero-ctas">
              <button className="bam-cta-primary" onClick={goBrowse}>
                <span className="bam-cta-p-lbl bam-cta-p-lbl-cyn">Enter to Call</span>
                <span className="bam-cta-p-arr bam-cta-p-arr-cyn">→</span>
              </button>
              <button className="bam-cta-secondary" onClick={goBrowse}>
                <span className="bam-cta-s-lbl">Send a Paid Call Offer</span>
                <span className="bam-cta-s-arr">↗</span>
              </button>
              <div className="bam-quick-nav">
                <button onClick={() => laneScrollTo("signal-vs-noise", "bam-lane-buyer")}>See How Buyers Win</button>
                <span className="bam-qn-sep">·</span>
                <button onClick={() => pageScrollTo("bam-exchange")}>Understand The Exchange</button>
              </div>
            </div>
          </div>

          {/* Buyer Snapshot */}
          <div className="bam-snap">
            <div className="bam-sec-tag bam-sec-tag-cyn">Buyer Snapshot</div>
            <h2 className="bam-sec-title">Who You Can<br />Now Reach.</h2>
            <p className="bam-sec-body">Money changes the signal. A paid call request doesn't get ignored — it gets seen, considered, and answered. You are no longer asking. You are offering.</p>

            <div className="bam-persona">

              <div className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-cyn">The Mentor</div>
                <div className="bam-p-hook">"You've been trying to get 20 minutes with them for 6 months."</div>
                <div className="bam-p-body">The investor. The executive. The person who could change your trajectory with one conversation. They don't reply to cold emails. They don't accept LinkedIn requests. But they will pick up a call that pays them by the minute.</div>
                <div className="bam-p-example">A founder sends a $8/min paid call invite to a VC they've been trying to reach. The VC accepts in 11 minutes. The call lasts 18 minutes.</div>
                <div className="bam-p-calc">
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Total cost</span><span className="bam-pc-val bam-pc-val-cyn">$144</span></div>
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Cold email reply rate</span><span className="bam-pc-val bam-pc-val-ghost">~2%</span></div>
                  <div className="bam-pc-row bam-pc-row-hi"><span className="bam-pc-lbl">Paid offer reply rate</span><span className="bam-pc-val bam-pc-val-cyn">68%</span></div>
                </div>
              </div>

              <div className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-cyn">The Expert</div>
                <div className="bam-p-hook">"You need the right answer. Not a Google result."</div>
                <div className="bam-p-body">The specialist whose time normally costs $400/hr through a firm, a clinic, or a consultancy — with a 2-week wait. On BuyAMinute you pay for exactly the minutes you need. No retainer. No minimum. No waiting room.</div>
                <div className="bam-p-example">A startup lawyer, a dermatologist, a tax strategist. Real expertise, direct access, billed by the minute at a rate you both agree on before the call starts.</div>
                <div className="bam-p-calc">
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Traditional consult</span><span className="bam-pc-val bam-pc-val-ghost">$400 · 1hr min</span></div>
                  <div className="bam-pc-row"><span className="bam-pc-lbl">BuyAMinute · 12 min</span><span className="bam-pc-val bam-pc-val-cyn">$60</span></div>
                  <div className="bam-pc-row bam-pc-row-hi"><span className="bam-pc-lbl">You saved</span><span className="bam-pc-val bam-pc-val-cyn">$340</span></div>
                </div>
              </div>

              <div className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-amb">The Famous</div>
                <div className="bam-p-hook">"You've been in their DMs for two years."</div>
                <div className="bam-p-body">The artist. The athlete. The creator you've followed since the beginning. You've commented on every post. You've sent the message that never got read. Now there's a door — and money is the key that opens it.</div>
                <div className="bam-p-example">An artist you've followed for 5 years lists at $15/min. You send a paid invite. They accept. You get 10 minutes that no amount of DMs could have bought.</div>
                <div className="bam-p-calc" style={{borderColor:"rgba(255,184,48,0.15)"}}>
                  <div className="bam-pc-row"><span className="bam-pc-lbl">DMs sent (unanswered)</span><span className="bam-pc-val bam-pc-val-ghost">47</span></div>
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Paid invite sent</span><span className="bam-pc-val bam-pc-val-amb">1</span></div>
                  <div className="bam-pc-row bam-pc-row-hi" style={{background:"rgba(255,184,48,0.04)"}}><span className="bam-pc-lbl">Response time</span><span className="bam-pc-val bam-pc-val-amb">8 minutes</span></div>
                </div>
              </div>

              <div className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-mag">Your Crush</div>
                <div className="bam-p-hook">"I'd love to get to know you — and it could be worth your while."</div>
                <div className="bam-crush-desc">
                  <p>You saw them on TikTok and their DMs are closed. You follow a creator whose content you can't stop thinking about. You met someone at the gas station — exchanged contacts — and instead of a text they might ignore, you sent a paid call invite on BuyAMinute.</p>
                  <p>Not a message request. Not a follow. An offer — one that says: I want to talk to you, and I'll make it worth your time.</p>
                  <p>They set their rate. You send the invite. The rest is up to both of you.</p>
                </div>
                <div>
                  <div className="bam-cs-item"><span className="bam-cs-icon">⟶</span><div><div className="bam-cs-title">Locked DMs</div><div className="bam-cs-desc">Their account is private. Message requests go nowhere. A paid call invite isn't a message request — it's an offer with money attached. Different inbox. Different energy. Different result.</div></div></div>
                  <div className="bam-cs-item"><span className="bam-cs-icon">⟶</span><div><div className="bam-cs-title">The Creator</div><div className="bam-cs-desc">You subscribe. You tip. But actually talking to them — voice, live, real-time — that's a different level of access entirely. BuyAMinute makes that conversation possible at a rate they set and control.</div></div></div>
                  <div className="bam-cs-item"><span className="bam-cs-icon">⟶</span><div><div className="bam-cs-title">The Real-Life Encounter</div><div className="bam-cs-desc">You meet at Walmart, a gas station, the gym. You exchange contacts. Instead of a cold text they might ghost, you send a paid call invite. The message writes itself: I'd love to get to know you — and it could be worth your while.</div></div></div>
                </div>
              </div>

              <div id="signal-vs-noise" className="bam-card" style={{display:"flex",flexDirection:"column"}}>
                <div className="bam-p-eyebrow bam-p-eyebrow-mag">Signal vs Noise</div>
                <div className="bam-p-hook">"A paid offer doesn't get ignored. It gets seen."</div>
                <div className="bam-p-body">Every seller on BuyAMinute receives hundreds of free messages. None of them get the same attention as a paid call invite. Money is the filter. It proves intent. It separates the serious from the noise — and you are the signal.</div>
                <div className="bam-beh-stat">↑ 4.7× response rate vs unpaid requests</div>
              </div>

              <div className="bam-card" style={{display:"flex",flexDirection:"column"}}>
                <div className="bam-p-eyebrow bam-p-eyebrow-mag">No More Waiting</div>
                <div className="bam-p-hook">"You control the timeline. Not them."</div>
                <div className="bam-p-body">With a paid call invite, urgency shifts to the seller. Every minute they delay is revenue they're leaving on the table. You don't follow up. You don't chase. The money does the work — and sellers respond fast because fast is profitable for them.</div>
                <div className="bam-beh-stat">Avg response time — under 22 minutes</div>
              </div>

              <div className="bam-card" style={{display:"flex",flexDirection:"column"}}>
                <div className="bam-p-eyebrow bam-p-eyebrow-mag">Exactly What You Need</div>
                <div className="bam-p-hook">"Pay for 8 minutes. Get your answer. Leave."</div>
                <div className="bam-p-body">No hour-long minimum. No retainer. No back-and-forth to book a slot two weeks from now. You send the invite, they accept, you talk. The billing starts when you're ready and stops the second you're done. Precision access to the people that matter.</div>
                <div className="bam-beh-stat">$5+ offers — 91% acceptance rate</div>
              </div>

              <div className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-cyn">The Reach</div>
                <div className="bam-p-hook">"You are not limited to who is already here. You can go get anyone."</div>
                <div className="bam-reach-desc">BuyAMinute lets you send a paid call invitation to anyone — whether they're on the platform or not. See someone on Instagram you've been too nervous to approach cold? A thought leader posting daily on LinkedIn? An expert whose comment section you've been lurking? Send them a paid invite. Money removes the awkwardness. It replaces the cold ask with a compelling offer — and compelling offers get answered.</div>
                <div>
                  <div className="bam-rt-item"><span className="bam-rt-icon">→</span><div><div className="bam-rt-title">Cold DM</div><div className="bam-rt-desc">Found someone on Instagram, X, or LinkedIn you've been meaning to reach? Skip the cold message. Send a paid call invite instead. The money signals you're serious — and serious people get replies.</div></div></div>
                  <div className="bam-rt-item"><span className="bam-rt-icon">→</span><div><div className="bam-rt-title">Comment Drop</div><div className="bam-rt-desc">See an expert posting in your field? A creator you admire? Reply publicly with a paid invite. Visible to everyone. Impossible to ignore. The offer stands out in a sea of free comments.</div></div></div>
                  <div className="bam-rt-item"><span className="bam-rt-icon">→</span><div><div className="bam-rt-title">Share the Link</div><div className="bam-rt-desc">Drop a seller's invite link in your group chat, your community, your network. Let the offer travel. Anyone who clicks and pays becomes a buyer — and the seller owes the response.</div></div></div>
                  <div className="bam-rt-item"><span className="bam-rt-icon">→</span><div><div className="bam-rt-title">Spam Their DMs</div><div className="bam-rt-desc">Not spam they can delete. Spam they get paid to answer. Send invites to everyone in their following list, their mutual connections, their comment section regulars. Every invite is an offer — and offers move people.</div></div></div>
                </div>
              </div>

            </div>

            {/* Buyer CTA */}
            <div className="bam-buyer-cta-wrap">
              <button className="bam-buyer-cta" onClick={goBrowse}>Send a Paid Call Offer →</button>
            </div>

          </div>
        </div>{/* /lane-buyer */}


        {/* ── RIGHT — SELLER ── */}
        <div className="bam-lane bam-lane-seller">

          <div className="bam-lane-label">
            <span className="bam-label-dot bam-label-dot-mag" />
            <span className="bam-label-text bam-label-mag">Someone wants to reach you</span>
          </div>

          {/* Hero zone */}
          <div className="bam-hero-zone">
            <div className="bam-headline">
              Get paid by fans, friends,<br />
              or anyone who wants<br />
              <span className="bam-hl-mag">a call with you.</span>
            </div>
            <div className="bam-copy">
              <p><strong>BuyAMinute gives you power to make money</strong> from anyone who wants a voice or video call with you.</p>
              <p>Earn by the minute, at your own set rate.
                <span className="sub">(earn by the minute, at your own set rate.)</span>
              </p>
            </div>
            <div className="bam-hero-stat bam-hero-stat-mag">
              <div className="bam-hs-item">
                <div className="bam-hs-val bam-hs-val-mag">$94k</div>
                <div className="bam-hs-lbl">Earned this week</div>
                <div className="bam-hs-sub">all categories</div>
              </div>
              <div className="bam-hs-item">
                <div className="bam-hs-val bam-hs-val-mag">2,847</div>
                <div className="bam-hs-lbl">Calls today</div>
                <div className="bam-hs-sub">today alone</div>
              </div>
            </div>
            <div className="bam-hero-ctas">
              <button className="bam-cta-primary" onClick={goSignup}>
                <span className="bam-cta-p-lbl bam-cta-p-lbl-mag">Enter to Earn</span>
                <span className="bam-cta-p-arr bam-cta-p-arr-mag">→</span>
              </button>
              <button className="bam-cta-secondary" onClick={goSignup}>
                <span className="bam-cta-s-lbl">Invite Someone to Call You</span>
                <span className="bam-cta-s-arr">↗</span>
              </button>
              <div className="bam-quick-nav">
                <button onClick={() => laneScrollTo("the-hustle", "bam-lane-seller")}>See How Sellers Earn</button>
                <span className="bam-qn-sep">·</span>
                <button onClick={() => laneScrollTo("calc-card", "bam-lane-seller")}>Calculate Your Income</button>
              </div>
            </div>
          </div>

          {/* Seller Snapshot */}
          <div className="bam-snap">
            <div className="bam-sec-tag bam-sec-tag-mag">Seller Snapshot</div>
            <h2 className="bam-sec-title">Monetisation<br />In Motion.</h2>
            <p className="bam-sec-body">Set your rate. Accept calls on your terms. Every minute you're live is revenue landing in your account — automatically, in real time.</p>

            <div className="bam-persona">

              <div id="the-hustle" className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-cyn">The Hustle</div>
                <div className="bam-p-hook">"You don't have to wait. You can go and get it."</div>
                <div className="bam-p-body">Most platforms make you passive. You post, you hope, you wait. BuyAMinute is different. As a seller you can generate your own demand — send a paid call invitation to anyone, anywhere.</div>
                <div style={{marginTop:"12px"}}>
                  <div className="bam-ht"><span className="bam-ht-icon">→</span><div><div className="bam-ht-title">DM Blast</div><div className="bam-ht-desc">Send invitations to everyone in your request queue. They wanted access — now they can pay for it.</div></div></div>
                  <div className="bam-ht"><span className="bam-ht-icon">→</span><div><div className="bam-ht-title">Comment Drop</div><div className="bam-ht-desc">Drop your invite link wherever your audience already is. One comment. Multiple offers.</div></div></div>
                  <div className="bam-ht"><span className="bam-ht-icon">→</span><div><div className="bam-ht-title">Cold Invite</div><div className="bam-ht-desc">Reach out to anyone cold. The payment offer does the convincing — it signals you're serious.</div></div></div>
                </div>
              </div>

              <div className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-mag">The Creator</div>
                <div className="bam-p-hook">"You have 47 DM requests you haven't opened."</div>
                <div className="bam-p-body">You post. People want access. Right now that access is free — or ignored. Send a paid call invitation to your DM queue. The ones who want you badly enough will pay. The rest were never serious.</div>
                <div className="bam-p-example">A TikTok model with 80k followers sets her rate at $5/min. Accepts 10 calls a week. Each call averages 12 minutes.</div>
                <div className="bam-p-calc">
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Per call</span><span className="bam-pc-val">$60</span></div>
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Per week</span><span className="bam-pc-val">$600</span></div>
                  <div className="bam-pc-row bam-pc-row-hi"><span className="bam-pc-lbl">Per month</span><span className="bam-pc-val bam-pc-val-mag">$2,400</span></div>
                </div>
              </div>

              <div className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-mag">The Expert</div>
                <div className="bam-p-hook">"Someone paid $300 for a consultant call this morning. You know more than them."</div>
                <div className="bam-p-body">Lawyer, fitness coach, designer, developer, therapist. Your knowledge has been free on the phone forever — to friends, to family, to people who never respected your time. That ends now.</div>
                <div className="bam-p-example">A fitness coach sets $10/min. Takes 5 calls a week. Clients who pay up front show up prepared and never waste time.</div>
                <div className="bam-p-calc">
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Per call</span><span className="bam-pc-val">$120</span></div>
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Per week</span><span className="bam-pc-val">$600</span></div>
                  <div className="bam-pc-row bam-pc-row-hi"><span className="bam-pc-lbl">Per month</span><span className="bam-pc-val bam-pc-val-mag">$2,400</span></div>
                </div>
              </div>

              <div className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-mag">The Connected</div>
                <div className="bam-p-hook">"Three people texted you this week asking for an intro."</div>
                <div className="bam-p-body">You're the plug. The person everyone wants 20 minutes with. The one with the number, the insight, the room. That social capital has always been invisible income. Make it visible.</div>
                <div className="bam-p-example">A well-connected exec sets $8/min. Takes 8 calls a week from people who would've emailed cold for free.</div>
                <div className="bam-p-calc">
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Per call</span><span className="bam-pc-val">$96</span></div>
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Per week</span><span className="bam-pc-val">$768</span></div>
                  <div className="bam-pc-row bam-pc-row-hi"><span className="bam-pc-lbl">Per month</span><span className="bam-pc-val bam-pc-val-mag">$3,072</span></div>
                </div>
              </div>

              <div className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-amb">The Famous</div>
                <div className="bam-p-hook">"Your fans pay for your music, your content, your merch. Why not your time?"</div>
                <div className="bam-p-body">Music artists, video vixens, athletes, public figures. You have an audience that would pay anything for a direct line to you. BuyAMinute turns that desire into a controlled, monetised experience — on your terms.</div>
                <div className="bam-p-example">A mid-tier artist sets $25/min. Posts their invite link once to Instagram stories. 40 requests come in overnight.</div>
                <div className="bam-p-calc" style={{borderColor:"rgba(255,184,48,0.15)"}}>
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Per call (20 min)</span><span className="bam-pc-val">$500</span></div>
                  <div className="bam-pc-row"><span className="bam-pc-lbl">Per week (5 calls)</span><span className="bam-pc-val">$2,500</span></div>
                  <div className="bam-pc-row bam-pc-row-hi" style={{background:"rgba(255,184,48,0.04)"}}><span className="bam-pc-lbl">Per month</span><span className="bam-pc-val bam-pc-val-amb">$10,000</span></div>
                </div>
              </div>

              <div className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-mag">Live Seller</div>
                <div className="bam-terminal">
                  <div className="bam-tc-head">
                    <span className="bam-tc-label">Live Seller</span>
                    <span className="bam-tc-live"><span className="bam-tc-live-dot" />Now</span>
                  </div>
                  <div className="bam-tc-profile">
                    <div className="bam-tc-avatar">AR</div>
                    <div>
                      <span className="bam-tc-handle">@alex_r</span>
                      <span className="bam-tc-rate">Charging <strong>$12.40 / min</strong></span>
                      <span className="bam-tc-avail">● Currently available</span>
                    </div>
                  </div>
                  <div className="bam-tc-ticker">+1 New call offer just now</div>
                  <div className="bam-tc-stats">
                    <div className="bam-tc-stat"><div className="bam-tc-sv">42</div><div className="bam-tc-sl">Call offers received</div></div>
                    <div className="bam-tc-stat"><div className="bam-tc-sv bam-tc-sv-mag">$1,289.60</div><div className="bam-tc-sl">Earned</div></div>
                    <div className="bam-tc-stat"><div className="bam-tc-sv">104</div><div className="bam-tc-sl">Minutes sold</div></div>
                  </div>
                  <div className="bam-tc-meta">
                    <div className="bam-tc-meta-row"><span className="bam-tc-ml">Time on platform</span><span className="bam-tc-mv">3 weeks</span></div>
                    <div className="bam-tc-meta-row"><span className="bam-tc-ml">Repeat buyers</span><span className="bam-tc-mv bam-tc-mv-cyn">4 buyers · called more than once</span></div>
                  </div>
                  <div className="bam-tc-feed">
                    <div className="bam-tc-feed-row"><b>$74.40</b> earned in the last 6 minutes</div>
                    <div className="bam-tc-feed-row">Last offer: 2 minutes ago</div>
                  </div>
                </div>
              </div>

              <div id="calc-card" className="bam-card">
                <div className="bam-p-eyebrow bam-p-eyebrow-mag">Calculate Your Income</div>
                <div className="bam-calc">
                  <div className="bam-ec-label">Calculate your income</div>
                  <div className="bam-ec-hint">Set your rate and calls per week. Watch the number update.</div>
                  <div className="bam-ec-sg">
                    <div className="bam-ec-top"><span className="bam-ec-lbl">Your rate</span><span className="bam-ec-val">${rate} / min</span></div>
                    <input type="range" className="bam-range" min={1} max={50} value={rate} onChange={e => setRate(+e.target.value)} />
                  </div>
                  <div className="bam-ec-sg">
                    <div className="bam-ec-top"><span className="bam-ec-lbl">Calls per week</span><span className="bam-ec-val">{calls} calls</span></div>
                    <input type="range" className="bam-range" min={1} max={30} value={calls} onChange={e => setCalls(+e.target.value)} />
                  </div>
                  <div className="bam-ec-sg">
                    <div className="bam-ec-top"><span className="bam-ec-lbl">Avg call length</span><span className="bam-ec-val">{mins} min</span></div>
                    <input type="range" className="bam-range" min={3} max={60} value={mins} onChange={e => setMins(+e.target.value)} />
                  </div>
                  <div className="bam-ec-divider" />
                  <div className="bam-ec-out-lbl">Your monthly income</div>
                  <div className="bam-ec-out-val">${monthly.toLocaleString()}</div>
                  <div className="bam-ec-out-sub">at ${rate}/min · {calls} calls · {mins} min avg</div>
                  <button className="bam-ec-cta" onClick={goSignup}>Start Earning →</button>
                </div>
              </div>

            </div>
          </div>
        </div>{/* /lane-seller */}

      </div>{/* /lanes */}


      {/* ════════════════════════════════════════════════
          EXCHANGE — full width
      ════════════════════════════════════════════════ */}
      <section className="bam-full" id="bam-exchange">
        <div className="bam-merge-line">
          <div className="bam-ml-left" />
          <div className="bam-ml-label"><span className="bam-ml-tag">The Exchange</span></div>
          <div className="bam-ml-right" />
        </div>
        <div className="bam-fs-header">
          <h2 className="bam-fs-title">One Account.<br />Two Modes.</h2>
          <p className="bam-fs-sub">Two modes. One system. A request becomes a decision. Four steps. No ambiguity. A transparent mechanism built to scale to hundreds of millions of transactions.</p>
        </div>
        <div className="bam-modes">
          <div className="bam-mode bam-mode-buyer">
            <div className="bam-mode-eyebrow bam-mode-eyebrow-cyn">When You BuyAMinute</div>
            <div className="bam-mode-subtitle">(This should feel like dialing a number)</div>
            <div className="bam-mode-bullets">
              <div className="bam-mb"><span className="bam-mb-dot bam-mb-dot-cyn" /><span>You select the icon and send a <span className="bam-hl bam-hl-c">paid call request</span> — not a message</span></div>
              <div className="bam-mb"><span className="bam-mb-dot bam-mb-dot-cyn" /><span>You see the icon's <span className="bam-hl bam-hl-c">rate</span> and <span className="bam-hl bam-hl-c">pre-authorize time</span></span></div>
              <div className="bam-mb"><span className="bam-mb-dot bam-mb-dot-cyn" /><span>If the icon is <span className="bam-hl bam-hl-c">live</span>, they receive your request and <span className="bam-hl bam-hl-c">respond</span></span></div>
              <div className="bam-mb"><span className="bam-mb-dot bam-mb-dot-cyn" /><span>If your <span className="bam-hl bam-hl-c">prepaid time</span> covers their rate, the call connects</span></div>
            </div>
            <div className="bam-mode-risk bam-cyn-risk"><span style={{fontSize:"0.7rem",flexShrink:0}}>⊙</span><span>30 seconds free preview &nbsp;·&nbsp; Drop anytime &nbsp;·&nbsp; No surprise charges</span></div>
          </div>
          <div className="bam-mode-divider" />
          <div className="bam-mode bam-mode-seller">
            <div className="bam-mode-eyebrow bam-mode-eyebrow-mag">When You Charge for Reachability</div>
            <div className="bam-mode-subtitle">(This should feel like switching into earning mode)</div>
            <div className="bam-mode-bullets">
              <div className="bam-mb"><span className="bam-mb-dot bam-mb-dot-mag" /><span>You <span className="bam-hl bam-hl-m">become the icon</span></span></div>
              <div className="bam-mb"><span className="bam-mb-dot bam-mb-dot-mag" /><span>You <span className="bam-hl bam-hl-m">set your rate</span> and turn <span className="bam-hl bam-hl-m">live</span> on</span></div>
              <div className="bam-mb"><span className="bam-mb-dot bam-mb-dot-mag" /><span>Incoming requests show the <span className="bam-hl bam-hl-m">caller</span> and <span className="bam-hl bam-hl-m">prepaid time</span></span></div>
              <div className="bam-mb"><span className="bam-mb-dot bam-mb-dot-mag" /><span>You <span className="bam-hl bam-hl-m">accept or decline</span> and get <span className="bam-hl bam-hl-m">paid per second</span></span></div>
              <div className="bam-mb"><span className="bam-mb-dot bam-mb-dot-mag" /><span>Your <span className="bam-hl bam-hl-m">rate</span> is the only limit</span></div>
            </div>
            <div className="bam-mode-risk bam-mag-risk"><span style={{fontSize:"0.7rem",flexShrink:0}}>⊙</span><span>You set the floor &nbsp;·&nbsp; You accept or decline &nbsp;·&nbsp; You are always in control</span></div>
          </div>
        </div>
        <div className="bam-flow-wrap">
          <div className="bam-flow-lbl">How a transaction works</div>
          <div className="bam-flow-steps">
            <div className="bam-fs-step"><div className="bam-fs-n">Step 01</div><div className="bam-fs-node" /><div className="bam-fs-title">Request</div><div className="bam-fs-desc">Buyer selects a seller and submits a paid call request at or above their published floor rate.</div><span className="bam-fs-tag bam-buyer-tag">Buyer</span></div>
            <div className="bam-fs-step"><div className="bam-fs-n">Step 02</div><div className="bam-fs-node" /><div className="bam-fs-title">Decision</div><div className="bam-fs-desc">Seller reviews the offer and profile. Accepts or declines. Acceptance locks the agreed rate immediately.</div><span className="bam-fs-tag bam-seller-tag">Seller</span></div>
            <div className="bam-fs-step"><div className="bam-fs-n">Step 03</div><div className="bam-fs-node" /><div className="bam-fs-title">Preview</div><div className="bam-fs-desc">30 seconds free. Both parties connect before billing begins. Drop here and pay nothing.</div><span className="bam-fs-tag bam-both-tag">Both</span></div>
            <div className="bam-fs-step"><div className="bam-fs-n">Step 04</div><div className="bam-fs-node" /><div className="bam-fs-title">Billing</div><div className="bam-fs-desc">Bills per minute in real time. Either party ends it. Billing stops instantly. Funds settle automatically.</div><span className="bam-fs-tag bam-auto-tag">Automatic</span></div>
          </div>
        </div>
        <div className="bam-exch-closing">
          You are not choosing an identity. You become the caller when you initiate — and the icon when you receive.
        </div>
      </section>


      {/* ════════════════════════════════════════════════
          SOVEREIGN RAILS — full width
      ════════════════════════════════════════════════ */}
      <section className="bam-full" id="bam-sovereign" style={{background:"linear-gradient(to bottom,#02010a,#030212)",overflow:"hidden"}}>
        <div className="bam-sov-inner">
          <div className="bam-sov-tag">Payment Infrastructure</div>
          <h2 className="bam-sov-title">No Banks.<br />No Limits.<br /><em>Sovereign Rails.</em></h2>
          <p className="bam-sov-sub">BuyAMinute runs on USDT. Deposits and payouts happen on-chain — no intermediaries, no withdrawal caps, no questions. Your rate is your rate. Your earnings are yours.</p>
        </div>
        <div className="bam-pillars">
          <div className="bam-pillar"><span className="bam-pillar-glyph">⬡</span><div className="bam-pillar-head">Crypto Deposits &amp; Payouts</div><div className="bam-pillar-body">Fund your account in <strong>USDT</strong>. Sellers receive earnings in USDT. No fiat conversion, no bank intermediary, no settlement delays. The chain settles it.</div></div>
          <div className="bam-pillar"><span className="bam-pillar-glyph">◈</span><div className="bam-pillar-head">Anonymity by Default</div><div className="bam-pillar-body">Crypto means your identity stays yours. <strong>No name, no bank statement, no transaction trail</strong> linking you to who you called or who called you. Privacy is the infrastructure.</div></div>
          <div className="bam-pillar"><span className="bam-pillar-glyph">◇</span><div className="bam-pillar-head">Set Any Rate. No Ceiling.</div><div className="bam-pillar-body">Traditional payment systems cap what you can charge and what buyers can transfer. <strong>USDT removes both limits.</strong> If your time is worth $500/min, list it. The market decides.</div></div>
        </div>
        <div className="bam-sfg">
          <div className="bam-sfg-cell"><div className="bam-fn-tag">You deposit</div><div className="bam-fn-val bam-fn-val-usdt">USDT</div><div className="bam-fn-sub">Tether stablecoin</div></div>
          <div className="bam-sfg-cell"><div className="bam-fn-tag">Converted to</div><div className="bam-fn-val bam-fn-val-tok">Tokens</div><div className="bam-fn-sub">In-platform credits</div></div>
          <div className="bam-sfg-cell"><div className="bam-fn-tag">Billed</div><div className="bam-fn-val" style={{color:"rgba(237,232,216,0.6)"}}>Per minute</div><div className="bam-fn-sub">Real-time billing</div></div>
          <div className="bam-sfg-cell"><div className="bam-fn-tag">Seller receives</div><div className="bam-fn-val bam-fn-val-usdt">USDT</div><div className="bam-fn-sub">Instant payout</div></div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bam-footer">
        <div className="bam-footer-logo">BUY<span className="a">A</span>MINUTE</div>
        <div className="bam-footer-copy">Voice &amp; Video Calls · Paid by the Minute · © 2025</div>
      </footer>

    </div>
  );
}

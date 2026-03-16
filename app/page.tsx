"use client";

import { useEffect, useRef } from "react";

const css = `
:root {
  --void:      #05040a;
  --asphalt:   #09080f;
  --deep:      #0e0d15;
  --surface:   #14121c;
  --raise:     #1a1825;
  --line:      rgba(255,255,255,0.055);
  --line2:     rgba(255,255,255,0.1);
  --cream:     #ece7d8;
  --ivory:     #b0a890;
  --mist:      #68625a;
  --ghost:     #2a2830;
  --t1:        #f0ede6;
  --t2:        #c8c4bc;
  --t3:        #8a8698;
  --mag:       #ff2d78;
  --mag-glow:  rgba(255,45,120,0.28);
  --mag-soft:  rgba(255,45,120,0.07);
  --cyn:       #00e5ff;
  --cyn-glow:  rgba(0,229,255,0.22);
  --cyn-soft:  rgba(0,229,255,0.055);
  --amb:       #ffb830;
  --amb-glow:  rgba(255,184,48,0.22);
  --usdt:      #26a17b;
  --usdt-glow: rgba(38,161,123,0.3);
}

.bam-root *, .bam-root *::before, .bam-root *::after { box-sizing:border-box; margin:0; padding:0; }

.bam-root {
  background: var(--void);
  color: var(--cream);
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 300;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  cursor: none;
  min-height: 100vh;
  position: relative;
}

.bam-root::after {
  content: '';
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.046'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 9000;
}

#bam-cur {
  position: fixed; width: 6px; height: 6px;
  background: var(--mag); border-radius: 50%;
  pointer-events: none; z-index: 9999;
  transform: translate(-50%,-50%);
  box-shadow: 0 0 10px var(--mag), 0 0 24px var(--mag-glow);
  transition: width .3s cubic-bezier(.16,1,.3,1), height .3s cubic-bezier(.16,1,.3,1), background .2s;
}
.bam-root:has(a:hover) #bam-cur,
.bam-root:has(button:hover) #bam-cur {
  width: 44px; height: 44px; background: transparent;
  border: 1px solid var(--mag); box-shadow: 0 0 20px var(--mag-glow);
}

#bam-rain { position:fixed; inset:0; pointer-events:none; z-index:1; opacity:0.3; }

.bam-refs { position:fixed; inset:0; pointer-events:none; z-index:0; overflow:hidden; }
.bam-ref { position:absolute; border-radius:50%; filter:blur(130px); animation:bamRefp 9s ease-in-out infinite; }
.bam-r1 { width:520px; height:180px; background:var(--mag-soft); bottom:-50px; left:8%; animation-delay:0s; }
.bam-r2 { width:400px; height:150px; background:var(--cyn-soft); bottom:-30px; right:12%; animation-delay:3s; }
.bam-r3 { width:280px; height:110px; background:rgba(255,184,48,0.05); bottom:-10px; left:48%; animation-delay:6s; }
@keyframes bamRefp { 0%,100%{opacity:1;transform:scaleX(1)} 50%{opacity:.55;transform:scaleX(1.18)} }

.bam-nav {
  position:fixed; top:0; left:0; right:0; z-index:300;
  height:56px;
  display:flex; align-items:center; justify-content:space-between;
  padding:0 48px;
  background:rgba(5,4,10,0.88);
  backdrop-filter:blur(24px) saturate(180%);
  border-bottom:1px solid var(--line);
}
.bam-nav-logo {
  font-family:'Josefin Sans',sans-serif;
  font-size:1.05rem; font-weight:700;
  letter-spacing:0.22em; text-transform:uppercase;
  color:var(--cream);
}
.bam-nav-logo .na { color:var(--mag); text-shadow:0 0 14px var(--mag), 0 0 30px var(--mag-glow); }
.bam-nav-right { display:flex; align-items:center; gap:32px; }
.bam-nav-tag {
  font-size:0.56rem; font-weight:300;
  letter-spacing:0.22em; text-transform:uppercase;
  color:#5a5870;
}
.bam-nav-enter {
  font-size:0.6rem; font-weight:700;
  letter-spacing:0.22em; text-transform:uppercase;
  color:var(--void); background:var(--mag);
  box-shadow:0 0 24px var(--mag-glow);
  padding:9px 24px; text-decoration:none; cursor:none;
  transition:box-shadow .2s, background .2s;
}
.bam-nav-enter:hover { background:var(--cream); box-shadow:0 0 32px rgba(236,231,216,0.2); }

.bam-page { display:flex; flex-direction:column; height:calc(100dvh - 56px); margin-top:56px; position:relative; z-index:2; overflow:hidden; }

#bam-hero {
  flex:1; min-height:0;
  display:grid;
  grid-template-columns:58% 1px 42%;
  border-bottom:1px solid var(--line);
  position:relative; z-index:2;
}
.bam-h-left {
  padding:8px 40px 22px 48px;
  display:flex; flex-direction:column; justify-content:center;
}
.bam-hlabel { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
.bam-lbar { width:2px; height:36px; flex-shrink:0; background:linear-gradient(to bottom, var(--mag), var(--cyn)); }
.bam-llines { display:flex; flex-direction:column; gap:3px; }
.bam-ltop { font-size:0.5rem; font-weight:700; letter-spacing:0.3em; text-transform:uppercase; color:var(--mag); text-shadow:0 0 8px var(--mag-glow); }
.bam-lbtm { font-size:0.42rem; font-weight:300; letter-spacing:0.22em; text-transform:uppercase; color:#5a5870; }

.bam-jl { font-size:0.44rem; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; color:var(--t2); text-decoration:none; padding-right:16px; transition:color .2s; cursor:none; }
.bam-jl:hover { color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); }
.bam-jdiv { width:1px; height:9px; background:var(--line); margin-right:16px; }
.bam-x { text-decoration:line-through; text-decoration-color:var(--mag); text-decoration-thickness:1.5px; }
.bam-copy {
  font-size:clamp(0.6rem,0.78vw,0.72rem);
  font-weight:300; letter-spacing:0.13em; text-transform:uppercase;
  color:var(--t2); line-height:1.68;
}
.bam-cp { display:block; margin-bottom:0.85em; }
.bam-cp:last-child { margin-bottom:0; }
.bam-cp .h { font-weight:700; color:var(--t1); }
.bam-cp .s { font-weight:700; color:var(--t1); }
.bam-cp .q { display:block; color:#8a8698; font-size:0.9em; }
.bam-finale {
  font-size:clamp(0.86rem,1.15vw,1.02rem);
  font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
  color:var(--mag); text-shadow:0 0 20px var(--mag-glow);
  line-height:1.1; margin-top:18px;
}
.bam-hjnav {
  display:flex; align-items:center; flex-wrap:wrap;
  margin-top:14px; padding-top:12px; border-top:1px solid var(--line);
  padding-bottom:12px; border-bottom:1px solid var(--line);
}
.bam-vdiv { background:linear-gradient(to bottom, transparent, var(--line) 20%, var(--line) 80%, transparent); }
.bam-h-right {
  display:flex; flex-direction:column; justify-content:center;
  background:transparent;
  padding:22px 36px 18px 40px;
  gap:0; position:relative;
}
.bam-h-right::before {
  content:''; position:absolute; inset:0;
  background:radial-gradient(ellipse 80% 70% at 60% 50%, rgba(0,229,255,0.03) 0%, transparent 70%);
  pointer-events:none;
}
.bam-r-label {
  font-size:0.42rem; font-weight:700; letter-spacing:0.3em; text-transform:uppercase;
  color:var(--t3); margin-bottom:14px;
  display:flex; align-items:center; gap:8px;
}
.bam-r-label::before { content:''; width:5px; height:5px; border-radius:50%; background:var(--cyn); box-shadow:0 0 6px var(--cyn-glow); animation:bamPulse 2s ease-in-out infinite; flex-shrink:0; }
@keyframes bamPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(0.7)} }
.bam-stat { padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.04); display:flex; flex-direction:column; gap:4px; }
.bam-stat:first-of-type { border-top:1px solid rgba(255,255,255,0.04); }
.bam-stat-lbl { font-size:0.4rem; font-weight:700; letter-spacing:0.26em; text-transform:uppercase; color:var(--t3); }
.bam-stat-val { font-size:1.4rem; font-weight:700; letter-spacing:0.02em; color:var(--mag); text-shadow:0 0 30px var(--mag-glow),0 0 60px rgba(255,45,120,0.08); line-height:1; }
.bam-stat-val.cyn { color:var(--cyn); text-shadow:0 0 30px var(--cyn-glow),0 0 60px rgba(0,229,255,0.08); }
.bam-stat-val.wht { color:var(--t2); text-shadow:none; }
.bam-stat-sub { font-size:0.38rem; font-weight:300; letter-spacing:0.16em; text-transform:uppercase; color:var(--t3); }
.bam-stat-sub .pos { color:var(--cyn); }
.bam-stat-sub .neg { color:var(--mag); }

.bam-cstrip { flex-shrink:0; display:grid; grid-template-columns:1fr 1fr; border-top:1px solid var(--line); }
.bam-cpane { padding:14px 48px; border-right:1px solid var(--line); }
.bam-cpane:last-child { border-right:none; background:transparent; }
.bam-cey { font-size:0.42rem; font-weight:700; letter-spacing:0.28em; text-transform:uppercase; color:var(--t2); margin-bottom:10px; }
.bam-cbtn { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-top:1px solid var(--line); text-decoration:none; position:relative; overflow:hidden; cursor:none; }
.bam-cbtn:last-of-type { border-bottom:1px solid var(--line); }
.bam-cbtn::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,var(--mag),rgba(255,45,120,0.5)); transform:scaleX(0); transform-origin:left; transition:transform .4s cubic-bezier(.16,1,.3,1); z-index:0; }
.bam-cbtn:hover::before { transform:scaleX(1); }
.bam-clbl { font-size:0.64rem; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:var(--t2); transition:color .15s; position:relative; z-index:1; }
.bam-clbl.hi { color:var(--mag); text-shadow:0 0 14px var(--mag-glow); }
.bam-cbtn:hover .bam-clbl { color:var(--void); text-shadow:none; }
.bam-carr { color:var(--t3); font-size:0.8rem; transition:transform .25s,color .15s; position:relative; z-index:1; }
.bam-cbtn:hover .bam-carr { transform:translateX(5px); color:var(--void); }

.bam-sec {
  padding:92px 48px; border-bottom:1px solid var(--line);
  position:relative; overflow:hidden; z-index:2;
}
.bam-sec:nth-of-type(even) { background:var(--deep); }
.bam-sec-ghost {
  position:absolute; right:28px; bottom:-14px;
  font-size:clamp(160px,20vw,280px);
  font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
  color:transparent;
  -webkit-text-stroke:1px rgba(255,255,255,0.028);
  line-height:1; pointer-events:none; user-select:none;
}
.bam-sec-head {
  display:grid; grid-template-columns:1fr 340px;
  gap:52px; align-items:end;
  margin-bottom:60px; padding-bottom:36px;
  border-bottom:1px solid var(--line);
}
.bam-sec-tag {
  font-size:0.56rem; font-weight:700;
  letter-spacing:0.32em; text-transform:uppercase;
  color:var(--cyn); text-shadow:0 0 10px var(--cyn-glow);
  margin-bottom:14px;
}
.bam-sec-title {
  font-size:clamp(1.9rem,3.8vw,3.8rem);
  font-weight:700; line-height:1.05;
  letter-spacing:0.06em; text-transform:uppercase;
  color:var(--cream);
}
.bam-sec-body {
  font-size:0.78rem; font-weight:300;
  line-height:1.9; letter-spacing:0.1em; text-transform:uppercase;
  color:#c8c4bc;
}
.bam-back-top {
  display:block; margin-top:60px; padding-top:26px;
  border-top:1px solid var(--line);
  font-size:0.52rem; font-weight:600;
  letter-spacing:0.26em; text-transform:uppercase;
  color:#5a5870; text-decoration:none; cursor:none;
  transition:color .2s, text-shadow .2s;
}
.bam-back-top:hover { color:var(--mag); text-shadow:0 0 10px var(--mag-glow); }

.bam-metrics { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid var(--line); }
.bam-met {
  padding:34px 28px 30px; border-right:1px solid var(--line);
  position:relative; overflow:hidden; transition:background .3s;
}
.bam-met:last-child { border-right:none; }
.bam-met:hover { background:var(--surface); }
.bam-met::after {
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,var(--mag),var(--cyn));
  box-shadow:0 0 8px var(--mag-glow);
  transform:scaleX(0); transform-origin:left; transition:transform .5s;
}
.bam-met:hover::after { transform:scaleX(1); }
.bam-m-lbl { font-size:0.5rem; font-weight:700; letter-spacing:0.26em; text-transform:uppercase; color:var(--mist); margin-bottom:14px; }
.bam-m-val { font-size:clamp(1.9rem,3vw,3rem); font-weight:700; letter-spacing:0.04em; color:var(--cream); margin-bottom:8px; line-height:1; }
.bam-m-val .u { font-size:0.36em; font-weight:300; color:var(--mist); letter-spacing:0.1em; }
.bam-m-sub { font-size:0.62rem; font-weight:300; letter-spacing:0.1em; text-transform:uppercase; color:var(--mist); line-height:1.6; }

.bam-chart {
  margin-top:-1px; border:1px solid var(--line); border-top:none;
  background:var(--void); padding:20px 26px 18px;
  display:flex; align-items:flex-end; gap:3px; height:88px;
}
.bam-cc { flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; height:100%; justify-content:flex-end; }
.bam-cb {
  width:100%;
  background:linear-gradient(to top,rgba(255,45,120,0.18),rgba(0,229,255,0.08));
  border-top:1px solid; border-image:linear-gradient(90deg,var(--mag),var(--cyn)) 1;
  box-shadow:0 -2px 8px rgba(255,45,120,0.12);
  transform:scaleY(0); transform-origin:bottom;
  animation:bamCRise 1.2s cubic-bezier(.16,1,.3,1) forwards;
}
.bam-cc:nth-child(1) .bam-cb{animation-delay:.04s} .bam-cc:nth-child(2) .bam-cb{animation-delay:.08s}
.bam-cc:nth-child(3) .bam-cb{animation-delay:.12s} .bam-cc:nth-child(4) .bam-cb{animation-delay:.16s}
.bam-cc:nth-child(5) .bam-cb{animation-delay:.20s} .bam-cc:nth-child(6) .bam-cb{animation-delay:.24s}
.bam-cc:nth-child(7) .bam-cb{animation-delay:.28s} .bam-cc:nth-child(8) .bam-cb{animation-delay:.32s}
.bam-cc:nth-child(9) .bam-cb{animation-delay:.36s} .bam-cc:nth-child(10) .bam-cb{animation-delay:.40s}
.bam-cc:nth-child(11) .bam-cb{animation-delay:.44s} .bam-cc:nth-child(12) .bam-cb{animation-delay:.48s}
@keyframes bamCRise { to{transform:scaleY(1)} }
.bam-cd { font-size:.44rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--ghost); }

.bam-pg { display:grid; gap:1px; background:var(--line); border:1px solid var(--line); }
.bam-pg-3 { grid-template-columns:repeat(3,1fr); }
.bam-pg-2 { grid-template-columns:repeat(2,1fr); }
.bam-pg-1 { grid-template-columns:1fr; }

.bam-persona {
  background:var(--void);
  padding:40px 32px 36px;
  display:flex; flex-direction:column; gap:18px;
  position:relative; overflow:hidden;
  transition:background .3s;
}
.bam-persona:hover { background:var(--surface); }
.bam-persona::before {
  content:'';
  position:absolute; top:0; left:0; right:0; height:2px;
  background:linear-gradient(90deg, var(--mag), transparent);
  box-shadow:0 0 10px var(--mag-glow);
  transform:scaleX(0); transform-origin:left; transition:transform .5s;
}
.bam-persona:hover::before { transform:scaleX(1); }
.bam-persona.hustle::before { background:linear-gradient(90deg, var(--cyn), transparent); }
.bam-persona.famous::before { background:linear-gradient(90deg, var(--amb), transparent); }
.bam-persona.crush::before { background:linear-gradient(90deg, var(--mag), transparent); }
.bam-persona.reach::before { background:linear-gradient(90deg, var(--cyn), transparent); }

.bam-persona-eyebrow { font-size:0.52rem; font-weight:700; letter-spacing:0.3em; text-transform:uppercase; color:var(--mag); text-shadow:0 0 8px var(--mag-glow); }
.bam-persona-hook { font-size:0.88rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--cream); line-height:1.5; }
.bam-persona-body { font-size:0.68rem; font-weight:300; letter-spacing:0.1em; text-transform:uppercase; color:#c8c4bc; line-height:1.9; flex:1; }
.bam-persona-example { font-size:0.65rem; font-weight:400; letter-spacing:0.08em; text-transform:uppercase; color:#c8c4bc; line-height:1.75; font-style:italic; padding-top:16px; border-top:1px solid var(--line); }

.bam-persona-calc { display:flex; flex-direction:column; gap:0; border:1px solid var(--line); }
.bam-pc-row { display:flex; align-items:center; justify-content:space-between; padding:9px 14px; border-bottom:1px solid var(--line); }
.bam-pc-row:last-child { border-bottom:none; }
.bam-pc-row.hi { background:rgba(255,45,120,0.04); }
.bam-pc-lbl { font-size:0.5rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#c8c4bc; }
.bam-pc-val { font-size:0.78rem; font-weight:700; letter-spacing:0.08em; color:var(--cream); }
.bam-pc-val.mag { color:var(--mag); text-shadow:0 0 12px var(--mag-glow); }

.bam-hustle-tactics { display:flex; flex-direction:column; gap:0; border:1px solid rgba(0,229,255,0.12); margin-top:auto; }
.bam-ht { display:flex; align-items:flex-start; gap:16px; padding:14px 16px; border-bottom:1px solid rgba(0,229,255,0.08); }
.bam-ht:last-child { border-bottom:none; }
.bam-ht-icon { font-size:0.7rem; font-weight:700; color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); flex-shrink:0; margin-top:1px; }
.bam-ht-title { font-size:0.6rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cream); margin-bottom:5px; }
.bam-ht-desc { font-size:0.62rem; font-weight:300; letter-spacing:0.08em; text-transform:uppercase; color:#c8c4bc; line-height:1.7; }

.bam-p-calc { padding:0 !important; }
.bam-ec-card { display:grid; grid-template-columns:1fr auto 1fr; height:100%; min-height:240px; }
.bam-ec-card-left { padding:44px 48px; display:flex; flex-direction:column; gap:0; }
.bam-ec-card-label { font-size:0.56rem; font-weight:700; letter-spacing:0.3em; text-transform:uppercase; color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); margin-bottom:8px; }
.bam-ec-card-hint { font-size:0.62rem; font-weight:300; letter-spacing:0.12em; text-transform:uppercase; color:var(--mist); margin-bottom:36px; }
.bam-ec-card-divider { width:1px; background:var(--line); margin:0; }
.bam-ec-card-right { padding:44px 56px; display:flex; flex-direction:column; justify-content:center; align-items:flex-start; gap:10px; background:var(--deep); }
.bam-ec-sliders { display:flex; flex-direction:column; gap:28px; }
.bam-ec-slider-group { display:flex; flex-direction:column; gap:10px; }
.bam-ec-slider-top { display:flex; align-items:center; justify-content:space-between; }
.bam-ec-sl-lbl { font-size:0.52rem; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:var(--mist); }
.bam-ec-sl-val { font-size:0.7rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--cream); }
.bam-ec-range { -webkit-appearance:none; appearance:none; width:100%; height:2px; background:var(--ghost); outline:none; cursor:pointer; }
.bam-ec-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:14px; height:14px; border-radius:50%; background:var(--mag); box-shadow:0 0 10px var(--mag), 0 0 20px var(--mag-glow); cursor:pointer; transition:box-shadow .2s; }
.bam-ec-range::-webkit-slider-thumb:hover { box-shadow:0 0 16px var(--mag), 0 0 32px var(--mag-glow); }
.bam-ec-range::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:var(--mag); border:none; box-shadow:0 0 10px var(--mag), 0 0 20px var(--mag-glow); cursor:pointer; }
.bam-ec-out-label { font-size:0.52rem; font-weight:700; letter-spacing:0.28em; text-transform:uppercase; color:var(--mist); }
.bam-ec-out-val { font-size:clamp(2.4rem,4vw,3.8rem); font-weight:700; letter-spacing:0.04em; color:var(--mag); line-height:1; text-shadow:0 0 30px var(--mag-glow); transition:color .15s; }
.bam-ec-out-sub { font-size:0.52rem; font-weight:300; letter-spacing:0.14em; text-transform:uppercase; color:var(--mist); }
.bam-ec-cta { margin-top:20px; display:inline-block; font-size:0.6rem; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:var(--void); background:var(--mag); box-shadow:0 0 20px var(--mag-glow); padding:12px 28px; text-decoration:none; cursor:none; transition:background .2s, box-shadow .2s; }
.bam-ec-cta:hover { background:var(--cream); box-shadow:0 0 28px rgba(236,231,216,0.2); }

.bam-p-terminal { padding:0 !important; overflow:hidden; display:flex; flex-direction:column; background:var(--void); }
.bam-seller-terminal { background:var(--deep); display:flex; flex-direction:column; position:relative; overflow:hidden; }
.bam-seller-terminal::after { content:''; position:absolute; inset:0; background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,45,120,0.008) 3px,rgba(255,45,120,0.008) 4px); pointer-events:none; z-index:0; }
.bam-st-head { padding:14px 20px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; position:relative; z-index:1; background:var(--void); }
.bam-st-label { font-size:0.52rem; font-weight:700; letter-spacing:0.28em; text-transform:uppercase; color:var(--mist); }
.bam-st-live { display:flex; align-items:center; gap:6px; font-size:0.5rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:var(--mag); text-shadow:0 0 8px var(--mag-glow); }
.bam-st-live-dot { width:5px; height:5px; border-radius:50%; background:var(--mag); box-shadow:0 0 8px var(--mag), 0 0 16px var(--mag-glow); animation:bamBlink 2s ease-in-out infinite; }
@keyframes bamBlink { 0%,100%{opacity:1} 50%{opacity:.2} }
.bam-st-profile { padding:18px 20px 16px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:14px; flex-shrink:0; position:relative; z-index:1; background:var(--void); }
.bam-st-avatar { width:40px; height:40px; border-radius:50%; background:var(--raise); border:1px solid var(--line2); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.62rem; font-weight:700; letter-spacing:0.06em; color:var(--mist); }
.bam-st-profile-info { display:flex; flex-direction:column; gap:4px; }
.bam-st-handle { font-size:0.78rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--cream); }
.bam-st-rate-line { font-size:0.6rem; font-weight:300; letter-spacing:0.1em; text-transform:uppercase; color:var(--mist); }
.bam-st-rate-line b { color:var(--mag); font-weight:700; text-shadow:0 0 8px var(--mag-glow); }
.bam-st-avail { font-size:0.48rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); }
.bam-st-ticker { padding:10px 20px; border-bottom:1px solid var(--line); font-size:0.56rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:var(--cream); position:relative; z-index:1; display:flex; align-items:center; gap:8px; background:var(--void); }
.bam-st-ticker-dot { width:6px; height:6px; border-radius:50%; background:var(--mag); box-shadow:0 0 6px var(--mag); animation:bamBlink 1.2s ease-in-out infinite; flex-shrink:0; }
.bam-st-stats { display:grid; grid-template-columns:repeat(3,1fr); border-bottom:1px solid var(--line); flex-shrink:0; position:relative; z-index:1; background:var(--void); }
.bam-st-stat { padding:20px 16px 18px; border-right:1px solid var(--line); text-align:center; }
.bam-st-stat:last-child { border-right:none; }
.bam-st-stat-val { font-size:1.55rem; font-weight:700; letter-spacing:0.02em; color:var(--cream); line-height:1; margin-bottom:7px; }
.bam-st-stat-val.mag { color:var(--mag); text-shadow:0 0 12px var(--mag-glow); }
.bam-st-stat-lbl { font-size:0.46rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--mist); line-height:1.5; }
.bam-st-meta { border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:var(--void); }
.bam-st-meta-row { display:flex; align-items:center; justify-content:space-between; padding:11px 20px; border-bottom:1px solid var(--line); }
.bam-st-meta-row:last-child { border-bottom:none; }
.bam-st-meta-lbl { font-size:0.5rem; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:var(--mist); }
.bam-st-meta-val { font-size:0.6rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--cream); }
.bam-st-meta-val.cyn { color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); }
.bam-st-feed { flex:1; position:relative; z-index:1; background:var(--void); }
.bam-st-row { padding:12px 20px; border-bottom:1px solid var(--line); font-size:0.62rem; font-weight:300; letter-spacing:0.1em; text-transform:uppercase; color:var(--ivory); line-height:1.5; }
.bam-st-row b { font-weight:700; color:var(--mag); text-shadow:0 0 6px var(--mag-glow); }

.bam-hr-right {
  background:var(--deep);
  display:flex; flex-direction:column;
  border-left:1px solid var(--line);
  position:relative; z-index:2;
}
.bam-hr-head { padding:20px 22px 16px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
.bam-hr-lbl { font-size:0.6rem; font-weight:700; letter-spacing:0.28em; text-transform:uppercase; color:var(--ivory); }
.bam-hr-live { display:flex; align-items:center; gap:7px; font-size:0.5rem; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:var(--mag); text-shadow:0 0 8px var(--mag-glow); }
.bam-live-dot { width:5px; height:5px; border-radius:50%; background:var(--mag); box-shadow:0 0 8px var(--mag), 0 0 16px var(--mag-glow); animation:bamBlink 2s ease-in-out infinite; }
.bam-feed-outer { flex:1; overflow:hidden; position:relative; min-height:0; }
.bam-feed-outer::before,.bam-feed-outer::after { content:''; position:absolute; left:0; right:0; z-index:2; pointer-events:none; }
.bam-feed-outer::before { top:0; height:52px; background:linear-gradient(var(--deep),transparent); }
.bam-feed-outer::after { bottom:0; height:52px; background:linear-gradient(transparent,var(--deep)); }
.bam-feed { display:flex; flex-direction:column; animation:bamScrollUp 28s linear infinite; }
@keyframes bamScrollUp { from{transform:translateY(0)} to{transform:translateY(-50%)} }
.bam-feed-item { padding:14px 22px; border-bottom:1px solid var(--line); transition:background .2s; position:relative; }
.bam-feed-item::before { content:''; position:absolute; left:0; top:0; bottom:0; width:2px; background:transparent; transition:background .2s, box-shadow .2s; }
.bam-feed-item:hover { background:var(--surface); }
.bam-feed-item:hover::before { background:var(--mag); box-shadow:0 0 8px var(--mag-glow); }
.bam-fi-r1 { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
.bam-fi-name { font-size:0.72rem; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:var(--cream); }
.bam-fi-rate { font-size:0.78rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--mag); text-shadow:0 0 10px var(--mag-glow); }
.bam-fi-r2 { display:flex; align-items:center; gap:9px; }
.bam-fi-action { font-size:0.58rem; font-weight:300; letter-spacing:0.14em; text-transform:uppercase; color:var(--mist); }
.bam-badge { font-size:0.46rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; padding:2px 7px; }
.bam-badge.v { background:var(--mag-soft); color:var(--mag); border:1px solid rgba(255,45,120,0.14); }
.bam-badge.vd { background:var(--cyn-soft); color:var(--cyn); border:1px solid rgba(0,229,255,0.1); }
.bam-hr-foot { padding:18px 22px 22px; border-top:1px solid var(--line); flex-shrink:0; background:linear-gradient(var(--deep),var(--asphalt)); }
.bam-hr-foot-lbl { font-size:0.5rem; font-weight:300; letter-spacing:0.24em; text-transform:uppercase; color:var(--mist); margin-bottom:6px; }
.bam-hr-foot-val { font-size:2.1rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--cream); line-height:1; }
.bam-hr-foot-val .dollar { color:var(--amb); text-shadow:0 0 16px var(--amb-glow); }

.bam-beh-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--line); border:1px solid var(--line); }
.bam-beh { background:var(--deep); padding:36px 28px 32px; position:relative; overflow:hidden; transition:background .3s; }
.bam-beh::before { content:''; position:absolute; top:0; left:0; bottom:0; width:2px; background:linear-gradient(to bottom,var(--mag),var(--cyn)); transform:scaleY(0); transform-origin:top; transition:transform .5s; }
.bam-beh:hover { background:var(--surface); }
.bam-beh:hover::before { transform:scaleY(1); }
.bam-beh-n { font-size:0.56rem; font-weight:700; letter-spacing:0.3em; text-transform:uppercase; color:var(--mag); text-shadow:0 0 8px var(--mag-glow); margin-bottom:18px; }
.bam-beh-title { font-size:0.82rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--cream); margin-bottom:12px; line-height:1.4; }
.bam-beh-desc { font-size:0.7rem; font-weight:300; letter-spacing:0.1em; text-transform:uppercase; color:#c8c4bc; line-height:1.85; }
.bam-beh-stat { margin-top:22px; padding-top:16px; border-top:1px solid var(--line); font-size:0.54rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); }

.bam-crush-body { display:grid; grid-template-columns:1fr 1fr; gap:48px; margin-top:4px; }
.bam-crush-desc { display:flex; flex-direction:column; gap:16px; }
.bam-crush-desc p { font-size:0.72rem; font-weight:300; letter-spacing:0.1em; text-transform:uppercase; color:#c8c4bc; line-height:1.95; }
.bam-crush-desc p:first-child { color:var(--ivory); }
.bam-crush-scenarios { display:flex; flex-direction:column; gap:1px; background:rgba(255,45,120,0.08); border:1px solid rgba(255,45,120,0.1); }
.bam-cs { background:var(--void); padding:20px 22px; display:flex; align-items:flex-start; gap:14px; transition:background .25s; }
.bam-cs:hover { background:var(--surface); }
.bam-cs-icon { font-size:0.8rem; color:var(--mag); text-shadow:0 0 8px var(--mag-glow); flex-shrink:0; margin-top:2px; }
.bam-cs-title { font-size:0.6rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#f0ede6; margin-bottom:7px; }
.bam-cs-desc { font-size:0.62rem; font-weight:300; letter-spacing:0.08em; text-transform:uppercase; color:#c8c4bc; line-height:1.75; }

.bam-reach-body { display:grid; grid-template-columns:1fr 1fr; gap:48px; margin-top:4px; }
.bam-reach-desc { font-size:0.72rem; font-weight:300; letter-spacing:0.1em; text-transform:uppercase; color:#c8c4bc; line-height:1.95; align-self:start; }
.bam-reach-tactics { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:rgba(0,229,255,0.08); border:1px solid rgba(0,229,255,0.1); }
.bam-rt { background:var(--void); padding:20px 20px 22px; transition:background .25s; }
.bam-rt:hover { background:var(--surface); }
.bam-rt-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.bam-rt-icon { font-size:0.7rem; font-weight:700; flex-shrink:0; }
.bam-rt-icon.cyn { color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); }
.bam-rt-title { font-size:0.6rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#f0ede6; }
.bam-rt-desc { font-size:0.62rem; font-weight:300; letter-spacing:0.08em; text-transform:uppercase; color:#c8c4bc; line-height:1.75; }

.bam-exch-header { margin-bottom:0; padding-bottom:40px; border-bottom:1px solid var(--line); }
.bam-exch-tag { font-size:0.56rem; font-weight:700; letter-spacing:0.32em; text-transform:uppercase; color:var(--cyn); text-shadow:0 0 10px var(--cyn-glow); margin-bottom:16px; }
.bam-exch-title { font-size:clamp(2.2rem,4.5vw,4.8rem); font-weight:700; line-height:1.0; letter-spacing:0.06em; text-transform:uppercase; color:var(--cream); margin-bottom:24px; }
.bam-exch-sub { font-size:0.72rem; font-weight:300; letter-spacing:0.12em; text-transform:uppercase; color:#c8c4bc; line-height:1.9; max-width:680px; }
.bam-exch-modes { display:grid; grid-template-columns:1fr 1px 1fr; border:1px solid var(--line); border-top:none; }
.bam-exch-divider { background:var(--line); }
.bam-exch-card { padding:40px 40px 0; display:flex; flex-direction:column; }
.bam-exch-card-top { margin-bottom:24px; }
.bam-exch-card-eyebrow { font-size:0.56rem; font-weight:700; letter-spacing:0.28em; text-transform:uppercase; margin-bottom:8px; }
.bam-exch-card-eyebrow.cyn { color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); }
.bam-exch-card-eyebrow.mag { color:var(--mag); text-shadow:0 0 8px var(--mag-glow); }
.bam-exch-card-subtitle { font-size:0.6rem; font-weight:300; letter-spacing:0.1em; text-transform:uppercase; color:#5a5870; font-style:italic; }
.bam-exch-bullets { display:flex; flex-direction:column; gap:0; flex:1; }
.bam-eb { display:flex; align-items:flex-start; gap:14px; padding:13px 0; border-bottom:1px solid var(--line); font-size:0.64rem; font-weight:300; letter-spacing:0.08em; text-transform:uppercase; color:#c8c4bc; line-height:1.7; }
.bam-eb:last-child { border-bottom:none; }
.bam-eb-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; margin-top:7px; }
.bam-eb-dot.cyn { background:var(--cyn); box-shadow:0 0 6px var(--cyn-glow); }
.bam-eb-dot.mag { background:var(--mag); box-shadow:0 0 6px var(--mag-glow); }
.bam-mode-hl { font-weight:700; }
.bam-mode-hl.cyn { color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); }
.bam-mode-hl.mag { color:var(--mag); text-shadow:0 0 8px var(--mag-glow); }
.bam-exch-risk { margin-top:0; padding:14px 0; display:flex; align-items:center; gap:10px; font-size:0.52rem; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; border-top:1px solid var(--line); margin-bottom:0; padding-bottom:28px; }
.bam-cyn-risk { color:var(--cyn); text-shadow:0 0 8px var(--cyn-glow); }
.bam-mag-risk { color:var(--mag); text-shadow:0 0 8px var(--mag-glow); }
.bam-risk-icon { font-size:0.7rem; flex-shrink:0; }
.bam-exch-flow-wrap { margin-top:0; border:1px solid var(--line); border-top:none; background:var(--asphalt); }
.bam-exch-flow-label { padding:16px 24px; font-size:0.48rem; font-weight:700; letter-spacing:0.3em; text-transform:uppercase; color:#5a5870; border-bottom:1px solid var(--line); }
.bam-flow { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--line); position:relative; }
.bam-flow::before { content:''; position:absolute; top:56px; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent 2%,var(--mag) 15%,var(--cyn) 85%,transparent 98%); opacity:.14; z-index:0; pointer-events:none; }
.bam-exch-flow-wrap .bam-flow { border:none; border-top:none; }
.bam-fs { padding:44px 26px 38px; border-right:1px solid var(--line); position:relative; z-index:1; transition:background .25s; }
.bam-fs:last-child { border-right:none; }
.bam-fs:hover { background:var(--surface); }
.bam-fs-n { font-size:0.5rem; font-weight:700; letter-spacing:0.26em; text-transform:uppercase; color:#5a5870; margin-bottom:24px; }
.bam-fs-node { width:9px; height:9px; border-radius:50%; border:1px solid var(--mag); background:transparent; margin-bottom:22px; transition:background .2s, box-shadow .2s; }
.bam-fs:hover .bam-fs-node { background:var(--mag); box-shadow:0 0 12px var(--mag),0 0 24px var(--mag-glow); }
.bam-fs-title { font-size:0.88rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--cream); margin-bottom:11px; }
.bam-fs-desc { font-size:0.68rem; font-weight:300; letter-spacing:0.1em; text-transform:uppercase; color:#c8c4bc; line-height:1.85; }
.bam-fs-tag { margin-top:20px; display:inline-block; font-size:0.48rem; font-weight:700; letter-spacing:0.24em; text-transform:uppercase; color:var(--cyn); border:1px solid rgba(0,229,255,0.16); padding:4px 10px; }
.bam-exch-closing { margin-top:40px; padding:28px 0 0; font-size:0.68rem; font-weight:300; letter-spacing:0.22em; text-transform:uppercase; color:#5a5870; line-height:1.8; font-style:italic; border-top:1px solid var(--line); }

#bam-sovereign::before { content:'SOVEREIGN'; position:absolute; top:40px; left:48px; font-size:clamp(5rem,14vw,12rem); font-weight:700; letter-spacing:-0.04em; text-transform:uppercase; color:rgba(255,255,255,0.018); pointer-events:none; user-select:none; line-height:1; }
.bam-sov-tag { font-size:0.46rem; font-weight:700; letter-spacing:0.32em; text-transform:uppercase; color:var(--usdt); text-shadow:0 0 12px var(--usdt-glow); margin-bottom:20px; }
.bam-sov-title { font-size:clamp(1.6rem,3.5vw,2.8rem); font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--t1); line-height:1.08; margin-bottom:16px; }
.bam-sov-title em { font-style:normal; color:var(--usdt); text-shadow:0 0 24px var(--usdt-glow); }
.bam-sov-sub { font-size:clamp(0.6rem,0.9vw,0.75rem); font-weight:300; letter-spacing:0.14em; text-transform:uppercase; color:var(--t3); max-width:560px; line-height:1.7; margin-bottom:64px; }
.bam-sov-pillars { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0; border-top:1px solid var(--line); margin-bottom:64px; }
.bam-pillar { padding:36px 32px 36px 0; border-right:1px solid var(--line); }
.bam-pillar:last-child { border-right:none; padding-right:0; padding-left:32px; }
.bam-pillar:nth-child(2) { padding:36px 32px; }
.bam-pillar-glyph { font-size:1.2rem; margin-bottom:16px; display:block; line-height:1; }
.bam-pillar-head { font-size:0.7rem; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:var(--t1); margin-bottom:10px; }
.bam-pillar-body { font-size:0.52rem; font-weight:300; letter-spacing:0.1em; text-transform:uppercase; color:var(--t3); line-height:1.75; }
.bam-pillar-body strong { color:var(--t2); font-weight:600; }
.bam-sov-flow { display:grid; grid-template-columns:1fr auto 1fr auto 1fr auto 1fr; align-items:center; gap:0; padding:32px 0; border-top:1px solid var(--line); }
.bam-flow-node { display:flex; flex-direction:column; gap:6px; }
.bam-flow-node-tag { font-size:0.34rem; font-weight:700; letter-spacing:0.28em; text-transform:uppercase; color:var(--t3); }
.bam-flow-node-val { font-size:0.75rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; }
.bam-flow-node-val.usdt { color:var(--usdt); text-shadow:0 0 16px var(--usdt-glow); }
.bam-flow-node-val.tok { color:var(--cyn); text-shadow:0 0 16px var(--cyn-glow); }
.bam-flow-node-sub { font-size:0.32rem; font-weight:300; letter-spacing:0.12em; text-transform:uppercase; color:var(--t3); }
.bam-flow-arrow { font-size:0.9rem; color:var(--line2); padding:0 20px; letter-spacing:-0.05em; }
.bam-sov-flow-label { font-size:0.34rem; font-weight:700; letter-spacing:0.24em; text-transform:uppercase; background:rgba(38,161,123,0.04); border:1px solid rgba(38,161,123,0.2); padding:8px 14px; color:var(--usdt); }

.bam-footer {
  padding:36px 48px; background:var(--void);
  border-top:1px solid var(--line);
  display:flex; align-items:center; justify-content:space-between;
  flex-wrap:wrap; gap:16px; position:relative; z-index:2;
}
.bam-fl { font-size:0.9rem; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:var(--cream); }
.bam-fl .na { color:var(--mag); text-shadow:0 0 12px var(--mag-glow); }
.bam-fc { font-size:0.52rem; font-weight:300; letter-spacing:0.2em; text-transform:uppercase; color:var(--ghost); }

.bam-reveal { opacity:0; transform:translateY(14px); transition:opacity .9s ease, transform .9s ease; }
.bam-reveal.in { opacity:1; transform:none; }
.bam-d1{transition-delay:.08s} .bam-d2{transition-delay:.18s} .bam-d3{transition-delay:.28s}

@media (max-width:768px) {
  #bam-cur { display:none; }
  .bam-root * { cursor:auto !important; }
  .bam-nav { padding:0 20px; }
  .bam-nav-tag { display:none; }
  .bam-nav-enter { padding:7px 16px; font-size:0.54rem; }
  .bam-page { position:relative; top:0; height:auto; overflow:visible; margin-top:0; }
  #bam-hero { display:flex; flex-direction:column; min-height:calc(100svh - 56px); margin-top:56px; }
  .bam-vdiv { display:none; }
  .bam-h-right { order:-1; flex-direction:row; background:var(--deep); padding:0; border-bottom:1px solid var(--line); overflow-x:auto; overflow-y:hidden; flex-shrink:0; scrollbar-width:none; -ms-overflow-style:none; }
  .bam-h-right::-webkit-scrollbar { display:none; }
  .bam-h-right::before { display:none; }
  .bam-r-label { display:none; }
  .bam-stat { padding:10px 18px; border-bottom:none; border-right:1px solid var(--line); border-top:none !important; flex-shrink:0; min-width:120px; gap:3px; flex-direction:column; justify-content:center; }
  .bam-stat-lbl { font-size:0.34rem; white-space:nowrap; }
  .bam-stat-val { font-size:1rem; }
  .bam-stat-sub { font-size:0.32rem; white-space:nowrap; }
  .bam-h-left { flex:1; padding:18px 20px 14px; }
  .bam-hlabel { margin-bottom:18px; }
  .bam-copy { font-size:clamp(0.62rem,3.2vw,0.72rem); }
  .bam-finale { font-size:clamp(0.82rem,4.5vw,1rem); margin-top:14px; }
  .bam-hjnav { flex-wrap:wrap; gap:4px; margin-top:10px; padding-top:10px; }
  .bam-jl { font-size:0.4rem; padding-right:12px; }
  .bam-jdiv { margin-right:12px; }
  .bam-cstrip { grid-template-columns:1fr; }
  .bam-cpane { padding:12px 20px; border-right:none; border-bottom:1px solid var(--line); }
  .bam-cpane:last-child { border-bottom:none; }
  .bam-clbl { font-size:0.62rem; }
  .bam-sec { padding:60px 20px; }
  .bam-sec-head { grid-template-columns:1fr; gap:16px; }
  .bam-sec-ghost { font-size:clamp(80px,28vw,160px); }
  .bam-sec-title { font-size:clamp(1.6rem,7vw,2.4rem); }
  .bam-sec-tag { font-size:0.44rem; }
  .bam-footer { padding:28px 20px; }
  .bam-pg-3,.bam-pg-2 { grid-template-columns:1fr; }
  .bam-persona { padding:28px 20px; }
  .bam-exch-modes { grid-template-columns:1fr; }
  .bam-exch-divider { display:none; }
  .bam-flow { grid-template-columns:1fr; }
  .bam-fs { border-bottom:1px solid var(--line); border-right:none !important; }
  .bam-exch-flow-wrap .bam-flow { grid-template-columns:1fr 1fr; }
  .bam-beh-grid { grid-template-columns:1fr; }
  .bam-crush-body { grid-template-columns:1fr; gap:20px; }
  .bam-reach-body { grid-template-columns:1fr; gap:20px; }
  .bam-reach-tactics { grid-template-columns:1fr; }
  .bam-ec-card { grid-template-columns:1fr; }
  .bam-ec-card-divider { width:100%; height:1px; }
  .bam-ec-card-right { border-top:1px solid var(--line); border-left:none; }
  .bam-sov-pillars { grid-template-columns:1fr; }
  .bam-pillar { padding:28px 0; border-right:none; border-bottom:1px solid var(--line); }
  .bam-pillar:nth-child(2) { padding:28px 0; }
  .bam-pillar:last-child { padding:28px 0; border-bottom:none; }
  .bam-sov-flow { grid-template-columns:1fr; gap:16px; }
  .bam-flow-arrow { display:none; }
  .bam-flow-node { flex-direction:row; align-items:center; gap:16px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
  .bam-flow-node:last-child { border-bottom:none; }
  .bam-flow-node-val { font-size:0.9rem; }
  .bam-sov-flow-label { padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
  .bam-sov-sub { margin-bottom:40px; }
}
@media (max-width:480px) {
  .bam-nav { padding:0 16px; }
  .bam-nav-logo { font-size:0.85rem; letter-spacing:0.16em; }
  .bam-h-left { padding:14px 16px 12px; }
  .bam-copy { font-size:3.2vw; line-height:1.6; }
  .bam-finale { font-size:4.8vw; }
  .bam-sec { padding:48px 16px; }
  .bam-sec-title { font-size:clamp(1.4rem,8vw,2rem); }
  .bam-persona { padding:24px 16px; }
  .bam-stat-val { font-size:0.9rem; }
  .bam-stat { min-width:100px; padding:8px 14px; }
  .bam-sov-title { font-size:clamp(1.3rem,8vw,2rem); }
  .bam-pillar-head { font-size:0.6rem; }
  .bam-pillar-body { font-size:0.48rem; }
  .bam-footer { padding:24px 16px; flex-direction:column; align-items:flex-start; gap:8px; }
  .bam-fc { font-size:0.44rem; }
}
@media (max-width:960px) {
  .bam-sec-head { grid-template-columns:1fr; gap:20px; }
  .bam-pg-3,.bam-pg-2 { grid-template-columns:1fr; }
  .bam-ec-card { grid-template-columns:1fr; }
  .bam-ec-card-divider { width:100%; height:1px; }
  .bam-ec-card-right { border-top:1px solid var(--line); }
  .bam-beh-grid { grid-template-columns:1fr; }
  .bam-flow { grid-template-columns:1fr 1fr; }
  .bam-fs { border-bottom:1px solid var(--line); }
  .bam-crush-body { grid-template-columns:1fr; gap:28px; }
  .bam-reach-body { grid-template-columns:1fr; gap:28px; }
  .bam-reach-tactics { grid-template-columns:1fr; }
  .bam-exch-modes { grid-template-columns:1fr; }
  .bam-exch-divider { display:none; }
}
`;

const feedItems = [
  { name: "@mira_k", rate: "$8.00 / min", action: "Just accepted a call", badge: "voice", badgeClass: "v" },
  { name: "@jay_x", rate: "$3.50 / min", action: "New call offer received", badge: "video", badgeClass: "vd" },
  { name: "@sara_t", rate: "$12.40 / min", action: "Call ended · 22 min", badge: "voice", badgeClass: "v" },
  { name: "@nate_k", rate: "$6.00 / min", action: "Just went live", badge: "video", badgeClass: "vd" },
  { name: "@leo_v", rate: "$25.00 / min", action: "Just accepted a call", badge: "voice", badgeClass: "v" },
  { name: "@amy_r", rate: "$4.00 / min", action: "Offer pending · 3 min ago", badge: "video", badgeClass: "vd" },
  { name: "@dan_m", rate: "$10.00 / min", action: "Call ended · 8 min", badge: "voice", badgeClass: "v" },
  { name: "@kai_s", rate: "$18.00 / min", action: "New call offer received", badge: "video", badgeClass: "vd" },
];

const chartHeights = [35, 48, 42, 60, 55, 70, 65, 80, 72, 88, 76, 100];

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rateRef = useRef<HTMLSpanElement>(null);
  const callsRef = useRef<HTMLSpanElement>(null);
  const minsRef = useRef<HTMLSpanElement>(null);
  const monthlyRef = useRef<HTMLDivElement>(null);
  const ecRateRef = useRef<HTMLSpanElement>(null);
  const ecCallsRef = useRef<HTMLSpanElement>(null);
  const ecMinsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Cursor
    const cur = curRef.current;
    if (!cur) return;
    const handleMouse = (e: MouseEvent) => {
      cur.style.left = e.clientX + "px";
      cur.style.top = e.clientY + "px";
    };
    document.addEventListener("mousemove", handleMouse);

    // Rain
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      let drops: any[] = [];
      let W = 0, H = 0;
      let animId = 0;

      const resize = () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        drops = [];
        for (let i = 0; i < 130; i++) {
          drops.push({
            x: Math.random() * W,
            y: Math.random() * H,
            len: Math.random() * 16 + 8,
            speed: Math.random() * 3.5 + 1.8,
            opacity: Math.random() * 0.28 + 0.04,
            width: Math.random() * 0.5 + 0.15,
          });
        }
      };

      const drawRain = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, W, H);
        drops.forEach((d) => {
          const hue = d.x / W;
          let color;
          if (hue < 0.33) color = `rgba(255,45,120,${d.opacity})`;
          else if (hue < 0.66) color = `rgba(0,229,255,${d.opacity * 0.65})`;
          else color = `rgba(255,184,48,${d.opacity * 0.45})`;
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = d.width;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - 0.5, d.y + d.len);
          ctx.stroke();
          d.y += d.speed;
          if (d.y > H + d.len) { d.y = -d.len; d.x = Math.random() * W; }
        });
        animId = requestAnimationFrame(drawRain);
      };

      resize();
      drawRain();
      window.addEventListener("resize", resize);

      return () => {
        document.removeEventListener("mousemove", handleMouse);
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(animId);
      };
    }

    return () => {
      document.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  useEffect(() => {
    // Scroll reveal
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll(".bam-reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const updateCalc = (rate: number, calls: number, mins: number) => {
    const monthly = Math.round(rate * calls * mins * 4.33);
    if (rateRef.current) rateRef.current.textContent = `$${rate} / min`;
    if (callsRef.current) callsRef.current.textContent = `${calls} calls`;
    if (minsRef.current) minsRef.current.textContent = `${mins} min`;
    if (monthlyRef.current) monthlyRef.current.textContent = `$${monthly.toLocaleString()}`;
    if (ecRateRef.current) ecRateRef.current.textContent = `$${rate}`;
    if (ecCallsRef.current) ecCallsRef.current.textContent = String(calls);
    if (ecMinsRef.current) ecMinsRef.current.textContent = String(mins);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,100;0,200;0,300;0,400;0,600;0,700;1,100;1,200;1,300;1,400;1,600;1,700&display=swap" rel="stylesheet" />

      <div className="bam-root" ref={rootRef}>
        <div id="bam-cur" ref={curRef} />
        <canvas id="bam-rain" ref={canvasRef} />
        <div className="bam-refs">
          <div className="bam-ref bam-r1" />
          <div className="bam-ref bam-r2" />
          <div className="bam-ref bam-r3" />
        </div>

        {/* NAV */}
        <nav className="bam-nav">
          <div className="bam-nav-logo">BUY<span className="na">A</span>MINUTE</div>
          <div className="bam-nav-right">
            <span className="bam-nav-tag">Voice &amp; Video · Per Minute</span>
            <a href="#bam-cta" className="bam-nav-enter">Enter</a>
          </div>
        </nav>

        {/* PAGE SHELL */}
        <div className="bam-page">
          <section id="bam-hero">
            <div className="bam-h-left">
              <div className="bam-hlabel">
                <div className="bam-lbar" />
                <div className="bam-llines">
                  <span className="bam-ltop">Incentivised Communication</span>
                  <span className="bam-lbtm">A new category · Available now</span>
                </div>
              </div>
              <div className="bam-copy">
                <span className="bam-cp">That random stranger, crush, friend or mentor will take your call, <span className="h">when it earns them money.</span><br />You can also get paid by fans, friends or anyone who wants a voice or video call with you.</span>
                <span className="bam-cp">This is the death of <span className="bam-x">cold DMs</span>, <span className="bam-x">unreplied texts</span> and <span className="bam-x">unanswered calls</span>.</span>
                <span className="bam-cp"><span className="s">BuyAMinute gives you power.</span></span>
                <span className="bam-cp">Power to incentivise a response from anyone you want access to.<span className="q">(increase your odds of a response by attaching money to the call)</span></span>
                <span className="bam-cp">Power to make money from anyone who wants a voice or video call with you.<span className="q">(earn by the minute, at your own set rate.)</span></span>
                <div className="bam-finale">Voice and video calls.<br />Paid by the minute.</div>
              </div>
              <div className="bam-hjnav">
                <a href="#bam-sellers" className="bam-jl">See How Sellers Earn</a><div className="bam-jdiv" /><a href="#bam-buyers" className="bam-jl">See How Buyers Win</a><div className="bam-jdiv" /><a href="#bam-exchange" className="bam-jl">Understand The Exchange</a>
              </div>
            </div>
            <div className="bam-vdiv" />
            <div className="bam-h-right">
              <div className="bam-r-label">Platform Activity</div>
              <div className="bam-stat"><div className="bam-stat-lbl">Calls completed today</div><div className="bam-stat-val">2,847</div><div className="bam-stat-sub"><span className="pos">↑ 14%</span> vs yesterday</div></div>
              <div className="bam-stat"><div className="bam-stat-lbl">Avg response to paid invite</div><div className="bam-stat-val cyn">11 min</div><div className="bam-stat-sub">vs <span className="neg">4 days</span> cold DM</div></div>
              <div className="bam-stat"><div className="bam-stat-lbl">Paid invites accepted</div><div className="bam-stat-val wht">68%</div><div className="bam-stat-sub">of all invites sent today</div></div>
              <div className="bam-stat"><div className="bam-stat-lbl">Earned by sellers this week</div><div className="bam-stat-val cyn">$94k</div><div className="bam-stat-sub">across all categories</div></div>
            </div>
          </section>

          <div className="bam-cstrip">
            <div className="bam-cpane">
              <div className="bam-cey">Primary Actions</div>
              <a href="#bam-sellers" className="bam-cbtn"><span className="bam-clbl hi">Enter to Call</span><span className="bam-carr">→</span></a>
              <a href="#bam-sellers" className="bam-cbtn"><span className="bam-clbl hi">Enter to Earn</span><span className="bam-carr">→</span></a>
            </div>
            <div className="bam-cpane">
              <div className="bam-cey">Initiate an Exchange</div>
              <a href="#bam-exchange" className="bam-cbtn"><span className="bam-clbl">Send a Paid Call Offer</span><span className="bam-carr">↗</span></a>
              <a href="#bam-exchange" className="bam-cbtn"><span className="bam-clbl">Invite Someone to Call You</span><span className="bam-carr">↗</span></a>
            </div>
          </div>
        </div>

        {/* SELLERS */}
        <section className="bam-sec" id="bam-sellers">
          <div className="bam-sec-ghost">01</div>
          <div className="bam-sec-head bam-reveal">
            <div>
              <div className="bam-sec-tag">Seller Snapshot</div>
              <h2 className="bam-sec-title">Monetisation<br />In Motion.</h2>
            </div>
            <p className="bam-sec-body">Set your rate. Accept calls on your terms. Every minute you're live is revenue landing in your account — automatically, in real time.</p>
          </div>

          <div className="bam-pg bam-pg-3 bam-reveal bam-d1">
            {/* THE HUSTLE */}
            <div className="bam-persona hustle">
              <div className="bam-persona-eyebrow" style={{color:"var(--cyn)",textShadow:"0 0 8px var(--cyn-glow)"}}>The Hustle</div>
              <div className="bam-persona-hook">"You don't have to wait. You can go and get it."</div>
              <div className="bam-persona-body">Most platforms make you passive. You post, you hope, you wait. BuyAMinute is different. As a seller you can generate your own demand — send a paid call invitation to anyone, anywhere.</div>
              <div className="bam-hustle-tactics">
                <div className="bam-ht"><span className="bam-ht-icon">→</span><div><div className="bam-ht-title">DM Blast</div><div className="bam-ht-desc">Send invitations to everyone in your request queue. They wanted access — now they can pay for it.</div></div></div>
                <div className="bam-ht"><span className="bam-ht-icon">→</span><div><div className="bam-ht-title">Comment Drop</div><div className="bam-ht-desc">Drop your invite link wherever your audience already is. One comment. Multiple offers.</div></div></div>
                <div className="bam-ht"><span className="bam-ht-icon">→</span><div><div className="bam-ht-title">Cold Invite</div><div className="bam-ht-desc">Reach out to anyone cold. The payment offer does the convincing — it signals you're serious.</div></div></div>
              </div>
            </div>

            {/* THE CREATOR */}
            <div className="bam-persona">
              <div className="bam-persona-eyebrow">The Creator</div>
              <div className="bam-persona-hook">"You have 47 DM requests you haven't opened."</div>
              <div className="bam-persona-body">You post. People want access. Right now that access is free — or ignored. Send a paid call invitation to your DM queue. The ones who want you badly enough will pay. The rest were never serious.</div>
              <div className="bam-persona-example">A TikTok model with 80k followers sets her rate at $5/min. Accepts 10 calls a week. Each call averages 12 minutes.</div>
              <div className="bam-persona-calc">
                <div className="bam-pc-row"><span className="bam-pc-lbl">Per call</span><span className="bam-pc-val">$60</span></div>
                <div className="bam-pc-row"><span className="bam-pc-lbl">Per week</span><span className="bam-pc-val">$600</span></div>
                <div className="bam-pc-row hi"><span className="bam-pc-lbl">Per month</span><span className="bam-pc-val mag">$2,400</span></div>
              </div>
            </div>

            {/* THE EXPERT */}
            <div className="bam-persona">
              <div className="bam-persona-eyebrow">The Expert</div>
              <div className="bam-persona-hook">"Someone paid $300 for a consultant call this morning. You know more than them."</div>
              <div className="bam-persona-body">Lawyer, fitness coach, designer, developer, therapist. Your knowledge has been free on the phone forever — to friends, to family, to people who never respected your time. That ends now.</div>
              <div className="bam-persona-example">A fitness coach sets $10/min. Takes 5 calls a week. Clients who pay up front show up prepared and never waste time.</div>
              <div className="bam-persona-calc">
                <div className="bam-pc-row"><span className="bam-pc-lbl">Per call</span><span className="bam-pc-val">$120</span></div>
                <div className="bam-pc-row"><span className="bam-pc-lbl">Per week</span><span className="bam-pc-val">$600</span></div>
                <div className="bam-pc-row hi"><span className="bam-pc-lbl">Per month</span><span className="bam-pc-val mag">$2,400</span></div>
              </div>
            </div>
          </div>

          <div className="bam-pg bam-pg-3 bam-reveal bam-d2" style={{borderTop:"none"}}>
            {/* THE CONNECTED */}
            <div className="bam-persona">
              <div className="bam-persona-eyebrow">The Connected</div>
              <div className="bam-persona-hook">"Three people texted you this week asking for an intro."</div>
              <div className="bam-persona-body">You're the plug. The person everyone wants 20 minutes with. The one with the number, the insight, the room. That social capital has always been invisible income. Make it visible.</div>
              <div className="bam-persona-example">A well-connected exec sets $8/min. Takes 8 calls a week from people who would've emailed cold for free.</div>
              <div className="bam-persona-calc">
                <div className="bam-pc-row"><span className="bam-pc-lbl">Per call</span><span className="bam-pc-val">$96</span></div>
                <div className="bam-pc-row"><span className="bam-pc-lbl">Per week</span><span className="bam-pc-val">$768</span></div>
                <div className="bam-pc-row hi"><span className="bam-pc-lbl">Per month</span><span className="bam-pc-val mag">$3,072</span></div>
              </div>
            </div>

            {/* THE FAMOUS */}
            <div className="bam-persona famous">
              <div className="bam-persona-eyebrow" style={{color:"var(--amb)",textShadow:"0 0 8px var(--amb-glow)"}}>The Famous</div>
              <div className="bam-persona-hook">"Your fans pay for your music, your content, your merch. Why not your time?"</div>
              <div className="bam-persona-body">Music artists, video vixens, athletes, public figures. You have an audience that would pay anything for a direct line to you. BuyAMinute turns that desire into a controlled, monetised experience — on your terms.</div>
              <div className="bam-persona-example">A mid-tier artist sets $25/min. Posts their invite link once to Instagram stories. 40 requests come in overnight.</div>
              <div className="bam-persona-calc" style={{borderColor:"rgba(255,184,48,0.15)"}}>
                <div className="bam-pc-row"><span className="bam-pc-lbl">Per call (20 min)</span><span className="bam-pc-val">$500</span></div>
                <div className="bam-pc-row"><span className="bam-pc-lbl">Per week (5 calls)</span><span className="bam-pc-val">$2,500</span></div>
                <div className="bam-pc-row hi" style={{background:"rgba(255,184,48,0.04)"}}><span className="bam-pc-lbl">Per month</span><span className="bam-pc-val" style={{color:"var(--amb)",textShadow:"0 0 12px var(--amb-glow)"}}>$10,000</span></div>
              </div>
            </div>

            {/* LIVE TERMINAL */}
            <div className="bam-persona bam-p-terminal">
              <div className="bam-st-head">
                <span className="bam-st-label">Live Seller</span>
                <span className="bam-st-live"><span className="bam-st-live-dot" />Now</span>
              </div>
              <div className="bam-st-profile">
                <div className="bam-st-avatar">AR</div>
                <div className="bam-st-profile-info">
                  <span className="bam-st-handle">@alex_r</span>
                  <span className="bam-st-rate-line">Charging <b>$12.40 / min</b></span>
                  <span className="bam-st-avail">● Currently available</span>
                </div>
              </div>
              <div className="bam-st-ticker"><span className="bam-st-ticker-dot" />+1 New call offer just now</div>
              <div className="bam-st-stats">
                <div className="bam-st-stat"><div className="bam-st-stat-val">42</div><div className="bam-st-stat-lbl">Call offers<br />received</div></div>
                <div className="bam-st-stat"><div className="bam-st-stat-val mag">$1,289.60</div><div className="bam-st-stat-lbl">Earned</div></div>
                <div className="bam-st-stat"><div className="bam-st-stat-val">104</div><div className="bam-st-stat-lbl">Minutes<br />sold</div></div>
              </div>
              <div className="bam-st-meta">
                <div className="bam-st-meta-row">
                  <span className="bam-st-meta-lbl">Time on platform</span>
                  <span className="bam-st-meta-val">3 weeks</span>
                </div>
                <div className="bam-st-meta-row">
                  <span className="bam-st-meta-lbl">Repeat buyers</span>
                  <span className="bam-st-meta-val cyn">4 buyers · called more than once</span>
                </div>
              </div>
              <div className="bam-st-feed">
                <div className="bam-st-row"><b>$74.40</b> earned in the last 6 minutes</div>
                <div className="bam-st-row">Last offer: 2 minutes ago</div>
              </div>
            </div>
          </div>

          {/* CALCULATOR */}
          <div className="bam-pg bam-pg-1 bam-reveal bam-d3" style={{borderTop:"none"}}>
            <div className="bam-persona bam-p-calc">
              <div className="bam-ec-card">
                <div className="bam-ec-card-left">
                  <div className="bam-ec-card-label">Calculate your income</div>
                  <div className="bam-ec-card-hint">Set your rate and calls per week. Watch the number update.</div>
                  <div className="bam-ec-sliders">
                    <div className="bam-ec-slider-group">
                      <div className="bam-ec-slider-top"><span className="bam-ec-sl-lbl">Your rate</span><span className="bam-ec-sl-val" ref={rateRef}>$5 / min</span></div>
                      <input type="range" className="bam-ec-range" min={1} max={50} defaultValue={5} onChange={e => { const r = +e.target.value; const c = +(document.getElementById("bamCallsSlider") as HTMLInputElement)?.value || 8; const m = +(document.getElementById("bamMinsSlider") as HTMLInputElement)?.value || 10; updateCalc(r, c, m); }} />
                    </div>
                    <div className="bam-ec-slider-group">
                      <div className="bam-ec-slider-top"><span className="bam-ec-sl-lbl">Calls per week</span><span className="bam-ec-sl-val" ref={callsRef}>8 calls</span></div>
                      <input id="bamCallsSlider" type="range" className="bam-ec-range" min={1} max={30} defaultValue={8} onChange={e => { const c = +e.target.value; const r = +(document.querySelector(".bam-ec-range") as HTMLInputElement)?.value || 5; const m = +(document.getElementById("bamMinsSlider") as HTMLInputElement)?.value || 10; updateCalc(r, c, m); }} />
                    </div>
                    <div className="bam-ec-slider-group">
                      <div className="bam-ec-slider-top"><span className="bam-ec-sl-lbl">Avg call length</span><span className="bam-ec-sl-val" ref={minsRef}>10 min</span></div>
                      <input id="bamMinsSlider" type="range" className="bam-ec-range" min={3} max={60} defaultValue={10} onChange={e => { const m = +e.target.value; const r = +(document.querySelector(".bam-ec-range") as HTMLInputElement)?.value || 5; const c = +(document.getElementById("bamCallsSlider") as HTMLInputElement)?.value || 8; updateCalc(r, c, m); }} />
                    </div>
                  </div>
                </div>
                <div className="bam-ec-card-divider" />
                <div className="bam-ec-card-right">
                  <div className="bam-ec-out-label">Your monthly income</div>
                  <div className="bam-ec-out-val" ref={monthlyRef}>$1,600</div>
                  <div className="bam-ec-out-sub">at <span ref={ecRateRef}>$5</span>/min · <span ref={ecCallsRef}>8</span> calls · <span ref={ecMinsRef}>10</span> min avg</div>
                  <a href="#bam-cta" className="bam-ec-cta">Start Earning →</a>
                </div>
              </div>
            </div>
          </div>

          <a href="#bam-hero" className="bam-back-top">↑ Back to Top</a>
        </section>

        {/* BUYERS */}
        <section className="bam-sec" id="bam-buyers">
          <div className="bam-sec-ghost">02</div>
          <div className="bam-sec-head bam-reveal">
            <div>
              <div className="bam-sec-tag">Buyer Snapshot</div>
              <h2 className="bam-sec-title">Who You Can<br />Now Reach.</h2>
            </div>
            <p className="bam-sec-body">Money changes the signal. A paid call request doesn't get ignored — it gets seen, considered, and answered. You are no longer asking. You are offering.</p>
          </div>

          <div className="bam-pg bam-pg-3 bam-reveal bam-d1">
            <div className="bam-persona">
              <div className="bam-persona-eyebrow" style={{color:"var(--cyn)",textShadow:"0 0 8px var(--cyn-glow)"}}>The Mentor</div>
              <div className="bam-persona-hook">"You've been trying to get 20 minutes with them for 6 months."</div>
              <div className="bam-persona-body">The investor. The executive. The person who could change your trajectory with one conversation. They don't reply to cold emails. They don't accept LinkedIn requests. But they will pick up a call that pays them by the minute.</div>
              <div className="bam-persona-example">A founder sends a $8/min paid call invite to a VC they've been trying to reach. The VC accepts in 11 minutes. The call lasts 18 minutes.</div>
              <div className="bam-persona-calc" style={{borderColor:"rgba(0,229,255,0.12)"}}>
                <div className="bam-pc-row"><span className="bam-pc-lbl">Total cost</span><span className="bam-pc-val" style={{color:"var(--cyn)",textShadow:"0 0 10px var(--cyn-glow)"}}>$144</span></div>
                <div className="bam-pc-row"><span className="bam-pc-lbl">Cold email reply rate</span><span className="bam-pc-val" style={{color:"var(--ghost)"}}>~2%</span></div>
                <div className="bam-pc-row hi" style={{background:"rgba(0,229,255,0.04)"}}><span className="bam-pc-lbl">Paid offer reply rate</span><span className="bam-pc-val" style={{color:"var(--cyn)",textShadow:"0 0 10px var(--cyn-glow)"}}>68%</span></div>
              </div>
            </div>

            <div className="bam-persona">
              <div className="bam-persona-eyebrow" style={{color:"var(--cyn)",textShadow:"0 0 8px var(--cyn-glow)"}}>The Expert</div>
              <div className="bam-persona-hook">"You need the right answer. Not a Google result."</div>
              <div className="bam-persona-body">The specialist whose time normally costs $400/hr through a firm, a clinic, or a consultancy — with a 2-week wait. On BuyAMinute you pay for exactly the minutes you need. No retainer. No minimum. No waiting room.</div>
              <div className="bam-persona-example">A startup lawyer, a dermatologist, a tax strategist. Real expertise, direct access, billed by the minute at a rate you both agree on before the call starts.</div>
              <div className="bam-persona-calc" style={{borderColor:"rgba(0,229,255,0.12)"}}>
                <div className="bam-pc-row"><span className="bam-pc-lbl">Traditional consult</span><span className="bam-pc-val" style={{color:"var(--ghost)"}}>$400 · 1hr min</span></div>
                <div className="bam-pc-row"><span className="bam-pc-lbl">BuyAMinute · 12 min</span><span className="bam-pc-val" style={{color:"var(--cyn)",textShadow:"0 0 10px var(--cyn-glow)"}}>$60</span></div>
                <div className="bam-pc-row hi" style={{background:"rgba(0,229,255,0.04)"}}><span className="bam-pc-lbl">You saved</span><span className="bam-pc-val" style={{color:"var(--cyn)",textShadow:"0 0 10px var(--cyn-glow)"}}>$340</span></div>
              </div>
            </div>

            <div className="bam-persona">
              <div className="bam-persona-eyebrow" style={{color:"var(--amb)",textShadow:"0 0 8px var(--amb-glow)"}}>The Famous</div>
              <div className="bam-persona-hook">"You've been in their DMs for two years."</div>
              <div className="bam-persona-body">The artist. The athlete. The creator you've followed since the beginning. You've commented on every post. You've sent the message that never got read. Now there's a door — and money is the key that opens it.</div>
              <div className="bam-persona-example">An artist you've followed for 5 years lists at $15/min. You send a paid invite. They accept. You get 10 minutes that no amount of DMs could have bought.</div>
              <div className="bam-persona-calc" style={{borderColor:"rgba(255,184,48,0.15)"}}>
                <div className="bam-pc-row"><span className="bam-pc-lbl">DMs sent (unanswered)</span><span className="bam-pc-val" style={{color:"var(--ghost)"}}>47</span></div>
                <div className="bam-pc-row"><span className="bam-pc-lbl">Paid invite sent</span><span className="bam-pc-val" style={{color:"var(--amb)",textShadow:"0 0 10px var(--amb-glow)"}}>1</span></div>
                <div className="bam-pc-row hi" style={{background:"rgba(255,184,48,0.04)"}}><span className="bam-pc-lbl">Response time</span><span className="bam-pc-val" style={{color:"var(--amb)",textShadow:"0 0 10px var(--amb-glow)"}}>8 minutes</span></div>
              </div>
            </div>
          </div>

          {/* YOUR CRUSH */}
          <div className="bam-pg bam-pg-1 bam-reveal bam-d2" style={{borderTop:"none"}}>
            <div className="bam-persona crush">
              <div className="bam-persona-eyebrow" style={{color:"var(--mag)",textShadow:"0 0 8px var(--mag-glow)"}}>Your Crush</div>
              <div className="bam-persona-hook">"I'd love to get to know you — and it could be worth your while."</div>
              <div className="bam-crush-body">
                <div className="bam-crush-desc">
                  <p>You saw them on TikTok and their DMs are closed. You follow a creator whose content you can't stop thinking about. You met someone at the gas station — exchanged contacts — and instead of a text they might ignore, you sent a paid call invite on BuyAMinute.</p>
                  <p>Not a message request. Not a follow. An offer — one that says: I want to talk to you, and I'll make it worth your time.</p>
                  <p>They set their rate. You send the invite. The rest is up to both of you.</p>
                </div>
                <div className="bam-crush-scenarios">
                  <div className="bam-cs"><div className="bam-cs-icon">⟶</div><div><div className="bam-cs-title">Locked DMs</div><div className="bam-cs-desc">Their account is private. Message requests go nowhere. A paid call invite isn't a message request — it's an offer with money attached. Different inbox. Different energy. Different result.</div></div></div>
                  <div className="bam-cs"><div className="bam-cs-icon">⟶</div><div><div className="bam-cs-title">The Creator</div><div className="bam-cs-desc">You subscribe. You tip. But actually talking to them — voice, live, real-time — that's a different level of access entirely. BuyAMinute makes that conversation possible at a rate they set and control.</div></div></div>
                  <div className="bam-cs"><div className="bam-cs-icon">⟶</div><div><div className="bam-cs-title">The Real-Life Encounter</div><div className="bam-cs-desc">You meet at Walmart, a gas station, the gym. You exchange contacts. Instead of a cold text they might ghost, you send a paid call invite. The message writes itself: I'd love to get to know you — and it could be worth your while.</div></div></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bam-pg bam-pg-3 bam-reveal bam-d2" style={{borderTop:"none"}}>
            <div className="bam-persona">
              <div className="bam-persona-eyebrow" style={{color:"var(--mag)",textShadow:"0 0 8px var(--mag-glow)"}}>Signal vs Noise</div>
              <div className="bam-persona-hook">"A paid offer doesn't get ignored. It gets seen."</div>
              <div className="bam-persona-body">Every seller on BuyAMinute receives hundreds of free messages. None of them get the same attention as a paid call invite. Money is the filter. It proves intent. It separates the serious from the noise — and you are the signal.</div>
              <div className="bam-beh-stat" style={{marginTop:"auto",paddingTop:"20px",borderTop:"1px solid var(--line)",fontSize:"0.54rem",fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--mag)",textShadow:"0 0 8px var(--mag-glow)"}}>↑ 4.7× response rate vs unpaid requests</div>
            </div>
            <div className="bam-persona">
              <div className="bam-persona-eyebrow" style={{color:"var(--mag)",textShadow:"0 0 8px var(--mag-glow)"}}>No More Waiting</div>
              <div className="bam-persona-hook">"You control the timeline. Not them."</div>
              <div className="bam-persona-body">With a paid call invite, urgency shifts to the seller. Every minute they delay is revenue they're leaving on the table. You don't follow up. You don't chase. The money does the work — and sellers respond fast because fast is profitable for them.</div>
              <div className="bam-beh-stat" style={{marginTop:"auto",paddingTop:"20px",borderTop:"1px solid var(--line)",fontSize:"0.54rem",fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--mag)",textShadow:"0 0 8px var(--mag-glow)"}}>Avg response time — under 22 minutes</div>
            </div>
            <div className="bam-persona">
              <div className="bam-persona-eyebrow" style={{color:"var(--mag)",textShadow:"0 0 8px var(--mag-glow)"}}>Exactly What You Need</div>
              <div className="bam-persona-hook">"Pay for 8 minutes. Get your answer. Leave."</div>
              <div className="bam-persona-body">No hour-long minimum. No retainer. No back-and-forth to book a slot two weeks from now. You send the invite, they accept, you talk. The billing starts when you're ready and stops the second you're done. Precision access to the people that matter.</div>
              <div className="bam-beh-stat" style={{marginTop:"auto",paddingTop:"20px",borderTop:"1px solid var(--line)",fontSize:"0.54rem",fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",color:"var(--mag)",textShadow:"0 0 8px var(--mag-glow)"}}>$5+ offers — 91% acceptance rate</div>
            </div>
          </div>

          {/* THE REACH */}
          <div className="bam-pg bam-pg-1 bam-reveal bam-d3" style={{borderTop:"none"}}>
            <div className="bam-persona reach">
              <div className="bam-persona-eyebrow" style={{color:"var(--cyn)",textShadow:"0 0 8px var(--cyn-glow)"}}>The Reach</div>
              <div className="bam-persona-hook">"You are not limited to who is already here. You can go get anyone."</div>
              <div className="bam-reach-body">
                <p className="bam-reach-desc">BuyAMinute lets you send a paid call invitation to anyone — whether they're on the platform or not. See someone on Instagram you've been too nervous to approach cold? A thought leader posting daily on LinkedIn? An expert whose comment section you've been lurking? Send them a paid invite. Money removes the awkwardness. It replaces the cold ask with a compelling offer — and compelling offers get answered.</p>
                <div className="bam-reach-tactics">
                  <div className="bam-rt"><div className="bam-rt-head"><span className="bam-rt-icon cyn">→</span><span className="bam-rt-title">Cold DM</span></div><div className="bam-rt-desc">Found someone on Instagram, X, or LinkedIn you've been meaning to reach? Skip the cold message. Send a paid call invite instead. The money signals you're serious — and serious people get replies.</div></div>
                  <div className="bam-rt"><div className="bam-rt-head"><span className="bam-rt-icon cyn">→</span><span className="bam-rt-title">Comment Drop</span></div><div className="bam-rt-desc">See an expert posting in your field? A creator you admire? Reply publicly with a paid invite. Visible to everyone. Impossible to ignore. The offer stands out in a sea of free comments.</div></div>
                  <div className="bam-rt"><div className="bam-rt-head"><span className="bam-rt-icon cyn">→</span><span className="bam-rt-title">Share the Link</span></div><div className="bam-rt-desc">Drop a seller's invite link in your group chat, your community, your network. Let the offer travel. Anyone who clicks and pays becomes a buyer — and the seller owes the response.</div></div>
                  <div className="bam-rt"><div className="bam-rt-head"><span className="bam-rt-icon cyn">→</span><span className="bam-rt-title">Spam Their DMs</span></div><div className="bam-rt-desc">Not spam they can delete. Spam they get paid to answer. Send invites to everyone in their following list, their mutual connections, their comment section regulars. Every invite is an offer — and offers move people.</div></div>
                </div>
              </div>
            </div>
          </div>

          <a href="#bam-hero" className="bam-back-top">↑ Back to Top</a>
        </section>

        {/* EXCHANGE */}
        <section className="bam-sec" id="bam-exchange">
          <div className="bam-sec-ghost">03</div>
          <div className="bam-exch-header bam-reveal">
            <div className="bam-exch-tag">The Exchange</div>
            <h2 className="bam-exch-title">One Account.<br />Two Modes.</h2>
            <p className="bam-exch-sub">Two modes. One system. A request becomes a decision.<br />Four steps. No ambiguity. A transparent mechanism built to scale to hundreds of millions of transactions.</p>
          </div>

          <div className="bam-exch-modes bam-reveal bam-d1">
            <div className="bam-exch-card">
              <div className="bam-exch-card-top">
                <div className="bam-exch-card-eyebrow cyn">When You BuyAMinute</div>
                <div className="bam-exch-card-subtitle">(This should feel like dialing a number)</div>
              </div>
              <div className="bam-exch-bullets">
                <div className="bam-eb"><span className="bam-eb-dot cyn" /><span>You select the icon and send a <span className="bam-mode-hl cyn">paid call request</span> — not a message</span></div>
                <div className="bam-eb"><span className="bam-eb-dot cyn" /><span>You see the icon's <span className="bam-mode-hl cyn">rate</span> and <span className="bam-mode-hl cyn">pre-authorize time</span></span></div>
                <div className="bam-eb"><span className="bam-eb-dot cyn" /><span>If the icon is <span className="bam-mode-hl cyn">live</span>, they receive your request and <span className="bam-mode-hl cyn">respond</span></span></div>
                <div className="bam-eb"><span className="bam-eb-dot cyn" /><span>If your <span className="bam-mode-hl cyn">prepaid time</span> covers their rate, the call connects</span></div>
              </div>
              <div className="bam-exch-risk bam-cyn-risk">
                <span className="bam-risk-icon">⊙</span>
                <span>30 seconds free preview &nbsp;·&nbsp; Drop anytime &nbsp;·&nbsp; No surprise charges</span>
              </div>
            </div>
            <div className="bam-exch-divider" />
            <div className="bam-exch-card">
              <div className="bam-exch-card-top">
                <div className="bam-exch-card-eyebrow mag">When You Charge for Reachability</div>
                <div className="bam-exch-card-subtitle">(This should feel like switching into earning mode)</div>
              </div>
              <div className="bam-exch-bullets">
                <div className="bam-eb"><span className="bam-eb-dot mag" /><span>You <span className="bam-mode-hl mag">become the icon</span></span></div>
                <div className="bam-eb"><span className="bam-eb-dot mag" /><span>You <span className="bam-mode-hl mag">set your rate</span> and turn <span className="bam-mode-hl mag">live</span> on</span></div>
                <div className="bam-eb"><span className="bam-eb-dot mag" /><span>Incoming requests show the <span className="bam-mode-hl mag">caller</span> and <span className="bam-mode-hl mag">prepaid time</span></span></div>
                <div className="bam-eb"><span className="bam-eb-dot mag" /><span>You <span className="bam-mode-hl mag">accept or decline</span> and get <span className="bam-mode-hl mag">paid per second</span></span></div>
                <div className="bam-eb"><span className="bam-eb-dot mag" /><span>Your <span className="bam-mode-hl mag">rate</span> is the only limit</span></div>
              </div>
              <div className="bam-exch-risk bam-mag-risk">
                <span className="bam-risk-icon">⊙</span>
                <span>You set the floor &nbsp;·&nbsp; You accept or decline &nbsp;·&nbsp; You are always in control</span>
              </div>
            </div>
          </div>

          <div className="bam-exch-flow-wrap bam-reveal bam-d2">
            <div className="bam-exch-flow-label">How a transaction works</div>
            <div className="bam-flow">
              <div className="bam-fs"><div className="bam-fs-n">Step 01</div><div className="bam-fs-node" /><h3 className="bam-fs-title">Request</h3><p className="bam-fs-desc">Buyer selects a seller and submits a paid call request at or above their published floor rate.</p><span className="bam-fs-tag">Buyer</span></div>
              <div className="bam-fs"><div className="bam-fs-n">Step 02</div><div className="bam-fs-node" /><h3 className="bam-fs-title">Decision</h3><p className="bam-fs-desc">Seller reviews the offer and profile. Accepts or declines. Acceptance locks the agreed rate immediately.</p><span className="bam-fs-tag">Seller</span></div>
              <div className="bam-fs"><div className="bam-fs-n">Step 03</div><div className="bam-fs-node" /><h3 className="bam-fs-title">Preview</h3><p className="bam-fs-desc">30 seconds free. Both parties connect before billing begins. Drop here and pay nothing.</p><span className="bam-fs-tag">Both</span></div>
              <div className="bam-fs"><div className="bam-fs-n">Step 04</div><div className="bam-fs-node" /><h3 className="bam-fs-title">Billing</h3><p className="bam-fs-desc">Bills per minute in real time. Either party ends it. Billing stops instantly. Funds settle automatically.</p><span className="bam-fs-tag">Automatic</span></div>
            </div>
          </div>

          <div className="bam-exch-closing bam-reveal bam-d3">
            You are not choosing an identity. You become the caller when you initiate — and the icon when you receive.
          </div>

          <a href="#bam-hero" className="bam-back-top">↑ Back to Top</a>
        </section>

        {/* SOVEREIGN RAILS */}
        <section className="bam-sec" id="bam-sovereign">
          <div className="bam-sec-ghost">04</div>
          <div className="bam-sov-tag bam-reveal">Payment Infrastructure</div>
          <h2 className="bam-sov-title bam-reveal bam-d1">No Banks.<br />No Limits.<br /><em>Sovereign Rails.</em></h2>
          <p className="bam-sov-sub bam-reveal bam-d2">BuyAMinute runs on USDT. Deposits and payouts happen on-chain — no intermediaries, no withdrawal caps, no questions. Your rate is your rate. Your earnings are yours.</p>

          <div className="bam-sov-pillars">
            <div className="bam-pillar bam-reveal bam-d1">
              <span className="bam-pillar-glyph">⬡</span>
              <div className="bam-pillar-head">Crypto Deposits &amp; Payouts</div>
              <div className="bam-pillar-body">Fund your account in <strong>USDT</strong>. Sellers receive earnings in USDT. No fiat conversion, no bank intermediary, no settlement delays. The chain settles it.</div>
            </div>
            <div className="bam-pillar bam-reveal bam-d2">
              <span className="bam-pillar-glyph">◈</span>
              <div className="bam-pillar-head">Anonymity by Default</div>
              <div className="bam-pillar-body">Crypto means your identity stays yours. <strong>No name, no bank statement, no transaction trail</strong> linking you to who you called or who called you. Privacy is the infrastructure.</div>
            </div>
            <div className="bam-pillar bam-reveal bam-d3">
              <span className="bam-pillar-glyph">◇</span>
              <div className="bam-pillar-head">Set Any Rate. No Ceiling.</div>
              <div className="bam-pillar-body">Traditional payment systems cap what you can charge and what buyers can transfer. <strong>USDT removes both limits.</strong> If your time is worth $500/min, list it. The market decides.</div>
            </div>
          </div>

          <div className="bam-sov-flow bam-reveal bam-d2">
            <div className="bam-flow-node">
              <div className="bam-flow-node-tag">You deposit</div>
              <div className="bam-flow-node-val usdt">USDT</div>
              <div className="bam-flow-node-sub">Tether stablecoin</div>
            </div>
            <div className="bam-flow-arrow">→</div>
            <div className="bam-flow-node">
              <div className="bam-flow-node-tag">Converted to</div>
              <div className="bam-flow-node-val tok">Tokens</div>
              <div className="bam-flow-node-sub">In-platform credits</div>
            </div>
            <div className="bam-flow-arrow">→</div>
            <div className="bam-sov-flow-label">Call billed<br />per minute</div>
            <div className="bam-flow-arrow">→</div>
            <div className="bam-flow-node">
              <div className="bam-flow-node-tag">Seller receives</div>
              <div className="bam-flow-node-val usdt">USDT</div>
              <div className="bam-flow-node-sub">Instant payout</div>
            </div>
          </div>

          <a href="#bam-hero" className="bam-back-top">↑ Back to Top</a>
        </section>

        <footer className="bam-footer">
          <div className="bam-fl">BUY<span className="na">A</span>MINUTE</div>
          <div className="bam-fc">Voice &amp; Video Calls · Paid by the Minute · © 2025</div>
        </footer>
      </div>
    </>
  );
}

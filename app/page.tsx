"use client";

import { Inter } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { buildAuthRedirect } from "@/components/auth/AuthGuard";

/* ── Font ───────────────────────────────────────────
   The design's body font is Inter; loaded via next/font
   to match the repo's font-loading convention. Georgia
   stays as the system serif the design specifies. */
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-inter-bam",
});

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

  return (
    <div
      className={inter.variable}
      style={{
        fontFamily:
          "var(--font-inter-bam), Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "linear-gradient(180deg, #0a0805, #050403 48%, #020202)",
        color: "#f4ead2",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
      }}
    >
      <style>{`
        @keyframes bam-pulse { 0%, 100% { opacity: 0.45; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.35); } }
        @keyframes bam-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .bam-pulse { width: 7px; height: 7px; background: #00ff88; border-radius: 50%; box-shadow: 0 0 18px #00ff88; animation: bam-pulse 1.25s ease-in-out infinite; display: inline-block; flex-shrink: 0; }
        .bam-pulse-blue { background: #72d7ff; box-shadow: 0 0 18px #72d7ff; }
        .bam-num { font-variant-numeric: tabular-nums; font-family: Georgia, 'Times New Roman', serif; letter-spacing: -0.04em; }

        .bam-nav { height: 52px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; border-bottom: 1px solid rgba(244,234,210,0.08); background: rgba(5,4,3,0.78); backdrop-filter: blur(18px); z-index: 10; }
        @media(max-width:600px){.bam-nav{height:48px;padding:0 20px;}}

        .bam-duo { display: grid; grid-template-columns: 1fr 1px 1fr; height: calc(100dvh - 52px - 48px); flex-shrink: 0; max-width: 1440px; margin: 0 auto; width: 100%; }
        @media(max-width:600px){.bam-duo{height:calc(100dvh - 48px - 48px);}}
        @media(max-width:880px){.bam-duo{grid-template-columns:1fr;height:auto;}}

        .bam-block { position: relative; padding: 16px clamp(20px, 3.5vw, 44px); display: flex; flex-direction: column; justify-content: center; gap: 12px; isolation: isolate; overflow: hidden; height: 100%; min-height: 0; }
        @media(max-width:880px){.bam-block{height:auto;min-height:calc(100dvh - 48px - 48px);}}
        .bam-block::before { content: ''; position: absolute; inset: 0; z-index: -1; opacity: 0.55; }
        .bam-block-buyer::before { background: radial-gradient(ellipse 70% 60% at 18% 22%, rgba(114,215,255,0.16), transparent 55%); }
        .bam-block-seller::before { background: radial-gradient(ellipse 70% 60% at 82% 22%, rgba(0,255,136,0.14), transparent 55%); }

        .bam-eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: clamp(9px, 0.9vw, 11px); letter-spacing: 0.2em; text-transform: uppercase; color: rgba(244,234,210,0.7); }
        .bam-eyebrow-buyer { color: #72d7ff; }
        .bam-eyebrow-seller { color: #00ff88; }

        .bam-hero-headline { font-family: Georgia, "Times New Roman", serif; font-weight: 400; font-style: italic; font-size: clamp(22px, 2.6vw, 36px); line-height: 1.04; letter-spacing: -0.04em; margin: 0; max-width: 18ch; }
        .bam-hero-buyer .bam-hero-headline em { font-style: normal; color: #72d7ff; }
        .bam-hero-seller .bam-hero-headline em { font-style: normal; color: #00ff88; }

        .bam-audience { font-family: Georgia, "Times New Roman", serif; font-size: clamp(13px, 1vw, 15px); line-height: 1.4; letter-spacing: -0.015em; color: rgba(244,234,210,0.85); max-width: 30ch; margin: 0; }
        .bam-mechanic { font-family: Georgia, "Times New Roman", serif; font-style: italic; font-size: clamp(11px, 0.85vw, 13px); line-height: 1.45; color: rgba(244,234,210,0.55); max-width: 32ch; margin: 0; }

        .bam-stat-strip { display: flex; gap: 18px; padding: 8px 12px; border-radius: 10px; background: rgba(255,255,255,0.025); border: 1px solid rgba(244,234,210,0.08); align-items: baseline; max-width: 460px; }
        .bam-stat-strip-buyer { border-color: rgba(114,215,255,0.22); background: linear-gradient(180deg, rgba(114,215,255,0.045), rgba(114,215,255,0.01)); }
        .bam-stat-strip-seller { border-color: rgba(0,255,136,0.22); background: linear-gradient(180deg, rgba(0,255,136,0.045), rgba(0,255,136,0.01)); }
        .bam-stat-value { font-family: Georgia, serif; font-size: clamp(18px, 1.8vw, 24px); line-height: 1; letter-spacing: -0.035em; }
        .bam-stat-buyer .bam-stat-value { color: #72d7ff; }
        .bam-stat-seller .bam-stat-value { color: #00ff88; }
        .bam-stat-label { font-size: clamp(8px, 0.7vw, 9px); letter-spacing: 0.16em; text-transform: uppercase; color: rgba(244,234,210,0.5); margin-top: 3px; }
        .bam-stat-sub { font-size: clamp(8px, 0.65vw, 9px); color: rgba(244,234,210,0.35); margin-top: 1px; font-style: italic; }

        .bam-door { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; text-decoration: none; color: inherit; position: relative; overflow: hidden; isolation: isolate; cursor: pointer; transition: transform 0.25s, border-color 0.25s, background 0.25s; border-radius: 14px; border: 1px solid; flex-shrink: 0; width: 100%; text-align: left; font-family: inherit; }
        .bam-door::before { content: ''; position: absolute; inset: 0; z-index: -1; opacity: 0.35; transition: opacity 0.25s; }
        .bam-door-buyer { border-color: rgba(114,215,255,0.4); background: linear-gradient(180deg, rgba(114,215,255,0.1), rgba(114,215,255,0.03)); }
        .bam-door-buyer::before { background: radial-gradient(circle at 15% 30%, rgba(114,215,255,0.4), transparent 55%); }
        .bam-door-seller { border-color: rgba(0,255,136,0.4); background: linear-gradient(180deg, rgba(0,255,136,0.1), rgba(0,255,136,0.03)); }
        .bam-door-seller::before { background: radial-gradient(circle at 15% 30%, rgba(0,255,136,0.36), transparent 55%); }
        .bam-door:hover { transform: translateY(-3px); }
        .bam-door:hover::before { opacity: 0.6; }
        .bam-door-label { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .bam-door-kicker { font-size: clamp(8px, 0.7vw, 10px); letter-spacing: 0.2em; text-transform: uppercase; color: rgba(244,234,210,0.55); }
        .bam-door-title { font-family: Georgia, serif; font-size: clamp(15px, 1.5vw, 21px); font-weight: 400; letter-spacing: -0.035em; line-height: 1; }
        .bam-door-buyer .bam-door-title { color: #72d7ff; }
        .bam-door-seller .bam-door-title { color: #00ff88; }
        .bam-door-arrow { font-size: clamp(18px, 1.8vw, 22px); color: rgba(244,234,210,0.55); transition: transform 0.25s; flex-shrink: 0; }
        .bam-door:hover .bam-door-arrow { transform: translateX(4px); }

        .bam-divider { background: linear-gradient(180deg, transparent, rgba(244,234,210,0.12) 12%, rgba(244,234,210,0.12) 88%, transparent); position: relative; }
        .bam-divider::after { content: '·'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; border-radius: 50%; background: #0a0805; border: 1px solid rgba(244,234,210,0.12); display: grid; place-items: center; font-size: 12px; color: rgba(244,234,210,0.4); font-family: Georgia, serif; }
        @media(max-width:880px){.bam-divider{display:none;}}

        .bam-pulse-strip { height: 48px; flex-shrink: 0; background: rgba(5,4,3,0.95); border-top: 1px solid rgba(244,234,210,0.08); border-bottom: 1px solid rgba(244,234,210,0.08); overflow: hidden; display: flex; align-items: center; position: relative; }
        .bam-pulse-strip::before, .bam-pulse-strip::after { content: ''; position: absolute; top: 0; bottom: 0; width: 140px; z-index: 2; pointer-events: none; }
        .bam-pulse-strip::before { left: 0; background: linear-gradient(90deg, rgba(5,4,3,1), transparent); }
        .bam-pulse-strip::after { right: 0; background: linear-gradient(-90deg, rgba(5,4,3,1), transparent); }
        .bam-pulse-track { display: flex; gap: 48px; white-space: nowrap; animation: bam-marquee 60s linear infinite; will-change: transform; }
        .bam-pulse-item { display: inline-flex; align-items: center; gap: 10px; font-size: 12px; letter-spacing: 0.04em; color: rgba(244,234,210,0.55); }
        .bam-pulse-item strong { color: #f4ead2; font-weight: 500; }
        .bam-pulse-item .amount-green { color: #00ff88; font-family: Georgia, serif; font-style: italic; font-size: 14px; letter-spacing: -0.02em; }
        .bam-pulse-item .amount-blue { color: #72d7ff; font-family: Georgia, serif; font-style: italic; font-size: 14px; letter-spacing: -0.02em; }

        /* ── MARKET SYNTHESIS ── */
        .bam-synthesis {
          text-align: center;
          padding: clamp(64px, 8vw, 112px) clamp(24px, 4vw, 48px) clamp(48px, 6vw, 80px);
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(20px, 2.4vw, 28px);
        }
        .bam-synthesis-eyebrow {
          font-size: clamp(9px, 0.85vw, 11px);
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: rgba(233,185,73,0.6);
          display: inline-flex;
          align-items: center;
          gap: 14px;
        }
        .bam-synthesis-eyebrow::before,
        .bam-synthesis-eyebrow::after {
          content: '';
          width: clamp(28px, 4vw, 48px);
          height: 1px;
          background: rgba(233,185,73,0.3);
        }
        .bam-synthesis-headline {
          font-family: Georgia, "Times New Roman", serif;
          font-style: italic;
          font-weight: 400;
          font-size: clamp(26px, 3.2vw, 42px);
          line-height: 1.18;
          letter-spacing: -0.035em;
          color: #f4ead2;
          margin: 0;
          max-width: 22ch;
        }
        .bam-synthesis-headline em {
          font-style: italic;
          color: #e9b949;
        }
        .bam-synthesis-body {
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(14px, 1.15vw, 17px);
          line-height: 1.65;
          letter-spacing: -0.005em;
          color: rgba(244,234,210,0.6);
          margin: 0;
          max-width: 56ch;
        }
        .bam-synthesis-body p { margin: 0 0 0.7em; }
        .bam-synthesis-body p:last-child { margin-bottom: 0; }
        .bam-synthesis-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          padding: 8px 4px 10px;
          font-family: Georgia, "Times New Roman", serif;
          font-style: italic;
          font-size: clamp(14px, 1.1vw, 16px);
          letter-spacing: -0.01em;
          color: #e9b949;
          text-decoration: none;
          border: none;
          background: none;
          cursor: pointer;
          border-bottom: 1px solid rgba(233,185,73,0.3);
          transition: border-color 0.25s, color 0.25s, gap 0.25s;
        }
        .bam-synthesis-link:hover {
          color: #f3cc6d;
          border-color: rgba(233,185,73,0.7);
          gap: 12px;
        }
        .bam-synthesis-link .arrow {
          font-size: 0.9em;
          color: rgba(233,185,73,0.7);
          transition: transform 0.25s;
        }
        .bam-synthesis-link:hover .arrow { transform: translate(2px, -2px); }

        .bam-nav-links button {
          background: none; border: none; cursor: pointer; padding: 0;
          font-family: inherit; color: inherit;
          font-size: clamp(9px, 1vw, 11px); letter-spacing: 0.13em; text-transform: uppercase;
        }
      `}</style>

      <nav className="bam-nav">
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: "clamp(18px, 1.8vw, 22px)",
            letterSpacing: "-0.03em",
          }}
        >
          buyaminute
        </div>
        <div
          className="bam-nav-links"
          style={{
            display: "flex",
            gap: 22,
            alignItems: "center",
            fontSize: "clamp(9px, 1vw, 11px)",
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            color: "rgba(244,234,210,0.55)",
          }}
        >
          <button onClick={goLogin}>Log in</button>
          <button onClick={goSignup} style={{ color: "#e9b949" }}>
            Start earning
          </button>
        </div>
      </nav>

      <div className="bam-duo">
        <section className="bam-block bam-block-buyer bam-hero-buyer">
          <div className="bam-eyebrow bam-eyebrow-buyer">
            <span className="bam-pulse bam-pulse-blue"></span>
            You want to reach someone
          </div>

          <h1 className="bam-hero-headline">
            Stop hoping for a reply or attention when you can <em>buy it.</em>
          </h1>

          <p className="bam-audience">
            Your crush. Your mentor. The random stranger on TikTok or IG.
          </p>

          <p className="bam-mechanic">
            They&apos;ll answer when there&apos;s money on the line.
          </p>

          <div className="bam-stat-strip bam-stat-strip-buyer bam-stat-buyer">
            <div>
              <div className="bam-num bam-stat-value">11 min</div>
              <div className="bam-stat-label">Avg pickup time</div>
              <div className="bam-stat-sub">vs. 4 days on cold DM</div>
            </div>
            <div
              style={{
                width: 1,
                alignSelf: "stretch",
                background: "rgba(244,234,210,0.1)",
              }}
            ></div>
            <div>
              <div className="bam-num bam-stat-value">68%</div>
              <div className="bam-stat-label">Accept rate</div>
              <div className="bam-stat-sub">paid invites sent</div>
            </div>
          </div>

          <button
            className="bam-door bam-door-buyer"
            type="button"
            onClick={goBuyer}
          >
            <span className="bam-door-label">
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

        <div className="bam-divider"></div>

        <section className="bam-block bam-block-seller bam-hero-seller">
          <div className="bam-eyebrow bam-eyebrow-seller">
            <span className="bam-pulse"></span>
            Someone wants to reach you
          </div>

          <h1 className="bam-hero-headline">
            Get paid by fans, friends, or anyone who wants a voice or video call{" "}
            <em>with you.</em>
          </h1>

          <p className="bam-audience">
            You set the call rates. Earn by the minute.
          </p>

          <p className="bam-mechanic">
            No ceiling. No floor. Your phone, your rules.
          </p>

          <div className="bam-stat-strip bam-stat-strip-seller bam-stat-seller">
            <div>
              <div className="bam-num bam-stat-value">$94k</div>
              <div className="bam-stat-label">Earned this week</div>
              <div className="bam-stat-sub">all categories</div>
            </div>
            <div
              style={{
                width: 1,
                alignSelf: "stretch",
                background: "rgba(244,234,210,0.1)",
              }}
            ></div>
            <div>
              <div className="bam-num bam-stat-value">2,847</div>
              <div className="bam-stat-label">Calls today</div>
              <div className="bam-stat-sub">across the line</div>
            </div>
          </div>

          <button
            className="bam-door bam-door-seller"
            type="button"
            onClick={goSeller}
          >
            <span className="bam-door-label">
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
      </div>

      <div className="bam-pulse-strip">
        <div className="bam-pulse-track">
          <span className="bam-pulse-item">
            <span className="bam-pulse"></span> <strong>@lila.mood</strong>{" "}
            picked up · <span className="amount-green">+$40.00</span> in flight
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse bam-pulse-blue"></span> Offer sent to{" "}
            <strong>@vc_partner</strong> ·{" "}
            <span className="amount-blue">$1,500</span> on the line
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse"></span> <strong>@dr_park</strong>{" "}
            connected · <span className="amount-green">+$30.00</span> /min
            running
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse bam-pulse-blue"></span>{" "}
            <strong>@maya_creator</strong> opened a fan call ·{" "}
            <span className="amount-blue">$4/min</span>
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse"></span> <strong>@coach_jay</strong> rate
            just set · <span className="amount-green">$7.50/min</span>
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse bam-pulse-blue"></span>{" "}
            <strong>@founder.k</strong> reached <strong>@naval</strong> ·{" "}
            <span className="amount-blue">$150/min</span> · picked up
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse"></span> <strong>@marcus.re</strong>{" "}
            closed a 9-min consult ·{" "}
            <span className="amount-green">+$135.00</span>
          </span>

          <span className="bam-pulse-item">
            <span className="bam-pulse"></span> <strong>@lila.mood</strong>{" "}
            picked up · <span className="amount-green">+$40.00</span> in flight
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse bam-pulse-blue"></span> Offer sent to{" "}
            <strong>@vc_partner</strong> ·{" "}
            <span className="amount-blue">$1,500</span> on the line
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse"></span> <strong>@dr_park</strong>{" "}
            connected · <span className="amount-green">+$30.00</span> /min
            running
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse bam-pulse-blue"></span>{" "}
            <strong>@maya_creator</strong> opened a fan call ·{" "}
            <span className="amount-blue">$4/min</span>
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse"></span> <strong>@coach_jay</strong> rate
            just set · <span className="amount-green">$7.50/min</span>
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse bam-pulse-blue"></span>{" "}
            <strong>@founder.k</strong> reached <strong>@naval</strong> ·{" "}
            <span className="amount-blue">$150/min</span> · picked up
          </span>
          <span className="bam-pulse-item">
            <span className="bam-pulse"></span> <strong>@marcus.re</strong>{" "}
            closed a 9-min consult ·{" "}
            <span className="amount-green">+$135.00</span>
          </span>
        </div>
      </div>

      <section className="bam-synthesis">
        <div className="bam-synthesis-eyebrow">The market</div>

        <h2 className="bam-synthesis-headline">
          BuyAMinute turns reachability <em>into a market.</em>
        </h2>

        <div className="bam-synthesis-body">
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

        <button className="bam-synthesis-link" type="button" onClick={goMain}>
          See our main landing page — both sides
          <span className="arrow">↗</span>
        </button>
      </section>

      <div
        style={{
          padding: "24px 32px",
          borderTop: "1px solid rgba(244,234,210,0.08)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "rgba(244,234,210,0.3)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            color: "rgba(244,234,210,0.5)",
            textTransform: "none",
            letterSpacing: "-0.02em",
            fontSize: 14,
          }}
        >
          buyaminute
        </span>
        <span>Voice &amp; video · paid by the second · 2026</span>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Section from "@/components/ui/Section";
import styles from "./page.module.css";

const stats = [
  { label: "Min Rate", value: "$0.10" },
  {
    label: "Free Preview",
    value: "30s",
    footnote: "One free preview per person every 24 hours.",
  },
  { label: "Set Any Rate", value: "∞" },
];

const dualModes = [
  {
    icon: "💸",
    title: "Get Paid",
    description: "Set your rate. Go live.",
    highlight: "Earn per second",
  },
  {
    icon: "🎯",
    title: "Request a Call",
    description: "See the rate. Meet the 1-minute minimum.",
    highlight: "20 seconds to accept",
  },
  {
    icon: "📍",
    title: "Paid Availability Ping",
    description: "No texting. Pay a small fee to ask",
    highlight: "“Available now?”",
  },
];

const receiveSteps = [
  {
    title: "Set Your Rate",
    description:
      "Choose any rate ≥ $0.10/min. Change it anytime with a 24-hour cooldown.",
  },
  {
    title: "Go Live",
    description:
      "Turn availability ON to receive requests. OFF means no one can call you.",
  },
  {
    title: "Accept or Decline (20s)",
    description:
      "You see caller + type + rate + minimum requirement. You have 20 seconds to decide.",
  },
  {
    title: "Get Paid",
    description:
      "Per-second billing after preview. Withdraw to USDT (TRC20) via manual request.",
  },
];

const callSteps = [
  {
    title: "Find Someone Live",
    description: "Browse available icons. See their rate and public earnings.",
  },
  {
    title: "Buy Credits",
    description: "Add USDT (TRC20) to your wallet. You need at least 1 minute worth to request.",
  },
  {
    title: "Request Call",
    description:
      "Tap “Buy a Minute.” Choose voice or video (only if the receiver allows video).",
  },
  {
    title: "Preview → Bill Per Second",
    description:
      "30s free preview (once per 24h per pair), then billing starts. End anytime. You are only charged for billable seconds.",
  },
];

const pingSteps = [
  {
    title: "Tap “Check Availability”",
    description: "Pay a small flat fee (non-refundable). No typing. No conversation.",
  },
  {
    title: "Choose a Preset",
    description: "“Available now?” “Available later today?” “When’s a good time?”",
  },
  {
    title: "One-Tap Reply",
    description: "Receiver responds: Available now / Available later / Not available.",
  },
  {
    title: "Then You Request a Call",
    description: "If they’re live, the 20-second accept window applies. No DMs, ever.",
  },
];

export default function HomePage() {
  const [wireframe, setWireframe] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("buyaminute_wireframe");
    if (saved === "1") {
      setWireframe(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("buyaminute_wireframe", wireframe ? "1" : "0");
  }, [wireframe]);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!elements.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.isVisible);
          }
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -50px 0px" }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.page} data-wireframe={wireframe ? "on" : "off"}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <Nav />

      <div className={styles.previewBar} aria-label="Preview controls">
        <span className={styles.previewPill}>Wireframe</span>
        <input
          id="wireframeToggle"
          className={styles.toggle}
          type="checkbox"
          aria-label="Toggle wireframe mode"
          checked={wireframe}
          onChange={(event) => setWireframe(event.target.checked)}
        />
      </div>

      <Section className={styles.heroSection}>
        <div className={styles.tickerWrapper} aria-hidden="true">
          <div className={styles.ticker}>
            PAY OR GET PAID · PAY OR GET PAID · PAY OR GET PAID · PAY OR GET PAID ·
          </div>
          <div className={styles.ticker}>
            EVERY USER IS AN ICON · EVERY USER IS AN ICON · EVERY USER IS AN ICON ·
          </div>
          <div className={styles.ticker}>
            BUYAMINUTE · BUYAMINUTE · BUYAMINUTE · BUYAMINUTE · BUYAMINUTE ·
          </div>
          <div className={styles.ticker}>
            $0.10/min · $0.10/min · $0.10/min · $0.10/min · $0.10/min ·
          </div>
        </div>

        <Container className={styles.heroContainer}>
          <div className={styles.heroLogo}>BUYAMINUTE</div>
          <h1 className={styles.mainHeadline}>
            Every user is an <span className={styles.iconText}>ICON</span>.
            <br />
            Pay for their attention.
            <br />
            Or get paid for yours.
          </h1>
          <p className={styles.subheadline}>
            Everyone is accessible when you buyaminute — but only when they’re live.
          </p>
          <div className={styles.rulesStrip}>
            <strong>No DMs. No free chat.</strong> Every interaction is paid or doesn’t exist.
          </div>

          <div className={styles.dualMode}>
            {dualModes.map((mode) => (
              <div
                key={mode.title}
                className={`${styles.modeCard} ${styles.reveal}`}
                data-reveal
              >
                <div className={styles.modeIcon}>{mode.icon}</div>
                <h3 className={styles.modeTitle}>{mode.title}</h3>
                <p className={styles.modeDescription}>
                  {mode.description} <span className={styles.modeHighlight}>{mode.highlight}</span>.
                </p>
              </div>
            ))}
          </div>

          <div className={styles.statsGrid}>
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`${styles.stat} ${styles.reveal}`}
                data-reveal
              >
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
                {stat.footnote ? <p className={styles.statFootnote}>{stat.footnote}</p> : null}
              </div>
            ))}
          </div>

          <div className={styles.ctaContainer}>
            <Button href="/signup" size="lg" className={styles.ctaPrimary}>
              Start Earning
            </Button>
            <Button href="/browse" variant="ghost" size="lg" className={styles.ctaSecondary}>
              Make a Call
            </Button>
          </div>
        </Container>
      </Section>

      <Section className={styles.howItWorks}>
        <Container>
          <h2 className={styles.sectionTitle}>Two Ways to Use BuyAMinute</h2>
          <p className={styles.sectionSubtitle}>
            One account. One profile. You become the caller when you initiate — and the icon when
            you receive. No free chat. Paid calls + paid pings only.
          </p>

          <div className={styles.flowContainer}>
            <div
              className={`${styles.flowSection} ${styles.reveal}`}
              id="start-earning"
              data-reveal
            >
              <div className={styles.flowHeader}>
                <span className={styles.flowLabel}>Receive Mode</span>
                <h3 className={styles.flowTitle}>Earn from Your Time</h3>
                <p className={styles.flowDescription}>When someone calls you, you’re the icon.</p>
              </div>
              <div className={styles.stepsGrid}>
                {receiveSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className={`${styles.step} ${styles.reveal}`}
                    data-reveal
                  >
                    <div className={styles.stepNumber}>{index + 1}</div>
                    <h4 className={styles.stepTitle}>{step.title}</h4>
                    <p className={styles.stepDescription}>{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`${styles.flowSection} ${styles.reveal}`}
              id="make-a-call"
              data-reveal
            >
              <div className={styles.flowHeader}>
                <span className={styles.flowLabel}>Call Mode</span>
                <h3 className={styles.flowTitle}>Access Someone’s Time</h3>
                <p className={styles.flowDescription}>When you initiate, you’re the caller.</p>
              </div>
              <div className={styles.stepsGrid}>
                {callSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className={`${styles.step} ${styles.reveal}`}
                    data-reveal
                  >
                    <div className={styles.stepNumber}>{index + 1}</div>
                    <h4 className={styles.stepTitle}>{step.title}</h4>
                    <p className={styles.stepDescription}>{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${styles.flowSection} ${styles.reveal}`} data-reveal>
              <div className={styles.flowHeader}>
                <span className={styles.flowLabel}>No Chat Replacement</span>
                <h3 className={styles.flowTitle}>Paid Availability Ping</h3>
                <p className={styles.flowDescription}>Check availability without messaging.</p>
              </div>
              <div className={styles.stepsGrid}>
                {pingSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className={`${styles.step} ${styles.reveal}`}
                    data-reveal
                  >
                    <div className={styles.stepNumber}>{index + 1}</div>
                    <h4 className={styles.stepTitle}>{step.title}</h4>
                    <p className={styles.stepDescription}>{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section className={styles.proofSection}>
        <Container>
          <h2 className={styles.sectionTitle}>No Free Interaction</h2>
          <div className={styles.proofStats}>
            {[
              { value: "0", label: "Free Messages" },
              { value: "0", label: "Free Calls" },
              { value: "100%", label: "Paid Attention" },
            ].map((item) => (
              <div
                key={item.label}
                className={`${styles.proofStat} ${styles.reveal}`}
                data-reveal
              >
                <span className={styles.proofValue}>{item.value}</span>
                <span className={styles.proofLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <footer className={styles.footer}>
        <p>© 2026 BuyAMinute. Every user is an icon. Pay or get paid.</p>
      </footer>
    </main>
  );
}

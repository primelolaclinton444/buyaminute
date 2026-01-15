"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Section from "@/components/ui/Section";
import styles from "./page.module.css";

const stats = [
  { label: "Min Rate", value: "$0.10/min" },
  { label: "Preview", value: "30s", footnote: "One free preview per pair every 24 hours." },
  { label: "Clearing", value: "Per Second" },
];

const modeCards = [
  {
    title: "Receive Mode",
    description: "When someone initiates, you are the icon.",
    highlight: "Set your rate. Go live. Earn per second.",
  },
  {
    title: "Call Mode",
    description: "When you initiate, you are the caller.",
    highlight: "See the rate. Prepay at least one minute.",
  },
];

const transactionSteps = [
  {
    title: "Request",
    description: "Caller chooses a live icon, sees rate, and pre-authorizes time.",
  },
  {
    title: "Decision (20s)",
    description: "Icon sees caller + type + prepaid minutes and accepts or declines.",
  },
  {
    title: "Preview (30s)",
    description: "One free preview per pair every 24 hours. No billing during preview.",
  },
  {
    title: "Billing",
    description: "Per-second billing after preview. End anytime. Unused time returns.",
  },
];

const protocolChecklist = [
  {
    title: "Rate Floor",
    description: "Set any rate ≥ $0.10/min. Changes allowed after a 24-hour cooldown.",
  },
  {
    title: "Live Gate",
    description: "OFF means unreachable. ON means requestable.",
  },
  {
    title: "No DMs",
    description: "No free chat. Paid calls + paid pings only.",
  },
  {
    title: "Settlement",
    description: "Per-second billing after preview. Withdraw to USDT (TRC20) via manual request.",
  },
];

const optionalMechanics = [
  {
    title: "Preview Safeguard",
    description:
      "30s preview is a control step, not a conversation. One free preview per pair every 24 hours.",
  },
  {
    title: "Availability Ping (Optional)",
    description:
      "Pay a small flat fee to ask availability. Presets only. No texting. No conversation.",
  },
];

const pingRules = [
  "Presets: “Available now?” · “Available later today?” · “When’s a good time?”",
  "Replies: Available now · Available later · Not available.",
  "If they’re live, the 20-second decision window applies.",
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

  return (
    <main className={styles.page} data-wireframe={wireframe ? "on" : "off"}>
      <div className={styles.heroGlow} aria-hidden="true" />
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
            <span className={styles.headlineLine}>
              Imagine fans, random strangers, or acquaintances{" "}
              <span className={styles.emphasis}>wanting your attention</span> badly enough to pay
              you for it.
            </span>
            <span className={styles.headlineLine}>
              Or you, finally reaching someone <span className={styles.emphasis}>worth reaching</span>—
            </span>
          </h1>
          <div className={styles.supportingBlock}>
            <p>
              BuyAMinute turns reachability into a market.
              <br />
              No DMs. No free chat. Only paid access.
              <br />
              If they’re live, you can buy a minute (video or call).
              <br />
              If you’re live, you can sell yours.
            </p>
          </div>

          <div className={styles.ctaContainer}>
            <Button
              href="/signup"
              size="lg"
              className={`${styles.ctaPrimary} ${styles.ctaGlow}`}
            >
              Enter to Earn
            </Button>
            <Button href="/browse" variant="ghost" size="lg" className={styles.ctaSecondary}>
              Enter to Call
            </Button>
          </div>
        </Container>
      </Section>

      <Section className={styles.roleSection} id="modes">
        <Container>
          <p className={styles.sectionEyebrow}>Who Participates</p>
          <h2 className={styles.sectionTitle}>One Account. Two Modes.</h2>
          <p className={styles.sectionSubtitle}>
            You are not choosing an identity. You switch modes based on action: initiate = caller,
            receive = icon.
          </p>
          <div className={styles.modeGrid}>
            {modeCards.map((mode) => (
              <div key={mode.title} className={styles.modeCard}>
                <h3 className={styles.modeTitle}>{mode.title}</h3>
                <p className={styles.modeDescription}>{mode.description}</p>
                <p className={styles.modeHighlight}>{mode.highlight}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section className={styles.browseSection} id="browse">
        <Container>
          <p className={styles.sectionEyebrow}>Primary Entry Surface</p>
          <h2 className={styles.sectionTitle}>Browse Icons</h2>
          <p className={styles.sectionSubtitle}>
            This is a market surface for reachability. Live status gates access. Rates are visible
            before you request.
          </p>
          <div className={styles.browsePanel}>
            <div>
              <h3 className={styles.panelTitle}>Live First. Rates Visible.</h3>
              <p className={styles.panelBody}>
                You do not message. You request paid access. If they are live, you can buy a minute.
              </p>
            </div>
            <Button href="/browse" size="lg" className={styles.ctaPrimary}>
              Browse Icons
            </Button>
          </div>
        </Container>
      </Section>

      <Section className={styles.transactionSection} id="flow">
        <Container>
          <p className={styles.sectionEyebrow}>How It Works</p>
          <h2 className={styles.sectionTitle}>Transaction Path</h2>
          <p className={styles.sectionSubtitle}>
            Request → decision → preview → billing. The sequence is fixed.
          </p>
          <div className={styles.stepsGrid}>
            {transactionSteps.map((step, index) => (
              <div key={step.title} className={styles.step}>
                <div className={styles.stepNumber}>{index + 1}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section className={styles.instrumentSection} id="instrument">
        <Container>
          <p className={styles.sectionEyebrow}>What Enforces It</p>
          <h2 className={styles.sectionTitle}>Time Is the Instrument</h2>
          <p className={styles.sectionSubtitle}>
            Not attention. Not fame. Time. Paid access only.
          </p>
          <div className={styles.statsGrid}>
            {stats.map((stat) => (
              <div key={stat.label} className={styles.stat}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
                {stat.footnote ? <p className={styles.statFootnote}>{stat.footnote}</p> : null}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section className={styles.protocolSection} id="protocol">
        <Container>
          <p className={styles.sectionEyebrow}>Protocol</p>
          <h2 className={styles.sectionTitle}>System Checklist</h2>
          <p className={styles.sectionSubtitle}>A contract, not a conversation.</p>
          <div className={styles.protocolGrid}>
            {protocolChecklist.map((item, index) => (
              <div key={item.title} className={styles.protocolItem}>
                <div className={styles.protocolNumber}>{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <h3 className={styles.protocolTitle}>{item.title}</h3>
                  <p className={styles.protocolDescription}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section className={styles.optionalSection} id="optional">
        <Container>
          <p className={styles.sectionEyebrow}>Optional Mechanics</p>
          <h2 className={styles.sectionTitle}>Safeguards & Pings</h2>
          <p className={styles.sectionSubtitle}>
            These do not replace the core transaction. They reduce waste.
          </p>
          <div className={styles.optionalGrid}>
            <div className={styles.optionalCard}>
              <h3 className={styles.optionalTitle}>{optionalMechanics[0].title}</h3>
              <p className={styles.optionalDescription}>{optionalMechanics[0].description}</p>
            </div>
            <div className={styles.optionalCard}>
              <h3 className={styles.optionalTitle}>{optionalMechanics[1].title}</h3>
              <p className={styles.optionalDescription}>{optionalMechanics[1].description}</p>
              <ul className={styles.optionalList}>
                {pingRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      <Section className={styles.finalSection} id="enter">
        <Container className={styles.finalContainer}>
          <div>
            <p className={styles.sectionEyebrow}>Entry Intent</p>
            <h2 className={styles.sectionTitle}>Choose How You Enter</h2>
            <p className={styles.sectionSubtitle}>
              One account. Two modes. Pick your intent for this session.
            </p>
          </div>
          <div className={styles.ctaContainer}>
            <Button
              href="/signup"
              size="lg"
              className={`${styles.ctaPrimary} ${styles.ctaGlow}`}
            >
              Enter to Earn
            </Button>
            <Button href="/browse" variant="ghost" size="lg" className={styles.ctaSecondary}>
              Enter to Call
            </Button>
          </div>
        </Container>
      </Section>

      <footer className={styles.footer}>
        <p>© 2026 BuyAMinute. Every user is an icon. Pay or get paid.</p>
      </footer>
    </main>
  );
}

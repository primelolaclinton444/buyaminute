"use client";

import { useState } from "react";
import { IBM_Plex_Mono, Libre_Baskerville } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import { buildAuthRedirect } from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Section from "@/components/ui/Section";
import styles from "./page.module.css";

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre-baskerville",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-ibm-plex-mono",
});

const stats = [
  { label: "Min Rate", value: "$0.10/min" },
  { label: "Preview", value: "30s", footnote: "One free preview per pair every 24 hours." },
  { label: "Clearing", value: "Per Second" },
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

const prospectsCards = [
  {
    title: "THE UNREACHABLE ICON",
    body: `That person with 10 million followers
who never replies to comments.

Now you don’t beg.
You send a paid call request.`,
    doctrine: "COMMENTS BECOME OFFERS",
  },
  {
    title: "THE IMPOSSIBLE CRUSH",
    body: `Your TikTok crush.
Your Instagram crush.
The person who never opens your messages.

Now you don’t hope.
You pay for 60 seconds.`,
    doctrine: "FLIRTING BECOMES A MARKET",
  },
  {
    title: "THE UNKNOWN SELLER",
    body: `You are not famous.
You are just attractive, interesting, or curious.

Now you can send paid invitations
to anyone you find interesting.`,
    doctrine: "YOU DON’T WAIT TO BE DISCOVERED",
  },
];

const usageRows = [
  { title: "🎯 Comment Section Warfare", text: "“Buy a Minute — $10/min” under every viral post." },
  { title: "📩 DM Invasions", text: "Cold DMs with money attached." },
  { title: "💋 Attraction Arbitrage", text: "Attractive users mass-invite strangers to paid calls." },
  { title: "📞 Celebrity Fishing", text: "Fans coordinate to catch 30 seconds of a famous person." },
  { title: "🚀 Unknown to Paid", text: "New creators monetize before they are famous." },
];

export default function HomePage() {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const { status, expired } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleInviteClick = async () => {
    if (status !== "authenticated") {
      router.push(buildAuthRedirect({ pathname, expired }));
      return;
    }

    setIsCreatingInvite(true);
    setInviteError(null);
    setInviteUrl(null);
    setCopyStatus("idle");

    try {
      const res = await fetch("/api/invites/create", { method: "POST" });
      const data = (await res.json()) as
        | { inviteUrl: string; token: string }
        | { error?: { message?: string } };

      if (!res.ok) {
        const message =
          "error" in data && data.error?.message
            ? data.error.message
            : "Unable to create invite link.";
        setInviteError(message);
        return;
      }

      if ("inviteUrl" in data) {
        setInviteUrl(data.inviteUrl);
      } else {
        setInviteError("Unable to create invite link.");
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Unable to create invite link.");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <main className={`${styles.page} ${libreBaskerville.variable} ${ibmPlexMono.variable}`}>

      {/* =========================
          HERO — STATEMENT COMPOSITION
          ========================= */}
      <Section className={styles.heroSection}>
  <div className={styles.heroContainer}>
    <div className={styles.heroInner}>
      <div className={styles.heroMeasure}>
        <div className={styles.heroGrid}>
          <div className={styles.heroLeft}>
            <p className={styles.heroDoctrine}>
              A NEW MARKET IS HERE.
              <span className={styles.heroDoctrineSub}>Reachability • Time • Access</span>
            </p>

            <h1 className={styles.mainHeadline}>
                Imagine fans, random strangers, or friends
                <br />
                <strong>wanting your attention</strong> badly enough to
                <br />
                pay you for it.
                <br />
                <br />
                Or you, finally reaching <em>that</em> someone
                <br />
                <strong>worth reaching—</strong>
              </h1>

            <p className={styles.heroSystemLine}>
              Every social platform is now a marketplace.
            </p>

            <div className={styles.supportingBlock}>
                <div className={styles.supportingCopy} role="list">
                  <span className={styles.supportingLine} role="listitem">
                    BuyAMinute turns reachability into a market.
                  </span>
                  <span className={styles.supportingLine} role="listitem">
                    No DMs. No free chat. Only paid access.
                  </span>
                  <span className={styles.supportingLine} role="listitem">
                    If they’re live, you can buy a minute (video or call).
                  </span>
                  <span className={styles.supportingLine} role="listitem">
                    If you’re live, you can sell yours.
                  </span>
                </div>
              </div>

            <div className={styles.heroCtasWrap}>
              <p className={styles.ctaLead}>Choose your role:</p>
              <div className={styles.heroCtas}>
                <Button href="/signup" size="lg" className={styles.ctaPrimary}>
                  Enter to Earn
                </Button>
                <Button href="/browse" variant="ghost" size="lg" className={styles.ctaSecondary}>
                  Enter to Call
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className={styles.ctaTertiary}
                  onClick={handleInviteClick}
                  disabled={isCreatingInvite}
                  aria-busy={isCreatingInvite}
                >
                  Invite Someone
                </Button>
              </div>
            </div>

            <p className={styles.heroVow}>REACHABILITY IS NO LONGER FREE.</p>
          </div>

          <aside className={styles.heroPanel} aria-label="What this enables">
  <div className={styles.panelHead}>
    <p className={styles.panelTitle}>WHAT THIS ENABLES</p>
    <p className={styles.panelSubtitle}>This changes how humans pursue attention</p>
  </div>

  <ul className={styles.panelList}>
    <li>You can buy access to people who are unreachable by design.</li>
    <li>You can inject money into any social interaction.</li>
    <li>You can monetize yourself without an audience, platform, or fame.</li>
  </ul>

  <div className={styles.iconSnapshot} aria-label="Icon snapshot">
    <p className={styles.iconLabel}>ICON SNAPSHOT</p>

    <div className={styles.iconHeader}>
      <div className={styles.iconAvatar} aria-hidden="true" />
      <div>
        <p className={styles.iconHandle}>@alex_r</p>
        <p className={styles.iconMeta}>Unknown creator</p>
      </div>
    </div>

    <div className={styles.iconStats}>
      <div className={styles.iconStat}>
        <span className={styles.iconStatValue}>42</span>
        <span className={styles.iconStatLabel}>call offers received</span>
      </div>
      <div className={styles.iconStat}>
        <span className={styles.iconStatValue}>$1,284</span>
        <span className={styles.iconStatLabel}>earned</span>
      </div>
      <div className={styles.iconStat}>
        <span className={styles.iconStatValue}>18</span>
        <span className={styles.iconStatLabel}>minutes sold</span>
      </div>
    </div>

    <p className={styles.iconLast}>Last offer: 2 minutes ago</p>
  </div>

  <div className={styles.liveMarket} aria-label="Live market">
    <div className={styles.liveTop}>
      <span className={styles.liveTitle}>LIVE MARKET</span>
      <span className={styles.liveMeta}>Last call: 11 seconds ago</span>
    </div>

    <div className={styles.liveGrid}>
      <div className={styles.liveStat}>
        <span className={styles.liveVal}>12 icons online</span>
        <span className={styles.liveLbl}>availability</span>
      </div>
      <div className={styles.liveStat}>
        <span className={styles.liveVal}>$0.10 — $42 / min</span>
        <span className={styles.liveLbl}>rates</span>
      </div>
      <div className={styles.liveStat}>
        <span className={styles.liveVal}>clearing: per second</span>
        <span className={styles.liveLbl}>billing</span>
      </div>
    </div>
  </div>
</aside>
        </div>
      </div>
    </div>
  </div>
</Section>

      <Section className={styles.prospectsSection} id="prospects">
        <Container>
          <header className={styles.prospectsHeader}>
            <p className={styles.prospectsEyebrow}>Prospects</p>
            <h2 className={styles.prospectsTitle}>WHO THIS UNLOCKS</h2>
            <p className={styles.prospectsSubtitle}>People you cannot reach today.</p>
          </header>

          <div className={styles.prospectsGrid}>
            {prospectsCards.map((card) => (
              <article key={card.title} className={styles.prospectCard}>
                <h3 className={styles.prospectCardTitle}>{card.title}</h3>

                <div className={styles.prospectVisual} aria-hidden="true">
                  <div className={styles.prospectVisualInset} />
                  <div className={styles.prospectVisualLabel}>CALL OFFER</div>
                </div>

                <p className={styles.prospectCardBody}>{card.body}</p>
                <p className={styles.prospectDoctrine}>{card.doctrine}</p>
              </article>
            ))}
          </div>
        </Container>

        <div className={styles.prospectsBanner} role="presentation">
          <div className={styles.prospectsBannerInner}>
            <p className={styles.prospectsBannerTitle}>THIS TURNS ATTENTION INTO A WEAPON.</p>
            <p className={styles.prospectsBannerSub}>
              You don’t ask for replies. You offer money for time.
            </p>
          </div>
        </div>

        <Container>
          <div className={styles.usageBlock}>
            <h2 className={styles.usageTitle}>HOW PEOPLE WILL ACTUALLY USE THIS</h2>
            <ul className={styles.usageList}>
              {usageRows.map((row) => (
                <li key={row.title} className={styles.usageItem}>
                  <p className={styles.usageItemTitle}>{row.title}</p>
                  <p className={styles.usageItemText}>{row.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.prospectsHandoff}>
            <p className={styles.handoffTitle}>EVERY SOCIAL PLATFORM BECOMES A MARKETPLACE.</p>
            <p className={styles.handoffSub}>
              Anywhere you can post, comment, or DM — you can attach a price to your attention.
            </p>

            <p className={styles.optionalMonoLine}>REACHABILITY IS NO LONGER FREE.</p>
          </div>
        </Container>
      </Section>

      {/* =========================
          ACT 2 — DARK STAGE BEGINS
          ========================= */}
      <Section className={styles.exchangeSection} id="exchange">
        <Container>
          <header className={styles.exchangeHeader}>
            <h2 className={styles.exchangeTitle}>THE EXCHANGE.</h2>
            <p className={styles.exchangeSupportingTitle}>ONE ACCOUNT. TWO MODES.</p>
            <p className={styles.exchangeMicroline}>Two modes. One system. A request becomes a decision.</p>
          </header>

          <div className={styles.exchangeGrid}>
            <article className={styles.exchangeCard}>
              <p className={styles.exchangeCardTitle}>WHEN YOU BUYAMINUTE</p>
              <p className={styles.exchangeCardNote}>(This should feel like dialing a number)</p>
              <ul className={styles.exchangeList}>
                <li>
                  You select the icon and send a{" "}
                  <span className={styles.exchangeHighlight}>paid call request</span> — not a message
                </li>
                <li>
                  You see the icon’s <span className={styles.exchangeHighlight}>rate</span> and{" "}
                  <span className={styles.exchangeHighlight}>pre-authorize time</span>
                </li>
                <li>
                  If the icon is <span className={styles.exchangeHighlight}>live</span>, they receive your request and{" "}
                  <span className={styles.exchangeHighlight}>respond</span>
                </li>
                <li>
                  If your <span className={styles.exchangeHighlight}>prepaid time</span> covers their rate, the call
                  connects
                </li>
              </ul>
            </article>

            <article className={styles.exchangeCard}>
              <p className={styles.exchangeCardTitle}>WHEN YOU CHARGE FOR REACHABILITY</p>
              <p className={styles.exchangeCardNote}>(This should feel like switching into earning mode)</p>
              <ul className={styles.exchangeList}>
                <li>
                  You <span className={styles.exchangeHighlight}>become the icon</span>
                </li>
                <li>
                  You <span className={styles.exchangeHighlight}>set your rate</span> and turn{" "}
                  <span className={styles.exchangeHighlight}>live</span> on
                </li>
                <li>
                  Incoming requests show the <span className={styles.exchangeHighlight}>caller</span> and{" "}
                  <span className={styles.exchangeHighlight}>prepaid time</span>
                </li>
                <li>
                  You <span className={styles.exchangeHighlight}>accept or decline</span> and get{" "}
                  <span className={styles.exchangeHighlight}>paid per second</span>
                </li>
                <li>
                  Your <span className={styles.exchangeHighlight}>rate</span> is the only limit
                </li>
              </ul>
            </article>
          </div>

          <p className={styles.exchangeDoctrine}>
            You are not choosing an identity. You become the caller when you initiate — and the icon when you receive.
          </p>
          <p className={styles.exchangeDoctrineFooter}>Doctrine: Reachability is a paid surface.</p>
        </Container>
      </Section>

      <Section className={styles.browseSection} id="browse">
        <Container>
          <p className={styles.sectionEyebrow}>Primary Entry Surface</p>
          <h2 className={styles.sectionTitle}>Browse Icons</h2>
          <p className={styles.sectionSubtitle}>
            This is a market surface for reachability. Live status gates access. Rates are visible before you request.
          </p>

          <div className={styles.browsePanel}>
            <div className={styles.panelText}>
              <h3 className={styles.panelTitle}>Live First. Rates Visible.</h3>
              <p className={styles.panelBody}>
                You do not message. You request paid access. If they are live, you can buy a minute.
              </p>
            </div>
            <Button href="/browse" size="lg" className={styles.stagePrimary}>
              Browse Icons
            </Button>
          </div>
        </Container>
      </Section>

      <Section className={styles.transactionSection} id="flow">
        <Container>
          <p className={styles.sectionEyebrow}>How It Works</p>
          <h2 className={styles.sectionTitle}>Transaction Path</h2>
          <p className={styles.sectionSubtitle}>Request → decision → preview → billing. The sequence is fixed.</p>

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
          <p className={styles.sectionSubtitle}>Not attention. Not fame. Time. Paid access only.</p>

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
          <p className={styles.sectionSubtitle}>These do not replace the core transaction. They reduce waste.</p>

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

          {/* Invite mechanics moved OUT of hero (no copy changes) */}
          <div className={styles.inviteSection} aria-label="Invite someone">
            <div className={styles.inviteHeaderRow}>
              <Button
                variant="ghost"
                size="md"
                className={styles.inviteAction}
                onClick={handleInviteClick}
                disabled={isCreatingInvite}
                aria-busy={isCreatingInvite}
              >
                Invite Someone
              </Button>
              <p className={styles.inviteMicrocopy}>Create a paid access link</p>
            </div>

            {status === "unauthenticated" ? (
              <p className={styles.inviteHelper}>Log in to create a paid invite link</p>
            ) : null}

            {status === "authenticated" && (inviteUrl || inviteError) ? (
              <div className={styles.invitePanel} role="status" aria-live="polite">
                <p className={styles.inviteLabel}>Share this invite link</p>
                <div className={styles.inviteRow}>
                  <input
                    className={styles.inviteInput}
                    value={inviteUrl ?? ""}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                    aria-label="Invite URL"
                  />
                  <Button
                    variant="ghost"
                    size="md"
                    className={styles.inviteCopyButton}
                    onClick={handleCopyInvite}
                    disabled={!inviteUrl}
                  >
                    {copyStatus === "copied" ? "Copied" : "Copy link"}
                  </Button>
                </div>
                {inviteError ? <p className={styles.inviteError}>{inviteError}</p> : null}
                <p className={styles.inviteFootnote}>Paid access only. No free chat.</p>
                {copyStatus === "error" ? (
                  <p className={styles.inviteError}>Unable to copy. Please select and copy.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </Container>
      </Section>

      <footer className={styles.footer}>
        <p>© 2026 BuyAMinute. Every user is an icon. Pay or get paid.</p>
      </footer>
    </main>
  );
}

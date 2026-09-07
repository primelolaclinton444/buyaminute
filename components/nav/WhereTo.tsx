"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  DEFAULT_RATE_PER_SECOND_TOKENS,
  SECONDS_IN_MINUTE,
  TOKEN_UNIT_USD,
} from "@/lib/constants";

/**
 * "Where to?" — the single navigation surface, right edge, both auth states.
 *
 * Deliberately NOT a notification surface. IncomingCallListener already owns
 * urgency: it backdrops the whole screen, rings and counts down, on every page.
 * So this drawer never carries a badge or a dot, and it closes itself when a
 * call arrives. It exists only for calm, self-directed movement.
 *
 * State is fetched lazily on open and never polled — a closed drawer costs
 * nothing.
 */

/* ─── css ───────────────────────────────────────────────────
   Right edge on purpose: iOS Safari reserves the LEFT edge for the
   back-swipe gesture and the bottom-centre for its own toolbar. The
   right edge at mid-height is the one uncontested anchor on mobile
   web, and it is equally uncontested on desktop — so the drawer keeps
   a single position across every breakpoint and both auth states.

   z-index sits below IncomingCallListener (9998/9999) by design.
──────────────────────────────────────────────────────────── */
const css = `
  .bam-wt-tab {
    position: fixed; right: 0; top: 50%; transform: translateY(-50%);
    z-index: 60; display: flex; align-items: center; gap: 7px;
    padding: 15px 7px;
    background: rgba(10,8,22,0.82);
    border: 1px solid rgba(255,255,255,0.12); border-right: 0;
    border-radius: 10px 0 0 10px;
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    color: rgba(237,232,216,0.62);
    font-family: inherit; font-size: 0.68rem; letter-spacing: 0.14em;
    writing-mode: vertical-rl; cursor: pointer;
    transition: color 0.18s ease, background 0.18s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .bam-wt-tab:hover { color: #ede8d8; background: rgba(14,11,30,0.95); }
  .bam-wt-tab:focus-visible { outline: 2px solid rgba(0,229,255,0.75); outline-offset: -2px; }

  .bam-wt-panel {
    position: fixed; right: 0; top: 50%;
    transform: translate(100%, -50%);
    z-index: 60; width: 258px;
    max-height: 88vh; max-height: 88dvh; overflow-y: auto;
    padding: 15px 14px 16px;
    background: rgba(10,8,22,0.97);
    border: 1px solid rgba(255,255,255,0.13); border-right: 0;
    border-radius: 12px 0 0 12px;
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    box-shadow: -24px 0 60px rgba(0,0,0,0.55);
    transition: transform 0.24s cubic-bezier(0.32,0.72,0,1), visibility 0.24s;
    visibility: hidden;
  }
  .bam-wt-panel-open { transform: translate(0, -50%); visibility: visible; }
  @media (prefers-reduced-motion: reduce) { .bam-wt-panel { transition: none; } }
  @media (max-width: 420px) { .bam-wt-panel { width: min(258px, calc(100vw - 36px)); } }

  .bam-wt-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 13px; }
  .bam-wt-head-label {
    font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase;
    color: rgba(237,232,216,0.42);
  }
  .bam-wt-close {
    background: none; border: 0; padding: 0 2px; font-size: 1.1rem; line-height: 1;
    color: rgba(237,232,216,0.42); cursor: pointer;
  }
  .bam-wt-close:hover { color: #ede8d8; }

  .bam-wt-lede { font-size: 0.74rem; line-height: 1.5; color: rgba(237,232,216,0.45); margin: 0 0 12px; }

  .bam-wt-item {
    display: block; width: 100%; text-align: left;
    background: none; border: 0; border-left: 2px solid rgba(255,255,255,0.11);
    border-radius: 0; padding: 8px 0 8px 11px; margin-bottom: 9px;
    cursor: pointer; text-decoration: none; font-family: inherit;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .bam-wt-item:hover { border-left-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.03); }
  .bam-wt-item:focus-visible { outline: 2px solid rgba(0,229,255,0.75); outline-offset: 2px; }
  .bam-wt-item-title { display: block; font-size: 0.86rem; line-height: 1.3; color: #ede8d8; margin-bottom: 2px; }
  .bam-wt-item-num { display: inline-block; width: 15px; color: rgba(237,232,216,0.35); }
  .bam-wt-item-note { display: block; font-size: 0.72rem; line-height: 1.45; color: rgba(237,232,216,0.38); }

  .bam-wt-rule { height: 1px; background: rgba(255,255,255,0.09); margin: 11px 0 12px; }

  .bam-wt-cta, .bam-wt-cta-ghost {
    display: block; width: 100%; text-align: center; padding: 9px; margin-bottom: 8px;
    border: 0; border-radius: 8px; font-family: inherit; font-size: 0.82rem;
    text-decoration: none; cursor: pointer;
  }
  .bam-wt-cta { background: #ff2070; color: #fff; }
  .bam-wt-cta:hover { background: #ff3a82; }
  .bam-wt-cta-ghost { background: rgba(255,255,255,0.07); color: #ede8d8; }
  .bam-wt-cta-ghost:hover { background: rgba(255,255,255,0.12); }
  .bam-wt-cta:focus-visible, .bam-wt-cta-ghost:focus-visible {
    outline: 2px solid rgba(0,229,255,0.75); outline-offset: 2px;
  }
`;

/* ─── config ────────────────────────────────────────────── */

const HIDDEN_EXACT = ["/login", "/signup"];
const HIDDEN_PREFIX = ["/i/"];
const STALE_MS = 30_000;

type Snapshot = {
  availableTokens: number | null;
  liveCount: number | null;
  isAvailable: boolean | null;
  ratePerMinute: string | null;
  hasProfile: boolean;
  rateIsDefault: boolean;
};

const EMPTY: Snapshot = {
  availableTokens: null,
  liveCount: null,
  isAvailable: null,
  ratePerMinute: null,
  hasProfile: false,
  rateIsDefault: true,
};

const usd = (tokens: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    tokens * TOKEN_UNIT_USD
  );

const people = (n: number) => `${n} ${n === 1 ? "person" : "people"} on the line.`;

/* ─── one row ───────────────────────────────────────────── */

function Item({
  href,
  onClick,
  title,
  note,
  index,
}: {
  href: string;
  onClick: () => void;
  title: string;
  note: string;
  index?: number;
}) {
  return (
    <Link href={href} className="bam-wt-item" onClick={onClick}>
      <span className="bam-wt-item-title">
        {typeof index === "number" ? <span className="bam-wt-item-num">{index}</span> : null}
        {title}
      </span>
      <span className="bam-wt-item-note">{note}</span>
    </Link>
  );
}

/* ─── panel ─────────────────────────────────────────────── */

function WhereToInner() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthed, session } = useAuth();

  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const fetchedAt = useRef(0);
  const tabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const userId = session?.user?.id ?? "";
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] ?? "";
  const isFirstRun = isAuthed && searchParams.get("welcome") === "1";

  /* ── lazy state fetch, only while open ── */
  const hydrate = useCallback(async () => {
    if (Date.now() - fetchedAt.current < STALE_MS) return;
    fetchedAt.current = Date.now();

    const [wallet, browse, profile] = await Promise.allSettled([
      isAuthed ? fetch("/api/wallet/summary").then((r) => (r.ok ? r.json() : null)) : null,
      fetch("/api/browse").then((r) => (r.ok ? r.json() : null)),
      isAuthed && userId
        ? fetch(`/api/ui/receiver/profile/get?userId=${encodeURIComponent(userId)}`).then((r) =>
            r.ok ? r.json() : null
          )
        : null,
    ]);

    const next: Snapshot = { ...EMPTY };

    if (wallet.status === "fulfilled" && wallet.value) {
      next.availableTokens = wallet.value.availableTokens ?? null;
    }

    if (browse.status === "fulfilled" && browse.value?.profiles) {
      next.liveCount = browse.value.profiles.filter(
        (p: { status?: string }) => p.status === "available"
      ).length;
    }

    if (profile.status === "fulfilled" && profile.value?.profile) {
      const p = profile.value.profile;
      next.hasProfile = true;
      next.isAvailable = Boolean(p.isAvailable);
      if (typeof p.ratePerSecondTokens === "number") {
        next.rateIsDefault = p.ratePerSecondTokens === DEFAULT_RATE_PER_SECOND_TOKENS;
        next.ratePerMinute = (
          p.ratePerSecondTokens * SECONDS_IN_MINUTE * TOKEN_UNIT_USD
        ).toFixed(2);
      }
    }

    setSnap(next);
    setLoaded(true);
  }, [isAuthed, userId]);

  useEffect(() => {
    if (open) void hydrate();
  }, [open, hydrate]);

  /* ── open once for a brand-new account, then drop the param ── */
  useEffect(() => {
    if (!isFirstRun) return;
    setOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [isFirstRun, router]);

  /* ── close on route change ── */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /* ── an incoming call takes the screen; get out of its way ── */
  useEffect(() => {
    const onCall = () => setOpen(false);
    window.addEventListener("bam:incoming-call", onCall);
    return () => window.removeEventListener("bam:incoming-call", onCall);
  }, []);

  /* ── escape + outside click ── */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        tabRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !tabRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const hidden =
    HIDDEN_EXACT.includes(pathname) ||
    HIDDEN_PREFIX.some((p) => pathname.startsWith(p)) ||
    /^\/call\/[^/]+$/.test(pathname);

  if (hidden) return null;

  const close = () => setOpen(false);

  /* Setup state = they have not finished becoming reachable yet.
     Covers both "no profile row" and "row exists but untouched", so it
     still fires if signup starts creating a profile eagerly later. */
  const showSetup =
    isAuthed && loaded && (!snap.hasProfile || (snap.rateIsDefault && !snap.isAvailable));

  return (
    <>
      <style>{css}</style>

      {!open ? (
        <button
          ref={tabRef}
          type="button"
          className="bam-wt-tab"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-label="Open navigation"
        >
          <span aria-hidden="true">‹</span>
          {showSetup ? "START HERE" : "WHERE TO?"}
        </button>
      ) : null}

      <div
        ref={panelRef}
        className={open ? "bam-wt-panel bam-wt-panel-open" : "bam-wt-panel"}
        role="dialog"
        aria-label="Navigation"
        aria-hidden={!open}
      >
        <div className="bam-wt-head">
          <span className="bam-wt-head-label">
            {showSetup ? "Start here" : isAuthed && firstName ? `Hi, ${firstName}` : "Where to?"}
          </span>
          <button type="button" className="bam-wt-close" onClick={close} aria-label="Close">
            ›
          </button>
        </div>

        {!isAuthed ? (
          <>
            <Link href="/signup" className="bam-wt-cta" onClick={close}>
              Sign up
            </Link>
            <Link href="/login" className="bam-wt-cta-ghost" onClick={close}>
              Log in
            </Link>
            <div className="bam-wt-rule" />
            <Item
              href="/buyer"
              onClick={close}
              title="Explore the buying side"
              note="Pay to reach anyone, anywhere."
            />
            <Item
              href="/seller"
              onClick={close}
              title="Explore the earning side"
              note="Set a rate. Get paid to answer."
            />
            <Item
              href="/main"
              onClick={close}
              title="Compare both sides"
              note="See them next to each other."
            />
            <Item
              href="/"
              onClick={close}
              title="Understand how it works"
              note="Per-second billing, explained."
            />
          </>
        ) : showSetup ? (
          <>
            <p className="bam-wt-lede">Three things and you can take your first paid call.</p>
            <Item
              href="/receiver"
              onClick={close}
              index={1}
              title="Set my rate"
              note="Free. Takes fifteen seconds."
            />
            <Item
              href="/receiver"
              onClick={close}
              index={2}
              title="Go live"
              note="You start showing up in search."
            />
            <Item
              href="/receiver"
              onClick={close}
              index={3}
              title="Share my call link"
              note="This is how people reach you."
            />
            <div className="bam-wt-rule" />
            <Item
              href="/browse"
              onClick={close}
              title="Or just look around first"
              note={snap.liveCount === null ? "See who is live right now." : people(snap.liveCount)}
            />
          </>
        ) : (
          <>
            <Item
              href="/receiver"
              onClick={close}
              title="Go to my dashboard"
              note={
                snap.isAvailable === null
                  ? "Your rate and availability."
                  : snap.isAvailable
                  ? `You are live${snap.ratePerMinute ? ` at $${snap.ratePerMinute}/min` : ""}.`
                  : `You are offline${snap.ratePerMinute ? `. $${snap.ratePerMinute}/min set` : ""}.`
              }
            />
            <Item
              href="/wallet"
              onClick={close}
              title="Top up my wallet"
              note={
                snap.availableTokens === null
                  ? "Add funds to make calls."
                  : `${usd(snap.availableTokens)} available.`
              }
            />
            <Item
              href="/browse"
              onClick={close}
              title="See who is live now"
              note={
                snap.liveCount === null
                  ? "Browse people taking calls."
                  : snap.liveCount === 0
                  ? "Nobody on the line right now."
                  : people(snap.liveCount)
              }
            />
            <Item
              href="/call"
              onClick={close}
              title="See my past calls"
              note="Receipts and call history."
            />
            <div className="bam-wt-rule" />
            <Item
              href="/settings"
              onClick={close}
              title="Edit my profile"
              note="Bio, categories, languages."
            />
          </>
        )}
      </div>
    </>
  );
}

export default function WhereTo() {
  return (
    <Suspense fallback={null}>
      <WhereToInner />
    </Suspense>
  );
}

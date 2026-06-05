"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_RATE_PER_SECOND_TOKENS,
  RING_TIMEOUT_SECONDS,
  SECONDS_IN_MINUTE,
  TOKEN_UNIT_USD,
} from "@/lib/constants";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { PING_QUESTION_LABELS, PING_RESPONSE_LABELS } from "@/lib/pings";

/* ─── types ─────────────────────────────────────────────── */
type AvailabilityPing = {
  id: string;
  callerId: string;
  question: string;
  response: string | null;
  createdAt: string;
};

type LedgerEntry = {
  id: string;
  type: string;
  source: string;
  amountTokens: number;
  callId: string | null;
  createdAt: string;
};

type IncomingRequest = {
  id: string;
  caller: string;
  mode: "voice" | "video";
  ratePerMinute: string;
  expiresAt: string;
  status: string;
  summary: string;
};

type ProfileCompleteness = {
  hasBio: boolean;
  hasTagline: boolean;
  hasCategories: boolean;
  hasLanguages: boolean;
  score: number;
};

/* ─── constants ──────────────────────────────────────────── */
const toUsd = (tokens: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    tokens * TOKEN_UNIT_USD
  );

const startOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
};

/* ─── CSS ────────────────────────────────────────────────── */
const css = `
  .bam-rv-wrap { margin: 0 auto; max-width: 860px; padding: 0 24px; }
  .bam-rv-page { padding: 40px 0 80px; display: flex; flex-direction: column; gap: 20px; }
  .bam-rv-heading { font-size: 1.75rem; font-weight: 700; color: #f5f7ff; letter-spacing: -0.02em; margin-bottom: 4px; }
  .bam-rv-sub { font-size: 0.9rem; color: rgba(245,247,255,0.45); }

  /* ── Earnings grid (concept 1) ── */
  .bam-rv-earnings {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  }
  .bam-rv-earn-card {
    background: rgba(12,16,32,0.7); border: 1px solid rgba(124,92,255,0.18);
    border-radius: 18px; padding: 20px; backdrop-filter: blur(10px);
    display: flex; flex-direction: column; gap: 6px;
  }
  .bam-rv-earn-card-accent { border-color: rgba(124,92,255,0.45); }
  .bam-rv-earn-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(245,247,255,0.4); }
  .bam-rv-earn-value { font-size: 1.9rem; font-weight: 800; color: #f5f7ff; letter-spacing: -0.03em; line-height: 1; }
  .bam-rv-earn-value-mag { color: #ff6eb0; }
  .bam-rv-earn-sub { font-size: 0.75rem; color: rgba(245,247,255,0.35); }
  .bam-rv-earn-sub-green { color: rgba(74,222,128,0.8); }

  /* ── Milestone bar (concept 5) ── */
  .bam-rv-milestone {
    background: rgba(12,16,32,0.7); border: 1px solid rgba(124,92,255,0.18);
    border-radius: 18px; padding: 18px 20px; display: flex; flex-direction: column; gap: 10px;
  }
  .bam-rv-milestone-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .bam-rv-milestone-title { font-size: 0.82rem; font-weight: 600; color: rgba(245,247,255,0.6); }
  .bam-rv-milestone-streak {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 3px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
    background: rgba(255,184,48,0.1); color: #fcd34d; border: 1px solid rgba(255,184,48,0.2);
  }
  .bam-rv-progress-label { display: flex; justify-content: space-between; font-size: 0.72rem; color: rgba(245,247,255,0.4); }
  .bam-rv-progress-track { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; }
  .bam-rv-progress-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #7c5cff, #00d4ff); transition: width 0.6s ease; }
  .bam-rv-milestones { display: flex; gap: 8px; flex-wrap: wrap; }
  .bam-rv-ms {
    flex: 1; min-width: 80px; padding: 10px 12px; border-radius: 12px; text-align: center;
    border: 1px solid rgba(124,92,255,0.15); background: rgba(124,92,255,0.06);
    display: flex; flex-direction: column; gap: 4px;
  }
  .bam-rv-ms-locked { opacity: 0.35; }
  .bam-rv-ms-icon { font-size: 1rem; }
  .bam-rv-ms-label { font-size: 0.65rem; color: rgba(245,247,255,0.45); }
  .bam-rv-ms-val { font-size: 0.72rem; font-weight: 600; color: #f5f7ff; }

  /* ── Card ── */
  .bam-rv-card {
    background: rgba(12,16,32,0.7); border: 1px solid rgba(124,92,255,0.18);
    border-radius: 20px; padding: 24px; backdrop-filter: blur(10px);
    display: flex; flex-direction: column; gap: 16px;
  }
  .bam-rv-card-live {
    border-color: rgba(74,222,128,0.35);
    box-shadow: 0 0 0 1px rgba(74,222,128,0.1), 0 8px 32px rgba(74,222,128,0.07);
  }
  .bam-rv-card-title { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(245,247,255,0.4); }
  .bam-rv-divider { height: 1px; background: rgba(124,92,255,0.1); }

  /* ── Live toggle ── */
  .bam-rv-live-block { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .bam-rv-live-label { font-size: 1.1rem; font-weight: 700; color: #f5f7ff; letter-spacing: -0.01em; margin-bottom: 4px; }
  .bam-rv-live-desc { font-size: 0.82rem; color: rgba(245,247,255,0.45); margin-bottom: 6px; }
  .bam-rv-live-status {
    display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
    border-radius: 999px; font-size: 0.72rem; font-weight: 600; width: fit-content;
  }
  .bam-rv-live-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .bam-rv-status-on { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
  .bam-rv-status-on .bam-rv-live-status-dot { background: #4ade80; animation: bam-rv-pulse 1.8s ease-in-out infinite; }
  .bam-rv-status-off { background: rgba(255,255,255,0.05); color: rgba(245,247,255,0.35); border: 1px solid rgba(255,255,255,0.08); }
  .bam-rv-status-off .bam-rv-live-status-dot { background: rgba(245,247,255,0.2); }
  @keyframes bam-rv-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.4)} 50%{box-shadow:0 0 0 5px rgba(74,222,128,0)} }

  /* Queue badge */
  .bam-rv-queue-badge {
    display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px;
    border-radius: 999px; font-size: 0.72rem; font-weight: 700;
    background: rgba(255,184,48,0.12); color: #fcd34d; border: 1px solid rgba(255,184,48,0.25);
    animation: bam-rv-pulse 2s ease-in-out infinite;
  }

  /* Big toggle */
  .bam-rv-toggle-btn {
    position: relative; width: 72px; height: 38px; border-radius: 999px; border: none;
    cursor: pointer; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
    transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; flex-shrink: 0;
  }
  .bam-rv-toggle-btn-on { background: rgba(74,222,128,0.25); border-color: rgba(74,222,128,0.5); box-shadow: 0 0 20px rgba(74,222,128,0.18); }
  .bam-rv-toggle-btn::after { content:""; position:absolute; top:4px; left:4px; width:28px; height:28px; border-radius:50%; background:rgba(245,247,255,0.45); transition:transform 0.2s ease, background 0.2s ease; }
  .bam-rv-toggle-btn-on::after { transform:translateX(34px); background:#4ade80; }
  .bam-rv-toggle-btn:disabled { opacity:0.4; cursor:not-allowed; }

  /* ── Rate ── */
  .bam-rv-rate-display { font-size: 2.4rem; font-weight: 800; color: #f5f7ff; letter-spacing: -0.03em; line-height: 1; }
  .bam-rv-rate-display span { font-size: 0.9rem; font-weight: 400; color: rgba(245,247,255,0.4); margin-left: 4px; }
  .bam-rv-label { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: rgba(245,247,255,0.45); }
  .bam-rv-input {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(124,92,255,0.2);
    border-radius: 10px; padding: 11px 14px; font-size: 1rem; color: #f5f7ff;
    font-family: inherit; outline: none; width: 100%; max-width: 200px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .bam-rv-input:focus { border-color: rgba(124,92,255,0.6); box-shadow: 0 0 0 3px rgba(124,92,255,0.12); }
  .bam-rv-hint { font-size: 0.75rem; color: rgba(245,247,255,0.3); }

  /* ── Video toggle ── */
  .bam-rv-option-row { display: flex; align-items: center; gap: 12px; }
  .bam-rv-option-toggle {
    width: 40px; height: 22px; border-radius: 999px; border: none; cursor: pointer;
    position: relative; transition: background 0.18s ease;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); flex-shrink: 0;
  }
  .bam-rv-option-toggle-on { background: rgba(124,92,255,0.4); border-color: rgba(124,92,255,0.6); }
  .bam-rv-option-toggle::after { content:""; position:absolute; top:3px; left:3px; width:14px; height:14px; border-radius:50%; background:rgba(245,247,255,0.5); transition:transform 0.18s ease, background 0.18s ease; }
  .bam-rv-option-toggle-on::after { transform:translateX(18px); background:#c4b5fd; }
  .bam-rv-option-label { font-size: 0.88rem; color: rgba(245,247,255,0.7); }

  /* ── Buttons ── */
  .bam-rv-save {
    padding: 11px 24px; border-radius: 999px; border: none; font-size: 0.9rem;
    font-weight: 600; font-family: inherit; cursor: pointer;
    background: linear-gradient(120deg, #7c5cff 0%, #00d4ff 100%);
    color: #0b0f1f; box-shadow: 0 6px 20px rgba(0,212,255,0.2);
    transition: opacity 0.15s ease, transform 0.15s ease; align-self: flex-start;
  }
  .bam-rv-save:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .bam-rv-save:disabled { opacity: 0.4; cursor: not-allowed; }
  .bam-rv-save-status { font-size: 0.82rem; color: rgba(245,247,255,0.45); }
  .bam-rv-btn {
    padding: 7px 14px; border-radius: 999px; font-size: 0.78rem; font-weight: 600;
    font-family: inherit; cursor: pointer; border: none; text-decoration: none;
    display: inline-flex; align-items: center; gap: 5px;
    transition: opacity 0.15s ease, transform 0.15s ease; flex-shrink: 0;
  }
  .bam-rv-btn:hover { opacity: 0.85; transform: translateY(-1px); }
  .bam-rv-btn-primary { background: linear-gradient(120deg, #7c5cff 0%, #00d4ff 100%); color: #0b0f1f; }
  .bam-rv-btn-ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: rgba(245,247,255,0.7); }
  .bam-rv-btn-green { background: rgba(74,222,128,0.15); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; }
  .bam-rv-btn-sm { padding: 6px 12px; font-size: 0.75rem; }

  /* ── Share link ── */
  .bam-rv-link-box {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    background: rgba(10,12,24,0.8); border: 1px solid rgba(124,92,255,0.2);
    border-radius: 12px; padding: 12px 14px;
  }
  .bam-rv-link-text { flex: 1; font-size: 0.82rem; font-family: monospace; color: rgba(245,247,255,0.6); word-break: break-all; min-width: 0; }

  /* ── Rules ── */
  .bam-rv-rules { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
  .bam-rv-rule { background: rgba(124,92,255,0.05); border: 1px solid rgba(124,92,255,0.12); border-radius: 12px; padding: 14px; }
  .bam-rv-rule-title { font-size: 0.8rem; font-weight: 600; color: #f5f7ff; margin-bottom: 4px; }
  .bam-rv-rule-body { font-size: 0.75rem; color: rgba(245,247,255,0.45); line-height: 1.5; }

  /* ── Call history ── */
  .bam-rv-call-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(124,92,255,0.08); }
  .bam-rv-call-row:last-child { border-bottom: none; }
  .bam-rv-call-who { font-size: 0.88rem; font-weight: 600; color: #f5f7ff; }
  .bam-rv-call-meta { font-size: 0.75rem; color: rgba(245,247,255,0.35); margin-top: 2px; }
  .bam-rv-call-earned { font-size: 0.88rem; font-weight: 700; color: #4ade80; }

  /* ── Profile completeness ── */
  .bam-rv-completeness {
    background: rgba(124,92,255,0.06); border: 1px solid rgba(124,92,255,0.2);
    border-radius: 16px; padding: 16px 18px; display: flex; align-items: center; gap: 16px;
  }
  .bam-rv-complete-track { flex: 1; }
  .bam-rv-complete-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: rgba(245,247,255,0.45); margin-bottom: 6px; }
  .bam-rv-complete-bar { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; }
  .bam-rv-complete-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, #7c5cff, #00d4ff); }
  .bam-rv-complete-hint { font-size: 0.72rem; color: rgba(245,247,255,0.35); margin-top: 5px; }

  /* ── Pings ── */
  .bam-rv-ping-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 14px 0; border-bottom: 1px solid rgba(124,92,255,0.08); flex-wrap: wrap; }
  .bam-rv-ping-row:last-child { border-bottom: none; }
  .bam-rv-ping-question { font-size: 0.88rem; font-weight: 600; color: #f5f7ff; margin-bottom: 3px; }
  .bam-rv-ping-meta { font-size: 0.75rem; color: rgba(245,247,255,0.35); }
  .bam-rv-ping-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; flex-shrink: 0; }
  .bam-rv-ping-responded { font-size: 0.78rem; padding: 5px 10px; border-radius: 999px; background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }

  /* ── States ── */
  .bam-rv-skeleton { background: rgba(255,255,255,0.04); border: 1px solid rgba(124,92,255,0.08); border-radius: 20px; animation: bam-rv-shimmer 1.6s ease-in-out infinite; }
  @keyframes bam-rv-shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
  .bam-rv-empty { text-align: center; padding: 32px 24px; border: 1px dashed rgba(124,92,255,0.18); border-radius: 16px; color: rgba(245,247,255,0.35); display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .bam-rv-toast { padding: 12px 16px; border-radius: 12px; font-size: 0.88rem; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .bam-rv-toast-error { background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.25); color: rgba(255,130,130,0.95); }
  .bam-rv-toast-success { background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.2); color: #4ade80; }
  .bam-rv-toast-close { background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; padding: 0; flex-shrink: 0; }

  /* ── Modal ── */
  .bam-rv-backdrop { position: fixed; inset: 0; background: rgba(3,5,15,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 24px; }
  .bam-rv-modal { background: rgba(12,16,32,0.96); border: 1px solid rgba(124,92,255,0.3); border-radius: 20px; width: 100%; max-width: 420px; box-shadow: 0 32px 80px rgba(0,0,0,0.7); display: flex; flex-direction: column; }
  .bam-rv-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid rgba(124,92,255,0.12); }
  .bam-rv-modal-title { font-size: 1.1rem; font-weight: 700; color: #f5f7ff; }
  .bam-rv-modal-close { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(245,247,255,0.5); font-size: 0.9rem; }
  .bam-rv-modal-close:hover { background: rgba(255,255,255,0.12); color: #f5f7ff; }
  .bam-rv-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .bam-rv-modal-rate { font-size: 2.2rem; font-weight: 800; color: #4ade80; letter-spacing: -0.03em; text-align: center; padding: 16px; background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.15); border-radius: 14px; }
  .bam-rv-modal-rate span { font-size: 0.9rem; font-weight: 400; color: rgba(245,247,255,0.4); margin-left: 4px; }
  .bam-rv-modal-text { font-size: 0.88rem; color: rgba(245,247,255,0.55); line-height: 1.6; text-align: center; }
  .bam-rv-modal-actions { display: flex; flex-direction: column; gap: 10px; padding: 16px 24px; border-top: 1px solid rgba(124,92,255,0.12); }
  .bam-rv-modal-go { width: 100%; padding: 14px 20px; border-radius: 999px; border: none; font-size: 1rem; font-weight: 700; font-family: inherit; cursor: pointer; background: linear-gradient(120deg, #4ade80 0%, #22d3ee 100%); color: #0b0f1f; box-shadow: 0 8px 24px rgba(74,222,128,0.25); transition: opacity 0.15s ease, transform 0.15s ease; }
  .bam-rv-modal-go:hover { opacity: 0.9; transform: translateY(-1px); }
  .bam-rv-modal-adjust { width: 100%; padding: 11px 20px; border-radius: 999px; border: none; font-size: 0.88rem; font-weight: 600; font-family: inherit; cursor: pointer; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: rgba(245,247,255,0.6); }

  @media (max-width: 600px) {
    .bam-rv-wrap { padding: 0 16px; }
    .bam-rv-page { padding: 28px 0 60px; gap: 16px; }
    .bam-rv-heading { font-size: 1.4rem; }
    .bam-rv-earnings { grid-template-columns: 1fr 1fr; }
    .bam-rv-earn-card:last-child { grid-column: 1 / -1; }
    .bam-rv-rules { grid-template-columns: 1fr; }
    .bam-rv-rate-display { font-size: 1.8rem; }
    .bam-rv-toggle-btn { width: 60px; height: 32px; }
    .bam-rv-toggle-btn::after { width: 22px; height: 22px; }
    .bam-rv-toggle-btn-on::after { transform: translateX(28px); }
    .bam-rv-milestones { flex-wrap: wrap; }
  }
`;

/* ─── milestones config ──────────────────────────────────── */
const MILESTONES = [
  { label: "First call", threshold: 1, unit: "calls", icon: "📞" },
  { label: "$100 earned", threshold: 10000, unit: "tokens", icon: "💰" },
  { label: "$1k earned", threshold: 100000, unit: "tokens", icon: "🏆" },
  { label: "$5k earned", threshold: 500000, unit: "tokens", icon: "👑" },
];

export default function ReceiverPage() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? "";

  /* profile */
  const [ratePerSecondTokens, setRatePerSecondTokens] = useState(DEFAULT_RATE_PER_SECOND_TOKENS);
  const [ratePerMinuteInput, setRatePerMinuteInput] = useState(
    (DEFAULT_RATE_PER_SECOND_TOKENS * SECONDS_IN_MINUTE * TOKEN_UNIT_USD).toFixed(2)
  );
  const [isAvailable, setIsAvailable] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "error">("idle");
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  /* earnings */
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerStatus, setLedgerStatus] = useState<"idle" | "loading" | "error">("idle");

  /* queue */
  const [queue, setQueue] = useState<IncomingRequest[]>([]);
  const queueIntervalRef = useRef<number | null>(null);

  /* pings */
  const [pings, setPings] = useState<AvailabilityPing[]>([]);
  const [pingsStatus, setPingsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pingResponding, setPingResponding] = useState<string | null>(null);

  /* completeness */
  const [completeness, setCompleteness] = useState<ProfileCompleteness | null>(null);

  /* share */
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  /* toast */
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  /* ── derived ── */
  const ratePerMinuteUsd = useMemo(
    () => (ratePerSecondTokens * SECONDS_IN_MINUTE * TOKEN_UNIT_USD).toFixed(2),
    [ratePerSecondTokens]
  );

  const shareHandle = useMemo(
    () => session?.user?.name?.trim() || session?.user?.email || session?.user?.id || "",
    [session]
  );

  const shareUrl = useMemo(() => {
    if (!shareHandle || typeof window === "undefined") return "";
    return `${window.location.origin}/call/request/${encodeURIComponent(shareHandle)}`;
  }, [shareHandle]);

  /* earnings breakdown */
  const earningsBreakdown = useMemo(() => {
    const billingEntries = ledger.filter((e) => e.source === "call_billing");
    const dayStart = startOfDay();
    const weekStart = startOfWeek();
    const todayTokens = billingEntries.filter((e) => new Date(e.createdAt).getTime() >= dayStart).reduce((s, e) => s + e.amountTokens, 0);
    const weekTokens = billingEntries.filter((e) => new Date(e.createdAt).getTime() >= weekStart).reduce((s, e) => s + e.amountTokens, 0);
    const allTimeTokens = billingEntries.reduce((s, e) => s + e.amountTokens, 0);
    const todayCalls = new Set(billingEntries.filter((e) => new Date(e.createdAt).getTime() >= dayStart && e.callId).map((e) => e.callId)).size;
    return { todayTokens, weekTokens, allTimeTokens, todayCalls };
  }, [ledger]);

  /* call history (last 5 billing entries) */
  const callHistory = useMemo(() => {
    return ledger
      .filter((e) => e.source === "call_billing")
      .slice(0, 5);
  }, [ledger]);

  /* milestone progress */
  const milestoneProgress = useMemo(() => {
    const allTimeTokens = earningsBreakdown.allTimeTokens;
    const nextMilestone = MILESTONES.find((m) => m.unit === "tokens" && allTimeTokens < m.threshold);
    const prevThreshold = (() => {
      const idx = MILESTONES.findIndex((m) => m === nextMilestone);
      return idx > 0 ? MILESTONES[idx - 1].threshold : 0;
    })();
    const pct = nextMilestone
      ? Math.min(100, ((allTimeTokens - prevThreshold) / (nextMilestone.threshold - prevThreshold)) * 100)
      : 100;
    return { nextMilestone, pct, allTimeTokens };
  }, [earningsBreakdown.allTimeTokens]);

  /* ── helpers ── */
  function tokensPerSecondFromUsdPerMinute(usdPerMinute: number) {
    return Math.max(1, Math.ceil(usdPerMinute / TOKEN_UNIT_USD / SECONDS_IN_MINUTE));
  }

  /* ── data loaders ── */
  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setProfileStatus("loading");
    try {
      const res = await fetch(`/api/ui/receiver/profile/get?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) { setProfileStatus("error"); return; }
      const data = await res.json() as { profile?: { ratePerSecondTokens?: number; isAvailable?: boolean; isVideoEnabled?: boolean } };
      if (data.profile) {
        const nextRate = data.profile.ratePerSecondTokens ?? DEFAULT_RATE_PER_SECOND_TOKENS;
        setRatePerSecondTokens(nextRate);
        setRatePerMinuteInput((nextRate * SECONDS_IN_MINUTE * TOKEN_UNIT_USD).toFixed(2));
        setIsAvailable(Boolean(data.profile.isAvailable));
        setIsVideoEnabled(data.profile.isVideoEnabled ?? true);
      }
      setProfileStatus("idle");
    } catch { setProfileStatus("error"); }
  }, [userId]);

  const loadLedger = useCallback(async () => {
    setLedgerStatus("loading");
    try {
      const res = await fetch("/api/wallet/ledger?limit=50");
      if (!res.ok) { setLedgerStatus("error"); return; }
      const data = await res.json() as { entries: LedgerEntry[] };
      setLedger(data.entries ?? []);
      setLedgerStatus("idle");
    } catch { setLedgerStatus("error"); }
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/calls/incoming");
      if (!res.ok) return;
      const data = await res.json() as { requests: IncomingRequest[] };
      setQueue(data.requests ?? []);
    } catch {}
  }, []);

  const loadPings = useCallback(async () => {
    if (!userId) return;
    setPingsStatus("loading");
    try {
      const res = await fetch(`/api/ui/availability/ping?receiverId=${encodeURIComponent(userId)}&limit=10`);
      if (!res.ok) { setPingsStatus("error"); return; }
      const data = await res.json() as { pings?: AvailabilityPing[] };
      setPings(data.pings ?? []);
      setPingsStatus("idle");
    } catch { setPingsStatus("error"); }
  }, [userId]);

  const loadCompleteness = useCallback(async () => {
    if (!shareHandle) return;
    try {
      const res = await fetch(`/api/profile?username=${encodeURIComponent(shareHandle)}`);
      if (!res.ok) return;
      const data = await res.json() as { profile?: { bio?: string; tagline?: string; categories?: string[]; languages?: string[] } };
      const p = data.profile;
      if (!p) return;
      const hasBio = Boolean(p.bio?.trim());
      const hasTagline = Boolean(p.tagline?.trim());
      const hasCategories = (p.categories?.length ?? 0) > 0;
      const hasLanguages = (p.languages?.length ?? 0) > 0;
      const score = [hasBio, hasTagline, hasCategories, hasLanguages].filter(Boolean).length;
      setCompleteness({ hasBio, hasTagline, hasCategories, hasLanguages, score });
    } catch {}
  }, [shareHandle]);

  /* ── save ── */
  async function save(overrideAvailable?: boolean) {
    if (!userId) return;
    const nextAvailable = overrideAvailable ?? isAvailable;
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/ui/receiver/profile/upsert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, ratePerSecondTokens: Number(ratePerSecondTokens), isAvailable: nextAvailable, isVideoEnabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSaveStatus("error");
        setSaveError(data?.error?.message ?? "Failed to save.");
        return;
      }
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setSaveError("Unable to save.");
    }
  }

  function handleToggleLive() {
    if (!isAvailable) { setShowGoLiveModal(true); }
    else { setIsAvailable(false); void save(false); }
  }

  function confirmGoLive() {
    setIsAvailable(true);
    setShowGoLiveModal(false);
    void save(true);
  }

  /* ── ping respond ── */
  async function respondToPing(pingId: string, response: string) {
    if (!userId) return;
    setPingResponding(pingId);
    try {
      const res = await fetch("/api/ui/availability/ping/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pingId, userId, response }),
      });
      if (!res.ok) { setToast({ message: "Failed to respond.", variant: "error" }); return; }
      setToast({ message: "Response sent.", variant: "success" });
      await loadPings();
    } catch { setToast({ message: "Unable to respond.", variant: "error" }); }
    finally { setPingResponding(null); }
  }

  /* ── share ── */
  async function handleShare() {
    if (navigator.share && shareUrl) {
      try {
        await navigator.share({ title: "Call me on BuyAMinute", url: shareUrl });
        return;
      } catch {}
    }
    handleCopyLink();
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch { setToast({ message: "Copy failed.", variant: "error" }); }
  }

  /* ── effects ── */
  useEffect(() => {
    void loadProfile();
    void loadLedger();
    void loadPings();
  }, [loadProfile, loadLedger, loadPings]);

  useEffect(() => {
    if (shareHandle) void loadCompleteness();
  }, [shareHandle, loadCompleteness]);

  useEffect(() => {
    if (!isAvailable) {
      if (queueIntervalRef.current) window.clearInterval(queueIntervalRef.current);
      setQueue([]);
      return;
    }
    void loadQueue();
    queueIntervalRef.current = window.setInterval(() => void loadQueue(), 10_000);
    return () => { if (queueIntervalRef.current) window.clearInterval(queueIntervalRef.current); };
  }, [isAvailable, loadQueue]);

  /* ── derived UI ── */
  const pendingPings = pings.filter((p) => !p.response);
  const respondedPings = pings.filter((p) => p.response);
  const completenessScore = completeness?.score ?? 0;
  const completenessPercent = Math.round((completenessScore / 4) * 100);

  return (
    <AuthGuard>
      <style>{css}</style>
      <div className="bam-rv-wrap">
        <main className="bam-rv-page">

          <header>
            <h1 className="bam-rv-heading">Receiver dashboard</h1>
            <p className="bam-rv-sub">Your earnings, availability, and incoming activity.</p>
          </header>

          {toast ? (
            <div className={`bam-rv-toast bam-rv-toast-${toast.variant}`} role="status">
              <span>{toast.message}</span>
              <button className="bam-rv-toast-close" onClick={() => setToast(null)}>✕</button>
            </div>
          ) : null}

          {/* ── Live toggle + rate — first thing the seller sees ── */}
          {profileStatus === "loading" ? (
            <div className="bam-rv-skeleton" style={{ height: 200 }} />
          ) : profileStatus === "error" ? (
            <div className="bam-rv-empty">
              <p>Could not load profile.</p>
              <button className="bam-rv-btn bam-rv-btn-ghost bam-rv-btn-sm" onClick={loadProfile}>Retry</button>
            </div>
          ) : (
            <>
              {/* ── Live toggle card ── */}
              <div className={`bam-rv-card${isAvailable ? " bam-rv-card-live" : ""}`}>
                <div className="bam-rv-live-block">
                  <div>
                    <div className="bam-rv-live-label">{isAvailable ? "You are live" : "You are offline"}</div>
                    <div className="bam-rv-live-desc">
                      {isAvailable ? `Earning $${ratePerMinuteUsd}/min — accepting calls now` : "Toggle to start accepting paid calls"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div className={`bam-rv-live-status${isAvailable ? " bam-rv-status-on" : " bam-rv-status-off"}`}>
                        <span className="bam-rv-live-status-dot" />
                        {isAvailable ? "Live" : "Offline"}
                      </div>
                      {isAvailable && queue.length > 0 ? (
                        <span className="bam-rv-queue-badge">
                          ⚡ {queue.length} {queue.length === 1 ? "request" : "requests"} waiting
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className={`bam-rv-toggle-btn${isAvailable ? " bam-rv-toggle-btn-on" : ""}`}
                    type="button"
                    onClick={handleToggleLive}
                    aria-label={isAvailable ? "Go offline" : "Go live"}
                    aria-pressed={isAvailable}
                  />
                </div>

                <div className="bam-rv-divider" />

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="bam-rv-card-title">Your rate</div>
                  <div className="bam-rv-rate-display">${ratePerMinuteUsd}<span>/ min</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label className="bam-rv-label" htmlFor="rate-input">Change rate ($/min)</label>
                    <input
                      id="rate-input"
                      className="bam-rv-input"
                      type="number"
                      value={ratePerMinuteInput}
                      onChange={(e) => {
                        setRatePerMinuteInput(e.target.value);
                        const parsed = Number(e.target.value);
                        if (Number.isFinite(parsed) && parsed > 0) setRatePerSecondTokens(tokensPerSecondFromUsdPerMinute(parsed));
                      }}
                      min={TOKEN_UNIT_USD}
                      step={0.01}
                    />
                    <span className="bam-rv-hint">Billing is per-second after the 30s free preview.</span>
                  </div>
                </div>

                <div className="bam-rv-divider" />

                <div className="bam-rv-option-row">
                  <button
                    type="button"
                    className={`bam-rv-option-toggle${isVideoEnabled ? " bam-rv-option-toggle-on" : ""}`}
                    onClick={() => setIsVideoEnabled((v) => !v)}
                    aria-label={isVideoEnabled ? "Disable video" : "Enable video"}
                    aria-pressed={isVideoEnabled}
                  />
                  <span className="bam-rv-option-label">Allow video calls {isVideoEnabled ? "(on)" : "(voice only)"}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button className="bam-rv-save" type="button" onClick={() => save()} disabled={saveStatus === "saving"}>
                    {saveStatus === "saving" ? "Saving…" : "Save changes"}
                  </button>
                  {saveStatus === "saved" ? <span className="bam-rv-save-status">Saved ✓</span> : null}
                  {saveStatus === "error" && saveError ? <span className="bam-rv-save-status" style={{ color: "rgba(255,130,130,0.9)" }}>{saveError}</span> : null}
                </div>
              </div>

              {/* ── Start earning steps ── */}
              <div className="bam-rv-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f5f7ff", marginBottom: 4 }}>Start earning in 3 steps</div>
                    <div style={{ fontSize: "0.82rem", color: "rgba(245,247,255,0.45)" }}>Share your link after setting your rate and availability.</div>
                  </div>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "5px 12px", borderRadius: "999px", background: "rgba(124,92,255,0.15)", color: "#c4b5fd", border: "1px solid rgba(124,92,255,0.3)" }}>Launch ready</span>
                </div>
                <ol style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li style={{ fontSize: "0.88rem", color: "rgba(245,247,255,0.7)" }}>Set your per-minute rate</li>
                  <li style={{ fontSize: "0.88rem", color: "rgba(245,247,255,0.7)" }}>Turn on availability when ready</li>
                  <li style={{ fontSize: "0.88rem", color: "rgba(245,247,255,0.7)" }}>Share your link — you get paid only when connected</li>
                </ol>
              </div>

              {/* ── Share link card ── */}
              <div className="bam-rv-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div className="bam-rv-card-title">Your call link</div>
                  <button className="bam-rv-btn bam-rv-btn-green bam-rv-btn-sm" type="button" onClick={handleShare}>
                    {typeof navigator !== "undefined" && "share" in navigator ? "Share ↗" : "Copy link"}
                  </button>
                </div>
                <div className="bam-rv-link-box">
                  <span className="bam-rv-link-text">{shareUrl || "Generating…"}</span>
                  <button className="bam-rv-btn bam-rv-btn-ghost bam-rv-btn-sm" type="button" onClick={handleCopyLink}>
                    {copyStatus === "copied" ? <span style={{ color: "#4ade80" }}>Copied ✓</span> : "Copy"}
                  </button>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="bam-rv-btn bam-rv-btn-ghost bam-rv-btn-sm">Test ↗</a>
                </div>
                <div className="bam-rv-rules">
                  <div className="bam-rv-rule">
                    <div className="bam-rv-rule-title">Free preview</div>
                    <div className="bam-rv-rule-body">First 30s free — callers can drop before billing starts.</div>
                  </div>
                  <div className="bam-rv-rule">
                    <div className="bam-rv-rule-title">Per-second billing</div>
                    <div className="bam-rv-rule-body">Billed by the second after preview. No rounding up.</div>
                  </div>
                  <div className="bam-rv-rule">
                    <div className="bam-rv-rule-title">Auto-refund</div>
                    <div className="bam-rv-rule-body">No answer in {RING_TIMEOUT_SECONDS}s? Caller refunded automatically.</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Earnings summary (concept 1) ── */}
          {ledgerStatus === "loading" ? (
            <div className="bam-rv-earnings">
              {[1, 2, 3].map((i) => <div key={i} className="bam-rv-skeleton" style={{ height: 100 }} />)}
            </div>
          ) : (
            <div className="bam-rv-earnings">
              <div className="bam-rv-earn-card">
                <div className="bam-rv-earn-label">Today</div>
                <div className="bam-rv-earn-value">{toUsd(earningsBreakdown.todayTokens)}</div>
                <div className={`bam-rv-earn-sub${earningsBreakdown.todayCalls > 0 ? " bam-rv-earn-sub-green" : ""}`}>
                  {earningsBreakdown.todayCalls} {earningsBreakdown.todayCalls === 1 ? "call" : "calls"}
                </div>
              </div>
              <div className="bam-rv-earn-card">
                <div className="bam-rv-earn-label">This week</div>
                <div className="bam-rv-earn-value">{toUsd(earningsBreakdown.weekTokens)}</div>
                <div className="bam-rv-earn-sub">7-day total</div>
              </div>
              <div className="bam-rv-earn-card bam-rv-earn-card-accent">
                <div className="bam-rv-earn-label">All time</div>
                <div className="bam-rv-earn-value bam-rv-earn-value-mag">{toUsd(earningsBreakdown.allTimeTokens)}</div>
                <div className="bam-rv-earn-sub">lifetime earnings</div>
              </div>
            </div>
          )}

          {/* ── Milestone bar (concept 5) ── */}
          <div className="bam-rv-milestone">
            <div className="bam-rv-milestone-header">
              <span className="bam-rv-milestone-title">Milestones</span>
              {isAvailable ? <span className="bam-rv-milestone-streak">🔥 Live now</span> : null}
            </div>
            <div>
              <div className="bam-rv-progress-label">
                <span>{toUsd(earningsBreakdown.allTimeTokens)} earned</span>
                <span>{milestoneProgress.nextMilestone ? `Next: ${milestoneProgress.nextMilestone.label}` : "All milestones reached"}</span>
              </div>
              <div className="bam-rv-progress-track">
                <div className="bam-rv-progress-fill" style={{ width: `${milestoneProgress.pct}%` }} />
              </div>
            </div>
            <div className="bam-rv-milestones">
              {MILESTONES.map((m) => {
                const reached = m.unit === "tokens"
                  ? earningsBreakdown.allTimeTokens >= m.threshold
                  : callHistory.length >= m.threshold;
                return (
                  <div key={m.label} className={`bam-rv-ms${reached ? "" : " bam-rv-ms-locked"}`}>
                    <div className="bam-rv-ms-icon">{m.icon}</div>
                    <div className="bam-rv-ms-label">{m.label}</div>
                    <div className="bam-rv-ms-val">{reached ? "Done ✓" : "Locked"}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Profile completeness nudge ── */}
          {completeness && completenessScore < 4 ? (
            <div className="bam-rv-completeness">
              <div className="bam-rv-complete-track">
                <div className="bam-rv-complete-label">
                  <span>Profile {completenessPercent}% complete</span>
                  <span>{completenessScore}/4 sections filled</span>
                </div>
                <div className="bam-rv-complete-bar">
                  <div className="bam-rv-complete-fill" style={{ width: `${completenessPercent}%` }} />
                </div>
                <div className="bam-rv-complete-hint">
                  Complete profiles get 3× more calls. Missing:
                  {!completeness.hasBio ? " bio," : ""}
                  {!completeness.hasTagline ? " tagline," : ""}
                  {!completeness.hasCategories ? " categories," : ""}
                  {!completeness.hasLanguages ? " languages" : ""}
                </div>
              </div>
              <a href="/settings" className="bam-rv-btn bam-rv-btn-ghost bam-rv-btn-sm">Complete →</a>
            </div>
          ) : null}

          {/* ── Recent call history ── */}
          {callHistory.length > 0 ? (
            <div className="bam-rv-card">
              <div className="bam-rv-card-title">Recent calls</div>
              {callHistory.map((entry) => (
                <div key={entry.id} className="bam-rv-call-row">
                  <div>
                    <div className="bam-rv-call-who">Call #{entry.callId?.slice(0, 8) ?? "—"}</div>
                    <div className="bam-rv-call-meta">{new Date(entry.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="bam-rv-call-earned">{toUsd(entry.amountTokens)}</div>
                </div>
              ))}
            </div>
          ) : null}

          {/* ── Pings ── */}
          <div className="bam-rv-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div className="bam-rv-card-title">Availability pings</div>
                {pendingPings.length > 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "rgba(255,184,48,0.8)", marginTop: 4 }}>
                    {pendingPings.length} waiting for your response
                  </p>
                ) : null}
              </div>
              <button className="bam-rv-btn bam-rv-btn-ghost bam-rv-btn-sm" type="button" onClick={loadPings}>Refresh</button>
            </div>

            {pingsStatus === "loading" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2].map((i) => <div key={i} className="bam-rv-skeleton" style={{ height: 56 }} />)}
              </div>
            ) : pingsStatus === "error" ? (
              <div className="bam-rv-empty">
                <p>Could not load pings.</p>
                <button className="bam-rv-btn bam-rv-btn-ghost bam-rv-btn-sm" onClick={loadPings}>Retry</button>
              </div>
            ) : pings.length === 0 ? (
              <div className="bam-rv-empty">
                <p>No pings yet.</p>
                <button className="bam-rv-btn bam-rv-btn-ghost bam-rv-btn-sm" type="button" onClick={handleShare}>
                  {copyStatus === "copied" ? "Link copied ✓" : "Share your link to get started"}
                </button>
              </div>
            ) : (
              <>
                {pendingPings.map((ping) => (
                  <div key={ping.id} className="bam-rv-ping-row">
                    <div>
                      <div className="bam-rv-ping-question">
                        {PING_QUESTION_LABELS[ping.question as keyof typeof PING_QUESTION_LABELS] ?? ping.question}
                      </div>
                      <div className="bam-rv-ping-meta">From {ping.callerId} · {new Date(ping.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="bam-rv-ping-actions">
                      <button className="bam-rv-btn bam-rv-btn-primary bam-rv-btn-sm" type="button" onClick={() => respondToPing(ping.id, "available_now")} disabled={pingResponding === ping.id}>Now</button>
                      <button className="bam-rv-btn bam-rv-btn-ghost bam-rv-btn-sm" type="button" onClick={() => respondToPing(ping.id, "available_later")} disabled={pingResponding === ping.id}>Later</button>
                      <button className="bam-rv-btn bam-rv-btn-sm" type="button" style={{ background: "none", border: "none", color: "rgba(245,247,255,0.3)", cursor: "pointer" }} onClick={() => respondToPing(ping.id, "not_available")} disabled={pingResponding === ping.id}>Decline</button>
                    </div>
                  </div>
                ))}
                {respondedPings.length > 0 ? (
                  <>
                    <div className="bam-rv-divider" />
                    {respondedPings.map((ping) => (
                      <div key={ping.id} className="bam-rv-ping-row" style={{ opacity: 0.5 }}>
                        <div>
                          <div className="bam-rv-ping-question">{PING_QUESTION_LABELS[ping.question as keyof typeof PING_QUESTION_LABELS] ?? ping.question}</div>
                          <div className="bam-rv-ping-meta">From {ping.callerId} · {new Date(ping.createdAt).toLocaleString()}</div>
                        </div>
                        <span className="bam-rv-ping-responded">{PING_RESPONSE_LABELS[ping.response as keyof typeof PING_RESPONSE_LABELS] ?? ping.response}</span>
                      </div>
                    ))}
                  </>
                ) : null}
              </>
            )}
          </div>

        </main>
      </div>

      {showGoLiveModal ? (
        <div className="bam-rv-backdrop" role="dialog" aria-modal="true" aria-label="Go live">
          <div className="bam-rv-modal">
            <div className="bam-rv-modal-header">
              <div className="bam-rv-modal-title">Go live</div>
              <button className="bam-rv-modal-close" onClick={() => setShowGoLiveModal(false)}>✕</button>
            </div>
            <div className="bam-rv-modal-body">
              <div className="bam-rv-modal-rate">${ratePerMinuteUsd}<span>/ min</span></div>
              <p className="bam-rv-modal-text">You'll start receiving paid call requests immediately. You can go offline anytime.</p>
            </div>
            <div className="bam-rv-modal-actions">
              <button className="bam-rv-modal-go" type="button" onClick={confirmGoLive}>Go live at ${ratePerMinuteUsd}/min</button>
              <button className="bam-rv-modal-adjust" type="button" onClick={() => setShowGoLiveModal(false)}>Adjust rate first</button>
            </div>
          </div>
        </div>
      ) : null}
    </AuthGuard>
  );
}

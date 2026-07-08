"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { TOKEN_UNIT_USD } from "@/lib/constants";
import {
  walletApi,
  type WalletDepositInfo,
  type WalletSummary,
  type WalletTransaction,
  type WalletTransactionType,
} from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";

const toUsd = (tokens: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    tokens * TOKEN_UNIT_USD
  );

const css = `
  .bam-wl-wrap { margin: 0 auto; max-width: 1200px; padding: 0 24px; }
  .bam-wl-page { padding: 40px 0 80px; display: flex; flex-direction: column; gap: 28px; }
  .bam-wl-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
  .bam-wl-heading { font-size: 1.75rem; font-weight: 700; color: #f5f7ff; letter-spacing: -0.02em; margin-bottom: 4px; }
  .bam-wl-sub { font-size: 0.9rem; color: rgba(245,247,255,0.45); }
  .bam-wl-header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .bam-wl-btn {
    padding: 9px 18px; border-radius: 999px; font-size: 0.85rem; font-weight: 600;
    font-family: inherit; cursor: pointer; border: none; text-decoration: none;
    display: inline-flex; align-items: center; gap: 6px;
    transition: opacity 0.15s ease, transform 0.15s ease;
    letter-spacing: 0.01em;
  }
  .bam-wl-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
  .bam-wl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .bam-wl-btn-primary { background: linear-gradient(120deg, #7c5cff 0%, #00d4ff 100%); color: #0b0f1f; }
  .bam-wl-btn-ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: rgba(245,247,255,0.7); }
  .bam-wl-btn-sm { padding: 7px 14px; font-size: 0.78rem; }
  .bam-wl-no-withdraw { font-size: 0.85rem; color: rgba(245,247,255,0.3); }
  .bam-wl-metrics { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
  .bam-wl-metric {
    background: rgba(12,16,32,0.7); border: 1px solid rgba(124,92,255,0.18);
    border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 8px;
    backdrop-filter: blur(10px);
  }
  .bam-wl-metric-label { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(245,247,255,0.4); }
  .bam-wl-metric-value { font-size: 1.6rem; font-weight: 700; color: #f5f7ff; letter-spacing: -0.02em; line-height: 1; }
  .bam-wl-metric-sub { font-size: 0.78rem; color: rgba(245,247,255,0.35); }
  .bam-wl-metric-usd { font-size: 1rem; font-weight: 600; color: rgba(0,212,255,0.75); letter-spacing: -0.01em; }
  .bam-wl-metric-accent { border-color: rgba(124,92,255,0.4); }
  .bam-wl-info-row { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .bam-wl-info-card {
    background: rgba(12,16,32,0.7); border: 1px solid rgba(124,92,255,0.18);
    border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 12px;
    backdrop-filter: blur(10px);
  }
  .bam-wl-info-title { font-size: 0.8rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: rgba(245,247,255,0.4); }
  .bam-wl-info-body { font-size: 0.88rem; color: rgba(245,247,255,0.6); line-height: 1.5; }
  .bam-wl-info-strong { font-size: 0.9rem; font-weight: 600; color: rgba(245,247,255,0.85); }
  .bam-wl-warn { font-size: 0.8rem; color: rgba(255,184,48,0.8); }
  .bam-wl-tabs { display: flex; gap: 8px; }
  .bam-wl-tab {
    padding: 7px 18px; border-radius: 999px; border: 1px solid rgba(124,92,255,0.2);
    background: rgba(255,255,255,0.03); color: rgba(245,247,255,0.5);
    font-size: 0.85rem; font-weight: 500; font-family: inherit; cursor: pointer;
    transition: all 0.15s ease;
  }
  .bam-wl-tab:hover { border-color: rgba(124,92,255,0.45); color: rgba(245,247,255,0.85); }
  .bam-wl-tab-active { background: rgba(124,92,255,0.18); border-color: rgba(124,92,255,0.55); color: #c4b5fd; }
  .bam-wl-card {
    background: rgba(12,16,32,0.7); border: 1px solid rgba(124,92,255,0.18);
    border-radius: 20px; padding: 24px; backdrop-filter: blur(10px);
  }
  .bam-wl-section { display: flex; flex-direction: column; gap: 16px; }
  .bam-wl-section-heading { font-size: 1rem; font-weight: 600; color: #f5f7ff; }
  .bam-wl-section-sub { font-size: 0.88rem; color: rgba(245,247,255,0.5); line-height: 1.6; }
  .bam-wl-inline { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .bam-wl-filter-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .bam-wl-filter {
    padding: 5px 12px; border-radius: 999px; border: 1px solid rgba(124,92,255,0.15);
    background: transparent; color: rgba(245,247,255,0.45);
    font-size: 0.78rem; font-weight: 500; font-family: inherit; cursor: pointer;
    transition: all 0.15s ease;
  }
  .bam-wl-filter:hover { border-color: rgba(124,92,255,0.35); color: rgba(245,247,255,0.75); }
  .bam-wl-filter-active { background: rgba(124,92,255,0.15); border-color: rgba(124,92,255,0.5); color: #c4b5fd; }
  .bam-wl-txn-list { display: flex; flex-direction: column; gap: 2px; }
  .bam-wl-txn-row {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px; padding: 12px 0;
    border-bottom: 1px solid rgba(124,92,255,0.08);
  }
  .bam-wl-txn-row:last-child { border-bottom: none; }
  .bam-wl-txn-label { font-size: 0.88rem; font-weight: 600; color: #f5f7ff; margin-bottom: 2px; }
  .bam-wl-txn-date { font-size: 0.75rem; color: rgba(245,247,255,0.35); }
  .bam-wl-txn-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .bam-wl-txn-amount { font-size: 0.88rem; font-weight: 600; color: rgba(245,247,255,0.7); }
  .bam-wl-txn-usd { font-size: 0.75rem; color: rgba(0,212,255,0.65); }
  .bam-wl-badge {
    display: inline-flex; align-items: center; padding: 3px 9px;
    border-radius: 999px; font-size: 0.7rem; font-weight: 600;
  }
  .bam-wl-badge-success { background: rgba(0,255,136,0.1); color: #6ee7b7; border: 1px solid rgba(0,255,136,0.2); }
  .bam-wl-badge-warning { background: rgba(255,184,48,0.1); color: #fcd34d; border: 1px solid rgba(255,184,48,0.2); }
  .bam-wl-badge-danger { background: rgba(220,38,38,0.1); color: rgba(255,130,130,0.9); border: 1px solid rgba(220,38,38,0.2); }
  .bam-wl-empty {
    text-align: center; padding: 40px 24px;
    border: 1px dashed rgba(124,92,255,0.18); border-radius: 16px;
    color: rgba(245,247,255,0.35); display: flex; flex-direction: column;
    align-items: center; gap: 14px;
  }
  .bam-wl-skeleton {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(124,92,255,0.08);
    border-radius: 18px; animation: bam-wl-shimmer 1.6s ease-in-out infinite;
  }
  @keyframes bam-wl-shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
  .bam-wl-toast {
    padding: 12px 16px; border-radius: 12px; font-size: 0.88rem;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .bam-wl-toast-success { background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.2); color: #6ee7b7; }
  .bam-wl-toast-error { background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.25); color: rgba(255,130,130,0.95); }
  .bam-wl-toast-close { background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; padding: 0; line-height: 1; flex-shrink: 0; }
  .bam-wl-toast-close:hover { opacity: 1; }
  .bam-wl-backdrop {
    position: fixed; inset: 0; background: rgba(3,5,15,0.8);
    backdrop-filter: blur(8px); display: flex; align-items: center;
    justify-content: center; z-index: 50; padding: 24px;
  }
  .bam-wl-modal {
    background: rgba(12,16,32,0.95); border: 1px solid rgba(124,92,255,0.3);
    border-radius: 20px; width: 100%; max-width: 480px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.7);
    display: flex; flex-direction: column; gap: 0;
    overflow: hidden;
  }
  .bam-wl-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; border-bottom: 1px solid rgba(124,92,255,0.12);
  }
  .bam-wl-modal-title { font-size: 1rem; font-weight: 700; color: #f5f7ff; }
  .bam-wl-modal-close {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 50%; width: 28px; height: 28px; display: flex;
    align-items: center; justify-content: center; cursor: pointer;
    color: rgba(245,247,255,0.5); font-size: 0.9rem; line-height: 1;
    transition: background 0.15s ease;
  }
  .bam-wl-modal-close:hover { background: rgba(255,255,255,0.12); color: #f5f7ff; }
  .bam-wl-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .bam-wl-modal-actions {
    display: flex; justify-content: flex-end; gap: 10px;
    padding: 16px 24px; border-top: 1px solid rgba(124,92,255,0.12);
  }
  .bam-wl-qr-wrap {
    display: flex; justify-content: center; padding: 16px;
    background: #ffffff; border-radius: 14px; margin-bottom: 10px;
  }
  .bam-wl-receipt-link {
    display: inline-block; margin-top: 6px; font-size: 0.82rem; font-weight: 600;
    color: #67e8f9; text-decoration: none;
  }
  .bam-wl-receipt-link:hover { text-decoration: underline; }
  .bam-wl-address-box {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 14px 16px; border-radius: 12px;
    background: rgba(124,92,255,0.06); border: 1px solid rgba(124,92,255,0.2);
  }
  .bam-wl-address { font-size: 0.85rem; font-family: monospace; color: rgba(245,247,255,0.8); word-break: break-all; }
  .bam-wl-network-pill {
    display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px;
    border-radius: 999px; background: rgba(0,212,255,0.08);
    border: 1px solid rgba(0,212,255,0.2); color: #67e8f9;
    font-size: 0.78rem; font-weight: 600;
  }
  .bam-wl-input-field { display: flex; flex-direction: column; gap: 6px; }
  .bam-wl-input-label { font-size: 0.78rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: rgba(245,247,255,0.5); }
  .bam-wl-input {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(124,92,255,0.2);
    border-radius: 10px; padding: 11px 14px; font-size: 0.95rem; color: #f5f7ff;
    font-family: inherit; width: 100%; outline: none;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .bam-wl-input:focus { border-color: rgba(124,92,255,0.6); box-shadow: 0 0 0 3px rgba(124,92,255,0.12); }
  .bam-wl-skeleton-list { display: flex; flex-direction: column; gap: 8px; }
  .bam-wl-spinner {
    width: 16px; height: 16px; border: 2px solid rgba(11,15,31,0.3);
    border-top-color: #0b0f1f; border-radius: 50%;
    animation: bam-wl-spin 0.7s linear infinite; display: inline-block;
  }
  @keyframes bam-wl-spin { to { transform: rotate(360deg); } }
  .bam-wl-txn-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  @media (max-width: 600px) {
    .bam-wl-page { padding: 28px 0 60px; gap: 20px; }
    .bam-wl-wrap { padding: 0 16px; }
    .bam-wl-heading { font-size: 1.4rem; }
    .bam-wl-metrics { grid-template-columns: 1fr 1fr; }
    .bam-wl-metric-value { font-size: 1.3rem; }
    .bam-wl-header { flex-direction: column; gap: 14px; }
  }
  @media (max-width: 400px) {
    .bam-wl-metrics { grid-template-columns: 1fr; }
  }
`;

const transactionLabels: Record<WalletTransactionType, string> = {
  deposit: "Deposit",
  hold: "Hold",
  release: "Hold released",
  call_settlement: "Call settlement",
  withdrawal_request: "Withdrawal request",
  withdrawal_paid: "Withdrawal sent",
};

const transactionFilters: Array<{ id: "all" | WalletTransactionType; label: string }> = [
  { id: "all", label: "All" },
  { id: "deposit", label: "Deposits" },
  { id: "call_settlement", label: "Earnings" },
  { id: "withdrawal_request", label: "Withdrawals" },
];

const maskAddress = (address: string) =>
  address.length <= 10 ? address : `${address.slice(0, 6)}...${address.slice(-4)}`;

function txnBadgeClass(status: WalletTransaction["status"]) {
  if (status === "completed") return "bam-wl-badge bam-wl-badge-success";
  if (status === "pending") return "bam-wl-badge bam-wl-badge-warning";
  return "bam-wl-badge bam-wl-badge-danger";
}

export default function WalletPage() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "loading" | "error">("idle");
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [transactionFilter, setTransactionFilter] = useState<"all" | WalletTransactionType>("all");
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionsStatus, setTransactionsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("100");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositInfo, setDepositInfo] = useState<WalletDepositInfo | null>(null);
  const [depositStatus, setDepositStatus] = useState<"idle" | "loading" | "error">("idle");
  const [depositError, setDepositError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryStatus("loading");
      setSummaryError(null);
      const response = await walletApi.getSummary();
      setSummary(response);
      setSummaryStatus("idle");
    } catch (err) {
      setSummaryStatus("error");
      setSummaryError(err instanceof Error ? err.message : "Unable to load wallet.");
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      setTransactionsStatus("loading");
      setTransactionsError(null);
      const response = await walletApi.getTransactions({
        type: transactionFilter === "all" ? undefined : transactionFilter,
      });
      setTransactions(response.transactions);
      setTransactionsStatus("idle");
    } catch (err) {
      setTransactionsStatus("error");
      setTransactionsError(err instanceof Error ? err.message : "Unable to load transactions.");
    }
  }, [transactionFilter]);

  const loadDepositInfo = useCallback(async () => {
    try {
      setDepositStatus("loading");
      setDepositError(null);
      const response = await walletApi.getDepositInfo();
      setDepositInfo(response);
      setDepositStatus("idle");
    } catch (err) {
      setDepositStatus("error");
      setDepositError(err instanceof Error ? err.message : "Unable to load deposit address.");
    }
  }, []);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { if (activeTab === "Transactions") void loadTransactions(); }, [activeTab, loadTransactions]);
  useEffect(() => { if (showDepositModal) void loadDepositInfo(); }, [showDepositModal, loadDepositInfo]);

  const availableTokens = summary?.availableTokens ?? 0;
  const canWithdraw = availableTokens > 0;

  const withdrawalStatus = useMemo(() => {
    if (!summary) return "";
    const latest = summary.latestWithdrawal;
    if (latest.status === "none") return "No withdrawals yet.";
    if (latest.status === "pending") return `Last request pending — ${latest.amountTokens ?? 0} tokens (${toUsd(latest.amountTokens ?? 0)}).`;
    if (latest.status === "failed") return `Last request failed — ${latest.amountTokens ?? 0} tokens (${toUsd(latest.amountTokens ?? 0)}).`;
    return `Last withdrawal sent — ${latest.amountTokens ?? 0} tokens (${toUsd(latest.amountTokens ?? 0)}).`;
  }, [summary]);

  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true);
      await walletApi.withdraw(Number(withdrawAmount));
      setToast({ message: "Withdrawal request sent.", variant: "success" });
      await loadSummary();
      await loadTransactions();
      setShowWithdrawModal(false);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Unable to withdraw.", variant: "error" });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleCopyAddress = async () => {
    if (!depositInfo?.address) return;
    try {
      await navigator.clipboard.writeText(depositInfo.address);
      setToast({ message: "Deposit address copied.", variant: "success" });
    } catch {
      setToast({ message: "Unable to copy address.", variant: "error" });
    }
  };

  const handleViewDeposits = () => {
    setActiveTab("Transactions");
    setTransactionFilter("deposit");
    setShowDepositModal(false);
  };

  return (
    <AuthGuard>
      <style>{css}</style>
      <div className="bam-wl-wrap">
        <main className="bam-wl-page">

          <header className="bam-wl-header">
            <div>
              <h1 className="bam-wl-heading">Wallet</h1>
              <p className="bam-wl-sub">Tokens in, on hold, and ready to use.</p>
            </div>
            <div className="bam-wl-header-actions">
              <button className="bam-wl-btn bam-wl-btn-primary" onClick={() => setShowDepositModal(true)}>
                Add tokens
              </button>
              {canWithdraw ? (
                <button className="bam-wl-btn bam-wl-btn-ghost" onClick={() => setShowWithdrawModal(true)}>
                  Withdraw
                </button>
              ) : (
                <span className="bam-wl-no-withdraw">Nothing to withdraw yet.</span>
              )}
            </div>
          </header>

          {toast ? (
            <div className={`bam-wl-toast bam-wl-toast-${toast.variant}`} role="status">
              <span>{toast.message}</span>
              <button className="bam-wl-toast-close" onClick={() => setToast(null)} aria-label="Dismiss">✕</button>
            </div>
          ) : null}

          {summaryError ? (
            <div className="bam-wl-toast bam-wl-toast-error" role="alert">
              <span>{summaryError}</span>
              <button className="bam-wl-toast-close" onClick={() => setSummaryError(null)} aria-label="Dismiss">✕</button>
            </div>
          ) : null}

          {summaryStatus === "loading" ? (
            <div className="bam-wl-metrics">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bam-wl-skeleton" style={{ height: 110 }} />
              ))}
            </div>
          ) : null}

          {summaryStatus === "error" ? (
            <div className="bam-wl-empty">
              <p>Could not load wallet details.</p>
              <button className="bam-wl-btn bam-wl-btn-ghost bam-wl-btn-sm" onClick={loadSummary}>Retry</button>
            </div>
          ) : null}

          {summaryStatus === "idle" && summary ? (
            <>
              <div className="bam-wl-metrics">
                <div className="bam-wl-metric bam-wl-metric-accent">
                  <div className="bam-wl-metric-label">Available</div>
                  <div className="bam-wl-metric-value">{summary.availableTokens.toLocaleString()}</div>
                  <div className="bam-wl-metric-usd">{toUsd(summary.availableTokens)}</div>
                  <div className="bam-wl-metric-sub">Ready to spend or withdraw</div>
                </div>
                <div className="bam-wl-metric">
                  <div className="bam-wl-metric-label">Total</div>
                  <div className="bam-wl-metric-value">{summary.totalTokens.toLocaleString()}</div>
                  <div className="bam-wl-metric-usd">{toUsd(summary.totalTokens)}</div>
                  <div className="bam-wl-metric-sub">All tokens on account</div>
                </div>
                <div className="bam-wl-metric">
                  <div className="bam-wl-metric-label">On hold</div>
                  <div className="bam-wl-metric-value">{summary.onHoldTokens.toLocaleString()}</div>
                  <div className="bam-wl-metric-usd">{toUsd(summary.onHoldTokens)}</div>
                  <div className="bam-wl-metric-sub">Reserved for pending withdrawals</div>
                </div>
                <div className="bam-wl-metric">
                  <div className="bam-wl-metric-label">Pending</div>
                  <div className="bam-wl-metric-value">{summary.pendingTokens.toLocaleString()}</div>
                  <div className="bam-wl-metric-usd">{toUsd(summary.pendingTokens)}</div>
                  <div className="bam-wl-metric-sub">Deposits awaiting confirmation</div>
                </div>
              </div>

              <div className="bam-wl-info-row">
                <div className="bam-wl-info-card">
                  <div className="bam-wl-info-title">Withdrawals</div>
                  <div className="bam-wl-info-strong">{withdrawalStatus}</div>
                  {summary.latestWithdrawal.status === "sent" && summary.latestWithdrawal.txHash ? (
                    <a
                      className="bam-wl-receipt-link"
                      href={`https://tronscan.org/#/transaction/${summary.latestWithdrawal.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View receipt on Tronscan ↗
                    </a>
                  ) : null}
                  <div className="bam-wl-info-body">
                    {summary.withdrawalAddressOnFile
                      ? "Withdrawal address on file."
                      : "No withdrawal address on file yet."}
                  </div>
                  {canWithdraw ? (
                    <button className="bam-wl-btn bam-wl-btn-ghost bam-wl-btn-sm" onClick={() => setShowWithdrawModal(true)}>
                      Request withdrawal
                    </button>
                  ) : null}
                </div>
                <div className="bam-wl-info-card">
                  <div className="bam-wl-info-title">Deposit network</div>
                  <span className="bam-wl-network-pill">USDT · TRC20</span>
                  <div className="bam-wl-info-body">Send USDT on the TRON network to your deposit address.</div>
                  <button className="bam-wl-btn bam-wl-btn-ghost bam-wl-btn-sm" onClick={() => setShowDepositModal(true)}>
                    View deposit address
                  </button>
                </div>
              </div>

              <div className="bam-wl-tabs" role="tablist">
                {["Overview", "Transactions"].map((tab) => (
                  <button
                    key={tab} role="tab" aria-selected={activeTab === tab}
                    className={`bam-wl-tab${activeTab === tab ? " bam-wl-tab-active" : ""}`}
                    onClick={() => setActiveTab(tab)} type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "Overview" ? (
                <div className="bam-wl-card">
                  <div className="bam-wl-section">
                    <div className="bam-wl-section-heading">How it works</div>
                    <p className="bam-wl-section-sub">
                      Add tokens to your wallet before making calls. Tokens are held at the start of a call and settled when it ends. Unused tokens are released back to your balance.
                    </p>
                    <div className="bam-wl-inline">
                      <button className="bam-wl-btn bam-wl-btn-primary bam-wl-btn-sm" onClick={() => setShowDepositModal(true)}>
                        Add tokens
                      </button>
                      <a href="/browse" className="bam-wl-btn bam-wl-btn-ghost bam-wl-btn-sm">
                        Browse experts
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "Transactions" ? (
                <div className="bam-wl-card">
                  <div className="bam-wl-section">
                    <div className="bam-wl-txn-header">
                      <div className="bam-wl-section-heading">Activity</div>
                      <div className="bam-wl-filter-row">
                        {transactionFilters.map((f) => (
                          <button
                            key={f.id} type="button"
                            className={`bam-wl-filter${transactionFilter === f.id ? " bam-wl-filter-active" : ""}`}
                            onClick={() => setTransactionFilter(f.id)}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {transactionsStatus === "loading" ? (
                      <div className="bam-wl-skeleton-list">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="bam-wl-skeleton" style={{ height: 56 }} />
                        ))}
                      </div>
                    ) : null}

                    {transactionsStatus === "error" ? (
                      <div className="bam-wl-empty">
                        <p>{transactionsError ?? "Unable to load transactions."}</p>
                        <button className="bam-wl-btn bam-wl-btn-ghost bam-wl-btn-sm" onClick={loadTransactions}>Retry</button>
                      </div>
                    ) : null}

                    {transactionsStatus === "idle" && transactions.length === 0 ? (
                      <div className="bam-wl-empty">
                        <p>No transactions yet.</p>
                        <div className="bam-wl-inline">
                          <button className="bam-wl-btn bam-wl-btn-primary bam-wl-btn-sm" onClick={() => setShowDepositModal(true)}>
                            Add tokens
                          </button>
                          <a href="/receiver" className="bam-wl-btn bam-wl-btn-ghost bam-wl-btn-sm">
                            Go live to earn
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {transactionsStatus === "idle" && transactions.length > 0 ? (
                      <div className="bam-wl-txn-list">
                        {transactions.map((txn) => (
                          <div key={txn.id} className="bam-wl-txn-row">
                            <div>
                              <div className="bam-wl-txn-label">{transactionLabels[txn.type]}</div>
                              <div className="bam-wl-txn-date">{new Date(txn.createdAt).toLocaleString()}</div>
                            </div>
                            <div className="bam-wl-txn-right">
                              <span className={txnBadgeClass(txn.status)}>{txn.status}</span>
                              <div style={{textAlign:"right"}}>
                                <div className="bam-wl-txn-amount">{txn.amountTokens.toLocaleString()} tokens</div>
                                <div className="bam-wl-txn-usd">{toUsd(txn.amountTokens)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

        </main>
      </div>

      {showWithdrawModal ? (
        <div className="bam-wl-backdrop" role="dialog" aria-modal="true" aria-label="Request withdrawal">
          <div className="bam-wl-modal">
            <div className="bam-wl-modal-header">
              <div className="bam-wl-modal-title">Request withdrawal</div>
              <button className="bam-wl-modal-close" onClick={() => setShowWithdrawModal(false)} aria-label="Close">✕</button>
            </div>
            <div className="bam-wl-modal-body">
              <p className="bam-wl-info-body">Withdraw to your USDT (TRC20) address on file. Requests are reviewed and sent within 24 hours — you&apos;ll get an on-chain receipt link once it&apos;s paid.</p>
              <div className="bam-wl-input-field">
                <label className="bam-wl-input-label" htmlFor="withdraw-amount">Amount (tokens)</label>
                <input
                  id="withdraw-amount"
                  className="bam-wl-input"
                  type="number"
                  min={1}
                  max={availableTokens}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
              <p className="bam-wl-info-body">Available: {availableTokens.toLocaleString()} tokens <span style={{color:"rgba(0,212,255,0.75)",fontWeight:600}}>({toUsd(availableTokens)})</span></p>
            </div>
            <div className="bam-wl-modal-actions">
              <button className="bam-wl-btn bam-wl-btn-ghost bam-wl-btn-sm" onClick={() => setShowWithdrawModal(false)}>Cancel</button>
              <button className="bam-wl-btn bam-wl-btn-primary bam-wl-btn-sm" onClick={handleWithdraw} disabled={isWithdrawing}>
                {isWithdrawing ? <span className="bam-wl-spinner" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDepositModal ? (
        <div className="bam-wl-backdrop" role="dialog" aria-modal="true" aria-label="Add tokens">
          <div className="bam-wl-modal">
            <div className="bam-wl-modal-header">
              <div className="bam-wl-modal-title">Add tokens</div>
              <button className="bam-wl-modal-close" onClick={() => setShowDepositModal(false)} aria-label="Close">✕</button>
            </div>
            <div className="bam-wl-modal-body">
              {depositStatus === "loading" ? (
                <div className="bam-wl-skeleton" style={{ height: 80 }} />
              ) : null}
              {depositStatus === "error" ? (
                <div className="bam-wl-empty">
                  <p>{depositError ?? "Deposit address unavailable."}</p>
                </div>
              ) : null}
              {depositStatus === "idle" && depositInfo ? (
                <>
                  <div className="bam-wl-inline">
                    <span className="bam-wl-network-pill">USDT · TRC20</span>
                    {depositInfo.memo ? (
                      <span className="bam-wl-info-body">Memo: {depositInfo.memo}</span>
                    ) : null}
                  </div>
                  <div className="bam-wl-qr-wrap">
                    <QRCodeSVG value={depositInfo.address} size={168} bgColor="#ffffff" fgColor="#05070f" level="M" />
                  </div>
                  <div className="bam-wl-address-box">
                    <span className="bam-wl-address">{maskAddress(depositInfo.address)}</span>
                    <button className="bam-wl-btn bam-wl-btn-ghost bam-wl-btn-sm" onClick={handleCopyAddress}>
                      Copy
                    </button>
                  </div>
                  <p className="bam-wl-warn">⚠ Send only USDT (TRC20) to this address. Other assets will be lost.</p>
                  <button className="bam-wl-btn bam-wl-btn-ghost bam-wl-btn-sm" onClick={handleViewDeposits}>
                    View pending deposits
                  </button>
                </>
              ) : null}
            </div>
            <div className="bam-wl-modal-actions">
              <button className="bam-wl-btn bam-wl-btn-ghost bam-wl-btn-sm" onClick={() => setShowDepositModal(false)}>Close</button>
              <button className="bam-wl-btn bam-wl-btn-primary bam-wl-btn-sm" onClick={handleViewDeposits}>I sent it</button>
            </div>
          </div>
        </div>
      ) : null}

    </AuthGuard>
  );
}

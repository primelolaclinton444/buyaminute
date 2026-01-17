"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import Tabs from "@/components/ui/Tabs";
import Toast from "@/components/ui/Toast";
import {
  walletApi,
  type WalletDepositInfo,
  type WalletSummary,
  type WalletTransaction,
  type WalletTransactionType,
} from "@/lib/api";
import styles from "./page.module.css";

const transactionVariant = (status: WalletTransaction["status"]) => {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    default:
      return "danger";
  }
};

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

export default function WalletPage() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [transactionFilter, setTransactionFilter] = useState<
    "all" | WalletTransactionType
  >("all");
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionsStatus, setTransactionsStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("100");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositInfo, setDepositInfo] = useState<WalletDepositInfo | null>(null);
  const [depositStatus, setDepositStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [depositError, setDepositError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      setTransactionsError(
        err instanceof Error ? err.message : "Unable to load transactions."
      );
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
      setDepositError(
        err instanceof Error ? err.message : "Unable to load deposit address."
      );
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (activeTab === "Transactions") {
      void loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  useEffect(() => {
    if (showDepositModal) {
      void loadDepositInfo();
    }
  }, [showDepositModal, loadDepositInfo]);

  const availableTokens = summary?.availableTokens ?? 0;
  const canWithdraw = availableTokens > 0;

  const withdrawalStatus = useMemo(() => {
    if (!summary) return "";
    const latest = summary.latestWithdrawal;
    if (latest.status === "none") {
      return "No withdrawals yet.";
    }
    if (latest.status === "pending") {
      return `Last request pending (${latest.amountTokens ?? 0} tokens).`;
    }
    if (latest.status === "failed") {
      return `Last request failed (${latest.amountTokens ?? 0} tokens).`;
    }
    return `Last withdrawal sent (${latest.amountTokens ?? 0} tokens).`;
  }, [summary]);

  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true);
      await walletApi.withdraw(Number(withdrawAmount));
      setToastMessage("Withdrawal request sent.");
      await loadSummary();
      await loadTransactions();
      setShowWithdrawModal(false);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Unable to withdraw.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleCopyAddress = async () => {
    if (!depositInfo?.address) return;
    try {
      await navigator.clipboard.writeText(depositInfo.address);
      setToastMessage("Deposit address copied.");
    } catch {
      setToastMessage("Unable to copy address.");
    }
  };

  const handleViewDeposits = () => {
    setActiveTab("Transactions");
    setTransactionFilter("deposit");
    setShowDepositModal(false);
  };

  const handleOpenWithdraw = () => {
    if (!canWithdraw) return;
    setShowWithdrawModal(true);
  };

  return (
    <AuthGuard>
      <Container>
        <main className={styles.page}>
          <header className={styles.header}>
            <div>
              <h1>Wallet</h1>
              <p>Track tokens moving in, on hold, and ready to use.</p>
            </div>
            <div className={styles.headerActions}>
              <Button onClick={() => setShowDepositModal(true)}>Add tokens</Button>
              {canWithdraw ? (
                <Button variant="ghost" onClick={handleOpenWithdraw}>
                  Request withdrawal
                </Button>
              ) : (
                <span className={styles.helperText}>No tokens available to withdraw.</span>
              )}
            </div>
          </header>

          {toastMessage ? (
            <Toast
              message={toastMessage}
              variant="success"
              onClose={() => setToastMessage(null)}
            />
          ) : null}

          {summaryError ? (
            <Toast
              message={summaryError}
              variant="error"
              onClose={() => setSummaryError(null)}
            />
          ) : null}

          {summaryStatus === "loading" ? (
            <div className={styles.cards}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} style={{ height: 120 }} />
              ))}
            </div>
          ) : null}

          {summaryStatus === "error" ? (
            <div className={styles.empty}>
              <p>We could not load wallet details.</p>
              <Button onClick={loadSummary}>Retry</Button>
            </div>
          ) : null}

          {summaryStatus === "idle" && summary ? (
            <>
              <div className={styles.cards}>
                <Card>
                  <div className={styles.metric}>
                    <strong>Total</strong>
                    <h2>{summary.totalTokens} tokens</h2>
                    <span>All tokens tracked for your account.</span>
                  </div>
                </Card>
                <Card>
                  <div className={styles.metric}>
                    <strong>Available</strong>
                    <h2>{summary.availableTokens} tokens</h2>
                    <span>Ready to spend or withdraw.</span>
                  </div>
                </Card>
                <Card>
                  <div className={styles.metric}>
                    <strong>On hold</strong>
                    <h2>{summary.onHoldTokens} tokens</h2>
                    <span>Reserved for pending withdrawals.</span>
                  </div>
                </Card>
                <Card>
                  <div className={styles.metric}>
                    <strong>Pending</strong>
                    <h2>{summary.pendingTokens} tokens</h2>
                    <span>Deposits awaiting confirmations.</span>
                  </div>
                </Card>
              </div>

              <div className={styles.cards}>
                <Card>
                  <div className={styles.section}>
                    <strong>Withdrawals</strong>
                    <p>Manual requests, reviewed in order received.</p>
                    <p className={styles.statusLine}>{withdrawalStatus}</p>
                    <p>
                      {summary.withdrawalAddressOnFile
                        ? "Withdrawal address is on file."
                        : "No withdrawal address on file yet."}
                    </p>
                  </div>
                </Card>
                <Card>
                  <div className={styles.section}>
                    <strong>Deposit network</strong>
                    <p>USDT (TRC20)</p>
                    <Button variant="ghost" onClick={() => setShowDepositModal(true)}>
                      View address
                    </Button>
                  </div>
                </Card>
              </div>

              <Tabs
                tabs={[
                  { id: "Overview", label: "Overview" },
                  { id: "Transactions", label: "Transactions" },
                ]}
                active={activeTab}
                onChange={setActiveTab}
              />

              {activeTab === "Overview" ? (
                <Card>
                  <div className={styles.section}>
                    <h3>Summary</h3>
                    <p>
                      Keep tokens ready for calls, or add more to stay available. Holds
                      clear once withdrawals are processed.
                    </p>
                    <div className={styles.inlineActions}>
                      <Button onClick={() => setShowDepositModal(true)}>
                        Add tokens
                      </Button>
                      <Button href="/pings" variant="ghost">
                        View pings
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}

              {activeTab === "Transactions" ? (
                <Card>
                  <div className={styles.section}>
                    <div className={styles.transactionHeader}>
                      <h3>Activity</h3>
                      <div className={styles.filterRow}>
                        {transactionFilters.map((filter) => (
                          <button
                            key={filter.id}
                            type="button"
                            className={
                              transactionFilter === filter.id
                                ? styles.filterActive
                                : styles.filterButton
                            }
                            onClick={() => setTransactionFilter(filter.id)}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {transactionsStatus === "loading" ? (
                      <div className={styles.transactions}>
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={index} style={{ height: 64 }} />
                        ))}
                      </div>
                    ) : null}
                    {transactionsStatus === "error" ? (
                      <div className={styles.empty}>
                        <p>{transactionsError ?? "Unable to load transactions."}</p>
                        <Button onClick={loadTransactions}>Retry</Button>
                      </div>
                    ) : null}
                    {transactionsStatus === "idle" && transactions.length === 0 ? (
                      <div className={styles.empty}>
                        <p>No transactions yet. Add tokens or go live to earn.</p>
                        <div className={styles.inlineActions}>
                          <Button onClick={() => setShowDepositModal(true)}>
                            Add tokens
                          </Button>
                          <Button href="/receiver" variant="ghost">
                            Go live to earn
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {transactionsStatus === "idle" && transactions.length > 0 ? (
                      <div className={styles.transactions}>
                        {transactions.map((txn) => (
                          <div key={txn.id} className={styles.transactionRow}>
                            <div>
                              <strong>{transactionLabels[txn.type]}</strong>
                              <p>{new Date(txn.createdAt).toLocaleString()}</p>
                            </div>
                            <div className={styles.inlineActions}>
                              <Badge variant={transactionVariant(txn.status)}>
                                {txn.status}
                              </Badge>
                              <span>{txn.amountTokens} tokens</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Card>
              ) : null}
            </>
          ) : null}
        </main>
      </Container>

      <Modal
        title="Request withdrawal"
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowWithdrawModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw} disabled={isWithdrawing}>
              {isWithdrawing ? <Spinner /> : "Confirm"}
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <p>Withdraw available tokens to your USDT (TRC20) address on file.</p>
          <Input
            label="Amount (tokens)"
            type="number"
            min={1}
            max={availableTokens}
            value={withdrawAmount}
            onChange={(event) => setWithdrawAmount(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        title="Add tokens"
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowDepositModal(false)}>
              Close
            </Button>
            <Button onClick={handleViewDeposits}>I sent it</Button>
          </>
        }
      >
        <div className={styles.form}>
          <p>Deposit tokens via USDT (TRC20).</p>
          {depositStatus === "loading" ? (
            <Skeleton style={{ height: 72 }} />
          ) : null}
          {depositStatus === "error" ? (
            <div className={styles.empty}>
              <p>{depositError ?? "Deposit address unavailable."}</p>
            </div>
          ) : null}
          {depositStatus === "idle" && depositInfo ? (
            <>
              <div className={styles.depositRow}>
                <div>
                  <strong>Network</strong>
                  <p>{depositInfo.network}</p>
                </div>
                {depositInfo.memo ? (
                  <div>
                    <strong>Memo</strong>
                    <p>{depositInfo.memo}</p>
                  </div>
                ) : null}
              </div>
              <div className={styles.addressBox}>
                <div>
                  <strong>Deposit address</strong>
                  <p>{maskAddress(depositInfo.address)}</p>
                </div>
                <Button variant="ghost" onClick={handleCopyAddress}>
                  Copy address
                </Button>
              </div>
              <p className={styles.warning}>
                Send only USDT (TRC20) to this address.
              </p>
              <Button variant="ghost" onClick={handleViewDeposits}>
                View pending deposits
              </Button>
            </>
          ) : null}
        </div>
      </Modal>
    </AuthGuard>
  );
}

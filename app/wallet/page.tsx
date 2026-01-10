"use client";

import { useCallback, useEffect, useState } from "react";
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
import { walletApi, type WalletSummary, type WalletTransaction } from "@/lib/api";
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

export default function WalletPage() {
  const [data, setData] = useState<WalletSummary | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [withdrawAmount, setWithdrawAmount] = useState("100");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);
      const response = await walletApi.getWallet();
      setData(response);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to load wallet.");
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true);
      await walletApi.withdraw(Number(withdrawAmount));
      setToastMessage("Withdrawal request sent.");
      await loadWallet();
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to withdraw.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const transactions = data?.transactions ?? [];

  return (
    <AuthGuard>
      <Container>
        <main className={styles.page}>
          <header>
            <h1>Wallet</h1>
            <p>Track your balance, payouts, and recent activity.</p>
          </header>

          {toastMessage ? (
            <Toast
              message={toastMessage}
              variant="success"
              onClose={() => setToastMessage(null)}
            />
          ) : null}

          {error ? (
            <Toast message={error} variant="error" onClose={() => setError(null)} />
          ) : null}

          {status === "loading" ? (
            <div className={styles.cards}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} style={{ height: 120 }} />
              ))}
            </div>
          ) : null}

          {status === "error" ? (
            <div className={styles.empty}>
              <p>We could not load wallet details.</p>
              <Button onClick={loadWallet}>Retry</Button>
            </div>
          ) : null}

          {status === "idle" && data ? (
            <>
              <div className={styles.cards}>
                <Card>
                  <div className={styles.section}>
                    <strong>Token balance</strong>
                    <h2>{data.balanceTokens} tokens</h2>
                    <span>${data.availableUsd.toFixed(2)} available</span>
                  </div>
                </Card>
                <Card>
                  <div className={styles.section}>
                    <strong>Next payout</strong>
                    <p>Friday at 9:00 AM PT</p>
                    <Button variant="ghost" onClick={() => setShowModal(true)}>
                      Request withdrawal
                    </Button>
                  </div>
                </Card>
                <Card>
                  <div className={styles.section}>
                    <strong>Payout method</strong>
                    <p>USDT (TRC20)</p>
                    <Button variant="ghost">Update method</Button>
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
                      You have {data.balanceTokens} tokens ready to use. Schedule a
                      withdrawal or keep earning by accepting more pings.
                    </p>
                    <div className={styles.inlineActions}>
                      <Button onClick={() => setShowModal(true)}>
                        Withdraw funds
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
                    <h3>Recent activity</h3>
                    {transactions.length === 0 ? (
                      <div className={styles.empty}>
                        <p>No transactions yet.</p>
                        <Button href="/browse" variant="ghost">
                          Browse experts
                        </Button>
                      </div>
                    ) : (
                      <div className={styles.transactions}>
                        {transactions.map((txn) => (
                          <div key={txn.id} className={styles.transactionRow}>
                            <div>
                              <strong>{txn.type}</strong>
                              <p>{new Date(txn.createdAt).toLocaleString()}</p>
                            </div>
                            <div className={styles.inlineActions}>
                              <Badge variant={transactionVariant(txn.status)}>{
                                txn.status
                              }</Badge>
                              <span>{txn.amount} tokens</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ) : null}
            </>
          ) : null}
        </main>
      </Container>

      <Modal
        title="Request withdrawal"
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw} disabled={isWithdrawing}>
              {isWithdrawing ? <Spinner /> : "Confirm"}
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <p>Withdraw tokens to your connected USDT (TRC20) address.</p>
          <Input
            label="Amount (tokens)"
            type="number"
            min={1}
            value={withdrawAmount}
            onChange={(event) => setWithdrawAmount(event.target.value)}
          />
        </div>
      </Modal>
    </AuthGuard>
  );
}

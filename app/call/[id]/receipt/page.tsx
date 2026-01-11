"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import styles from "../../call.module.css";

type Receipt = {
  id: string;
  caller: string;
  receiver: string;
  duration: string;
  previewApplied: string;
  totalCharged: string;
  refunded: string;
};

export default function CallReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    async function loadReceipt() {
      const res = await fetch(`/api/calls/receipt?id=${id}`);
      const data = await res.json();
      setReceipt(data.receipt ?? null);
    }
    loadReceipt();
  }, [id]);

  return (
    <AuthGuard>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.pill}>Receipt</p>
            <h1>Call receipt</h1>
            <p className={styles.subtitle}>
              Review the call total, preview time, and any refunds applied.
            </p>
          </header>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Summary</h2>
                <p className={styles.subtitle}>Call ID: {receipt?.id ?? id}</p>
              </div>
              <Link className={styles.button} href="/call">
                Back to calls
              </Link>
            </div>

            {receipt ? (
              <div className={styles.grid}>
                <div>
                  <p className={styles.subtitle}>Caller</p>
                  <strong>@{receipt.caller}</strong>
                </div>
                <div>
                  <p className={styles.subtitle}>Receiver</p>
                  <strong>@{receipt.receiver}</strong>
                </div>
                <div>
                  <p className={styles.subtitle}>Duration</p>
                  <strong>{receipt.duration}</strong>
                </div>
                <div>
                  <p className={styles.subtitle}>Preview applied</p>
                  <strong>{receipt.previewApplied}</strong>
                </div>
                <div>
                  <p className={styles.subtitle}>Total charged</p>
                  <strong>{receipt.totalCharged}</strong>
                </div>
                <div>
                  <p className={styles.subtitle}>Refunded</p>
                  <strong>{receipt.refunded}</strong>
                </div>
              </div>
            ) : (
              <div className={styles.status}>
                <strong>Loading receipt…</strong>
                <span>Fetching billing details.</span>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2>Next steps</h2>
            <div className={styles.grid}>
              <div>
                <h3>Withdraw earnings</h3>
                <p className={styles.subtitle}>
                  Transfer your earnings to your wallet when ready.
                </p>
              </div>
              <div>
                <h3>Follow up</h3>
                <p className={styles.subtitle}>
                  Send an availability ping if you want to continue the conversation.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}

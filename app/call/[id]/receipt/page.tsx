"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import Toast from "@/components/ui/Toast";
import styles from "../../call.module.css";

type Receipt = {
  id: string;
  caller: string;
  receiver: string;
  duration: string;
  durationSeconds: number;
  previewApplied: string;
  totalCharged: string;
  refunded: string;
  earned: string;
  viewerRole: "caller" | "receiver";
  outcomeCode?: string | null;
  outcomeMessage?: string | null;
};

export default function CallReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [shareGateOpen, setShareGateOpen] = useState(true);
  const [shareGateReady, setShareGateReady] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadReceipt() {
      const res = await fetch(`/api/calls/receipt?id=${id}`);
      const data = await res.json();
      setReceipt(data.receipt ?? null);
    }
    loadReceipt();
  }, [id]);

  useEffect(() => {
    if (!receipt) return;
    if (!receipt.outcomeCode) return;
    const message =
      receipt.viewerRole === "receiver"
        ? `Settlement posted: ${receipt.earned}`
        : receipt.outcomeCode.includes("refunded")
          ? `Refund posted: ${receipt.refunded}`
          : `Settlement posted: ${receipt.totalCharged}`;
    setToastMessage(message);
    const timer = window.setTimeout(() => setToastMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [receipt]);

  useEffect(() => {
    setShareGateOpen(true);
    setShareGateReady(false);
    const timer = window.setTimeout(() => {
      setShareGateReady(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [id]);

  const shareCopy = receipt
    ? receipt.viewerRole === "receiver"
      ? `You earned ${receipt.earned} in ${(
          receipt.durationSeconds / 60
        ).toFixed(2)} minutes.`
      : `You paid ${receipt.totalCharged} to talk to @${receipt.receiver}.`
    : "Time has value.";

  function handleShare(platform: "x" | "instagram" | "whatsapp") {
    if (!receipt) return;
    const text = encodeURIComponent(`${shareCopy} Time has value.`);
    if (platform === "x") {
      window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
      return;
    }
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${text}`, "_blank");
      return;
    }
    window.open("https://www.instagram.com", "_blank");
  }

  const outcomeBanner = useMemo(() => {
    if (!receipt?.outcomeCode) return null;
    return receipt.outcomeMessage ?? "Call complete.";
  }, [receipt?.outcomeCode, receipt?.outcomeMessage]);

  return (
    <AuthGuard>
      <main className={styles.page}>
        {toastMessage ? (
          <Toast
            message={toastMessage}
            variant="success"
            onClose={() => setToastMessage(null)}
            className={styles.toast}
          />
        ) : null}
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.pill}>Receipt</p>
            <h1>Call receipt</h1>
            <p className={styles.subtitle}>
              Review the call total, preview time, and any credits returned.
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
                  <p className={styles.subtitle}>Credits returned</p>
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

        {shareGateOpen ? (
          <div className={styles.shareGate}>
            {outcomeBanner ? (
              <div className={styles.outcomeBanner} role="status">
                <strong>Outcome</strong>
                <span>{outcomeBanner}</span>
              </div>
            ) : null}
            <div className={styles.shareGateCard}>
              <p className={styles.pill}>Share</p>
              <h2>Time has value.</h2>
              <p className={styles.subtitle}>
                {receipt ? (
                  receipt.viewerRole === "receiver" ? (
                    <>
                      You earned {receipt.earned} in{" "}
                      {(receipt.durationSeconds / 60).toFixed(2)} minutes.
                    </>
                  ) : (
                    <>
                      You paid {receipt.totalCharged} to talk to @
                      {receipt.receiver}.
                    </>
                  )
                ) : (
                  "Fetching receipt details…"
                )}
              </p>
              <div className={styles.grid}>
                <button
                  className={styles.button}
                  type="button"
                  onClick={() => handleShare("x")}
                >
                  Share on X
                </button>
                <button
                  className={styles.button}
                  type="button"
                  onClick={() => handleShare("instagram")}
                >
                  Instagram Stories
                </button>
                <button
                  className={styles.button}
                  type="button"
                  onClick={() => handleShare("whatsapp")}
                >
                  WhatsApp
                </button>
              </div>
              <div className={styles.row}>
                <button
                  className={styles.button}
                  type="button"
                  disabled={!shareGateReady}
                  onClick={() => setShareGateOpen(false)}
                >
                  {shareGateReady ? "Continue" : "Continue in 1s…"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}

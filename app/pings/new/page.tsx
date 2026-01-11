"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import Toast from "@/components/ui/Toast";
import { pingsApi } from "@/lib/api";
import { PING_QUESTION_OPTIONS } from "@/lib/pings";
import styles from "./page.module.css";

export default function NewPingPage() {
  const router = useRouter();
  const [topic, setTopic] = useState(PING_QUESTION_OPTIONS[0]?.id ?? "");
  const [requestedFor, setRequestedFor] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setStatus("idle"), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      setStatus("saving");
      setError(null);
      await pingsApi.createPing({ topic, requestedFor });
      setToastMessage("Ping sent.");
      setTimeout(() => router.push("/pings"), 600);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to send ping.");
    }
  }, [topic, requestedFor, router]);

  const isValid = topic.trim().length > 0 && requestedFor.trim().length > 0;
  const showEmpty = status === "idle" && !requestedFor;

  return (
    <AuthGuard>
      <Container>
        <main className={styles.page}>
          <header>
            <h1>New ping</h1>
            <p>Send a new request and let someone know how they can help.</p>
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

          {status === "error" ? (
            <div className={styles.empty}>
              <p>We could not send your ping.</p>
              <Button onClick={handleSubmit}>Retry</Button>
            </div>
          ) : null}

          {status === "loading" ? (
            <div className={styles.form}>
              <Skeleton style={{ height: 52 }} />
              <Skeleton style={{ height: 52 }} />
            </div>
          ) : null}

          {showEmpty ? (
            <div className={styles.empty}>
              <p>Start by drafting your first ping.</p>
              <Button
                onClick={() => {
                  setTopic(PING_QUESTION_OPTIONS[0]?.id ?? "");
                  setRequestedFor("Avery Park");
                }}
              >
                Use sample
              </Button>
            </div>
          ) : null}

          <Card>
            <div className={styles.form}>
              <div className={styles.questionGroup}>
                <label className={styles.label}>Question</label>
                <div className={styles.questionOptions}>
                  {PING_QUESTION_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={
                        topic === option.id ? styles.optionActive : styles.option
                      }
                      onClick={() => setTopic(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className={styles.helperText}>
                  Pings are paid availability checks. Choose a preset question only.
                </p>
              </div>
              <Input
                label="Who is this for?"
                value={requestedFor}
                onChange={(event) => setRequestedFor(event.target.value)}
                placeholder="Avery Park"
              />
            </div>
          </Card>

          <div className={styles.actions}>
            <Button variant="ghost" onClick={() => router.push("/pings")}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || status === "saving"}>
              {status === "saving" ? <Spinner /> : "Send ping"}
            </Button>
          </div>
        </main>
      </Container>
    </AuthGuard>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import Toast from "@/components/ui/Toast";
import { pingsApi, type PingRequest, type PingsResponse } from "@/lib/api";
import styles from "./page.module.css";

const statusVariant = (status: PingRequest["status"]) => {
  switch (status) {
    case "accepted":
      return "success";
    case "new":
      return "info";
    case "completed":
      return "success";
    default:
      return "warning";
  }
};

export default function PingsPage() {
  const [data, setData] = useState<PingsResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPings = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);
      const response = await pingsApi.getPings();
      setData(response);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to load pings.");
    }
  }, []);

  useEffect(() => {
    loadPings();
  }, [loadPings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPings();
    setIsRefreshing(false);
  };

  const pings = data?.pings ?? [];

  return (
    <AuthGuard>
      <Container>
        <main className={styles.page}>
          <header className={styles.actions}>
            <div>
              <h1>Pings</h1>
              <p>Respond to incoming requests and keep momentum moving.</p>
            </div>
            <div className={styles.actions}>
              <Button href="/pings/new">New ping</Button>
              <Button variant="ghost" onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? <Spinner /> : "Refresh"}
              </Button>
            </div>
          </header>

          {error ? (
            <Toast message={error} variant="error" onClose={() => setError(null)} />
          ) : null}

          {status === "loading" ? (
            <div className={styles.list}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} style={{ height: 90 }} />
              ))}
            </div>
          ) : null}

          {status === "error" ? (
            <div className={styles.empty}>
              <p>We could not load your pings.</p>
              <Button onClick={loadPings}>Retry</Button>
            </div>
          ) : null}

          {status === "idle" && data ? (
            <Card>
              {pings.length === 0 ? (
                <div className={styles.empty}>
                  <p>No pings yet.</p>
                  <Button href="/browse" variant="ghost">
                    Browse experts
                  </Button>
                </div>
              ) : (
                <div className={styles.list}>
                  {pings.map((ping) => (
                    <div key={ping.id} className={styles.row}>
                      <div>
                        <strong>{ping.topic}</strong>
                        <p>From {ping.requester}</p>
                        <p>{new Date(ping.createdAt).toLocaleString()}</p>
                      </div>
                      <Badge variant={statusVariant(ping.status)}>{ping.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}
        </main>
      </Container>
    </AuthGuard>
  );
}

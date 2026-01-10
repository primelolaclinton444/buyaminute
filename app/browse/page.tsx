"use client";

import { useCallback, useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { browseApi, type BrowseProfile, type BrowseResponse } from "@/lib/api";
import styles from "./page.module.css";

const statusVariant = (status: BrowseProfile["status"]) => {
  switch (status) {
    case "available":
      return "success";
    case "busy":
      return "warning";
    default:
      return "danger";
  }
};

export default function BrowsePage() {
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("All");

  const loadBrowse = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);
      const response = await browseApi.getBrowse();
      setData(response);
      setActiveTab(response.categories[0] ?? "All");
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, []);

  useEffect(() => {
    loadBrowse();
  }, [loadBrowse]);

  const profiles = data?.profiles ?? [];
  const tabs = (data?.categories ?? ["All"]).map((label) => ({ id: label, label }));
  const filteredProfiles = activeTab === "All"
    ? profiles
    : profiles.filter((profile) => profile.categories.includes(activeTab));

  return (
    <AuthGuard>
      <Container>
        <main className={styles.page}>
          <header className={styles.header}>
            <h1>Browse experts</h1>
            <p>Find the right person to review your next idea, deck, or launch plan.</p>
          </header>

          {error ? (
            <Toast
              message={error}
              variant="error"
              onClose={() => setError(null)}
            />
          ) : null}

          {status === "loading" ? (
            <div className={styles.grid}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} style={{ height: 140 }} />
              ))}
            </div>
          ) : null}

          {status === "error" ? (
            <div className={styles.empty}>
              <p>We could not load experts right now.</p>
              <Button onClick={loadBrowse}>Retry</Button>
            </div>
          ) : null}

          {status === "idle" && data ? (
            <>
              <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
              {filteredProfiles.length === 0 ? (
                <div className={styles.empty}>
                  <p>No experts match that category yet.</p>
                  <Button onClick={() => setActiveTab("All")} variant="ghost">
                    Clear filter
                  </Button>
                </div>
              ) : (
                <div className={styles.grid}>
                  {filteredProfiles.map((profile) => (
                    <Card key={profile.id}>
                      <div className={styles.cardHeader}>
                        <strong>{profile.name}</strong>
                        <Badge variant={statusVariant(profile.status)}>{profile.status}</Badge>
                      </div>
                      <div className={styles.cardBody}>
                        <p>{profile.tagline}</p>
                        <p>${profile.rate.toFixed(2)} / min</p>
                        <div className={styles.actionsRow}>
                          <Button href={`/u/${profile.username}`}>View profile</Button>
                          <Button href="/pings/new" variant="ghost">
                            Send ping
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </main>
      </Container>
    </AuthGuard>
  );
}

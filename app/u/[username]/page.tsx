"use client";

import { useCallback, useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import Toast from "@/components/ui/Toast";
import Input from "@/components/ui/Input";
import {
  profileApi,
  type ProfileResponse,
  type BrowseProfile,
} from "@/lib/api";
import styles from "./page.module.css";

type StatusVariant = "success" | "warning" | "danger";

const statusVariant = (status: BrowseProfile["status"]): StatusVariant => {
  switch (status) {
    case "available":
      return "success";
    case "busy":
      return "warning";
    default:
      return "danger";
  }
};

type ProfilePageProps = {
  params: { username: string };
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("About");
  const [showModal, setShowModal] = useState(false);
  const [pingTopic, setPingTopic] = useState("Quick feedback");

  const loadProfile = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);
      const response = await profileApi.getProfile(params.username);
      setData(response);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to load profile.");
    }
  }, [params.username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const profile = data?.profile;

  return (
    <AuthGuard>
      <Container>
        <main className={styles.page}>
          {status === "loading" ? (
            <div className={styles.section}>
              <Skeleton style={{ height: 120 }} />
              <Skeleton style={{ height: 220 }} />
            </div>
          ) : null}

          {status === "error" ? (
            <div className={styles.empty}>
              <p>We could not load this profile.</p>
              <Button onClick={loadProfile}>Retry</Button>
            </div>
          ) : null}

          {error ? (
            <Toast message={error} variant="error" onClose={() => setError(null)} />
          ) : null}

          {status === "idle" && !profile ? (
            <div className={styles.empty}>
              <p>No profile details available yet.</p>
              <Button onClick={loadProfile}>Retry</Button>
            </div>
          ) : null}

          {status === "idle" && profile ? (
            <>
              <header className={styles.header}>
                <h1>{profile.name}</h1>
                <div className={styles.meta}>
                  <Badge variant={statusVariant(profile.status)}>{profile.status}</Badge>
                  <span>${profile.rate.toFixed(2)} / min</span>
                  <span>{profile.responseTime}</span>
                </div>
              </header>

              <Tabs
                tabs={[
                  { id: "About", label: "About" },
                  { id: "Reviews", label: "Reviews" },
                  { id: "Details", label: "Details" },
                ]}
                active={activeTab}
                onChange={setActiveTab}
              />

              {activeTab === "About" ? (
                <Card>
                  <div className={styles.section}>
                    <p>{profile.tagline}</p>
                    <p>{profile.bio}</p>
                    <div className={styles.actions}>
                      <Button onClick={() => setShowModal(true)}>Send a ping</Button>
                      <Button href="/pings" variant="ghost">
                        View pings
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}

              {activeTab === "Reviews" ? (
                <Card>
                  <div className={styles.reviews}>
                    {profile.reviews.length === 0 ? (
                      <p>No reviews yet.</p>
                    ) : (
                      profile.reviews.map((review) => (
                        <div key={review.id}>
                          <strong>{review.author}</strong>
                          <p>Rating: {review.rating} / 5</p>
                          <p>{review.quote}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              ) : null}

              {activeTab === "Details" ? (
                <Card>
                  <div className={styles.section}>
                    <div>
                      <strong>Categories</strong>
                      <p>{profile.categories.join(", ")}</p>
                    </div>
                    <div>
                      <strong>Languages</strong>
                      <p>{profile.languages.join(", ")}</p>
                    </div>
                  </div>
                </Card>
              ) : null}
            </>
          ) : null}
        </main>
      </Container>

      <Modal
        title="Send a ping"
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowModal(false)}>Send ping</Button>
          </>
        }
      >
        <p>Share what you need help with and we will notify {profile?.name ?? "them"}.</p>
        <Input
          label="Topic"
          value={pingTopic}
          onChange={(event) => setPingTopic(event.target.value)}
          placeholder="Feedback on pricing page"
        />
      </Modal>
    </AuthGuard>
  );
}

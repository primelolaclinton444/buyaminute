"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import Toast from "@/components/ui/Toast";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  profileApi,
  type ProfileResponse,
  type BrowseProfile,
  type PublicProfileResponse,
  userApi,
} from "@/lib/api";
import { PING_QUESTION_OPTIONS } from "@/lib/pings";
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
  const { session } = useAuth();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfileResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [publicStatus, setPublicStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [activeTab, setActiveTab] = useState("About");
  const [showModal, setShowModal] = useState(false);
  const [pingTopic, setPingTopic] = useState(
    PING_QUESTION_OPTIONS[0]?.id ?? ""
  );

  const loadPublicProfile = useCallback(async (username: string) => {
    try {
      setPublicStatus("loading");
      setPublicError(null);
      const response = await profileApi.getPublicProfile(username);
      setPublicProfile(response);
      setPublicStatus("idle");
    } catch (err) {
      setPublicStatus("error");
      setPublicError(
        err instanceof Error ? err.message : "Unable to load public profile."
      );
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);
      const response = await profileApi.getProfile(params.username);
      setData(response);
      setStatus("idle");
      await loadPublicProfile(params.username);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to load profile.");
    }
  }, [loadPublicProfile, params.username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const profile = data?.profile;
  const isOwner =
    !!session?.user?.id && !!profile?.id && session.user.id === profile.id;
  const showEarningsLine =
    publicProfile?.earningsVisible === true &&
    typeof publicProfile.totalEarningsTokens === "number" &&
    typeof publicProfile.minutesSold === "number";

  const earningsLine = useMemo(() => {
    if (!showEarningsLine || !publicProfile) {
      return null;
    }

    const tokens = new Intl.NumberFormat("en-US").format(
      publicProfile.totalEarningsTokens ?? 0
    );
    const minutes = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(publicProfile.minutesSold ?? 0);

    return `${tokens} tokens earned · ${minutes} minutes sold`;
  }, [publicProfile, showEarningsLine]);

  const handlePrivacyToggle = useCallback(
    async (nextValue: boolean) => {
      if (!profile?.id) {
        return;
      }

      setIsUpdatingPrivacy(true);
      setPrivacyError(null);

      try {
        await userApi.setEarningsPrivacy(nextValue);
        await loadPublicProfile(params.username);
      } catch (err) {
        setPrivacyError(
          err instanceof Error ? err.message : "Unable to update earnings visibility."
        );
      } finally {
        setIsUpdatingPrivacy(false);
      }
    },
    [loadPublicProfile, params.username, profile?.id]
  );

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
                {earningsLine ? (
                  <p className={styles.earningsLine}>{earningsLine}</p>
                ) : null}
                <div className={styles.meta}>
                  <Badge variant={statusVariant(profile.status)}>{profile.status}</Badge>
                  <span>${profile.rate.toFixed(2)} / min</span>
                  <span>{profile.responseTime}</span>
                </div>
                {isOwner ? (
                  <div className={styles.privacyToggle}>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={publicProfile?.earningsVisible ?? true}
                        disabled={
                          isUpdatingPrivacy || publicStatus === "loading"
                        }
                        onChange={(event) => handlePrivacyToggle(event.target.checked)}
                      />
                      Show earnings publicly
                    </label>
                    {privacyError ? (
                      <p className={styles.privacyError}>{privacyError}</p>
                    ) : null}
                    {publicError ? (
                      <p className={styles.privacyError}>{publicError}</p>
                    ) : null}
                  </div>
                ) : null}
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
        <div className={styles.questionGroup}>
          <p className={styles.helperText}>Choose a preset question:</p>
          <div className={styles.questionOptions}>
            {PING_QUESTION_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={
                  pingTopic === option.id ? styles.optionActive : styles.option
                }
                onClick={() => setPingTopic(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </AuthGuard>
  );
}

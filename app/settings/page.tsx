"use client";

import { useCallback, useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import Tabs from "@/components/ui/Tabs";
import Toast from "@/components/ui/Toast";
import { settingsApi, type SettingsPayload, type SettingsResponse } from "@/lib/api";
import styles from "./page.module.css";

export default function SettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Profile");
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<SettingsPayload>({
    displayName: "",
    email: "",
    timezone: "",
    marketingOptIn: false,
  });

  const loadSettings = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);
      const response = await settingsApi.getSettings();
      setData(response);
      setFormState(response.settings);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to load settings.");
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await settingsApi.updateSettings(formState);
      setData(response);
      setToastMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthGuard>
      <Container>
        <main className={styles.page}>
          <header>
            <h1>Settings</h1>
            <p>Manage your profile, notifications, and account preferences.</p>
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
            <div className={styles.section}>
              <Skeleton style={{ height: 160 }} />
              <Skeleton style={{ height: 220 }} />
            </div>
          ) : null}

          {status === "error" ? (
            <div className={styles.empty}>
              <p>We could not load settings.</p>
              <Button onClick={loadSettings}>Retry</Button>
            </div>
          ) : null}

          {status === "idle" && !data ? (
            <div className={styles.empty}>
              <p>No settings found yet.</p>
              <Button onClick={loadSettings}>Retry</Button>
            </div>
          ) : null}

          {status === "idle" && data ? (
            <>
              <Tabs
                tabs={[
                  { id: "Profile", label: "Profile" },
                  { id: "Notifications", label: "Notifications" },
                ]}
                active={activeTab}
                onChange={setActiveTab}
              />

              {activeTab === "Profile" ? (
                <Card>
                  <div className={styles.section}>
                    <div className={styles.inlineActions}>
                      <h2>Profile settings</h2>
                      <Badge variant="info">Visible</Badge>
                    </div>
                    <div className={styles.form}>
                      <Input
                        label="Display name"
                        value={formState.displayName}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            displayName: event.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={formState.email}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            email: event.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Timezone"
                        value={formState.timezone}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            timezone: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </Card>
              ) : null}

              {activeTab === "Notifications" ? (
                <Card>
                  <div className={styles.section}>
                    <h2>Notification preferences</h2>
                    <label className={styles.inlineActions}>
                      <input
                        type="checkbox"
                        checked={formState.marketingOptIn}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            marketingOptIn: event.target.checked,
                          }))
                        }
                      />
                      Receive product updates and promotions
                    </label>
                  </div>
                </Card>
              ) : null}

              <div className={styles.inlineActions}>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Spinner /> : "Save changes"}
                </Button>
                <Button variant="ghost" onClick={loadSettings}>
                  Reset
                </Button>
              </div>
            </>
          ) : null}
        </main>
      </Container>
    </AuthGuard>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  profileApi,
  pingsApi,
  type ProfileResponse,
  type BrowseProfile,
  type PublicProfileResponse,
  userApi,
} from "@/lib/api";
import { PING_QUESTION_OPTIONS } from "@/lib/pings";

const css = `
  .bam-pr-wrap { margin: 0 auto; max-width: 860px; padding: 0 24px; }
  .bam-pr-page { padding: 40px 0 80px; display: flex; flex-direction: column; gap: 24px; }

  /* ── Hero ── */
  .bam-pr-hero {
    background: rgba(12,16,32,0.7); border: 1px solid rgba(124,92,255,0.18);
    border-radius: 24px; padding: 32px; backdrop-filter: blur(10px);
    display: flex; flex-direction: column; gap: 20px;
  }
  .bam-pr-hero-top { display: flex; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
  .bam-pr-avatar {
    width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem; font-weight: 700; letter-spacing: 0.02em;
    background: rgba(124,92,255,0.2); color: #c4b5fd;
    border: 2px solid rgba(124,92,255,0.3);
  }
  .bam-pr-identity { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
  .bam-pr-name { font-size: 1.5rem; font-weight: 700; color: #f5f7ff; letter-spacing: -0.02em; }
  .bam-pr-handle { font-size: 0.85rem; color: rgba(245,247,255,0.35); }
  .bam-pr-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .bam-pr-status {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 999px;
    font-size: 0.72rem; font-weight: 600;
  }
  .bam-pr-status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .bam-pr-available { background: rgba(0,255,136,0.1); color: #6ee7b7; border: 1px solid rgba(0,255,136,0.2); }
  .bam-pr-available .bam-pr-status-dot { background: #4ade80; }
  .bam-pr-busy { background: rgba(255,184,48,0.1); color: #fcd34d; border: 1px solid rgba(255,184,48,0.2); }
  .bam-pr-busy .bam-pr-status-dot { background: #fbbf24; }
  .bam-pr-offline { background: rgba(255,255,255,0.05); color: rgba(245,247,255,0.35); border: 1px solid rgba(255,255,255,0.08); }
  .bam-pr-offline .bam-pr-status-dot { background: rgba(245,247,255,0.25); }
  .bam-pr-rate { font-size: 0.9rem; font-weight: 700; color: #f5f7ff; }
  .bam-pr-rate span { font-size: 0.75rem; font-weight: 400; color: rgba(245,247,255,0.4); margin-left: 2px; }
  .bam-pr-response { font-size: 0.8rem; color: rgba(245,247,255,0.4); }
  .bam-pr-earnings { font-size: 0.8rem; color: rgba(196,181,253,0.7); }
  .bam-pr-tagline { font-size: 0.95rem; color: rgba(245,247,255,0.6); line-height: 1.6; }
  .bam-pr-ctas { display: flex; gap: 10px; flex-wrap: wrap; }
  .bam-pr-btn {
    padding: 11px 22px; border-radius: 999px; font-size: 0.88rem; font-weight: 600;
    font-family: inherit; cursor: pointer; border: none; text-decoration: none;
    display: inline-flex; align-items: center; gap: 6px;
    transition: opacity 0.15s ease, transform 0.15s ease; letter-spacing: 0.01em;
  }
  .bam-pr-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
  .bam-pr-btn-primary { background: linear-gradient(120deg, #7c5cff 0%, #00d4ff 100%); color: #0b0f1f; }
  .bam-pr-btn-ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: rgba(245,247,255,0.7); }
  .bam-pr-btn-sm { padding: 8px 16px; font-size: 0.8rem; }

  /* ── Owner controls ── */
  .bam-pr-owner-bar {
    background: rgba(124,92,255,0.06); border: 1px solid rgba(124,92,255,0.15);
    border-radius: 12px; padding: 12px 16px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap;
  }
  .bam-pr-owner-label { font-size: 0.8rem; color: rgba(245,247,255,0.5); }
  .bam-pr-toggle-wrap { display: flex; align-items: center; gap: 8px; }
  .bam-pr-toggle-label { font-size: 0.82rem; color: rgba(245,247,255,0.6); cursor: pointer; }
  .bam-pr-toggle {
    width: 36px; height: 20px; border-radius: 999px; border: none; cursor: pointer;
    position: relative; transition: background 0.2s ease; flex-shrink: 0;
    background: rgba(255,255,255,0.1);
  }
  .bam-pr-toggle-on { background: rgba(124,92,255,0.7); }
  .bam-pr-toggle::after {
    content: ""; position: absolute; top: 3px; left: 3px;
    width: 14px; height: 14px; border-radius: 50%; background: #fff;
    transition: transform 0.2s ease;
  }
  .bam-pr-toggle-on::after { transform: translateX(16px); }
  .bam-pr-toggle:disabled { opacity: 0.4; cursor: not-allowed; }
  .bam-pr-privacy-error { font-size: 0.75rem; color: rgba(255,130,130,0.9); width: 100%; }

  /* ── Tabs ── */
  .bam-pr-tabs { display: flex; gap: 8px; }
  .bam-pr-tab {
    padding: 7px 18px; border-radius: 999px; border: 1px solid rgba(124,92,255,0.2);
    background: rgba(255,255,255,0.03); color: rgba(245,247,255,0.5);
    font-size: 0.85rem; font-weight: 500; font-family: inherit; cursor: pointer;
    transition: all 0.15s ease;
  }
  .bam-pr-tab:hover { border-color: rgba(124,92,255,0.45); color: rgba(245,247,255,0.85); }
  .bam-pr-tab-active { background: rgba(124,92,255,0.18); border-color: rgba(124,92,255,0.55); color: #c4b5fd; }

  /* ── Card ── */
  .bam-pr-card {
    background: rgba(12,16,32,0.7); border: 1px solid rgba(124,92,255,0.18);
    border-radius: 20px; padding: 24px; backdrop-filter: blur(10px);
    display: flex; flex-direction: column; gap: 16px;
  }
  .bam-pr-section-heading { font-size: 0.9rem; font-weight: 600; color: rgba(245,247,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; }
  .bam-pr-bio { font-size: 0.92rem; color: rgba(245,247,255,0.65); line-height: 1.7; }
  .bam-pr-detail-row { display: flex; flex-direction: column; gap: 4px; }
  .bam-pr-detail-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(245,247,255,0.35); }
  .bam-pr-detail-value { font-size: 0.9rem; color: rgba(245,247,255,0.7); }
  .bam-pr-cats { display: flex; gap: 6px; flex-wrap: wrap; }
  .bam-pr-cat {
    font-size: 0.75rem; padding: 3px 10px; border-radius: 999px;
    background: rgba(124,92,255,0.1); color: rgba(196,181,253,0.8);
    border: 1px solid rgba(124,92,255,0.18);
  }
  .bam-pr-divider { height: 1px; background: rgba(124,92,255,0.1); }

  /* ── Reviews ── */
  .bam-pr-review { display: flex; flex-direction: column; gap: 6px; padding: 14px 0; border-bottom: 1px solid rgba(124,92,255,0.08); }
  .bam-pr-review:last-child { border-bottom: none; padding-bottom: 0; }
  .bam-pr-review-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .bam-pr-review-author { font-size: 0.85rem; font-weight: 600; color: #f5f7ff; }
  .bam-pr-stars { display: flex; gap: 2px; }
  .bam-pr-star { font-size: 0.75rem; }
  .bam-pr-star-on { color: #fbbf24; }
  .bam-pr-star-off { color: rgba(255,255,255,0.15); }
  .bam-pr-review-quote { font-size: 0.85rem; color: rgba(245,247,255,0.55); line-height: 1.6; font-style: italic; }

  /* ── Modal ── */
  .bam-pr-backdrop {
    position: fixed; inset: 0; background: rgba(3,5,15,0.8);
    backdrop-filter: blur(8px); display: flex; align-items: center;
    justify-content: center; z-index: 50; padding: 24px;
  }
  .bam-pr-modal {
    background: rgba(12,16,32,0.95); border: 1px solid rgba(124,92,255,0.3);
    border-radius: 20px; width: 100%; max-width: 440px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.7);
    display: flex; flex-direction: column;
  }
  .bam-pr-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; border-bottom: 1px solid rgba(124,92,255,0.12);
  }
  .bam-pr-modal-title { font-size: 1rem; font-weight: 700; color: #f5f7ff; }
  .bam-pr-modal-close {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 50%; width: 28px; height: 28px; display: flex;
    align-items: center; justify-content: center; cursor: pointer;
    color: rgba(245,247,255,0.5); font-size: 0.9rem; line-height: 1;
    transition: background 0.15s ease;
  }
  .bam-pr-modal-close:hover { background: rgba(255,255,255,0.12); color: #f5f7ff; }
  .bam-pr-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 14px; }
  .bam-pr-modal-sub { font-size: 0.88rem; color: rgba(245,247,255,0.5); }
  .bam-pr-modal-actions {
    display: flex; justify-content: flex-end; gap: 10px;
    padding: 16px 24px; border-top: 1px solid rgba(124,92,255,0.12);
  }
  .bam-pr-ping-options { display: flex; flex-direction: column; gap: 8px; }
  .bam-pr-ping-option {
    text-align: left; padding: 11px 14px; border-radius: 12px; font-family: inherit;
    font-size: 0.88rem; cursor: pointer; transition: all 0.15s ease;
    border: 1px solid rgba(124,92,255,0.15); background: rgba(255,255,255,0.03);
    color: rgba(245,247,255,0.6);
  }
  .bam-pr-ping-option:hover { border-color: rgba(124,92,255,0.4); color: rgba(245,247,255,0.9); }
  .bam-pr-ping-option-active {
    border-color: rgba(124,92,255,0.6); background: rgba(124,92,255,0.12); color: #c4b5fd;
  }
  .bam-pr-ping-hint { font-size: 0.75rem; color: rgba(245,247,255,0.3); }

  /* ── States ── */
  .bam-pr-skeleton {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(124,92,255,0.08);
    border-radius: 20px; animation: bam-pr-shimmer 1.6s ease-in-out infinite;
  }
  @keyframes bam-pr-shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
  .bam-pr-empty {
    text-align: center; padding: 48px 24px;
    border: 1px dashed rgba(124,92,255,0.18); border-radius: 20px;
    color: rgba(245,247,255,0.35); display: flex; flex-direction: column;
    align-items: center; gap: 14px;
  }
  .bam-pr-toast {
    padding: 12px 16px; border-radius: 12px; font-size: 0.88rem;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .bam-pr-toast-success { background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.2); color: #6ee7b7; }
  .bam-pr-toast-error { background: rgba(220,38,38,0.08); border: 1px solid rgba(220,38,38,0.25); color: rgba(255,130,130,0.95); }
  .bam-pr-toast-close { background: none; border: none; color: inherit; cursor: pointer; opacity: 0.6; font-size: 1rem; padding: 0; flex-shrink: 0; }
  .bam-pr-toast-close:hover { opacity: 1; }
  .bam-pr-spinner {
    width: 15px; height: 15px; border: 2px solid rgba(11,15,31,0.3);
    border-top-color: #0b0f1f; border-radius: 50%;
    animation: bam-pr-spin 0.7s linear infinite; display: inline-block;
  }
  @keyframes bam-pr-spin { to { transform: rotate(360deg); } }

  @media (max-width: 600px) {
    .bam-pr-wrap { padding: 0 16px; }
    .bam-pr-page { padding: 28px 0 60px; }
    .bam-pr-hero { padding: 22px; }
    .bam-pr-avatar { width: 56px; height: 56px; font-size: 1.1rem; }
    .bam-pr-name { font-size: 1.25rem; }
    .bam-pr-ctas { flex-direction: column; }
    .bam-pr-btn { justify-content: center; }
  }
`;

const AVATAR_COLORS = [
  { bg: "rgba(124,92,255,0.2)", color: "#c4b5fd", border: "rgba(124,92,255,0.3)" },
  { bg: "rgba(0,212,255,0.15)", color: "#67e8f9", border: "rgba(0,212,255,0.3)" },
  { bg: "rgba(255,122,184,0.15)", color: "#f9a8d4", border: "rgba(255,122,184,0.3)" },
  { bg: "rgba(0,255,136,0.12)", color: "#6ee7b7", border: "rgba(0,255,136,0.25)" },
  { bg: "rgba(255,184,48,0.15)", color: "#fcd34d", border: "rgba(255,184,48,0.3)" },
];

function avatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  const c = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return { background: c.bg, color: c.color, border: `2px solid ${c.border}` };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusBadge({ status }: { status: BrowseProfile["status"] }) {
  const cls = status === "available" ? "bam-pr-available" : status === "busy" ? "bam-pr-busy" : "bam-pr-offline";
  const label = status === "available" ? "Available" : status === "busy" ? "Busy" : "Offline";
  return (
    <span className={`bam-pr-status ${cls}`}>
      <span className="bam-pr-status-dot" />
      {label}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="bam-pr-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`bam-pr-star ${n <= rating ? "bam-pr-star-on" : "bam-pr-star-off"}`}>★</span>
      ))}
    </div>
  );
}

type ProfilePageProps = { params: { username: string } };

export default function ProfilePage({ params }: ProfilePageProps) {
  const { session } = useAuth();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfileResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [publicStatus, setPublicStatus] = useState<"idle" | "loading" | "error">("idle");
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [activeTab, setActiveTab] = useState("About");
  const [showPingModal, setShowPingModal] = useState(false);
  const [pingTopic, setPingTopic] = useState(PING_QUESTION_OPTIONS[0]?.id ?? "");
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const loadPublicProfile = useCallback(async (username: string) => {
    try {
      setPublicStatus("loading");
      const response = await profileApi.getPublicProfile(username);
      setPublicProfile(response);
      setPublicStatus("idle");
    } catch {
      setPublicStatus("error");
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setStatus("loading");
      const response = await profileApi.getProfile(params.username);
      setData(response);
      setStatus("idle");
      await loadPublicProfile(params.username);
    } catch (err) {
      setStatus("error");
    }
  }, [loadPublicProfile, params.username]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const profile = data?.profile;
  const isOwner = !!session?.user?.id && !!profile?.id && session.user.id === profile.id;

  const earningsLine = useMemo(() => {
    if (!publicProfile?.earningsVisible) return null;
    if (typeof publicProfile.totalEarningsTokens !== "number") return null;
    const tokens = new Intl.NumberFormat("en-US").format(publicProfile.totalEarningsTokens);
    const minutes = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(publicProfile.minutesSold ?? 0);
    return `${tokens} tokens earned · ${minutes} min sold`;
  }, [publicProfile]);

  const handlePrivacyToggle = useCallback(async (nextValue: boolean) => {
    if (!profile?.id) return;
    setIsUpdatingPrivacy(true);
    setPrivacyError(null);
    try {
      await userApi.setEarningsPrivacy(nextValue);
      await loadPublicProfile(params.username);
    } catch (err) {
      setPrivacyError(err instanceof Error ? err.message : "Unable to update earnings visibility.");
    } finally {
      setIsUpdatingPrivacy(false);
    }
  }, [loadPublicProfile, params.username, profile?.id]);

  const handleSendPing = async () => {
    if (!profile) return;
    try {
      setIsSendingPing(true);
      await pingsApi.createPing({ topic: pingTopic, requestedFor: profile.name });
      setToast({ message: "Ping sent.", variant: "success" });
      setShowPingModal(false);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Unable to send ping.", variant: "error" });
    } finally {
      setIsSendingPing(false);
    }
  };

  return (
    <AuthGuard>
      <style>{css}</style>
      <div className="bam-pr-wrap">
        <main className="bam-pr-page">

          {toast ? (
            <div className={`bam-pr-toast bam-pr-toast-${toast.variant}`} role="status">
              <span>{toast.message}</span>
              <button className="bam-pr-toast-close" onClick={() => setToast(null)} aria-label="Dismiss">✕</button>
            </div>
          ) : null}

          {status === "loading" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="bam-pr-skeleton" style={{ height: 220 }} />
              <div className="bam-pr-skeleton" style={{ height: 160 }} />
            </div>
          ) : null}

          {status === "error" ? (
            <div className="bam-pr-empty">
              <p>Could not load this profile.</p>
              <button className="bam-pr-btn bam-pr-btn-ghost bam-pr-btn-sm" onClick={loadProfile}>Retry</button>
            </div>
          ) : null}

          {status === "idle" && !profile ? (
            <div className="bam-pr-empty">
              <p>Profile not found.</p>
            </div>
          ) : null}

          {status === "idle" && profile ? (
            <>
              {/* Hero */}
              <div className="bam-pr-hero">
                <div className="bam-pr-hero-top">
                  <div className="bam-pr-avatar" style={avatarStyle(profile.name)}>
                    {initials(profile.name)}
                  </div>
                  <div className="bam-pr-identity">
                    <div className="bam-pr-name">{profile.name}</div>
                    <div className="bam-pr-handle">@{profile.username}</div>
                    <div className="bam-pr-meta">
                      <StatusBadge status={profile.status} />
                      <span className="bam-pr-rate">${profile.rate.toFixed(2)}<span>/ min</span></span>
                      {profile.responseTime ? (
                        <span className="bam-pr-response">Responds {profile.responseTime}</span>
                      ) : null}
                      {earningsLine ? (
                        <span className="bam-pr-earnings">{earningsLine}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {profile.tagline ? (
                  <p className="bam-pr-tagline">{profile.tagline}</p>
                ) : null}

                {!isOwner ? (
                  <div className="bam-pr-ctas">
                    <a href={`/call/request/${profile.username}`} className="bam-pr-btn bam-pr-btn-primary">
                      Call now
                    </a>
                    <button className="bam-pr-btn bam-pr-btn-ghost" onClick={() => setShowPingModal(true)} type="button">
                      Send a ping
                    </button>
                  </div>
                ) : null}

                {isOwner ? (
                  <div className="bam-pr-owner-bar">
                    <span className="bam-pr-owner-label">Your profile — visible to everyone</span>
                    <div className="bam-pr-toggle-wrap">
                      <button
                        type="button"
                        className={`bam-pr-toggle${publicProfile?.earningsVisible ? " bam-pr-toggle-on" : ""}`}
                        onClick={() => handlePrivacyToggle(!(publicProfile?.earningsVisible ?? true))}
                        disabled={isUpdatingPrivacy || publicStatus === "loading"}
                        aria-label="Toggle earnings visibility"
                      />
                      <span className="bam-pr-toggle-label">Show earnings publicly</span>
                    </div>
                    {privacyError ? <p className="bam-pr-privacy-error">{privacyError}</p> : null}
                  </div>
                ) : null}
              </div>

              {/* Tabs */}
              <div className="bam-pr-tabs" role="tablist">
                {["About", "Reviews", "Details"].map((tab) => (
                  <button
                    key={tab} role="tab" aria-selected={activeTab === tab}
                    className={`bam-pr-tab${activeTab === tab ? " bam-pr-tab-active" : ""}`}
                    onClick={() => setActiveTab(tab)} type="button"
                  >
                    {tab}
                    {tab === "Reviews" && profile.reviews.length > 0
                      ? ` (${profile.reviews.length})`
                      : null}
                  </button>
                ))}
              </div>

              {/* About */}
              {activeTab === "About" ? (
                <div className="bam-pr-card">
                  {profile.bio ? (
                    <p className="bam-pr-bio">{profile.bio}</p>
                  ) : (
                    <p className="bam-pr-bio" style={{ opacity: 0.4 }}>No bio yet.</p>
                  )}
                  {!isOwner ? (
                    <>
                      <div className="bam-pr-divider" />
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <a href={`/call/request/${profile.username}`} className="bam-pr-btn bam-pr-btn-primary bam-pr-btn-sm">
                          Call now
                        </a>
                        <button className="bam-pr-btn bam-pr-btn-ghost bam-pr-btn-sm" onClick={() => setShowPingModal(true)} type="button">
                          Send a ping
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              {/* Reviews */}
              {activeTab === "Reviews" ? (
                <div className="bam-pr-card">
                  {profile.reviews.length === 0 ? (
                    <div className="bam-pr-empty" style={{ border: "none", padding: "16px 0" }}>
                      <p>No reviews yet.</p>
                    </div>
                  ) : (
                    profile.reviews.map((review) => (
                      <div key={review.id} className="bam-pr-review">
                        <div className="bam-pr-review-header">
                          <span className="bam-pr-review-author">{review.author}</span>
                          <StarRating rating={review.rating} />
                        </div>
                        {review.quote ? (
                          <p className="bam-pr-review-quote">"{review.quote}"</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              {/* Details */}
              {activeTab === "Details" ? (
                <div className="bam-pr-card">
                  {profile.categories.length > 0 ? (
                    <div className="bam-pr-detail-row">
                      <div className="bam-pr-detail-label">Categories</div>
                      <div className="bam-pr-cats">
                        {profile.categories.map((cat) => (
                          <span key={cat} className="bam-pr-cat">{cat}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {profile.languages.length > 0 ? (
                    <div className="bam-pr-detail-row">
                      <div className="bam-pr-detail-label">Languages</div>
                      <div className="bam-pr-detail-value">{profile.languages.join(", ")}</div>
                    </div>
                  ) : null}
                  <div className="bam-pr-detail-row">
                    <div className="bam-pr-detail-label">Video calls</div>
                    <div className="bam-pr-detail-value">{profile.videoAllowed ? "Available" : "Voice only"}</div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

        </main>
      </div>

      {/* Ping modal */}
      {showPingModal ? (
        <div className="bam-pr-backdrop" role="dialog" aria-modal="true" aria-label="Send a ping">
          <div className="bam-pr-modal">
            <div className="bam-pr-modal-header">
              <div className="bam-pr-modal-title">Send a ping to {profile?.name ?? "them"}</div>
              <button className="bam-pr-modal-close" onClick={() => setShowPingModal(false)} aria-label="Close">✕</button>
            </div>
            <div className="bam-pr-modal-body">
              <p className="bam-pr-modal-sub">Ask a quick availability question — they'll get notified.</p>
              <div className="bam-pr-ping-options">
                {PING_QUESTION_OPTIONS.map((option) => (
                  <button
                    key={option.id} type="button"
                    className={`bam-pr-ping-option${pingTopic === option.id ? " bam-pr-ping-option-active" : ""}`}
                    onClick={() => setPingTopic(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="bam-pr-ping-hint">Pings are paid availability checks.</p>
            </div>
            <div className="bam-pr-modal-actions">
              <button className="bam-pr-btn bam-pr-btn-ghost bam-pr-btn-sm" onClick={() => setShowPingModal(false)}>Cancel</button>
              <button className="bam-pr-btn bam-pr-btn-primary bam-pr-btn-sm" onClick={handleSendPing} disabled={isSendingPing}>
                {isSendingPing ? <span className="bam-pr-spinner" /> : "Send ping"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </AuthGuard>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { browseApi, type BrowseProfile, type BrowseResponse } from "@/lib/api";

const css = `
  .bam-br-page {
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 40px 0 80px;
  }
  .bam-br-header { display: flex; flex-direction: column; gap: 6px; }
  .bam-br-heading {
    font-size: 1.75rem;
    font-weight: 700;
    color: #f5f7ff;
    letter-spacing: -0.02em;
  }
  .bam-br-sub {
    font-size: 0.95rem;
    color: rgba(245,247,255,0.45);
  }
  .bam-br-tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .bam-br-tab {
    padding: 7px 16px;
    border-radius: 999px;
    border: 1px solid rgba(124,92,255,0.2);
    background: rgba(255,255,255,0.03);
    color: rgba(245,247,255,0.5);
    font-size: 0.85rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .bam-br-tab:hover {
    border-color: rgba(124,92,255,0.45);
    color: rgba(245,247,255,0.85);
    background: rgba(124,92,255,0.08);
  }
  .bam-br-tab-active {
    background: rgba(124,92,255,0.18);
    border-color: rgba(124,92,255,0.55);
    color: #c4b5fd;
  }
  .bam-br-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
  .bam-br-card {
    background: rgba(12,16,32,0.7);
    border: 1px solid rgba(124,92,255,0.18);
    border-radius: 20px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    backdrop-filter: blur(10px);
    transition: border-color 0.18s ease, transform 0.18s ease;
  }
  .bam-br-card:hover {
    border-color: rgba(124,92,255,0.4);
    transform: translateY(-2px);
  }
  .bam-br-card-top {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .bam-br-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 700;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }
  .bam-br-avatar-a { background: rgba(124,92,255,0.2); color: #c4b5fd; }
  .bam-br-avatar-b { background: rgba(0,212,255,0.15); color: #67e8f9; }
  .bam-br-avatar-c { background: rgba(255,122,184,0.15); color: #f9a8d4; }
  .bam-br-avatar-d { background: rgba(0,255,136,0.12); color: #6ee7b7; }
  .bam-br-avatar-e { background: rgba(255,184,48,0.15); color: #fcd34d; }
  .bam-br-name-block { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .bam-br-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: #f5f7ff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bam-br-handle {
    font-size: 0.78rem;
    color: rgba(245,247,255,0.35);
  }
  .bam-br-status {
    margin-left: auto;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.03em;
  }
  .bam-br-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .bam-br-available {
    background: rgba(0,255,136,0.1);
    color: #6ee7b7;
    border: 1px solid rgba(0,255,136,0.2);
  }
  .bam-br-available .bam-br-status-dot { background: #4ade80; }
  .bam-br-busy {
    background: rgba(255,184,48,0.1);
    color: #fcd34d;
    border: 1px solid rgba(255,184,48,0.2);
  }
  .bam-br-busy .bam-br-status-dot { background: #fbbf24; }
  .bam-br-offline {
    background: rgba(255,255,255,0.05);
    color: rgba(245,247,255,0.35);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .bam-br-offline .bam-br-status-dot { background: rgba(245,247,255,0.25); }
  .bam-br-tagline {
    font-size: 0.85rem;
    color: rgba(245,247,255,0.55);
    line-height: 1.5;
    flex: 1;
  }
  .bam-br-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: auto;
  }
  .bam-br-rate {
    font-size: 1rem;
    font-weight: 700;
    color: #f5f7ff;
    letter-spacing: -0.01em;
  }
  .bam-br-rate span {
    font-size: 0.75rem;
    font-weight: 400;
    color: rgba(245,247,255,0.4);
    margin-left: 2px;
  }
  .bam-br-actions { display: flex; gap: 8px; }
  .bam-br-btn {
    padding: 8px 14px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: none;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    transition: opacity 0.15s ease, transform 0.15s ease;
    letter-spacing: 0.01em;
  }
  .bam-br-btn:hover { opacity: 0.85; transform: translateY(-1px); }
  .bam-br-btn-primary {
    background: linear-gradient(120deg, #7c5cff 0%, #00d4ff 100%);
    color: #0b0f1f;
  }
  .bam-br-btn-ghost {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(245,247,255,0.7);
  }
  .bam-br-categories { display: flex; gap: 6px; flex-wrap: wrap; }
  .bam-br-cat {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(124,92,255,0.1);
    color: rgba(196,181,253,0.7);
    border: 1px solid rgba(124,92,255,0.15);
  }
  .bam-br-divider {
    height: 1px;
    background: rgba(124,92,255,0.1);
    margin: 0 -22px;
  }
  .bam-br-skeleton {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(124,92,255,0.1);
    border-radius: 20px;
    height: 180px;
    animation: bam-br-shimmer 1.6s ease-in-out infinite;
  }
  @keyframes bam-br-shimmer {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  .bam-br-empty {
    text-align: center;
    padding: 48px 32px;
    border: 1px dashed rgba(124,92,255,0.2);
    border-radius: 20px;
    color: rgba(245,247,255,0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .bam-br-empty-icon {
    font-size: 2rem;
    opacity: 0.3;
  }
  .bam-br-toast {
    padding: 12px 16px;
    border-radius: 12px;
    background: rgba(220,38,38,0.1);
    border: 1px solid rgba(220,38,38,0.25);
    color: rgba(255,130,130,0.95);
    font-size: 0.88rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .bam-br-toast-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.6;
    font-size: 1rem;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
  }
  .bam-br-toast-close:hover { opacity: 1; }
  .bam-br-wrap {
    margin: 0 auto;
    max-width: 1200px;
    padding: 0 24px;
  }
  @media (max-width: 600px) {
    .bam-br-page { padding: 28px 0 64px; gap: 20px; }
    .bam-br-heading { font-size: 1.4rem; }
    .bam-br-grid { grid-template-columns: 1fr; }
    .bam-br-wrap { padding: 0 16px; }
  }
`;

const AVATAR_CLASSES = [
  "bam-br-avatar-a",
  "bam-br-avatar-b",
  "bam-br-avatar-c",
  "bam-br-avatar-d",
  "bam-br-avatar-e",
];

function avatarClass(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_CLASSES[hash % AVATAR_CLASSES.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusBadge({ status }: { status: BrowseProfile["status"] }) {
  const cls =
    status === "available" ? "bam-br-available"
    : status === "busy"    ? "bam-br-busy"
    : "bam-br-offline";
  const label =
    status === "available" ? "Available"
    : status === "busy"    ? "Busy"
    : "Offline";
  return (
    <span className={`bam-br-status ${cls}`}>
      <span className="bam-br-status-dot" />
      {label}
    </span>
  );
}

function ProfileCard({ profile }: { profile: BrowseProfile }) {
  return (
    <div className="bam-br-card">
      <div className="bam-br-card-top">
        <div className={`bam-br-avatar ${avatarClass(profile.name)}`}>
          {initials(profile.name)}
        </div>
        <div className="bam-br-name-block">
          <div className="bam-br-name">{profile.name}</div>
          <div className="bam-br-handle">@{profile.username}</div>
        </div>
        <StatusBadge status={profile.status} />
      </div>

      {profile.tagline ? (
        <p className="bam-br-tagline">{profile.tagline}</p>
      ) : null}

      {profile.categories.length > 0 ? (
        <div className="bam-br-categories">
          {profile.categories.slice(0, 3).map((cat) => (
            <span key={cat} className="bam-br-cat">{cat}</span>
          ))}
        </div>
      ) : null}

      <div className="bam-br-divider" />

      <div className="bam-br-footer">
        <div className="bam-br-rate">
          ${profile.rate.toFixed(2)}<span>/ min</span>
        </div>
        <div className="bam-br-actions">
          <a href={`/call/request/${profile.username}`} className="bam-br-btn bam-br-btn-primary">
            Call
          </a>
          <a href={`/u/${profile.username}`} className="bam-br-btn bam-br-btn-ghost">
            Profile
          </a>
        </div>
      </div>
    </div>
  );
}

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

  useEffect(() => { loadBrowse(); }, [loadBrowse]);

  const profiles = data?.profiles ?? [];
  const tabs = ["All", ...(data?.categories ?? [])].map((label) => ({ id: label, label }));
  const filteredProfiles = activeTab === "All"
    ? profiles
    : profiles.filter((p) => p.categories.includes(activeTab));

  return (
    <AuthGuard>
      <style>{css}</style>
      <div className="bam-br-wrap">
        <main className="bam-br-page">

          <header className="bam-br-header">
            <h1 className="bam-br-heading">Browse experts</h1>
            <p className="bam-br-sub">Find someone worth paying to talk to.</p>
          </header>

          {error ? (
            <div className="bam-br-toast" role="alert">
              <span>{error}</span>
              <button className="bam-br-toast-close" onClick={() => setError(null)} aria-label="Dismiss">✕</button>
            </div>
          ) : null}

          {status === "loading" ? (
            <div className="bam-br-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bam-br-skeleton" />
              ))}
            </div>
          ) : null}

          {status === "error" ? (
            <div className="bam-br-empty">
              <div className="bam-br-empty-icon">⚠</div>
              <p>Could not load experts right now.</p>
              <button className="bam-br-btn bam-br-btn-ghost" onClick={loadBrowse}>Retry</button>
            </div>
          ) : null}

          {status === "idle" && data ? (
            <>
              <div className="bam-br-tabs" role="tablist">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`bam-br-tab${activeTab === tab.id ? " bam-br-tab-active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {filteredProfiles.length === 0 ? (
                <div className="bam-br-empty">
                  <div className="bam-br-empty-icon">◎</div>
                  <p>No experts in this category yet.</p>
                  <button className="bam-br-btn bam-br-btn-ghost" onClick={() => setActiveTab("All")}>
                    Show all
                  </button>
                </div>
              ) : (
                <div className="bam-br-grid">
                  {filteredProfiles.map((profile) => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))}
                </div>
              )}
            </>
          ) : null}

        </main>
      </div>
    </AuthGuard>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./Nav.module.css";
import Button from "./ui/Button";
import { useAuth } from "./auth/AuthProvider";

const Nav = () => {
  const { status, session, logout } = useAuth();
  const [incomingCount, setIncomingCount] = useState(0);
  const previousCountRef = useRef(0);
  const titleResetRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setIncomingCount(0);
      previousCountRef.current = 0;
      return;
    }

    let isMounted = true;

    const loadIncoming = async () => {
      try {
        const res = await fetch("/api/calls/incoming");
        if (!res.ok) return;
        const data = await res.json();
        const nextCount = (data.requests ?? []).filter(
          (request: { status?: string }) => request.status === "pending"
        ).length;
        if (!isMounted) return;
        setIncomingCount(nextCount);
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted" &&
          nextCount > previousCountRef.current
        ) {
          new Notification("Incoming call request", {
            body:
              nextCount === 1
                ? "You have 1 incoming call request."
                : `You have ${nextCount} incoming call requests.`,
          });
        }
        if (nextCount > previousCountRef.current && typeof document !== "undefined") {
          if (titleResetRef.current) {
            window.clearTimeout(titleResetRef.current);
          }
          const originalTitle = document.title;
          document.title = `Incoming calls (${nextCount})`;
          titleResetRef.current = window.setTimeout(() => {
            document.title = originalTitle;
            titleResetRef.current = null;
          }, 10000);
        }
        previousCountRef.current = nextCount;
      } catch {
        // ignore polling errors
      }
    };

    loadIncoming();
    const interval = window.setInterval(loadIncoming, 15000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [status]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.logo} href="/">
          BuyAMinute
        </Link>
        <nav className={styles.nav}>
          <Link href="/browse">Browse</Link>
          <Link href="/receiver">Experts</Link>
          {status === "authenticated" ? (
            <>
              <Link href="/wallet">Wallet</Link>
              <span className={styles.navLinkWrapper}>
                <Link href="/call">Call</Link>
                {incomingCount > 0 ? (
                  <span className={styles.navBadge} aria-label="Incoming calls">
                    {incomingCount}
                  </span>
                ) : null}
              </span>
              <Link href="/receiver">Dashboard</Link>
            </>
          ) : null}
        </nav>
        <div className={styles.actions}>
          {status === "loading" ? (
            <span className={styles.status}>Loading…</span>
          ) : status === "authenticated" && session?.user ? (
            <>
              <span className={styles.status}>Hi {session.user.name}</span>
              <Button variant="ghost" onClick={() => void logout()}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button href="/login" variant="ghost">
                Log in
              </Button>
              <Button href="/signup" variant="primary">
                Start Earning
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Nav;

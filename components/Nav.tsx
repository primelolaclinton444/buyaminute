"use client";

import Link from "next/link";
import styles from "./Nav.module.css";
import Button from "./ui/Button";
import { useAuth } from "./auth/AuthProvider";

const Nav = () => {
  const { status, session, logout } = useAuth();

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
              <Link href="/call">Call</Link>
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

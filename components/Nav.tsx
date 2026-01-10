import Link from "next/link";
import styles from "./Nav.module.css";
import Button from "./ui/Button";

const Nav = () => {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.logo} href="/">
          BuyAMinute
        </Link>
        <nav className={styles.nav}>
          <Link href="/browse">Browse</Link>
          <Link href="/receiver">Experts</Link>
          <Link href="/wallet">Wallet</Link>
        </nav>
        <Button href="/signup" variant="ghost">
          Start Earning
        </Button>
      </div>
    </header>
  );
};

export default Nav;

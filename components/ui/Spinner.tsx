import styles from "./Spinner.module.css";

type SpinnerProps = {
  className?: string;
};

const Spinner = ({ className }: SpinnerProps) => {
  return <span className={[styles.spinner, className].filter(Boolean).join(" ")} aria-label="Loading" />;
};

export default Spinner;

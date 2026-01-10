import styles from "./Toast.module.css";

type ToastProps = {
  message: string;
  variant?: "info" | "success" | "error";
  onClose?: () => void;
  className?: string;
};

const Toast = ({ message, variant = "info", onClose, className }: ToastProps) => {
  const classNames = [styles.toast, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} role="status">
      <span>{message}</span>
      {onClose ? (
        <button className={styles.close} onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      ) : null}
    </div>
  );
};

export default Toast;

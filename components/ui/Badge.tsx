import styles from "./Badge.module.css";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
};

const Badge = ({ children, variant = "default", className }: BadgeProps) => {
  const classNames = [
    styles.badge,
    variant !== "default" ? styles[variant] : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classNames}>{children}</span>;
};

export default Badge;

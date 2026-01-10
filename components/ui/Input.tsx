import styles from "./Input.module.css";

type InputProps = {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const Input = ({ label, hint, error, className, ...props }: InputProps) => {
  return (
    <label className={[styles.field, className].filter(Boolean).join(" ")}
    >
      {label ? <span className={styles.label}>{label}</span> : null}
      <input className={styles.input} {...props} />
      {hint ? <span className={styles.hint}>{hint}</span> : null}
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
};

export default Input;

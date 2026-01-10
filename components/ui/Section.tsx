import styles from "./Section.module.css";

type SectionProps = {
  children: React.ReactNode;
  className?: string;
};

const Section = ({ children, className }: SectionProps) => {
  return <section className={[styles.section, className].filter(Boolean).join(" ")}>{children}</section>;
};

export default Section;

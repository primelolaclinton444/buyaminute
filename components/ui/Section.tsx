import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./Section.module.css";

type SectionProps = {
  children: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<"section">;

const Section = ({ children, className, ...props }: SectionProps) => {
  return (
    <section
      className={[styles.section, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </section>
  );
};

export default Section;

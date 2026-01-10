import styles from "./Tabs.module.css";

type TabOption = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: TabOption[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
};

const Tabs = ({ tabs, active, onChange, className }: TabsProps) => {
  return (
    <div className={[styles.tabs, className].filter(Boolean).join(" ")}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={[styles.tab, active === tab.id ? styles.active : null]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;

import styles from "./Skeleton.module.css";

type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
};

const Skeleton = ({ className, style }: SkeletonProps) => {
  return <div className={[styles.skeleton, className].filter(Boolean).join(" ")} style={style} />;
};

export default Skeleton;

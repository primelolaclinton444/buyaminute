type ContainerProps = {
  children: React.ReactNode;
  className?: string;
};

const Container = ({ children, className }: ContainerProps) => {
  return <div className={className} style={{ margin: "0 auto", maxWidth: 1200, padding: "0 24px" }}>{children}</div>;
};

export default Container;

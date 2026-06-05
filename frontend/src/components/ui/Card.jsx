const Card = ({
  children,
  className = "",
  glass = false,
  glow = false,
  padding = "md",
  onClick,
}) => {
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      onClick={onClick}
      className={[
        "rounded-xl border border-border",
        glass ? "glass" : "bg-surface",
        glow ? "shadow-glow" : "shadow-card",
        paddings[padding],
        onClick ? "cursor-pointer hover:border-[#333] transition-colors duration-150" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
};

function CardHeader({ children, className = "" }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = "" }) {
  return (
    <h3 className={`text-base font-semibold text-text-primary ${className}`}>{children}</h3>
  );
}

function CardDescription({ children, className = "" }) {
  return (
    <p className={`text-sm text-text-secondary mt-1 ${className}`}>{children}</p>
  );
}

function CardBody({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function CardFooter({ children, className = "" }) {
  return (
    <div className={`mt-4 pt-4 border-t border-border ${className}`}>{children}</div>
  );
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;

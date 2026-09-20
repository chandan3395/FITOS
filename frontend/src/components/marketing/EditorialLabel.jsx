const EditorialLabel = ({ children, className = "" }) => (
  <span className={`inline-flex items-center gap-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-primary ${className}`}>
    <span aria-hidden="true" className="h-px w-8 bg-bronze" />
    {children}
  </span>
);

export default EditorialLabel;

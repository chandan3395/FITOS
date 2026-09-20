const FitosWordmark = ({ className = "", byot = false }) => (
  <span className={`inline-flex items-baseline gap-2 font-extrabold uppercase tracking-[0.08em] ${className}`}>
    <span>FITOS</span>
    {byot && <span className="text-[0.55em] font-semibold tracking-[0.16em] text-bronze-text">BYOT</span>}
  </span>
);

export default FitosWordmark;

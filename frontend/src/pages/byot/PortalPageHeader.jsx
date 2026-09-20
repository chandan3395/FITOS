export default function PortalPageHeader({ title, description, action }) {
  return <header className="flex flex-wrap items-end justify-between gap-3">
    <div className="min-w-0">
      <p className="mb-1 text-xs font-semibold tracking-wide text-text-secondary">PERSONAL TRACKING</p>
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-xl text-sm text-text-secondary">{description}</p>
    </div>
    {action}
  </header>;
}

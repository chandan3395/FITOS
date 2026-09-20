import { useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { HomeIcon, CheckCircleIcon, ChartBarIcon, DumbbellIcon } from "../design-system/Icons";
import "../../pages/byot/portal.css";

// Match Client/Trainer's 16rem sidebar, icon set and active marker without
// mounting their role-specific contexts, messaging or account behaviour.
const destinations = [
  ["Home", "dashboard", HomeIcon], ["Nutrition", "nutrition", CheckCircleIcon],
  ["Progress", "progress", ChartBarIcon], ["Workout", "workout", DumbbellIcon],
];
export default function ByotLayout({ user, onSignOut, children }) {
  const main = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { main.current?.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);
  return (
    <div className="byot-shell flex h-dvh min-h-0 flex-col overflow-hidden bg-bg text-text-primary md:pl-64">
      <a href="#byot-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-surface p-3">Skip to content</a>
      <aside aria-label="BYOT portal sidebar" className="shrink-0 border-b border-border bg-surface md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-64 md:flex-col md:border-b-0 md:border-r">
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5">
          <Link to="/byot/dashboard" className="flex items-center gap-2.5 font-extrabold text-[17px]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">F</span>
            FITOS <span className="text-xs font-semibold text-bronze-text">BYOT</span>
          </Link>
          <button onClick={onSignOut} className="ml-auto min-h-11 rounded-lg px-2 text-sm md:hidden">Sign out</button>
        </div>
        <p className="hidden px-5 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted md:block">My fitness</p>
        <nav aria-label="BYOT navigation" className="grid grid-cols-2 gap-1 p-2 md:flex md:flex-1 md:flex-col md:gap-1 md:overflow-y-auto md:px-3 md:py-1">
          {destinations.map(([label, path, Icon]) => (
            <NavLink key={path} to={`/byot/${path}`} end className={({ isActive }) =>
              `relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isActive
                ? "bg-primary/10 font-semibold text-primary before:absolute before:left-0 before:h-5 before:w-[3px] before:rounded-r-full before:bg-primary"
                : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"}`}>
              <Icon size={17} className="shrink-0" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="hidden shrink-0 border-t border-border p-4 md:block">
          <p className="truncate text-sm font-semibold" title={user.name}>{user.name}</p>
          <p className="mt-1 truncate text-xs text-text-secondary" title={user.email}>{user.email}</p>
          <button onClick={onSignOut} className="mt-3 min-h-11 w-full rounded-lg border border-border text-sm hover:bg-surface-elevated">Sign out</button>
        </div>
      </aside>
      <main id="byot-main" ref={main} tabIndex={-1} aria-label="BYOT page content" className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="byot-content mx-auto w-full max-w-[1200px] p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

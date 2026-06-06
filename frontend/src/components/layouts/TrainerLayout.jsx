import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import {
  HomeIcon,
  UsersIcon,
  CheckCircleIcon,
  CalendarIcon,
  DumbbellIcon,
} from "../design-system/Icons";
import { useAuthContext } from "../../contexts/AuthContext";

const navItems = [
  { label: "Dashboard",  to: ROUTES.TRAINER_DASHBOARD, Icon: HomeIcon },
  { label: "Clients",    to: ROUTES.TRAINER_CLIENTS,   Icon: UsersIcon },
  { label: "Check-ins",  to: ROUTES.TRAINER_CHECKINS,  Icon: CheckCircleIcon },
  { label: "Schedule",   to: ROUTES.TRAINER_SCHEDULE,  Icon: CalendarIcon },
  { label: "Templates",  to: ROUTES.TRAINER_TEMPLATES, Icon: DumbbellIcon },
];

const initials = (name = "") => name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "T";

const TrainerLayout = () => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const onLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 w-60 flex flex-col bg-surface border-r border-border">
        {/* Logo */}
        <div className="flex items-center gap-2 h-16 px-6 border-b border-border">
          <span className="text-lg font-bold gradient-text tracking-tight">FITOS</span>
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Trainer
          </span>
        </div>

        {/* Workspace label */}
        <p className="px-6 pt-5 pb-2 text-[10px] font-semibold tracking-[0.18em] text-text-muted uppercase">
          Workspace
        </p>

        {/* Nav */}
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
          {navItems.map(({ label, to, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-100",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
                ].join(" ")
              }
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User chip */}
        <div className="border-t border-border px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[11px] font-bold">
            {initials(user?.name)}
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-text-primary truncate">{user?.name || "Trainer"}</p>
            <p className="text-[11px] text-text-muted truncate">{user?.email || "—"}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12l3-4-3-4M13 8H6M8 14H3a1 1 0 01-1-1V3a1 1 0 011-1h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col ml-60">
        <header className="sticky top-0 z-10 h-16 flex items-center px-8 bg-bg/80 backdrop-blur-sm border-b border-border">
          <h1 className="text-sm font-medium text-text-secondary">Trainer Portal</h1>
        </header>

        <main className="flex-1 px-8 py-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TrainerLayout;

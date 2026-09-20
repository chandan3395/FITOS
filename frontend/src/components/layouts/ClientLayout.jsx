import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import {
  HomeIcon,
  ChartBarIcon,
  DumbbellIcon,
  CheckCircleIcon,
  ChatIcon,
} from "../design-system/Icons";
import { useAuthContext } from "../../contexts/AuthContext";
import { useUnread } from "../../contexts/UnreadContext";
import FitosWordmark from "../branding/FitosWordmark";
import UserAvatar from "../ui/UserAvatar";

const navItems = [
  { label: "Home",      to: ROUTES.CLIENT_DASHBOARD, Icon: HomeIcon },
  { label: "Nutrition", to: ROUTES.CLIENT_NUTRITION, Icon: CheckCircleIcon },
  { label: "Progress",  to: ROUTES.CLIENT_PROGRESS,  Icon: ChartBarIcon },
  { label: "Workout",   to: ROUTES.CLIENT_WORKOUT,   Icon: DumbbellIcon },
  { label: "Messages",  to: ROUTES.CLIENT_MESSAGES,  Icon: ChatIcon },
];

const navClass = ({ isActive }) =>
  [
    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150",
    isActive
      ? "bg-primary/10 text-primary font-semibold before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-primary"
      : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
  ].join(" ");

const ClientLayout = () => {
  const { user, logout } = useAuthContext();
  const { total: unreadTotal } = useUnread();
  const navigate = useNavigate();
  const onLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-20 w-64 hidden md:flex flex-col bg-surface border-r border-border">
        <div className="flex items-center gap-2.5 h-16 px-5 border-b border-border">
          <FitosWordmark className="text-[17px] text-text-primary" />
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Client
          </span>
        </div>

        <p className="px-5 pt-5 pb-2 text-[10px] font-semibold tracking-[0.18em] text-text-muted uppercase">
          My Program
        </p>

        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {navItems.map(({ label, to, Icon }) => {
            const badge = label === "Messages" ? unreadTotal : 0;
            return (
              <NavLink key={to} to={to} end className={navClass}>
                <Icon size={17} className="shrink-0" />
                <span>{label}</span>
                {badge > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary text-[10px] font-bold leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border px-4 py-3 flex items-center gap-3">
          <UserAvatar user={user} fallback="C" />
          <div className="leading-tight min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-text-primary truncate">{user?.name || "Client"}</p>
            <p className="text-[11px] text-text-muted truncate">{user?.email || "—"}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="text-text-muted hover:text-primary transition-colors"
            aria-label="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12l3-4-3-4M13 8H6M8 14H3a1 1 0 01-1-1V3a1 1 0 011-1h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col md:ml-64">
        <header className="sticky top-0 z-10 h-16 flex items-center gap-4 px-4 md:px-8 bg-surface/80 backdrop-blur-md border-b border-border">
          <h1 className="text-[15px] font-semibold text-text-primary">Client Portal</h1>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2.5 pl-1">
              <UserAvatar user={user} className="h-8 w-8" fallback="C" />
              <div className="hidden sm:block leading-tight">
                <p className="text-[12.5px] font-semibold text-text-primary truncate max-w-[140px]">{user?.name || "Client"}</p>
                <p className="text-[11px] text-text-muted">Client</p>
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="Mobile portal navigation" className="md:hidden grid grid-cols-2 gap-2 p-3 border-b border-border bg-surface">
          {navItems.map(({ label, to, Icon }) => (
            <NavLink key={to} to={to} end className={navClass}>
              <Icon size={17} className="shrink-0" /><span>{label}</span>
            </NavLink>
          ))}
          <button onClick={onLogout} className="rounded-xl border border-control px-3 py-3 text-sm">Sign out</button>
        </nav>
        <main className="flex-1 min-w-0 px-4 md:px-8 py-7 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;

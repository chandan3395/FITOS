import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { HomeIcon, UsersIcon } from "../design-system/Icons";
import { useAuthContext } from "../../contexts/AuthContext";
import FitosWordmark from "../branding/FitosWordmark";
import UserAvatar from "../ui/UserAvatar";

const navItems = [
  { label: "Dashboard", to: ROUTES.ADMIN_DASHBOARD, Icon: HomeIcon },
  { label: "Trainers",  to: ROUTES.ADMIN_TRAINERS,  Icon: UsersIcon },
  { label: "Admins",    to: ROUTES.ADMIN_ADMINS,    Icon: UsersIcon },
  { label: "BYOT Users", to: ROUTES.ADMIN_BYOT_USERS, Icon: UsersIcon },
];

const navClass = ({ isActive }) =>
  [
    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150",
    isActive
      ? "bg-primary/10 text-primary font-semibold before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-primary"
      : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
  ].join(" ");

const AdminLayout = () => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const onLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-20 w-64 flex-col bg-surface border-r border-border">
        <div className="flex items-center gap-2.5 h-16 px-5 border-b border-border">
          <FitosWordmark className="text-[17px] text-text-primary" />
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Admin
          </span>
        </div>

        <p className="px-5 pt-5 pb-2 text-[10px] font-semibold tracking-[0.18em] text-text-muted uppercase">
          Platform
        </p>

        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {navItems.map(({ label, to, Icon }) => (
            <NavLink key={to} to={to} end className={navClass}>
              <Icon size={17} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-3 flex items-center gap-3">
          <UserAvatar user={user} fallback="A" />
          <div className="leading-tight min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-text-primary truncate">{user?.name || "Admin"}</p>
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
          <h1 className="text-[15px] font-semibold text-text-primary">Admin Portal</h1>
          <button onClick={onLogout} className="md:hidden min-h-11 px-3 border border-border rounded-lg">Sign out</button>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 h-9 w-64 px-3 rounded-xl bg-surface-elevated border border-border text-text-muted">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[13px]">Search…</span>
            </div>
            <button
              className="relative w-9 h-9 rounded-xl bg-surface-elevated border border-border text-text-secondary hover:text-text-primary hover:border-line-hover flex items-center justify-center transition-colors"
              aria-label="Notifications"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M9 2a4 4 0 00-4 4c0 4-1.5 5-1.5 5h11S13 10 13 6a4 4 0 00-4-4zM7.5 14.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
            </button>
            <div className="flex items-center gap-2.5 pl-1">
              <UserAvatar user={user} className="h-8 w-8" fallback="A" />
              <div className="hidden sm:block leading-tight">
                <p className="text-[12.5px] font-semibold text-text-primary truncate max-w-[140px]">{user?.name || "Admin"}</p>
                <p className="text-[11px] text-text-muted">Admin</p>
              </div>
            </div>
          </div>
        </header>

        <nav aria-label="Mobile admin navigation" className="md:hidden grid grid-cols-2 gap-2 p-3 border-b border-border">
          {navItems.map(({ label, to }) => <NavLink key={to} to={to} end className={navClass}>{label}</NavLink>)}
        </nav>
        <main className="flex-1 min-w-0 px-4 md:px-8 py-7 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

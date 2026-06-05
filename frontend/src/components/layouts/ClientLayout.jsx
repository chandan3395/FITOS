import { NavLink } from "react-router-dom";
import { ROUTES } from "../../constants/routes";

const navItems = [
  { label: "Dashboard", to: ROUTES.CLIENT },
];

const ClientLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 w-60 flex flex-col bg-surface border-r border-border">
        {/* Logo */}
        <div className="flex items-center gap-2 h-16 px-6 border-b border-border">
          <span className="text-lg font-bold gradient-text tracking-tight">FITOS</span>
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Client
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col ml-60">
        <header className="sticky top-0 z-10 h-16 flex items-center px-8 bg-bg/80 backdrop-blur-sm border-b border-border">
          <h1 className="text-sm font-medium text-text-secondary">Client Portal</h1>
        </header>

        <main className="flex-1 px-8 py-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
};

export default ClientLayout;

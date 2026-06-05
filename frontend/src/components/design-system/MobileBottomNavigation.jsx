import { HomeIcon, DumbbellIcon, ChartBarIcon, UsersIcon, UserIcon } from "./Icons";

const TABS = [
  { id: "home",      label: "Home",     Icon: HomeIcon      },
  { id: "workouts",  label: "Workouts", Icon: DumbbellIcon  },
  { id: "progress",  label: "Progress", Icon: ChartBarIcon  },
  { id: "clients",   label: "Clients",  Icon: UsersIcon     },
  { id: "profile",   label: "Profile",  Icon: UserIcon      },
];

/**
 * MobileBottomNavigation — fixed-bottom tab bar for mobile.
 *
 * Props
 *   activeTab    string — tab id        default "home"
 *   onTabChange  fn(id)
 *   tabs         array — override default FITOS tabs (optional)
 *     [ { id, label, Icon } ]
 */
const MobileBottomNavigation = ({
  activeTab = "home",
  onTabChange,
  tabs = TABS,
}) => {
  return (
    <nav
      className="flex items-center bg-black border-t border-[#1a1a1a]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Main navigation"
    >
      {tabs.map(({ id, label, Icon }) => {
        const active = id === activeTab;
        return (
          <button
            key={id}
            onClick={() => onTabChange?.(id)}
            aria-current={active ? "page" : undefined}
            className={[
              "flex-1 flex flex-col items-center justify-center gap-1",
              "py-3 transition-all duration-150 active:scale-95",
              active ? "text-white" : "text-zinc-600 hover:text-zinc-400",
            ].join(" ")}
          >
            {/* Icon wrapper — active gets a subtle pill indicator */}
            <span className="relative">
              <Icon size={22} />
              {active && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
              )}
            </span>
            <span
              className={`text-[10px] font-medium leading-none transition-colors ${
                active ? "text-white" : "text-zinc-600"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNavigation;

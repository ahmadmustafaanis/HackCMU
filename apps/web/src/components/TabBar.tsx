import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/home", label: "Home", icon: "🏠" },
  { to: "/activities", label: "My Activities", icon: "⚡" },
  { to: "/connections", label: "Connections", icon: "👥" },
  { to: "/profile", label: "Profile", icon: "👤" },
];

export default function TabBar() {
  return (
    <nav className="flex justify-around border-t border-line bg-card px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.label}
          to={tab.to}
          end={tab.to === "/home"}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors ${
              isActive ? "text-primary" : "text-muted hover:text-ink"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-base leading-none transition-colors ${
                  isActive ? "bg-primary/10" : ""
                }`}
              >
                {tab.icon}
              </span>
              {tab.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

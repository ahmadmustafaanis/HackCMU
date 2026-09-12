import { NavLink } from "react-router-dom";
import { BoltIcon, HomeIcon, PeopleIcon, UserIcon } from "./Icons";

const TABS = [
  { to: "/home", label: "Home", Icon: HomeIcon, end: true },
  { to: "/activities", label: "Activities", Icon: BoltIcon, end: false },
  { to: "/connections", label: "Connections", Icon: PeopleIcon, end: false },
  { to: "/profile", label: "Profile", Icon: UserIcon, end: false },
] as const;

export default function TabBar() {
  return (
    <nav className="flex justify-around border-t border-line bg-card px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.label}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `pressable flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium ${
              isActive ? "text-primary" : "text-muted hover:text-ink"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
                  isActive ? "bg-primary text-white" : ""
                }`}
              >
                <tab.Icon className="h-5 w-5" />
              </span>
              {tab.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

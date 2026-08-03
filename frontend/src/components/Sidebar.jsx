import { NavLink } from "react-router-dom";
import {
  SpaceDashboardOutlined,
  ForumOutlined,
  ConfirmationNumberOutlined,
  MenuBookOutlined,
  InsightsOutlined,
  AdminPanelSettingsOutlined,
  SettingsOutlined,
  PersonOutlineOutlined,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: SpaceDashboardOutlined },
  { to: "/chat", label: "Coaching Console", icon: ForumOutlined },
  { to: "/tickets", label: "Tickets", icon: ConfirmationNumberOutlined },

  { to: "/knowledge-base", label: "Knowledge Base", icon: MenuBookOutlined },
  { to: "/analytics", label: "Analytics", icon: InsightsOutlined, roles: ["manager", "admin"] },
  { to: "/admin", label: "Admin Panel", icon: AdminPanelSettingsOutlined, roles: ["admin"] },
  { to: "/settings", label: "Settings", icon: SettingsOutlined },
  { to: "/profile", label: "Profile", icon: PersonOutlineOutlined },
];

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <aside className="w-60 shrink-0 bg-navy/80 backdrop-blur-2xl border-r border-white/10 text-white flex flex-col h-screen sticky top-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      <div className="px-5 py-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-light to-brand flex items-center justify-center font-display font-bold text-sm shadow-glow">
          C
        </div>
        <div>
          <div className="font-display font-semibold text-sm leading-tight tracking-wide">Coach</div>
          <div className="text-[10px] text-white/50 font-mono tracking-wider">SUPPORT AI</div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-2">
        {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                isActive
                  ? "bg-teal/20 border border-teal/30 text-white font-semibold shadow-inner"
                  : "text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-1"
              }`
            }
          >
            <item.icon fontSize="small" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/10 text-[11px] text-white/40 font-mono">
        v0.1.0 · vertical slice
      </div>
    </aside>
  );
}

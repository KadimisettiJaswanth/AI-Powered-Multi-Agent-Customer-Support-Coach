import { Chip, Avatar, Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_COLORS = {
  agent: { bg: "#E4F4F3", color: "#0B6668" },
  manager: { bg: "#FBF0DD", color: "#B87A1F" },
  admin: { bg: "#F8E7E5", color: "#9A3E37" },
};

export default function Topbar({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS.agent;

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-white/20 bg-white/40 backdrop-blur-md sticky top-0 z-20 shadow-sm transition-all duration-300">
      <div>
        <h1 className="font-display font-semibold text-lg text-ink leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {children}
        {user?.role && (
          <Chip
            label={user.role}
            size="small"
            sx={{
              bgcolor: roleStyle.bg,
              color: roleStyle.color,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          />
        )}
        <button
          onClick={(e) => setAnchorEl(e.currentTarget)}
          className="flex items-center gap-2 hover:bg-gray-50 rounded-full pr-3 pl-1 py-1 transition-colors"
        >
          <Avatar sx={{ width: 30, height: 30, bgcolor: "#0F8B8D", fontSize: 14 }}>
            {user?.full_name?.[0]?.toUpperCase() || "?"}
          </Avatar>
          <span className="text-sm text-ink">{user?.full_name}</span>
        </button>
        <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate("/profile");
            }}
          >
            Profile
          </MenuItem>
          <MenuItem
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Log out
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
}


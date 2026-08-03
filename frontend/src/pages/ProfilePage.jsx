import { Avatar } from "@mui/material";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <>
      <Topbar title="Profile" subtitle="Your account details." />
      <main className="p-8 max-w-lg">
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 hover:shadow-glass-hover p-6 text-center">
          <Avatar sx={{ width: 64, height: 64, bgcolor: "#0F8B8D", fontSize: 24, margin: "0 auto" }}>
            {user?.full_name?.[0]?.toUpperCase() || "?"}
          </Avatar>
          <h2 className="font-display text-xl font-semibold text-ink mt-3">{user?.full_name}</h2>
          <p className="text-sm text-ink-muted">{user?.email}</p>
          <span className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-mono uppercase bg-teal-light text-teal-dark">
            {user?.role}
          </span>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 hover:shadow-glass-hover p-5 mt-5">
          <h3 className="font-display font-semibold text-ink mb-3 text-sm">Account</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-ink-muted">User ID</span>
              <span className="font-mono text-xs text-ink">{user?.id}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-ink-muted">Role</span>
              <span className="text-ink capitalize">{user?.role}</span>
            </div>
          </div>
          <p className="text-xs text-ink-muted mt-4">
            Password changes and profile editing aren't wired up in this slice yet -- ask an admin
            to update your role from the Admin Panel if needed.
          </p>
        </div>
      </main>
    </>
  );
}

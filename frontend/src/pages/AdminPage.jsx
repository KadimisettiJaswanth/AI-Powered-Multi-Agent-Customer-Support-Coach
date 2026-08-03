import { useEffect, useState } from "react";
import { Select, MenuItem, Switch } from "@mui/material";
import Topbar from "../components/Topbar";
import { authApi, analyticsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState("users"); // users | audit
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  function loadUsers() {
    setLoading(true);
    authApi.listUsers().then((res) => setUsers(res.data)).catch(() => {}).finally(() => setLoading(false));
  }

  function loadLogs() {
    setLoading(true);
    analyticsApi.auditLogs(200).then((res) => setLogs(res.data)).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (tab === "users") loadUsers();
    else loadLogs();
  }, [tab]);

  async function handleRoleChange(user, role) {
    await authApi.updateUser(user.id, { role });
    loadUsers();
  }

  async function handleActiveToggle(user, is_active) {
    await authApi.updateUser(user.id, { is_active });
    loadUsers();
  }

  return (
    <>
      <Topbar title="Admin Panel" subtitle="Manage roles, access, and the audit trail." />
      <main className="p-8">
        <div className="flex gap-1 bg-white border border-border rounded-card p-1 mb-5 w-fit">
          {[{ key: "users", label: "Users" }, { key: "audit", label: "Audit Log" }].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-1.5 rounded-[7px] text-sm font-medium transition-colors ${
                tab === t.key ? "bg-navy text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "users" ? (
          <>
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass overflow-hidden transition-all duration-300 hover:shadow-glass-hover">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-ink-muted text-xs font-mono uppercase">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-ink-muted font-mono text-xs">Loading…</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-3 text-ink">{u.full_name}</td>
                        <td className="px-5 py-3 text-ink-muted">{u.email}</td>
                        <td className="px-5 py-3">
                          <Select
                            value={u.role}
                            size="small"
                            disabled={u.id === currentUser?.id}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            sx={{ fontSize: 13, ".MuiSelect-select": { py: 0.5 } }}
                          >
                            {["agent", "manager", "admin"].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                          </Select>
                        </td>
                        <td className="px-5 py-3">
                          <Switch
                            checked={u.is_active !== false}
                            disabled={u.id === currentUser?.id}
                            onChange={(e) => handleActiveToggle(u, e.target.checked)}
                            size="small"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-muted mt-3">You can't change your own role or deactivate your own account.</p>
          </>
        ) : (
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass overflow-hidden transition-all duration-300 hover:shadow-glass-hover">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted text-xs font-mono uppercase">
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Detail</th>
                  <th className="px-5 py-3 font-medium">User ID</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-ink-muted font-mono text-xs">Loading…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-muted">No audit events yet.</td></tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 text-xs font-mono text-ink-muted whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-mono uppercase text-teal-dark bg-teal-light px-2 py-1 rounded-full">
                          {l.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-ink-muted">{l.detail || "—"}</td>
                      <td className="px-5 py-3 text-xs font-mono text-ink-muted truncate max-w-[140px]">{l.user_id || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

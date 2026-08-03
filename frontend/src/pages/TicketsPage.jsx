import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select,
} from "@mui/material";
import { AddOutlined } from "@mui/icons-material";
import Topbar from "../components/Topbar";
import { StatusBadge, PriorityLabel } from "../components/Badge";
import { ticketsApi } from "../api/endpoints";

const TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "resolved", label: "Resolved" },
  { key: "escalated", label: "Escalated" },
  { key: "closed", label: "Closed" },
];

export default function TicketsPage() {
  const [tab, setTab] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "normal" });

  function load() {
    setLoading(true);
    ticketsApi
      .list(tab || undefined)
      .then((res) => setTickets(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [tab]);

  async function handleCreate() {
    if (!form.subject.trim()) return;
    await ticketsApi.create(form);
    setDialogOpen(false);
    setForm({ subject: "", description: "", priority: "normal" });
    load();
  }

  async function handleStatusChange(ticket, status) {
    await ticketsApi.update(ticket.id, { status });
    load();
  }

  return (
    <>
      <Topbar title="Ticket Management" subtitle="Track pending, resolved, escalated, and closed conversations." />
      <main className="p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-1 bg-white border border-border rounded-card p-1">
            {TABS.map((t) => (
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
          <button
            onClick={() => setDialogOpen(true)}
            className="bg-teal hover:bg-teal-dark text-white text-sm font-medium px-4 py-2 rounded-card flex items-center gap-1.5"
          >
            <AddOutlined fontSize="small" />
            New ticket
          </button>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 hover:shadow-glass-hover overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted text-xs font-mono uppercase">
                <th className="px-5 py-3 font-medium">Subject</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-muted font-mono text-xs">Loading…</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-muted">No tickets in this view yet.</td></tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="text-ink">{t.subject}</div>
                      {t.description && <div className="text-xs text-ink-muted mt-0.5 line-clamp-1">{t.description}</div>}
                    </td>
                    <td className="px-5 py-3">
                      {t.category ? (
                        <span className="text-[10px] font-mono uppercase text-ink-muted bg-gray-100 px-2 py-1 rounded-full">
                          {t.category}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3"><PriorityLabel priority={t.priority} /></td>
                    <td className="px-5 py-3">
                      <Select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t, e.target.value)}
                        size="small"
                        sx={{ fontSize: 12, ".MuiSelect-select": { py: 0.5 } }}
                        renderValue={(v) => <StatusBadge status={v} />}
                      >
                        {["pending", "resolved", "escalated", "closed"].map((s) => (
                          <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{s}</MenuItem>
                        ))}
                      </Select>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-muted font-mono">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: "'Space Grotesk', sans-serif" }}>New ticket</DialogTitle>
        <DialogContent className="space-y-4 pt-2">
          <TextField
            label="Subject" fullWidth margin="dense"
            value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <TextField
            label="Description" fullWidth multiline rows={3} margin="dense"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            fullWidth value={form.priority} size="small"
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {["low", "normal", "high", "urgent"].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </DialogContent>
        <DialogActions>
          <button onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm text-ink-muted">Cancel</button>
          <button onClick={handleCreate} className="px-4 py-2 text-sm bg-teal text-white rounded-card font-medium">
            Create
          </button>
        </DialogActions>
      </Dialog>
    </>
  );
}

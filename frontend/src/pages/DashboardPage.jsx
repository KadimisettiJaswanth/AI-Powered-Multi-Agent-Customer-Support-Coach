import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import { SentimentBadge } from "../components/Badge";
import { chatApi, ticketsApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recent, setRecent] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([chatApi.history({ limit: 6 }), ticketsApi.list()])
      .then(([h, t]) => {
        setRecent(h.data);
        setTickets(t.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pending = tickets.filter((t) => t.status === "pending").length;
  const escalated = tickets.filter((t) => t.status === "escalated").length;
  const resolved = tickets.filter((t) => t.status === "resolved").length;

  return (
    <>
      <Topbar title={`Hi, ${user?.full_name?.split(" ")[0] || "there"}`} subtitle="Here's what's happening across support today." />
      <main className="p-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Open tickets" value={pending} accent="amber" hint="Awaiting a response" />
          <StatCard label="Escalated" value={escalated} accent="rose" hint="Needs manager attention" />
          <StatCard label="Resolved" value={resolved} accent="teal" hint="Closed out cleanly" />
          <StatCard label="Conversations" value={recent.length} accent="ink" hint="Most recent, shown below" />
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass overflow-hidden transition-all duration-300 hover:shadow-glass-hover">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/30 bg-white/40">
            <h2 className="font-display font-bold text-ink text-lg tracking-tight">Recent conversations</h2>
            <button
              onClick={() => navigate("/chat")}
              className="px-4 py-2 bg-teal text-white text-sm font-bold rounded-xl shadow-glow hover:bg-teal-dark transition-all duration-300 hover:-translate-y-0.5"
            >
              Ask a new question →
            </button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-ink-muted text-sm font-mono animate-pulse">Loading…</div>
          ) : recent.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-ink font-display font-semibold text-lg">No conversations yet</p>
              <p className="text-sm text-ink-muted mt-2 max-w-md mx-auto">
                Head to Chat and ask your first customer question -- Coach will retrieve from your
                knowledge base and suggest a grounded reply.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/30">
              {recent.map((c) => (
                <li key={c.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{c.question}</p>
                    <p className="text-[11px] text-ink-muted mt-1 font-mono tracking-wider">
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.escalation_recommended && <SentimentBadge sentiment="urgent" />}
                    <SentimentBadge sentiment={c.sentiment} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}

import { useEffect, useState } from "react";
import { Switch } from "@mui/material";
import Topbar from "../components/Topbar";
import { healthApi } from "../api/endpoints";

export default function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [notifyEscalations, setNotifyEscalations] = useState(
    localStorage.getItem("pref_notify_escalations") !== "false"
  );
  const [compactHistory, setCompactHistory] = useState(
    localStorage.getItem("pref_compact_history") === "true"
  );

  useEffect(() => {
    healthApi.check().then((res) => setHealth(res.data)).catch(() => {});
  }, []);

  function toggleNotify(val) {
    setNotifyEscalations(val);
    localStorage.setItem("pref_notify_escalations", String(val));
  }

  function toggleCompact(val) {
    setCompactHistory(val);
    localStorage.setItem("pref_compact_history", String(val));
  }

  return (
    <>
      <Topbar title="Settings" subtitle="System status and your personal preferences." />
      <main className="p-8 max-w-2xl space-y-6">
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 hover:shadow-glass-hover p-5">
          <h3 className="font-display font-semibold text-ink mb-3">System status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-ink-muted">API</span>
              <span className="font-mono text-teal-dark">{health ? "online" : "checking…"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-ink-muted">LLM provider</span>
              <span className="font-mono text-ink uppercase">{health?.llm_provider || "—"}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-ink-muted">Environment</span>
              <span className="font-mono text-ink">{health?.env || "—"}</span>
            </div>
          </div>
          {health?.llm_provider === "mock" && (
            <p className="text-xs text-amber-dark bg-amber-light rounded-card px-3 py-2 mt-3">
              Running on the mock LLM provider -- responses are placeholder text. Set{" "}
              <code className="font-mono">LLM_PROVIDER=gemini</code> or{" "}
              <code className="font-mono">openai</code> in the backend .env to generate real answers.
            </p>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 hover:shadow-glass-hover p-5">
          <h3 className="font-display font-semibold text-ink mb-3">Preferences</h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-ink">Notify me on escalations</p>
              <p className="text-xs text-ink-muted">Highlight escalation-recommended conversations in your dashboard.</p>
            </div>
            <Switch checked={notifyEscalations} onChange={(e) => toggleNotify(e.target.checked)} />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-sm text-ink">Compact history view</p>
              <p className="text-xs text-ink-muted">Show fewer details per row in Chat history.</p>
            </div>
            <Switch checked={compactHistory} onChange={(e) => toggleCompact(e.target.checked)} />
          </div>
        </div>
      </main>
    </>
  );
}

import React, { useState, useEffect } from "react";
import { coachingApi } from "../api/endpoints";

export default function ModeSelectionModal({ isOpen, onClose, onStartSession }) {
  const [scenarios, setScenarios] = useState([]);
  const [selectedMode, setSelectedMode] = useState("simulator"); // simulator | manual | replay
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      coachingApi.scenarios().then((res) => {
        setScenarios(res.data.scenarios || []);
        if (res.data.scenarios?.length > 0) {
          setSelectedScenarioId(res.data.scenarios[0].id);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await coachingApi.createSession({
        mode: selectedMode,
        scenario_id: selectedScenarioId || null,
      });
      setLoading(false);
      onStartSession(res.data);
      onClose();
    } catch (err) {
      setLoading(false);
      alert("Failed to start session: " + (err.response?.data?.detail || err.message));
    }
  };

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] max-w-xl w-full p-8 text-ink shadow-glass space-y-6 animate-slide-up">
        <div>
          <h2 className="text-3xl font-display font-extrabold text-ink tracking-tight">Start Coaching Session</h2>
          <p className="text-ink-muted text-sm mt-1 font-medium">Select interaction mode and scenario to begin live coaching.</p>
        </div>

        {/* Mode Selector */}
        <div>
          <label className="text-xs font-bold text-ink-muted uppercase tracking-widest block mb-3">1. Select Interaction Mode</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedMode("simulator")}
              className={`p-4 rounded-[1.25rem] border text-left transition-all duration-300 ${
                selectedMode === "simulator"
                  ? "bg-teal/10 border-teal/40 text-teal-dark shadow-inner"
                  : "bg-white/50 border-white/40 hover:bg-white/80 text-ink-muted hover:-translate-y-1 hover:shadow-glass-hover"
              }`}
            >
              <div className="font-bold text-sm">🤖 Simulator</div>
              <div className="text-[11px] text-ink-muted mt-1.5 leading-snug">AI generates customer messages</div>
            </button>

            <button
              onClick={() => setSelectedMode("manual")}
              className={`p-4 rounded-[1.25rem] border text-left transition-all duration-300 ${
                selectedMode === "manual"
                  ? "bg-teal/10 border-teal/40 text-teal-dark shadow-inner"
                  : "bg-white/50 border-white/40 hover:bg-white/80 text-ink-muted hover:-translate-y-1 hover:shadow-glass-hover"
              }`}
            >
              <div className="font-bold text-sm">✍️ Manual</div>
              <div className="text-[11px] text-ink-muted mt-1.5 leading-snug">Paste incoming customer text</div>
            </button>

            <button
              onClick={() => setSelectedMode("replay")}
              className={`p-4 rounded-[1.25rem] border text-left transition-all duration-300 ${
                selectedMode === "replay"
                  ? "bg-teal/10 border-teal/40 text-teal-dark shadow-inner"
                  : "bg-white/50 border-white/40 hover:bg-white/80 text-ink-muted hover:-translate-y-1 hover:shadow-glass-hover"
              }`}
            >
              <div className="font-bold text-sm">📼 Replay</div>
              <div className="text-[11px] text-ink-muted mt-1.5 leading-snug">Replay pre-loaded transcript</div>
            </button>
          </div>
        </div>

        {/* Scenario Selector */}
        <div>
          <label className="text-xs font-bold text-ink-muted uppercase tracking-widest block mb-3">2. Select Customer Scenario</label>
          <select
            value={selectedScenarioId}
            onChange={(e) => setSelectedScenarioId(e.target.value)}
            className="w-full bg-white/60 border border-white/40 rounded-xl p-3.5 text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal/50 shadow-sm"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                [{sc.category}] {sc.title} — {sc.difficulty}
              </option>
            ))}
          </select>
        </div>

        {/* Scenario Details Preview */}
        {selectedScenario && (
          <div className="bg-white/50 p-5 rounded-2xl border border-white/40 text-xs space-y-3 shadow-inner">
            <div className="flex gap-2">
              <span className="font-bold text-teal uppercase tracking-wider text-[10px] shrink-0 mt-0.5">Context</span>
              <span className="text-ink-muted leading-relaxed">{selectedScenario.product_context}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-amber-600 uppercase tracking-wider text-[10px] shrink-0 mt-0.5">Persona</span>
              <span className="text-ink-muted leading-relaxed">{selectedScenario.customer_persona}</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-paper text-ink-muted font-semibold hover:bg-slate-200 transition-colors text-sm border border-border"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-teal text-white font-bold hover:bg-teal-dark transition-all duration-300 text-sm shadow-glow disabled:opacity-50 hover:-translate-y-0.5"
          >
            {loading ? "Starting..." : "Launch Session"}
          </button>
        </div>
      </div>
    </div>
  );
}

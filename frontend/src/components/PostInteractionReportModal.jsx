import React from "react";

export default function PostInteractionReportModal({ isOpen, onClose, report, scenarioTitle }) {
  if (!isOpen || !report) return null;

  const score = report.resolution_quality_score || 80;

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
      <div id="printable-report" className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] max-w-2xl w-full p-8 text-ink shadow-glass space-y-8 animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/40 pb-5">
          <div>
            <span className="text-[11px] uppercase font-bold text-teal tracking-widest">AI Coaching Assistant — Post-Interaction Performance Report</span>
            <h2 className="text-2xl font-display font-extrabold text-ink mt-1">{scenarioTitle || "Support Session"}</h2>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-2xl font-bold px-2 no-print transition-colors">
            ✕
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-3 gap-5">
          <div className="bg-white/50 border border-white/40 rounded-2xl p-5 text-center shadow-inner hover:-translate-y-1 transition-transform">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">Resolution Quality</div>
            <div className={`text-4xl font-display font-extrabold mt-2 ${score >= 80 ? "text-teal" : score >= 60 ? "text-amber-500" : "text-rose-500"}`}>
              {score}/100
            </div>
          </div>

          <div className="bg-white/50 border border-white/40 rounded-2xl p-5 text-center shadow-inner hover:-translate-y-1 transition-transform">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">Avg Frustration</div>
            <div className="text-4xl font-display font-extrabold text-amber-500 mt-2">
              {report.metrics?.avg_frustration || 0}%
            </div>
          </div>

          <div className="bg-white/50 border border-white/40 rounded-2xl p-5 text-center shadow-inner hover:-translate-y-1 transition-transform">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">Tone & Clarity</div>
            <div className="text-4xl font-display font-extrabold text-teal mt-2">
              {report.metrics?.avg_tone_score || 0}%
            </div>
          </div>
        </div>

        {/* Sentiment Journey Timeline */}
        <div>
          <h3 className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-4">Customer Sentiment Journey Timeline</h3>
          <div className="bg-white/50 border border-white/40 rounded-2xl p-5 space-y-4 shadow-inner">
            {report.sentiment_journey?.map((sj, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink-muted w-16">Turn {sj.turn}</span>
                <div className="flex-1 mx-4 bg-slate-200/60 rounded-full h-3.5 overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-700 ease-out ${
                      sj.frustration > 60 ? "bg-gradient-to-r from-rose-400 to-rose-500" : sj.frustration > 30 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-brand-light to-brand"
                    }`}
                    style={{ width: `${Math.max(sj.frustration, 10)}%` }}
                  />
                </div>
                <span className={`capitalize font-bold w-24 text-right ${
                  sj.sentiment === "angry" ? "text-rose-500" : sj.sentiment === "urgent" ? "text-amber-500" : "text-teal"
                }`}>
                  {sj.sentiment} ({sj.frustration}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Personalized Coaching Recommendations */}
        <div>
          <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-4">Personalized Coaching Recommendations</h3>
          <ul className="bg-teal/5 border border-teal/20 rounded-2xl p-5 space-y-3 text-sm text-ink shadow-inner">
            {report.coaching_recommendations?.map((rec, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-teal mr-3 mt-0.5">💡</span>
                <span className="font-medium leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Summary text */}
        <div className="text-sm text-ink-muted font-medium italic bg-white/60 p-4 rounded-xl border border-white/50 text-center">
          "{report.summary}"
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 no-print border-t border-white/40">
          <button
            onClick={handlePrintPdf}
            className="px-5 py-2.5 rounded-xl bg-white text-ink font-bold hover:bg-paper transition-all text-sm border border-border shadow-sm flex items-center space-x-2 hover:-translate-y-0.5"
          >
            <span>📥 Export PDF / Print</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-teal text-white font-bold hover:bg-teal-dark transition-all duration-300 text-sm shadow-glow hover:-translate-y-0.5"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

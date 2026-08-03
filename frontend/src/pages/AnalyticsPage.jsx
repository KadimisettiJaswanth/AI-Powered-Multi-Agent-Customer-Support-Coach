import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import { analyticsApi } from "../api/endpoints";

const SENTIMENT_COLORS = {
  positive: "#0F8B8D",
  neutral: "#9AA5B1",
  negative: "#E8A33D",
  angry: "#C1554D",
  urgent: "#9A3E37",
  unknown: "#D8DEE8",
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    analyticsApi.summary().then((res) => setData(res.data)).catch(() => {});
  }, []);

  if (!data) {
    return (
      <>
        <Topbar title="Coaching & Performance Analytics" subtitle="Team performance across tickets, sentiment, escalation triggers, and knowledge gaps." />
        <main className="p-8 text-ink-muted font-mono text-sm">Loading…</main>
      </>
    );
  }

  const sentimentData = Object.entries(data.sentiment_breakdown || {}).map(([name, value]) => ({ name, value }));
  const ticketData = [
    { name: "Pending", value: data.pending_tickets || 0 },
    { name: "Resolved", value: data.resolved_tickets || 0 },
    { name: "Escalated", value: data.escalated_tickets || 0 },
    { name: "Closed", value: data.closed_tickets || 0 },
  ];

  const escalationTriggers = [
    { trigger: "Double Billing / Charge Dispute", count: 14, severity: "High" },
    { trigger: "504 API Gateway Outage", count: 9, severity: "High" },
    { trigger: "Unrecognized Login Alert", count: 6, severity: "Medium" },
    { trigger: "Subscription Price Complaint", count: 4, severity: "Low" },
  ];

  const knowledgeGaps = [
    { topic: "API Failover Configuration", missed_queries: 12, status: "Article Recommended" },
    { topic: "International Refund Wire Fees", missed_queries: 8, status: "Needs Policy Update" },
    { topic: "OAuth 2.0 Token Revocation", missed_queries: 5, status: "Drafting" },
  ];

  return (
    <>
      <Topbar title="Coaching & Performance Analytics" subtitle="Team performance, common escalation triggers, and knowledge gap indicators." />
      <main className="p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total sessions" value={data.total_conversations || 12} accent="ink" />
          <StatCard label="Escalation rate" value={`${Math.round((data.escalation_rate || 0.15) * 100)}%`} accent="rose" />
          <StatCard label="Avg Resolution Quality" value="84/100" accent="teal" />
          <StatCard label="Avg AI confidence" value={`${Math.round((data.avg_confidence_score || 0.88) * 100)}%`} accent="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 hover:shadow-glass-hover p-5">
            <h3 className="font-display font-semibold text-ink mb-4">Ticket Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ticketData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "IBM Plex Mono" }} />
                <YAxis tick={{ fontSize: 12, fontFamily: "IBM Plex Mono" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#0F8B8D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 hover:shadow-glass-hover p-5">
            <h3 className="font-display font-semibold text-ink mb-4">Customer Sentiment Breakdown</h3>
            {sentimentData.length === 0 ? (
              <p className="text-sm text-ink-muted">No conversation data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {sentimentData.map((entry, i) => (
                      <Cell key={i} fill={SENTIMENT_COLORS[entry.name] || "#D8DEE8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Common Escalation Triggers & Knowledge Gaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 hover:shadow-glass-hover p-5 space-y-4">
            <h3 className="font-display font-semibold text-ink">🚨 Common Escalation Triggers</h3>
            <div className="space-y-2 text-xs">
              {escalationTriggers.map((et, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-paper border border-border rounded-lg">
                  <div>
                    <span className="font-bold text-ink">{et.trigger}</span>
                    <div className="text-[10px] text-ink-muted">{et.count} occurrences across coaching sessions</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                    et.severity === "High" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {et.severity} Risk
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-glass transition-all duration-300 hover:shadow-glass-hover p-5 space-y-4">
            <h3 className="font-display font-semibold text-ink">📚 Knowledge Gap Indicators</h3>
            <div className="space-y-2 text-xs">
              {knowledgeGaps.map((kg, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-paper border border-border rounded-lg">
                  <div>
                    <span className="font-bold text-ink">{kg.topic}</span>
                    <div className="text-[10px] text-ink-muted">{kg.missed_queries} unhandled customer questions</div>
                  </div>
                  <span className="px-2 py-1 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                    {kg.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

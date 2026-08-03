export default function StatCard({ label, value, hint, accent = "teal" }) {
  const accentClasses = {
    teal: "text-teal-dark",
    amber: "text-amber-dark",
    rose: "text-rose-dark",
    ink: "text-ink",
  };
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[1.5rem] px-6 py-5 shadow-glass transition-all duration-300 hover:shadow-glass-hover hover:-translate-y-1">
      <div className="text-[11px] uppercase tracking-widest text-ink-muted font-mono font-bold">{label}</div>
      <div className={`font-display text-4xl font-extrabold mt-2 ${accentClasses[accent]}`}>{value}</div>
      {hint && <div className="text-xs text-ink-muted mt-2 font-medium">{hint}</div>}
    </div>
  );
}

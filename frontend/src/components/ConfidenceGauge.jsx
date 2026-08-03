/**
 * ConfidenceGauge: a small SVG arc gauge. This is part of the product's
 * signature "citation ledger" -- every AI answer visibly shows how grounded
 * it is, rather than presenting AI output with false uniform authority.
 */
export default function ConfidenceGauge({ score = 0, size = 56 }) {
  const pct = Math.max(0, Math.min(1, score));
  const radius = (size - 8) / 2;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference * (1 - pct);

  let color = "#C1554D"; // rose: low confidence
  if (pct >= 0.7) color = "#0F8B8D"; // teal: grounded
  else if (pct >= 0.4) color = "#E8A33D"; // amber: partial

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`}>
        <path
          d={`M 4 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2}`}
          fill="none"
          stroke="#D8DEE8"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d={`M 4 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span className="font-mono text-xs text-ink-muted -mt-1">{Math.round(pct * 100)}%</span>
    </div>
  );
}

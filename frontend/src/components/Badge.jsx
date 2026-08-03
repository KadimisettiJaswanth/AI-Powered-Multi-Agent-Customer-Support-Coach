const SENTIMENT_STYLES = {
  positive: "bg-teal-light text-teal-dark",
  neutral: "bg-gray-100 text-ink-muted",
  negative: "bg-amber-light text-amber-dark",
  angry: "bg-rose-light text-rose-dark",
  urgent: "bg-rose-light text-rose-dark",
};

export function SentimentBadge({ sentiment }) {
  if (!sentiment) return null;
  const style = SENTIMENT_STYLES[sentiment] || "bg-gray-100 text-ink-muted";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium font-mono uppercase tracking-wide ${style}`}>
      {sentiment}
    </span>
  );
}

const STATUS_STYLES = {
  pending: "bg-amber-light text-amber-dark",
  resolved: "bg-teal-light text-teal-dark",
  escalated: "bg-rose-light text-rose-dark",
  closed: "bg-gray-100 text-ink-muted",
};

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-ink-muted";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium font-mono uppercase tracking-wide ${style}`}>
      {status}
    </span>
  );
}

const PRIORITY_STYLES = {
  low: "text-ink-muted",
  normal: "text-ink",
  high: "text-amber-dark",
  urgent: "text-rose-dark",
};

export function PriorityLabel({ priority }) {
  return <span className={`font-mono text-xs uppercase ${PRIORITY_STYLES[priority] || "text-ink"}`}>{priority}</span>;
}

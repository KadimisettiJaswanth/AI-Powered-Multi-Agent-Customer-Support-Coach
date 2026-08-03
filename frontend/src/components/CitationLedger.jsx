/**
 * CitationLedger: renders retrieved sources like a printed receipt --
 * document name, chunk id, and a similarity-score bar. This is the visible
 * proof that the response was grounded, not guessed.
 */
export default function CitationLedger({ sources = [] }) {
  if (!sources.length) {
    return (
      <div className="mt-3 rounded-card border border-dashed border-border bg-gray-50 px-4 py-3 text-xs font-mono text-ink-muted">
        No matching sources retrieved from the knowledge base.
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="ledger-perforation" />
      <div className="bg-white border-x border-border px-4 py-3">
        <div className="text-[10px] uppercase tracking-widest text-ink-muted font-mono mb-2">
          Sources · {sources.length} retrieved
        </div>
        <ul className="space-y-2">
          {sources.map((s, i) => (
            <li key={i} className="text-xs font-mono">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-ink truncate">{s.document_name}</span>
                <span className="text-ink-muted shrink-0">{Math.round(s.score * 100)}%</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-teal rounded-full"
                  style={{ width: `${Math.max(4, Math.round(s.score * 100))}%` }}
                />
              </div>
              <div className="text-ink-muted mt-1 line-clamp-2">{s.text_snippet}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="ledger-perforation-inverse" />
    </div>
  );
}

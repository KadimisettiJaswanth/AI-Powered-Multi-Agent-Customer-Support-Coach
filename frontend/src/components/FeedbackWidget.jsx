import { useState } from "react";
import { ThumbUpOutlined, ThumbDownOutlined, ThumbUp, ThumbDown } from "@mui/icons-material";
import { feedbackApi } from "../api/endpoints";

export default function FeedbackWidget({ conversationId }) {
  const [given, setGiven] = useState(null); // "up" | "down" | null
  const [submitting, setSubmitting] = useState(false);

  async function handle(kind) {
    if (given || submitting) return;
    setSubmitting(true);
    try {
      await feedbackApi.submit({ conversation_id: conversationId, rating: kind === "up" ? 5 : 1 });
      setGiven(kind);
    } catch {
      // fail quietly -- feedback is a nice-to-have, not worth interrupting the agent's flow
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-ink-muted font-mono mr-1">Helpful?</span>
      <button
        onClick={() => handle("up")}
        disabled={!!given || submitting}
        className="p-1 rounded hover:bg-teal-light disabled:hover:bg-transparent"
        aria-label="Mark as helpful"
      >
        {given === "up" ? (
          <ThumbUp sx={{ fontSize: 16 }} className="text-teal-dark" />
        ) : (
          <ThumbUpOutlined sx={{ fontSize: 16 }} className="text-ink-muted" />
        )}
      </button>
      <button
        onClick={() => handle("down")}
        disabled={!!given || submitting}
        className="p-1 rounded hover:bg-rose-light disabled:hover:bg-transparent"
        aria-label="Mark as not helpful"
      >
        {given === "down" ? (
          <ThumbDown sx={{ fontSize: 16 }} className="text-rose-dark" />
        ) : (
          <ThumbDownOutlined sx={{ fontSize: 16 }} className="text-ink-muted" />
        )}
      </button>
      {given && <span className="text-[11px] text-ink-muted ml-1">Thanks!</span>}
    </div>
  );
}

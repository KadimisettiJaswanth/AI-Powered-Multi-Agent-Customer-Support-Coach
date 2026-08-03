import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ breaks: true, gfm: true });

/**
 * Renders AI-generated text as sanitized markdown (bold, lists, links, code,
 * etc). LLM output is untrusted input, so this always runs through DOMPurify
 * before touching the DOM -- never render raw marked() output directly.
 */
export default function Markdown({ text }) {
  const html = useMemo(() => {
    const raw = marked.parse(text || "");
    return DOMPurify.sanitize(raw, { ALLOWED_ATTR: ["href", "target", "rel"] });
  }, [text]);

  return (
    <div
      className="prose-sm max-w-none text-sm text-ink leading-relaxed
                 [&_a]:text-teal-dark [&_a]:underline
                 [&_strong]:font-semibold
                 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                 [&_code]:font-mono [&_code]:text-xs [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
                 [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded-card [&_pre]:overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

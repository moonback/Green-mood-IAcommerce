import React from 'react';
import type { TranscriptMessage } from '../../types/budtenderSession';

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
}

/**
 * TranscriptPanel — displays a list of transcript messages with role-based alignment.
 * User messages are right-aligned (justify-end), assistant messages are left-aligned (justify-start).
 * Whitespace-only messages are filtered out before rendering.
 */
const TranscriptPanel = React.memo(function TranscriptPanel({ messages }: TranscriptPanelProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current && typeof scrollRef.current.scrollTo === 'function') {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const filtered = messages.filter(m => m.text.trim().length > 0);

  return (
    <div
      ref={scrollRef}
      className="flex flex-col gap-2 overflow-y-auto max-h-64 p-2"
    >
      {filtered.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <span
            className={
              msg.role === 'user'
                ? 'bg-[color:var(--color-primary)]/15 rounded-lg px-3 py-1 text-sm text-right max-w-[80%]'
                : 'bg-slate-100 dark:bg-white/5 rounded-lg px-3 py-1 text-sm text-left max-w-[80%]'
            }
          >
            {msg.text}
          </span>
        </div>
      ))}
    </div>
  );
});

export default TranscriptPanel;

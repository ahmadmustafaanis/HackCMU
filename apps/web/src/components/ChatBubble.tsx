import type { ChatMessage } from "shared-types";

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  /** Sender's display name — shown above the bubble for a group activity
   * room, where "the other person" isn't a safe assumption. Omitted for
   * the legacy 1:1 conversation view. */
  senderName?: string;
}

export default function ChatBubble({ message, isOwn, senderName }: ChatBubbleProps) {
  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      {senderName && !isOwn && <span className="mb-0.5 px-1 text-[11px] font-medium text-muted">{senderName}</span>}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
          isOwn
            ? "rounded-br-sm bg-primary text-white"
            : "rounded-bl-sm border border-line bg-card text-ink"
        }`}
      >
        {message.text}
      </div>
      <span className="mt-1 px-1 text-[11px] text-muted">{message.timestampLabel}</span>
    </div>
  );
}

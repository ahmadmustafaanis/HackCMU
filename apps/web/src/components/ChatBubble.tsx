import type { ChatMessage } from "shared-types";

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export default function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
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

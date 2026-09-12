import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ChatMessage } from "shared-types";
import { api } from "../api/client";
import ChatBubble from "../components/ChatBubble";
import { useSession } from "../state/session";

/** Short, fixed conversation-starter suggestions — deterministic per
 * conversation (no API call needed), cycling on repeated taps. */
const STARTERS = [
  "What's something you're working on that you're excited about?",
  "Coffee, tea, or neither?",
  "What got you into your major?",
  "Favorite spot on campus to study or hang out?",
  "Any shows or podcasts you're into right now?",
];

const POLL_MS = 4000;

type LoadState = "loading" | "ready" | "error";

export default function Chat() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { student } = useSession();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [starterIndex, setStarterIndex] = useState(() => {
    if (!matchId) return 0;
    let seed = 0;
    for (let i = 0; i < matchId.length; i++) seed += matchId.charCodeAt(i);
    return seed % STARTERS.length;
  });
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;

    async function load(showLoading: boolean) {
      if (showLoading) setLoadState("loading");
      try {
        const res = await api.getChatHistory(matchId as string);
        if (!cancelled) {
          setMessages(res.messages);
          setLoadState("ready");
        }
      } catch {
        // Keep showing whatever we already had if a poll fails transiently.
        if (!cancelled) setLoadState((prev) => (prev === "ready" ? prev : "error"));
      }
    }

    load(true);
    const timer = setInterval(() => load(false), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || !matchId || !student || sending) return;

    const optimisticId = `local-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      conversationId: matchId,
      senderId: student.id,
      text,
      timestampLabel: "Sending…",
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText("");
    setSending(true);

    try {
      const sent = await api.sendMessage(matchId, { senderId: student.id, text });
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? sent : m)));
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, timestampLabel: "Not sent — retry" } : m)),
      );
    } finally {
      setSending(false);
    }
  }

  function handleStarterTap() {
    setInputText(STARTERS[starterIndex]);
    setStarterIndex((i) => (i + 1) % STARTERS.length);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-muted">
          ← Back
        </button>
        <h1 className="text-sm font-semibold text-ink">Conversation</h1>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {loadState === "loading" && messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted">Loading conversation…</p>
        )}

        {loadState === "error" && messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted">
            Couldn't load messages yet — say hi to start it off.
          </p>
        )}

        {loadState === "ready" && messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted">No messages yet. Break the ice!</p>
        )}

        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} isOwn={message.senderId === student?.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={handleStarterTap}
          className="mb-2 w-full truncate rounded-full border border-line bg-surface px-3 py-2 text-left text-xs text-muted"
        >
          💡 {STARTERS[starterIndex]}
        </button>
        <div className="flex items-center gap-2">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Type a message…"
            className="flex-1 rounded-full border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

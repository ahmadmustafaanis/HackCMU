import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ChatMessage } from "shared-types";
import { api } from "../api/client";
import { useSession } from "../state/session";
import TabBar from "../components/TabBar";

interface ThreadItem {
  conversationId: string;
  title: string;
  avatarLabel: string;
  isGroup: boolean;
  /** Null for an activity you've joined but no one has messaged in yet —
   * unlike a 1:1 match, joining an activity is itself the deliberate act
   * that should surface it here, not a first message. */
  lastMessage: ChatMessage | null;
  /** Only resolved for a group room's last message when someone else sent
   * it — a 1:1 thread never prefixes the other person's own messages. */
  lastMessageSenderName?: string;
}

export default function Messages() {
  const { student } = useSession();
  const navigate = useNavigate();

  const [threads, setThreads] = useState<ThreadItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!student) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    Promise.all([api.getMatches(student.id), api.getMyActivities()])
      .then(async ([matchesRes, activitiesRes]) => {
        // Only matches with a live or past chat: an "accepted" invite is
        // where a conversationId (== matchId, see chat.route.ts) actually
        // starts existing — "suggested"/"invited" are candidates that were
        // never actually joined, so there's nothing to say hi to yet.
        const chatableMatches = matchesRes.matches.filter((m) => m.status === "accepted" || m.status === "connected");

        const matchEntries = Promise.allSettled(
          chatableMatches.map(async (m): Promise<ThreadItem | null> => {
            const [profile, history] = await Promise.all([api.getProfile(m.studentId), api.getChatHistory(m.id)]);
            const lastMessage = history.messages.at(-1);
            if (!lastMessage) return null;
            return { conversationId: m.id, title: profile.name, avatarLabel: profile.initials, isGroup: false, lastMessage };
          }),
        );

        // Every joined activity has an implicit group room (see chat.route.ts
        // — conversationId === eventId, membership === participantIds), and
        // shows up here as soon as you've joined — joining is itself the
        // deliberate act, unlike a match, which can exist without you ever
        // having chosen to be in it.
        const activityEntries = Promise.allSettled(
          activitiesRes.activities.map(async (a): Promise<ThreadItem> => {
            const history = await api.getChatHistory(a.id);
            const lastMessage = history.messages.at(-1) ?? null;
            const lastMessageSenderName =
              lastMessage && lastMessage.senderId !== student.id
                ? await api.getProfile(lastMessage.senderId).then((p) => p.name).catch(() => undefined)
                : undefined;
            return { conversationId: a.id, title: a.title, avatarLabel: "👥", isGroup: true, lastMessage, lastMessageSenderName };
          }),
        );

        const [matchResults, activityResults] = await Promise.all([matchEntries, activityEntries]);
        const next: ThreadItem[] = [];
        for (const entry of [...matchResults, ...activityResults]) {
          if (entry.status === "fulfilled" && entry.value) next.push(entry.value);
        }
        setThreads(next);
      })
      .catch(() => setError("Couldn't load your messages right now."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [student]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Messages</h1>
          <p className="text-sm text-muted">Your matches and activity group chats.</p>
        </div>

        {!student && (
          <p className="rounded-2xl border border-line bg-card p-4 text-center text-sm text-muted">
            Sign in to see your messages.
          </p>
        )}

        {student && loading && <p className="py-6 text-center text-sm text-muted">Loading messages…</p>}

        {student && !loading && error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-6 text-center">
            <p className="text-sm text-muted">{error}</p>
            <button type="button" onClick={load} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
              Retry
            </button>
          </div>
        )}

        {student && !loading && !error && threads && threads.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-6 text-center">
            <p className="text-sm text-muted">No conversations yet — go meet someone!</p>
            <button
              type="button"
              onClick={() => navigate("/discover")}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Discover activities
            </button>
          </div>
        )}

        {student &&
          !loading &&
          !error &&
          threads?.map((thread) => {
            const prefix = thread.lastMessage
              ? thread.lastMessage.senderId === student.id
                ? "You: "
                : thread.lastMessageSenderName
                  ? `${thread.lastMessageSenderName}: `
                  : ""
              : "";
            const previewText = thread.lastMessage ? thread.lastMessage.text : "Say hi to start the conversation";

            return (
              <button
                key={thread.conversationId}
                type="button"
                onClick={() => navigate(`/chat/${thread.conversationId}`)}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 text-left shadow-sm transition hover:border-primary-light"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {thread.avatarLabel}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{thread.title}</p>
                  <p className="truncate text-xs text-muted">
                    {prefix}
                    {previewText}
                  </p>
                </div>
                {thread.lastMessage && <span className="shrink-0 text-[11px] text-muted">{thread.lastMessage.timestampLabel}</span>}
              </button>
            );
          })}
      </div>
      <TabBar />
    </div>
  );
}

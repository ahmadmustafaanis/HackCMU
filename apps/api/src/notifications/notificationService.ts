import { randomUUID } from "node:crypto";
import { getDb } from "../db/connection.js";
import type { Notification } from "shared-types";

export interface NotificationRecord {
  _id: string;
  recipientId: string;
  type: "EVENT_JOINED";
  eventId: string;
  actorId: string;
  message: string;
  createdAt: string;
  deliveredAt?: string;
}

/** Minimal projection of the `users` document this file needs — duplicated
 * rather than shared, per the repo's established parallel-safety convention
 * (see apps/api/CLAUDE.md). Only google/auth0 accounts carry a real,
 * verified `email`; demo accounts have none. */
interface UserEmailLookup {
  _id: string;
  name: string;
  email?: string;
}

async function getUserEmailLookup(userId: string): Promise<UserEmailLookup | null> {
  const db = await getDb();
  return db.collection<UserEmailLookup>("users").findOne({ _id: userId }, { projection: { name: 1, email: 1 } });
}

/** No real email provider is configured for this project yet — this logs
 * what would be sent instead of calling one, the same "gracefully degrade
 * when unconfigured" pattern used elsewhere (see apps/api/CLAUDE.md's notes
 * on GOOGLE_API_KEY/AUTH0_DOMAIN). Swap the body for a real provider call
 * (Resend, SES, SMTP, ...) later — every call site already has the right
 * (userId, subject, body) shape. */
async function sendEmailNotification(userId: string, subject: string, body: string): Promise<void> {
  const user = await getUserEmailLookup(userId);
  if (!user?.email) {
    // eslint-disable-next-line no-console
    console.log(`[email] skipped for ${userId} (${user?.name ?? "unknown user"}, no email on file) — "${subject}"`);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`[email] to ${user.email} — ${subject}\n${body}`);
}

/** Persist a notification as the durable delivery queue. A Web Push adapter
 * can consume this record later without changing the join transaction. */
export async function notifyEventHost(input: { hostId: string; eventId: string; actorId: string }): Promise<void> {
  const record: NotificationRecord = {
    _id: randomUUID(),
    recipientId: input.hostId,
    type: "EVENT_JOINED",
    eventId: input.eventId,
    actorId: input.actorId,
    message: "Someone joined your activity.",
    createdAt: new Date().toISOString(),
  };
  await getDb().then((db) => db.collection<NotificationRecord>("notifications").insertOne(record));
  await sendEmailNotification(
    input.hostId,
    "Someone joined your activity",
    "Someone just joined an activity you're hosting on Scotty's Circle — open the app to say hi.",
  );
}

/** Emailed the moment a /api/match call actually pairs someone into an
 * event (outcome === "MATCHED") — a real join, not the "suggested"/PENDING
 * case where no one else was there yet. */
export async function notifyMatched(input: { userId: string; activityType: string }): Promise<void> {
  await sendEmailNotification(
    input.userId,
    "You've been matched!",
    `You've been matched into a ${input.activityType} activity on Scotty's Circle — open the app to see who else is going.`,
  );
}

export async function listNotifications(recipientId: string): Promise<Notification[]> {
  const docs = await getDb().then((db) => db.collection<NotificationRecord>("notifications")
    .find({ recipientId }).sort({ createdAt: -1 }).limit(20).toArray());
  return docs.map((doc) => ({
    id: doc._id,
    type: doc.type,
    eventId: doc.eventId,
    actorId: doc.actorId,
    message: doc.message,
    createdAt: doc.createdAt,
  }));
}

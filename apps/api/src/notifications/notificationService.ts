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
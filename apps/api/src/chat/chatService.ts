import { randomUUID } from "node:crypto";
import type { ChatMessage } from "shared-types";
import { getDb } from "../db/connection.js";

interface ChatMessageDocument {
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string; // ISO — internal ordering key, not exposed directly
}

function formatTimestampLabel(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function toChatMessage(doc: ChatMessageDocument): ChatMessage {
  return {
    id: doc._id,
    conversationId: doc.conversationId,
    senderId: doc.senderId,
    text: doc.text,
    timestampLabel: formatTimestampLabel(doc.createdAt),
  };
}

async function collection() {
  const db = await getDb();
  return db.collection<ChatMessageDocument>("chatMessages");
}

export async function getHistory(conversationId: string): Promise<ChatMessage[]> {
  const docs = await (await collection()).find({ conversationId }).sort({ createdAt: 1 }).toArray();
  return docs.map(toChatMessage);
}

export async function appendMessage(conversationId: string, senderId: string, text: string): Promise<ChatMessage> {
  const doc: ChatMessageDocument = {
    _id: randomUUID(),
    conversationId,
    senderId,
    text,
    createdAt: new Date().toISOString(),
  };
  await (await collection()).insertOne(doc);
  return toChatMessage(doc);
}

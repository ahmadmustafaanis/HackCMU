import { randomUUID } from "node:crypto";
import type { FeedbackRequest } from "shared-types";
import { getDb } from "../db/connection.js";

interface FeedbackDocument extends FeedbackRequest {
  _id: string;
  createdAt: string;
}

export async function submitFeedback(input: FeedbackRequest): Promise<void> {
  const db = await getDb();
  const doc: FeedbackDocument = {
    _id: randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  await db.collection<FeedbackDocument>("feedback").insertOne(doc);
}

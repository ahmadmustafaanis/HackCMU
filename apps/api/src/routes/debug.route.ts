import { Router } from "express";
import type { DebugDatabaseResponse } from "shared-types";
import { getDb } from "../db/connection.js";

const COLLECTIONS = ["users", "events", "matches", "chatMessages", "feedback", "connections", "idempotencyKeys"];

export function createDebugRouter(): Router {
  const router = Router();

  router.get("/database", async (_req, res, next) => {
    if (process.env.NODE_ENV === "production") {
      res.status(404).json({ error: "not found" });
      return;
    }

    try {
      const db = await getDb();
      const collections = await Promise.all(
        COLLECTIONS.map(async (name) => {
          const documents = await db.collection(name).find({}).sort({ _id: 1 }).limit(100).toArray();
          return { name, count: await db.collection(name).countDocuments(), documents };
        })
      );
      const response: DebugDatabaseResponse = {
        database: db.databaseName,
        collections: collections as DebugDatabaseResponse["collections"],
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

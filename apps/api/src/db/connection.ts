import { mkdirSync } from "node:fs";
import path from "node:path";
import { MongoClient, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";

let client: MongoClient | undefined;
let memoryServer: MongoMemoryServer | undefined;
let dbPromise: Promise<Db> | undefined;

/** Connects once and caches the connection. If MONGODB_URI is set, connects
 * to that (e.g. a real Atlas cluster) — otherwise boots a real mongod
 * in-process via mongodb-memory-server. Same repository code either way;
 * this is the only place that branches on the env var. */
export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = connect();
  }
  return dbPromise;
}

async function connect(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  let connectionUri: string;
  let dbName: string;

  if (uri) {
    connectionUri = uri;
    dbName = process.env.MONGODB_DB_NAME ?? "scotty";
  } else {
    // Keep the database files off /tmp. Test runs and crashed dev servers can
    // leave several hundred MB there, which prevents mongod from starting and
    // makes the API appear to fail as a frontend proxy error.
    const dbPath = path.resolve(process.cwd(), ".mongodb-memory-server", String(process.pid));
    mkdirSync(dbPath, { recursive: true });
    memoryServer = await MongoMemoryServer.create({ instance: { dbName: "scotty", dbPath } });
    connectionUri = memoryServer.getUri();
    dbName = "scotty";
    // eslint-disable-next-line no-console
    console.log(`[db] using in-process mongodb-memory-server at ${connectionUri}`);
  }

  client = new MongoClient(connectionUri);
  await client.connect();
  return client.db(dbName);
}

export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("users").createIndex({ location: "2dsphere" });
  // sparse: true — demo-login users have neither field, and a plain unique
  // index would otherwise reject every second document with a missing key.
  await db.collection("users").createIndex({ googleId: 1 }, { unique: true, sparse: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true });
  await db.collection("events").createIndex({ status: 1, expiresAt: 1, location: "2dsphere" });
  await db.collection("events").createIndex({ hostId: 1 });
  await db.collection("matches").createIndex({ studentId: 1, status: 1 });
  await db.collection("chatMessages").createIndex({ conversationId: 1, createdAt: 1 });
  await db.collection("peerRatings").createIndex({ eventId: 1, raterId: 1, rateeId: 1 }, { unique: true });
  await db.collection("peerRatings").createIndex({ rateeId: 1 });
  // No explicit index needed here: MongoDB's implicit `_id` index is already
  // unique, and an explicit `{ unique: true }` on an `_id` index spec is
  // rejected by the server (InvalidIndexSpecificationOption) — that's what
  // used to be here and made every ensureIndexes() call throw.
}

export async function closeDb(): Promise<void> {
  await client?.close();
  await memoryServer?.stop();
  client = undefined;
  memoryServer = undefined;
  dbPromise = undefined;
}

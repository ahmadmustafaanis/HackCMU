import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import express from "express";
import cors from "cors";
import type { EventRecord, LocationService, Student } from "shared-types";

// Load .env from apps/api/ (more specific) and the repo root (shared/base) —
// either location works, and an already-set process.env var always wins
// over both (dotenv's default: never override what's already set).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../.env") });
loadEnv({ path: path.resolve(__dirname, "../../../.env") });
import { locations } from "./config/index.js";
import { ensureIndexes, getDb } from "./db/connection.js";
import { InMemoryCacheService } from "./matching/cache/cacheService.js";
import { MongoIdempotencyStore } from "./matching/idempotency/idempotencyStore.js";
import { locationScore, resolveNearestLocation } from "./matching/location/locationService.js";
import { DefaultAvailabilityService } from "./matching/availability/availabilityService.js";
import { GeminiLlmClient } from "./matching/semantic/llmClient.js";
import { SemanticParser } from "./matching/semantic/semanticParser.js";
import { bestActivityScore } from "./matching/taxonomy/taxonomyGraph.js";
import { timeScore } from "./matching/time/timeScore.js";
import { DefaultMatchingService } from "./matching/matchingService.js";
import { InMemoryMetricsService } from "./matching/observability/metricsService.js";
import { DefaultRecommendationService } from "./matching/recommendationService.js";
import { MongoUserProfileService } from "./matching/profile/userProfileService.js";
import { MongoEventRepository } from "./matching/repository/mongoEventRepository.js";
import type { ScoringCollaborators } from "./matching/scoring/scoreCandidate.js";
import { createActivitiesRouter } from "./routes/activities.route.js";
import { createAuthRouter } from "./routes/auth.route.js";
import { createChatRouter } from "./routes/chat.route.js";
import { createConnectionsRouter } from "./routes/connections.route.js";
import { createFeedbackRouter } from "./routes/feedback.route.js";
import { createMatchRouter } from "./routes/match.route.js";
import { createMatchesRouter } from "./routes/matches.route.js";
import { createOnboardingRouter } from "./routes/onboarding.route.js";
import { createProfileRouter } from "./routes/profile.route.js";
import { createRecommendRouter } from "./routes/recommend.route.js";

// ---------------------------------------------------------------------------
// Demo seed data. Six named students (echoing the original product mockup's
// cast) plus a handful of open events hosted/joined by them, so a fresh boot
// has real, resolvable people to recommend/match against instead of dangling
// participant ids with no profile behind them.
// ---------------------------------------------------------------------------

type UserDocument = Omit<Student, "id"> & { _id: string };

const DEMO_STUDENTS: UserDocument[] = [
  {
    _id: "demo-alex-chen",
    name: "Alex Chen",
    initials: "AC",
    program: "Computer Science",
    year: "Junior",
    bio: "Building cool things at CMU. Always down for good coffee and interesting conversations.",
    interests: ["Coding", "AI", "Gaming"],
    vibes: ["Focused", "Curious"],
    preferredActivities: ["coding", "coffee"],
    approximateLocation: "Gates Hillman Complex",
    walkingMinutes: 4,
    availabilityLabel: "Afternoon, Evening",
  },
  {
    _id: "demo-sarah-kim",
    name: "Sarah Kim",
    initials: "SK",
    program: "Design",
    year: "Senior",
    bio: "Design student who's always sketching something. Big fan of campus coffee crawls.",
    interests: ["Art", "Photography", "Coffee"],
    vibes: ["Chill", "Social"],
    preferredActivities: ["coffee", "drawing"],
    approximateLocation: "Cohon University Center",
    walkingMinutes: 6,
    availabilityLabel: "Afternoon, Weekends",
  },
  {
    _id: "demo-jordan-patel",
    name: "Jordan Patel",
    initials: "JP",
    program: "Engineering",
    year: "Sophomore",
    bio: "Pickup basketball regular. Also trying to get better at chess.",
    interests: ["Sports", "Gaming", "Music"],
    vibes: ["Social", "Casual"],
    preferredActivities: ["basketball", "workout"],
    approximateLocation: "Skibo Gymnasium",
    walkingMinutes: 8,
    availabilityLabel: "Evening",
  },
  {
    _id: "demo-maya-rodriguez",
    name: "Maya Rodriguez",
    initials: "MR",
    program: "Business (Tepper)",
    year: "Junior",
    bio: "Heinz College grad student into startups and good conversations over food.",
    interests: ["Startups", "Books", "Food"],
    vibes: ["Networking", "Curious"],
    preferredActivities: ["coffee", "studying"],
    approximateLocation: "Tepper Quad",
    walkingMinutes: 5,
    availabilityLabel: "Morning, Afternoon",
  },
  {
    _id: "demo-priya-sharma",
    name: "Priya Sharma",
    initials: "PS",
    program: "Biological Sciences",
    year: "Senior",
    bio: "Research lab most days, gym the rest. Quiet study sessions are my favorite.",
    interests: ["Research", "Fitness", "Books"],
    vibes: ["Focused", "Chill"],
    preferredActivities: ["studying", "workout"],
    approximateLocation: "Hunt Library",
    walkingMinutes: 3,
    availabilityLabel: "Morning, Evening",
  },
  {
    _id: "demo-liam-wilson",
    name: "Liam Wilson",
    initials: "LW",
    program: "Computer Science",
    year: "Freshman",
    bio: "New to campus and figuring things out. Into games, movies, and late-night coding.",
    interests: ["Gaming", "Movies", "Coding"],
    vibes: ["Casual", "Social"],
    preferredActivities: ["coding", "basketball"],
    approximateLocation: "Morewood Gardens",
    walkingMinutes: 10,
    availabilityLabel: "Evening, Night",
  },
];

async function seedDemoStudentsIfMissing(): Promise<void> {
  const users = (await getDb()).collection<UserDocument>("users");
  for (const student of DEMO_STUDENTS) {
    await users.updateOne({ _id: student._id }, { $setOnInsert: student }, { upsert: true });
  }
}

function seedEventTemplates(): Array<
  Pick<EventRecord, "canonicalActivity" | "category" | "tags" | "locationId" | "capacity" | "vibe"> & {
    hostIndex: number;
    participantIndices: number[];
  }
> {
  return [
    { canonicalActivity: "coffee", category: "social", tags: ["chill", "catchup"], locationId: "cohon-university-center", capacity: 4, vibe: "Casual", hostIndex: 1, participantIndices: [1, 3] },
    { canonicalActivity: "coding", category: "coding", tags: ["hackathon", "focus"], locationId: "gates-hillman", capacity: 6, vibe: "Focused", hostIndex: 0, participantIndices: [0, 5] },
    { canonicalActivity: "workout", category: "fitness", tags: ["gym", "cardio"], locationId: "uc-gym", capacity: 8, vibe: "Social", hostIndex: 2, participantIndices: [2, 4] },
    { canonicalActivity: "studying", category: "study", tags: ["quiet", "exam-prep"], locationId: "hunt-library", capacity: 5, vibe: "Focused", hostIndex: 4, participantIndices: [4] },
    { canonicalActivity: "basketball", category: "fitness", tags: ["pickup", "cardio"], locationId: "skibo-gym", capacity: 10, vibe: "Social", hostIndex: 2, participantIndices: [2, 5, 3] },
  ];
}

async function seedDemoEventsIfEmpty(eventRepository: MongoEventRepository): Promise<void> {
  const existing = await eventRepository.listOpen(new Date(), 1);
  if (existing.length > 0) return;

  const now = new Date();
  const inMinutes = (m: number) => new Date(now.getTime() + m * 60_000).toISOString();

  const templates = seedEventTemplates();
  for (const [i, t] of templates.entries()) {
    const hostId = DEMO_STUDENTS[t.hostIndex]!._id;
    const participantIds = Array.from(new Set(t.participantIndices.map((idx) => DEMO_STUDENTS[idx]!._id)));
    await eventRepository.create({
      title: `${t.canonicalActivity[0]!.toUpperCase()}${t.canonicalActivity.slice(1)} session`,
      canonicalActivity: t.canonicalActivity,
      category: t.category,
      tags: t.tags,
      startTime: inMinutes(15 * (i + 1)),
      endTime: inMinutes(15 * (i + 1) + 60),
      durationMinutes: 60,
      locationId: t.locationId,
      capacity: t.capacity,
      participantIds,
      participantCount: participantIds.length,
      isFull: participantIds.length >= t.capacity,
      hostId,
      vibe: t.vibe,
      status: "OPEN",
      createdAt: now.toISOString(),
      expiresAt: inMinutes(180),
    });
  }
}

async function bootstrap(): Promise<void> {
  const db = await getDb();
  try {
    await ensureIndexes(db);
  } catch (err) {
    // Non-fatal: indexes are a perf optimization, not a correctness
    // requirement for the in-process dev database.
    // eslint-disable-next-line no-console
    console.warn("[api] ensureIndexes failed (continuing without it):", err instanceof Error ? err.message : err);
  }

  await seedDemoStudentsIfMissing();

  const cache = new InMemoryCacheService();
  const eventRepository = new MongoEventRepository();
  const llmClient = new GeminiLlmClient();
  const semanticParser = new SemanticParser(llmClient, cache);
  const availabilityService = new DefaultAvailabilityService();
  const locationService: LocationService = { resolveNearestLocation, locationScore };
  const userProfileService = new MongoUserProfileService();
  const idempotencyRunner = new MongoIdempotencyStore();
  const metrics = new InMemoryMetricsService();
  const scoringCollaborators: ScoringCollaborators = {
    activityScore: bestActivityScore,
    timeScore,
    locationScore: locationService.locationScore.bind(locationService),
  };

  await seedDemoEventsIfEmpty(eventRepository);

  const recommendationService = new DefaultRecommendationService(eventRepository, cache, scoringCollaborators, metrics);
  const matchingService = new DefaultMatchingService(
    eventRepository,
    semanticParser,
    availabilityService,
    userProfileService,
    idempotencyRunner,
    scoringCollaborators,
    metrics
  );

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, metrics: metrics.snapshot(), locationsLoaded: locations.length });
  });

  app.use("/api/auth", createAuthRouter());
  app.use("/api/onboarding", createOnboardingRouter());
  app.use("/api/profile", createProfileRouter());
  app.use("/api/recommend", createRecommendRouter({ recommendationService }));
  app.use("/api/match", createMatchRouter({ matchingService, userProfileService, idempotencyRunner }));
  app.use("/api/activities", createActivitiesRouter({ eventRepository, recommendationService }));
  app.use("/api/matches", createMatchesRouter());
  app.use("/api/chat", createChatRouter());
  app.use("/api/feedback", createFeedbackRouter());
  app.use("/api/connections", createConnectionsRouter());

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error("[api] request failed:", err instanceof Error ? err.message : "unknown error");
    res.status(500).json({ error: "internal server error" });
  });

  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on port ${port}`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[api] failed to start:", err);
  process.exit(1);
});

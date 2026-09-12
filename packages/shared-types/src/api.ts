// REST API contract shared by apps/api (implements these routes) and
// apps/web (calls them). This is the frozen boundary that lets backend and
// frontend agents build in parallel — treat it as load-bearing.

import type { Activity, ChatMessage, Interest, Match, Student, Vibe } from "./domain.js";

export interface StructuredIntentInput {
  activityIds: string[];
  /** Free text, e.g. "treadmill" or "work on my robotics project". */
  text?: string;
  /** Absolute ISO time, or a relative phrase like "in 30 minutes" — the
   * server resolves both deterministically, never via the LLM. */
  time?: string;
  locationIds: string[];
}

// POST /api/auth/demo-login
export interface DemoLoginRequest {
  name?: string;
}
export interface DemoLoginResponse {
  student: Student;
  sessionToken: string;
}

// POST /api/onboarding  (body merges into the caller's profile)
export interface OnboardingRequest {
  userId: string;
  interests: Interest[];
  vibes: Vibe[];
  availabilityLabel: string;
}
export type OnboardingResponse = Student;

// GET /api/profile/:id
export type ProfileResponse = Student;

// GET /api/activities/suggestions?userId=...
export interface SuggestionsResponse {
  activityIds: string[];
}

// POST /api/recommend  (real-time path, structured-only, no free text/LLM)
export interface RecommendRequest {
  activityIds: string[];
  locationIds: string[];
  time?: string;
}
export interface RecommendedCandidate {
  eventId: string;
  title: string;
  canonicalActivity: string;
  hostId: string;
  attendeeCount: number;
  capacity: number;
  approximateLocation: string;
  timeLabel: string;
  score: number;
}
export interface RecommendResponse {
  candidates: RecommendedCandidate[];
}

// POST /api/match  (core authoritative path)
export interface MatchRequest {
  userId: string;
  intent: StructuredIntentInput;
  idempotencyKey?: string;
  forceCreate?: boolean;
}
export interface MatchResponse {
  outcome: "MATCHED" | "PENDING";
  eventType?: "MATCHED_EXISTING" | "CREATED";
  eventId: string;
  /** Ranked candidate people for the Match Results screen — the top
   * candidate is the one actually joined/created; the rest are shown as
   * alternates with status "suggested". */
  matches: Match[];
}

// GET /api/activities  (Discover / trending)
export interface ActivitiesResponse {
  activities: Activity[];
}

export interface ActivityResponse {
  activity: Activity;
}

export interface JoinEventRequest {
  eventId: string;
}

export interface JoinEventResponse {
  status: "accepted" | "full" | "expired" | "not_found";
  activity?: Activity;
}

// POST /api/activities/:eventId/invite  (UI's "Invite" button — attempts to
// join that specific candidate's event through the same join path match()
// uses)
export interface InviteRequest {
  userId: string;
  matchId: string;
}
export interface InviteResponse {
  status: "accepted" | "full" | "expired";
  match: Match;
}

// GET /api/matches/:userId
export interface MatchesResponse {
  matches: Match[];
}

// GET /api/chat/:conversationId
export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

// POST /api/chat/:conversationId
export interface SendMessageRequest {
  senderId: string;
  text: string;
}
export type SendMessageResponse = ChatMessage;

// POST /api/feedback
export interface FeedbackRequest {
  eventId: string;
  matchId: string;
  userId: string;
  rating: "great" | "good" | "okay";
}
export type FeedbackResponse = { ok: true };

// GET /api/connections/:userId
export interface ConnectionsResponse {
  connections: Match[];
}

export interface DebugCollection {
  name: string;
  count: number;
  documents: Record<string, unknown>[];
}

export interface DebugDatabaseResponse {
  database: string;
  collections: DebugCollection[];
}

export interface Notification {
  id: string;
  type: "EVENT_JOINED";
  eventId: string;
  actorId: string;
  message: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
}

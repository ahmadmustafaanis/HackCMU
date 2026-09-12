// Internal types for the Activity Recommendation & Matching Algorithm.
// These are the "frozen contracts" every backend service is built against.
// Do not add matching/ranking/decision logic here — types only.

import type { Vibe } from "./domain.js";

/** The single normalized shape every matching operation reasons about,
 * regardless of whether it came from button taps or free text. */
export interface NormalizedIntent {
  title?: string;
  description?: string;
  capacity?: number;
  durationMinutes?: number;
  activityIds: string[];
  categoryIds: string[];
  tags: string[];
  startTime?: string; // ISO 8601
  endTime?: string; // ISO 8601
  locationIds: string[];
  sourceText?: string;
}

export type EventStatus = "OPEN" | "FULL" | "EXPIRED" | "COMPLETED" | "CANCELLED";

/** The backend's authoritative record for a joinable/creatable event.
 * This is the EventRepository's row shape (Mongo document minus the
 * driver-specific _id typing quirks). */
export interface EventRecord {
  id: string;
  title: string;
  canonicalActivity: string;
  category: string;
  tags: string[];
  description?: string;
  sourceText?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  durationMinutes: number;
  locationId: string;
  capacity: number;
  participantIds: string[];
  participantCount: number;
  isFull: boolean;
  hostId: string;
  vibe: Vibe;
  status: EventStatus;
  createdAt: string;
  expiresAt: string; // ISO 8601 — matching-close time
}

export interface ScoreBreakdown {
  activityScore: number;
  timeScore: number;
  locationScore: number;
  tagScore: number;
  eventQualityScore: number;
  total: number;
}

export interface ScoredCandidate {
  event: EventRecord;
  breakdown: ScoreBreakdown;
}

export type JoinFailureReason =
  | "NOT_FOUND"
  | "NOT_OPEN"
  | "EXPIRED"
  | "ALREADY_JOINED"
  | "FULL";

export type JoinResult =
  | { ok: true; event: EventRecord }
  | { ok: false; reason: JoinFailureReason };

export type MatchOutcome = "MATCHED" | "PENDING";

export interface MatchResult {
  outcome: MatchOutcome;
  event: EventRecord;
  score?: number;
  breakdown?: ScoreBreakdown;
}

/** Structured output of the semantic parser — either from the
 * deterministic synonym layer (confidence 1.0), the semantic cache, or a
 * single LLM call. Never produced by ranking/matching logic. */
export interface SemanticParseResult {
  canonicalActivity: string;
  category: string;
  tags: string[];
  confidence: number;
}

# apps/api/src/matching — Activity Recommendation & Matching Algorithm

## Core design invariant

```
Structured input           → never touches the LLM, ever.
Free text  → deterministic synonym lookup → semantic cache → LLM (only if both miss)
                                                                    │
                                                          merge → NormalizedIntent
                                                                    │
                                              Activity / Time / Location resolution
                                                                    │
                                    Candidate retrieval → Hard filter → Deterministic ranking
                                                                    │
                                                        MATCH (join)  or  NO MATCH (create)
```
Semantic intelligence (the LLM) should happen as rarely as possible.
Deterministic matching handles the high-frequency path.

## The LLM must NEVER

Rank or score candidates, compute distance, do time arithmetic, decide
capacity/expiration, perform authorization, join a user to an event, or
create an event. Its only job (`semantic/semanticParser.ts`) is turning free
text into `{ canonicalActivity, category, tags[], confidence }`.

## Real-time path boundary (recommendationService.ts)

`recommend()` may call `UserProfileService` (needed to build the intent,
never trust client-supplied profile fields) but must be structurally unable
to reach `SemanticParser`, `AvailabilityService.getNextAvailableSlot`, or any
`EventRepository` *write* method. It is read-only and LLM-free — this is
tested with an LLM client that throws if invoked at all.

## Interface map (all in `shared-types/src/services.ts`)

`SemanticParser` (semantic/), `AvailabilityService` (availability/),
`LocationService` (location/), `UserProfileService` (profile/),
`EventRepository` (repository/ — see its own `CLAUDE.md`), `CacheService`
(cache/), `MetricsService` (observability/), `RecommendationService` /
`MatchingService` (top-level orchestration).

## Config, not code

Taxonomy edges, synonyms, durations, scoring weights, match threshold, time
tolerance, location distance buckets — all in `../config/*.json`, loaded and
validated by `../config/index.ts`. Change a number there, not in scoring
logic.

## Logging

Never log raw free text or full profile records — cache keys and inputs are
hashed/truncated in any log line (`src/matching/observability/`).

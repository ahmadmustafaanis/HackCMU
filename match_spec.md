## User Intent & Activity Selection

The user expresses what they want to do rather than who they want to meet.

The interface provides:

* A free-text input for natural-language intent, e.g. `"Treadmill"`.
* A set of fast-select activity buttons such as **Workout**, **Running**, **Coding**, **Walk**, etc.
* Activity buttons personalized from the user's profile. For example, a user interested in sports, art, and coding may see **Workout**, **Running**, **Drawing**, or **Coding**.
* An optional time selector supporting relative and absolute times, such as **in 10 minutes**, **in 30 minutes**, or **7:00 AM tomorrow**.
* An optional multi-select location selector containing canonical CMU locations such as **CUC**, **Hunt Library**, and **Hamerschlag Hall**.
* When location permission is available, the user's current location is used to determine the default location. If unavailable, the user can manually select locations.

A completed request is called a **match intent**. It may contain free text, activity selections, time, and location.

---

## Two Algorithmic Paths

The system has two distinct algorithmic paths:

1. **Real-Time Recommendation Algorithm**

   * Triggered when structured activity buttons are toggled.
   * Provides immediate recommendations of existing activities.
   * Read-only and extremely fast.
   * Does not create or modify events.
   * Does not require an LLM.

2. **Core Matching Algorithm**

   * Triggered when the user explicitly submits their match intent.
   * Performs authoritative matching.
   * May parse ambiguous text, resolve time and location, retrieve candidates, rank them, and either join an existing event or create a new one.

The two paths must remain separate. Real-time recommendations are intended to encourage users to join existing activities instead of unnecessarily creating new ones.

---

# Core Matching Algorithm

### 1. Normalize the User's Intent

The system first combines all available information:

* Free-text input
* Selected activity buttons
* Selected time
* Selected locations
* Relevant profile information
* Current time
* Current location, when available

The resulting input is normalized into a structured representation containing canonical activities, categories, tags, time intervals, and canonical location IDs.

Conceptually:

```text
MatchIntent
    ↓
Normalize
    ↓
NormalizedIntent
```

The normalization layer should use deterministic logic whenever possible.

For example:

```text
"treadmill" → treadmill
"running on treadmill" → treadmill + running
"coding" → coding
```

Synonyms and known activity aliases should be resolved without an LLM.

---

### 2. Semantic Text Understanding

An LLM is used **only when necessary to understand ambiguous or previously unseen free-text intent**.

The LLM should convert natural language into structured information such as:

* Canonical activity
* Activity category
* Relevant tags
* Semantic confidence

For example:

```text
"Treadmill"
    ↓
activity: treadmill
category: fitness
tags: [running, cardio, workout]
```

The LLM must **not**:

* Rank candidate events
* Calculate distances
* Calculate time compatibility
* Check capacity
* Determine expiration
* Authorize users
* Decide whether an event can be joined
* Create database records directly

Those decisions remain deterministic.

---

### 3. Minimize LLM Calls

LLM usage should be aggressively minimized.

The preferred order is:

```text
Structured activity
      ↓
Deterministic normalization
      ↓
Synonym / canonical lookup
      ↓
Semantic cache
      ↓
LLM only if necessary
```

Therefore:

* Button-only requests → **0 LLM calls**
* Known activity/synonym → **0 LLM calls**
* Cached semantic interpretation → **0 LLM calls**
* New ambiguous text → normally **1 LLM call**

The semantic result should be cached using a normalized text key so repeated requests do not repeatedly invoke the LLM.

If the LLM is unavailable, the system should gracefully fall back to the structured activity selection and/or normalized raw text.

---

### 4. Resolve Time

If the user explicitly selects a time, that time takes priority.

The system should convert relative and absolute selections into deterministic time intervals.

Examples:

```text
"in 10 minutes"
→ current time + 10 minutes

"in 30 minutes"
→ current time + 30 minutes

"7 AM tomorrow"
→ explicit timestamp
```

If no time is provided, the matching system may request the user's next available time slot through an abstract **AvailabilityService**.

The AvailabilityService may use external sources such as Google Calendar and CMU SIO course information, but the matching algorithm itself should not directly depend on those integrations.

The service should return the next suitable available slot within the configured search window, such as 24 hours.

Default activity durations should be configurable, for example:

```text
Walk       → 30 minutes
Coffee     → 45 minutes
Workout    → 60 minutes
Coding     → 90 minutes
Basketball → 90 minutes
```

---

### 5. Resolve Location

Locations should use canonical CMU location IDs rather than relying on raw text.

If the user provides multiple locations, the request may match events compatible with any selected location.

If current GPS coordinates are available, they should be mapped to the nearest canonical CMU location using a static coordinate dataset or LocationService.

No external map API should be called during every match request.

If GPS is unavailable, manually selected locations remain valid.

---

### 6. Retrieve Candidate Events

The system searches for existing events that could accommodate the user.

Candidate retrieval must happen in the database/index layer rather than loading all events into application memory.

Only events satisfying hard constraints should enter the ranking stage.

Hard filters include:

* Event status is `OPEN`
* Event has not expired
* Event has available capacity
* Activity/category is compatible
* Time is compatible
* Location is compatible
* User is not already participating

Events that are clearly expired should be marked expired during maintenance/search processing rather than being considered valid candidates.

---

### 7. Deterministic Candidate Ranking

After hard filtering, candidates are ranked using deterministic scoring.

A configurable baseline score is:

```text
Score =
    0.40 × Activity Similarity
  + 0.25 × Time Compatibility
  + 0.20 × Location Compatibility
  + 0.10 × Tag Similarity
  + 0.05 × Event Quality
```

All components are normalized to `[0,1]`.

The weights must be configurable so the matching behavior can be tuned without redesigning the algorithm.

#### Activity Similarity

Activity relationships should come from the controlled activity taxonomy.

Example:

```text
treadmill → treadmill    = 1.0
treadmill → workout      ≈ 0.8
running  → treadmill     ≈ 0.7
unrelated activities     = 0.0
```

#### Time Compatibility

Time similarity is calculated from intervals, overlap, and configurable tolerances.

Events occurring at or near the user's requested time should score higher.

#### Location Compatibility

Location similarity can use canonical locations and geographic distance.

Example:

```text
Same location        = 1.0
Very nearby          = 0.9
Nearby               = 0.7
Same campus          = 0.5
Far away             = 0.0
```

Thresholds should be configurable.

#### Tag Similarity

Tags generated from the semantic normalization layer can be compared using deterministic weighted overlap/Jaccard-style similarity.

---

### 8. Match Threshold

The highest-ranked candidate is considered a valid match only if its score exceeds a configurable threshold.

Example:

```text
MATCH_THRESHOLD = 0.70
```

If:

```text
bestScore >= threshold
```

the user attempts to join the event.

If:

```text
bestScore < threshold
```

the system creates a new event.

The threshold must be configurable rather than hard-coded into business logic.

---

### 9. Transactional Event Joining

Joining an existing event must be atomic.

Immediately before joining, the system must re-check:

* Event is still `OPEN`
* Event has not expired
* Capacity remains available
* User is not already participating

This prevents race conditions where multiple users attempt to claim the final available slot simultaneously.

The join operation should occur inside a transaction or equivalent atomic mechanism.

The cache must never be treated as the source of truth for capacity or event state.

---

### 10. Duplicate Requests and Idempotency

Repeated submissions must not accidentally create duplicate participation records or duplicate events.

The system should support idempotent matching behavior where practical.

Examples:

```text
Same user submits the same request twice
→ do not create unnecessary duplicate events

Same user attempts to join the same event twice
→ reject/ignore duplicate participation
```

---

### 11. Creating a New Event

If no sufficiently compatible existing event is available, the system creates a new event.

The creator automatically becomes its first participant.

The event stores the normalized metadata required for future matching, including:

* Canonical activity
* Category
* Semantic tags
* Start/end time
* Canonical location(s)
* Creator
* Capacity
* Status
* Creation time
* Expiration information

The newly created event becomes available for other users to match against.

---

### 12. Event Lifecycle

Events have explicit lifecycle states.

Conceptually:

```text
OPEN
  ↓
ACTIVE
  ↓
COMPLETED
```

They may also transition:

```text
OPEN → CANCELLED
OPEN → EXPIRED
```

Expired events must never be returned as valid matches.

The system should prefer marking events as expired/cancelled rather than immediately hard-deleting them when historical information is useful.

---

### 13. Match Result Behavior

If the submitted user joins another user's existing event, the system returns an immediate successful match result.

If the user creates an event, the event is placed into the matching pool and the creator can receive a push notification when another participant joins, depending on the notification workflow.

If no immediate match occurs and the newly created event remains pending, the interface can display:

```text
Pending...
```

and direct the user back toward the home experience.

The algorithm itself should return a structured result indicating whether the request:

```text
MATCHED_EXISTING_EVENT
CREATED_EVENT
PENDING
```

rather than embedding UI behavior inside the matching service.

---

# Real-Time Recommendation Algorithm

The real-time recommendation path exists to provide immediate feedback while the user is selecting activities.

It is triggered when an activity button is toggled.

Because the input is structured, this path should require **zero LLM calls**.

Conceptually:

```text
Activity Buttons
      ↓
Structured Activity IDs
      ↓
Current Time / Selected Time
      ↓
Selected Location(s)
      ↓
Database Candidate Query
      ↓
Deterministic Ranking
      ↓
Top N Events
      ↓
Recommendation Cards
```

The algorithm queries existing open events and returns the top `N` compatible events.

These events are displayed directly below the activity-button section to encourage users to join an existing activity rather than creating a new one.

The recommendation path is **read-only**:

* No event creation
* No event joining
* No participation writes
* No LLM calls
* No calendar/SIO lookup
* No authoritative capacity decision

It should use the same deterministic compatibility concepts as the core matching algorithm but can use a lightweight ranking implementation optimized for latency.

Recommendations should be cacheable for a short period, such as 5–30 seconds, and time buckets can be used rather than exact timestamps to improve cache reuse.

Client-side requests should also be debounced and stale requests ignored/cancelled so rapid button changes do not create unnecessary database traffic.

---

# Personalized Activity Suggestions

The activity-button pool should be larger than the small set displayed to the user.

The visible activities should be selected based on profile relevance.

For example:

```text
Profile:
sports, art, coding

Possible suggestions:
Workout
Running
Basketball
Drawing
Photography
Coding
Robotics
```

This personalization should be deterministic and cacheable rather than requiring an LLM on every home-page load.

The recommendation system may use profile interests, recent activity behavior, and globally popular activities to determine which activities appear.

---

# Performance & Reliability

The system should optimize for the common case where structured intent can be processed without an LLM.

Target behavior:

```text
Real-time recommendations:
≈ 200 ms or better

Core matching without LLM:
≈ 500 ms or better

Cold semantic LLM request:
may be slower, but should occur only when necessary
```

Caching should be used for:

* Semantic parsing
* Real-time recommendations
* Personalized activity suggestions
* Other expensive deterministic lookups

Caches are optimization layers only and must never replace authoritative database state.

---

# Failure Handling

The algorithm must degrade gracefully.

### LLM unavailable

Use:

```text
selected activity
+ normalized raw text
+ deterministic synonym/category mapping
```

rather than failing the entire request.

### Availability service unavailable

Fall back to deterministic user-provided time or a configured default behavior.

### GPS unavailable

Use manually selected canonical locations.

### Event becomes unavailable during matching

Re-run candidate selection or return a deterministic pending/no-match result rather than joining an invalid event.

---

# Observability

The algorithm should expose enough information to measure and tune matching quality.

Important metrics include:

* Match-request latency
* Recommendation latency
* Candidate count
* Match score
* Match success rate
* Event creation rate
* Event join rate
* Recommendation cache hit rate
* Semantic cache hit rate
* LLM calls per match request
* LLM latency
* LLM failure rate
* Expired-event cleanup rate

A particularly important optimization metric is:

```text
LLM calls / total match requests
```

The goal is to drive this ratio as low as possible without reducing semantic understanding quality.

---

# Conceptual Algorithm Flow

```text
                 USER INTENT
                     │
          ┌──────────┴──────────┐
          │                     │
   Button Toggle          Explicit Submit
          │                     │
          ▼                     ▼
 REAL-TIME PATH           CORE MATCHING PATH
          │                     │
   Structured Input       Normalize Intent
          │                     │
          │              Deterministic Lookup
          │                     │
          │                Semantic Cache
          │                     │
          │               LLM if Necessary
          │                     │
          │              Resolve Time/Location
          │                     │
          ▼                     ▼
 Query Existing Events    Retrieve Candidates
          │                     │
 Deterministic Ranking    Hard Filtering
          │                     │
          ▼               Deterministic Ranking
       Top N                     │
          │                     ▼
          ▼                Score ≥ Threshold?
 Recommendation Cards       /           \
                           YES            NO
                            │              │
                            ▼              ▼
                     Join Existing     Create Event
                         Event             │
                            │              │
                            ▼              ▼
                         MATCHED        PENDING
```

The fundamental design rule is:

> **Use semantic intelligence as rarely as possible, and use deterministic, indexed, transactional logic for high-frequency matching decisions.**

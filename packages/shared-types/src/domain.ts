// User-facing domain types. These match the shapes the product spec gave
// verbatim — the frontend renders these directly, the backend maps its
// richer internal records (see matching.ts) down to these for API responses.

export type Interest =
  | "AI"
  | "Research"
  | "Music"
  | "Sports"
  | "Gaming"
  | "Art"
  | "Startups"
  | "Books"
  | "Food"
  | "Fitness"
  | "Movies"
  | "Photography"
  | "Travel"
  | "Coding"
  | "Coffee";

export type Vibe =
  | "Social"
  | "Curious"
  | "Focused"
  | "Chill"
  | "Networking"
  | "Casual";

export interface Student {
  id: string;
  name: string;
  initials: string;
  program: string;
  year: string;
  bio: string;
  interests: Interest[];
  vibes: Vibe[];
  preferredActivities: string[];
  approximateLocation: string;
  walkingMinutes: number;
  availabilityLabel: string;
}

export type MatchStatus = "suggested" | "invited" | "accepted" | "connected";

export interface Match {
  id: string;
  studentId: string;
  activityType: string;
  score: number;
  sharedInterests: Interest[];
  reasons: string[];
  status: MatchStatus;
}

export type ActivityStatus = "open" | "joined" | "completed";

export interface Activity {
  id: string;
  title: string;
  type: string;
  description: string;
  approximateLocation: string;
  timeLabel: string;
  walkingMinutes: number;
  attendees: string[];
  attendeeCount: number;
  capacity: number;
  hostId: string;
  vibe: Vibe;
  status: ActivityStatus;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestampLabel: string;
}

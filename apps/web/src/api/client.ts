import type {
  ActivitiesResponse,
  ChatHistoryResponse,
  ConnectionsResponse,
  DebugDatabaseResponse,
  DemoLoginRequest,
  DemoLoginResponse,
  FeedbackRequest,
  FeedbackResponse,
  InviteRequest,
  InviteResponse,
  JoinEventResponse,
  MatchRequest,
  MatchResponse,
  MatchesResponse,
  OnboardingRequest,
  OnboardingResponse,
  ProfileResponse,
  RecommendRequest,
  RecommendResponse,
  SendMessageRequest,
  SendMessageResponse,
  SuggestionsResponse,
  NotificationsResponse,
} from "shared-types";

const BASE = "/api";

// Set by state/session.tsx whenever the session changes (sign-in, sign-out,
// restore-from-storage) — this is the ONE place the current session token
// lives outside React state, so every request below can attach it without
// every page needing to thread it through manually.
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<TResponse>;
}

function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  return request<TRes>(path, { method: "POST", body: JSON.stringify(body) });
}

export const api = {
  demoLogin: (body: DemoLoginRequest) => post<DemoLoginRequest, DemoLoginResponse>("/auth/demo-login", body),
  googleLogin: (idToken: string) => post<{ idToken: string }, DemoLoginResponse>("/auth/google", { idToken }),
  auth0Login: (idToken: string) => post<{ idToken: string }, DemoLoginResponse>("/auth/auth0", { idToken }),
  /** Validates the current session token for real (not just "a value exists
   * in localStorage") and returns the current profile, or throws (401) if
   * the token is missing/invalid/expired. */
  getMe: () => request<ProfileResponse>("/auth/me"),
  onboard: (body: OnboardingRequest) => post<OnboardingRequest, OnboardingResponse>("/onboarding", body),
  getProfile: (id: string) => request<ProfileResponse>(`/profile/${id}`),
  getSuggestions: (userId: string) => request<SuggestionsResponse>(`/activities/suggestions?userId=${encodeURIComponent(userId)}`),
  recommend: (body: RecommendRequest) => post<RecommendRequest, RecommendResponse>("/recommend", body),
  match: (body: MatchRequest) => post<MatchRequest, MatchResponse>("/match", body),
  getActivities: () => request<ActivitiesResponse>("/activities"),
  getMyActivities: () => request<ActivitiesResponse>("/activities/mine"),
  joinEvent: (eventId: string) => post<{ eventId: string }, JoinEventResponse>(`/activities/${eventId}/join`, { eventId }),
  invite: (eventId: string, body: InviteRequest) => post<InviteRequest, InviteResponse>(`/activities/${eventId}/invite`, body),
  getMatches: (userId: string) => request<MatchesResponse>(`/matches/${userId}`),
  getChatHistory: (conversationId: string) => request<ChatHistoryResponse>(`/chat/${conversationId}`),
  sendMessage: (conversationId: string, body: SendMessageRequest) =>
    post<SendMessageRequest, SendMessageResponse>(`/chat/${conversationId}`, body),
  submitFeedback: (body: FeedbackRequest) => post<FeedbackRequest, FeedbackResponse>("/feedback", body),
  getConnections: (userId: string) => request<ConnectionsResponse>(`/connections/${userId}`),
  getDebugDatabase: () => request<DebugDatabaseResponse>("/debug/database"),
  getNotifications: () => request<NotificationsResponse>("/notifications"),
};

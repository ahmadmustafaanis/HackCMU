import type {
  ActivitiesResponse,
  ChatHistoryResponse,
  ConnectionsResponse,
  DemoLoginRequest,
  DemoLoginResponse,
  FeedbackRequest,
  FeedbackResponse,
  InviteRequest,
  InviteResponse,
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
} from "shared-types";

const BASE = "/api";

async function request<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
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
  onboard: (body: OnboardingRequest) => post<OnboardingRequest, OnboardingResponse>("/onboarding", body),
  getProfile: (id: string) => request<ProfileResponse>(`/profile/${id}`),
  getSuggestions: (userId: string) => request<SuggestionsResponse>(`/activities/suggestions?userId=${encodeURIComponent(userId)}`),
  recommend: (body: RecommendRequest) => post<RecommendRequest, RecommendResponse>("/recommend", body),
  match: (body: MatchRequest) => post<MatchRequest, MatchResponse>("/match", body),
  getActivities: () => request<ActivitiesResponse>("/activities"),
  invite: (eventId: string, body: InviteRequest) => post<InviteRequest, InviteResponse>(`/activities/${eventId}/invite`, body),
  getMatches: (userId: string) => request<MatchesResponse>(`/matches/${userId}`),
  getChatHistory: (conversationId: string) => request<ChatHistoryResponse>(`/chat/${conversationId}`),
  sendMessage: (conversationId: string, body: SendMessageRequest) =>
    post<SendMessageRequest, SendMessageResponse>(`/chat/${conversationId}`, body),
  submitFeedback: (body: FeedbackRequest) => post<FeedbackRequest, FeedbackResponse>("/feedback", body),
  getConnections: (userId: string) => request<ConnectionsResponse>(`/connections/${userId}`),
};

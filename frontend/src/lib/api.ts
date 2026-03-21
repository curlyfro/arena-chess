import axios from "axios";

export const AUTH_TOKEN_KEY = "chess-arena-token";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    return Promise.reject(error);
  },
);

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
}

export interface UserProfile {
  playerId: string;
  username: string;
  email: string;
  emailConfirmed: boolean;
}

export interface SubmitGameResponse {
  gameId: string;
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
  newTitle: string | null;
}

export interface PlayerProfile {
  id: string;
  username: string;
  title: string;
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    currentStreak: number;
    longestStreak: number;
  };
  createdAt: string;
  lastActiveAt: string;
}

export interface GameSummary {
  id: string;
  aiLevel: number;
  aiElo: number;
  timeControl: string;
  isRated: boolean;
  result: string;
  eloChange: number;
  playedAt: string;
}

export interface RatingHistoryEntry {
  timeControl: string;
  rating: number;
  ratingDeviation: number;
  recordedAt: string;
}

export const authApi = {
  register: (email: string, username: string, password: string) =>
    api.post<AuthResponse>("/auth/register", { email, username, password }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }),

  me: () => api.get<UserProfile>("/auth/me"),
};

export const gameApi = {
  submit: (data: {
    aiLevel: number;
    timeControl: string;
    isRated: boolean;
    result: string;
    termination: string;
    playerColor: string;
    pgn: string;
    accuracyPlayer: number;
    durationSeconds: number;
  }) => api.post<SubmitGameResponse>("/games", data),
};

export const playerApi = {
  getProfile: (id: string) => api.get<PlayerProfile>(`/players/${id}`),
  getGames: (id: string, page = 1, pageSize = 20) =>
    api.get<GameSummary[]>(`/players/${id}/games`, { params: { page, pageSize } }),
  getRatingHistory: (id: string, timeControl = "blitz", limit = 50) =>
    api.get<RatingHistoryEntry[]>(`/players/${id}/rating-history`, { params: { timeControl, limit } }),
};

export default api;

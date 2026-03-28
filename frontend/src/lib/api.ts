import axios from "axios";

export const AUTH_TOKEN_KEY = "chess-arena-token";
export const REFRESH_TOKEN_KEY = "chess-arena-refresh-token";

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

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (token) p.resolve(token);
    else p.reject(error);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!storedRefreshToken) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post<AuthResponse>("/auth/refresh", {
          refreshToken: storedRefreshToken,
        });

        localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        processQueue(null, data.accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = "/";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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

export type GameResultValue = "Win" | "Loss" | "Draw";

export interface GameSummary {
  id: string;
  aiLevel: number;
  aiElo: number;
  timeControl: string;
  isRated: boolean;
  result: GameResultValue;
  eloChange: number;
  playedAt: string;
}

export interface GameDetail {
  id: string;
  playerId: string;
  playerUsername: string;
  aiLevel: number;
  aiElo: number;
  timeControl: string;
  isRated: boolean;
  result: string;
  termination: string;
  playerColor: string;
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
  pgn: string;
  accuracyPlayer: number;
  durationSeconds: number;
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

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>("/auth/refresh", { refreshToken }),

  revoke: (refreshToken: string) =>
    api.post("/auth/revoke", { refreshToken }),

  me: () => api.get<UserProfile>("/auth/me"),
};

export const gameApi = {
  getDetail: (id: string) => api.get<GameDetail>(`/games/${id}`),

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

  updateAccuracy: (gameId: string, accuracyPlayer: number) =>
    api.patch(`/games/${gameId}/accuracy`, { accuracyPlayer }),
};

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const playerApi = {
  getProfile: (id: string) => api.get<PlayerProfile>(`/players/${id}`),
  getGames: (id: string, page = 1, pageSize = 20) =>
    api.get<PaginatedResponse<GameSummary>>(`/players/${id}/games`, { params: { page, pageSize } }),
  getRatingHistory: (id: string, timeControl = "blitz", limit = 50) =>
    api.get<RatingHistoryEntry[]>(`/players/${id}/rating-history`, { params: { timeControl, limit } }),
};

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  title: string;
  rating: number;
  gamesPlayed: number;
}

export const leaderboardApi = {
  getTop: (timeControl: string = "blitz") =>
    api.get<LeaderboardEntry[]>("/leaderboard", { params: { timeControl } }),
};

export default api;

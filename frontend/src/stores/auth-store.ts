import { create } from "zustand";
import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  authApi,
  playerApi,
  type UserProfile,
  type PlayerProfile,
} from "@/lib/api";

interface AuthState {
  user: UserProfile | null;
  playerProfile: PlayerProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/** Shared post-auth: set tokens, fetch user + profile */
async function hydrateSession(
  token: string,
  refreshToken: string,
  set: (state: Partial<AuthState>) => void,
) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  set({ token, isLoading: false });

  const { data: user } = await authApi.me();
  set({ user });

  try {
    const { data: profile } = await playerApi.getProfile(user.playerId);
    set({ playerProfile: profile });
  } catch {
    // Profile fetch is non-critical
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  playerProfile: null,
  token: localStorage.getItem(AUTH_TOKEN_KEY),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.login(email, password);
      await hydrateSession(data.accessToken, data.refreshToken, set);
      return true;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "Login failed";
      set({ error: message, isLoading: false });
      return false;
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.register(email, username, password);
      await hydrateSession(data.accessToken, data.refreshToken, set);
      return true;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { errors?: string[] } } }).response?.data
          ?.errors?.[0] ?? "Registration failed";
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      authApi.revoke(refreshToken).catch(() => {});
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ user: null, playerProfile: null, token: null, error: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!token || !refreshToken) return;

    try {
      await hydrateSession(token, refreshToken, set);
    } catch (err) {
      console.warn("Session hydration failed, clearing tokens:", err);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      set({ user: null, playerProfile: null, token: null });
    }
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    try {
      const { data: profile } = await playerApi.getProfile(user.playerId);
      set({ playerProfile: profile });
    } catch (err) {
      console.warn("Profile refresh failed:", err);
    }
  },
}));

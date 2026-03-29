import api from "./api";

export interface PreferencesResponse {
  data: Record<string, unknown> | null;
  version: number;
}

export const preferencesApi = {
  get: () => api.get<PreferencesResponse>("/preferences"),
  save: (data: Record<string, unknown>, version: number) =>
    api.put("/preferences", { data, version }),
};

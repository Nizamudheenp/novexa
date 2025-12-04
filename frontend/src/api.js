import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE?.trim() || "";
export const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

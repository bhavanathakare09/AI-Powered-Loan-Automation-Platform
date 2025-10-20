// src/services/auth.js

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

/** Save tokens to localStorage */
export function saveTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

/** Get tokens */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY) || "";
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY) || "";
}

/** Clear tokens and auth state */
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Is the user authenticated? (simple check) */
export function isAuthed() {
  return !!getAccessToken();
}

/** Helper to build Authorization header */
export function authHeader() {
  const t = getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
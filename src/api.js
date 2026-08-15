export const API_BASE = import.meta.env.VITE_API_BASE || "https://api.tsrp.online";

/**
 * Makes an authenticated request to the backend. Automatically attaches the
 * session token from localStorage (if present) and parses JSON responses.
 * Throws an Error with the backend's message on any non-2xx response.
 */
export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = localStorage.getItem("tsrp_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // A 401 on an authenticated request means the backend has decided this
    // session is no longer valid -- naturally expired, or (the reason this
    // exists) actively revoked server-side because the user was
    // terminated/demoted/blacklisted since they logged in. Handling this
    // once, here, instead of leaving every call site to notice a failed
    // request on its own is exactly what was missing before: a terminated
    // user's already-open tab kept working because nothing ever forced it
    // to stop. AuthContext listens for this event to clear the logged-in
    // user and show a clear message. See requireAuth in the backend's
    // routes/auth.js for the corresponding server-side check.
    if (auth && res.status === 401) {
      localStorage.removeItem("tsrp_token");
      window.dispatchEvent(new CustomEvent("tsrp:session-invalid", { detail: { message: data.error } }));
    }
    const error = new Error(data.error || `Request failed with status ${res.status}`);
    error.status = res.status;
    Object.assign(error, data);
    throw error;
  }

  return data;
}

export function loginUrl() {
  return `${API_BASE}/auth/login`;
}

const API_BASE = "https://api.tsrp.online";

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
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export function loginUrl() {
  return `${API_BASE}/auth/login`;
}

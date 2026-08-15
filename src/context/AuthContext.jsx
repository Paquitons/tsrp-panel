import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiFetch, loginUrl } from "../api";

const AuthContext = createContext(null);

// How often an open tab re-checks that its session is still valid, so a
// terminated/demoted/blacklisted user's already-open tab notices and gets
// logged out even if they never trigger another API call themselves.
// This is a courtesy for the idle case -- the actual enforcement is the
// backend rejecting every request with a revoked session regardless of
// this timer (see requireAuth in routes/auth.js and the 401 handling in
// api.js); this just makes an otherwise-quiet tab find out sooner.
const REVALIDATE_INTERVAL_MS = 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userRef = useRef(null);
  userRef.current = user;

  // Fires the moment ANY API call anywhere in the app gets back a 401 --
  // see api.js. This is the real enforcement path: whatever the user was
  // doing, the very next request they make (not just the periodic
  // recheck below) immediately logs them out server-side.
  useEffect(() => {
    function handleSessionInvalid(event) {
      if (!userRef.current) return; // wasn't logged in anyway -- nothing to do
      setUser(null);
      setError(event.detail?.message || "Your session has ended. Please log in again.");
    }
    window.addEventListener("tsrp:session-invalid", handleSessionInvalid);
    return () => window.removeEventListener("tsrp:session-invalid", handleSessionInvalid);
  }, []);

  // Idle-tab courtesy check: periodically (and whenever the tab regains
  // focus) re-hits /auth/me even if the user hasn't clicked anything. A
  // revoked session fails this the same way it'd fail any other request,
  // which triggers the 401 handler above.
  useEffect(() => {
    async function revalidate() {
      if (!userRef.current) return;
      try {
        await apiFetch("/auth/me");
      } catch {
        // api.js's 401 handler already cleared the token and dispatched
        // tsrp:session-invalid -- nothing else to do here.
      }
    }
    const interval = setInterval(revalidate, REVALIDATE_INTERVAL_MS);
    window.addEventListener("focus", revalidate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", revalidate);
    };
  }, []);

  useEffect(() => {
    (async () => {
      // If we just got redirected back from the backend's OAuth callback,
      // the session token (or an error code) is in the URL query string.
      const params = new URLSearchParams(window.location.search);
      const tokenFromUrl = params.get("token");
      const errorFromUrl = params.get("error");

      if (tokenFromUrl) {
        localStorage.setItem("tsrp_token", tokenFromUrl);
        // Clean the token out of the visible URL so it isn't left in
        // browser history or accidentally shared.
        window.history.replaceState({}, "", window.location.pathname);
      }

      if (errorFromUrl) {
        setError(describeError(errorFromUrl));
        window.history.replaceState({}, "", window.location.pathname);
      }

      const token = localStorage.getItem("tsrp_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user } = await apiFetch("/auth/me");
        setUser(user);
      } catch {
        localStorage.removeItem("tsrp_token");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function login() {
    window.location.href = loginUrl();
  }

  function logout() {
    localStorage.removeItem("tsrp_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function describeError(code) {
  switch (code) {
    case "not_in_server":
      return "You must be a member of the Texas State RP Discord server to use this panel.";
    case "not_staff":
      return "You must be on the staff team to access this panel.";
    case "blacklisted":
      return "Your access to this panel has been revoked.";
    case "token_exchange_failed":
    case "identify_failed":
    case "member_lookup_failed":
      return "Something went wrong verifying your Discord account. Please try again.";
    default:
      return "Login failed. Please try again.";
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

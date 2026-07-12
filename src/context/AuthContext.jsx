import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, loginUrl } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

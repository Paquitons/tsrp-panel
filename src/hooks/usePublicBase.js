import { useAuth } from "../context/AuthContext";

/**
 * Every public page can be reached two ways: directly (logged out, at its
 * normal path) or embedded inside the staff panel after a logged-in user
 * clicks "Back to Website" (see App.jsx's PUBLIC_PAGES, mounted a second
 * time under /site/*). Any link from one public page to another needs to
 * stay on whichever side it's currently rendered from -- this is the one
 * place that decides which, so pages don't each re-derive it.
 */
export function usePublicBase() {
  const { user } = useAuth();
  return user ? "/site" : "";
}

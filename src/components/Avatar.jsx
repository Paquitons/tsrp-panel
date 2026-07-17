import { useEffect, useState } from "react";
import { apiFetch } from "../api";

// Module-level cache shared across every Avatar instance for the lifetime of
// the page -- avoids re-fetching the same avatar repeatedly when it shows up
// in multiple lists (autocomplete, log cards, activity feed, etc).
const cache = new Map();

/**
 * Shows a Roblox avatar headshot resolved through our own backend (which
 * calls Roblox's thumbnail API server-side -- Roblox blocks direct browser
 * fetches with CORS, so this can't be done client-side). Falls back to a
 * colored initial-letter circle while loading, if there's no username, or
 * if resolution fails for any reason.
 */
export default function Avatar({ robloxId, username, size = 32 }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!robloxId && !username) {
      setFailed(true);
      return;
    }

    const cacheKey = robloxId ? `id:${robloxId}` : `name:${username.toLowerCase()}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (cached) setImageUrl(cached);
      else setFailed(true);
      return;
    }

    let cancelled = false;
    const query = robloxId ? `robloxId=${robloxId}` : `username=${encodeURIComponent(username)}`;

    apiFetch(`/avatar?${query}`)
      .then(({ imageUrl }) => {
        cache.set(cacheKey, imageUrl);
        if (!cancelled) setImageUrl(imageUrl);
      })
      .catch(() => {
        cache.set(cacheKey, null);
        if (!cancelled) setFailed(true);
      });

    return () => { cancelled = true; };
  }, [robloxId, username]);

  if (failed || !imageUrl) {
    const initial = (username || "?").charAt(0).toUpperCase();
    return (
      <div className="avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.45 }}>
        {initial}
      </div>
    );
  }

  return (
    <img
      className="avatar-img"
      style={{ width: size, height: size }}
      src={imageUrl}
      alt={username || "avatar"}
      onError={() => setFailed(true)}
    />
  );
}

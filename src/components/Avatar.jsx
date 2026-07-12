import { useState } from "react";

/**
 * Shows a Roblox avatar headshot when a robloxId is available, falling back
 * to a colored initial-letter circle if there's no ID or the image fails to
 * load. Using an <img> tag (not a fetch+JSON call) avoids any CORS concerns
 * since image rendering isn't subject to the same-origin restrictions that
 * script-based fetches are.
 */
export default function Avatar({ robloxId, username, size = 32 }) {
  const [failed, setFailed] = useState(false);

  if (!robloxId || failed) {
    const initial = (username || "?").charAt(0).toUpperCase();
    return (
      <div
        className="avatar-fallback"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      className="avatar-img"
      style={{ width: size, height: size }}
      src={`https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=150&height=150&format=png`}
      alt={username || "avatar"}
      onError={() => setFailed(true)}
    />
  );
}

import { useState } from "react";
import { discordAvatarUrl } from "../utils";

/**
 * Wraps a Discord avatar <img> with a fallback -- if the primary URL ever
 * fails to load (a stale cached hash after someone changes their avatar,
 * a CDN hiccup, etc), this falls back to Discord's default avatar instead
 * of leaving a broken image icon in the UI.
 *
 * Named distinctly from Avatar.jsx (which resolves ROBLOX avatars through
 * the backend's /avatar endpoint, a completely different thing with a
 * different prop shape) to avoid any collision between the two.
 */
export default function DiscordAvatar({ discordId, avatarHash, size = 32, className = "", style = {} }) {
  const [failed, setFailed] = useState(false);

  const src = failed
    ? discordAvatarUrl(discordId, null, size) // null hash -> falls through to the default avatar formula
    : discordAvatarUrl(discordId, avatarHash, size);

  return (
    <img
      className={`avatar-img ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
      src={src}
      alt=""
      onError={() => !failed && setFailed(true)}
    />
  );
}

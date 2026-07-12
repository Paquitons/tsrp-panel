export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "0h 0m";
  const safeSeconds = Math.max(0, seconds);
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Same as formatDuration but includes seconds, for the live-ticking active
 * shift timer specifically (history tables stay at minute granularity).
 */
export function formatDurationWithSeconds(seconds) {
  if (!Number.isFinite(seconds)) return "00:00:00";
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
}

/**
 * Builds a Discord CDN avatar URL from a user ID + avatar hash. Falls back
 * to Discord's default avatar if there's no hash (user never set one, or
 * we haven't seen them log in yet to capture it).
 */
export function discordAvatarUrl(discordId, avatarHash, size = 64) {
  if (discordId && avatarHash) {
    const ext = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}?size=${size}`;
  }
  // Discord's default avatar set (current formula: (id >> 22) % 6).
  const index = discordId ? Number((BigInt(discordId) >> 22n) % 6n) : 0;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export const TYPE_LABELS = {
  warning: "Warning",
  kick: "Kick",
  ban: "Ban",
  temp_ban: "Temp Ban",
  bolo: "Ban BOLO",
  note: "Note",
};

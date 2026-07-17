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
// Discord's CDN only accepts specific power-of-two sizes for avatar
// images -- any other value (e.g. 30, 24) gets rejected outright with a
// 400 error, not resized or clamped. This rounds UP to the nearest valid
// size, decoupled from whatever size the image is actually displayed at
// (which CSS width/height on the <img> already control independently) --
// also means a sharper source image on high-DPI screens as a side effect.
const VALID_CDN_SIZES = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
function nearestValidCdnSize(size) {
  return VALID_CDN_SIZES.find(v => v >= size) ?? 4096;
}

export function discordAvatarUrl(discordId, avatarHash, size = 64) {
  const cdnSize = nearestValidCdnSize(size);
  if (discordId && avatarHash) {
    const ext = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}?size=${cdnSize}`;
  }
  // Discord's default avatar set (current formula: (id >> 22) % 6).
  const index = discordId ? Number((BigInt(discordId) >> 22n) % 6n) : 0;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

/**
 * Converts a date-input value ("YYYY-MM-DD", from an <input type="date">)
 * into an epoch-ms timestamp representing LOCAL midnight of that date.
 *
 * This is NOT the same as `new Date(dateStr).getTime()` -- a date-only ISO
 * string with no time component is parsed by JS as UTC midnight, not local
 * midnight. In any timezone behind UTC (every US timezone), that shifts
 * the effective date back by one day the moment it's displayed or compared
 * against local time -- which is exactly the "always picks the day before"
 * bug this fixes.
 */
export function parseLocalDateInput(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
}

/**
 * Converts an epoch-ms timestamp into a date-input value ("YYYY-MM-DD")
 * using LOCAL date components -- NOT `.toISOString().slice(0, 10)`, which
 * reports the UTC date and has the same off-by-one risk in reverse.
 */
export function toDateInputValue(epochMs) {
  const d = new Date(epochMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Today's date as a date-input value, in the LOCAL timezone -- NOT
 * `new Date().toISOString().slice(0, 10)`, which reports the UTC date and
 * can show tomorrow's date as "today" late in the evening in timezones
 * behind UTC.
 */
export function todayLocalISO() {
  return toDateInputValue(Date.now());
}

export const TYPE_LABELS = {
  warning: "Warning",
  kick: "Kick",
  ban: "Ban",
  temp_ban: "Temp Ban",
  bolo: "Ban BOLO",
  note: "Note",
};

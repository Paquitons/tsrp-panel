/**
 * Formats a percent change (or any signed delta) for display, and
 * separately the CSS class that should color it. Kept as one function
 * pair so "no data yet" (null/undefined) can never accidentally render as
 * green -- `null >= 0` is true in JS, so any version of this that reused
 * the >= 0 check directly against a possibly-null value colored a missing
 * value as a gain.
 */
// Shared "chart range" options for every price-history chart (public
// StockDetail and the Super Admin stock detail page) -- one definition so
// the two stay in sync, ms-based since that's what both APIs' `since`
// query param expects. Default (5 hours) is the first entry so callers
// can do CHART_RANGE_OPTIONS[0].value for the initial useState.
export const CHART_RANGE_OPTIONS = [
  { value: String(5 * 60 * 60 * 1000), label: "5 hours" },
  { value: String(24 * 60 * 60 * 1000), label: "1 day" },
  { value: String(3 * 24 * 60 * 60 * 1000), label: "3 days" },
  { value: String(7 * 24 * 60 * 60 * 1000), label: "7 days" },
  { value: String(30 * 24 * 60 * 60 * 1000), label: "1 month" },
];

export function pctChange(n) {
  if (n === null || n === undefined) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function changeClass(n) {
  if (n === null || n === undefined) return "";
  return n >= 0 ? "positive" : "negative";
}

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

/**
 * Countdown label for something with a future expiry (strikes, AutoMod
 * offenses, IA cases) -- "expires in Xd Yh", "expires in Xh Ym", or
 * "expires in Xm", down to "expiring now" once past. Used to have three
 * independent copies (HrPanel.jsx, InternalAffairs.jsx,
 * HrAutomodOffenses.jsx) that had each drifted to a different granularity
 * and phrasing ("Xd Yh left" vs "expires in Xd Yh", one of them missing
 * minutes entirely) despite all labeling the same kind of value -- one
 * canonical version here instead.
 */
export function expiresLabel(expiresAt) {
  const msLeft = expiresAt - Date.now();
  if (msLeft <= 0) return "expiring now";
  const days = Math.floor(msLeft / (24 * 60 * 60 * 1000));
  const hours = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) return `expires in ${days}d ${hours}h`;
  if (hours > 0) return `expires in ${hours}h ${mins}m`;
  return `expires in ${mins}m`;
}

/**
 * Wall-clock time of day (e.g. "3:42 PM"), for the live activity feed --
 * lets staff cross-reference an event against the exact moment it
 * happened instead of doing relative-time math in their head.
 */
export function formatClockTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
  // Discord's default avatar set (current formula: (id >> 22) % 6). Wrapped
  // because BigInt() throws on anything that isn't a clean integer string --
  // a real Discord ID always is one, but a bad/synthetic ID (e.g. an
  // internal system wallet ID leaking into a list of real users) should
  // fall back to a placeholder avatar, not crash whatever rendered it.
  let index = 0;
  try {
    index = discordId ? Number((BigInt(discordId) >> 22n) % 6n) : 0;
  } catch {
    index = 0;
  }
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

/**
 * Converts an epoch-ms timestamp into a datetime-local input value
 * ("YYYY-MM-DDTHH:mm") using LOCAL components. Unlike the date-only
 * helpers above, a "T"-containing string is parsed by JS as local time
 * already (not UTC), so this doesn't need the same UTC-vs-local guard --
 * only the conversion TO the input's string format needs to be explicit.
 */
export function toDateTimeInputValue(epochMs) {
  const d = new Date(epochMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function parseDateTimeInput(value) {
  return new Date(value).getTime();
}

// Keys written by highrock-bot's dutyStatusMonitor.js -- kept as short
// machine keys in the DB so the copy shown here can change without a
// migration.
export const DUTY_FLAG_LABELS = {
  not_in_server: "Marked On Duty but not currently in the ERLC server",
  server_shutdown: "Marked On Duty while the server is Shutdown",
};

export function dutyFlagLabel(reason) {
  return DUTY_FLAG_LABELS[reason] ?? "Marked On Duty but flagged for review";
}

export const TYPE_LABELS = {
  warning: "Warning",
  kick: "Kick",
  ban: "Ban",
  temp_ban: "Temp Ban",
  bolo: "Ban BOLO",
  unban: "Unban",
  note: "Note",
};

import DiscordAvatar from "./DiscordAvatar";

/**
 * Plain-text version of the standard identity format, for contexts that
 * can't render JSX -- a `title` tooltip attribute, a native <option>
 * label, a window.confirm() dialog. Nickname first, then username, then
 * the Discord ID -- and the ID is NEVER the only thing shown if a name is
 * available at all, per the standing "never display a bare Discord ID"
 * requirement. Falls back to "Unknown Member" (still paired with the ID,
 * never just the ID alone) if literally nothing resolved.
 */
export function discordDisplayName(nickname, username, discordId) {
  const primary = nickname || username || "Unknown Member";
  const parts = [primary];
  if (nickname && username) parts.push(`@${username}`);
  if (discordId) parts.push(discordId);
  return parts.join(" · ");
}

/**
 * The standard Discord account display everywhere in the panel: nickname
 * primary, @username secondary, Discord ID last and de-emphasized --
 * never a bare ID as the headline. Two layouts:
 *
 *   variant="text" (default) -- a single inline line, for slotting into a
 *     stat tile or a sentence ("Opened By: <DiscordIdentity .../>").
 *   variant="row" -- avatar + stacked name/subtext, for list rows
 *     (top holders, log entries, search results).
 *
 * Pass the raw fields directly (nickname/username/discordId/avatarHash) --
 * callers already have these from attachStaffFields' `${prefix}_nickname`
 * etc, just spelled out explicitly here since prefixes aren't consistent
 * enough across tables (opener_discord_id, issuer_discord_id, claimed_by,
 * ...) to derive automatically.
 */
export default function DiscordIdentity({
  nickname, username, discordId, avatarHash,
  variant = "text", size = 22, showId = true, showAvatar = true, className = "",
}) {
  const primary = nickname || username || (discordId ? "Unknown Member" : "Unknown");
  const secondary = [];
  if (nickname && username) secondary.push(`@${username}`);
  if (showId && discordId) secondary.push(discordId);

  if (variant === "row") {
    return (
      <div className={`discord-identity-row ${className}`.trim()} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {showAvatar && discordId && <DiscordAvatar discordId={discordId} avatarHash={avatarHash} size={size} />}
        <div>
          <div>{primary}</div>
          {secondary.length > 0 && <div className="muted" style={{ fontSize: "var(--text-xs)" }}>{secondary.join(" · ")}</div>}
        </div>
      </div>
    );
  }

  return (
    <span className={className}>
      {showAvatar && discordId && (
        <DiscordAvatar discordId={discordId} avatarHash={avatarHash} size={size} style={{ verticalAlign: "middle", marginRight: 6 }} />
      )}
      {primary}
      {secondary.length > 0 && <span className="muted"> ({secondary.join(" · ")})</span>}
    </span>
  );
}

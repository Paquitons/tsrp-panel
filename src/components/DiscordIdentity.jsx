import DiscordAvatar from "./DiscordAvatar";

/**
 * Plain-text version of the standard identity format, for contexts that
 * can't render JSX -- a `title` tooltip attribute, a native <option>
 * label, a window.confirm() dialog. Nickname first, then username, then
 * the Discord ID -- and the ID is NEVER the only thing shown if a name is
 * available at all, per the standing "never display a bare Discord ID"
 * requirement. Falls back to "Unknown Member" (still paired with the ID,
 * never just the ID alone) if literally nothing resolved -- or to whatever
 * `fallback` a caller passes, when it knows something truer about WHY the
 * name is missing than the generic default can say.
 */
export function discordDisplayName(nickname, username, discordId, fallback = "Unknown Member") {
  const primary = nickname || username || fallback;
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
 *
 * `fallback` is the label shown when neither a nickname nor a username
 * resolved. The default says the only thing this component can know on its
 * own. A caller that knows more -- that the lookup itself failed, say,
 * rather than the person being unidentifiable -- should pass the accurate
 * wording instead, because "Unknown Member" reads as a statement about the
 * person when it is really a statement about the lookup.
 */
export default function DiscordIdentity({
  nickname, username, discordId, avatarHash,
  variant = "text", size = 22, showId = true, showAvatar = true, className = "",
  onPrimaryClick, primaryClassName = "", fallback = "Unknown Member",
}) {
  const primary = nickname || username || (discordId ? fallback : "Unknown");
  const secondary = [];
  if (nickname && username) secondary.push(`@${username}`);
  if (showId && discordId) secondary.push(discordId);

  if (variant === "row") {
    return (
      <div className={`discord-identity-row ${className}`.trim()}>
        {showAvatar && discordId && <DiscordAvatar discordId={discordId} avatarHash={avatarHash} size={size} />}
        <div className="discord-identity-text">
          <div
            className={`discord-identity-name ${primaryClassName}`.trim()}
            style={onPrimaryClick ? { cursor: "pointer" } : undefined}
            onClick={onPrimaryClick}
          >
            {primary}
          </div>
          {secondary.length > 0 && <div className="discord-identity-sub muted">{secondary.join(" · ")}</div>}
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

import { useStaffSearch } from "../hooks/useStaffSearch";
import PortalDropdown from "./PortalDropdown";
import DiscordAvatar from "./DiscordAvatar";

/**
 * The standard "find a Discord account" control -- search by username or
 * nickname and pick from real matches, instead of requiring staff to
 * already have a Discord ID copied somewhere. Originally built inline in
 * Verification.jsx; extracted here so every feature that needs to target
 * an account (Economy Control, business ownership, reputation lookup,
 * etc.) uses the exact same search/select behavior.
 *
 * `endpoint` controls which pool it searches:
 *   - "/members/search" (default) -- any server member, staff or not.
 *   - "/staff/search" -- staff only.
 *   - "/verification/members" -- same as the default, just under the
 *     Management-gated verification route (used by Verification.jsx itself).
 *
 * A pasted Discord ID still works (the backend falls back to a direct
 * lookup), so this is a strict superset of the old raw-ID input, not a
 * removal of that capability.
 */
export default function AccountPicker({
  endpoint = "/members/search",
  responseKey = "members",
  placeholder = "Search by username, nickname, or Discord ID",
  onSelect,
  className = "",
}) {
  const search = useStaffSearch(endpoint, responseKey);

  function pick(member) {
    search.pick(member);
    onSelect(member);
  }

  return (
    <div className={`autocomplete-wrap ${className}`.trim()}>
      <input
        ref={search.inputRef}
        autoComplete="off"
        value={search.query}
        onChange={e => search.onQueryChange(e.target.value)}
        onFocus={() => search.suggestions.length > 0 && search.setShowSuggestions(true)}
        placeholder={placeholder}
      />
      <PortalDropdown anchorRef={search.inputRef} open={search.showSuggestions} onClose={() => search.setShowSuggestions(false)} className="autocomplete-list-portal">
        {search.suggestions.map(s => (
          <div key={s.discordId} className="autocomplete-item" onClick={() => pick(s)}>
            <DiscordAvatar discordId={s.discordId} avatarHash={s.avatarHash} size={26} />
            <span className="autocomplete-name">{s.nickname ?? s.username}</span>
            {s.nickname && <span className="autocomplete-hint">@{s.username}</span>}
          </div>
        ))}
      </PortalDropdown>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { formatClockTime } from "../utils";
import PortalDropdown from "./PortalDropdown";

// Colored dot per event type -- no glyph/emoji, just a simple indicator.
const TYPE_META = {
  join:      { color: "#69f0ae" },
  leave:     { color: "#8a8f99" },
  kill:      { color: "#e53935" },
  command:   { color: "#64b5f6" },
  modcall:   { color: "#f9a825" },
  emergency: { color: "#ff6f60" },
};

const FILTER_GROUPS = [
  { key: "kill", label: "Kill Logs", types: ["kill"] },
  { key: "joinleave", label: "Join & Leave Logs", types: ["join", "leave"] },
  { key: "command", label: "Command Logs", types: ["command"] },
  { key: "modcall", label: "Mod Call Logs", types: ["modcall"] },
  { key: "emergency", label: "Emergency Calls", types: ["emergency"] },
];

// System/automated accounts and unset callers should never be clickable,
// and a missing caller should read as "Server" rather than the literal
// string "null".
function displayName(name) {
  return name ?? "Server";
}
function isClickable(name) {
  return !!name && name !== "Remote Server";
}

function describeEvent(e) {
  switch (e.type) {
    case "join": return `${displayName(e.player)} joined the game`;
    case "leave": return `${displayName(e.player)} left the server`;
    case "kill": return `${displayName(e.killer)} killed ${displayName(e.killed)}`;
    case "command": return `${displayName(e.player)} ran the command ${e.command}`;
    case "modcall": return `${displayName(e.caller)} called for a moderator`;
    case "emergency": return `${e.team} call from ${displayName(e.caller)}${e.description ? `: ${e.description}` : ""}`;
    default: return "Unknown event";
  }
}

export default function ActivityModal({ onClose, onUserClick }) {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState(new Set(FILTER_GROUPS.map(g => g.key)));
  const [filterOpen, setFilterOpen] = useState(false);
  const filterTriggerRef = useRef(null);

  async function fetchActivity() {
    try {
      const { events } = await apiFetch("/activity");
      setEvents(events);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 3_000);
    return () => clearInterval(interval);
  }, []);

  function toggleFilter(key) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const allowedTypes = new Set(
    FILTER_GROUPS.filter(g => activeFilters.has(g.key)).flatMap(g => g.types)
  );

  const filtered = events
    .filter(e => allowedTypes.has(e.type))
    .filter(e => {
      if (!search) return true;
      const haystack = describeEvent(e).toLowerCase();
      return haystack.includes(search.toLowerCase());
    });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal activity-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title-row">
          <h2>What's Happening In-Game?</h2>
          <button className="secondary small" onClick={onClose}>Close</button>
        </div>

        <div className="activity-modal-toolbar">
          <input placeholder="Search players, commands, etc." value={search} onChange={e => setSearch(e.target.value)} />
          <button ref={filterTriggerRef} className="activity-filter-trigger" onClick={() => setFilterOpen(o => !o)}>Filters</button>
          <PortalDropdown anchorRef={filterTriggerRef} open={filterOpen} onClose={() => setFilterOpen(false)} align="right" className="activity-filter-dropdown-portal">
            <div className="modal-subheading" style={{ margin: "4px 4px 8px" }}>Log Type</div>
            {FILTER_GROUPS.map(g => (
              <label key={g.key} className="activity-filter-option">
                <input type="checkbox" checked={activeFilters.has(g.key)} onChange={() => toggleFilter(g.key)} />
                {g.label}
              </label>
            ))}
          </PortalDropdown>
        </div>

        <div className="activity-modal-feed">
          {filtered.length === 0 ? (
            <p className="muted">No matching activity.</p>
          ) : (
            filtered.map((e, i) => {
              const meta = TYPE_META[e.type] ?? { color: "#8a8f99" };
              const rawName = e.player || e.killer || e.caller || null;
              const clickable = isClickable(rawName);
              return (
                <div className="activity-modal-item" key={i}>
                  <span className="activity-dot" style={{ background: meta.color }} />
                  <span
                    className={clickable ? "activity-text activity-text-clickable" : "activity-text"}
                    onClick={() => clickable && onUserClick?.(rawName)}
                  >
                    {describeEvent(e)}
                  </span>
                  <span className="activity-time muted">{formatClockTime(e.timestamp * 1000)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

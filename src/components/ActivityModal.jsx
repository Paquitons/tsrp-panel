import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { timeAgo } from "../utils";

const TYPE_META = {
  join:      { icon: "→", color: "#69f0ae", label: "Join & Leave" },
  leave:     { icon: "←", color: "#8a8f99", label: "Join & Leave" },
  kill:      { icon: "✕", color: "#e53935", label: "Kill Logs" },
  command:   { icon: "›", color: "#64b5f6", label: "Command Logs" },
  modcall:   { icon: "!", color: "#f9a825", label: "Mod Call Logs" },
  emergency: { icon: "!", color: "#ff6f60", label: "Emergency Calls" },
};

const FILTER_GROUPS = [
  { key: "kill", label: "Kill Logs", types: ["kill"] },
  { key: "joinleave", label: "Join & Leave Logs", types: ["join", "leave"] },
  { key: "command", label: "Command Logs", types: ["command"] },
  { key: "modcall", label: "Mod Call Logs", types: ["modcall"] },
  { key: "emergency", label: "Emergency Calls", types: ["emergency"] },
];

function describeEvent(e) {
  switch (e.type) {
    case "join": return `${e.player} joined the game`;
    case "leave": return `${e.player} left the server`;
    case "kill": return `${e.killer} killed ${e.killed}`;
    case "command": return `${e.player} ran the command ${e.command}`;
    case "modcall": return `${e.caller} called for a moderator`;
    case "emergency": return `${e.team} call from ${e.caller}${e.description ? `: ${e.description}` : ""}`;
    default: return "Unknown event";
  }
}

export default function ActivityModal({ onClose, onUserClick }) {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState(new Set(FILTER_GROUPS.map(g => g.key)));
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function fetchActivity() {
    try {
      const { events } = await apiFetch("/activity");
      setEvents(events);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 15_000);
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
          <button className="secondary small" onClick={onClose}>✕</button>
        </div>

        <div className="activity-modal-toolbar">
          <input placeholder="Search players, commands, etc." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="activity-filter-wrap" ref={filterRef}>
            <button className="activity-filter-trigger" onClick={() => setFilterOpen(o => !o)}>⚙</button>
            {filterOpen && (
              <div className="activity-filter-dropdown">
                <div className="modal-subheading" style={{ margin: "4px 4px 8px" }}>Log Type</div>
                {FILTER_GROUPS.map(g => (
                  <label key={g.key} className="activity-filter-option">
                    <input type="checkbox" checked={activeFilters.has(g.key)} onChange={() => toggleFilter(g.key)} />
                    {g.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="activity-modal-feed">
          {filtered.length === 0 ? (
            <p className="muted">No matching activity.</p>
          ) : (
            filtered.map((e, i) => {
              const meta = TYPE_META[e.type] ?? { icon: "•", color: "#8a8f99" };
              const clickableName = e.player || e.killer || e.caller || null;
              return (
                <div className="activity-modal-item" key={i}>
                  <span className="activity-icon-bubble" style={{ background: `${meta.color}22`, color: meta.color }}>{meta.icon}</span>
                  <span
                    className={clickableName ? "activity-text activity-text-clickable" : "activity-text"}
                    onClick={() => clickableName && onUserClick?.(clickableName)}
                  >
                    {describeEvent(e)}
                  </span>
                  <span className="activity-time muted">{timeAgo(e.timestamp * 1000)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

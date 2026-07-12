import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";

const POLL_MS = 15_000;

const TYPE_META = {
  join:      { icon: "→", label: "Joined",    color: "#69f0ae" },
  leave:     { icon: "←", label: "Left",      color: "#8a8f99" },
  kill:      { icon: "✕", label: "Kill",      color: "#e53935" },
  command:   { icon: "›", label: "Command",   color: "#64b5f6" },
  modcall:   { icon: "!", label: "Mod Call",  color: "#f9a825" },
  emergency: { icon: "!", label: "Emergency", color: "#ff6f60" },
};

function describeEvent(e) {
  switch (e.type) {
    case "join": return `${e.player} joined the server`;
    case "leave": return `${e.player} left the server`;
    case "kill": return `${e.killer} killed ${e.killed}`;
    case "command": return `${e.player} ran ${e.command}`;
    case "modcall": return `Mod call from ${e.caller}`;
    case "emergency": return `${e.team} call from ${e.caller}${e.description ? ` — ${e.description}` : ""}`;
    default: return "Unknown event";
  }
}

export default function Activity() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  async function fetchActivity() {
    try {
      const { events } = await apiFetch("/activity");
      setEvents(events);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActivity();
    intervalRef.current = setInterval(() => {
      if (!paused) fetchActivity();
    }, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [paused]);

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter);

  return (
    <div className="content">
      <div className="page-header">
        <h1>Live Activity</h1>
        <p className="muted">Real-time join, leave, kill, command, and mod call events. Updates every 15 seconds.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="activity-toolbar">
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ marginBottom: 0, width: "auto" }}>
            <option value="all">All events</option>
            <option value="join">Joins</option>
            <option value="leave">Leaves</option>
            <option value="kill">Kills</option>
            <option value="command">Commands</option>
            <option value="modcall">Mod Calls</option>
            <option value="emergency">Emergency Calls</option>
          </select>
          <button className="secondary small" onClick={() => setPaused(p => !p)}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button className="secondary small" onClick={fetchActivity}>Refresh Now</button>
        </div>

        {loading ? (
          <p className="muted">Loading activity…</p>
        ) : filtered.length === 0 ? (
          <p className="muted">No recent activity.</p>
        ) : (
          <div className="activity-feed">
            {filtered.map((e, i) => {
              const meta = TYPE_META[e.type] ?? { icon: "•", label: e.type, color: "#8a8f99" };
              return (
                <div className="activity-row" key={i}>
                  <span className="activity-icon" style={{ color: meta.color }}>{meta.icon}</span>
                  <span className="activity-text">{describeEvent(e)}</span>
                  <span className="activity-time muted">{new Date(e.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

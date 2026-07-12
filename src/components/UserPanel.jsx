import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { timeAgo } from "../utils";
import Avatar from "./Avatar";
import LogCard from "./LogCard";

function describeActivity(a) {
  switch (a.type) {
    case "join": return "Joined the game";
    case "leave": return "Left the game";
    case "kill": return `Killed ${a.detail}`;
    case "death": return `Killed by ${a.detail}`;
    case "command": return `Ran the command ${a.detail}`;
    case "modcall": return "Called for a moderator";
    case "emergency": return `Emergency call: ${a.detail}`;
    default: return "Activity";
  }
}

function Section({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="up-section">
      <button className="up-section-header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span className={`up-chevron ${open ? "up-chevron-open" : ""}`}>⌄</span>
      </button>
      {open && <div className="up-section-body">{children}</div>}
    </div>
  );
}

export default function UserPanel({ username, discordId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const path = discordId ? `/players/by-discord/${discordId}` : `/players/${encodeURIComponent(username)}`;
      const result = await apiFetch(path);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [username, discordId]);

  return (
    <div className="user-panel">
      <div className="user-panel-header">
        <button className="secondary small" onClick={onClose}>← Back</button>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <div className="error-banner">{error}</div>}

      {data && (
        <>
          <div className="user-panel-identity">
            <Avatar username={data.username} robloxId={data.robloxId} size={56} />
            <div>
              <div className="log-card-username" style={{ fontSize: 17 }}>{data.username}</div>
              <div className="muted">{data.robloxId ? `ID: ${data.robloxId}` : "Roblox ID unknown"}</div>
            </div>
          </div>

          <div className="user-panel-badges">
            <span className="badge" style={{ background: data.inServer ? "#14251a" : "#1e212b", color: data.inServer ? "#69f0ae" : "#8a8f99" }}>
              {data.inServer ? "In Server" : "Not In Server"}
            </span>
            {data.staffRole && <span className="badge" style={{ background: "#12202e", color: "#64b5f6" }}>{data.staffRole}</span>}
            {data.inQueue && <span className="badge" style={{ background: "#2e2712", color: "#f9a825" }}>In Queue</span>}
          </div>

          {data.joinedAt && (
            <p className="muted" style={{ marginTop: -6 }}>Joined server {timeAgo(data.joinedAt * 1000)}.</p>
          )}

          {data.player && (
            <div className="user-panel-stats">
              <div><span className="muted">Team</span><div>{data.player.Team}</div></div>
              <div><span className="muted">Permission</span><div>{data.player.Permission}</div></div>
              <div><span className="muted">Wanted</span><div>{"★".repeat(data.player.WantedStars ?? 0) || "N/A"}</div></div>
            </div>
          )}

          <Section title={`Punishment Logs (${data.punishmentLogs.length})`} defaultOpen>
            {data.punishmentLogs.length === 0 ? (
              <p className="muted">No logs found.</p>
            ) : (
              <div className="log-card-list">
                {data.punishmentLogs.map(log => (
                  <LogCard key={log.id} log={log} onChanged={load} />
                ))}
              </div>
            )}
          </Section>

          <Section title={data.vehicles?.length ? `Vehicles (${data.vehicles.length})` : "No Vehicle"}>
            {data.vehicles?.length > 0 ? (
              data.vehicles.map((v, i) => <div key={i} className="up-field">{v.Name}{v.Texture && v.Texture !== "Standard" ? ` (${v.Texture})` : ""}</div>)
            ) : (
              <p className="muted">This player has no vehicle spawned.</p>
            )}
          </Section>

          <Section title="Last Known Location">
            {data.location ? (
              <div className="up-field">{data.location.StreetName ?? "Unknown street"}{data.location.PostalCode ? ` (Postal ${data.location.PostalCode})` : ""}</div>
            ) : (
              <p className="muted">No location data available.</p>
            )}
          </Section>

          <Section title="Discord Account">
            {data.discordIds?.length > 0 ? (
              data.discordIds.map(id => <div key={id} className="up-field"><code>{id}</code></div>)
            ) : (
              <p className="muted">No linked Discord account found.</p>
            )}
          </Section>

          <Section title="Discord Roles">
            {data.discordRoles?.length > 0 ? (
              <div className="up-role-list">
                {data.discordRoles.map(role => <span key={role} className="badge" style={{ background: "#1e212b", color: "#d0d3d9" }}>{role}</span>)}
              </div>
            ) : (
              <p className="muted">No roles found (or account isn't linked).</p>
            )}
          </Section>

          <Section title="Recent Activity">
            {data.activity?.length > 0 ? (
              <div className="activity-feed">
                {data.activity.map((a, i) => (
                  <div className="activity-row" key={i}>
                    <span className="activity-text">{describeActivity(a)}</span>
                    <span className="activity-time muted">{timeAgo(a.timestamp * 1000)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No recent activity found.</p>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

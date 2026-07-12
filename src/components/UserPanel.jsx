import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { timeAgo } from "../utils";
import Avatar from "./Avatar";
import LogCard from "./LogCard";

export default function UserPanel({ username, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch(`/players/${encodeURIComponent(username)}`);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [username]);

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
              <div><span className="muted">Wanted</span><div>{"★".repeat(data.player.WantedStars ?? 0) || "—"}</div></div>
            </div>
          )}

          {data.discordIds?.length > 0 && (
            <div className="user-panel-field">
              <span className="muted">Discord Account:</span>{" "}
              {data.discordIds.map(id => <code key={id}>{id}</code>)}
            </div>
          )}

          {data.vehicles?.length > 0 && (
            <div className="user-panel-field">
              <span className="muted">Vehicle:</span> {data.vehicles[0].Name}
            </div>
          )}

          <h2 style={{ fontSize: 14, marginTop: 18 }}>{data.username}'s Logs ({data.punishmentLogs.length})</h2>
          {data.punishmentLogs.length === 0 ? (
            <p className="muted">No logs found.</p>
          ) : (
            <div className="log-card-list">
              {data.punishmentLogs.map(log => (
                <LogCard key={log.id} log={log} onChanged={load} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

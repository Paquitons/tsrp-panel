import { useState } from "react";
import { apiFetch } from "../api";

export default function PlayerLookup() {
  const [username, setUsername] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function search(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await apiFetch(`/players/${encodeURIComponent(username)}`);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content">
      <h1>Player Lookup</h1>

      <div className="card">
        <form onSubmit={search} style={{ display: "flex", gap: 8 }}>
          <input placeholder="Roblox username" value={username} onChange={e => setUsername(e.target.value)} style={{ marginBottom: 0 }} />
          <button className="primary" type="submit" disabled={loading}>{loading ? "Searching..." : "Search"}</button>
        </form>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {data && (
        <>
          <div className="card">
            <h2>{data.username}</h2>
            <p className="muted">Roblox ID: {data.robloxId ?? "Unknown"}</p>
            <p>
              {data.inServer ? <span className="badge" style={{ background: "#1f3a24", color: "#69f0ae" }}>In Server</span> : <span className="badge" style={{ background: "#2a2e39", color: "#9aa0ac" }}>Not In Server</span>}
              {data.staffRole && <span className="badge" style={{ background: "#1f2a3a", color: "#64b5f6", marginLeft: 8 }}>{data.staffRole}</span>}
              {data.inQueue && <span className="badge" style={{ background: "#4a3f1a", color: "#f9a825", marginLeft: 8 }}>In Queue</span>}
            </p>
            {data.player && (
              <table>
                <tbody>
                  <tr><th>Team</th><td>{data.player.Team}</td></tr>
                  {data.player.Callsign && <tr><th>Callsign</th><td>{data.player.Callsign}</td></tr>}
                  <tr><th>Permission</th><td>{data.player.Permission}</td></tr>
                  <tr><th>Wanted Stars</th><td>{data.player.WantedStars ?? 0}</td></tr>
                  {data.player.Location && (
                    <tr><th>Location</th><td>{data.player.Location.StreetName} (Postal {data.player.Location.PostalCode})</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {data.vehicles?.length > 0 && (
            <Section title="Spawned Vehicles">
              {data.vehicles.map((v, i) => <div key={i}>{v.Name}{v.Texture !== "Standard" ? ` (${v.Texture})` : ""}</div>)}
            </Section>
          )}

          {data.punishmentLogs?.length > 0 && (
            <div className="card">
              <h2>Punishment History ({data.punishmentLogs.length})</h2>
              <table>
                <thead><tr><th>Type</th><th>Reason</th><th>Date</th></tr></thead>
                <tbody>
                  {data.punishmentLogs.map(log => (
                    <tr key={log.id}>
                      <td><span className={`badge ${log.type}`}>{log.type.replace("_", " ")}</span></td>
                      <td>{log.reason}</td>
                      <td>{new Date(log.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.joinLogs?.length > 0 && (
            <Section title="Recent Join/Leave">
              {data.joinLogs.map((j, i) => <div key={i}>{j.Join ? "Joined" : "Left"} — {new Date(j.Timestamp * 1000).toLocaleString()}</div>)}
            </Section>
          )}

          {data.kills?.length > 0 && (
            <Section title="Recent Kills">
              {data.kills.map((k, i) => <div key={i}>Killed {k.Killed.split(":")[0]} — {new Date(k.Timestamp * 1000).toLocaleString()}</div>)}
            </Section>
          )}

          {data.deaths?.length > 0 && (
            <Section title="Recent Deaths">
              {data.deaths.map((k, i) => <div key={i}>Killed by {k.Killer.split(":")[0]} — {new Date(k.Timestamp * 1000).toLocaleString()}</div>)}
            </Section>
          )}

          {data.commandLogs?.length > 0 && (
            <Section title="Recent Commands">
              {data.commandLogs.map((c, i) => <div key={i}><code>{c.Command}</code> — {new Date(c.Timestamp * 1000).toLocaleString()}</div>)}
            </Section>
          )}

          {data.modCalls?.length > 0 && (
            <Section title="Recent Mod Calls">
              {data.modCalls.map((m, i) => <div key={i}>{new Date((m.Timestamp ?? Date.now() / 1000) * 1000).toLocaleString()}</div>)}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="muted">{children}</div>
    </div>
  );
}

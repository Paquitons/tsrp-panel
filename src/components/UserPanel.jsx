import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { timeAgo, TYPE_LABELS } from "../utils";
import Avatar from "./Avatar";

const ALL_TYPES = [
  { value: "warning", label: "Warning" },
  { value: "kick", label: "Kick" },
  { value: "ban", label: "Ban" },
  { value: "temp_ban", label: "Temp Ban" },
  { value: "bolo", label: "Ban BOLO" },
  { value: "note", label: "Note" },
];

export default function UserPanel({ username, onClose }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const allowedTypes = ALL_TYPES.filter(t => (user?.allowedPunishmentTypes ?? ["bolo"]).includes(t.value));
  const [type, setType] = useState(allowedTypes[0]?.value ?? "bolo");
  const [reason, setReason] = useState("");
  const [unbanAt, setUnbanAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState(null);

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

  async function createLog(e) {
    e.preventDefault();
    setCreating(true);
    setCreateStatus(null);
    try {
      const body = { targetRobloxUsername: username, type, reason, targetRobloxId: data?.robloxId ?? undefined };
      if (type === "temp_ban") {
        if (!unbanAt) throw new Error("An unban date is required for temp bans.");
        body.unbanAt = new Date(unbanAt).getTime();
      }
      await apiFetch("/punishments", { method: "POST", body });
      setCreateStatus({ ok: true, message: "Log created." });
      setReason("");
      load();
    } catch (err) {
      setCreateStatus({ ok: false, message: err.message });
    } finally {
      setCreating(false);
    }
  }

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

          <div className="card" style={{ margin: "16px 0" }}>
            <h2>Log This User</h2>
            {createStatus && <div className={createStatus.ok ? "success-banner" : "error-banner"}>{createStatus.message}</div>}
            <form onSubmit={createLog}>
              <select value={type} onChange={e => setType(e.target.value)}>
                {allowedTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {type === "temp_ban" && (
                <input type="datetime-local" required value={unbanAt} onChange={e => setUnbanAt(e.target.value)} />
              )}
              <input required value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason" />
              <button className="primary" type="submit" disabled={creating}>{creating ? "…" : "Create"}</button>
            </form>
          </div>

          <h2 style={{ fontSize: 14 }}>{data.username}'s Logs</h2>
          {data.punishmentLogs.length === 0 ? (
            <p className="muted">No logs found.</p>
          ) : (
            <div className="log-card-list">
              {data.punishmentLogs.map(log => (
                <div className="log-card" key={log.id}>
                  <div className="log-card-top">
                    <span className={`badge ${log.type}`}>{TYPE_LABELS[log.type]}</span>
                    <span className="muted" style={{ marginLeft: "auto" }}>{timeAgo(log.created_at)}</span>
                  </div>
                  <div className="log-card-body">
                    <div className="log-card-field">{log.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

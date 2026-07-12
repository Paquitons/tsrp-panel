import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { timeAgo, TYPE_LABELS } from "../utils";
import Avatar from "./Avatar";

export default function UserPanel({ username, onClose }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyLogId, setBusyLogId] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editReason, setEditReason] = useState("");
  const [editDescription, setEditDescription] = useState("");

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

  function canModify(log) {
    return log.issuer_discord_id === user?.discordId || user?.tier === "management" || user?.tier === "director";
  }

  async function deleteLog(id) {
    if (!confirm("Delete this log permanently? This cannot be undone.")) return;
    setBusyLogId(id);
    try {
      await apiFetch(`/punishments/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyLogId(null);
    }
  }

  function startEdit(log) {
    setEditingLogId(log.id);
    setEditReason(log.reason);
    setEditDescription(log.description ?? "");
  }

  async function saveEdit(id) {
    setBusyLogId(id);
    try {
      await apiFetch(`/punishments/${id}`, { method: "PATCH", body: { reason: editReason, description: editDescription || undefined } });
      setEditingLogId(null);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyLogId(null);
    }
  }

  async function completeBolo(id) {
    setBusyLogId(id);
    try {
      await apiFetch(`/punishments/${id}/complete`, { method: "PATCH" });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyLogId(null);
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
                <div className="log-card" key={log.id}>
                  <div className="log-card-top">
                    <span className={`badge ${log.type}`}>{TYPE_LABELS[log.type]}</span>
                    <span className="muted" style={{ marginLeft: "auto" }}>{timeAgo(log.created_at)}</span>
                  </div>

                  {editingLogId === log.id ? (
                    <div className="log-card-body">
                      <input value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Reason" style={{ marginBottom: 8 }} />
                      <textarea rows={2} value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Description (optional)" />
                      <div className="button-row">
                        <button className="primary small" disabled={busyLogId === log.id} onClick={() => saveEdit(log.id)}>Save</button>
                        <button className="secondary small" onClick={() => setEditingLogId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="log-card-body">
                      <div className="log-card-field">{log.reason}</div>
                      {log.description && <div className="log-card-field muted">{log.description}</div>}
                      {log.type === "bolo" && (
                        log.completed_at
                          ? <div className="log-card-field" style={{ color: "#69f0ae" }}>✓ Completed {timeAgo(log.completed_at)}</div>
                          : <button className="secondary small" disabled={busyLogId === log.id} onClick={() => completeBolo(log.id)} style={{ marginTop: 4 }}>Mark BOLO Completed</button>
                      )}
                    </div>
                  )}

                  {canModify(log) && editingLogId !== log.id && (
                    <div className="log-card-footer" style={{ gap: 6 }}>
                      <button className="secondary small" onClick={() => startEdit(log)}>Edit</button>
                      <button className="danger small" disabled={busyLogId === log.id} onClick={() => deleteLog(log.id)}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

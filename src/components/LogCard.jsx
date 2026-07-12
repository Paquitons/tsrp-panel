import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { timeAgo, TYPE_LABELS } from "../utils";
import Avatar from "./Avatar";

/**
 * Renders a single punishment log with a Melonly-style three-dot menu
 * (Edit / Delete / Complete for BOLOs) instead of always-visible buttons,
 * and highlights uncompleted Ban BOLOs distinctly (matches "Active Ban
 * BOLO" styling from the reference screenshots). Shared across the
 * Dashboard, standalone Punishments page, and UserPanel so all three stay
 * visually and behaviorally consistent.
 */
export default function LogCard({ log, onChanged, onUsernameClick }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editReason, setEditReason] = useState(log.reason);
  const [editDescription, setEditDescription] = useState(log.description ?? "");
  const [busy, setBusy] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const canModify = log.issuer_discord_id === user?.discordId || user?.tier === "management" || user?.tier === "director";
  const isActiveBolo = log.type === "bolo" && !log.completed_at;

  async function handleDelete() {
    setMenuOpen(false);
    if (!confirm("Delete this log permanently? This cannot be undone.")) return;
    setBusy(true);
    try {
      await apiFetch(`/punishments/${log.id}`, { method: "DELETE" });
      onChanged?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    setBusy(true);
    try {
      await apiFetch(`/punishments/${log.id}`, { method: "PATCH", body: { reason: editReason, description: editDescription || undefined } });
      setEditing(false);
      onChanged?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setMenuOpen(false);
    setBusy(true);
    try {
      await apiFetch(`/punishments/${log.id}/complete`, { method: "PATCH" });
      onChanged?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`log-card ${log.hidden ? "log-card-hidden" : ""} ${isActiveBolo ? "log-card-active-bolo" : ""}`}>
      <div className="log-card-top">
        <Avatar username={log.target_roblox_username} robloxId={log.target_roblox_id} size={32} />
        <div
          className="log-card-identity"
          style={onUsernameClick ? { cursor: "pointer" } : undefined}
          onClick={() => onUsernameClick?.(log.target_roblox_username)}
        >
          <div className="log-card-username">{log.target_roblox_username}</div>
          <div className="muted">{timeAgo(log.created_at)}</div>
        </div>

        {isActiveBolo ? (
          <span className="active-bolo-label">Active Ban BOLO</span>
        ) : (
          <span className={`badge ${log.type}`}>{TYPE_LABELS[log.type]}</span>
        )}

        <div className="log-card-menu" ref={menuRef}>
          <button className="log-card-menu-trigger" onClick={() => setMenuOpen(o => !o)} disabled={busy}>⋮</button>
          {menuOpen && (
            <div className="log-card-dropdown">
              {canModify && (
                <button onClick={() => { setEditing(true); setMenuOpen(false); }}>✎ Edit</button>
              )}
              {log.type === "bolo" && !log.completed_at && (
                <button onClick={handleComplete} className="dropdown-item-accent">🔨 Complete (Ban User)</button>
              )}
              {canModify && (
                <button onClick={handleDelete} className="dropdown-item-danger">🗑 Delete</button>
              )}
              {!canModify && log.type !== "bolo" && (
                <span className="dropdown-empty">No actions available</span>
              )}
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div className="log-card-body">
          <input value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Reason" style={{ marginBottom: 8 }} />
          <textarea rows={2} value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Description (optional)" />
          <div className="button-row">
            <button className="primary small" disabled={busy} onClick={handleSaveEdit}>Save</button>
            <button className="secondary small" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="log-card-body">
          <div className="log-card-field"><span className="muted">Reason:</span> {log.reason}</div>
          {log.description && <div className="log-card-field muted">{log.description}</div>}
          {log.previous_count !== undefined && <div className="log-card-field"><span className="muted">Previous:</span> {log.previous_count}</div>}
          {log.completed_at && (
            <div className="log-card-completed">
              <span className="muted">Completed by</span> <code>{log.completed_by}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

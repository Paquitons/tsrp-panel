import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { timeAgo, TYPE_LABELS, discordAvatarUrl } from "../utils";
import Avatar from "./Avatar";

/**
 * Renders a single punishment log matching the reference layout: the
 * enforcing staff member's Discord identity at the top, then the type,
 * then who got punished (User:), Roblox Player ID, Reason, Previous
 * Punishments, and a timestamp at the bottom. A three-dot menu replaces
 * always-visible action buttons. Shared across the Dashboard, standalone
 * Punishment Search page, and User Panel.
 */
export default function LogCard({ log, onChanged, onUsernameClick }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editReason, setEditReason] = useState(log.reason);
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
      await apiFetch(`/punishments/${log.id}`, { method: "PATCH", body: { reason: editReason } });
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
    <div className={`log-card ${isActiveBolo ? "log-card-active-bolo" : ""}`}>
      <div className="log-card-issuer-row">
        <img
          className="avatar-img"
          style={{ width: 28, height: 28 }}
          src={discordAvatarUrl(log.issuer_discord_id, log.issuer_avatar_hash)}
          alt=""
        />
        <span className="log-card-issuer-name">{log.issuer_username ?? log.issuer_discord_id}</span>

        <div className="log-card-menu" ref={menuRef}>
          <button className="log-card-menu-trigger" onClick={() => setMenuOpen(o => !o)} disabled={busy}>⋮</button>
          {menuOpen && (
            <div className="log-card-dropdown">
              {canModify && <button onClick={() => { setEditing(true); setMenuOpen(false); }}>✎ Edit</button>}
              {log.type === "bolo" && !log.completed_at && (
                <button onClick={handleComplete} className="dropdown-item-accent">🔨 Complete (Ban User)</button>
              )}
              {canModify && <button onClick={handleDelete} className="dropdown-item-danger">🗑 Delete</button>}
              {!canModify && log.type !== "bolo" && <span className="dropdown-empty">No actions available</span>}
            </div>
          )}
        </div>
      </div>

      {isActiveBolo ? (
        <div className="active-bolo-label">Active Ban BOLO</div>
      ) : (
        <div className="log-card-type">{TYPE_LABELS[log.type]}</div>
      )}

      {editing ? (
        <div className="log-card-body">
          <input value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Reason" />
          <div className="button-row">
            <button className="primary small" disabled={busy} onClick={handleSaveEdit}>Save</button>
            <button className="secondary small" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="log-card-body">
          <div className="log-card-field">
            <span className="muted">User:</span>{" "}
            <span
              className="log-card-target"
              style={onUsernameClick ? { cursor: "pointer" } : undefined}
              onClick={() => onUsernameClick?.(log.target_roblox_username)}
            >
              <Avatar username={log.target_roblox_username} robloxId={log.target_roblox_id} size={18} />
              {log.target_roblox_username}
            </span>
          </div>
          {log.target_roblox_id && (
            <div className="log-card-field"><span className="muted">Roblox Player ID:</span> {log.target_roblox_id}</div>
          )}
          <div className="log-card-field"><span className="muted">Reason:</span> {log.reason}</div>
          {log.previous_count !== undefined && (
            <div className="log-card-field"><span className="muted">Previous Punishments:</span> {log.previous_count}</div>
          )}
          {log.completed_at && (
            <div className="log-card-completed">
              <span className="muted">Completed by</span>{" "}
              <img className="avatar-img" style={{ width: 16, height: 16, verticalAlign: "middle" }} src={discordAvatarUrl(log.completed_by, log.completed_by_avatar_hash)} alt="" />{" "}
              {log.completed_by_username ?? log.completed_by}
            </div>
          )}
          <div className="log-card-timestamp muted">Created {timeAgo(log.created_at)}</div>
        </div>
      )}
    </div>
  );
}

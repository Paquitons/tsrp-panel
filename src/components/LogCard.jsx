import { useRef, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { timeAgo, TYPE_LABELS, discordAvatarUrl } from "../utils";
import Avatar from "./Avatar";
import CustomSelect from "./CustomSelect";
import PortalDropdown from "./PortalDropdown";

const ALL_TYPES = [
  { value: "warning", label: "Warning" },
  { value: "kick", label: "Kick" },
  { value: "ban", label: "Ban" },
  { value: "temp_ban", label: "Temp Ban" },
  { value: "bolo", label: "Ban BOLO" },
  { value: "note", label: "Note" },
];

// System/automated accounts that should never be treated as clickable
// players -- clicking them would try (and fail) to open a real profile.
const NON_CLICKABLE_NAMES = ["Remote Server"];

function isClickableName(name) {
  return !!name && !NON_CLICKABLE_NAMES.includes(name);
}

/**
 * Renders a single punishment log matching the reference layout: the
 * enforcing staff member's Discord identity at the top, then the type,
 * then who got punished (User:), Roblox Player ID, Reason, Previous
 * Punishments, and a timestamp at the bottom. A three-dot menu (rendered
 * via a portal so it can never get clipped by a scrolling ancestor)
 * replaces always-visible action buttons.
 */
export default function LogCard({ log, onChanged, onUsernameClick, onIssuerClick }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editReason, setEditReason] = useState(log.reason);
  const [editType, setEditType] = useState(log.type);
  const [busy, setBusy] = useState(false);
  const menuTriggerRef = useRef(null);

  const canModify = log.issuer_discord_id === user?.discordId || user?.tier === "management" || user?.tier === "director";
  const editableTypes = ALL_TYPES.filter(t =>
    (user?.allowedPunishmentTypes ?? ["bolo"]).includes(t.value) || t.value === log.type
  );
  const isActiveBolo = log.type === "bolo" && !log.completed_at;
  const issuerClickable = isClickableName(log.issuer_username) && !!onIssuerClick;
  const targetClickable = isClickableName(log.target_roblox_username) && !!onUsernameClick;

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
      await apiFetch(`/punishments/${log.id}`, { method: "PATCH", body: { reason: editReason, type: editType } });
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
    <div className={`log-card ${isActiveBolo ? "bolo-active" : ""}`}>
      <div className="log-card-issuer-row">
        <img
          className="avatar-img"
          style={{ width: 28, height: 28 }}
          src={discordAvatarUrl(log.issuer_discord_id, log.issuer_avatar_hash)}
          alt=""
        />
        <span
          className={issuerClickable ? "log-card-issuer-name log-card-clickable-name" : "log-card-issuer-name"}
          style={issuerClickable ? { cursor: "pointer" } : undefined}
          onClick={() => issuerClickable && onIssuerClick(log.issuer_discord_id)}
        >
          {log.issuer_username ?? log.issuer_discord_id}
        </span>

        <div className="log-card-menu">
          <button ref={menuTriggerRef} className="log-card-menu-trigger" onClick={() => setMenuOpen(o => !o)} disabled={busy}>⋮</button>
          <PortalDropdown anchorRef={menuTriggerRef} open={menuOpen} onClose={() => setMenuOpen(false)} align="right" className="log-card-dropdown-portal">
            {canModify && <button onClick={() => { setEditing(true); setMenuOpen(false); }}>Edit</button>}
            {log.type === "bolo" && !log.completed_at && (
              <button onClick={handleComplete} className="dropdown-item-accent">Complete (Ban User)</button>
            )}
            {canModify && <button onClick={handleDelete} className="dropdown-item-danger">Delete</button>}
            {!canModify && log.type !== "bolo" && <span className="dropdown-empty">No actions available</span>}
          </PortalDropdown>
        </div>
      </div>

      {isActiveBolo ? (
        <div className="active-bolo-label">Active Ban BOLO</div>
      ) : (
        <div className="log-card-type">{TYPE_LABELS[log.type]}</div>
      )}

      {editing ? (
        <div className="log-card-body">
          <CustomSelect value={editType} onChange={setEditType} options={editableTypes} />
          <input value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Reason" style={{ marginTop: 8 }} />
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
              className={targetClickable ? "log-card-target log-card-clickable-name" : "log-card-target"}
              style={targetClickable ? { cursor: "pointer" } : undefined}
              onClick={() => targetClickable && onUsernameClick(log.target_roblox_username)}
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

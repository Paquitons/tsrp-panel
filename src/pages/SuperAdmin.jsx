import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { useStaffSearch } from "../hooks/useStaffSearch";
import DiscordAvatar from "../components/DiscordAvatar";
import PortalDropdown from "../components/PortalDropdown";
import { formatDuration, toDateTimeInputValue, parseDateTimeInput } from "../utils";

/**
 * Unrestricted shift editing for one hardcoded Super Admin account --
 * server-side enforcement (requireSuperAdmin in routes/auth.js) is the
 * real gate; user?.isSuperAdmin here is just so this page doesn't render
 * for anyone else. No plausibility checks on the values entered: this is
 * deliberately able to set a shift to a nonsense duration for testing.
 */
export default function SuperAdmin() {
  const { user } = useAuth();
  const search = useStaffSearch();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadShifts(discordId) {
    setLoading(true);
    setError(null);
    try {
      const { shifts } = await apiFetch(`/super-admin/shifts/${discordId}`);
      setShifts(shifts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (search.target) loadShifts(search.target.discordId);
    else setShifts([]);
  }, [search.target?.discordId]);

  const [newStart, setNewStart] = useState(() => toDateTimeInputValue(Date.now()));
  const [newEnd, setNewEnd] = useState("");
  const [newBreakMinutes, setNewBreakMinutes] = useState(0);
  const [newType, setNewType] = useState("");
  const [creating, setCreating] = useState(false);

  async function createShift(e) {
    e.preventDefault();
    if (!search.target) return;
    setCreating(true);
    setError(null);
    try {
      await apiFetch("/super-admin/shifts", {
        method: "POST",
        body: {
          discordId: search.target.discordId,
          startedAt: parseDateTimeInput(newStart),
          endedAt: newEnd ? parseDateTimeInput(newEnd) : undefined,
          breakSeconds: Math.round(Number(newBreakMinutes || 0) * 60),
          shiftType: newType || undefined,
        },
      });
      setNewEnd("");
      setNewType("");
      await loadShifts(search.target.discordId);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function saveShift(shiftId, updates) {
    setError(null);
    try {
      await apiFetch(`/super-admin/shifts/${shiftId}`, { method: "PATCH", body: updates });
      await loadShifts(search.target.discordId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteShift(shift) {
    if (!confirm(`Delete this shift record (started ${new Date(shift.started_at).toLocaleString()})? This cannot be undone.`)) return;
    setError(null);
    try {
      await apiFetch(`/super-admin/shifts/${shift.id}`, { method: "DELETE" });
      await loadShifts(search.target.discordId);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user?.isSuperAdmin) {
    return (
      <div className="content">
        <div className="page-header"><h1>Super Admin</h1></div>
        <div className="error-banner">This page isn't available to your account.</div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-header">
        <h1>Super Admin</h1>
        <p className="muted">Unrestricted shift editing for testing and administration. Changes here bypass all normal validation.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>Pick a Staff Member</h2>
        <div className="autocomplete-wrap">
          <input
            ref={search.inputRef}
            autoComplete="off"
            value={search.query}
            onChange={e => search.onQueryChange(e.target.value)}
            onFocus={() => search.suggestions.length > 0 && search.setShowSuggestions(true)}
            placeholder="Search by username or nickname"
          />
          <PortalDropdown anchorRef={search.inputRef} open={search.showSuggestions} onClose={() => search.setShowSuggestions(false)} className="autocomplete-list-portal">
            {search.suggestions.map(s => (
              <div key={s.discordId} className="autocomplete-item" onClick={() => search.pick(s)}>
                <DiscordAvatar discordId={s.discordId} avatarHash={s.avatarHash} size={26} />
                <span className="autocomplete-name">{s.nickname ?? s.username}</span>
              </div>
            ))}
          </PortalDropdown>
        </div>
      </div>

      {search.target && (
        <>
          <div className="card">
            <h2>Create Shift for {search.target.nickname ?? search.target.username}</h2>
            <form onSubmit={createShift}>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label>Started</label>
                  <input type="datetime-local" required value={newStart} onChange={e => setNewStart(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Ended (blank = active)</label>
                  <input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label>Break (minutes)</label>
                  <input type="number" min="0" value={newBreakMinutes} onChange={e => setNewBreakMinutes(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Shift Type</label>
                  <input value={newType} onChange={e => setNewType(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <button className="primary" type="submit" disabled={creating}>{creating ? "Creating…" : "Create Shift"}</button>
            </form>
          </div>

          <div className="card">
            <h2>Shifts ({shifts.length})</h2>
            {loading && <p className="muted">Loading…</p>}
            {!loading && shifts.length === 0 && <p className="muted">No shifts found.</p>}
            <div className="log-card-list">
              {shifts.map(s => (
                <SuperAdminShiftRow key={s.id} shift={s} onSave={updates => saveShift(s.id, updates)} onDelete={() => deleteShift(s)} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SuperAdminShiftRow({ shift, onSave, onDelete }) {
  const [startedAt, setStartedAt] = useState(toDateTimeInputValue(shift.started_at));
  const [active, setActive] = useState(shift.ended_at === null);
  const [endedAt, setEndedAt] = useState(toDateTimeInputValue(shift.ended_at ?? Date.now()));
  const [breakMinutes, setBreakMinutes] = useState(Math.round((shift.break_seconds ?? 0) / 60));
  const [shiftType, setShiftType] = useState(shift.shift_type ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave({
        startedAt: parseDateTimeInput(startedAt),
        endedAt: active ? null : parseDateTimeInput(endedAt),
        breakSeconds: Math.round(Number(breakMinutes || 0) * 60),
        shiftType: shiftType || null,
      });
    } finally {
      setSaving(false);
    }
  }

  const endPoint = active ? Date.now() : parseDateTimeInput(endedAt);
  const durationSeconds = Math.max(0, Math.floor((endPoint - parseDateTimeInput(startedAt)) / 1000) - Math.round(Number(breakMinutes || 0) * 60));

  return (
    <div className="log-card">
      <div className="log-card-issuer-row">
        <span className={`badge ${active ? "loa-status-approved" : ""}`}>{active ? "Active" : "Completed"}</span>
        <span className="muted" style={{ marginLeft: "auto" }}>{formatDuration(durationSeconds)}</span>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <label>Started</label>
          <input type="datetime-local" value={startedAt} onChange={e => setStartedAt(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Ended</label>
          <input type="datetime-local" value={endedAt} disabled={active} onChange={e => setEndedAt(e.target.value)} />
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, textTransform: "none", fontWeight: 500 }}>
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Currently active (no end time)
      </label>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label>Break (minutes)</label>
          <input type="number" min="0" value={breakMinutes} onChange={e => setBreakMinutes(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Type</label>
          <input value={shiftType} onChange={e => setShiftType(e.target.value)} />
        </div>
      </div>
      <div className="button-row">
        <button className="primary small" type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button className="btn-red small" type="button" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

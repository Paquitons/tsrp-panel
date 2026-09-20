import { useEffect, useState } from "react";
import Skeleton from "../components/primitives/Skeleton";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { useStaffSearch } from "../hooks/useStaffSearch";
import DiscordAvatar from "../components/DiscordAvatar";
import DiscordIdentity from "../components/DiscordIdentity";
import AccountPicker from "../components/AccountPicker";
import PortalDropdown from "../components/PortalDropdown";
import Tabs from "../components/Tabs";
import { formatDuration, toDateTimeInputValue, parseDateTimeInput, scrollPageToTop } from "../utils";
import BotSettings from "./BotSettings";
import DiscordModSecurity from "./DiscordModSecurity";

// Fifteen screens, in four families rather than one bar.
//
// They used to be a single flat row that overflowed its container at
// every width, so reaching Insurance meant scrolling a tab strip and
// reading fifteen labels to find it. Nothing about the screens changed;
// only how you get to them. The families are the real ones: money that
// people hold and spend, the market that prices it, staff records, and
// the bot's own configuration.
//
// `group` is the top level, `sections` the tabs inside it, and the value
// of a section is the same key the body below already switches on, so
// this is a regrouping of the existing routing rather than a new one.
const TAB_GROUPS = [
  {
    value: "staff",
    label: "Staff",
    sections: [
      { value: "shifts", label: "Shift Editor" },
    ],
  },
  {
    value: "system",
    label: "System",
    sections: [
      { value: "botsettings", label: "Bot Settings" },
      { value: "modsecurity", label: "Discord Mod Security" },
    ],
  },
];

// Which family a given screen belongs to, derived rather than written
// twice, so a section moved between groups cannot end up listed in one
// and resolved to the other.
const GROUP_OF = Object.fromEntries(
  TAB_GROUPS.flatMap(g => g.sections.map(s => [s.value, g.value])),
);

/**
 * Unrestricted shift editing for one hardcoded Super Admin account --
 * server-side enforcement (requireSuperAdmin in routes/auth.js) is the
 * real gate; user?.isSuperAdmin here is just so this page doesn't render
 * for anyone else. No plausibility checks on the values entered: this is
 * deliberately able to set a shift to a nonsense duration for testing.
 */
export default function SuperAdmin() {
  const { user } = useAuth();
  // `tab` stays the single source of truth for which screen is showing,
  // exactly as before; the group is derived from it. Keeping one piece of
  // state rather than two means the two bars cannot disagree about where
  // you are.
  const [tab, setTab] = useState("shifts");
  const group = GROUP_OF[tab] ?? TAB_GROUPS[0].value;
  const sections = TAB_GROUPS.find(g => g.value === group)?.sections ?? [];

  // Switching family lands on that family's first screen.
  function pickGroup(next) {
    const first = TAB_GROUPS.find(g => g.value === next)?.sections[0]?.value;
    if (first) pickScreen(first);
  }

  function pickScreen(next) {
    setTab(next);
    scrollPageToTop();
  }
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
        },
      });
      setNewEnd("");
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
        <Banner>This page isn't available to your account.</Banner>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-header">
        <h1>Super Admin</h1>
        <p className="muted">Unrestricted testing and administration tools. Changes here bypass all normal validation.</p>
      </div>

      {error && <Banner>{error}</Banner>}

      {/* The tab stack sits OUTSIDE the card, as it does on Management.
          It is sticky and bleeds out to the page gutter with negative
          margins, and inside a padded card those margins fought the
          padding and left an empty strip above the tabs. Navigation is
          page furniture; it does not belong in a content panel. */}
      <div className="tab-stack">
        <Tabs tabs={TAB_GROUPS} active={group} onChange={pickGroup} ariaLabel="Super Admin areas" />
        {/* Always rendered, including for Staff, which holds one screen.
            Dropping the row for a family that does not need it moved
            everything below it whenever you changed family. */}
        <Tabs tabs={sections} active={tab} onChange={pickScreen} variant="sub" ariaLabel="Screens in this area" />
      </div>

      <div className="card">

        {tab === "shifts" && (
          <>
            <label>Staff Member</label>
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

            {!search.target && <p className="muted">Pick a staff member to view and edit their shifts.</p>}
          </>
        )}

        {tab === "botsettings" && <BotSettings />}
        {tab === "modsecurity" && <DiscordModSecurity />}
      </div>

      {tab === "shifts" && search.target && (
        <>
          <div className="card">
            <h2>Create Shift for {search.target.nickname ?? search.target.username}</h2>
            <form onSubmit={createShift}>
              <div className="form-row">
                <div>
                  <label>Started</label>
                  <input type="datetime-local" required value={newStart} onChange={e => setNewStart(e.target.value)} />
                </div>
                <div>
                  <label>Ended (blank = active)</label>
                  <input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
                </div>
                <div>
                  <label>Break (minutes)</label>
                  <input type="number" min="0" value={newBreakMinutes} onChange={e => setNewBreakMinutes(e.target.value)} />
                </div>
              </div>
              <button className="primary" type="submit" disabled={creating}>{creating ? "Creating…" : "Create Shift"}</button>
            </form>
          </div>

          <div className="card">
            <h2>Shifts ({shifts.length})</h2>
            {loading && <Skeleton variant="rows" />}
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
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave({
        startedAt: parseDateTimeInput(startedAt),
        endedAt: active ? null : parseDateTimeInput(endedAt),
        breakSeconds: Math.round(Number(breakMinutes || 0) * 60),
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
      <div className="form-row" style={{ marginTop: 8 }}>
        <div>
          <label>Started</label>
          <input type="datetime-local" value={startedAt} onChange={e => setStartedAt(e.target.value)} />
        </div>
        <div>
          <label>Ended</label>
          <input type="datetime-local" value={endedAt} disabled={active} onChange={e => setEndedAt(e.target.value)} />
        </div>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Currently active (no end time)
      </label>
      <div className="form-row">
        <div>
          <label>Break (minutes)</label>
          <input type="number" min="0" value={breakMinutes} onChange={e => setBreakMinutes(e.target.value)} />
        </div>
      </div>
      <div className="button-row">
        <button className="primary small" type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button className="btn-red small" type="button" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

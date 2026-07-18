import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { timeAgo, formatDurationWithSeconds, formatDuration } from "../utils";
import Avatar from "../components/Avatar";
import DiscordAvatar from "../components/DiscordAvatar";
import UserPanel from "../components/UserPanel";
import LogCard from "../components/LogCard";
import CustomSelect from "../components/CustomSelect";
import PortalDropdown from "../components/PortalDropdown";
import ShiftHistoryModal from "../components/ShiftHistoryModal";
import LOAModal from "../components/LOAModal";
import ActivityModal from "../components/ActivityModal";

const ALL_TYPES = [
  { value: "warning", label: "Warning" },
  { value: "kick", label: "Kick" },
  { value: "ban", label: "Ban" },
  { value: "temp_ban", label: "Temp Ban" },
  { value: "bolo", label: "Ban BOLO" },
  { value: "note", label: "Note" },
];

const POLL_MS = 3_000; // fast poll so the panel feels live without a full push/WebSocket layer

const ACTIVITY_META = {
  join:      { color: "#69f0ae" },
  leave:     { color: "#8a8f99" },
  kill:      { color: "#e53935" },
  command:   { color: "#64b5f6" },
  modcall:   { color: "#f9a825" },
  emergency: { color: "#ff6f60" },
};

// System/automated accounts and unset callers should never be clickable,
// and a missing caller should read as "Server" rather than the literal
// string "null".
function displayName(name) {
  return name ?? "Server";
}
function isClickable(name) {
  return !!name && name !== "Remote Server";
}

function describeEvent(e) {
  switch (e.type) {
    case "join": return `${displayName(e.player)} joined the server`;
    case "leave": return `${displayName(e.player)} left the server`;
    case "kill": return `${displayName(e.killer)} killed ${displayName(e.killed)}`;
    case "command": return `${displayName(e.player)} ran ${e.command}`;
    case "modcall": return `Mod call from ${displayName(e.caller)}`;
    case "emergency": return `${e.team} call from ${displayName(e.caller)}${e.description ? `: ${e.description}` : ""}`;
    default: return "Unknown event";
  }
}

export default function Dashboard() {
  const { user } = useAuth();

  // ---------- Shift state ----------
  const [active, setActive] = useState(null);
  const [onBreak, setOnBreak] = useState(false);
  const [shiftType, setShiftType] = useState("");
  const [shiftError, setShiftError] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [onDutyStaff, setOnDutyStaff] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardResetAt, setLeaderboardResetAt] = useState(null);
  const [resettingLeaderboard, setResettingLeaderboard] = useState(false);
  const [forceEndingId, setForceEndingId] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function refreshShift() {
    try {
      const { shift } = await apiFetch("/shifts/active");
      setActive(shift);
      setOnBreak(!!shift?.break_started_at);
    } catch (err) {
      setShiftError(err.message);
    }
  }

  async function refreshOnDuty() {
    try {
      const { staff } = await apiFetch("/shifts/on-duty");
      setOnDutyStaff(staff);
    } catch { /* ignore */ }
  }

  async function refreshLeaderboard() {
    try {
      const { leaderboard, lastReset } = await apiFetch("/shifts/leaderboard");
      setLeaderboard(leaderboard);
      setLeaderboardResetAt(lastReset);
    } catch { /* ignore */ }
  }

  async function resetLeaderboard() {
    if (!confirm("Reset the shift leaderboard? This starts a new counting period -- existing shift records and reports are not deleted.")) return;
    setResettingLeaderboard(true);
    try {
      await apiFetch("/shifts/leaderboard/reset", { method: "POST" });
      await refreshLeaderboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setResettingLeaderboard(false);
    }
  }

  async function forceEndShift(discordId, name) {
    if (!confirm(`End ${name}'s active shift? Use this if they forgot to clock out or for shift-farming concerns.`)) return;
    setForceEndingId(discordId);
    try {
      await apiFetch(`/shifts/end/${discordId}`, { method: "POST" });
      await refreshOnDuty();
      await refreshLeaderboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setForceEndingId(null);
    }
  }

  async function startShift() {
    setShiftError(null);
    try {
      await apiFetch("/shifts/start", { method: "POST", body: { shiftType: shiftType || undefined } });
      await refreshShift();
      await refreshOnDuty();
    } catch (err) { setShiftError(err.message); }
  }
  async function toggleBreak() {
    setShiftError(null);
    try {
      await apiFetch("/shifts/break", { method: "POST" });
      await refreshShift();
      await refreshOnDuty();
    } catch (err) { setShiftError(err.message); }
  }
  async function endShift() {
    setShiftError(null);
    try {
      await apiFetch("/shifts/end", { method: "POST" });
      await refreshShift();
      await refreshOnDuty();
    } catch (err) { setShiftError(err.message); }
  }

  const liveDurationSeconds = active && Number.isFinite(active.started_at)
    ? Math.floor((now - active.started_at) / 1000)
      - (active.break_seconds ?? 0)
      - (onBreak && Number.isFinite(active.break_started_at) ? Math.floor((now - active.break_started_at) / 1000) : 0)
    : 0;

  // ---------- Toolbox: Player Lookup quick-search modal ----------
  const [lookupModalOpen, setLookupModalOpen] = useState(false);
  const [lookupValue, setLookupValue] = useState("");
  const [lookupSuggestions, setLookupSuggestions] = useState([]);
  const [showLookupSuggestions, setShowLookupSuggestions] = useState(false);
  const lookupInputRef = useRef(null);
  const lookupDebounceRef = useRef(null);

  async function fetchLookupSuggestions(value) {
    try {
      const { suggestions } = await apiFetch(`/punishments/autocomplete?q=${encodeURIComponent(value)}`);
      setLookupSuggestions(suggestions);
      setShowLookupSuggestions(suggestions.length > 0);
    } catch { setLookupSuggestions([]); }
  }

  function onLookupValueChange(value) {
    setLookupValue(value);
    clearTimeout(lookupDebounceRef.current);
    lookupDebounceRef.current = setTimeout(() => fetchLookupSuggestions(value.trim()), 250);
  }

  function onLookupFocus() {
    fetchLookupSuggestions(lookupValue.trim());
  }

  function selectLookupSuggestion(username) {
    setShowLookupSuggestions(false);
    setSelectedUser({ type: "username", value: username });
    setLookupModalOpen(false);
    setLookupValue("");
  }

  function openLookup(e) {
    e.preventDefault();
    if (!lookupValue.trim()) return;
    selectLookupSuggestion(lookupValue.trim());
  }

  // ---------- Toolbox: LOA modal ----------
  const [loaModalOpen, setLoaModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  // ---------- Toolbox: Resign modal -- any staff member can resign themselves ----------
  const [resignModalOpen, setResignModalOpen] = useState(false);
  const [resignNotes, setResignNotes] = useState("");
  const [resignError, setResignError] = useState(null);
  const [resignSubmitting, setResignSubmitting] = useState(false);

  async function submitOwnResignation(e) {
    e.preventDefault();
    setResignError(null);
    if (!confirm("Resign from the staff team? This removes all your staff roles and cannot be undone automatically.")) return;
    setResignSubmitting(true);
    try {
      await apiFetch("/staff-removal/resign", { method: "POST", body: { reason: resignNotes } });
      setResignModalOpen(false);
      setResignNotes("");
      window.location.reload(); // roles just changed -- refresh so the panel reflects the new (former-staff) state
    } catch (err) {
      setResignError(err.message);
    } finally {
      setResignSubmitting(false);
    }
  }

  // ---------- Create log ----------
  const allowedTypes = ALL_TYPES.filter(t => (user?.allowedPunishmentTypes ?? ["bolo"]).includes(t.value));
  const [form, setForm] = useState({ targetRobloxUsername: "", type: allowedTypes[0]?.value ?? "bolo", reason: "", unbanAt: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const usernameInputRef = useRef(null);

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function fetchUsernameSuggestions(value) {
    try {
      const { suggestions } = await apiFetch(`/punishments/autocomplete?q=${encodeURIComponent(value)}`);
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch { setSuggestions([]); }
  }

  function onUsernameChange(value) {
    updateField("targetRobloxUsername", value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsernameSuggestions(value.trim()), 250);
  }

  function onUsernameFocus() {
    fetchUsernameSuggestions((form.targetRobloxUsername ?? "").trim());
  }

  function openUser(username) {
    updateField("targetRobloxUsername", username);
    setSelectedUser({ type: "username", value: username });
  }

  function openUserByDiscord(discordId) {
    setSelectedUser({ type: "discord", value: discordId });
  }

  async function createLog(e) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(false);
    setCreating(true);
    try {
      const body = {
        targetRobloxUsername: form.targetRobloxUsername,
        type: form.type,
        reason: form.reason,
      };
      if (form.type === "temp_ban") {
        if (!form.unbanAt) throw new Error("An unban date is required for temp bans.");
        body.unbanAt = new Date(form.unbanAt).getTime();
      }
      await apiFetch("/punishments", { method: "POST", body });
      setCreateSuccess(true);
      setForm(prev => ({ ...prev, targetRobloxUsername: "", reason: "", unbanAt: "" }));
      refreshLogs();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // ---------- Punishment logs list (always live, never swapped out) ----------
  const [logSearch, setLogSearch] = useState("");
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  async function refreshLogs() {
    try {
      const { logs } = await apiFetch(`/punishments?username=${encodeURIComponent(logSearch)}`);
      setLogs(logs);
    } catch { /* ignore */ }
    finally { setLogsLoading(false); }
  }

  // ---------- Live activity (always polling) ----------
  const [events, setEvents] = useState([]);

  async function fetchActivity() {
    try {
      const { events } = await apiFetch("/activity");
      setEvents(events);
    } catch { /* ignore */ }
  }

  // ---------- Live in-game players ----------
  const [livePlayers, setLivePlayers] = useState([]);
  const [queueCount, setQueueCount] = useState(0);
  const [playerSearch, setPlayerSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");

  async function fetchLivePlayers() {
    try {
      const { players, queueCount } = await apiFetch("/activity/players");
      setLivePlayers(players);
      setQueueCount(queueCount);
    } catch { /* ignore */ }
  }

  const teamCounts = livePlayers.reduce((acc, p) => {
    const team = p.team || "Unknown";
    acc[team] = (acc[team] ?? 0) + 1;
    return acc;
  }, {});

  const teamOptions = [
    { value: "all", label: `All Teams (${livePlayers.length})` },
    ...Object.entries(teamCounts).map(([team, count]) => ({ value: team, label: `${team} (${count})` })),
  ];

  const playersCount = livePlayers.length;
  const filteredPlayers = livePlayers
    .filter(p => teamFilter === "all" || p.team === teamFilter)
    .filter(p => !playerSearch || p.username?.toLowerCase().includes(playerSearch.toLowerCase()));

  // ---------- Selected user (opens as a floating modal, not embedded) ----------
  const [selectedUser, setSelectedUser] = useState(null);

  // ---------- Initial load + polling ----------
  useEffect(() => {
    refreshShift();
    refreshOnDuty();
    refreshLeaderboard();
    refreshLogs();
    fetchActivity();
    fetchLivePlayers();
    const interval = setInterval(() => {
      refreshShift();
      refreshOnDuty();
      refreshLeaderboard();
      refreshLogs();
      fetchActivity();
      fetchLivePlayers();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { refreshLogs(); }, [logSearch]);

  const [headerInfoOpen, setHeaderInfoOpen] = useState(false);
  const headerInfoRef = useRef(null);

  return (
    <div className="content dashboard-content">
      <div className="page-header page-header-compact">
        <h1>Dashboard</h1>
        <div className="page-header-info-wrap">
          <button ref={headerInfoRef} className="page-header-info-btn" onClick={() => setHeaderInfoOpen(o => !o)}>⋯</button>
          <PortalDropdown anchorRef={headerInfoRef} open={headerInfoOpen} onClose={() => setHeaderInfoOpen(false)} matchWidth={false} className="page-header-info-portal">
            <p style={{ margin: 0 }}>Everything you need in one place: shifts, logs, activity, and quick actions.</p>
          </PortalDropdown>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* ---------- LEFT: Greeting + Shift + Toolbox + On Duty + Players ---------- */}
        <div className="dashboard-col">
          <div className="card dashboard-greeting-card">
            <DiscordAvatar discordId={user?.discordId} avatarHash={user?.avatar} size={40} />
            <h2 style={{ margin: 0 }}>Hey, {user?.username}!</h2>
          </div>

          <div className="card">
            <h2>Current Shift</h2>
            {shiftError && <div className="error-banner">{shiftError}</div>}
            {active ? (
              <>
                <div className="shift-timer">
                  <span className={`status-dot ${onBreak ? "status-break" : "status-active"}`} />
                  <span className="timer-value">{formatDurationWithSeconds(Math.max(0, liveDurationSeconds))}</span>
                </div>
                {onBreak && <span className="badge" style={{ background: "#4a3f1a", color: "#f9a825", marginBottom: 10, display: "inline-block" }}>On Break</span>}
                <div className="button-row">
                  <button className="btn-orange" onClick={toggleBreak}>{onBreak ? "Resume" : "Break"}</button>
                  <button className="btn-red" onClick={endShift}>End Shift</button>
                </div>
              </>
            ) : (
              <>
                <input value={shiftType} onChange={e => setShiftType(e.target.value)} placeholder="Shift type (optional)" />
                <button className="btn-green" onClick={startShift} style={{ width: "100%" }}>Start Shift</button>
              </>
            )}

            {onDutyStaff.length > 0 && (
              <div className="on-duty-row">
                {onDutyStaff.map(s => (
                  <div
                    className="on-duty-avatar"
                    key={s.discordId}
                    title={`${s.username ?? s.discordId}${s.onBreak ? " (on break)" : ""}`}
                    onClick={() => openUserByDiscord(s.discordId)}
                    style={{ cursor: "pointer" }}
                  >
                    <DiscordAvatar discordId={s.discordId} avatarHash={s.avatarHash} size={30} />
                    <span className={`on-duty-dot ${s.onBreak ? "on-duty-break" : "on-duty-active"}`} />
                  </div>
                ))}
              </div>
            )}

            <button className="secondary small" style={{ marginTop: 12, width: "100%" }} onClick={() => setHistoryModalOpen(true)}>
              View Shift History
            </button>
          </div>

          <div className="card">
            <div className="modal-title-row" style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Shift Leaderboard</h2>
              {user?.isManagementOrAbove && (
                <button className="secondary small" onClick={resetLeaderboard} disabled={resettingLeaderboard}>
                  {resettingLeaderboard ? "Resetting…" : "Reset"}
                </button>
              )}
            </div>
            {leaderboardResetAt && (
              <p className="muted card-subtitle">Since {new Date(leaderboardResetAt).toLocaleDateString()}</p>
            )}
            {leaderboard.length === 0 ? (
              <p className="muted">No shift activity yet this period.</p>
            ) : (
              <div className="log-card-list">
                {leaderboard.map((row, idx) => {
                  const isActive = onDutyStaff.some(s => s.discordId === row.discord_id);
                  const name = row.staff_username ?? row.discord_id;
                  return (
                    <div key={row.discord_id} className="log-card-issuer-row" style={{ padding: "6px 0" }}>
                      <span className="muted" style={{ width: 20 }}>#{idx + 1}</span>
                      <DiscordAvatar discordId={row.discord_id} avatarHash={row.staff_avatar_hash} size={24} />
                      <span className="log-card-username">{name}</span>
                      <span className="muted" style={{ marginLeft: "auto" }}>{formatDuration(row.totalSeconds)} · {row.shiftCount} shift{row.shiftCount === 1 ? "" : "s"}</span>
                      {user?.isManagementOrAbove && isActive && (
                        <button
                          className="btn-red small"
                          style={{ marginLeft: 8 }}
                          onClick={() => forceEndShift(row.discord_id, name)}
                          disabled={forceEndingId === row.discord_id}
                        >
                          {forceEndingId === row.discord_id ? "Ending…" : "End Shift"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Toolbox</h2>
            <div className="toolbox-grid">
              <button className="toolbox-btn toolbox-green" onClick={() => setLoaModalOpen(true)}>Manage LOA</button>
              <button className="toolbox-btn toolbox-blue" onClick={() => setLookupModalOpen(true)}>Player Lookup</button>
              <button className="toolbox-btn toolbox-pink" onClick={() => setResignModalOpen(true)}>Resign</button>
            </div>
          </div>

          <div className="card">
            <h2>{playersCount} Player{playersCount === 1 ? "" : "s"} In-Game</h2>
            {queueCount > 0 && <p className="muted card-subtitle">{queueCount} in queue</p>}
            <CustomSelect value={teamFilter} onChange={setTeamFilter} options={teamOptions} />
            <input placeholder="Search players" value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} style={{ marginTop: 10 }} />
            <div className="players-list">
              {filteredPlayers.length === 0 ? (
                <p className="muted">No players match.</p>
              ) : (
                filteredPlayers.map(p => (
                  <div key={p.username} className="players-list-row" onClick={() => openUser(p.username)}>
                    <Avatar username={p.username} robloxId={p.robloxId} size={24} />
                    <span className="players-list-name">{p.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ---------- CENTER: Create log + live activity ---------- */}
        <div className="dashboard-col">
          <div className="card">
            <h2>Create New Log</h2>
            {createError && <div className="error-banner">{createError}</div>}
            {createSuccess && <div className="success-banner">Log created successfully.</div>}
            <form onSubmit={createLog}>
              <label>User</label>
              <div className="autocomplete-wrap">
                <input
                  ref={usernameInputRef}
                  required
                  autoComplete="off"
                  value={form.targetRobloxUsername}
                  onChange={e => onUsernameChange(e.target.value)}
                  onFocus={onUsernameFocus}
                  placeholder="Enter Roblox username"
                />
                <PortalDropdown anchorRef={usernameInputRef} open={showSuggestions} onClose={() => setShowSuggestions(false)} className="autocomplete-list-portal">
                  {suggestions.map(s => (
                    <div
                      key={s.username}
                      className="autocomplete-item"
                      onClick={() => { updateField("targetRobloxUsername", s.username); setShowSuggestions(false); }}
                    >
                      <Avatar username={s.username} robloxId={s.robloxId} size={26} />
                      <span className="autocomplete-name">{s.username}</span>
                      <span className="autocomplete-hint">{s.hint}</span>
                    </div>
                  ))}
                </PortalDropdown>
              </div>

              <label>Type</label>
              <CustomSelect value={form.type} onChange={(v) => updateField("type", v)} options={allowedTypes} />
              {user?.tier === "moderator" && (
                <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>Moderators can only issue Ban BOLOs.</p>
              )}

              {form.type === "temp_ban" && (
                <>
                  <label style={{ marginTop: 12 }}>Unban Date</label>
                  <input type="datetime-local" required value={form.unbanAt} onChange={e => updateField("unbanAt", e.target.value)} />
                </>
              )}

              <label style={{ marginTop: 12 }}>Reason</label>
              <input required value={form.reason} onChange={e => updateField("reason", e.target.value)} placeholder="Short reason for the action" />

              <button className="primary" type="submit" disabled={creating}>{creating ? "Creating…" : "Create Log"}</button>
            </form>
          </div>

          <div className="card">
            <div className="modal-title-row" style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>What's Happening In-Game?</h2>
              <button className="secondary small" onClick={() => setActivityModalOpen(true)}>Expand</button>
            </div>
            {events.length === 0 ? (
              <p className="muted">No recent activity.</p>
            ) : (
              <div className="activity-feed">
                {events.slice(0, 30).map((e, i) => {
                  const meta = ACTIVITY_META[e.type] ?? { color: "#8a8f99" };
                  const rawName = e.player || e.killer || e.caller || null;
                  const clickable = isClickable(rawName);
                  return (
                    <div className="activity-row" key={i}>
                      <span className="activity-dot" style={{ background: meta.color }} />
                      <span
                        className={clickable ? "activity-text activity-text-clickable" : "activity-text"}
                        onClick={() => clickable && openUser(rawName)}
                      >
                        {describeEvent(e)}
                      </span>
                      <span className="activity-time muted">{timeAgo(e.timestamp * 1000)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ---------- RIGHT: Punishment logs, always visible/live ---------- */}
        <div className="dashboard-col">
          <div className="card">
            <h2>Punishment Logs</h2>
            <input placeholder="Search by username" value={logSearch} onChange={e => setLogSearch(e.target.value)} />
            <div className="log-card-list">
              {logsLoading && <p className="muted">Loading…</p>}
              {!logsLoading && logs.length === 0 && <p className="muted">No logs found.</p>}
              {logs.map(log => (
                <LogCard key={log.id} log={log} onChanged={refreshLogs} onUsernameClick={openUser} onIssuerClick={openUserByDiscord} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Player Lookup quick-search modal ---------- */}
      {lookupModalOpen && (
        <div className="modal-backdrop" onClick={() => setLookupModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Player Lookup</h2>
            <form onSubmit={openLookup}>
              <label>Roblox Username</label>
              <div className="autocomplete-wrap">
                <input
                  ref={lookupInputRef}
                  required
                  autoFocus
                  autoComplete="off"
                  value={lookupValue}
                  onChange={e => onLookupValueChange(e.target.value)}
                  onFocus={onLookupFocus}
                  placeholder="Enter a username"
                />
                <PortalDropdown anchorRef={lookupInputRef} open={showLookupSuggestions} onClose={() => setShowLookupSuggestions(false)} className="autocomplete-list-portal">
                  {lookupSuggestions.map(s => (
                    <div key={s.username} className="autocomplete-item" onClick={() => selectLookupSuggestion(s.username)}>
                      <Avatar username={s.username} robloxId={s.robloxId} size={26} />
                      <span className="autocomplete-name">{s.username}</span>
                      <span className="autocomplete-hint">{s.hint}</span>
                    </div>
                  ))}
                </PortalDropdown>
              </div>
              <div className="button-row">
                <button className="primary" type="submit">Look Up</button>
                <button className="secondary" type="button" onClick={() => setLookupModalOpen(false)}>Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- User profile popup ---------- */}
      {selectedUser && (
        <div className="modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="modal user-panel-modal" onClick={e => e.stopPropagation()}>
            {selectedUser.type === "discord" ? (
              <UserPanel discordId={selectedUser.value} onClose={() => setSelectedUser(null)} />
            ) : (
              <UserPanel username={selectedUser.value} onClose={() => setSelectedUser(null)} />
            )}
          </div>
        </div>
      )}

      {/* ---------- Shift History modal ---------- */}
      {historyModalOpen && <ShiftHistoryModal onClose={() => setHistoryModalOpen(false)} />}

      {/* ---------- LOA modal ---------- */}
      {loaModalOpen && <LOAModal onClose={() => setLoaModalOpen(false)} />}

      {resignModalOpen && (
        <div className="modal-backdrop" onClick={() => setResignModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Resign</h2>
            {resignError && <div className="error-banner">{resignError}</div>}
            <form onSubmit={submitOwnResignation}>
              <label>Notes (optional)</label>
              <textarea rows={2} value={resignNotes} onChange={e => setResignNotes(e.target.value)} />
              <div className="button-row">
                <button className="primary" type="submit" disabled={resignSubmitting} style={{ background: "#e53935" }}>
                  {resignSubmitting ? "Processing…" : "Confirm Resignation"}
                </button>
                <button className="secondary" type="button" onClick={() => setResignModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Activity modal ---------- */}
      {activityModalOpen && <ActivityModal onClose={() => setActivityModalOpen(false)} onUserClick={openUser} />}
    </div>
  );
}

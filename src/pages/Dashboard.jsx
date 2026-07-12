import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { timeAgo, TYPE_LABELS, formatDuration } from "../utils";
import Avatar from "../components/Avatar";
import UserPanel from "../components/UserPanel";

const ALL_TYPES = [
  { value: "warning", label: "Warning" },
  { value: "kick", label: "Kick" },
  { value: "ban", label: "Ban" },
  { value: "temp_ban", label: "Temp Ban" },
  { value: "bolo", label: "Ban BOLO" },
  { value: "note", label: "Note" },
];

const ACTIVITY_POLL_MS = 15_000;

const ACTIVITY_META = {
  join:      { icon: "→", color: "#69f0ae" },
  leave:     { icon: "←", color: "#8a8f99" },
  kill:      { icon: "✕", color: "#e53935" },
  command:   { icon: "›", color: "#64b5f6" },
  modcall:   { icon: "!", color: "#f9a825" },
  emergency: { icon: "!", color: "#ff6f60" },
};

function describeEvent(e) {
  switch (e.type) {
    case "join": return `${e.player} joined the server`;
    case "leave": return `${e.player} left the server`;
    case "kill": return `${e.killer} killed ${e.killed}`;
    case "command": return `${e.player} ran ${e.command}`;
    case "modcall": return `Mod call from ${e.caller}`;
    case "emergency": return `${e.team} call from ${e.caller}${e.description ? ` — ${e.description}` : ""}`;
    default: return "Unknown event";
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);

  // ---------- Shift state ----------
  const [active, setActive] = useState(null);
  const [onBreak, setOnBreak] = useState(false);
  const [shiftType, setShiftType] = useState("");
  const [shiftError, setShiftError] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  async function refreshShift() {
    try {
      const { shift } = await apiFetch("/shifts/active");
      setActive(shift);
      setOnBreak(!!shift?.break_started_at);
    } catch (err) {
      setShiftError(err.message);
    }
  }

  async function startShift() {
    setShiftError(null);
    try {
      await apiFetch("/shifts/start", { method: "POST", body: { shiftType: shiftType || undefined } });
      await refreshShift();
    } catch (err) { setShiftError(err.message); }
  }
  async function toggleBreak() {
    setShiftError(null);
    try {
      await apiFetch("/shifts/break", { method: "POST" });
      await refreshShift();
    } catch (err) { setShiftError(err.message); }
  }
  async function endShift() {
    setShiftError(null);
    try {
      await apiFetch("/shifts/end", { method: "POST" });
      await refreshShift();
    } catch (err) { setShiftError(err.message); }
  }

  const liveDurationSeconds = active && Number.isFinite(active.started_at)
    ? Math.floor((now - active.started_at) / 1000)
      - (active.break_seconds ?? 0)
      - (onBreak && Number.isFinite(active.break_started_at) ? Math.floor((now - active.break_started_at) / 1000) : 0)
    : 0;

  // ---------- Toolbox: Run Command modal ----------
  const [commandModalOpen, setCommandModalOpen] = useState(false);
  const [commandText, setCommandText] = useState("");
  const [commandStatus, setCommandStatus] = useState(null);
  const [commandSending, setCommandSending] = useState(false);

  async function sendCommand(e) {
    e.preventDefault();
    setCommandSending(true);
    setCommandStatus(null);
    try {
      await apiFetch("/command", { method: "POST", body: { command: commandText } });
      setCommandStatus({ ok: true, message: "Command sent." });
      setCommandText("");
    } catch (err) {
      setCommandStatus({ ok: false, message: err.message });
    } finally {
      setCommandSending(false);
    }
  }

  // ---------- Toolbox: Request Staff modal ----------
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffReason, setStaffReason] = useState("");
  const [staffStatus, setStaffStatus] = useState(null);
  const [staffSending, setStaffSending] = useState(false);

  async function sendStaffRequest(e) {
    e.preventDefault();
    setStaffSending(true);
    setStaffStatus(null);
    try {
      await apiFetch("/staff-request", { method: "POST", body: { reason: staffReason } });
      setStaffStatus({ ok: true, message: "Staff requested." });
      setStaffReason("");
    } catch (err) {
      setStaffStatus({ ok: false, message: err.message });
    } finally {
      setStaffSending(false);
    }
  }

  // ---------- Create log ----------
  const allowedTypes = ALL_TYPES.filter(t => (user?.allowedPunishmentTypes ?? ["bolo"]).includes(t.value));
  const [form, setForm] = useState({ targetRobloxUsername: "", type: allowedTypes[0]?.value ?? "bolo", reason: "", description: "", unbanAt: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function onUsernameChange(value) {
    updateField("targetRobloxUsername", value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { suggestions } = await apiFetch(`/punishments/autocomplete?q=${encodeURIComponent(value)}`);
        setSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch { setSuggestions([]); }
    }, 250);
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
        description: form.description || undefined,
      };
      if (form.type === "temp_ban") {
        if (!form.unbanAt) throw new Error("An unban date is required for temp bans.");
        body.unbanAt = new Date(form.unbanAt).getTime();
      }
      await apiFetch("/punishments", { method: "POST", body });
      setCreateSuccess(true);
      setForm(prev => ({ ...prev, targetRobloxUsername: "", reason: "", description: "", unbanAt: "" }));
      refreshLogs();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // ---------- Punishment logs list ----------
  const [logSearch, setLogSearch] = useState("");
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [hidingId, setHidingId] = useState(null);

  async function refreshLogs() {
    setLogsLoading(true);
    try {
      const { logs } = await apiFetch(`/punishments?username=${encodeURIComponent(logSearch)}`);
      setLogs(logs);
    } catch { /* ignore */ }
    finally { setLogsLoading(false); }
  }

  async function toggleHide(id) {
    setHidingId(id);
    try {
      await apiFetch(`/punishments/${id}/hide`, { method: "PATCH" });
      setLogs(prev => prev.map(l => l.id === id ? { ...l, hidden: l.hidden ? 0 : 1 } : l));
    } catch (err) { alert(err.message); }
    finally { setHidingId(null); }
  }

  // ---------- Live activity ----------
  const [events, setEvents] = useState([]);
  const [activityPaused, setActivityPaused] = useState(false);

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

  async function fetchLivePlayers() {
    try {
      const { players, queueCount } = await apiFetch("/activity/players");
      setLivePlayers(players);
      setQueueCount(queueCount);
    } catch { /* ignore */ }
  }

  const playersCount = livePlayers.length;
  const filteredPlayers = playerSearch
    ? livePlayers.filter(p => p.username?.toLowerCase().includes(playerSearch.toLowerCase()))
    : livePlayers;

  // ---------- Initial load + polling ----------
  useEffect(() => {
    refreshShift();
    refreshLogs();
    fetchActivity();
    fetchLivePlayers();
    const interval = setInterval(() => {
      if (!activityPaused) fetchActivity();
      fetchLivePlayers();
    }, ACTIVITY_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { refreshLogs(); }, [logSearch]);

  return (
    <div className="content dashboard-content">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">Everything you need in one place — shifts, logs, activity, and quick actions.</p>
      </div>

      <div className="dashboard-grid">
        {/* ---------- LEFT: Shift + Toolbox ---------- */}
        <div className="dashboard-col">
          <div className="card">
            <h2>Current Shift</h2>
            {shiftError && <div className="error-banner">{shiftError}</div>}
            {active ? (
              <>
                <div className="shift-timer">
                  <span className={`status-dot ${onBreak ? "status-break" : "status-active"}`} />
                  <span className="timer-value">{formatDuration(Math.max(0, liveDurationSeconds))}</span>
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
          </div>

          <div className="card">
            <h2>Toolbox</h2>
            <div className="toolbox-grid">
              {user?.canRunCommand && (
                <button className="toolbox-btn toolbox-pink" onClick={() => setCommandModalOpen(true)}>Run Command</button>
              )}
              <button className="toolbox-btn toolbox-orange" onClick={() => setStaffModalOpen(true)}>Request Staff</button>
              <Link to="/loa" className="toolbox-btn toolbox-green">Manage LOA</Link>
              <Link to="/players" className="toolbox-btn toolbox-blue">Player Lookup</Link>
            </div>
          </div>

          <div className="card">
            <h2>{playersCount} Player{playersCount === 1 ? "" : "s"} In-Game</h2>
            {queueCount > 0 && <p className="muted" style={{ marginTop: -8 }}>{queueCount} in queue</p>}
            <input placeholder="Search players" value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} />
            <div className="players-list">
              {filteredPlayers.length === 0 ? (
                <p className="muted">No players online.</p>
              ) : (
                filteredPlayers.map(p => (
                  <div
                    key={p.username}
                    className="players-list-row"
                    onClick={() => {
                      updateField("targetRobloxUsername", p.username);
                      setSelectedUser(p.username);
                    }}
                  >
                    <Avatar username={p.username} robloxId={p.robloxId} size={24} />
                    <span>{p.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ---------- CENTER: Create log + live activity ---------- */}
        <div className="dashboard-col dashboard-col-wide">
          <div className="card">
            <h2>Create New Log</h2>
            {createError && <div className="error-banner">{createError}</div>}
            {createSuccess && <div className="success-banner">Log created successfully.</div>}
            <form onSubmit={createLog}>
              <label>User</label>
              <div className="autocomplete-wrap">
                <input
                  required
                  autoComplete="off"
                  value={form.targetRobloxUsername}
                  onChange={e => onUsernameChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Enter Roblox username"
                />
                {showSuggestions && (
                  <div className="autocomplete-list">
                    {suggestions.map(s => (
                      <div
                        key={s.username}
                        className="autocomplete-item"
                        onMouseDown={() => {
                          updateField("targetRobloxUsername", s.username);
                          setShowSuggestions(false);
                          setSelectedUser(s.username);
                        }}
                      >
                        <Avatar username={s.username} robloxId={s.robloxId} size={26} />
                        <span className="autocomplete-name">{s.username}</span>
                        <span className="autocomplete-hint">{s.hint}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label>Type</label>
              <select value={form.type} onChange={e => updateField("type", e.target.value)}>
                {allowedTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {user?.tier === "moderator" && (
                <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Moderators can only issue Ban BOLOs.</p>
              )}

              {form.type === "temp_ban" && (
                <>
                  <label>Unban Date</label>
                  <input type="datetime-local" required value={form.unbanAt} onChange={e => updateField("unbanAt", e.target.value)} />
                </>
              )}

              <label>Reason</label>
              <input required value={form.reason} onChange={e => updateField("reason", e.target.value)} placeholder="Short reason for the action" />

              <label>Description (optional)</label>
              <textarea rows={2} value={form.description} onChange={e => updateField("description", e.target.value)} />

              <button className="primary" type="submit" disabled={creating}>{creating ? "Creating…" : "Create Log"}</button>
            </form>
          </div>

          <div className="card">
            <div className="activity-toolbar">
              <h2 style={{ margin: 0 }}>What's Happening In-Game?</h2>
              <button className="secondary small" onClick={() => setActivityPaused(p => !p)}>{activityPaused ? "Resume" : "Pause"}</button>
            </div>
            {events.length === 0 ? (
              <p className="muted">No recent activity.</p>
            ) : (
              <div className="activity-feed">
                {events.slice(0, 30).map((e, i) => {
                  const meta = ACTIVITY_META[e.type] ?? { icon: "•", color: "#8a8f99" };
                  const clickableName = e.player || e.killer || e.caller || null;
                  return (
                    <div className="activity-row" key={i}>
                      <span className="activity-icon-bubble" style={{ background: `${meta.color}22`, color: meta.color }}>{meta.icon}</span>
                      <span
                        className={clickableName ? "activity-text activity-text-clickable" : "activity-text"}
                        onClick={() => {
                          if (!clickableName) return;
                          updateField("targetRobloxUsername", clickableName);
                          setSelectedUser(clickableName);
                        }}
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

        {/* ---------- RIGHT: Punishment logs, or a User Panel when someone's selected ---------- */}
        <div className="dashboard-col">
          {selectedUser ? (
            <UserPanel username={selectedUser} onClose={() => setSelectedUser(null)} />
          ) : (
            <div className="card">
              <h2>Punishment Logs</h2>
              <input placeholder="Search by username" value={logSearch} onChange={e => setLogSearch(e.target.value)} />
              <div className="log-card-list">
                {logsLoading && <p className="muted">Loading…</p>}
                {!logsLoading && logs.length === 0 && <p className="muted">No logs found.</p>}
                {logs.map(log => (
                  <div className={`log-card ${log.hidden ? "log-card-hidden" : ""}`} key={log.id}>
                    <div
                      className="log-card-top"
                      onClick={() => {
                        updateField("targetRobloxUsername", log.target_roblox_username);
                        setSelectedUser(log.target_roblox_username);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <Avatar username={log.target_roblox_username} robloxId={log.target_roblox_id} size={32} />
                      <div className="log-card-identity">
                        <div className="log-card-username">{log.target_roblox_username}</div>
                        <div className="muted">{timeAgo(log.created_at)}</div>
                      </div>
                      <span className={`badge ${log.type}`}>{TYPE_LABELS[log.type]}</span>
                    </div>
                    <div className="log-card-body">
                      <div className="log-card-field"><span className="muted">Reason:</span> {log.reason}</div>
                      <div className="log-card-field"><span className="muted">Previous:</span> {log.previous_count}</div>
                    </div>
                    {user?.canHideLogs && (
                      <div className="log-card-footer">
                        <button className="secondary small" disabled={hidingId === log.id} onClick={() => toggleHide(log.id)}>
                          {log.hidden ? "Unhide" : "Hide"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Run Command modal ---------- */}
      {commandModalOpen && (
        <div className="modal-backdrop" onClick={() => setCommandModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Run Command</h2>
            {commandStatus && (
              <div className={commandStatus.ok ? "success-banner" : "error-banner"}>{commandStatus.message}</div>
            )}
            <form onSubmit={sendCommand}>
              <label>ER:LC Command</label>
              <input required autoFocus value={commandText} onChange={e => setCommandText(e.target.value)} placeholder=":h Server message" />
              <div className="button-row">
                <button className="primary" type="submit" disabled={commandSending}>{commandSending ? "Sending…" : "Send"}</button>
                <button className="secondary" type="button" onClick={() => setCommandModalOpen(false)}>Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Request Staff modal ---------- */}
      {staffModalOpen && (
        <div className="modal-backdrop" onClick={() => setStaffModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Request Staff</h2>
            {staffStatus && (
              <div className={staffStatus.ok ? "success-banner" : "error-banner"}>{staffStatus.message}</div>
            )}
            <form onSubmit={sendStaffRequest}>
              <label>Reason</label>
              <textarea required autoFocus rows={3} value={staffReason} onChange={e => setStaffReason(e.target.value)} placeholder="Why do you need backup?" />
              <div className="button-row">
                <button className="primary" type="submit" disabled={staffSending}>{staffSending ? "Sending…" : "Request Staff"}</button>
                <button className="secondary" type="button" onClick={() => setStaffModalOpen(false)}>Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


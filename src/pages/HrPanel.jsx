import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { timeAgo, discordAvatarUrl, parseLocalDateInput, toDateInputValue, todayLocalISO } from "../utils";
import PortalDropdown from "../components/PortalDropdown";
import CustomSelect from "../components/CustomSelect";
import { useStaffSearch } from "../hooks/useStaffSearch";

function groupByDiscordId(strikes) {
  const map = new Map();
  for (const s of strikes) {
    if (!map.has(s.discord_id)) map.set(s.discord_id, []);
    map.get(s.discord_id).push(s);
  }
  return [...map.entries()];
}

function expiresLabel(expiresAt) {
  const msLeft = expiresAt - Date.now();
  if (msLeft <= 0) return "expiring now";
  const days = Math.floor(msLeft / (24 * 60 * 60 * 1000));
  const hours = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `expires in ${days}d ${hours}h`;
  return `expires in ${hours}h`;
}

export default function HrPanel() {
  const { user } = useAuth();
  const canAccess = user?.tier === "management" || user?.tier === "director";
  const canReviewBigActions = !!user?.canReviewBigActions;

  // ---------- Run Command ----------
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
  const canProcessResignations = !!user?.canProcessResignations;

  const [activeStrikes, setActiveStrikes] = useState([]);
  const [pendingLOAs, setPendingLOAs] = useState([]);
  const [activeLOAs, setActiveLOAs] = useState([]);
  const [pendingPromotions, setPendingPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------- Issue Strike: staff search-autocomplete ----------
  const [strikeTarget, setStrikeTarget] = useState(null);
  const [staffQuery, setStaffQuery] = useState("");
  const [staffSuggestions, setStaffSuggestions] = useState([]);
  const [showStaffSuggestions, setShowStaffSuggestions] = useState(false);
  const staffInputRef = useRef(null);
  const staffDebounceRef = useRef(null);

  const [strikeReason, setStrikeReason] = useState("");
  const [strikeError, setStrikeError] = useState(null);
  const [strikeSubmitting, setStrikeSubmitting] = useState(false);

  // ---------- Extend LOA modal state ----------
  const [extendingDiscordId, setExtendingDiscordId] = useState(null);
  const [extendDate, setExtendDate] = useState("");
  const [extendError, setExtendError] = useState(null);

  // ---------- Promote / Demote ----------
  const rankChangeSearch = useStaffSearch();
  const [rankChangeAction, setRankChangeAction] = useState("promote");
  const [rankOptions, setRankOptions] = useState([]);
  const [newRank, setNewRank] = useState("");
  const [rankChangeReason, setRankChangeReason] = useState("");
  const [rankChangeError, setRankChangeError] = useState(null);
  const [rankChangeSuccess, setRankChangeSuccess] = useState(false);
  const [rankChangeSubmitting, setRankChangeSubmitting] = useState(false);

  useEffect(() => {
    if (!canReviewBigActions || !rankChangeSearch.target) {
      setRankOptions([]);
      setNewRank("");
      return;
    }
    apiFetch(`/rank-changes/ranks?targetId=${rankChangeSearch.target.discordId}&action=${rankChangeAction}`).then(({ ranks }) => {
      setRankOptions(ranks);
      setNewRank(ranks[0]?.value ?? "");
    }).catch(() => setRankOptions([]));
  }, [rankChangeSearch.target, rankChangeAction, canReviewBigActions]);

  // ---------- Terminate ----------
  const terminateSearch = useStaffSearch();
  const [terminateReason, setTerminateReason] = useState("");
  const [terminateError, setTerminateError] = useState(null);
  const [terminateSuccess, setTerminateSuccess] = useState(false);
  const [terminateSubmitting, setTerminateSubmitting] = useState(false);

  async function submitTerminate(e) {
    e.preventDefault();
    setTerminateError(null);
    setTerminateSuccess(false);
    if (!terminateSearch.target) {
      setTerminateError("Pick a staff member from the search results first.");
      return;
    }
    if (!confirm(`Terminate ${terminateSearch.target.nickname ?? terminateSearch.target.username}? This removes all their staff roles immediately.`)) return;
    setTerminateSubmitting(true);
    try {
      await apiFetch("/staff-removal/terminate", { method: "POST", body: { targetDiscordId: terminateSearch.target.discordId, reason: terminateReason } });
      setTerminateSuccess(true);
      terminateSearch.reset();
      setTerminateReason("");
      await refresh();
    } catch (err) {
      setTerminateError(err.message);
    } finally {
      setTerminateSubmitting(false);
    }
  }

  // ---------- Process Resignation ----------
  const resignSearch = useStaffSearch();
  const [resignReason, setResignReason] = useState("");
  const [resignError, setResignError] = useState(null);
  const [resignSuccess, setResignSuccess] = useState(false);
  const [resignSubmitting, setResignSubmitting] = useState(false);

  async function submitResignation(e) {
    e.preventDefault();
    setResignError(null);
    setResignSuccess(false);
    if (!resignSearch.target) {
      setResignError("Pick a staff member from the search results first.");
      return;
    }
    if (!confirm(`Process ${resignSearch.target.nickname ?? resignSearch.target.username}'s resignation? This removes all their staff roles.`)) return;
    setResignSubmitting(true);
    try {
      await apiFetch("/staff-removal/resign", { method: "POST", body: { targetDiscordId: resignSearch.target.discordId, reason: resignReason } });
      setResignSuccess(true);
      resignSearch.reset();
      setResignReason("");
      await refresh();
    } catch (err) {
      setResignError(err.message);
    } finally {
      setResignSubmitting(false);
    }
  }

  async function refresh() {
    try {
      const { strikes } = await apiFetch("/strikes/active");
      setActiveStrikes(strikes);
    } catch { /* ignore */ }
    try {
      const { requests } = await apiFetch("/loa/pending");
      setPendingLOAs(requests);
    } catch { /* ignore */ }
    try {
      const { requests } = await apiFetch("/loa/active");
      setActiveLOAs(requests);
    } catch { /* ignore */ }
    if (canReviewBigActions) {
      try {
        const { requests } = await apiFetch("/rank-changes/pending");
        setPendingPromotions(requests);
      } catch { /* ignore */ }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!canAccess) return;
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [canAccess]);

  function onStaffQueryChange(value) {
    setStaffQuery(value);
    setStrikeTarget(null);
    clearTimeout(staffDebounceRef.current);
    if (value.trim().length < 2) {
      setStaffSuggestions([]);
      setShowStaffSuggestions(false);
      return;
    }
    staffDebounceRef.current = setTimeout(async () => {
      try {
        const { staff } = await apiFetch(`/staff/search?q=${encodeURIComponent(value)}`);
        setStaffSuggestions(staff);
        setShowStaffSuggestions(staff.length > 0);
      } catch { setStaffSuggestions([]); }
    }, 250);
  }

  function pickStaff(member) {
    setStrikeTarget(member);
    setStaffQuery(member.nickname ?? member.username);
    setShowStaffSuggestions(false);
  }

  async function submitStrike(e) {
    e.preventDefault();
    setStrikeError(null);
    if (!strikeTarget) {
      setStrikeError("Pick a staff member from the search results first.");
      return;
    }
    setStrikeSubmitting(true);
    try {
      await apiFetch("/strikes", { method: "POST", body: { discordId: strikeTarget.discordId, reason: strikeReason } });
      setStrikeTarget(null);
      setStaffQuery("");
      setStrikeReason("");
      await refresh();
    } catch (err) {
      setStrikeError(err.message);
    } finally {
      setStrikeSubmitting(false);
    }
  }

  async function removeStrike(id) {
    if (!confirm("Remove this strike early? It would otherwise auto-expire in 2 weeks.")) return;
    try {
      await apiFetch(`/strikes/${id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function reviewLOA(requestId, status) {
    try {
      await apiFetch(`/loa/${requestId}`, { method: "PATCH", body: { status } });
      await refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function reviewRankChange(id, status) {
    try {
      await apiFetch(`/rank-changes/${id}`, { method: "PATCH", body: { status } });
      await refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function submitRankChange(e) {
    e.preventDefault();
    setRankChangeError(null);
    setRankChangeSuccess(false);
    if (!rankChangeSearch.target) {
      setRankChangeError("Pick a staff member from the search results first.");
      return;
    }
    if (!newRank) {
      setRankChangeError("No valid rank available for this action.");
      return;
    }
    setRankChangeSubmitting(true);
    try {
      await apiFetch("/rank-changes", {
        method: "POST",
        body: { action: rankChangeAction, targetDiscordId: rankChangeSearch.target.discordId, newRank, reason: rankChangeReason },
      });
      setRankChangeSuccess(true);
      rankChangeSearch.reset();
      setRankChangeReason("");
    } catch (err) {
      setRankChangeError(err.message);
    } finally {
      setRankChangeSubmitting(false);
    }
  }

  async function endLOANow(discordId) {
    if (!confirm("End this person's LOA right now?")) return;
    try {
      await apiFetch(`/loa/end/${discordId}`, { method: "PATCH" });
      await refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  function openExtend(discordId, currentEndDate) {
    setExtendingDiscordId(discordId);
    setExtendDate(toDateInputValue(currentEndDate));
    setExtendError(null);
  }

  async function submitExtend(e) {
    e.preventDefault();
    setExtendError(null);
    try {
      await apiFetch(`/loa/extend/${extendingDiscordId}`, { method: "PATCH", body: { newEndDate: parseLocalDateInput(extendDate) } });
      setExtendingDiscordId(null);
      await refresh();
    } catch (err) {
      setExtendError(err.message);
    }
  }

  if (!canAccess) {
    return (
      <div className="content">
        <div className="page-header"><h1>HR Panel</h1></div>
        <div className="error-banner">You need Management+ access to view this page.</div>
      </div>
    );
  }

  const groupedStrikes = groupByDiscordId(activeStrikes);

  return (
    <div className="content dashboard-content">
      <div className="page-header">
        <h1>HR Panel</h1>
        <p className="muted">Strikes and Leave of Absence, in one place.</p>
      </div>

      <div className="multi-col-grid">
        {/* ---------- Column 1: Strikes -- issue form + who's currently struck ---------- */}
        <div className="dashboard-col">
          <div className="card">
            <h2>Run Command</h2>
            {commandStatus && <div className={commandStatus.ok ? "success-banner" : "error-banner"}>{commandStatus.message}</div>}
            <form onSubmit={sendCommand}>
              <label>ER:LC Command</label>
              <input required value={commandText} onChange={e => setCommandText(e.target.value)} placeholder=":h Server message" />
              <button className="primary" type="submit" disabled={commandSending}>{commandSending ? "Sending…" : "Send"}</button>
            </form>
          </div>

          <div className="card">
            <h2>Issue a Strike</h2>
            <p className="muted" style={{ marginTop: -8 }}>Every strike automatically expires after 2 weeks.</p>
            {strikeError && <div className="error-banner">{strikeError}</div>}
            <form onSubmit={submitStrike}>
              <label>Staff Member</label>
              <div className="autocomplete-wrap">
                <input
                  ref={staffInputRef}
                  required
                  autoComplete="off"
                  value={staffQuery}
                  onChange={e => onStaffQueryChange(e.target.value)}
                  onFocus={() => staffSuggestions.length > 0 && setShowStaffSuggestions(true)}
                  placeholder="Search by username or nickname"
                />
                <PortalDropdown anchorRef={staffInputRef} open={showStaffSuggestions} onClose={() => setShowStaffSuggestions(false)} className="autocomplete-list-portal">
                  {staffSuggestions.map(s => (
                    <div key={s.discordId} className="autocomplete-item" onClick={() => pickStaff(s)}>
                      <img className="avatar-img" style={{ width: 26, height: 26 }} src={discordAvatarUrl(s.discordId, s.avatarHash)} alt="" />
                      <span className="autocomplete-name">{s.nickname ?? s.username}</span>
                    </div>
                  ))}
                </PortalDropdown>
              </div>
              <label>Reason</label>
              <textarea rows={2} required value={strikeReason} onChange={e => setStrikeReason(e.target.value)} />
              <button className="primary" type="submit" disabled={strikeSubmitting}>{strikeSubmitting ? "Issuing…" : "Issue Strike"}</button>
            </form>
          </div>

          <div className="card">
            <h2>Currently On Strike ({groupedStrikes.length})</h2>
            {loading && <p className="muted">Loading…</p>}
            {!loading && groupedStrikes.length === 0 && <p className="muted">Nobody currently has an active strike.</p>}
            <div className="log-card-list">
              {groupedStrikes.map(([discordId, strikes]) => (
                <div className="log-card" key={discordId}>
                  <div className="log-card-issuer-row">
                    <img className="avatar-img" style={{ width: 28, height: 28 }} src={discordAvatarUrl(discordId, strikes[0].target_avatar_hash)} alt="" />
                    <span className="log-card-issuer-name">{strikes[0].target_username ?? discordId}</span>
                    <span className="active-bolo-label" style={{ marginLeft: "auto" }}>{strikes.length} / 3 active</span>
                  </div>
                  <div className="log-card-body">
                    {strikes.map(s => (
                      <div key={s.id} className="log-card-field" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span>
                          <span className="muted">Strike {s.role_slot}:</span> {s.reason}
                          <span className="muted"> ({expiresLabel(s.expires_at)}, issued by {s.issuer_username ?? s.issued_by} {timeAgo(s.created_at)})</span>
                        </span>
                        <button className="secondary small" onClick={() => removeStrike(s.id)}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Column 2: Promotions -- promote/demote form + suggestions ---------- */}
        <div className="dashboard-col">
          {canReviewBigActions && (
            <div className="card">
              <h2>Promote / Demote</h2>
              {rankChangeError && <div className="error-banner">{rankChangeError}</div>}
              {rankChangeSuccess && <div className="success-banner">Done.</div>}
              <form onSubmit={submitRankChange}>
                <label>Action</label>
                <CustomSelect
                  value={rankChangeAction}
                  onChange={setRankChangeAction}
                  options={[{ value: "promote", label: "Promote" }, { value: "demote", label: "Demote" }]}
                />
                <label style={{ marginTop: 12 }}>Staff Member</label>
                <div className="autocomplete-wrap">
                  <input
                    ref={rankChangeSearch.inputRef}
                    required
                    autoComplete="off"
                    value={rankChangeSearch.query}
                    onChange={e => rankChangeSearch.onQueryChange(e.target.value)}
                    onFocus={() => rankChangeSearch.suggestions.length > 0 && rankChangeSearch.setShowSuggestions(true)}
                    placeholder="Search by username or nickname"
                  />
                  <PortalDropdown anchorRef={rankChangeSearch.inputRef} open={rankChangeSearch.showSuggestions} onClose={() => rankChangeSearch.setShowSuggestions(false)} className="autocomplete-list-portal">
                    {rankChangeSearch.suggestions.map(s => (
                      <div key={s.discordId} className="autocomplete-item" onClick={() => rankChangeSearch.pick(s)}>
                        <img className="avatar-img" style={{ width: 26, height: 26 }} src={discordAvatarUrl(s.discordId, s.avatarHash)} alt="" />
                        <span className="autocomplete-name">{s.nickname ?? s.username}</span>
                      </div>
                    ))}
                  </PortalDropdown>
                </div>

                {rankChangeSearch.target && (
                  <p className="muted" style={{ marginTop: -6 }}>Current rank: {rankChangeSearch.target.rankLabel ?? "Unknown"}</p>
                )}

                <label>New Rank</label>
                {rankOptions.length > 0 ? (
                  <CustomSelect value={newRank} onChange={setNewRank} options={rankOptions} />
                ) : (
                  <p className="muted" style={{ marginTop: -6 }}>
                    {rankChangeSearch.target ? "No valid rank available for this action." : "Pick a staff member first."}
                  </p>
                )}

                <label style={{ marginTop: 12 }}>Reason</label>
                <textarea rows={2} required value={rankChangeReason} onChange={e => setRankChangeReason(e.target.value)} />
                <button className="primary" type="submit" disabled={rankChangeSubmitting || rankOptions.length === 0}>
                  {rankChangeSubmitting ? "Submitting…" : rankChangeAction === "promote" ? "Promote" : "Demote"}
                </button>
              </form>
            </div>
          )}

          {canReviewBigActions && (
            <div className="card">
              <h2>Pending Rank Change Requests ({pendingPromotions.length})</h2>
              {pendingPromotions.length === 0 ? (
                <p className="muted">No pending requests.</p>
              ) : (
                <div className="loa-list">
                  {pendingPromotions.map(s => (
                    <div className="loa-card" key={s.id}>
                      <div className="log-card-issuer-row" style={{ marginBottom: 8 }}>
                        <img className="avatar-img" style={{ width: 26, height: 26 }} src={discordAvatarUrl(s.target_discord_id, s.target_avatar_hash)} alt="" />
                        <span className="log-card-username">{s.target_username ?? s.target_discord_id}</span>
                        <span className={`badge ${s.action === "promote" ? "loa-status-approved" : "loa-status-denied"}`} style={{ marginLeft: "auto" }}>{s.action === "promote" ? "Promote" : "Demote"}</span>
                      </div>
                      <div className="log-card-field"><span className="muted">Current rank:</span> {s.old_rank_label ?? "Unknown"}</div>
                      <div className="log-card-field"><span className="muted">New rank:</span> {s.new_rank_label}</div>
                      <div className="log-card-field" style={{ marginBottom: 8 }}><span className="muted">Reason:</span> {s.reason}</div>
                      <div className="log-card-issuer-row" style={{ marginBottom: 8 }}>
                        <span className="muted" style={{ fontSize: 12.5 }}>Requested by</span>
                        <img className="avatar-img" style={{ width: 18, height: 18 }} src={discordAvatarUrl(s.requested_by, s.requester_avatar_hash)} alt="" />
                        <span style={{ fontSize: 12.5 }}>{s.requester_username ?? s.requested_by}</span>
                      </div>
                      <div className="button-row">
                        <button className="btn-green small" onClick={() => reviewRankChange(s.id, "approved")}>Approve</button>
                        <button className="btn-red small" onClick={() => reviewRankChange(s.id, "denied")}>Deny</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {canReviewBigActions && (
            <div className="card">
              <h2>Terminate</h2>
              {terminateError && <div className="error-banner">{terminateError}</div>}
              {terminateSuccess && <div className="success-banner">Done.</div>}
              <form onSubmit={submitTerminate}>
                <label>Staff Member</label>
                <div className="autocomplete-wrap">
                  <input
                    ref={terminateSearch.inputRef}
                    required
                    autoComplete="off"
                    value={terminateSearch.query}
                    onChange={e => terminateSearch.onQueryChange(e.target.value)}
                    onFocus={() => terminateSearch.suggestions.length > 0 && terminateSearch.setShowSuggestions(true)}
                    placeholder="Search by username or nickname"
                  />
                  <PortalDropdown anchorRef={terminateSearch.inputRef} open={terminateSearch.showSuggestions} onClose={() => terminateSearch.setShowSuggestions(false)} className="autocomplete-list-portal">
                    {terminateSearch.suggestions.map(s => (
                      <div key={s.discordId} className="autocomplete-item" onClick={() => terminateSearch.pick(s)}>
                        <img className="avatar-img" style={{ width: 26, height: 26 }} src={discordAvatarUrl(s.discordId, s.avatarHash)} alt="" />
                        <span className="autocomplete-name">{s.nickname ?? s.username}</span>
                      </div>
                    ))}
                  </PortalDropdown>
                </div>
                {terminateSearch.target && (
                  <p className="muted" style={{ marginTop: -6 }}>Current rank: {terminateSearch.target.rankLabel ?? "Unknown"}</p>
                )}
                <label>Reason</label>
                <textarea rows={2} required value={terminateReason} onChange={e => setTerminateReason(e.target.value)} />
                <button className="primary" type="submit" disabled={terminateSubmitting} style={{ background: "#e53935" }}>
                  {terminateSubmitting ? "Processing…" : "Terminate"}
                </button>
              </form>
            </div>
          )}

          {canProcessResignations && (
            <div className="card">
              <h2>Process a Resignation</h2>
              <p className="muted" style={{ marginTop: -8 }}>For processing someone else's resignation on their behalf.</p>
              {resignError && <div className="error-banner">{resignError}</div>}
              {resignSuccess && <div className="success-banner">Done.</div>}
              <form onSubmit={submitResignation}>
                <label>Staff Member</label>
                <div className="autocomplete-wrap">
                  <input
                    ref={resignSearch.inputRef}
                    required
                    autoComplete="off"
                    value={resignSearch.query}
                    onChange={e => resignSearch.onQueryChange(e.target.value)}
                    onFocus={() => resignSearch.suggestions.length > 0 && resignSearch.setShowSuggestions(true)}
                    placeholder="Search by username or nickname"
                  />
                  <PortalDropdown anchorRef={resignSearch.inputRef} open={resignSearch.showSuggestions} onClose={() => resignSearch.setShowSuggestions(false)} className="autocomplete-list-portal">
                    {resignSearch.suggestions.map(s => (
                      <div key={s.discordId} className="autocomplete-item" onClick={() => resignSearch.pick(s)}>
                        <img className="avatar-img" style={{ width: 26, height: 26 }} src={discordAvatarUrl(s.discordId, s.avatarHash)} alt="" />
                        <span className="autocomplete-name">{s.nickname ?? s.username}</span>
                      </div>
                    ))}
                  </PortalDropdown>
                </div>
                <label>Notes</label>
                <textarea rows={2} value={resignReason} onChange={e => setResignReason(e.target.value)} />
                <button className="primary" type="submit" disabled={resignSubmitting}>
                  {resignSubmitting ? "Processing…" : "Process Resignation"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ---------- Column 3: Leave of Absence -- pending + active ---------- */}
        <div className="dashboard-col">
          <div className="card">
            <h2>Pending LOA Requests</h2>
            {pendingLOAs.length === 0 ? (
              <p className="muted">No pending requests.</p>
            ) : (
              <div className="loa-list">
                {pendingLOAs.map(r => (
                  <div className="loa-card" key={r.id}>
                    <div className="loa-card-top loa-card-top-stack">
                      <span className="log-card-issuer-row" style={{ marginBottom: 0 }}>
                        <img className="avatar-img" style={{ width: 22, height: 22 }} src={discordAvatarUrl(r.discord_id, r.requester_avatar_hash)} alt="" />
                        <span className="log-card-username">{r.requester_username ?? r.discord_id}</span>
                      </span>
                      <span className="muted">{new Date(r.start_date).toLocaleDateString()} to {new Date(r.end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="muted" style={{ marginBottom: 8 }}>{r.reason}</div>
                    <div className="button-row">
                      <button className="btn-green small" onClick={() => reviewLOA(r.id, "approved")}>Approve</button>
                      <button className="btn-red small" onClick={() => reviewLOA(r.id, "denied")}>Deny</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Active LOAs ({activeLOAs.length})</h2>
            {activeLOAs.length === 0 ? (
              <p className="muted">Nobody is currently on LOA.</p>
            ) : (
              <div className="loa-list">
                {activeLOAs.map(r => (
                  <div className="loa-card" key={r.id}>
                    <div className="loa-card-top loa-card-top-stack">
                      <span className="log-card-issuer-row" style={{ marginBottom: 0 }}>
                        <img className="avatar-img" style={{ width: 22, height: 22 }} src={discordAvatarUrl(r.discord_id, r.requester_avatar_hash)} alt="" />
                        <span className="log-card-username">{r.requester_username ?? r.discord_id}</span>
                      </span>
                      <span className="muted">Returns {new Date(r.end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="muted" style={{ marginBottom: 8 }}>{r.reason}</div>
                    <div className="button-row">
                      <button className="secondary small" onClick={() => openExtend(r.discord_id, r.end_date)}>Extend / Change Date</button>
                      <button className="btn-red small" onClick={() => endLOANow(r.discord_id)}>End Now</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {extendingDiscordId && (
        <div className="modal-backdrop" onClick={() => setExtendingDiscordId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Change Return Date</h2>
            {extendError && <div className="error-banner">{extendError}</div>}
            <form onSubmit={submitExtend}>
              <label>New Return Date</label>
              <input type="date" required min={todayLocalISO()} value={extendDate} onChange={e => setExtendDate(e.target.value)} />
              <div className="button-row">
                <button className="primary" type="submit">Save</button>
                <button className="secondary" type="button" onClick={() => setExtendingDiscordId(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

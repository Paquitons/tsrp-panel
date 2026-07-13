import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { timeAgo, discordAvatarUrl, parseLocalDateInput, toDateInputValue, todayLocalISO } from "../utils";
import PortalDropdown from "../components/PortalDropdown";

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

  const [activeStrikes, setActiveStrikes] = useState([]);
  const [pendingLOAs, setPendingLOAs] = useState([]);
  const [activeLOAs, setActiveLOAs] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------- Issue Strike: staff search-autocomplete ----------
  const [strikeTarget, setStrikeTarget] = useState(null); // { discordId, username, avatarHash }
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
    <div className="content">
      <div className="page-header">
        <h1>HR Panel</h1>
        <p className="muted">Strikes and Leave of Absence, in one place. Promotions/demotions/terminations coming soon.</p>
      </div>

      <div className="two-col">
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
                    {s.nickname && <span className="autocomplete-hint">@{s.username}</span>}
                  </div>
                ))}
              </PortalDropdown>
            </div>
            <label>Reason</label>
            <textarea rows={2} required value={strikeReason} onChange={e => setStrikeReason(e.target.value)} />
            <button className="primary" type="submit" disabled={strikeSubmitting}>{strikeSubmitting ? "Issuing…" : "Issue Strike"}</button>
          </form>

          <h2 style={{ marginTop: 24 }}>Pending LOA Requests</h2>
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

          <h2 style={{ marginTop: 24 }}>Active LOAs ({activeLOAs.length})</h2>
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

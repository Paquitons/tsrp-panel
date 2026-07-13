import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { timeAgo } from "../utils";

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
  const [loading, setLoading] = useState(true);

  const [strikeDiscordId, setStrikeDiscordId] = useState("");
  const [strikeReason, setStrikeReason] = useState("");
  const [strikeError, setStrikeError] = useState(null);
  const [strikeSubmitting, setStrikeSubmitting] = useState(false);

  async function refresh() {
    try {
      const { strikes } = await apiFetch("/strikes/active");
      setActiveStrikes(strikes);
    } catch { /* ignore */ }
    try {
      const { requests } = await apiFetch("/loa/pending");
      setPendingLOAs(requests);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => {
    if (!canAccess) return;
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [canAccess]);

  async function submitStrike(e) {
    e.preventDefault();
    setStrikeError(null);
    setStrikeSubmitting(true);
    try {
      await apiFetch("/strikes", { method: "POST", body: { discordId: strikeDiscordId.trim(), reason: strikeReason } });
      setStrikeDiscordId("");
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
            <label>Staff Member's Discord ID</label>
            <input required value={strikeDiscordId} onChange={e => setStrikeDiscordId(e.target.value)} placeholder="e.g. 111222333444555666" />
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
                  <div className="loa-card-top">
                    <span className="log-card-username">{r.discord_id}</span>
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
          <h2>Currently On Strike ({groupedStrikes.length})</h2>
          {loading && <p className="muted">Loading…</p>}
          {!loading && groupedStrikes.length === 0 && <p className="muted">Nobody currently has an active strike.</p>}
          <div className="log-card-list">
            {groupedStrikes.map(([discordId, strikes]) => (
              <div className="log-card" key={discordId}>
                <div className="log-card-issuer-row">
                  <span className="log-card-issuer-name">{discordId}</span>
                  <span className={`active-bolo-label`} style={{ marginLeft: "auto" }}>{strikes.length} / 3 active</span>
                </div>
                <div className="log-card-body">
                  {strikes.map(s => (
                    <div key={s.id} className="log-card-field" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span>
                        <span className="muted">Strike {s.role_slot}:</span> {s.reason}
                        <span className="muted"> ({expiresLabel(s.expires_at)}, issued {timeAgo(s.created_at)})</span>
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
    </div>
  );
}

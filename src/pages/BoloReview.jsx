import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { TYPE_LABELS, timeAgo } from "../utils";
import Avatar from "../components/Avatar";

/**
 * IA+ review queue for Ban BOLOs. The bot has its own parallel /bolo
 * command hitting the exact same punishment_logs rows directly (shared
 * SQLite file, no API call between the two) -- accepting/declining here
 * shows up on the bot's side and vice versa, since both are just reading
 * the same underlying row rather than two copies kept in sync.
 *
 * "Skip" never touches the server -- skipped ids are tracked only in this
 * component's state for the current session, matching the bot's own
 * per-review-session skip behavior.
 */
export default function BoloReview() {
  const { user } = useAuth();
  const canAccess = user?.tier === "ia" || user?.tier === "management" || user?.tier === "director";

  const [bolo, setBolo] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [skippedIds, setSkippedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  const loadNext = useCallback(async (excludeIds) => {
    setLoading(true);
    setError(null);
    setShowDeclineForm(false);
    setDeclineReason("");
    try {
      const query = excludeIds.length ? `?excludeIds=${excludeIds.join(",")}` : "";
      const result = await apiFetch(`/punishments/bolo/queue${query}`);
      setBolo(result.bolo);
      setRemaining(result.remaining);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess) loadNext([]);
  }, [canAccess, loadNext]);

  if (!canAccess) return <p className="muted">You don't have permission to view this page.</p>;

  async function handleAccept() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/punishments/${bolo.id}/bolo-accept`, { method: "PATCH" });
      setSkippedIds([]); // this BOLO is resolved, no need to keep excluding it going forward
      await loadNext([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/punishments/${bolo.id}/bolo-decline`, { method: "PATCH", body: { reason: declineReason } });
      setSkippedIds([]);
      await loadNext([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleSkip() {
    const nextSkipped = [...skippedIds, bolo.id];
    setSkippedIds(nextSkipped);
    loadNext(nextSkipped);
  }

  return (
    <div className="page-section" style={{ maxWidth: 640 }}>
      <h2>Ban BOLO Review</h2>
      {error && <div className="error-banner">{error}</div>}

      {loading && <p className="muted">Loading…</p>}

      {!loading && !bolo && (
        <p className="muted">No pending Ban BOLOs to review. 🎉</p>
      )}

      {!loading && bolo && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar username={bolo.target_roblox_username} robloxId={bolo.robloxId} size={56} />
            <div>
              <div className="log-card-username" style={{ fontSize: 17 }}>{bolo.target_roblox_username}</div>
              <div className="muted">{bolo.robloxId ? `ID: ${bolo.robloxId}` : "Roblox ID unknown"}</div>
            </div>
          </div>

          <div>
            <span className="muted">Submitted By</span>
            <div>{bolo.issuer_username ?? bolo.issuer_discord_id}</div>
          </div>

          <div>
            <span className="muted">Ban Reason</span>
            <div>{bolo.reason}</div>
          </div>

          {bolo.description && (
            <div>
              <span className="muted">Notes / Evidence</span>
              <div>{bolo.description}</div>
            </div>
          )}

          <div>
            <span className="muted">Moderation History</span>
            {bolo.moderationHistory.length === 0 && <div className="muted">No prior history.</div>}
            {bolo.moderationHistory.map((h, i) => (
              <div key={i}>{TYPE_LABELS[h.type] ?? h.type} — {h.reason} <span className="muted">({timeAgo(h.created_at)})</span></div>
            ))}
          </div>

          <div>
            <span className="muted">Date Submitted</span>
            <div>{timeAgo(bolo.created_at)}</div>
          </div>

          <div className="muted">{remaining} pending BOLO{remaining === 1 ? "" : "s"} in queue</div>

          {!showDeclineForm && (
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-green" disabled={busy} onClick={handleAccept}>Accept</button>
              <button className="btn-red" disabled={busy} onClick={() => setShowDeclineForm(true)}>Decline</button>
              <button className="secondary" disabled={busy} onClick={handleSkip}>Skip</button>
            </div>
          )}

          {showDeclineForm && (
            <form onSubmit={handleDecline} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <textarea
                placeholder="Reason for declining this BOLO"
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                required
                maxLength={300}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-red" type="submit" disabled={busy}>{busy ? "Declining…" : "Confirm Decline"}</button>
                <button className="secondary" type="button" disabled={busy} onClick={() => setShowDeclineForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

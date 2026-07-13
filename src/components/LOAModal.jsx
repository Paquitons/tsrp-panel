import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import { discordAvatarUrl } from "../utils";

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function LOAModal({ onClose }) {
  const { user } = useAuth();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [myPending, setMyPending] = useState(null);
  const [myActive, setMyActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [allPending, setAllPending] = useState([]);
  const [canReview, setCanReview] = useState(false);

  async function refresh() {
    try {
      const { pending, active, history } = await apiFetch("/loa/mine");
      setMyPending(pending);
      setMyActive(active);
      setHistory(history);
    } catch { /* ignore */ }

    if (user?.canReviewLOA) {
      try {
        const { requests } = await apiFetch("/loa/pending");
        setAllPending(requests);
        setCanReview(true);
      } catch {
        setCanReview(false);
      }
    }
  }

  useEffect(() => { refresh(); }, []);

  async function submit(e) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiFetch("/loa", {
        method: "POST",
        body: {
          startDate: new Date(startDate).getTime(),
          endDate: new Date(endDate).getTime(),
          reason,
        },
      });
      setStartDate("");
      setEndDate("");
      setReason("");
      await refresh();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function review(requestId, status) {
    try {
      await apiFetch(`/loa/${requestId}`, { method: "PATCH", body: { status } });
      await refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal loa-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title-row">
          <h2>Leave of Absence</h2>
          <button className="secondary small" onClick={onClose}>Close</button>
        </div>

        {myActive ? (
          <div className="loa-card" style={{ marginBottom: 16 }}>
            <div className="loa-card-top">
              <span className="log-card-username">Currently on LOA</span>
              <span className="badge loa-status-approved">active</span>
            </div>
            <div className="muted">{new Date(myActive.start_date).toLocaleDateString()} to {new Date(myActive.end_date).toLocaleDateString()}</div>
            <div className="muted">{myActive.reason}</div>
          </div>
        ) : myPending ? (
          <div className="loa-card" style={{ marginBottom: 16 }}>
            <div className="loa-card-top">
              <span className="log-card-username">Request pending approval</span>
              <span className="badge loa-status-pending">pending</span>
            </div>
            <div className="muted">{new Date(myPending.start_date).toLocaleDateString()} to {new Date(myPending.end_date).toLocaleDateString()}</div>
            <div className="muted">{myPending.reason}</div>
          </div>
        ) : (
          <>
            {submitError && <div className="error-banner">{submitError}</div>}
            <form onSubmit={submit} className="loa-form">
              <div className="loa-date-row">
                <div>
                  <label>Start Date</label>
                  <input type="date" required min={todayISO()} value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label>End Date</label>
                  <input type="date" required min={startDate || todayISO()} value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <label>Reason</label>
              <textarea rows={2} required value={reason} onChange={e => setReason(e.target.value)} />
              <button className="primary" type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit Request"}</button>
            </form>
          </>
        )}

        {canReview && allPending.length > 0 && (
          <>
            <h3 className="modal-subheading">Pending Requests</h3>
            <div className="loa-list">
              {allPending.map(r => (
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
                    <button className="btn-green small" onClick={() => review(r.id, "approved")}>Approve</button>
                    <button className="btn-red small" onClick={() => review(r.id, "denied")}>Deny</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h3 className="modal-subheading">My History</h3>
        {history.length === 0 ? (
          <p className="muted">No LOA requests yet.</p>
        ) : (
          <div className="loa-list">
            {history.map(r => (
              <div className="loa-card" key={r.id}>
                <div className="loa-card-top">
                  <span className="muted">{new Date(r.start_date).toLocaleDateString()} to {new Date(r.end_date).toLocaleDateString()}</span>
                  <span className={`badge loa-status-${r.status}`}>{r.status}</span>
                </div>
                <div className="muted">{r.reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";

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

  const [mine, setMine] = useState([]);
  const [pending, setPending] = useState([]);
  const [canReview, setCanReview] = useState(false);

  async function refresh() {
    try {
      const { requests } = await apiFetch("/loa/mine");
      setMine(requests);
    } catch { /* ignore */ }

    if (user?.canReviewLOA) {
      try {
        const { requests } = await apiFetch("/loa/pending");
        setPending(requests);
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

  async function review(id, status) {
    try {
      await apiFetch(`/loa/${id}`, { method: "PATCH", body: { status } });
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

        {canReview && pending.length > 0 && (
          <>
            <h3 className="modal-subheading">Pending Requests</h3>
            <div className="loa-list">
              {pending.map(r => (
                <div className="loa-card" key={r.id}>
                  <div className="loa-card-top">
                    <span className="log-card-username">{r.discord_id}</span>
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

        <h3 className="modal-subheading">My Requests</h3>
        {mine.length === 0 ? (
          <p className="muted">No LOA requests yet.</p>
        ) : (
          <div className="loa-list">
            {mine.map(r => (
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

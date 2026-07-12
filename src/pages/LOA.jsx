import { useEffect, useState } from "react";
import { apiFetch } from "../api";

export default function LOA() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [mine, setMine] = useState([]);
  const [pending, setPending] = useState([]);
  const [canReview, setCanReview] = useState(true); // optimistic; hides itself if the API 403s

  async function refresh() {
    try {
      const { requests } = await apiFetch("/loa/mine");
      setMine(requests);
    } catch { /* ignore */ }

    try {
      const { requests } = await apiFetch("/loa/pending");
      setPending(requests);
      setCanReview(true);
    } catch {
      setCanReview(false);
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
    <div className="content">
      <h1>Leave of Absence</h1>

      <div className="card">
        <h2>Submit a Request</h2>
        {submitError && <div className="error-banner">{submitError}</div>}
        <form onSubmit={submit}>
          <label>Start Date</label>
          <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} />
          <label>End Date</label>
          <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} />
          <label>Reason</label>
          <textarea rows={3} required value={reason} onChange={e => setReason(e.target.value)} />
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>

      {canReview && pending.length > 0 && (
        <div className="card">
          <h2>Pending Requests (Director+)</h2>
          <table>
            <thead><tr><th>Requester</th><th>Dates</th><th>Reason</th><th></th></tr></thead>
            <tbody>
              {pending.map(r => (
                <tr key={r.id}>
                  <td>{r.discord_id}</td>
                  <td>{new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}</td>
                  <td>{r.reason}</td>
                  <td>
                    <button className="primary" style={{ marginRight: 6, padding: "4px 10px" }} onClick={() => review(r.id, "approved")}>Approve</button>
                    <button className="danger" style={{ padding: "4px 10px" }} onClick={() => review(r.id, "denied")}>Deny</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2>My Requests</h2>
        {mine.length === 0 ? (
          <p className="muted">No LOA requests yet.</p>
        ) : (
          <table>
            <thead><tr><th>Dates</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>
              {mine.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}</td>
                  <td>{r.reason}</td>
                  <td style={{ textTransform: "capitalize" }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { apiFetch } from "../api";
import { useApiQuery } from "../hooks/useApiQuery";
import AutoGrowTextarea from "./AutoGrowTextarea";
import Modal from "./primitives/Modal";
import Banner from "./primitives/Banner";

const dateText = ms => new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

// Ask for a week off the on-duty quota. Management approves or denies it.
// You can still go on duty while exempt; you just are not counted as
// missing the quota that week.
export default function QuotaExemptModal({ onClose }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const mine = useApiQuery(["quota-exemptions", "mine"], "/quota-exemptions/mine");
  const data = mine.data;

  async function submit(e) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      await apiFetch("/quota-exemptions", { method: "POST", body: { reason } });
      setReason("");
      await mine.refetch();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const canRequest = data && !data.pending && !data.active && !data.nextAllowedAt;

  return (
    <Modal onClose={onClose} className="loa-modal" labelledBy="quota-exempt-title">
      <div className="modal-title-row">
        <h2 id="quota-exempt-title">Quota Exemption</h2>
        <button className="secondary small" onClick={onClose}>Close</button>
      </div>
      <p className="muted">Ask to be excused from the on-duty quota for a week. You can still go on duty while exempt. You can ask once every two weeks.</p>

      {mine.isLoading && <p className="muted">Loading…</p>}
      {error && <Banner>{error}</Banner>}

      {data?.active && (
        <div className="loa-card" style={{ marginBottom: 16 }}>
          <div className="loa-card-top">
            <span className="log-card-username">Exempt from the quota</span>
            <span className="badge loa-status-approved">active</span>
          </div>
          <div className="muted">Until {dateText(data.active.ends_at)}</div>
        </div>
      )}
      {data?.pending && (
        <div className="loa-card" style={{ marginBottom: 16 }}>
          <div className="loa-card-top">
            <span className="log-card-username">Request waiting for approval</span>
            <span className="badge loa-status-pending">pending</span>
          </div>
          <div className="muted">{data.pending.reason}</div>
        </div>
      )}
      {data && !data.pending && !data.active && data.nextAllowedAt && (
        <p className="muted">You can request another exemption from {dateText(data.nextAllowedAt)}.</p>
      )}
      {canRequest && (
        <form onSubmit={submit} className="loa-form">
          <label>Reason</label>
          <AutoGrowTextarea required value={reason} onChange={e => setReason(e.target.value)} />
          <button className="primary" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit Request"}</button>
        </form>
      )}
    </Modal>
  );
}

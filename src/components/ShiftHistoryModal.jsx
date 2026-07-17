import { useEffect, useState, Fragment } from "react";
import { apiFetch } from "../api";
import { formatDuration } from "../utils";

export default function ShiftHistoryModal({ onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reports, setReports] = useState({});
  const [reportLoading, setReportLoading] = useState(null);

  useEffect(() => {
    apiFetch("/shifts/mine")
      .then(({ shifts }) => setHistory(shifts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleReport(shiftId) {
    if (expandedId === shiftId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(shiftId);
    if (!reports[shiftId]) {
      setReportLoading(shiftId);
      try {
        const report = await apiFetch(`/shifts/${shiftId}/report`);
        setReports(prev => ({ ...prev, [shiftId]: report }));
      } catch (err) {
        setReports(prev => ({ ...prev, [shiftId]: { error: err.message } }));
      } finally {
        setReportLoading(null);
      }
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal shift-history-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title-row">
          <h2>Shift History</h2>
          <button className="secondary small" onClick={onClose}>Close</button>
        </div>

        {loading && <p className="muted">Loading…</p>}
        {!loading && history.length === 0 && <p className="muted">No completed shifts yet.</p>}

        {history.length > 0 && (
          <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>Started</th><th>Duration</th><th>Break</th><th>Type</th><th></th></tr>
            </thead>
            <tbody>
              {history.map(s => {
                const durationSeconds = Math.floor((s.ended_at - s.started_at) / 1000) - s.break_seconds;
                const isExpanded = expandedId === s.id;
                const report = reports[s.id];
                return (
                  <Fragment key={s.id}>
                    <tr>
                      <td>{new Date(s.started_at).toLocaleString()}</td>
                      <td>{formatDuration(durationSeconds)}</td>
                      <td className="muted">{formatDuration(s.break_seconds)}</td>
                      <td className="muted">{s.shift_type || "N/A"}</td>
                      <td>
                        <button className="secondary small" onClick={() => toggleReport(s.id)}>
                          {isExpanded ? "Hide" : "Report"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="report-row">
                          {reportLoading === s.id && <p className="muted">Loading report…</p>}
                          {report?.error && <div className="error-banner">{report.error}</div>}
                          {report && !report.error && (
                            <div className="shift-report">
                              <div className="report-stats">
                                <div><span className="stat-value">{formatDuration(report.durationSeconds)}</span><span className="muted"> active</span></div>
                                <div><span className="stat-value">{formatDuration(report.breakSeconds)}</span><span className="muted"> on break</span></div>
                                <div><span className="stat-value">{report.punishmentLogs.length}</span><span className="muted"> log(s) issued</span></div>
                              </div>
                              {report.punishmentLogs.length > 0 ? (
                                <div className="table-scroll">
                                <table className="data-table">
                                  <thead><tr><th>Type</th><th>Target</th><th>Reason</th></tr></thead>
                                  <tbody>
                                    {report.punishmentLogs.map(log => (
                                      <tr key={log.id}>
                                        <td><span className={`badge ${log.type}`}>{log.type.replace("_", " ")}</span></td>
                                        <td>{log.target_roblox_username}</td>
                                        <td>{log.reason}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                </div>
                              ) : (
                                <p className="muted">No punishment logs were issued during this shift.</p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

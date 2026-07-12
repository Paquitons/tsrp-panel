import { useEffect, useState, Fragment } from "react";
import { apiFetch } from "../api";

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function Shifts() {
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [onBreak, setOnBreak] = useState(false);
  const [shiftType, setShiftType] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reports, setReports] = useState({});
  const [reportLoading, setReportLoading] = useState(null);

  // Live-ticking duration display for the active shift.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  async function refresh() {
    try {
      const [activeRes, historyRes] = await Promise.all([
        apiFetch("/shifts/active"),
        apiFetch("/shifts/mine"),
      ]);
      setActive(activeRes.shift);
      setOnBreak(!!activeRes.shift?.break_started_at);
      setHistory(historyRes.shifts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function startShift() {
    setError(null);
    try {
      await apiFetch("/shifts/start", { method: "POST", body: { shiftType: shiftType || undefined } });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleBreak() {
    setError(null);
    try {
      const { onBreak } = await apiFetch("/shifts/break", { method: "POST" });
      setOnBreak(onBreak);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function endShift() {
    setError(null);
    try {
      await apiFetch("/shifts/end", { method: "POST" });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

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

  const liveDurationSeconds = active
    ? Math.floor((now - active.started_at) / 1000) - active.break_seconds - (onBreak && active.break_started_at ? Math.floor((now - active.break_started_at) / 1000) : 0)
    : 0;

  if (loading) return <div className="content">Loading…</div>;

  return (
    <div className="content">
      <div className="page-header">
        <h1>Shifts</h1>
        <p className="muted">Track your on-duty time and review past shift activity.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>Current Shift</h2>
        {active ? (
          <>
            <div className="shift-timer">
              <span className={`status-dot ${onBreak ? "status-break" : "status-active"}`} />
              <span className="timer-value">{formatDuration(Math.max(0, liveDurationSeconds))}</span>
              {onBreak && <span className="badge" style={{ background: "#4a3f1a", color: "#f9a825" }}>On Break</span>}
            </div>
            <p className="muted">Started {new Date(active.started_at).toLocaleString()}{active.shift_type ? ` — ${active.shift_type}` : ""}</p>
            <div className="button-row">
              <button className="secondary" onClick={toggleBreak}>
                {onBreak ? "Resume Shift" : "Take Break"}
              </button>
              <button className="danger" onClick={endShift}>End Shift</button>
            </div>
          </>
        ) : (
          <>
            <label>Shift Type (optional)</label>
            <input value={shiftType} onChange={e => setShiftType(e.target.value)} placeholder="e.g. 50/50, Admin, Support" />
            <button className="primary" onClick={startShift}>Start Shift</button>
          </>
        )}
      </div>

      <div className="card">
        <h2>Recent Shifts</h2>
        {history.length === 0 ? (
          <p className="muted">No completed shifts yet.</p>
        ) : (
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
                      <td className="muted">{s.shift_type || "—"}</td>
                      <td>
                        <button className="secondary small" onClick={() => toggleReport(s.id)}>
                          {isExpanded ? "Hide Report" : "View Report"}
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
                                <table className="data-table">
                                  <thead><tr><th>Type</th><th>Target</th><th>Reason</th><th>Time</th></tr></thead>
                                  <tbody>
                                    {report.punishmentLogs.map(log => (
                                      <tr key={log.id}>
                                        <td><span className={`badge ${log.type}`}>{log.type.replace("_", " ")}</span></td>
                                        <td>{log.target_roblox_username}</td>
                                        <td>{log.reason}</td>
                                        <td className="muted">{new Date(log.created_at).toLocaleTimeString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
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
        )}
      </div>
    </div>
  );
}

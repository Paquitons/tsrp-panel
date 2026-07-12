import { useEffect, useState } from "react";
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

  if (loading) return <div className="content">Loading...</div>;

  return (
    <div className="content">
      <h1>Shifts</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>Current Shift</h2>
        {active ? (
          <>
            <p className="muted">Started {new Date(active.started_at).toLocaleString()}{active.shift_type ? ` — ${active.shift_type}` : ""}</p>
            {onBreak && <p className="muted">Currently on break.</p>}
            <button className="secondary" onClick={toggleBreak} style={{ marginRight: 8 }}>
              {onBreak ? "Resume Shift" : "Take Break"}
            </button>
            <button className="danger" onClick={endShift}>End Shift</button>
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
          <table>
            <thead>
              <tr><th>Started</th><th>Duration</th><th>Break</th><th>Type</th></tr>
            </thead>
            <tbody>
              {history.map(s => {
                const durationSeconds = Math.floor((s.ended_at - s.started_at) / 1000) - s.break_seconds;
                return (
                  <tr key={s.id}>
                    <td>{new Date(s.started_at).toLocaleString()}</td>
                    <td>{formatDuration(durationSeconds)}</td>
                    <td>{formatDuration(s.break_seconds)}</td>
                    <td>{s.shift_type || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

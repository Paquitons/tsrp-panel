import { useState } from "react";
import { apiFetch } from "../api";

const TYPES = [
  { value: "warning", label: "Warning" },
  { value: "kick", label: "Kick" },
  { value: "ban", label: "Ban" },
  { value: "temp_ban", label: "Temp Ban" },
  { value: "bolo", label: "Ban BOLO" },
  { value: "note", label: "Note" },
];

export default function Punishments() {
  const [form, setForm] = useState({ targetRobloxUsername: "", type: "warning", reason: "", description: "", unbanAt: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hidingId, setHidingId] = useState(null);

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function createLog(e) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(false);
    setCreating(true);

    try {
      const body = {
        targetRobloxUsername: form.targetRobloxUsername,
        type: form.type,
        reason: form.reason,
        description: form.description || undefined,
      };
      if (form.type === "temp_ban") {
        if (!form.unbanAt) throw new Error("An unban date is required for temp bans.");
        body.unbanAt = new Date(form.unbanAt).getTime();
      }

      await apiFetch("/punishments", { method: "POST", body });
      setCreateSuccess(true);
      setForm({ targetRobloxUsername: "", type: "warning", reason: "", description: "", unbanAt: "" });
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function search(e) {
    e?.preventDefault();
    setSearching(true);
    try {
      const { logs } = await apiFetch(`/punishments?username=${encodeURIComponent(searchTerm)}`);
      setResults(logs);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function toggleHide(id) {
    setHidingId(id);
    try {
      await apiFetch(`/punishments/${id}/hide`, { method: "PATCH" });
      setResults(prev => prev.map(log => log.id === id ? { ...log, hidden: log.hidden ? 0 : 1 } : log));
    } catch (err) {
      alert(err.message);
    } finally {
      setHidingId(null);
    }
  }

  return (
    <div className="content">
      <div className="page-header">
        <h1>Punishment Logs</h1>
        <p className="muted">Issue and review moderation actions against players.</p>
      </div>

      <div className="card">
        <h2>New Log</h2>
        {createError && <div className="error-banner">{createError}</div>}
        {createSuccess && <div className="success-banner">Log created successfully.</div>}
        <form onSubmit={createLog}>
          <div className="form-row">
            <div>
              <label>Roblox Username</label>
              <input required value={form.targetRobloxUsername} onChange={e => updateField("targetRobloxUsername", e.target.value)} placeholder="e.g. flat_bird" />
            </div>
            <div>
              <label>Type</label>
              <select value={form.type} onChange={e => updateField("type", e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {form.type === "temp_ban" && (
            <>
              <label>Unban Date</label>
              <input type="datetime-local" required value={form.unbanAt} onChange={e => updateField("unbanAt", e.target.value)} />
            </>
          )}

          <label>Reason</label>
          <input required value={form.reason} onChange={e => updateField("reason", e.target.value)} placeholder="Short reason for the action" />

          <label>Description (optional)</label>
          <textarea rows={3} value={form.description} onChange={e => updateField("description", e.target.value)} placeholder="Additional context or evidence notes" />

          <button className="primary" type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create Log"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Search Punishment History</h2>
        <form onSubmit={search} className="inline-form">
          <input placeholder="Roblox username" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button className="primary" type="submit" disabled={searching}>{searching ? "Searching…" : "Search"}</button>
        </form>

        {results.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr><th>Type</th><th>Reason</th><th>Issued By</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {results.map(log => (
                <tr key={log.id} className={log.hidden ? "row-hidden" : ""}>
                  <td><span className={`badge ${log.type}`}>{log.type.replace("_", " ")}</span></td>
                  <td>{log.reason}</td>
                  <td className="muted">{log.issuer_discord_id}</td>
                  <td className="muted">{new Date(log.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="secondary small"
                      disabled={hidingId === log.id}
                      onClick={() => toggleHide(log.id)}
                    >
                      {log.hidden ? "Unhide" : "Hide"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          searchTerm && !searching && <p className="muted">No results yet — try searching above.</p>
        )}
      </div>
    </div>
  );
}

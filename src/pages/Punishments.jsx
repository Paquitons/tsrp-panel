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
    e.preventDefault();
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

  return (
    <div className="content">
      <h1>Punishment Logs</h1>

      <div className="card">
        <h2>New Log</h2>
        {createError && <div className="error-banner">{createError}</div>}
        {createSuccess && <div className="error-banner" style={{ background: "#1f3a24", borderColor: "#00c853", color: "#69f0ae" }}>Log created.</div>}
        <form onSubmit={createLog}>
          <label>Roblox Username</label>
          <input required value={form.targetRobloxUsername} onChange={e => updateField("targetRobloxUsername", e.target.value)} />

          <label>Type</label>
          <select value={form.type} onChange={e => updateField("type", e.target.value)}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          {form.type === "temp_ban" && (
            <>
              <label>Unban Date</label>
              <input type="datetime-local" required value={form.unbanAt} onChange={e => updateField("unbanAt", e.target.value)} />
            </>
          )}

          <label>Reason</label>
          <input required value={form.reason} onChange={e => updateField("reason", e.target.value)} />

          <label>Description (optional)</label>
          <textarea rows={3} value={form.description} onChange={e => updateField("description", e.target.value)} />

          <button className="primary" type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create Log"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Search Punishment History</h2>
        <form onSubmit={search} style={{ display: "flex", gap: 8 }}>
          <input placeholder="Roblox username" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ marginBottom: 0 }} />
          <button className="primary" type="submit" disabled={searching}>Search</button>
        </form>

        {results.length > 0 && (
          <table style={{ marginTop: 16 }}>
            <thead>
              <tr><th>Type</th><th>Reason</th><th>Issued By</th><th>Date</th></tr>
            </thead>
            <tbody>
              {results.map(log => (
                <tr key={log.id}>
                  <td><span className={`badge ${log.type}`}>{log.type.replace("_", " ")}</span></td>
                  <td>{log.reason}</td>
                  <td>{log.issuer_discord_id}</td>
                  <td>{new Date(log.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

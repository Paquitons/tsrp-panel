import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { timeAgo, TYPE_LABELS } from "../utils";
import Avatar from "../components/Avatar";
import LogCard from "../components/LogCard";

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

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hidingId, setHidingId] = useState(null);

  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function onUsernameChange(value) {
    updateField("targetRobloxUsername", value);
    clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const { suggestions } = await apiFetch(`/punishments/autocomplete?q=${encodeURIComponent(value)}`);
        setSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

  function pickSuggestion(username) {
    updateField("targetRobloxUsername", username);
    setShowSuggestions(false);
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
    setHasSearched(true);
    try {
      const { logs } = await apiFetch(`/punishments?username=${encodeURIComponent(searchTerm)}`);
      setResults(logs);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  // Load the most recent logs on first mount, same as an empty search.
  useEffect(() => { search(); }, []);

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

      <div className="two-col">
        <div className="card">
          <h2>Create New Log</h2>
          {createError && <div className="error-banner">{createError}</div>}
          {createSuccess && <div className="success-banner">Log created successfully.</div>}
          <form onSubmit={createLog}>
            <label>User</label>
            <div className="autocomplete-wrap">
              <input
                required
                autoComplete="off"
                value={form.targetRobloxUsername}
                onChange={e => onUsernameChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Enter Roblox username"
              />
              {showSuggestions && (
                <div className="autocomplete-list">
                  {suggestions.map(s => (
                    <div
                      key={s.username}
                      className="autocomplete-item"
                      onMouseDown={() => pickSuggestion(s.username)}
                    >
                      <Avatar username={s.username} robloxId={s.robloxId} size={26} />
                      <span className="autocomplete-name">{s.username}</span>
                      <span className="autocomplete-hint">{s.hint}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
            <input required value={form.reason} onChange={e => updateField("reason", e.target.value)} placeholder="Short reason for the action" />

            <label>Description (optional)</label>
            <textarea rows={3} value={form.description} onChange={e => updateField("description", e.target.value)} placeholder="Additional context or evidence notes" />

            <button className="primary" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create Log"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Punishment Logs</h2>
          <form onSubmit={search} className="inline-form" style={{ marginBottom: 16 }}>
            <input placeholder="Search by username" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <button className="primary" type="submit" disabled={searching}>{searching ? "…" : "Search"}</button>
          </form>

          <div className="log-card-list">
            {results.length === 0 && hasSearched && !searching && (
              <p className="muted">No logs found.</p>
            )}
            {results.map(log => (
              <div key={log.id}>
                <LogCard log={log} onChanged={search} />
                <button className="secondary small log-card-hide-btn" disabled={hidingId === log.id} onClick={() => toggleHide(log.id)}>
                  {log.hidden ? "Unhide" : "Hide"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

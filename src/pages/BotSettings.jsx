import { useState } from "react";
import { apiFetch } from "../api";
import { usePolling } from "../hooks/usePolling";

const ADMIN_POLL_MS = 15_000;

// ==================================================================
// Bot Settings -- the generic control center for numeric/boolean knobs
// that used to require a code change (see tsrp-panel-api's
// botSettingsShared.js for the manifest this renders and why role IDs/
// channel IDs/casino/stock/crime/debt rates are deliberately NOT here --
// those either have their own dedicated panel already, or need more
// careful handling than a generic number editor).
// ==================================================================
export default function BotSettings() {
  const [settings, setSettings] = useState(null);
  const [pending, setPending] = useState({}); // key -> locally-edited value, not yet saved
  const [saving, setSaving] = useState(null); // key currently being saved/reset
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  function load() {
    apiFetch("/super-admin/bot-settings").then(({ settings }) => setSettings(settings)).catch(err => setError(err.message));
  }
  // Safe to poll even with unsaved edits in `pending` -- that's a
  // separate piece of state from `settings`, never overwritten by a
  // refresh the way a form bound directly to fetched state would be.
  usePolling(load, ADMIN_POLL_MS);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  async function save(entry) {
    const value = pending[entry.key];
    if (value === undefined) return;
    setSaving(entry.key);
    setError(null);
    try {
      await apiFetch(`/super-admin/bot-settings/${entry.key}`, { method: "PATCH", body: { value: entry.type === "number" ? Number(value) : value } });
      setPending(p => { const next = { ...p }; delete next[entry.key]; return next; });
      flash(`${entry.label} saved.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  async function reset(entry) {
    if (!confirm(`Reset "${entry.label}" to its default (${entry.default})?`)) return;
    setSaving(entry.key);
    setError(null);
    try {
      await apiFetch(`/super-admin/bot-settings/${entry.key}/reset`, { method: "POST" });
      setPending(p => { const next = { ...p }; delete next[entry.key]; return next; });
      flash(`${entry.label} reset to default.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  }

  if (error && !settings) return <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>;
  if (!settings) return <p className="muted" style={{ marginTop: 16 }}>Loading…</p>;

  const byCategory = {};
  for (const entry of settings) {
    if (!byCategory[entry.category]) byCategory[entry.category] = [];
    byCategory[entry.category].push(entry);
  }

  return (
    <>
      <p className="muted card-subtitle" style={{ marginTop: 16 }}>
        Reward amounts, cooldowns, formula constants, and catalog prices -- every change here is logged (who,
        before, after, when). Casino payout rates, stock market config, crime rates, and loan/debt rates each
        have their own dedicated tab; role IDs and channel IDs aren't editable here since a bad value there can
        break permissions bot-wide.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="success-banner">{notice}</div>}

      {Object.entries(byCategory).map(([category, entries]) => (
        <div key={category}>
          <h2 style={{ marginTop: 20 }}>{category}</h2>
          <div className="card-grid">
            {entries.map(entry => {
              const editing = pending[entry.key] !== undefined;
              const value = editing ? pending[entry.key] : entry.value;
              const isDefault = entry.value === entry.default;
              return (
                <div className="stat-tile" key={entry.key}>
                  <div className="muted">{entry.label}</div>
                  <p className="muted" style={{ fontSize: "var(--text-xs)", margin: "2px 0 8px" }}>{entry.description}</p>
                  <div className="button-row" style={{ alignItems: "center" }}>
                    {entry.type === "boolean" ? (
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={e => setPending(p => ({ ...p, [entry.key]: e.target.checked }))}
                        />
                        {value ? "Enabled" : "Disabled"}
                      </label>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        min={entry.min}
                        max={entry.max}
                        value={value}
                        onChange={e => setPending(p => ({ ...p, [entry.key]: e.target.value }))}
                        style={{ width: 110 }}
                      />
                    )}
                    <button className="primary" type="button" disabled={!editing || saving === entry.key} onClick={() => save(entry)}>
                      {saving === entry.key ? "…" : "Save"}
                    </button>
                    <button className="secondary" type="button" disabled={isDefault || saving === entry.key} onClick={() => reset(entry)}>
                      Reset
                    </button>
                  </div>
                  {!isDefault && <span className="muted" style={{ fontSize: "var(--text-xs)" }}>Default: {entry.default}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

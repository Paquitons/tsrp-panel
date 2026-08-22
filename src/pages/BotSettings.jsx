import { useState } from "react";
import { apiFetch } from "../api";
import Banner from "../components/primitives/Banner";
import { useApiQuery } from "../hooks/useApiQuery";

const ADMIN_POLL_MS = 15_000;

// ==================================================================
// Bot Settings -- the generic control center for the knobs that used to
// require a code change. This form is not hardcoded: it renders whatever
// tsrp-panel-api's botSettingsShared.js SETTINGS_MANIFEST declares, so a
// new setting needs a manifest entry there and nothing here. See that
// file for why casino/stock/crime/debt rates and the rank hierarchy's
// role IDs are deliberately kept out of it.
// ==================================================================
export default function BotSettings() {
  const [pending, setPending] = useState({}); // key -> locally-edited value, not yet saved
  const [saving, setSaving] = useState(null); // key currently being saved/reset
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Safe to poll even with unsaved edits in `pending` -- that's a
  // separate piece of state from the query's cached `settings`, never
  // overwritten by a refresh the way a form bound directly to fetched
  // state would be.
  const query = useApiQuery(["super-admin", "bot-settings"], "/super-admin/bot-settings", {
    refetchInterval: ADMIN_POLL_MS,
    select: d => d.settings,
  });
  const settings = query.data;

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  async function save(entry) {
    const value = pending[entry.key];
    if (value === undefined) return;
    setSaving(entry.key);
    setActionError(null);
    try {
      await apiFetch(`/super-admin/bot-settings/${entry.key}`, { method: "PATCH", body: { value: entry.type === "number" ? Number(value) : value } }); // "text" and "boolean" both pass the value through as-is
      setPending(p => { const next = { ...p }; delete next[entry.key]; return next; });
      flash(`${entry.label} saved.`);
      query.refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(null);
    }
  }

  async function reset(entry) {
    if (!confirm(`Reset "${entry.label}" to its default (${entry.default})?`)) return;
    setSaving(entry.key);
    setActionError(null);
    try {
      await apiFetch(`/super-admin/bot-settings/${entry.key}/reset`, { method: "POST" });
      setPending(p => { const next = { ...p }; delete next[entry.key]; return next; });
      flash(`${entry.label} reset to default.`);
      query.refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(null);
    }
  }

  if (query.isError && !settings) return <Banner style={{ marginTop: 16 }}>{query.error.message}</Banner>;
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
        have their own dedicated tab. The rank hierarchy and the role IDs behind it aren't editable here, since a
        bad value there breaks permission checks bot-wide; the role and channel IDs that do appear (Moderation,
        Discord Mod Security, Member Suggestions) each drive one feature only, so a wrong value affects that
        feature and nothing else. Any field expecting a Discord ID is checked on save, so a typo is rejected
        rather than quietly matching nobody.
      </p>
      {actionError && <Banner>{actionError}</Banner>}
      {notice && <Banner variant="success">{notice}</Banner>}

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
                    ) : entry.type === "text" ? (
                      <input
                        type="text"
                        value={value}
                        onChange={e => setPending(p => ({ ...p, [entry.key]: e.target.value }))}
                        style={{ width: 220 }}
                      />
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

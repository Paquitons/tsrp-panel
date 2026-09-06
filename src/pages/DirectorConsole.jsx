import { useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import Banner from "../components/primitives/Banner";
import Tabs from "../components/Tabs";
import { useApiQuery } from "../hooks/useApiQuery";

const POLL_MS = 20_000;

// ==================================================================
// Director Console
//
// Higher-level controls for the Directors Board tier and above. The real
// gate is requireRank("DIRECTORS_BOARD") on the API's /director router;
// user?.isDirectorOrAbove here only decides whether the tab renders.
//
// These edits are not cosmetic. The hub content lives in hub_entries in
// the shared database, which is what highrock-bot's infoPanels.js reads
// through hubStore, so saving here changes what Discord shows. The bot
// re-renders the hub panels on its own within about fifteen seconds.
// ==================================================================

const SECTIONS = [
  { value: "department", label: "Department Hub" },
  { value: "civilian", label: "Civilian Hub" },
  { value: "audit", label: "Audit Log" },
];

const BLANK = { entryKey: "", label: "", description: "", blurb: "", link: "", active: true };

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString() : "";
}

// Discord's markdown, rendered as elements rather than HTML so
// staff-authored text can never inject markup. Covers what these blurbs
// actually use: bold, italic, underline, inline code, bullet lists and
// bare invite links.
const MD = /(https?:\/\/[^\s]+|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|`[^`\n]+`)/g;
const BULLET = /^\s*[-*]\s+(.*)$/;

function renderInline(text, keyPrefix) {
  return text.split(MD).filter(Boolean).map((tok, i) => {
    const k = `${keyPrefix}-${i}`;
    if (/^https?:\/\//.test(tok)) {
      return <a key={k} href={tok} target="_blank" rel="noreferrer noopener">{tok}</a>;
    }
    if (tok.startsWith("**") && tok.endsWith("**")) return <strong key={k}>{tok.slice(2, -2)}</strong>;
    if (tok.startsWith("__") && tok.endsWith("__")) return <u key={k}>{tok.slice(2, -2)}</u>;
    if (tok.startsWith("*") && tok.endsWith("*")) return <em key={k}>{tok.slice(1, -1)}</em>;
    if (tok.startsWith("`") && tok.endsWith("`")) return <code key={k}>{tok.slice(1, -1)}</code>;
    return <span key={k}>{tok}</span>;
  });
}

function renderLine(line, i) {
  if (!line) return <p key={i} className="dc-preview-gap" />;
  const bullet = line.match(BULLET);
  if (bullet) {
    return (
      <p key={i} className="dc-preview-li">
        <span className="dc-preview-dot">&bull;</span>
        <span>{renderInline(bullet[1], i)}</span>
      </p>
    );
  }
  return <p key={i}>{renderInline(line, i)}</p>;
}

/**
 * Builds the exact message the bot posts, then renders it.
 *
 * The string here is the same one handleCivilianHubSelect and
 * handleDepartmentHubSelect build in infoPanels.js: the bolded name, the
 * advertisement, a blank line, then the invite. Anything the preview adds
 * that Discord would not show, or leaves out that it would, makes the
 * preview a lie, so it mirrors that shape rather than inventing a layout.
 */
function discordMessage({ label, blurb, link }, hub) {
  const noun = hub === "department" ? "department" : "career";
  const body = blurb ? `${blurb}\n\n` : "";
  const tail = link || `No invite link has been set for this ${noun} yet. Contact a Director.`;
  return `**${label || "Untitled"}**\n${body}${tail}`;
}

function Preview({ entry, hub }) {
  const text = discordMessage(entry, hub);
  return (
    <div className="dc-preview">
      <div className="dc-preview-label">Discord preview</div>
      <div className="dc-preview-body">
        {text.split("\n").map(renderLine)}
      </div>
    </div>
  );
}

function EntryEditor({ hub, entry, onSaved, onError }) {
  const [draft, setDraft] = useState({
    label: entry.label ?? "",
    description: entry.description ?? "",
    blurb: entry.blurb ?? "",
    link: entry.link ?? "",
    active: entry.active === 1 || entry.active === true,
  });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const dirty =
    draft.label !== (entry.label ?? "") ||
    draft.description !== (entry.description ?? "") ||
    draft.blurb !== (entry.blurb ?? "") ||
    draft.link !== (entry.link ?? "") ||
    draft.active !== (entry.active === 1 || entry.active === true);

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  async function save() {
    setBusy(true); onError(null);
    try {
      await apiFetch(`/director/hubs/${hub}/entries/${entry.entry_key}`, { method: "PATCH", body: draft });
      onSaved(`${draft.label} saved. Discord updates within about fifteen seconds.`);
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm(`Remove "${entry.label}" from this hub? The audit log keeps a copy of its content.`)) return;
    setBusy(true); onError(null);
    try {
      await apiFetch(`/director/hubs/${hub}/entries/${entry.entry_key}`, { method: "DELETE" });
      onSaved(`${entry.label} removed.`);
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }

  const inactive = !(entry.active === 1 || entry.active === true);

  return (
    <div className={`dc-entry ${inactive ? "dc-entry-inactive" : ""}`}>
      <button type="button" className="dc-entry-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="dc-entry-name">
          {entry.label}
          {inactive && <span className="dc-tag dc-tag-muted">Hidden</span>}
          {entry.description === "Whitelisted" && <span className="dc-tag">WL</span>}
        </span>
        <span className="dc-entry-meta">
          <code>{entry.entry_key}</code>
          <span className="dc-chevron">{open ? "Close" : "Edit"}</span>
        </span>
      </button>

      {open && (
        <div className="dc-entry-body">
          <div className="dc-field-grid">
            <label className="dc-field">
              <span>Name</span>
              <input value={draft.label} onChange={e => set("label", e.target.value)} maxLength={100} />
            </label>
            <label className="dc-field">
              <span>Tag</span>
              <input value={draft.description} onChange={e => set("description", e.target.value)} maxLength={100}
                     placeholder="Whitelisted, or leave blank" />
            </label>
          </div>

          <label className="dc-field">
            <span>Invite link</span>
            <input value={draft.link} onChange={e => set("link", e.target.value)} maxLength={200}
                   placeholder="https://discord.gg/..." />
          </label>

          <label className="dc-field">
            <span>Advertisement</span>
            <textarea rows={8} value={draft.blurb} onChange={e => set("blurb", e.target.value)} maxLength={1800} />
            <span className="dc-count">{draft.blurb.length} / 1800</span>
          </label>

          <label className="checkbox-label dc-active">
            <input type="checkbox" checked={draft.active} onChange={e => set("active", e.target.checked)} />
            Shown in the hub
          </label>

          <Preview entry={draft} hub={hub} />

          <div className="button-row">
            <button className="primary" type="button" disabled={!dirty || busy} onClick={save}>
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button className="secondary" type="button" disabled={busy} onClick={remove}>Remove</button>
            {dirty && <span className="muted dc-note">Unsaved changes</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function AddEntry({ hub, onSaved, onError }) {
  const [draft, setDraft] = useState(BLANK);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  async function create() {
    setBusy(true); onError(null);
    try {
      await apiFetch(`/director/hubs/${hub}/entries`, { method: "POST", body: draft });
      onSaved(`${draft.label} added.`);
      setDraft(BLANK); setOpen(false);
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }

  if (!open) {
    return <button className="secondary dc-add" type="button" onClick={() => setOpen(true)}>Add an entry</button>;
  }

  return (
    <div className="dc-entry dc-entry-new">
      <div className="dc-entry-body">
        <div className="dc-field-grid">
          <label className="dc-field">
            <span>ID</span>
            <input value={draft.entryKey} onChange={e => set("entryKey", e.target.value)} maxLength={40} placeholder="SWAT" />
          </label>
          <label className="dc-field">
            <span>Name</span>
            <input value={draft.label} onChange={e => set("label", e.target.value)} maxLength={100} />
          </label>
        </div>
        <label className="dc-field">
          <span>Tag</span>
          <input value={draft.description} onChange={e => set("description", e.target.value)} maxLength={100}
                 placeholder="Whitelisted, or leave blank" />
        </label>
        <label className="dc-field">
          <span>Invite link</span>
          <input value={draft.link} onChange={e => set("link", e.target.value)} maxLength={200} placeholder="https://discord.gg/..." />
        </label>
        <label className="dc-field">
          <span>Advertisement</span>
          <textarea rows={8} value={draft.blurb} onChange={e => set("blurb", e.target.value)} maxLength={1800} />
          <span className="dc-count">{draft.blurb.length} / 1800</span>
        </label>
        <Preview entry={draft} hub={hub} />
        <div className="button-row">
          <button className="primary" type="button" disabled={busy || !draft.entryKey || !draft.label || !draft.blurb} onClick={create}>
            {busy ? "Adding…" : "Add to hub"}
          </button>
          <button className="secondary" type="button" disabled={busy} onClick={() => { setDraft(BLANK); setOpen(false); }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function HubSection({ hub, onNotice, onError }) {
  const query = useApiQuery(["director", "hub", hub], `/director/hubs/${hub}`, {
    refetchInterval: POLL_MS,
    select: d => d.entries,
  });
  const entries = query.data;
  const [reordering, setReordering] = useState(false);

  async function move(index, delta) {
    const order = entries.map(e => e.entry_key);
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    setReordering(true); onError(null);
    try {
      await apiFetch(`/director/hubs/${hub}/reorder`, { method: "POST", body: { order } });
      query.refetch();
    } catch (err) { onError(err.message); } finally { setReordering(false); }
  }

  if (query.isError && !entries) return <Banner style={{ marginTop: 16 }}>{query.error.message}</Banner>;
  if (!entries) return <p className="muted" style={{ marginTop: 16 }}>Loading…</p>;

  const saved = msg => { onNotice(msg); query.refetch(); };

  return (
    <>
      <p className="muted card-subtitle" style={{ marginTop: 16 }}>
        Live content for the {hub === "department" ? "Department" : "Civilian"} Hub in Discord.
      </p>

      <div className="dc-list">
        {entries.map((entry, i) => (
          <div className="dc-row" key={entry.entry_key}>
            <div className="dc-order">
              <button type="button" className="dc-move" disabled={i === 0 || reordering} onClick={() => move(i, -1)} aria-label={`Move ${entry.label} up`}>↑</button>
              <button type="button" className="dc-move" disabled={i === entries.length - 1 || reordering} onClick={() => move(i, 1)} aria-label={`Move ${entry.label} down`}>↓</button>
            </div>
            <EntryEditor hub={hub} entry={entry} onSaved={saved} onError={onError} />
          </div>
        ))}
      </div>

      <AddEntry hub={hub} onSaved={saved} onError={onError} />
    </>
  );
}

function AuditSection() {
  const query = useApiQuery(["director", "audit"], "/director/audit-log?limit=150", {
    refetchInterval: POLL_MS,
    select: d => d.entries,
  });
  const rows = query.data;
  if (query.isError && !rows) return <Banner style={{ marginTop: 16 }}>{query.error.message}</Banner>;
  if (!rows) return <p className="muted" style={{ marginTop: 16 }}>Loading…</p>;
  if (!rows.length) return <p className="muted" style={{ marginTop: 16 }}>No changes recorded yet.</p>;

  return (
    <>
      <p className="muted card-subtitle" style={{ marginTop: 16 }}>
        Every change made in this console, with the value before and after it.
      </p>
      <div className="dc-audit-scroll">
        <table className="dc-audit">
          <thead>
            <tr><th>When</th><th>Who</th><th>Area</th><th>Change</th><th>Before</th><th>After</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="dc-audit-when">{fmt(r.created_at)}</td>
                <td>{r.actor_display_name || r.actor_discord_id}</td>
                <td>{r.area.replace(/_/g, " ")}</td>
                <td>
                  <span className={`dc-action dc-action-${r.action}`}>{r.action}</span>
                  {r.target && <code className="dc-audit-target">{r.target}</code>}
                  {r.field && <span className="muted"> {r.field}</span>}
                </td>
                <td className="dc-audit-val">{r.previous_value ?? <span className="muted">empty</span>}</td>
                <td className="dc-audit-val">{r.new_value ?? <span className="muted">empty</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function DirectorConsole() {
  const { user } = useAuth();
  const [section, setSection] = useState("department");
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  }

  if (!user?.isDirectorOrAbove) {
    return (
      <div className="content">
        <Banner>This area is limited to the Directors Board and above.</Banner>
      </div>
    );
  }

  return (
    <div className="content">
      <h1>Director Console</h1>
      <p className="muted card-subtitle">
        Server configuration and administrative controls for the Directors Board and above.
      </p>

      <Tabs tabs={SECTIONS} active={section} onChange={s => { setSection(s); setError(null); }} />

      {error && <Banner>{error}</Banner>}
      {notice && <Banner variant="success">{notice}</Banner>}

      {section === "department" && <HubSection hub="department" onNotice={flash} onError={setError} />}
      {section === "civilian" && <HubSection hub="civilian" onNotice={flash} onError={setError} />}
      {section === "audit" && <AuditSection />}
    </div>
  );
}

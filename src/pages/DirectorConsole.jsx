import { useState } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../context/AuthContext";
import Banner from "../components/primitives/Banner";
import Modal from "../components/primitives/Modal";
import SectionHeader from "../components/primitives/SectionHeader";
import Tabs from "../components/Tabs";
import { useApiQuery } from "../hooks/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";
import { useStaffSearch } from "../hooks/useStaffSearch";
import CustomSelect from "../components/CustomSelect";
import PortalDropdown from "../components/PortalDropdown";
import DiscordAvatar from "../components/DiscordAvatar";
import AutoGrowTextarea from "../components/AutoGrowTextarea";

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
  { value: "broadcast", label: "Broadcast" },
  { value: "verification", label: "Verification" },
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

/**
 * The hub composer, in a modal opened from the section header, for the
 * same reason as the announcement one: it used to live below the whole
 * list, so adding an entry meant scrolling past every existing entry
 * first.
 */
function AddEntryModal({ hub, onSaved, onError, onClose }) {
  const [draft, setDraft] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  async function create() {
    setBusy(true); onError(null);
    try {
      await apiFetch(`/director/hubs/${hub}/entries`, { method: "POST", body: draft });
      onSaved(`${draft.label} added.`);
      onClose();
    } catch (err) { onError(err.message); setBusy(false); }
  }

  return (
    <Modal onClose={onClose} className="modal-xwide" labelledBy="add-hub-entry-title">
      <h2 id="add-hub-entry-title">New {hub === "department" ? "department" : "civilian"} hub entry</h2>
      <div>
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
          <button className="secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function HubSection({ hub, onNotice, onError }) {
  const query = useApiQuery(["director", "hub", hub], `/director/hubs/${hub}`, {
    refetchInterval: POLL_MS,
    select: d => d.entries,
  });
  const entries = query.data;
  const [reordering, setReordering] = useState(false);
  const [adding, setAdding] = useState(false);

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
      <SectionHeader
        title={hub === "department" ? "Department Hub" : "Civilian Hub"}
        count={entries.length}
        countLabel={entries.length === 1 ? "entry" : "entries"}
        subtitle={`Live content for the ${hub === "department" ? "Department" : "Civilian"} Hub in Discord.`}
        actions={
          <button className="primary small" type="button" onClick={() => setAdding(true)}>
            New entry
          </button>
        }
      />

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

      {adding && (
        <AddEntryModal
          hub={hub}
          onSaved={saved}
          onError={onError}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  );
}

// ==================================================================
// Manual verification grants
//
// Roblox refuses to run an OAuth flow for an account under 13, so a staff
// member on one cannot complete the standard verification at all. This is
// where a Director opens the fallback for that person, and only that
// person: they prove the account by putting a one-time code in its Roblox
// profile, which the server reads back from Roblox.
//
// The grant is the entire gate. Without one, the staff member's own
// endpoints answer 404, so nothing here is cosmetic and nothing here can
// be worked around in a browser.
// ==================================================================

function fmtWindow(ms) {
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, Math.round(ms / 60_000))}m left`;
}

function GrantForm({ onGranted, onError, bounds }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(null);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(bounds.defaultHours ?? 24);
  const [allowReplace, setAllowReplace] = useState(false);
  const [busy, setBusy] = useState(false);

  async function search(q) {
    setQuery(q);
    setPicked(null);
    if (q.trim().length < 2) { setResults([]); return; }
    try {
      const { results: r } = await apiFetch(`/director/manual-verification/staff?q=${encodeURIComponent(q.trim())}`);
      setResults(r);
    } catch { setResults([]); }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); onError(null);
    try {
      const { dmSent } = await apiFetch("/director/manual-verification", {
        method: "POST",
        body: { discordId: picked.discordId, reason, hours: Number(hours), allowReplace },
      });
      const who = picked.discordUsername || picked.discordId;
      // Whether the DM landed is the difference between "they have been
      // told" and "somebody still has to tell them", so it is said out
      // loud rather than left for the Director to assume.
      onGranted(dmSent
        ? `Enabled for ${who}, and they have been DMed the instructions.`
        : `Enabled for ${who}, but their DMs are closed. You will need to explain it to them yourself.`);
      setQuery(""); setResults([]); setPicked(null); setReason(""); setAllowReplace(false);
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }

  const replaceNeeded = picked?.verified;

  return (
    <form className="dc-entry dc-entry-body mv-grant-form" onSubmit={submit}>
      <label className="dc-field">
        <span>Staff member</span>
        <input value={query} onChange={e => search(e.target.value)} placeholder="Search by name or Discord ID" />
      </label>

      {!picked && results.length > 0 && (
        <div className="mv-results">
          {results.map(r => (
            <button type="button" key={r.discordId} className="mv-result" onClick={() => { setPicked(r); setQuery(r.discordUsername || r.discordId); setResults([]); }}>
              <span className="mv-result-name">{r.discordUsername || r.discordId}</span>
              <span className="muted">{r.rank || "No rank"}</span>
              <span className="muted">
                {r.verified ? `Verified (${r.method === "manual_profile" ? "profile code" : "Roblox sign in"})` : "Not verified"}
                {r.hasGrant ? " · already enabled" : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      {picked && (
        <>
          <p className="muted mv-picked">
            <strong>{picked.discordUsername || picked.discordId}</strong>{" "}
            <code>{picked.discordId}</code>{" "}
            {picked.verified
              ? `already has ${picked.robloxUsername ?? "an account"} verified by ${picked.method === "manual_profile" ? "profile code" : "Roblox sign in"}.`
              : "has never verified a Roblox account."}
          </p>

          <label className="dc-field">
            <span>Why this exception is being made</span>
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} maxLength={500}
                      placeholder="e.g. Ticket #412: Roblox won't run the sign in for their account." />
          </label>

          <label className="dc-field">
            <span>Window (hours)</span>
            <input type="number" value={hours} min={bounds.minHours ?? 1} max={bounds.maxHours ?? 336}
                   onChange={e => setHours(e.target.value)} />
          </label>

          {replaceNeeded && (
            <label className="checkbox-label">
              <input type="checkbox" checked={allowReplace} onChange={e => setAllowReplace(e.target.checked)} />
              Let this replace the Roblox account already on their profile
            </label>
          )}
          {replaceNeeded && !allowReplace && (
            <p className="muted dc-note">
              Without this, they can only re-prove the account they already have. A fallback
              does not quietly move an account Roblox itself verified.
            </p>
          )}

          <div className="button-row">
            <button className="primary" type="submit" disabled={busy || reason.trim().length < 10}>
              {busy ? "Enabling…" : "Enable manual verification"}
            </button>
            <button className="secondary" type="button" onClick={() => { setPicked(null); setQuery(""); }}>Cancel</button>
          </div>
        </>
      )}
    </form>
  );
}

function ManualVerificationSection({ onNotice, onError }) {
  const query = useApiQuery(["director", "manual-verification"], "/director/manual-verification", {
    refetchInterval: POLL_MS,
  });
  const data = query.data;
  const [busyId, setBusyId] = useState(null);

  async function revoke(grant) {
    const reason = prompt(`Turn manual verification off for ${grant.discordUsername || grant.discordId}?

Reason (optional):`);
    if (reason === null) return;
    setBusyId(grant.discordId); onError(null);
    try {
      await apiFetch(`/director/manual-verification/${grant.discordId}`, { method: "DELETE", body: { reason } });
      onNotice("Manual verification turned off.");
      query.refetch();
    } catch (err) { onError(err.message); } finally { setBusyId(null); }
  }

  if (query.isError && !data) return <Banner style={{ marginTop: 16 }}>{query.error.message}</Banner>;
  if (!data) return <p className="muted" style={{ marginTop: 16 }}>Loading…</p>;

  const granted = msg => { onNotice(msg); query.refetch(); };

  return (
    <>
      <SectionHeader
        title="Alternative verification"
        count={data.active.length}
        countLabel="enabled"
        subtitle="Roblox will not run its sign in for accounts under 13. This opens a one-time profile-sentence verification for one named staff member, and DMs them the instructions with a link straight to the right page. Everyone else sees only Roblox sign in, and the routes behind this do not exist for them."
      />

      <h2 className="dc-subhead">Currently enabled</h2>
      {data.active.length === 0
        ? <p className="muted">Nobody has manual verification enabled.</p>
        : (
          <div className="dc-list">
            {data.active.map(g => (
              <div className="dc-entry" key={g.id}>
                <div className="dc-entry-body">
                  <p className="mv-picked">
                    <strong>{g.discordUsername || g.discordId}</strong> <code>{g.discordId}</code>
                    {g.allowReplace && <span className="dc-tag">may replace existing</span>}
                  </p>
                  <p className="muted">{g.reason}</p>
                  <p className="muted dc-note">
                    Enabled by {g.grantedBy} on {fmt(g.grantedAt)} · {fmtWindow(g.expiresAt - Date.now())}
                  </p>
                  <div className="button-row">
                    <button className="secondary" type="button" disabled={busyId === g.discordId} onClick={() => revoke(g)}>
                      {busyId === g.discordId ? "Turning off…" : "Turn off"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      <h2 className="dc-subhead">Enable for someone</h2>
      <GrantForm onGranted={granted} onError={onError}
                 bounds={{ defaultHours: data.defaultHours, minHours: data.minHours, maxHours: data.maxHours }} />

      <h2 className="dc-subhead">History</h2>
      <div className="dc-audit-scroll">
        <table className="dc-audit">
          <thead>
            <tr><th>Enabled</th><th>Who</th><th>By</th><th>Reason</th><th>Outcome</th></tr>
          </thead>
          <tbody>
            {data.recent.map(g => (
              <tr key={g.id}>
                <td className="dc-audit-when">{fmt(g.grantedAt)}</td>
                <td>{g.discordUsername || g.discordId}</td>
                <td>{g.grantedBy}</td>
                <td className="dc-audit-val">{g.reason}</td>
                <td className="dc-audit-val">
                  {g.usedAt ? `Verified ${g.usedRobloxId} on ${fmt(g.usedAt)}`
                    : g.revokedAt ? `Turned off ${fmt(g.revokedAt)} by ${g.revokedBy}`
                      : g.expiresAt <= Date.now() ? "Expired unused"
                        : "Open"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ==================================================================
// Broadcast: announcements to staff, and private messages to one of
// them.
//
// The two priorities are the only real choice on this form, and they are
// two different promises rather than two levels of loudness:
//
//   IMPORTANT is a promise to the sender. It is stored, it reappears on
//   every panel load, and it does not go away until that person presses
//   Acknowledge. The history below shows how many have.
//
//   QUICK is a promise to the recipient. It reaches whoever has the
//   panel open right now and nothing else -- no acknowledgement, no
//   record on their screen, nothing waiting for them tomorrow.
//
// Targeting is enforced by the API (noticesShared.isRecipient); these
// controls only compose the request.
// ==================================================================
function BroadcastSection({ onNotice, onError }) {
  const options = useApiQuery(["director", "notice-options"], "/director/notices/options");
  const history = useApiQuery(["director", "notices"], "/director/notices?limit=40", {
    refetchInterval: POLL_MS,
    select: d => d.notices,
  });
  const queryClient = useQueryClient();

  const [channel, setChannel] = useState("announcement");
  const [priority, setPriority] = useState("important");
  const [audience, setAudience] = useState("everyone");
  const [ranks, setRanks] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const recipient = useStaffSearch();

  const maxBody = options.data?.maxBody ?? 1200;
  const rankOptions = options.data?.ranks ?? [];
  const isPm = channel === "pm";

  function toggleRank(key) {
    setRanks(list => (list.includes(key) ? list.filter(r => r !== key) : [...list, key]));
  }

  // A PM is addressed to one person by definition, so switching to it
  // settles the audience rather than leaving a contradictory choice on
  // screen for the API to reject.
  function pickChannel(next) {
    setChannel(next);
    setAudience(next === "pm" ? "user" : "everyone");
  }

  async function send(e) {
    e.preventDefault();
    onError(null);
    setSending(true);
    try {
      const payload = { channel, priority, body, audience };
      if (audience === "ranks") payload.audienceRanks = ranks;
      if (audience === "user") payload.recipientDiscordId = recipient.target?.discordId;

      await apiFetch("/director/notices", { method: "POST", body: payload });

      setBody("");
      setRanks([]);
      recipient.reset?.();
      queryClient.invalidateQueries({ queryKey: ["director", "notices"] });
      onNotice(priority === "important"
        ? "Sent. It will stay on their screen until they acknowledge it."
        : "Sent to everyone with the panel open right now.");
    } catch (err) {
      onError(err.message);
    } finally {
      setSending(false);
    }
  }

  const rows = history.data;

  return (
    <>
      <SectionHeader
        title="Staff messages"
        subtitle="Sent to staff inside the Staff Panel. The in-game messages tab holds the ones the bot posts in Discord."
      />

      <form className="dc-broadcast" onSubmit={send}>
        <div className="dc-bc-row">
          <div>
            <label>Type</label>
            <CustomSelect
              value={channel}
              onChange={pickChannel}
              options={[
                { value: "announcement", label: "Announcement" },
                { value: "pm", label: "Private message" },
              ]}
            />
          </div>
          <div>
            <label>Priority</label>
            <CustomSelect
              value={priority}
              onChange={setPriority}
              options={[
                { value: "important", label: "Important, stays until acknowledged" },
                { value: "quick", label: "Quick, only for panels open now" },
              ]}
            />
          </div>
        </div>

        <p className="muted dc-bc-hint">
          {priority === "important"
            ? "Shown as a dialog they have to acknowledge, on every visit until they do."
            : "Shown as a passing toast. Anyone without the panel open right now will never see it."}
        </p>

        {isPm ? (
          <>
            <label>To</label>
            <div className="autocomplete-wrap">
              <input
                ref={recipient.inputRef}
                required
                autoComplete="off"
                value={recipient.query}
                onChange={e => recipient.onQueryChange(e.target.value)}
                onFocus={() => recipient.suggestions.length > 0 && recipient.setShowSuggestions(true)}
                placeholder="Search by username or nickname"
              />
              <PortalDropdown
                anchorRef={recipient.inputRef}
                open={recipient.showSuggestions}
                onClose={() => recipient.setShowSuggestions(false)}
                className="autocomplete-list-portal"
              >
                {recipient.suggestions.map(s => (
                  <div key={s.discordId} className="autocomplete-item" onClick={() => recipient.pick(s)}>
                    <DiscordAvatar discordId={s.discordId} avatarHash={s.avatarHash} size={26} />
                    <span className="autocomplete-name">{s.nickname ?? s.username}</span>
                  </div>
                ))}
              </PortalDropdown>
            </div>
          </>
        ) : (
          <>
            <label>Who sees it</label>
            <CustomSelect
              value={audience}
              onChange={setAudience}
              options={[
                { value: "everyone", label: "Everyone" },
                { value: "ranks", label: "Chosen ranks" },
              ]}
            />

            {audience === "ranks" && (
              <div className="dc-bc-ranks">
                {rankOptions.map(r => (
                  <label key={r.key} className={`dc-bc-rank ${ranks.includes(r.key) ? "is-on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={ranks.includes(r.key)}
                      onChange={() => toggleRank(r.key)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        <label>Message</label>
        <AutoGrowTextarea
          required
          value={body}
          maxLength={maxBody}
          onChange={e => setBody(e.target.value)}
          placeholder={isPm ? "What you need them to know." : "What the team needs to know."}
        />
        <p className="muted dc-bc-count">{body.length} / {maxBody}</p>

        <button
          className="primary"
          type="submit"
          disabled={sending || !body.trim() || (audience === "ranks" && ranks.length === 0) || (isPm && !recipient.target)}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>

      <h2 className="dc-subhead">Sent</h2>
      {history.isError && !rows && <Banner>{history.error.message}</Banner>}
      {!rows && !history.isError && <p className="muted">Loading…</p>}
      {rows && !rows.length && <p className="muted">Nothing sent yet.</p>}

      {rows && rows.length > 0 && (
        <div className="dc-audit-scroll">
          <table className="dc-audit">
            <thead>
              <tr><th>Sent</th><th>Type</th><th>To</th><th>Message</th><th>Read</th><th /></tr>
            </thead>
            <tbody>
              {rows.map(n => (
                <tr key={n.id}>
                  <td className="dc-audit-when">{fmt(n.createdAt)}</td>
                  <td>
                    {n.channel === "pm" ? "PM" : "Announcement"}
                    <span className={`dc-bc-tag ${n.priority === "important" ? "is-important" : ""}`}>
                      {n.priority}
                    </span>
                  </td>
                  <td className="dc-audit-val">{describeAudience(n)}</td>
                  <td className="dc-audit-val">{n.body}</td>
                  <td>
                    {/* A quick notice is never acknowledged, so a count of
                        zero against one would read as "nobody has read it"
                        rather than "there is nothing to read here". */}
                    {n.priority === "important" ? n.ackCount : "n/a"}
                  </td>
                  <td>
                    {n.revokedAt ? (
                      <span className="muted">Taken down</span>
                    ) : n.priority === "important" ? (
                      <button
                        className="secondary small"
                        onClick={async () => {
                          onError(null);
                          try {
                            await apiFetch(`/director/notices/${n.id}/revoke`, { method: "POST" });
                            queryClient.invalidateQueries({ queryKey: ["director", "notices"] });
                            onNotice("Taken down, including from panels that already had it.");
                          } catch (err) { onError(err.message); }
                        }}
                      >
                        Take down
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Who a sent notice went to, in words, for the history table. */
function describeAudience(notice) {
  if (notice.audience === "everyone") return "Everyone";
  if (notice.audience === "user") return `One staff member (${notice.recipientDiscordId})`;
  const ranks = notice.audienceRanks ?? [];
  if (ranks.length <= 3) return ranks.join(", ");
  return `${ranks.slice(0, 3).join(", ")} +${ranks.length - 3} more`;
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

// Exported so Management.jsx can render these inside its own tab bar.
// The Director Console is now a section OF Management rather than a
// separate destination, but the sections themselves did not need
// rewriting to move, so they have not been.
export { HubSection, BroadcastSection, ManualVerificationSection, AuditSection };

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
      {section === "broadcast" && <BroadcastSection onNotice={flash} onError={setError} />}
      {section === "verification" && <ManualVerificationSection onNotice={flash} onError={setError} />}
      {section === "audit" && <AuditSection />}
    </div>
  );
}

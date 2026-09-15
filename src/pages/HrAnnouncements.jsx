// ==================================================================
// In-Game Announcements (HR panel tab)
//
// The editing side of the bot's In-Game Announcements panel: the
// reusable :h / :m / :pm messages staff paste into the game, which used
// to be loose Discord posts scattered through the announcements channel.
//
// Deliberately built from the Director Console's hub editor -- the same
// dc-* markup, the same collapsed-by-default rows, the same up/down
// reordering, the same live preview -- because it is the same job on a
// different table, and a second visual language for it would just be a
// second thing to learn. What differs is what the shape of the data
// actually needs:
//
//   * Rows are grouped by category, and reordering is scoped to a
//     category, because that is the only ordering that shows in Discord.
//   * The message is an <input>, not a <textarea>. In-game chat cannot
//     send a line break: it sends the first line and silently drops the
//     rest. Making a newline impossible to type is better than
//     validating it after the fact.
//   * There is a search box. Fifty-odd messages is enough that "find the
//     ban message" should not mean scrolling, and the same box is how an
//     editor checks whether something already exists before adding a
//     near-duplicate of it.
//   * Every row has a copy button. Editors are staff too, and the fast
//     path for someone who has the panel open already should not be
//     "go and open Discord".
// ==================================================================
import { useMemo, useState } from "react";
import { apiFetch } from "../api";
import { useApiQuery } from "../hooks/useApiQuery";
import CustomSelect from "../components/CustomSelect";
import Banner from "../components/primitives/Banner";
import Modal from "../components/primitives/Modal";
import SectionHeader from "../components/primitives/SectionHeader";

const POLL_MS = 15_000;

const COMMAND_OPTIONS = [
  { value: "m",  label: ":m  Server message" },
  { value: "h",  label: ":h  Hint" },
  { value: "pm", label: ":pm  Private message" },
];

const PLACEHOLDERS = ["user", "location", "postal", "reason", "department"];

const BLANK = { entryKey: "", category: "", command: "m", label: "", message: "" };

/**
 * The exact line a staff member pastes in-game. Mirrors announcementLine()
 * in the bot's infoPanels.js: a pm entry is stored WITHOUT its target
 * placeholder and gets one added here, so the placeholder cannot be
 * forgotten or doubled up.
 */
function announcementLine({ command, message }) {
  return command === "pm" ? `:pm [user] ${message}` : `:${command} ${message}`;
}

function CopyButton({ text, disabled }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access is refused outside a secure context and in some
      // embedded browsers. Falling back to selecting the text keeps the
      // button honest rather than silently doing nothing.
      window.prompt("Copy this line:", text);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className="ann-copy" onClick={copy} disabled={disabled} title="Copy the in-game line">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Preview({ draft }) {
  const line = announcementLine(draft);
  return (
    <div className="dc-preview">
      <div className="dc-preview-label">In-game line</div>
      <div className="dc-preview-body">
        <code className="ann-line">{line}</code>
        {/\[[a-z]+\]/.test(line) && (
          <p className="muted ann-hint">Replace anything in square brackets before sending.</p>
        )}
      </div>
    </div>
  );
}

function Fields({ draft, set, categories, showKey }) {
  const MESSAGE_MAX = 200;
  const overLimit = draft.message.length > MESSAGE_MAX;
  // Not an error -- the comms code legitimately carries one -- but the
  // filter tags runs of digits freely, and a tagged announcement reaches
  // the game as ###. Worth saying at the point somebody types one.
  const hasDigits = /\d/.test(draft.message);
  return (
    <>
      <div className="dc-field-grid">
        {showKey && (
          <label className="dc-field">
            <span>ID</span>
            <input value={draft.entryKey} onChange={e => set("entryKey", e.target.value)} maxLength={40} placeholder="three_guys" />
          </label>
        )}
        <label className="dc-field">
          <span>Name</span>
          <input value={draft.label} onChange={e => set("label", e.target.value)} maxLength={100} placeholder="Three Guys" />
        </label>
        {!showKey && (
          <label className="dc-field">
            <span>Command</span>
            <CustomSelect value={draft.command} onChange={v => set("command", v)} options={COMMAND_OPTIONS} />
          </label>
        )}
      </div>

      <div className="dc-field-grid">
        <label className="dc-field">
          <span>Category</span>
          <CustomSelect
            value={draft.category}
            onChange={v => set("category", v)}
            options={categories.map(c => ({ value: c.key, label: c.label }))}
            placeholder="Pick a category"
          />
        </label>
        {showKey && (
          <label className="dc-field">
            <span>Command</span>
            <CustomSelect value={draft.command} onChange={v => set("command", v)} options={COMMAND_OPTIONS} />
          </label>
        )}
      </div>

      <label className="dc-field">
        <span>Message</span>
        {/* An <input>, not a <textarea>: in-game chat sends the first line
            and drops the rest, so a line break must be impossible to type
            rather than caught on save. */}
        <input
          value={draft.message}
          onChange={e => set("message", e.target.value)}
          maxLength={MESSAGE_MAX}
          placeholder="Three Guys is now open at [postal]!"
        />
        <span className={`dc-count ${overLimit ? "ann-over" : ""}`}>{draft.message.length} / {MESSAGE_MAX}</span>
      </label>

      {hasDigits && (
        <p className="muted ann-hint ann-warn">
          This has a number in it. Roblox&rsquo;s chat filter tags numbers, so it may reach the game as
          {" "}<code>###</code>. The comms code is the one place that is unavoidable.
        </p>
      )}

      <p className="muted ann-hint">
        Placeholders:{" "}
        {PLACEHOLDERS.map((p, i) => (
          <span key={p}>{i > 0 && ", "}<code>[{p}]</code></span>
        ))}
        . Leave the command off the message and, on a <code>:pm</code>, leave <code>[user]</code> off too.
        {" "}Keep it short and avoid numbers: everything here goes through Roblox&rsquo;s chat filter.
      </p>

      <Preview draft={draft} />
    </>
  );
}

function EntryEditor({ entry, categories, onSaved, onError }) {
  const initial = {
    category: entry.category ?? "",
    command: entry.command ?? "m",
    label: entry.label ?? "",
    message: entry.message ?? "",
    active: entry.active === 1 || entry.active === true,
  };
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const dirty = Object.keys(initial).some(k => draft[k] !== initial[k]);
  const inactive = !initial.active;

  async function save() {
    setBusy(true); onError(null);
    try {
      await apiFetch(`/announcements/entries/${entry.entry_key}`, { method: "PATCH", body: draft });
      onSaved(`${draft.label} saved. Discord updates within about fifteen seconds.`);
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm(`Remove "${entry.label}"? The audit log keeps a copy of its wording.`)) return;
    setBusy(true); onError(null);
    try {
      await apiFetch(`/announcements/entries/${entry.entry_key}`, { method: "DELETE" });
      onSaved(`${entry.label} removed.`);
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className={`dc-entry ${inactive ? "dc-entry-inactive" : ""}`}>
      <div className="ann-head">
        <button type="button" className="dc-entry-head ann-head-main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          <span className="dc-entry-name">
            <span className="ann-cmd">:{entry.command}</span>
            <span className="ann-label">{entry.label}</span>
            {inactive && <span className="dc-tag dc-tag-muted">Hidden</span>}
          </span>
          <span className="dc-entry-meta">
            <span className="ann-peek">{entry.message}</span>
            <span className="dc-chevron">{open ? "Close" : "Edit"}</span>
          </span>
        </button>
        <CopyButton text={announcementLine(entry)} />
      </div>

      {open && (
        <div className="dc-entry-body">
          <Fields draft={draft} set={set} categories={categories} showKey={false} />

          <label className="checkbox-label dc-active">
            <input type="checkbox" checked={draft.active} onChange={e => set("active", e.target.checked)} />
            Shown in Discord
          </label>

          <div className="button-row">
            <button className="primary" type="button" disabled={!dirty || busy} onClick={save}>
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button className="secondary" type="button" disabled={busy} onClick={remove}>Remove</button>
            <code className="ann-key">{entry.entry_key}</code>
            {dirty && <span className="muted dc-note">Unsaved changes</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The composer, in a modal opened from the section header.
 *
 * It used to be a button at the very bottom of the page, underneath every
 * category and all fifty-five messages. Adding a message therefore meant
 * scrolling the entire list first, and the scroll got longer every time
 * anybody added one. The form is the same; only where you reach it from
 * has changed.
 */
function AddEntryModal({ categories, defaultCategory, onSaved, onError, onClose }) {
  const [draft, setDraft] = useState({ ...BLANK, category: defaultCategory ?? "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const ready = draft.entryKey && draft.label && draft.message && draft.category;

  async function create() {
    setBusy(true); onError(null);
    try {
      await apiFetch("/announcements/entries", { method: "POST", body: draft });
      onSaved(`${draft.label} added.`);
      onClose();
    } catch (err) { onError(err.message); setBusy(false); }
  }

  return (
    <Modal onClose={onClose} className="modal-wide" labelledBy="add-announcement-title">
      <h2 id="add-announcement-title">New in-game message</h2>
      <p className="muted card-subtitle">
        Staff pick this from the In-Game Announcements panel in Discord. It appears there within about fifteen seconds.
      </p>
      <Fields draft={draft} set={set} categories={categories} showKey />
      <div className="button-row">
        <button className="primary" type="button" disabled={busy || !ready} onClick={create}>
          {busy ? "Adding…" : "Add message"}
        </button>
        <button className="secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

export default function HrAnnouncements() {
  const query = useApiQuery(["announcements"], "/announcements", { refetchInterval: POLL_MS });
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [reordering, setReordering] = useState(false);
  const [adding, setAdding] = useState(false);

  const categories = query.data?.categories ?? [];
  const entries = query.data?.entries;
  const maxPerCategory = query.data?.maxActivePerCategory ?? 25;

  // Grouped for display, in the bot's declared category order. A category
  // with nothing in it still renders: it is where an editor adds the
  // first message to it, and hiding it would make that impossible.
  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories.map(cat => {
      const all = (entries ?? []).filter(e => e.category === cat.key);
      return {
        ...cat,
        all,
        activeCount: all.filter(e => e.active === 1).length,
        shown: term
          ? all.filter(e =>
              e.label.toLowerCase().includes(term) ||
              e.message.toLowerCase().includes(term) ||
              e.entry_key.toLowerCase().includes(term))
          : all,
      };
    });
  }, [categories, entries, search]);

  const matchCount = grouped.reduce((n, c) => n + c.shown.length, 0);

  function saved(msg) {
    setNotice(msg);
    setError(null);
    query.refetch();
  }

  async function move(cat, index, delta) {
    // Reorders against the category's FULL list, never the filtered one:
    // moving a row while a search is active must not reshuffle the rows
    // the search happens to be hiding.
    const order = cat.all.map(e => e.entry_key);
    const from = order.indexOf(cat.shown[index].entry_key);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    setReordering(true); setError(null);
    try {
      await apiFetch(`/announcements/categories/${cat.key}/reorder`, { method: "POST", body: { order } });
      query.refetch();
    } catch (err) { setError(err.message); } finally { setReordering(false); }
  }

  if (query.isError && !entries) return <Banner style={{ marginTop: 16 }}>{query.error.message}</Banner>;
  if (!entries) return <p className="muted" style={{ marginTop: 16 }}>Loading…</p>;

  return (
    <>
      <SectionHeader
        title="In-game messages"
        count={entries.length}
        subtitle="The reusable messages staff pick from the In-Game Announcements panel in Discord. Changes appear there on their own within about fifteen seconds."
        actions={
          <button className="primary small" type="button" onClick={() => setAdding(true)}>
            New message
          </button>
        }
      />

      {error && <Banner>{error}</Banner>}
      {notice && !error && <Banner variant="success">{notice}</Banner>}

      <div className="ann-toolbar">
        <input
          className="ann-search"
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search messages…"
          aria-label="Search announcements"
        />
        <span className="muted ann-count">
          {search.trim()
            ? `${matchCount} of ${entries.length} match`
            : `${entries.filter(e => e.active === 1).length} shown in Discord`}
        </span>
      </div>

      {search.trim() && matchCount === 0 && (
        <p className="muted" style={{ marginTop: 16 }}>Nothing matches “{search.trim()}”.</p>
      )}

      {grouped.map(cat => {
        // A search collapses the categories it found nothing in, so the
        // results are the page rather than a list of empty headings.
        if (search.trim() && cat.shown.length === 0) return null;
        const full = cat.activeCount >= maxPerCategory;
        return (
          <section className="ann-cat" key={cat.key}>
            <div className="ann-cat-head">
              <h3>{cat.label}</h3>
              <span className={`dc-tag ${full ? "ann-full" : ""}`}>{cat.activeCount} / {maxPerCategory} shown</span>
            </div>
            {cat.description && <p className="muted ann-cat-sub">{cat.description}</p>}
            {full && (
              <p className="muted ann-cat-sub">
                This category is at the {maxPerCategory} Discord allows in one dropdown. Hide one before adding another.
              </p>
            )}

            {cat.shown.length === 0 ? (
              <p className="muted ann-cat-sub">Nothing in this category yet.</p>
            ) : (
              <div className="dc-list">
                {cat.shown.map((entry, i) => (
                  <div className="dc-row" key={entry.entry_key}>
                    <div className="dc-order">
                      <button type="button" className="dc-move" disabled={i === 0 || reordering || !!search.trim()}
                              onClick={() => move(cat, i, -1)} aria-label={`Move ${entry.label} up`}>↑</button>
                      <button type="button" className="dc-move" disabled={i === cat.shown.length - 1 || reordering || !!search.trim()}
                              onClick={() => move(cat, i, 1)} aria-label={`Move ${entry.label} down`}>↓</button>
                    </div>
                    <EntryEditor
                      key={`${entry.entry_key}:${entry.updated_at}`}
                      entry={entry}
                      categories={categories}
                      onSaved={saved}
                      onError={setError}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {adding && (
        <AddEntryModal
          categories={categories}
          defaultCategory={categories[0]?.key}
          onSaved={saved}
          onError={setError}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  );
}

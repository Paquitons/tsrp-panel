// ==================================================================
// COMMAND PALETTE
//
// Ctrl+K, or Cmd+K on a Mac, from anywhere in the panel. Type a few
// letters, press Enter, and you are there.
//
// It exists because the panel is deep. Sending a message to the staff
// team is Management, then Content, then Staff Messages: three correct
// clicks that you can only make if you already know the answer. The
// grouping makes the panel learnable; the palette means you do not have
// to have learned it yet.
//
// It lists only what the viewer may reach, from the same predicates the
// sidebar uses, so it never becomes a catalogue of doors that are locked.
// That is a courtesy, not a boundary: every route and action re-checks
// its own access server-side.
// ==================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { commandsFor, score } from "../commands";
import { SearchIcon } from "./icons";

// The sidebar button and the keyboard shortcut are two ways into one
// dialog, and the dialog owns whether it is showing. A custom event keeps
// that ownership where it is: the button says "open the palette" without
// needing a context, a ref, or the palette's state lifted up into the
// layout for one caller.
const OPEN_EVENT = "tsrp:open-command-palette";

/** Open the palette from anywhere, without a React connection to it. */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export default function CommandPalette() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const available = useMemo(() => commandsFor(user), [user]);

  const results = useMemo(() => {
    const scored = available
      .map(c => ({ c, s: score(c, query) }))
      .filter(x => x.s > 0);
    // Stable within a score band: an empty query leaves the registry in
    // its written order, which is grouped by what you are trying to do.
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, 40).map(x => x.c);
  }, [available, query]);

  // Grouped for display, preserving the order the results came back in so
  // the best match stays first no matter which group it belongs to.
  const groups = useMemo(() => {
    const out = [];
    for (const c of results) {
      const last = out[out.length - 1];
      if (last && last.label === c.group) last.items.push(c);
      else out.push({ label: c.group, items: [c] });
    }
    return out;
  }, [results]);

  // Flat again, so the keyboard cursor is an index into one list rather
  // than a pair of group and item.
  const flat = useMemo(() => groups.flatMap(g => g.items), [groups]);

  // ---- Opening and closing ----
  useEffect(() => {
    function onKey(e) {
      const k = e.key?.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "k") {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    // Capture, so it still fires while focus is inside an input or a
    // dialog that stops propagation of its own key handling.
    function onOpenRequest() { setOpen(true); }

    document.addEventListener("keydown", onKey, true);
    window.addEventListener(OPEN_EVENT, onOpenRequest);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener(OPEN_EVENT, onOpenRequest);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    // After paint, or the input is not in the document to focus yet.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { cancelAnimationFrame(id); document.body.style.overflow = prev; };
  }, [open]);

  // A cursor past the end of a newly filtered list would leave nothing
  // selected and Enter doing nothing.
  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  function run(command) {
    if (!command) return;
    setOpen(false);
    navigate(command.to);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(i => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(i => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(flat[cursor]);
    }
  }

  let index = -1;

  return (
    <div className="cmdk-backdrop" onClick={() => setOpen(false)}>
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={e => e.stopPropagation()}
      >
        <div className="cmdk-input-row">
          <SearchIcon />
          <input
            ref={inputRef}
            className="cmdk-input"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search the panel…"
            aria-label="Search the panel"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-results"
            aria-activedescendant={flat[cursor] ? `cmdk-opt-${flat[cursor].id}` : undefined}
          />
          <kbd className="cmdk-esc">Esc</kbd>
        </div>

        <div className="cmdk-results" id="cmdk-results" role="listbox" ref={listRef}>
          {flat.length === 0 && (
            <p className="muted cmdk-empty">Nothing matches “{query.trim()}”.</p>
          )}
          {groups.map(group => (
            <div className="cmdk-group" key={group.label}>
              <p className="cmdk-group-label">{group.label}</p>
              {group.items.map(c => {
                index += 1;
                const i = index;
                return (
                  <button
                    key={c.id}
                    id={`cmdk-opt-${c.id}`}
                    data-index={i}
                    type="button"
                    role="option"
                    aria-selected={i === cursor}
                    className={`cmdk-item ${i === cursor ? "active" : ""}`}
                    onMouseMove={() => setCursor(i)}
                    onClick={() => run(c)}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> to move</span>
          <span><kbd>Enter</kbd> to open</span>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";

/**
 * A custom-styled dropdown, used in place of native <select> elements.
 *
 * The dropdown panel is rendered via a portal directly into document.body,
 * positioned with fixed coordinates computed from the trigger's own
 * position -- NOT as a normal DOM child of whatever scrollable container
 * happens to hold the trigger. This matters: if it were a normal child, any
 * scrolling ancestor (like the Dashboard's columns) would hard-clip the
 * dropdown the moment it extended past that ancestor's visible bounds,
 * regardless of the dropdown's own max-height/overflow settings -- which
 * is exactly what was cutting off the last couple of options before.
 *
 * Follows the ARIA combobox/listbox pattern: the trigger is
 * role="combobox", the panel is role="listbox", each option is
 * role="option". Keyboard support: Up/Down moves a highlighted option
 * (wrapping), Home/End jump to the first/last, typing jumps to the next
 * option starting with that character (repeat presses cycle through
 * matches), Enter/Space selects the highlighted option, Escape closes and
 * returns focus to the trigger. None of this existed before -- the
 * dropdown was mouse-only.
 */
export default function CustomSelect({ value, onChange, options, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const typeaheadRef = useRef({ query: "", timer: null });
  const listboxId = useId();

  function computeCoords() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }

  useLayoutEffect(() => {
    if (open) computeCoords();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIdx = options.findIndex(o => o.value === value);
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);

    function onClickOutside(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    // Recompute position if the page scrolls or resizes while open, so the
    // dropdown stays attached to its trigger instead of drifting away.
    function onReposition() { computeCoords(); }

    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && highlightedIndex >= 0) {
      dropdownRef.current?.children[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [open, highlightedIndex]);

  function selectIndex(idx) {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTypeahead(char) {
    const state = typeaheadRef.current;
    clearTimeout(state.timer);
    state.query += char.toLowerCase();
    state.timer = setTimeout(() => { state.query = ""; }, 600);

    const startFrom = highlightedIndex + 1;
    const ordered = [...options.slice(startFrom), ...options.slice(0, startFrom)];
    const match = ordered.find(o => o.label.toLowerCase().startsWith(state.query));
    if (match) setHighlightedIndex(options.indexOf(match));
  }

  function handleTriggerKeyDown(e) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
    }
    if (open) handleListKeyDown(e);
  }

  function handleListKeyDown(e) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(i => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(i => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setHighlightedIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectIndex(highlightedIndex);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) handleTypeahead(e.key);
    }
  }

  const selected = options.find(o => o.value === value);

  return (
    <div className="custom-select">
      <button
        type="button"
        ref={triggerRef}
        className="custom-select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="custom-select-label">{selected?.label ?? placeholder}</span>
        <span className={`custom-select-chevron ${open ? "custom-select-chevron-open" : ""}`}>⌄</span>
      </button>
      {open && coords && createPortal(
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className="custom-select-dropdown custom-select-dropdown-portal"
          style={{ top: coords.top, left: coords.left, width: coords.width }}
          onKeyDown={handleListKeyDown}
        >
          {options.map((o, idx) => (
            <button
              type="button"
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`custom-select-option ${o.value === value ? "custom-select-option-selected" : ""} ${idx === highlightedIndex ? "custom-select-option-highlighted" : ""}`}
              onMouseEnter={() => setHighlightedIndex(idx)}
              onClick={() => selectIndex(idx)}
            >
              {o.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

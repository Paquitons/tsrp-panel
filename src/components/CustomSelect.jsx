import { useEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import useAnchoredPosition from "../hooks/useAnchoredPosition";

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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const typeaheadRef = useRef({ query: "", timer: null });
  const openedOnPointerRef = useRef(false);
  const listboxId = useId();

  // Shared with PortalDropdown. It decides whether the list opens below
  // or above the trigger and caps its height to the room actually there,
  // which is what stops the last options being stranded off the bottom
  // of the screen, and it coalesces repositioning so scrolling past an
  // open list is free. See useAnchoredPosition.
  const coords = useAnchoredPosition({ anchorRef: triggerRef, panelRef: dropdownRef, open, maxHeight: 280 });

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

    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keeps the highlighted option in view while arrowing through the list.
  //
  // Done by setting the panel's own scrollTop rather than with
  // scrollIntoView. scrollIntoView walks up the ancestor chain and will
  // scroll the PAGE as well when it judges that necessary, which is both
  // unwanted here and useless: the panel is position:fixed, so moving
  // the page does not bring any part of it into view, it just yanks the
  // page out from under whatever the person was looking at.
  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const panel = dropdownRef.current;
    const option = panel?.children[highlightedIndex];
    if (!panel || !option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < panel.scrollTop) panel.scrollTop = top;
    else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight;
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
        // A mouse opens this on press, not on release. A native select
        // opens on mousedown, and matching that is the difference between
        // the list being there when the button goes down and it appearing
        // after the button comes back up, which is what "it does not
        // respond immediately" was.
        //
        // Mouse only. On touch, pointerdown fires at the start of a
        // gesture that may turn out to be a scroll, so opening there
        // would pop the list open every time somebody dragged the page
        // from this control. Touch keeps the click.
        //
        // Keyboard is neither: handleTriggerKeyDown opens on Enter, Space
        // and the arrows, and preventDefaults them, so no synthetic click
        // follows for the guard below to worry about.
        onPointerDown={e => {
          if (e.pointerType !== "mouse" || e.button !== 0) return;
          openedOnPointerRef.current = true;
          setOpen(o => !o);
        }}
        onClick={() => {
          // The click that follows the pointerdown above is the same
          // press, not a second one.
          if (openedOnPointerRef.current) { openedOnPointerRef.current = false; return; }
          setOpen(o => !o);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="custom-select-label">{selected?.label ?? placeholder}</span>
        <span className={`custom-select-chevron ${open ? "custom-select-chevron-open" : ""}`}>⌄</span>
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className="custom-select-dropdown custom-select-dropdown-portal"
          data-placement={coords?.placement}
          style={{
            top: coords?.top,
            left: coords?.left,
            width: coords?.width,
            maxHeight: coords?.maxHeight,
            maxWidth: coords?.maxWidth,
            // In the DOM but not shown for the one frame before it has
            // been measured (it cannot be measured without being here),
            // and hidden again once the trigger has scrolled out of
            // sight, so the list never floats detached over the page.
            visibility: !coords || coords.hidden ? "hidden" : undefined,
            pointerEvents: coords?.hidden ? "none" : undefined,
          }}
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

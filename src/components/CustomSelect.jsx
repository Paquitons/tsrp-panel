import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
 */
export default function CustomSelect({ value, onChange, options, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

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
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div className="custom-select">
      <button type="button" ref={triggerRef} className="custom-select-trigger" onClick={() => setOpen(o => !o)}>
        <span className="custom-select-label">{selected?.label ?? placeholder}</span>
        <span className={`custom-select-chevron ${open ? "custom-select-chevron-open" : ""}`}>⌄</span>
      </button>
      {open && coords && createPortal(
        <div
          ref={dropdownRef}
          className="custom-select-dropdown custom-select-dropdown-portal"
          style={{ top: coords.top, left: coords.left, width: coords.width }}
        >
          {options.map(o => (
            <button
              type="button"
              key={o.value}
              className={`custom-select-option ${o.value === value ? "custom-select-option-selected" : ""}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
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

import { useEffect, useRef, useState } from "react";

/**
 * A custom-styled dropdown, used in place of native <select> elements
 * throughout the panel so the UI doesn't look like generic browser chrome.
 * options: [{ value, label }]
 */
export default function CustomSelect({ value, onChange, options, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="custom-select" ref={ref}>
      <button type="button" className="custom-select-trigger" onClick={() => setOpen(o => !o)}>
        <span>{selected?.label ?? placeholder}</span>
        <span className={`custom-select-chevron ${open ? "custom-select-chevron-open" : ""}`}>⌄</span>
      </button>
      {open && (
        <div className="custom-select-dropdown">
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
        </div>
      )}
    </div>
  );
}

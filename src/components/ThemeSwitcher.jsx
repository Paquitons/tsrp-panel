import { useState } from "react";
import { THEMES, applyTheme } from "../themes";

export default function ThemeSwitcher() {
  const [current, setCurrent] = useState(localStorage.getItem("tsrp_theme") ?? "midnight");
  const [open, setOpen] = useState(false);

  function pick(key) {
    applyTheme(key);
    setCurrent(key);
  }

  return (
    <div className="theme-switcher">
      <button className="theme-switcher-toggle" onClick={() => setOpen(o => !o)}>🎨</button>
      {open && (
        <div className="theme-switcher-panel">
          <div className="theme-switcher-title">Theme (dev only)</div>
          {Object.entries(THEMES).map(([key, theme]) => (
            <button
              key={key}
              className={`theme-switcher-option ${current === key ? "theme-switcher-option-active" : ""}`}
              onClick={() => pick(key)}
            >
              <span className="theme-swatch" style={{ background: theme.vars["--accent"] }} />
              {theme.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

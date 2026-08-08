import { useEffect, useRef } from "react";

export default function Tabs({ tabs, active, onChange }) {
  const activeRef = useRef(null);

  // When the tab bar is wider than its container (e.g. Super Admin's 11
  // tabs, or this on a phone screen) and the active tab isn't the leftmost
  // one, scroll it into view -- otherwise switching to a tab that's off to
  // the right leaves the bar showing the same leftmost tabs with no visual
  // sign of which one is actually selected.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.value}
          type="button"
          role="tab"
          ref={active === t.value ? activeRef : null}
          aria-selected={active === t.value}
          className={`tab ${active === t.value ? "active" : ""}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

import { useEffect, useRef } from "react";

/**
 * `variant` picks the level this bar sits at.
 *
 *   "primary" (default)  the page's own tabs, in the sunken tray
 *   "sub"                a second level inside one primary tab
 *
 * Two levels look different on purpose. When a grouped section renders
 * two identical bars stacked, there is nothing to say which one you are
 * moving within, and the pair reads as one bar that wrapped. The sub bar
 * is an underlined row rather than a tray, so the hierarchy is legible
 * before you read either label.
 *
 * A tab may carry `count`, shown as a trailing pill. Use it only where
 * the number is a reason to click: how many things are waiting, not how
 * many exist.
 */
export default function Tabs({ tabs, active, onChange, variant = "primary", ariaLabel }) {
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
    <div className={`tabs tabs-${variant}`} role="tablist" aria-label={ariaLabel}>
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
          {t.count > 0 && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

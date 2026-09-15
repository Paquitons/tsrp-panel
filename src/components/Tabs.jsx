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
  const barRef = useRef(null);

  // When the bar is wider than its container (a phone, or Super Admin's
  // longer rows) and the active tab is off to one side, bring it into
  // view. HORIZONTALLY, AND ONLY THIS BAR.
  //
  // This used to be scrollIntoView, which walks every scrollable ancestor
  // it can find, the document included. Picking a tab could therefore
  // scroll the whole page up or down underneath you, which is not what
  // anybody means by changing tabs, and made the layout feel like it was
  // sliding around of its own accord. Setting scrollLeft on this one
  // element cannot move anything vertically, or move anything else at all.
  useEffect(() => {
    const tab = activeRef.current;
    const bar = barRef.current;
    if (!tab || !bar) return;

    const left = tab.offsetLeft;
    const right = left + tab.offsetWidth;
    const viewLeft = bar.scrollLeft;
    const viewRight = viewLeft + bar.clientWidth;
    const GUTTER = 8; // so the tab does not sit flush against the edge

    if (left < viewLeft) bar.scrollLeft = Math.max(0, left - GUTTER);
    else if (right > viewRight) bar.scrollLeft = right - bar.clientWidth + GUTTER;
  }, [active]);

  // A bar with nothing in it still occupies its row, so that a page which
  // renders this level unconditionally does not move its own content
  // around depending on whether the current tab happens to have sub-tabs.
  // It is not a tablist when it holds no tabs, though: an empty one is
  // announced as a control with nothing in it, so the role comes off and
  // it is left as the rule it looks like.
  if (!tabs || tabs.length === 0) {
    return <div className={`tabs tabs-${variant} tabs-empty`} aria-hidden="true" />;
  }

  return (
    <div ref={barRef} className={`tabs tabs-${variant}`} role="tablist" aria-label={ariaLabel}>
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

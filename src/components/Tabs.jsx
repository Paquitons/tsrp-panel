
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
  // No scroll handling any more. The bar wraps rather than scrolls, so
  // every tab is always in view and there is nothing to bring into it.
  // What used to be here was a scrollLeft nudge, which itself replaced a
  // scrollIntoView that could scroll the whole page.

  // A bar with nothing in it still occupies its row, so that a page which
  // renders this level unconditionally does not move its own content
  // around depending on whether the current tab happens to have sub-tabs.
  // It is not a tablist when it holds no tabs, though: an empty one is
  // announced as a control with nothing in it, so the role comes off and
  // it is left as the rule it looks like.
  if (!tabs || tabs.length === 0) {
    return (
      <div className={`tabs tabs-${variant} tabs-empty`} aria-hidden="true">
        {/* Zero-width, full-height: holds the row open to exactly the
            height a populated bar would be, from the same token. */}
        <span className="tab-spacer" />
      </div>
    );
  }

  return (
    <div className={`tabs tabs-${variant}`} role="tablist" aria-label={ariaLabel}>
      {tabs.map(t => (
        <button
          key={t.value}
          type="button"
          role="tab"
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

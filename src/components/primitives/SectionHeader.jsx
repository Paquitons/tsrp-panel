// ==================================================================
// SECTION HEADER
//
// The row at the top of anything that lists records: what this is, how
// many there are, and the button that creates a new one.
//
// It exists because the panel had no answer to "where is the button that
// makes a new one". Every list screen had grown its own composer form,
// and the form had ended up wherever it happened to be written, which
// was almost always underneath the list. Sending a panel-wide
// announcement meant scrolling past fifty-five in-game messages to reach
// the form at the bottom. The list is the thing that grows; an action
// parked below it gets further away every time somebody adds a record.
//
// So the action goes ABOVE the list, in a fixed place, on every screen
// that has one. The form itself moves into a modal, which is what keeps
// the header a single row no matter how big the form is.
//
//   <SectionHeader
//     title="Announcements"
//     count={55}
//     subtitle="The reusable messages staff pick from in Discord."
//     actions={<button className="primary small" onClick={open}>New message</button>}
//   />
//
// `count` is rendered as a quiet pill rather than folded into the title,
// so "Announcements" stays the same width whether there are 3 or 300 and
// the eye can find the heading without re-reading a number each time.
// ==================================================================

export default function SectionHeader({ title, count, countLabel, subtitle, actions, id, as: Tag = "h2" }) {
  // A count of 0 is worth showing ("0 waiting" is an answer); undefined
  // and null mean this section does not count anything.
  const showCount = count !== undefined && count !== null;

  return (
    <div className="section-header">
      <div className="section-header-main">
        <div className="section-header-title-row">
          <Tag id={id} className="section-header-title">{title}</Tag>
          {showCount && (
            <span className="section-header-count">
              {count}{countLabel ? ` ${countLabel}` : ""}
            </span>
          )}
        </div>
        {subtitle && <p className="muted section-header-sub">{subtitle}</p>}
      </div>
      {actions && <div className="section-header-actions">{actions}</div>}
    </div>
  );
}

// ==================================================================
// SKELETON
//
// Every loading state in the panel was the word "Loading…" in muted
// grey, in fourteen files. That tells you the page is not broken and
// nothing else: not how much is coming, not what shape it will be, and
// the layout jumps the moment it arrives.
//
// These are deliberately NOT generic grey rectangles either. Each
// variant mirrors a real piece of this UI at its real dimensions, so
// the content lands in the space the skeleton was already holding:
//
//   rows   the log, roster and queue lists: a row per record
//   form   a stack of label-and-field pairs
//   text   a short paragraph of help text
//
// Count is a guess at the usual number of records, not a filler
// quantity. Guessing high makes a short list jump when it loads.
// ==================================================================

function Bar({ w = "100%", h = 12 }) {
  return <span className="sk-bar" style={{ width: w, height: h }} />;
}

export default function Skeleton({ variant = "rows", count = 4, label = "Loading" }) {
  return (
    <div className="sk" role="status" aria-busy="true" aria-label={label}>
      {variant === "rows" && Array.from({ length: count }, (_, i) => (
        <div className="sk-row" key={i}>
          <span className="sk-dot" />
          <div className="sk-row-main">
            {/* Staggered widths, because a column of identical bars
                reads as a loading graphic rather than as rows. */}
            <Bar w={`${58 + ((i * 13) % 26)}%`} />
            <Bar w={`${28 + ((i * 7) % 18)}%`} h={10} />
          </div>
        </div>
      ))}

      {variant === "form" && Array.from({ length: count }, (_, i) => (
        <div className="sk-field" key={i}>
          <Bar w="72px" h={10} />
          <span className="sk-input" />
        </div>
      ))}

      {variant === "text" && (
        <div className="sk-text">
          <Bar w="100%" h={11} />
          <Bar w="92%" h={11} />
          <Bar w="64%" h={11} />
        </div>
      )}
    </div>
  );
}

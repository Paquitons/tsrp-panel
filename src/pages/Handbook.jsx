// ============================================================
//  STAFF HANDBOOK
//  Renders src/data/handbook.js. Deliberately NOT in the sidebar --
//  it lives at /staff-handbook and is reached by link, so the nav stays
//  a list of things you do rather than things you read.
//
//  The content is data, not JSX (see the header comment in
//  data/handbook.js for why). This file is only the renderer, and it
//  ignores a block type it does not know rather than throwing, so a
//  half-finished block can never take the page down.
// ============================================================
import { useMemo, useState } from "react";
import { HANDBOOK, HANDBOOK_GROUPS, HANDBOOK_CODES, HANDBOOK_SEARCH_TEXT } from "../data/handbook";

// Section numbers are assigned here rather than stored in the data, so
// inserting a section never means renumbering every one after it.
const NUMBERED = HANDBOOK.map((s, i) => ({ ...s, number: i + 1 }));

/**
 * The small amount of inline markup the content uses: **bold**, *italic*
 * and `code`. Written by hand rather than pulled in as a dependency --
 * three patterns do not justify a markdown parser, and this way the
 * output is React elements rather than dangerouslySetInnerHTML.
 */
function inline(text, keyPrefix = "t") {
  const out = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={key}>{token.slice(1, -1)}</code>);
    else out.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Block({ block, k }) {
  switch (block.type) {
    case "h3":
      return <h3 className="hb-h3">{inline(block.text, k)}</h3>;

    case "p":
      return <p className="hb-p">{inline(block.text, k)}</p>;

    case "list":
      return (
        <ul className="hb-list">
          {block.items.map((item, i) => <li key={i}>{inline(item, `${k}-${i}`)}</li>)}
        </ul>
      );

    case "steps":
      return (
        <ol className="hb-steps">
          {block.items.map((item, i) => <li key={i}>{inline(item, `${k}-${i}`)}</li>)}
        </ol>
      );

    case "defs":
      return (
        <div className="hb-defs">
          {block.items.map(([term, def], i) => (
            <div key={i}>
              <div className="hb-defs-k">{inline(term, `${k}-k${i}`)}</div>
              <div className="hb-defs-v">{inline(def, `${k}-v${i}`)}</div>
            </div>
          ))}
        </div>
      );

    case "reqs":
      return (
        <div className="hb-reqs">
          {block.items.map((r, i) => <span className="hb-req" key={i}>{r}</span>)}
        </div>
      );

    case "note":
      return (
        <div className={`hb-note ${block.variant ? `hb-note-${block.variant}` : ""}`}>
          {block.title && <p className="hb-note-title">{block.title}</p>}
          <p className="hb-note-body">{inline(block.body, k)}</p>
        </div>
      );

    case "table":
      return (
        <div className="hb-tw">
          <table className="hb-table">
            <thead>
              <tr>{block.head.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) =>
                // A tier row is a band heading inside the table -- the six
                // rank bands, the command groups -- not a data row.
                Array.isArray(row) ? (
                  <tr key={i}>
                    {row.map((cell, j) => <td key={j}>{inline(String(cell), `${k}-${i}-${j}`)}</td>)}
                  </tr>
                ) : (
                  <tr className="hb-tier" key={i}>
                    <td colSpan={block.head.length}>{row.tier}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}

export default function Handbook() {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();

  const visible = useMemo(() => {
    if (!term) return NUMBERED;
    return NUMBERED.filter(s => HANDBOOK_SEARCH_TEXT[s.id].includes(term));
  }, [term]);

  const visibleIds = useMemo(() => new Set(visible.map(s => s.id)), [visible]);

  // Groups with nothing left in them are dropped from the contents rather
  // than left as empty headings.
  const groups = HANDBOOK_GROUPS
    .map(g => ({ ...g, sections: NUMBERED.filter(s => s.group === g.key && visibleIds.has(s.id)) }))
    .filter(g => g.sections.length > 0);

  return (
    <div className="content hb">
      <header className="hb-masthead">
        <p className="hb-eyebrow">Texas State Roleplay · Internal</p>
        <h1>Staff Handbook</h1>
        <p className="hb-standfirst">
          How the staff team actually operates: what your rank lets you do, how every system works,
          and what is expected of you on duty. Read it in full before your first staff action, and
          come back to it rather than guessing.
        </p>
        <div className="hb-codes">
          {HANDBOOK_CODES.map(c => (
            <div className="hb-code" key={c.label}>
              <span>{c.label}</span>
              <strong>{c.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <div className="hb-body">
        <nav className="hb-rail" aria-label="Handbook contents">
          <div className="hb-finder">
            <label htmlFor="hb-q">Find a section</label>
            <input
              id="hb-q"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="strike, LOA, ban appeal…"
              autoComplete="off"
            />
            <div className="hb-finder-count" role="status">
              {term ? `${visible.length} ${visible.length === 1 ? "section" : "sections"}` : ""}
            </div>
          </div>

          {groups.map(g => (
            <div key={g.key}>
              <p className="hb-toc-group">{g.label}</p>
              <ul className="hb-toc">
                {g.sections.map(s => (
                  <li key={s.id}>
                    <a href={`#hb-${s.id}`}>
                      <span className="hb-toc-n">{s.number}</span>
                      <span>{s.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <main className="hb-main">
          {visible.length === 0 && (
            <p className="muted">Nothing matches “{query.trim()}”.</p>
          )}

          {visible.map(section => (
            <section id={`hb-${section.id}`} className="hb-section" key={section.id}>
              <h2 className="hb-h2">
                <span className="hb-h2-n">{section.number}</span>
                {section.title}
              </h2>
              {section.blocks.map((block, i) => (
                <Block block={block} k={`${section.id}-${i}`} key={i} />
              ))}
            </section>
          ))}

          <footer className="hb-footer">
            <p>
              <strong>This handbook is the single source of truth for how TSRP operates.</strong>{" "}
              Where it disagrees with something you were told, this wins; where it disagrees with what
              the system actually does, tell management so one of the two gets fixed.
            </p>
            <p>
              Every policy here has been decided and matches what the system actually enforces. There
              are no open items left in it. Direct questions about any policy here to a member of
              management.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

// ============================================================
//  STAFF HANDBOOK
//  Renders src/data/handbook.js as ONE continuous document at
//  /staff-handbook. Deliberately not in the sidebar, and deliberately
//  without a contents rail or a section filter: this is a handbook to be
//  read through, not a tool to be operated, so the whole of it runs down
//  the page in order and ends with the way back to the dashboard.
//
//  The content is data, not JSX (see the header comment in
//  data/handbook.js for why). This file is only the renderer, and it
//  ignores a block type it does not know rather than throwing, so a
//  half-finished block can never take the page down.
// ============================================================
import { Link } from "react-router-dom";
import { HANDBOOK, HANDBOOK_GROUPS, HANDBOOK_CODES } from "../data/handbook";

// Section numbers are assigned here rather than stored in the data, so
// inserting a section never means renumbering every one after it.
const NUMBERED = HANDBOOK.map((s, i) => ({ ...s, number: i + 1 }));

// Enough numerals for the groups that exist, with a plain-number
// fallback below so adding an eighth group cannot render "undefined".
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// Parts, in the order the groups are declared, each carrying its
// sections. A group with nothing in it is dropped rather than printing a
// part heading over empty space.
const PARTS = HANDBOOK_GROUPS
  .map((group, i) => ({
    ...group,
    numeral: ROMAN[i] ?? String(i + 1),
    sections: NUMBERED.filter(s => s.group === group.key),
  }))
  .filter(part => part.sections.length > 0);

/**
 * The small amount of inline markup the content uses: **bold** and
 * *italic*. Written by hand rather than pulled in as a dependency -- two
 * patterns do not justify a markdown parser, and this way the output is
 * React elements rather than dangerouslySetInnerHTML.
 *
 * There is deliberately no code/monospace form. A handbook is a printed
 * document, and a command reads perfectly well as :kick Bob1 without a
 * box drawn round it.
 */
function inline(text, keyPrefix = "t") {
  const out = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else out.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Block({ block, k }) {
  switch (block.type) {
    // h4, not h3: the section title above it is the h3. The block type is
    // still called "h3" because that is what it is in the content data,
    // where it means "one level down from the section", not a tag name.
    case "h3":
      return <h4 className="hb-h3">{inline(block.text, k)}</h4>;

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
        <dl className="hb-defs">
          {block.items.map(([term, def], i) => (
            <div key={i}>
              <dt className="hb-defs-k">{inline(term, `${k}-k${i}`)}</dt>
              <dd className="hb-defs-v">{inline(def, `${k}-v${i}`)}</dd>
            </div>
          ))}
        </dl>
      );

    case "reqs":
      return (
        <div className="hb-reqs">
          {block.items.map((r, i) => <span className="hb-req" key={i}>{r}</span>)}
        </div>
      );

    case "note":
      return (
        <aside className={`hb-note ${block.variant ? `hb-note-${block.variant}` : ""}`}>
          {block.title && <p className="hb-note-title">{block.title}</p>}
          <p className="hb-note-body">{inline(block.body, k)}</p>
        </aside>
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
  return (
    <div className="content hb">
      <article className="hb-doc">
        <header className="hb-masthead">
          <div className="hb-masthead-rule" aria-hidden="true" />
          <p className="hb-org">Texas State Roleplay</p>
          <h1 className="hb-title">Staff Handbook</h1>
          <p className="hb-standfirst">
            How the staff team operates: what your rank lets you do, how every system works, and
            what is expected of you on duty. Read it in full before your first staff action, and
            come back to it rather than guessing.
          </p>

          <dl className="hb-meta">
            <div>
              <dt>Document</dt>
              <dd>Staff Handbook</dd>
            </div>
            <div>
              <dt>Classification</dt>
              <dd>Internal · Staff only</dd>
            </div>
            <div>
              <dt>Applies to</dt>
              <dd>All staff, all ranks</dd>
            </div>
            <div>
              <dt>Authority</dt>
              <dd>Management</dd>
            </div>
          </dl>

          <div className="hb-codes">
            {HANDBOOK_CODES.map(c => (
              <div className="hb-code" key={c.label}>
                <span>{c.label}</span>
                <strong>{c.value}</strong>
              </div>
            ))}
          </div>
        </header>

        {PARTS.map(part => (
          <section className="hb-part" key={part.key}>
            <div className="hb-part-head">
              <span className="hb-part-n">Part {part.numeral}</span>
              <h2 className="hb-part-title">{part.label}</h2>
            </div>

            {part.sections.map(section => (
              <section id={`hb-${section.id}`} className="hb-section" key={section.id}>
                <h3 className="hb-h2">
                  <span className="hb-h2-n">{section.number}</span>
                  <span>{section.title}</span>
                </h3>
                {section.blocks.map((block, i) => (
                  <Block block={block} k={`${section.id}-${i}`} key={i} />
                ))}
              </section>
            ))}
          </section>
        ))}

        <footer className="hb-footer">
          <div className="hb-footer-rule" aria-hidden="true" />
          <p className="hb-footer-lead">
            <strong>This handbook is the single source of truth for how TSRP operates.</strong>{" "}
            Where it disagrees with something you were told, this wins; where it disagrees with what
            the system actually does, tell management so one of the two gets fixed.
          </p>
          <p className="hb-footer-body">
            Every policy here has been decided and matches what the system enforces. Direct
            questions about any of it to a member of management.
          </p>
          <div className="hb-footer-actions">
            <Link className="hb-return" to="/">Return to Dashboard</Link>
          </div>
          <p className="hb-colophon">Texas State Roleplay · Staff Handbook · Internal document</p>
        </footer>
      </article>
    </div>
  );
}

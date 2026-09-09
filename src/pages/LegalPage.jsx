import PublicNav from "../components/PublicNav";
import Breadcrumbs from "../components/Breadcrumbs";
import { usePublicBase } from "../hooks/usePublicBase";

// ==================================================================
// Shared shell for the two legal pages. They are plain documents with
// no data behind them, so they share a layout rather than each
// re-deriving the same header, breadcrumb and "last updated" line.
//
// LAST_UPDATED is written by hand on purpose: it should say when the
// WORDING last changed, which a build date or a file timestamp would
// get wrong every time the site is redeployed for an unrelated reason.
// ==================================================================
export const LAST_UPDATED = "9 September 2026";

export default function LegalPage({ title, intro, trail, children }) {
  const base = usePublicBase();

  return (
    <div className="home-page">
      <PublicNav />

      <Breadcrumbs trail={[{ label: title }]} />

      <div className="board-header">
        <h1>{title}</h1>
        {intro && <p className="muted">{intro}</p>}
      </div>

      <div className="legal-doc">
        {children}
        <p className="legal-updated">Last updated {LAST_UPDATED}.</p>
      </div>
    </div>
  );
}

/** One titled section, so both documents read the same way. */
export function LegalSection({ heading, children }) {
  return (
    <section className="legal-section">
      <h2>{heading}</h2>
      {children}
    </section>
  );
}

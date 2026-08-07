import { Link } from "react-router-dom";

/**
 * A trail of links back up the public site's hub-and-spoke structure (e.g.
 * Economy > Stock Market > TSLA), rendered above the page's own header.
 * The last crumb is the current page and isn't a link. Sits alongside
 * PublicNav rather than replacing it -- the top nav covers the site's
 * top-level sections, this covers the page a visitor is actually on, which
 * for a page two hops deep (a stock's detail page, say) the top nav alone
 * doesn't show.
 *
 * `trail` is every crumb including the current page:
 *   [{ label: "Economy", to: "/economy" }, { label: "Stock Market", to: "/stocks" }, { label: "TSLA" }]
 */
export default function Breadcrumbs({ trail }) {
  return (
    <nav className="board-back" aria-label="Breadcrumb">
      {trail.map((crumb, i) => (
        <span key={i}>
          {i > 0 && <span className="board-back-sep"> / </span>}
          {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}
        </span>
      ))}
    </nav>
  );
}

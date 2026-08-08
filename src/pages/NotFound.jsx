import { Link } from "react-router-dom";
import PublicNav from "../components/PublicNav";

function NotFoundBody() {
  return (
    <div style={{ textAlign: "center", padding: "var(--space-6) 0 var(--space-8)" }}>
      <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-faint)", lineHeight: 1 }}>404</div>
      <p className="muted" style={{ marginTop: "var(--space-3)", fontSize: "var(--text-md)" }}>
        This page doesn't exist, or it may have moved.
      </p>
    </div>
  );
}

/**
 * The public-site version -- used as the catch-all route inside
 * AppShell's public <Routes> (covers both logged-out visitors and a
 * logged-in staff member browsing under /site), matching Home.jsx's
 * home-page/PublicNav wrapper convention.
 */
export function PublicNotFound() {
  return (
    <div className="home-page">
      <PublicNav />
      <div className="home-hero">
        <h1>Page Not Found</h1>
        <NotFoundBody />
        <div className="button-row" style={{ justifyContent: "center" }}>
          <Link to="/" className="primary" style={{ padding: "10px 20px", borderRadius: "var(--radius-sm)" }}>Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

/**
 * The authenticated-panel version -- used as the catch-all route inside
 * AppShell's logged-in <Routes>, matching every other authenticated
 * page's content/page-header wrapper convention.
 */
export default function NotFound() {
  return (
    <div className="content">
      <div className="page-header"><h1>Page Not Found</h1></div>
      <NotFoundBody />
      <div className="button-row" style={{ justifyContent: "center" }}>
        <Link to="/" className="primary" style={{ padding: "10px 20px", borderRadius: "var(--radius-sm)" }}>Back to Dashboard</Link>
      </div>
    </div>
  );
}

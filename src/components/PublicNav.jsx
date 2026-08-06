import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePublicBase } from "../hooks/usePublicBase";
import { MenuIcon, CloseIcon } from "./icons";

const LOGO_URL = "https://raw.githubusercontent.com/Paquitons/FF-Studios/refs/heads/main/tsrp.png";

/**
 * Shared header for every public-facing page (Home, Leaderboards, Roster,
 * Changelog). Renders in two modes:
 *  - public: the normal marketing-site header, with a "Staff Panel" button
 *    that sends a logged-out visitor to /login.
 *  - embedded: shown when a logged-in staff member is browsing the public
 *    site from inside the panel (see the /site/* routes in App.jsx) --
 *    swaps the Staff Panel button for one that returns to the actual
 *    panel, since they're already authenticated.
 * Detected automatically from auth state so every page just renders
 * <PublicNav /> without needing to know or pass down which mode applies.
 */
export default function PublicNav() {
  const { user } = useAuth();
  const embedded = !!user;
  const base = usePublicBase();

  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const links = [
    { to: `${base}/economy`, label: "Economy" },
    { to: `${base}/leaderboards`, label: "Leaderboards" },
    { to: `${base}/roster`, label: "Staff Roster" },
    { to: "/changelog", label: "Changelog" },
  ];

  return (
    <>
      <header className="home-topbar">
        <Link to={base || "/"} className="home-brand">
          <img src={LOGO_URL} alt="" className="home-brand-mark" />
          <span>Texas State RP</span>
        </Link>

        <nav className="home-topbar-nav">
          {links.map(({ to, label }) => (
            <Link key={label} to={to}>{label}</Link>
          ))}
          {embedded
            ? <Link to="/" className="home-staff-btn">Back to Panel</Link>
            : <Link to="/login" className="home-staff-btn">Staff Panel</Link>}
        </nav>

        <button
          className="home-menu-btn"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      {menuOpen && (
        <nav className="home-mobile-menu">
          {links.map(({ to, label }) => (
            <Link key={label} to={to} onClick={() => setMenuOpen(false)}>{label}</Link>
          ))}
          {embedded
            ? <Link to="/" className="home-staff-btn" onClick={() => setMenuOpen(false)}>Back to Panel</Link>
            : <Link to="/login" className="home-staff-btn" onClick={() => setMenuOpen(false)}>Staff Panel</Link>}
        </nav>
      )}
    </>
  );
}

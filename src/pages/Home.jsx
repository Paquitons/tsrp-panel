import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import { CHANGELOGS } from "../data/changelogs";
import { colorForIndex } from "../data/changelogColors";

const LOGO_URL = "https://raw.githubusercontent.com/Paquitons/FF-Studios/refs/heads/main/tsrp.png";
const STATUS_POLL_MS = 15_000;

function StatusPill({ online }) {
  return (
    <span className={`home-status-pill ${online ? "online" : "offline"}`}>
      <span className="home-status-dot" />
      {online ? "Server Online" : "Server Offline"}
    </span>
  );
}

export default function Home() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await apiFetch("/public/status", { auth: false });
        if (!cancelled) setStatus(data);
      } catch {
        // Best-effort -- the stats row just keeps showing its last known
        // values (or the loading state) rather than breaking the page.
      }
    }

    poll();
    const interval = setInterval(poll, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const recentUpdates = CHANGELOGS.slice(0, 3);

  return (
    <div className="home-page">
      <header className="home-topbar">
        <div className="home-brand">
          <img src={LOGO_URL} alt="" className="home-brand-mark" />
          <span>Texas State RP</span>
        </div>
        <nav className="home-topbar-nav">
          <a href="#status">Status</a>
          <Link to="/changelog">Changelog</Link>
          <Link to="/login" className="home-staff-btn">Staff Panel</Link>
        </nav>
      </header>

      <section className="home-hero">
        <StatusPill online={!!status?.online} />
        <h1>Texas State RP</h1>
        <p className="home-hero-sub">
          A Roblox Emergency Response: Liberty County community &mdash; live server
          status, the latest updates, and everything else you need to know,
          all in one place.
        </p>
      </section>

      <section id="status" className="home-stats">
        <div className="home-stat-tile">
          <span className="home-stat-label">Players</span>
          <span className="home-stat-value">
            {status ? `${status.players}/${status.maxPlayers}` : "—"}
          </span>
        </div>
        <div className="home-stat-tile">
          <span className="home-stat-label">In Queue</span>
          <span className="home-stat-value">{status ? status.queue : "—"}</span>
        </div>
        <div className="home-stat-tile">
          <span className="home-stat-label">Staff On Duty</span>
          <span className="home-stat-value">{status ? status.staffOnDuty : "—"}</span>
        </div>
      </section>

      <section className="home-updates">
        <div className="home-section-head">
          <h2>Latest Updates</h2>
          <Link to="/changelog" className="home-section-link">View all</Link>
        </div>
        <div className="home-updates-grid">
          {recentUpdates.map((entry, i) => (
            <Link to={`/changelog/${entry.slug}`} className="home-update-card" key={entry.slug}>
              <div className="home-update-thumb" style={{ background: colorForIndex(i) }}>
                <span>v{entry.version}</span>
              </div>
              <div className="home-update-body">
                <h3>{entry.title}</h3>
                <p className="muted">{entry.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <span>Texas State RP</span>
        <Link to="/login" className="muted">Staff Panel</Link>
      </footer>
    </div>
  );
}

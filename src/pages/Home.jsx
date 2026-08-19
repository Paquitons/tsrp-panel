import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import { CHANGELOGS } from "../data/changelogs";
import { colorForIndex } from "../data/changelogColors";
import PublicNav from "../components/PublicNav";
import { usePolling } from "../hooks/usePolling";
import Card from "../components/primitives/Card";

// "Highly active" tier -- player count, queue, and server status are all
// exactly the kind of thing Phase 3 wants to feel live (see usePolling).
const STATUS_POLL_MS = 5_000;

// `online` here is the staff-declared "is a session actually open" flag
// (set by /startup and /shutdown -- see highrock-bot's serverState.js and
// tsrp-panel-api's erlcCache.getSessionState), not something inferred
// from ERLC's server API or the current player count. A session can be
// open with nobody in it yet and this correctly still says Online; it's
// only Offline once staff actually run /shutdown.
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

  usePolling(async () => {
    try {
      const data = await apiFetch("/public/status", { auth: false });
      setStatus(data);
    } catch {
      // Best-effort -- the stats row just keeps showing its last known
      // values (or the loading state) rather than breaking the page.
    }
  }, STATUS_POLL_MS);

  const recentUpdates = CHANGELOGS.slice(0, 3);

  return (
    <div className="home-page">
      <PublicNav />

      <section className="home-hero">
        <StatusPill online={!!status?.online} />
        <h1>Texas State RP</h1>
        <p className="home-hero-sub">
          The official website for Texas State Roleplay | Track who's on
          duty, check the leaderboards, and catch up on the latest server
          updates.
        </p>
      </section>

      <section className="home-stats">
        <Card variant="stat">
          <span className="home-stat-label">Players</span>
          <span className="home-stat-value">
            {status ? `${status.players}/${status.maxPlayers}` : "—"}
          </span>
        </Card>
        <Card variant="stat">
          <span className="home-stat-label">In Queue</span>
          <span className="home-stat-value">{status ? status.queue : "—"}</span>
        </Card>
        <Card variant="stat">
          <span className="home-stat-label">Staff On Duty</span>
          <span className="home-stat-value">{status ? status.staffOnDuty : "—"}</span>
        </Card>
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
        <Link to="/changelog" className="muted">Changelog</Link>
      </footer>
    </div>
  );
}

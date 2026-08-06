import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import { CHANGELOGS } from "../data/changelogs";
import { colorForIndex } from "../data/changelogColors";
import PublicNav from "../components/PublicNav";

const STATUS_POLL_MS = 15_000;

// ERLC's server API has no "is a live game session actually running"
// field -- just config plus a player count (see api.erlc.gg/v2/server) --
// so a reachable-but-empty private server and a truly offline one both
// used to render as a flat "online"/"offline" boolean. That's how a 0/50
// player count ended up sitting right under a green "Server Online" pill,
// reading as a contradiction. Splitting into a third "empty" state (still
// reachable, nobody in it right now) removes the mixed signal without
// claiming information ERLC's API doesn't actually give us.
function StatusPill({ online, players }) {
  if (!online) {
    return (
      <span className="home-status-pill offline">
        <span className="home-status-dot" />
        Server Offline
      </span>
    );
  }
  if (players === 0) {
    return (
      <span className="home-status-pill empty">
        <span className="home-status-dot" />
        Server Online -- Empty
      </span>
    );
  }
  return (
    <span className="home-status-pill online">
      <span className="home-status-dot" />
      Server Online
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
      <PublicNav />

      <section className="home-hero">
        <StatusPill online={!!status?.online} players={status?.players} />
        <h1>Texas State RP</h1>
        <p className="home-hero-sub">
          The official website for Texas State Roleplay -- Liberty County's
          premier ER:LC community. Track who's on duty, check the
          leaderboards, and catch up on the latest server updates.
        </p>
      </section>

      <section className="home-stats">
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
        <Link to="/changelog" className="muted">Changelog</Link>
      </footer>
    </div>
  );
}

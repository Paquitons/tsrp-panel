import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import PublicNav from "../components/PublicNav";
import Breadcrumbs from "../components/Breadcrumbs";
import DiscordAvatar from "../components/DiscordAvatar";
import { usePublicBase } from "../hooks/usePublicBase";
import { usePolling } from "../hooks/usePolling";
import { changeClass } from "../utils";

const NEWS_POLL_MS = 15_000; // "moderately active" -- new items land unpredictably, not continuously

function fmt(n) {
  return `$${Number(n ?? 0).toLocaleString()}`;
}

function formatWhen(ts) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function NewsItem({ item, base }) {
  if (item.type === "stock") {
    return (
      <div className="news-row">
        <span className={`news-dot ${changeClass(item.impactPercent)}`} />
        <div className="news-row-body">
          <p className="news-headline">
            {item.ticker && <Link to={`${base}/stocks/${item.ticker}`} className="news-ticker-tag">{item.ticker}</Link>}
            {item.headline}
          </p>
          {item.body && <p className="muted news-subtext">{item.body}</p>}
        </div>
        <span className="muted news-timestamp">{formatWhen(item.timestamp)}</span>
      </div>
    );
  }

  if (item.type === "announcement") {
    return (
      <div className="news-row">
        <span className={`news-dot ${item.impactPercent !== null ? changeClass(item.impactPercent) : ""} ${item.importance === "major" ? "major" : ""}`} />
        <div className="news-row-body">
          <p className="news-headline">
            {item.ticker && <Link to={`${base}/stocks/${item.ticker}`} className="news-ticker-tag">{item.ticker}</Link>}
            {item.importance === "major" && <span className="news-major-tag">Major</span>}
            {item.headline}
          </p>
          {item.body && <p className="muted news-subtext">{item.body}</p>}
        </div>
        <span className="muted news-timestamp">{formatWhen(item.timestamp)}</span>
      </div>
    );
  }

  if (item.type === "lottery") {
    return (
      <div className="news-row">
        <DiscordAvatar discordId={item.discordId} avatarHash={item.avatarHash} size={28} />
        <div className="news-row-body">
          <p className="news-headline">
            <strong>{item.username ?? "A player"}</strong> won the lottery -- {fmt(item.payout)}
          </p>
        </div>
        <span className="muted news-timestamp">{formatWhen(item.timestamp)}</span>
      </div>
    );
  }

  // business
  return (
    <div className="news-row">
      <DiscordAvatar discordId={item.discordId} avatarHash={item.avatarHash} size={28} />
      <div className="news-row-body">
        <p className="news-headline">
          <strong>{item.username ?? "A player"}</strong> opened a new business -- {item.name}
        </p>
      </div>
      <span className="muted news-timestamp">{formatWhen(item.timestamp)}</span>
    </div>
  );
}

export default function EconomyNews() {
  const [news, setNews] = useState(null);
  const [error, setError] = useState(null);
  const base = usePublicBase();

  usePolling(() => apiFetch("/public/economy/news", { auth: false })
    .then(data => setNews(data.news))
    .catch(err => setError(err.message)), NEWS_POLL_MS);

  return (
    <div className="home-page">
      <PublicNav />

      <Breadcrumbs trail={[{ label: "Economy", to: `${base}/economy` }, { label: "Economy News" }]} />

      <div className="board-header">
        <h1>Economy News</h1>
        <p className="muted">Market moves, lottery wins, and new businesses, most recent first.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!news && !error && <p className="muted">Loading…</p>}
      {news?.length === 0 && <p className="muted">No economy news yet.</p>}

      {news?.length > 0 && (
        <div className="roster-list">
          {news.map((item, i) => <NewsItem item={item} base={base} key={i} />)}
        </div>
      )}
    </div>
  );
}

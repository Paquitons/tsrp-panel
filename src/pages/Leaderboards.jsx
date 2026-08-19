import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import DiscordAvatar from "../components/DiscordAvatar";
import PublicNav from "../components/PublicNav";
import { usePublicBase } from "../hooks/usePublicBase";
import { usePolling } from "../hooks/usePolling";
import { pctChange } from "../utils";
import AsyncBoundary from "../components/primitives/AsyncBoundary";
import Card from "../components/primitives/Card";

const CURRENCY = "$";
const LEADERBOARDS_POLL_MS = 20_000; // "moderately active" tier

function fmt(n) {
  return `${CURRENCY}${Number(n ?? 0).toLocaleString()}`;
}

function RankedRow({ rank, avatar, name, value, valueClass, to }) {
  const content = (
    <>
      <span className="board-rank">{rank}</span>
      {avatar}
      <span className="board-name">{name}</span>
      <span className={`board-value ${valueClass ?? ""}`}>{value}</span>
    </>
  );
  return to
    ? <Link to={to} className="board-row board-row-link">{content}</Link>
    : <div className="board-row">{content}</div>;
}

export default function Leaderboards() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const base = usePublicBase();

  usePolling(() => apiFetch("/public/leaderboards", { auth: false }).then(d => { setData(d); setError(null); }).catch(err => setError(err.message)), LEADERBOARDS_POLL_MS);

  return (
    <div className="home-page">
      <PublicNav />
      <div className="board-header">
        <h1>Leaderboards</h1>
        <p className="muted">Where the money in TSRP actually is right now.</p>
      </div>

      <AsyncBoundary isLoading={!data && !error} isError={!!error} error={error && { message: error }}>
        {() => (
        <div className="board-grid">
          <Card variant="board" as="section">
            <h2>Richest Players</h2>
            <p className="muted card-subtitle">By total net worth -- cash, bank, businesses, property, and investments, minus loans.</p>
            {data.players.length === 0 && <p className="muted">No wallets yet.</p>}
            {data.players.map((p, i) => (
              <RankedRow
                key={p.discordId}
                rank={i + 1}
                avatar={<DiscordAvatar discordId={p.discordId} avatarHash={p.avatarHash} size={26} />}
                name={p.nickname || p.username || `Player #${p.discordId.slice(-4)}`}
                value={fmt(p.netWorth)}
              />
            ))}
          </Card>

          <Card variant="board" as="section">
            <h2>Top Businesses</h2>
            {data.businesses.length === 0 && <p className="muted">No businesses yet.</p>}
            {data.businesses.map((b, i) => (
              <RankedRow
                key={b.name}
                rank={i + 1}
                avatar={<DiscordAvatar discordId={b.ownerDiscordId} avatarHash={b.avatarHash} size={26} />}
                name={b.name}
                value={fmt(b.treasury)}
              />
            ))}
          </Card>

          <Card variant="board" className="board-card-wide" as="section">
            <div className="home-section-head">
              <h2>Stock Market</h2>
              <Link to={`${base}/stocks`} className="home-section-link">View all</Link>
            </div>
            <p className="muted card-subtitle">
              {data.stocks.stockCount} stock{data.stocks.stockCount === 1 ? "" : "s"} listed &middot; {fmt(data.stocks.totalMarketCap)} total market cap
            </p>
            <div className="board-stocks-split">
              <div>
                <h3 className="board-substack-head positive">Top Gainers (24h)</h3>
                {data.stocks.gainers.length === 0 && <p className="muted">No movement yet.</p>}
                {data.stocks.gainers.map(s => (
                  <RankedRow
                    key={`gain-${s.ticker}`}
                    rank={s.ticker}
                    avatar={null}
                    name={s.name}
                    value={pctChange(s.dailyChangePercent)}
                    valueClass="positive"
                    to={`${base}/stocks/${s.ticker}`}
                  />
                ))}
              </div>
              <div>
                <h3 className="board-substack-head negative">Top Losers (24h)</h3>
                {data.stocks.losers.length === 0 && <p className="muted">No movement yet.</p>}
                {data.stocks.losers.map(s => (
                  <RankedRow
                    key={`lose-${s.ticker}`}
                    rank={s.ticker}
                    avatar={null}
                    name={s.name}
                    value={pctChange(s.dailyChangePercent)}
                    valueClass="negative"
                    to={`${base}/stocks/${s.ticker}`}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>
        )}
      </AsyncBoundary>
    </div>
  );
}

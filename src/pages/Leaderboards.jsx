import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import DiscordAvatar from "../components/DiscordAvatar";

const CURRENCY = "$";

function fmt(n) {
  return `${CURRENCY}${Number(n ?? 0).toLocaleString()}`;
}

function pct(n) {
  if (n === null || n === undefined) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function RankedRow({ rank, avatar, name, value, valueClass }) {
  return (
    <div className="board-row">
      <span className="board-rank">{rank}</span>
      {avatar}
      <span className="board-name">{name}</span>
      <span className={`board-value ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

export default function Leaderboards() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/public/leaderboards", { auth: false }).then(setData).catch(err => setError(err.message));
  }, []);

  return (
    <div className="home-page">
      <div className="board-header">
        <Link to="/" className="board-back">&larr; Texas State RP</Link>
        <h1>Leaderboards</h1>
        <p className="muted">Where the money in TSRP actually is right now.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!data && !error && <p className="muted">Loading…</p>}

      {data && (
        <div className="board-grid">
          <section className="board-card">
            <h2>Richest Players</h2>
            {data.players.length === 0 && <p className="muted">No wallets yet.</p>}
            {data.players.map((p, i) => (
              <RankedRow
                key={p.discordId}
                rank={i + 1}
                avatar={<DiscordAvatar discordId={p.discordId} avatarHash={p.avatarHash} size={26} />}
                name={p.username ?? `Player #${p.discordId.slice(-4)}`}
                value={fmt(p.balance)}
              />
            ))}
          </section>

          <section className="board-card">
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
          </section>

          <section className="board-card board-card-wide">
            <h2>Stock Market</h2>
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
                    value={pct(s.dailyChangePercent)}
                    valueClass="positive"
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
                    value={pct(s.dailyChangePercent)}
                    valueClass="negative"
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

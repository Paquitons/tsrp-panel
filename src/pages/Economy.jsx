import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import PublicNav from "../components/PublicNav";
import MoneyBreakdown from "../components/MoneyBreakdown";
import { usePublicBase } from "../hooks/usePublicBase";
import { usePolling } from "../hooks/usePolling";

const ECONOMY_POLL_MS = 20_000; // "moderately active" tier -- aggregate stats, not a tight loop

function fmt(n) {
  return `$${Number(n ?? 0).toLocaleString()}`;
}

export default function Economy() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const base = usePublicBase();

  usePolling(() => apiFetch("/public/economy", { auth: false }).then(setData).catch(err => setError(err.message)), ECONOMY_POLL_MS);

  return (
    <div className="home-page">
      <PublicNav />

      <div className="board-header">
        <h1>Economy</h1>
        <p className="muted">A snapshot of where the money in TSRP's economy actually sits.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!data && !error && <p className="muted">Loading…</p>}

      {data && (
        <>
          <section className="econ-stats">
            <div className="home-stat-tile">
              <span className="home-stat-label">Total Money Supply</span>
              <span className="home-stat-value">{fmt(data.totalMoneySupply)}</span>
            </div>
            <div className="home-stat-tile">
              <span className="home-stat-label">Player Wallets</span>
              <span className="home-stat-value">{data.walletCount.toLocaleString()}</span>
            </div>
            <div className="home-stat-tile">
              <span className="home-stat-label">Businesses</span>
              <span className="home-stat-value">{data.businessCount.toLocaleString()}</span>
            </div>
            <div className="home-stat-tile">
              <span className="home-stat-label">Stock Market Cap</span>
              <span className="home-stat-value">{fmt(data.stockMarketCap)}</span>
            </div>
            <div className="home-stat-tile">
              <span className="home-stat-label">Trades (24h)</span>
              <span className="home-stat-value">{data.tradesLast24h.toLocaleString()}</span>
            </div>
            <div className="home-stat-tile">
              <span className="home-stat-label">Volume (24h)</span>
              <span className="home-stat-value">{fmt(data.volumeLast24h)}</span>
            </div>
          </section>

          <section className="board-card">
            <h2>Where the Money Sits</h2>
            <MoneyBreakdown
              total={data.totalMoneySupply}
              values={{
                wallets: data.totalWalletBalance,
                savings: data.totalSavings,
                treasury: data.totalBusinessTreasury,
                government: data.governmentBalance,
                stockMarket: data.stockMarketBalance,
              }}
            />
          </section>

          <div className="econ-links">
            <Link to={`${base}/stocks`} className="econ-link-card">
              <h3>Stock Market</h3>
              <p className="muted">Browse every listed stock, with live prices and history.</p>
            </Link>
            <Link to={`${base}/leaderboards`} className="econ-link-card">
              <h3>Leaderboards</h3>
              <p className="muted">See the richest players and top businesses.</p>
            </Link>
            <Link to={`${base}/economy/news`} className="econ-link-card">
              <h3>Economy News</h3>
              <p className="muted">Market moves, lottery wins, and new businesses.</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

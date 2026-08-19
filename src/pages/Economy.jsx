import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import PublicNav from "../components/PublicNav";
import MoneyBreakdown from "../components/MoneyBreakdown";
import { usePublicBase } from "../hooks/usePublicBase";
import { usePolling } from "../hooks/usePolling";
import AsyncBoundary from "../components/primitives/AsyncBoundary";
import Card from "../components/primitives/Card";

const ECONOMY_POLL_MS = 20_000; // "moderately active" tier -- aggregate stats, not a tight loop

function fmt(n) {
  return `$${Number(n ?? 0).toLocaleString()}`;
}

export default function Economy() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const base = usePublicBase();

  usePolling(() => apiFetch("/public/economy", { auth: false }).then(d => { setData(d); setError(null); }).catch(err => setError(err.message)), ECONOMY_POLL_MS);

  return (
    <div className="home-page">
      <PublicNav />

      <div className="board-header">
        <h1>Economy</h1>
        <p className="muted">A snapshot of where the money in TSRP's economy actually sits.</p>
      </div>

      <AsyncBoundary isLoading={!data && !error} isError={!!error} error={error && { message: error }}>
        {() => (
        <>
          <section className="econ-stats">
            <Card variant="stat">
              <span className="home-stat-label">Total Money Supply</span>
              <span className="home-stat-value">{fmt(data.totalMoneySupply)}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">Player Wallets</span>
              <span className="home-stat-value">{data.walletCount.toLocaleString()}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">Businesses</span>
              <span className="home-stat-value">{data.businessCount.toLocaleString()}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">Stock Market Cap</span>
              <span className="home-stat-value">{fmt(data.stockMarketCap)}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">Trades (24h)</span>
              <span className="home-stat-value">{data.tradesLast24h.toLocaleString()}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">Volume (24h)</span>
              <span className="home-stat-value">{fmt(data.volumeLast24h)}</span>
            </Card>
          </section>

          <Card variant="board" as="section">
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
          </Card>

          <div className="econ-links">
            <Card variant="link" as={Link} to={`${base}/stocks`}>
              <h3>Stock Market</h3>
              <p className="muted">Browse every listed stock, with live prices and history.</p>
            </Card>
            <Card variant="link" as={Link} to={`${base}/leaderboards`}>
              <h3>Leaderboards</h3>
              <p className="muted">See the richest players and top businesses.</p>
            </Card>
            <Card variant="link" as={Link} to={`${base}/economy/news`}>
              <h3>Economy News</h3>
              <p className="muted">Market moves, lottery wins, and new businesses.</p>
            </Card>
          </div>
        </>
        )}
      </AsyncBoundary>
    </div>
  );
}

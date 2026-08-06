import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api";
import PublicNav from "../components/PublicNav";
import PriceChart from "../components/PriceChart";
import { pctChange, changeClass } from "../utils";

function fmt(n) {
  return `$${Number(n ?? 0).toLocaleString()}`;
}

export default function StockDetail() {
  const { ticker } = useParams();
  const [stock, setStock] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setStock(null);
    setError(null);
    apiFetch(`/public/stocks/${ticker}`, { auth: false })
      .then(setStock)
      .catch(err => setError(err.message));
  }, [ticker]);

  return (
    <div className="home-page">
      <PublicNav />

      {error && (
        <div className="board-header">
          <h1>{ticker}</h1>
          <div className="error-banner">This stock doesn't exist or is no longer listed.</div>
        </div>
      )}

      {!stock && !error && <p className="muted">Loading…</p>}

      {stock && (
        <>
          <div className="board-header stock-detail-header">
            <div>
              <h1>{stock.name} <span className="stock-detail-ticker">{stock.ticker}</span></h1>
              <p className="muted">{stock.category}</p>
            </div>
            <div className="stock-detail-price">
              <span className="home-stat-value">${stock.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className={`board-value ${changeClass(stock.performance.daily)}`}>
                {pctChange(stock.performance.daily)} today
              </span>
            </div>
          </div>

          <section className="board-card">
            <PriceChart history={stock.history} />
          </section>

          <section className="econ-stats stock-perf-stats">
            <div className="home-stat-tile">
              <span className="home-stat-label">Daily</span>
              <span className={`home-stat-value ${changeClass(stock.performance.daily)}`}>{pctChange(stock.performance.daily)}</span>
            </div>
            <div className="home-stat-tile">
              <span className="home-stat-label">Weekly</span>
              <span className={`home-stat-value ${changeClass(stock.performance.weekly)}`}>{pctChange(stock.performance.weekly)}</span>
            </div>
            <div className="home-stat-tile">
              <span className="home-stat-label">Monthly</span>
              <span className={`home-stat-value ${changeClass(stock.performance.monthly)}`}>{pctChange(stock.performance.monthly)}</span>
            </div>
            <div className="home-stat-tile">
              <span className="home-stat-label">Market Cap</span>
              <span className="home-stat-value">{fmt(stock.marketCap)}</span>
            </div>
          </section>

          {stock.description && (
            <section className="board-card">
              <h2>About {stock.name}</h2>
              <p>{stock.description}</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

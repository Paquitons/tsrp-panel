import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api";
import PublicNav from "../components/PublicNav";
import PriceChart from "../components/PriceChart";
import CustomSelect from "../components/CustomSelect";
import { usePolling } from "../hooks/usePolling";
import { pctChange, changeClass, CHART_RANGE_OPTIONS } from "../utils";

const STOCK_DETAIL_POLL_MS = 5_000; // "highly active" tier -- live price + chart

function fmt(n) {
  return `$${Number(n ?? 0).toLocaleString()}`;
}

export default function StockDetail() {
  const { ticker } = useParams();
  const [stock, setStock] = useState(null);
  const [error, setError] = useState(null);
  const [range, setRange] = useState(CHART_RANGE_OPTIONS[0].value);

  // Reset immediately on navigation (don't show the previous ticker's
  // stale data while the new one loads) -- separate from the poll itself
  // since this is a one-time reset per ticker, not something to repeat.
  useEffect(() => {
    setStock(null);
    setError(null);
  }, [ticker]);

  usePolling(() => apiFetch(`/public/stocks/${ticker}?since=${Date.now() - Number(range)}`, { auth: false })
    .then(setStock)
    .catch(err => setError(err.message)), STOCK_DETAIL_POLL_MS, [ticker, range]);

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
            <div className="modal-title-row" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Price History</h2>
              <CustomSelect value={range} onChange={setRange} options={CHART_RANGE_OPTIONS} />
            </div>
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

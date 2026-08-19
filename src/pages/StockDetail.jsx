import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api";
import PublicNav from "../components/PublicNav";
import Breadcrumbs from "../components/Breadcrumbs";
import PriceChart from "../components/PriceChart";
import CustomSelect from "../components/CustomSelect";
import { usePolling } from "../hooks/usePolling";
import { usePublicBase } from "../hooks/usePublicBase";
import { pctChange, changeClass, CHART_RANGE_OPTIONS } from "../utils";
import Card from "../components/primitives/Card";

const STOCK_DETAIL_POLL_MS = 5_000; // "highly active" tier -- live price + chart

function fmt(n) {
  return `$${Number(n ?? 0).toLocaleString()}`;
}

export default function StockDetail() {
  const { ticker } = useParams();
  const base = usePublicBase();
  const [stock, setStock] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [range, setRange] = useState(CHART_RANGE_OPTIONS[0].value);

  // Reset immediately on navigation (don't show the previous ticker's
  // stale data while the new one loads) -- separate from the poll itself
  // since this is a one-time reset per ticker, not something to repeat.
  useEffect(() => {
    setStock(null);
    setEvents([]);
    setError(null);
  }, [ticker]);

  usePolling(() => apiFetch(`/public/stocks/${ticker}?since=${Date.now() - Number(range)}`, { auth: false })
    .then(s => { setStock(s); setError(null); })
    .catch(err => setError(err.message)), STOCK_DETAIL_POLL_MS, [ticker, range]);

  usePolling(() => apiFetch(`/public/stocks/${ticker}/events`, { auth: false })
    .then(({ events }) => setEvents(events))
    .catch(() => {}), STOCK_DETAIL_POLL_MS, [ticker]);

  return (
    <div className="home-page">
      <PublicNav />

      <Breadcrumbs trail={[{ label: "Economy", to: `${base}/economy` }, { label: "Stock Market", to: `${base}/stocks` }, { label: ticker }]} />

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

          <Card variant="board" as="section">
            <div className="modal-title-row" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Price History</h2>
              <CustomSelect value={range} onChange={setRange} options={CHART_RANGE_OPTIONS} />
            </div>
            <PriceChart history={stock.history} />
          </Card>

          <section className="econ-stats stock-perf-stats">
            <Card variant="stat">
              <span className="home-stat-label">24h Change</span>
              <span className={`home-stat-value ${changeClass(stock.performance.daily)}`}>{pctChange(stock.performance.daily)}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">7-Day Change</span>
              <span className={`home-stat-value ${changeClass(stock.performance.weekly)}`}>{pctChange(stock.performance.weekly)}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">30-Day Change</span>
              <span className={`home-stat-value ${changeClass(stock.performance.monthly)}`}>{pctChange(stock.performance.monthly)}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">Market Value</span>
              <span className="home-stat-value">{fmt(stock.marketCap)}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">All-Time High</span>
              <span className="home-stat-value">{stock.high != null ? fmt(stock.high) : "--"}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">All-Time Low</span>
              <span className="home-stat-value">{stock.low != null ? fmt(stock.low) : "--"}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">Total Shares</span>
              <span className="home-stat-value">{stock.sharesOutstanding.toLocaleString()}</span>
            </Card>
            <Card variant="stat">
              <span className="home-stat-label">Available Shares</span>
              <span className="home-stat-value">{stock.sharesAvailable.toLocaleString()}</span>
            </Card>
          </section>

          {stock.description && (
            <Card variant="board" as="section">
              <h2>About {stock.name}</h2>
              <p>{stock.description}</p>
            </Card>
          )}

          <Card variant="board" as="section">
            <h2>Recent Company Events</h2>
            {events.length === 0 && <p className="muted">No company events yet -- price has only moved from normal daily market movement.</p>}
            {events.map((e, i) => (
              <div className="news-row" key={i}>
                <span className={`news-dot ${changeClass(e.impactPercent)} ${e.severity === "major" ? "major" : ""}`} />
                <div className="news-row-body">
                  <p className="news-headline">{pctChange(e.impactPercent)} -- {e.reason}</p>
                  <p className="muted news-subtext">{new Date(e.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

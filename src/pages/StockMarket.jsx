import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import PublicNav from "../components/PublicNav";
import { usePublicBase } from "../hooks/usePublicBase";
import { usePolling } from "../hooks/usePolling";
import { pctChange, changeClass } from "../utils";

const STOCKS_POLL_MS = 5_000; // "highly active" tier -- live prices

export default function StockMarket() {
  const [stocks, setStocks] = useState(null);
  const [error, setError] = useState(null);
  const base = usePublicBase();

  usePolling(() => apiFetch("/public/stocks", { auth: false })
    .then(data => setStocks(data.stocks))
    .catch(err => setError(err.message)), STOCKS_POLL_MS);

  return (
    <div className="home-page">
      <PublicNav />

      <div className="board-header">
        <h1>Stock Market</h1>
        <p className="muted">Every stock currently listed on TSRP's market.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!stocks && !error && <p className="muted">Loading…</p>}
      {stocks?.length === 0 && <p className="muted">No stocks are listed right now.</p>}

      {stocks?.length > 0 && (
        <div className="roster-list">
          {stocks.map(s => (
            <Link to={`${base}/stocks/${s.ticker}`} className="roster-row stock-row" key={s.ticker}>
              <span className="stock-row-ticker">{s.ticker}</span>
              <span className="roster-row-name">{s.name}</span>
              <span className="stock-row-category muted">{s.category}</span>
              <span className="stock-row-price">${s.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className={`board-value ${changeClass(s.dailyChangePercent)}`}>
                {pctChange(s.dailyChangePercent)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import PublicNav from "../components/PublicNav";
import Breadcrumbs from "../components/Breadcrumbs";
import { usePublicBase } from "../hooks/usePublicBase";
import { usePolling } from "../hooks/usePolling";
import { pctChange, changeClass } from "../utils";
import AsyncBoundary from "../components/primitives/AsyncBoundary";

const STOCKS_POLL_MS = 5_000; // "highly active" tier -- live prices

export default function StockMarket() {
  const [stocks, setStocks] = useState(null);
  const [error, setError] = useState(null);
  const base = usePublicBase();

  usePolling(() => apiFetch("/public/stocks", { auth: false })
    .then(data => { setStocks(data.stocks); setError(null); })
    .catch(err => setError(err.message)), STOCKS_POLL_MS);

  return (
    <div className="home-page">
      <PublicNav />

      <Breadcrumbs trail={[{ label: "Economy", to: `${base}/economy` }, { label: "Stock Market" }]} />

      <div className="board-header">
        <h1>Stock Market</h1>
        <p className="muted">Every stock currently listed on TSRP's market.</p>
      </div>

      <AsyncBoundary
        isLoading={!stocks && !error}
        isError={!!error}
        error={error && { message: error }}
        data={stocks}
        isEmpty={s => s?.length === 0}
        emptyMessage="No stocks are listed right now."
      >
        {() => (
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
      </AsyncBoundary>
    </div>
  );
}

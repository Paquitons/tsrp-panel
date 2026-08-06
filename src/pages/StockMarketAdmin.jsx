import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import DiscordAvatar from "../components/DiscordAvatar";
import CustomSelect from "../components/CustomSelect";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import StockPriceChart from "../components/StockPriceChart";
import { toDateTimeInputValue, parseDateTimeInput } from "../utils";

const SUB_TABS = [
  { value: "overview", label: "Overview" },
  { value: "stocks", label: "Stocks" },
  { value: "controls", label: "Market Controls" },
  { value: "events", label: "Market Events" },
  { value: "news", label: "News" },
  { value: "audit", label: "Audit Log" },
];

function money(n) {
  return `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n) {
  if (n === null || n === undefined) return "--";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function pctClass(n) {
  if (n === null || n === undefined) return "muted";
  return n >= 0 ? "loa-status-approved" : "loa-status-denied";
}

function NamedHolder({ discordId, prefix, row }) {
  return (
    <div className="verification-identity-row" style={{ gap: 8 }}>
      <DiscordAvatar discordId={discordId} avatarHash={row[`${prefix}_avatar_hash`]} size={22} />
      <span>{row[`${prefix}_username`] ?? discordId}</span>
    </div>
  );
}

export default function StockMarketAdmin() {
  const [subTab, setSubTab] = useState("overview");

  return (
    <>
      <div className="tabs" role="tablist" style={{ marginTop: 16 }}>
        {SUB_TABS.map(t => (
          <button key={t.value} type="button" className={`tab ${subTab === t.value ? "active" : ""}`} onClick={() => setSubTab(t.value)}>{t.label}</button>
        ))}
      </div>

      {subTab === "overview" && <OverviewTab />}
      {subTab === "stocks" && <StocksTab />}
      {subTab === "controls" && <MarketControlsTab />}
      {subTab === "events" && <MarketEventsTab />}
      {subTab === "news" && <NewsTab />}
      {subTab === "audit" && <AuditLogTab />}
    </>
  );
}

function StockListRow({ stock, onClick }) {
  return (
    <div className="loa-card loa-card-row" style={{ cursor: "pointer" }} onClick={onClick}>
      <div>
        <div className="verification-identity-name">{stock.ticker} <span className="muted">-- {stock.name}</span></div>
        <div className="muted">{stock.category}{stock.frozen ? " -- FROZEN" : ""}{stock.status !== "open" ? ` -- ${stock.status.toUpperCase()}` : ""}</div>
      </div>
      <div style={{ marginLeft: "auto", textAlign: "right" }}>
        <div>{money(stock.current_price)}</div>
        {stock.performance && <div className={pctClass(stock.performance.daily)}>{pct(stock.performance.daily)}</div>}
      </div>
    </div>
  );
}

// ==================================================================
// Overview
// ==================================================================
function OverviewTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/super-admin/stock-market/overview").then(setData).catch(err => setError(err.message));
  }, []);

  if (error) return <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>;
  if (!data) return <p className="muted" style={{ marginTop: 16 }}>Loading…</p>;

  return (
    <>
      <div className="card-grid" style={{ marginTop: 16 }}>
        <div className="stat-tile"><div className="muted">Total Market Cap</div><div className="verification-identity-name">{money(data.totalMarketCap)}</div></div>
        <div className="stat-tile"><div className="muted">Listed Stocks</div><div className="verification-identity-name">{data.stockCount}</div></div>
      </div>

      <h2 style={{ marginTop: 20 }}>Top Gainers</h2>
      <div className="loa-list">
        {data.gainers.map(s => (
          <div className="loa-card loa-card-row" key={s.ticker}>
            <span>{s.ticker} -- {s.name}</span>
            <span className={pctClass(s.performance.daily)} style={{ marginLeft: "auto" }}>{pct(s.performance.daily)}</span>
          </div>
        ))}
        {data.gainers.length === 0 && <p className="muted">No data yet.</p>}
      </div>

      <h2 style={{ marginTop: 20 }}>Top Losers</h2>
      <div className="loa-list">
        {data.losers.map(s => (
          <div className="loa-card loa-card-row" key={s.ticker}>
            <span>{s.ticker} -- {s.name}</span>
            <span className={pctClass(s.performance.daily)} style={{ marginLeft: "auto" }}>{pct(s.performance.daily)}</span>
          </div>
        ))}
        {data.losers.length === 0 && <p className="muted">No data yet.</p>}
      </div>

      <h2 style={{ marginTop: 20 }}>Trending (24h volume)</h2>
      <div className="loa-list">
        {data.trending.map(s => (
          <div className="loa-card loa-card-row" key={s.ticker}>
            <span>{s.ticker} -- {s.name}</span>
            <span className="muted" style={{ marginLeft: "auto" }}>{s.trades} trade(s) -- {money(s.volume)}</span>
          </div>
        ))}
        {data.trending.length === 0 && <p className="muted">No trading activity in the last 24h.</p>}
      </div>
    </>
  );
}

// ==================================================================
// Stocks -- list/search, create, and the full per-stock admin detail.
// ==================================================================
function StocksTab() {
  const [stocks, setStocks] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    apiFetch("/super-admin/stocks").then(({ stocks }) => setStocks(stocks)).catch(err => setError(err.message));
  }
  useEffect(load, []);

  const filtered = stocks.filter(s => !query.trim() || s.ticker.includes(query.toUpperCase()) || s.name.toLowerCase().includes(query.toLowerCase()));

  if (selectedTicker) {
    return <StockDetail ticker={selectedTicker} onBack={() => { setSelectedTicker(null); load(); }} />;
  }

  return (
    <>
      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}
      <div className="form-inline-row" style={{ marginTop: 16 }}>
        <div className="form-inline-field">
          <label>Search</label>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ticker or name" />
        </div>
        <div className="form-inline-field-btn">
          <label aria-hidden="true">&nbsp;</label>
          <button className="primary" type="button" onClick={() => setShowCreate(true)}>List New Stock</button>
        </div>
      </div>

      <div className="loa-list" style={{ marginTop: 12 }}>
        {filtered.map(s => <StockListRow key={s.ticker} stock={s} onClick={() => setSelectedTicker(s.ticker)} />)}
        {filtered.length === 0 && <p className="muted">No stocks found.</p>}
      </div>

      {showCreate && (
        <CreateStockModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}
    </>
  );
}

function CreateStockModal({ onClose, onCreated }) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [price, setPrice] = useState("");
  const [sharesOutstanding, setSharesOutstanding] = useState("1000000");
  const [volatility, setVolatility] = useState("3");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/super-admin/stocks", {
        method: "POST",
        body: {
          ticker, name, description, category,
          price: Number(price), sharesOutstanding: Number(sharesOutstanding), volatility: Number(volatility) / 100,
        },
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>List a New Stock</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div><label>Ticker</label><input required value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="e.g. TSRP" maxLength={8} /></div>
            <div><label>Starting Price</label><input required type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></div>
          </div>
          <label>Company Name</label>
          <input required value={name} onChange={e => setName(e.target.value)} />
          <label>Description</label>
          <AutoGrowTextarea value={description} onChange={e => setDescription(e.target.value)} />
          <div className="form-row">
            <div><label>Category</label><input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Tech, Industrial, Retail" /></div>
            <div><label>Volatility (%)</label><input type="number" min="0.1" step="0.1" value={volatility} onChange={e => setVolatility(e.target.value)} /></div>
          </div>
          <label>Simulated Shares Outstanding</label>
          <input type="number" min="1" value={sharesOutstanding} onChange={e => setSharesOutstanding(e.target.value)} />
          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="primary" type="submit" disabled={saving}>{saving ? "Listing…" : "List Stock"}</button>
            <button className="secondary" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockDetail({ ticker, onBack }) {
  const [stock, setStock] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [history, setHistory] = useState([]);
  const [range, setRange] = useState(30 * 24 * 60 * 60 * 1000);
  const [transactions, setTransactions] = useState([]);
  const [holders, setHolders] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  function load() {
    apiFetch(`/super-admin/stocks/${ticker}`).then(({ stock, performance }) => { setStock(stock); setPerformance(performance); }).catch(err => setError(err.message));
    apiFetch(`/super-admin/stocks/${ticker}/transactions`).then(({ transactions }) => setTransactions(transactions));
    apiFetch(`/super-admin/stocks/${ticker}/holders`).then(({ holders }) => setHolders(holders));
  }
  useEffect(load, [ticker]);

  useEffect(() => {
    apiFetch(`/super-admin/stocks/${ticker}/price-history?since=${Date.now() - range}`).then(({ history }) => setHistory(history));
  }, [ticker, range]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  async function act(path, body, successMsg) {
    setError(null);
    try {
      await apiFetch(`/super-admin/stocks/${ticker}/${path}`, { method: "POST", body });
      flash(successMsg);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveEdit(fields) {
    setError(null);
    try {
      await apiFetch(`/super-admin/stocks/${ticker}`, { method: "PATCH", body: fields });
      flash("Saved.");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reverse(transactionId) {
    const reason = prompt("Reason for reversing this transaction (optional):") ?? undefined;
    try {
      await apiFetch(`/super-admin/stock-transactions/${transactionId}/reverse`, { method: "POST", body: { reason } });
      flash("Transaction reversed.");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!stock) return <p className="muted" style={{ marginTop: 16 }}>Loading…</p>;

  return (
    <>
      <div className="button-row" style={{ marginTop: 16 }}>
        <button className="secondary" type="button" onClick={onBack}>&larr; Back to Stocks</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="success-banner">{notice}</div>}

      <div className="modal-title-row" style={{ marginTop: 12 }}>
        <h2 style={{ margin: 0 }}>{stock.name} ({stock.ticker})</h2>
        <span className={`badge ${stock.status === "open" ? "loa-status-approved" : "loa-status-denied"}`}>{stock.status}</span>
        {!!stock.frozen && <span className="badge loa-status-pending">Frozen</span>}
      </div>
      <p className="muted">{stock.category} -- {money(stock.current_price)}/share -- Market cap {money(stock.current_price * stock.shares_outstanding)}</p>

      <div className="card-grid">
        <div className="stat-tile"><div className="muted">Daily</div><div className={pctClass(performance?.daily)}>{pct(performance?.daily)}</div></div>
        <div className="stat-tile"><div className="muted">Weekly</div><div className={pctClass(performance?.weekly)}>{pct(performance?.weekly)}</div></div>
        <div className="stat-tile"><div className="muted">Monthly</div><div className={pctClass(performance?.monthly)}>{pct(performance?.monthly)}</div></div>
      </div>

      <div className="modal-title-row" style={{ marginTop: 16, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Price History</h2>
        <CustomSelect
          value={String(range)}
          onChange={v => setRange(Number(v))}
          options={[
            { value: String(7 * 24 * 60 * 60 * 1000), label: "7 days" },
            { value: String(30 * 24 * 60 * 60 * 1000), label: "30 days" },
            { value: String(90 * 24 * 60 * 60 * 1000), label: "90 days" },
          ]}
        />
      </div>
      <div className="card" style={{ padding: 16 }}>
        <StockPriceChart history={history} />
      </div>

      <StockAdminControls stock={stock} onAct={act} onSaveEdit={saveEdit} />

      <h2 style={{ marginTop: 20 }}>Top Holders</h2>
      <div className="loa-list">
        {holders.map(h => (
          <div className="loa-card loa-card-row" key={h.discord_id}>
            <NamedHolder discordId={h.discord_id} prefix="holder" row={h} />
            <span className="muted" style={{ marginLeft: "auto" }}>{h.quantity.toLocaleString()} share(s)</span>
          </div>
        ))}
        {holders.length === 0 && <p className="muted">Nobody holds this stock yet.</p>}
      </div>

      <h2 style={{ marginTop: 20 }}>Recent Transactions</h2>
      <div className="loa-list">
        {transactions.map(t => (
          <div className="loa-card" key={t.id}>
            <div className="loa-card-top loa-card-top-stack">
              <span className={`badge ${t.action === "buy" ? "loa-status-approved" : t.action === "sell" ? "loa-status-denied" : "loa-status-pending"}`}>
                {t.action}{t.reversed ? " (reversed)" : ""}
              </span>
              <span className="muted">{new Date(t.created_at).toLocaleString()}</span>
            </div>
            <div className="log-card-field">
              <NamedHolder discordId={t.discord_id} prefix="trader" row={t} /> -- {t.quantity} share(s) @ {money(t.price)} = {money(t.total)}
            </div>
            {!t.reversed && (t.action === "buy" || t.action === "sell") && (
              <button className="btn-red small" type="button" style={{ marginTop: 8 }} onClick={() => reverse(t.id)}>Reverse</button>
            )}
          </div>
        ))}
        {transactions.length === 0 && <p className="muted">No transactions yet.</p>}
      </div>
    </>
  );
}

function StockAdminControls({ stock, onAct, onSaveEdit }) {
  const [name, setName] = useState(stock.name);
  const [description, setDescription] = useState(stock.description);
  const [category, setCategory] = useState(stock.category);
  const [volatility, setVolatility] = useState(stock.volatility * 100);
  const [sharesOutstanding, setSharesOutstanding] = useState(stock.shares_outstanding);
  const [dividendRate, setDividendRate] = useState(stock.dividend_rate ? stock.dividend_rate * 100 : "");
  const [dividendIntervalHours, setDividendIntervalHours] = useState(stock.dividend_interval_ms ? stock.dividend_interval_ms / 3600000 : "");

  const [setPriceValue, setSetPriceValue] = useState("");
  const [adjustPercent, setAdjustPercent] = useState("");
  const [splitRatio, setSplitRatio] = useState("2");

  return (
    <>
      <h2 style={{ marginTop: 20 }}>Company Details</h2>
      <label>Name</label>
      <input value={name} onChange={e => setName(e.target.value)} />
      <label>Description</label>
      <AutoGrowTextarea value={description} onChange={e => setDescription(e.target.value)} />
      <div className="form-row">
        <div><label>Category</label><input value={category} onChange={e => setCategory(e.target.value)} /></div>
        <div><label>Volatility (%)</label><input type="number" step="0.1" min="0.1" value={volatility} onChange={e => setVolatility(e.target.value)} /></div>
      </div>
      <label>Simulated Shares Outstanding</label>
      <input type="number" min="1" value={sharesOutstanding} onChange={e => setSharesOutstanding(e.target.value)} />
      <div className="button-row">
        <button className="primary" type="button" onClick={() => onSaveEdit({ name, description, category, volatility: Number(volatility) / 100, sharesOutstanding: Number(sharesOutstanding) })}>
          Save Details
        </button>
      </div>

      <h2 style={{ marginTop: 20 }}>Dividend</h2>
      <div className="form-row">
        <div><label>Rate per payout (%, blank = none)</label><input type="number" step="0.01" min="0" value={dividendRate} onChange={e => setDividendRate(e.target.value)} /></div>
        <div><label>Payout interval (hours)</label><input type="number" min="1" value={dividendIntervalHours} onChange={e => setDividendIntervalHours(e.target.value)} /></div>
      </div>
      <div className="button-row">
        <button
          className="secondary" type="button"
          onClick={() => onAct("dividend", {
            rate: dividendRate === "" ? null : Number(dividendRate) / 100,
            intervalMs: dividendIntervalHours === "" ? null : Number(dividendIntervalHours) * 3600000,
          }, "Dividend settings updated.")}
        >
          Save Dividend Settings
        </button>
      </div>

      <h2 style={{ marginTop: 20 }}>Price Controls</h2>
      <div className="form-inline-row">
        <div className="form-inline-field"><label>Set Exact Price</label><input type="number" min="0.01" step="0.01" value={setPriceValue} onChange={e => setSetPriceValue(e.target.value)} /></div>
        <div className="form-inline-field-btn">
          <label aria-hidden="true">&nbsp;</label>
          <button className="secondary" type="button" onClick={() => setPriceValue && onAct("set-price", { price: Number(setPriceValue) }, "Price set.")}>Apply</button>
        </div>
      </div>
      <div className="form-inline-row" style={{ marginTop: 8 }}>
        <div className="form-inline-field"><label>Adjust By (%)</label><input type="number" step="1" value={adjustPercent} onChange={e => setAdjustPercent(e.target.value)} placeholder="e.g. 10 or -10" /></div>
        <div className="form-inline-field-btn">
          <label aria-hidden="true">&nbsp;</label>
          <button className="secondary" type="button" onClick={() => adjustPercent && onAct("adjust-price", { percent: Number(adjustPercent) }, "Price adjusted.")}>Apply</button>
        </div>
      </div>

      <div className="button-row" style={{ marginTop: 12 }}>
        <button className="secondary" type="button" onClick={() => onAct("freeze", { frozen: !stock.frozen }, stock.frozen ? "Unfrozen." : "Frozen.")}>
          {stock.frozen ? "Unfreeze Stock" : "Freeze Stock"}
        </button>
        <button
          className="btn-red" type="button"
          onClick={() => confirm(`Reset all price history for ${stock.ticker}? This can't be undone.`) && onAct("reset-history", {}, "History reset.")}
        >
          Reset Price History
        </button>
        {stock.status === "open" ? (
          <button className="btn-red" type="button" onClick={() => confirm(`Delist ${stock.ticker}? Trading will stop.`) && onAct("delist", {}, "Delisted.")}>Delist</button>
        ) : (
          <button className="secondary" type="button" onClick={() => onAct("relist", {}, "Relisted.")}>Relist</button>
        )}
      </div>

      <h2 style={{ marginTop: 20 }}>Stock Split</h2>
      <div className="form-inline-row">
        <div className="form-inline-field">
          <label>Ratio (2 = 2-for-1 forward, 0.5 = 1-for-2 reverse)</label>
          <input type="number" step="0.01" min="0.01" value={splitRatio} onChange={e => setSplitRatio(e.target.value)} />
        </div>
        <div className="form-inline-field-btn">
          <label aria-hidden="true">&nbsp;</label>
          <button
            className="secondary" type="button"
            onClick={() => confirm(`Apply a ${splitRatio}x split to ${stock.ticker}? This changes every holder's share count.`) && onAct("split", { ratio: Number(splitRatio) }, "Split applied.")}
          >
            Apply Split
          </button>
        </div>
      </div>
    </>
  );
}

// ==================================================================
// Market-wide controls
// ==================================================================
function MarketControlsTab() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [crashPercent, setCrashPercent] = useState("10");
  const [rallyPercent, setRallyPercent] = useState("10");
  const [industryCategory, setIndustryCategory] = useState("");
  const [industryPercent, setIndustryPercent] = useState("10");

  function load() {
    apiFetch("/super-admin/stock-market/config").then(setConfig).catch(err => setError(err.message));
  }
  useEffect(load, []);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  async function toggleConfig(field) {
    setError(null);
    try {
      const next = await apiFetch("/super-admin/stock-market/config", { method: "PATCH", body: { [field]: !config[field] } });
      setConfig(next);
    } catch (err) {
      setError(err.message);
    }
  }

  async function trigger(path, body, label) {
    setError(null);
    if (!confirm(`${label}? This affects every open stock${body.category ? ` in ${body.category}` : ""} immediately.`)) return;
    try {
      const { affected } = await apiFetch(`/super-admin/stock-market/${path}`, { method: "POST", body });
      flash(`Affected ${affected.length} stock(s): ${affected.join(", ") || "none"}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!config) return <p className="muted" style={{ marginTop: 16 }}>Loading…</p>;

  return (
    <>
      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}
      {notice && <div className="success-banner">{notice}</div>}

      <h2 style={{ marginTop: 16 }}>Trading Status</h2>
      <p className="muted card-subtitle">Pausing blocks buy/sell but prices keep moving. Freezing the market stops price movement too -- a harder stop.</p>
      <div className="button-row">
        <button className="secondary" type="button" onClick={() => toggleConfig("tradingPaused")}>
          {config.tradingPaused ? "Resume Trading" : "Pause Trading"}
        </button>
        <button className="btn-red" type="button" onClick={() => toggleConfig("marketFrozen")}>
          {config.marketFrozen ? "Unfreeze Market" : "Freeze Entire Market"}
        </button>
      </div>
      <div className="card-grid" style={{ marginTop: 12 }}>
        <div className="stat-tile"><div className="muted">Trading</div><div className={config.tradingPaused ? "loa-status-denied" : "loa-status-approved"}>{config.tradingPaused ? "Paused" : "Active"}</div></div>
        <div className="stat-tile"><div className="muted">Market</div><div className={config.marketFrozen ? "loa-status-denied" : "loa-status-approved"}>{config.marketFrozen ? "Frozen" : "Live"}</div></div>
      </div>

      <h2 style={{ marginTop: 20 }}>Market Crash</h2>
      <div className="form-inline-row">
        <div className="form-inline-field"><label>Percent Down</label><input type="number" min="1" max="90" value={crashPercent} onChange={e => setCrashPercent(e.target.value)} /></div>
        <div className="form-inline-field-btn">
          <label aria-hidden="true">&nbsp;</label>
          <button className="btn-red" type="button" onClick={() => trigger("crash", { percent: Number(crashPercent) }, `Crash the market ${crashPercent}%`)}>Trigger Crash</button>
        </div>
      </div>

      <h2 style={{ marginTop: 20 }}>Market Rally</h2>
      <div className="form-inline-row">
        <div className="form-inline-field"><label>Percent Up</label><input type="number" min="1" max="200" value={rallyPercent} onChange={e => setRallyPercent(e.target.value)} /></div>
        <div className="form-inline-field-btn">
          <label aria-hidden="true">&nbsp;</label>
          <button className="primary" type="button" onClick={() => trigger("rally", { percent: Number(rallyPercent) }, `Rally the market +${rallyPercent}%`)}>Trigger Rally</button>
        </div>
      </div>

      <h2 style={{ marginTop: 20 }}>Industry Event</h2>
      <div className="form-row">
        <div><label>Category</label><input value={industryCategory} onChange={e => setIndustryCategory(e.target.value)} placeholder="e.g. Tech" /></div>
        <div><label>Percent (+/-)</label><input type="number" value={industryPercent} onChange={e => setIndustryPercent(e.target.value)} /></div>
        <div className="form-inline-field-btn">
          <label aria-hidden="true">&nbsp;</label>
          <button
            className="secondary" type="button"
            disabled={!industryCategory.trim()}
            onClick={() => trigger("industry-event", { category: industryCategory.trim(), percent: Number(industryPercent) }, `Apply a ${industryPercent}% event to ${industryCategory}`)}
          >
            Trigger Event
          </button>
        </div>
      </div>
    </>
  );
}

// ==================================================================
// Market Events -- the configurable/approvable "living market" system.
// Pending events need an explicit Approve before they touch a price;
// approved-but-scheduled ones sit waiting for the backend's 30s poller;
// applied ones can be reversed (restores the exact pre-event prices).
// ==================================================================
const EVENT_STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Scheduled" },
  { value: "applied", label: "Applied" },
  { value: "rejected", label: "Rejected" },
  { value: "reversed", label: "Reversed" },
];

const EVENT_TYPE_LABELS = { crash: "Crash", rally: "Rally", industry: "Industry", custom: "Custom" };

function statusBadgeClass(status) {
  if (status === "applied") return "loa-status-approved";
  if (status === "pending") return "loa-status-pending";
  if (status === "approved") return "loa-status-pending";
  if (status === "rejected" || status === "reversed") return "loa-status-denied";
  return "muted";
}

function targetSummary(event) {
  if (event.targetTickers?.length) return event.targetTickers.join(", ");
  if (event.category) return `${event.category} sector`;
  return "Market-wide";
}

function MarketEventsTab() {
  const [events, setEvents] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  function load() {
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    apiFetch(`/super-admin/market-events${qs}`).then(({ events }) => setEvents(events)).catch(err => setError(err.message));
  }
  useEffect(load, [statusFilter]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  async function act(id, action, body, successMsg) {
    setError(null);
    try {
      await apiFetch(`/super-admin/market-events/${id}/${action}`, { method: "POST", body });
      flash(successMsg);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}
      {notice && <div className="success-banner">{notice}</div>}

      <p className="muted card-subtitle" style={{ marginTop: 16 }}>
        Draft a market event, adjust it, then approve it to apply immediately -- or schedule it for later and let it apply on its own.
      </p>

      <div className="button-row" style={{ marginTop: 8 }}>
        <button className="primary" type="button" onClick={() => setShowCreate(true)}>New Market Event</button>
      </div>

      <div className="tabs" role="tablist" style={{ marginTop: 16 }}>
        {EVENT_STATUS_FILTERS.map(f => (
          <button key={f.value} type="button" className={`tab ${statusFilter === f.value ? "active" : ""}`} onClick={() => setStatusFilter(f.value)}>{f.label}</button>
        ))}
      </div>

      <div className="loa-list" style={{ marginTop: 12 }}>
        {events.map(ev => (
          <MarketEventCard key={ev.id} event={ev} onAct={act} />
        ))}
        {events.length === 0 && <p className="muted">No events found.</p>}
      </div>

      {showCreate && (
        <CreateMarketEventModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}
    </>
  );
}

function MarketEventCard({ event, onAct }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="loa-card">
      <div className="loa-card-top loa-card-top-stack">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="badge loa-status-pending">{EVENT_TYPE_LABELS[event.type] ?? event.type}</span>
          <span className={`badge ${statusBadgeClass(event.status)}`}>{event.status}</span>
          <span className={pctClass(event.percent)}>{pct(event.percent)}</span>
        </div>
        <span className="muted">{new Date(event.createdAt).toLocaleString()}</span>
      </div>

      <div className="verification-identity-name" style={{ marginTop: 4 }}>{event.headline}</div>
      {event.body && <div className="log-card-field muted">{event.body}</div>}
      <div className="log-card-field"><span className="muted">Target:</span> {targetSummary(event)}</div>
      <div className="log-card-field"><NamedHolder discordId={event.createdBy} prefix="creator" row={event} /></div>
      {event.scheduledFor && event.status === "approved" && (
        <div className="log-card-field"><span className="muted">Scheduled for:</span> {new Date(event.scheduledFor).toLocaleString()}</div>
      )}
      {event.appliedAt && <div className="log-card-field"><span className="muted">Applied:</span> {new Date(event.appliedAt).toLocaleString()}</div>}
      {event.reason && <div className="log-card-field"><span className="muted">Reason:</span> {event.reason}</div>}

      {editing && event.status === "pending" && (
        <EditMarketEventForm event={event} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
      )}

      <div className="button-row" style={{ marginTop: 8 }}>
        {event.status === "pending" && !editing && (
          <>
            <button className="primary" type="button" onClick={() => onAct(event.id, "approve", {}, "Event approved.")}>Approve</button>
            <button className="secondary" type="button" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn-red" type="button" onClick={() => confirm("Reject this event?") && onAct(event.id, "reject", { reason: prompt("Reason (optional):") ?? undefined }, "Event rejected.")}>Reject</button>
          </>
        )}
        {event.status === "approved" && (
          <button className="btn-red" type="button" onClick={() => confirm("Cancel this scheduled event before it applies?") && onAct(event.id, "reject", { reason: prompt("Reason (optional):") ?? undefined }, "Event cancelled.")}>
            Cancel
          </button>
        )}
        {event.status === "applied" && (
          <button className="btn-red" type="button" onClick={() => confirm(`Reverse "${event.headline}"? This restores every affected stock to its price right before this event.`) && onAct(event.id, "reverse", { reason: prompt("Reason (optional):") ?? undefined }, "Event reversed.")}>
            Reverse
          </button>
        )}
      </div>
    </div>
  );
}

function EditMarketEventForm({ event, onSaved, onCancel }) {
  const [headline, setHeadline] = useState(event.headline);
  const [body, setBody] = useState(event.body ?? "");
  const [percent, setPercent] = useState(event.percent);
  const [category, setCategory] = useState(event.category ?? "");
  const [tickers, setTickers] = useState(event.targetTickers?.join(", ") ?? "");
  const [scheduledFor, setScheduledFor] = useState(event.scheduledFor ? toDateTimeInputValue(event.scheduledFor) : "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/super-admin/market-events/${event.id}`, {
        method: "PATCH",
        body: {
          headline, body: body || undefined, percent: Number(percent),
          category: category.trim() || null,
          targetTickers: tickers.trim() ? tickers.split(",").map(t => t.trim()).filter(Boolean) : null,
          scheduledFor: scheduledFor ? parseDateTimeInput(scheduledFor) : null,
        },
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
      {error && <div className="error-banner">{error}</div>}
      <label>Headline</label>
      <input value={headline} onChange={e => setHeadline(e.target.value)} />
      <label>Body (optional)</label>
      <AutoGrowTextarea value={body} onChange={e => setBody(e.target.value)} />
      <div className="form-row">
        <div><label>Percent (+/-)</label><input type="number" value={percent} onChange={e => setPercent(e.target.value)} /></div>
        <div><label>Category (blank = market-wide)</label><input value={category} onChange={e => { setCategory(e.target.value); setTickers(""); }} placeholder="e.g. Tech" /></div>
      </div>
      <label>Specific Tickers (comma-separated, overrides category)</label>
      <input value={tickers} onChange={e => { setTickers(e.target.value); setCategory(""); }} placeholder="e.g. TSRP, PAW" />
      <label>Scheduled For (blank = apply immediately once approved)</label>
      <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
      <div className="button-row" style={{ marginTop: 8 }}>
        <button className="primary" type="button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Changes"}</button>
        <button className="secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function CreateMarketEventModal({ onClose, onCreated }) {
  const [type, setType] = useState("custom");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [percent, setPercent] = useState("");
  const [category, setCategory] = useState("");
  const [tickers, setTickers] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [requireApproval, setRequireApproval] = useState(true);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/super-admin/market-events", {
        method: "POST",
        body: {
          type, headline, body: body || undefined, percent: Number(percent),
          category: category.trim() || undefined,
          targetTickers: tickers.trim() ? tickers.split(",").map(t => t.trim()).filter(Boolean) : undefined,
          scheduledFor: scheduledFor ? parseDateTimeInput(scheduledFor) : undefined,
          autoApprove: !requireApproval,
          reason: reason || undefined,
        },
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>New Market Event</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <label>Type</label>
          <CustomSelect
            value={type}
            onChange={setType}
            options={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <label>Headline</label>
          <input required value={headline} onChange={e => setHeadline(e.target.value)} placeholder='e.g. "Technology sector drops after major service outage"' />
          <label>Body / Details (optional)</label>
          <AutoGrowTextarea value={body} onChange={e => setBody(e.target.value)} />
          <div className="form-row">
            <div><label>Percent (+/-)</label><input required type="number" value={percent} onChange={e => setPercent(e.target.value)} placeholder="e.g. -8 or 12" /></div>
            <div><label>Category (blank = market-wide)</label><input value={category} onChange={e => { setCategory(e.target.value); setTickers(""); }} placeholder="e.g. Tech" /></div>
          </div>
          <label>Specific Tickers (comma-separated, overrides category)</label>
          <input value={tickers} onChange={e => { setTickers(e.target.value); setCategory(""); }} placeholder="e.g. TSRP, PAW" />
          <label>Schedule For (blank = apply as soon as approved)</label>
          <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
          <label>Internal Reason / Notes (optional)</label>
          <input value={reason} onChange={e => setReason(e.target.value)} />
          <label style={{ marginTop: 8, display: "block" }}>
            <input type="checkbox" checked={requireApproval} onChange={e => setRequireApproval(e.target.checked)} /> Require a separate approval before this can apply
          </label>
          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="primary" type="submit" disabled={saving}>{saving ? "Creating…" : requireApproval ? "Create (Pending Approval)" : "Create & Approve"}</button>
            <button className="secondary" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================================================================
// News
// ==================================================================
function NewsTab() {
  const [news, setNews] = useState([]);
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState(null);

  function load() {
    apiFetch("/super-admin/stock-market/news").then(({ news }) => setNews(news)).catch(err => setError(err.message));
  }
  useEffect(load, []);

  async function post(e) {
    e.preventDefault();
    if (!headline.trim()) return;
    try {
      await apiFetch("/super-admin/stock-market/news", { method: "POST", body: { headline, body: body || undefined, ticker: ticker || undefined } });
      setHeadline(""); setBody(""); setTicker("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}
      <h2 style={{ marginTop: 16 }}>Post News</h2>
      <form onSubmit={post}>
        <label>Headline</label>
        <input required value={headline} onChange={e => setHeadline(e.target.value)} />
        <label>Body (optional)</label>
        <AutoGrowTextarea value={body} onChange={e => setBody(e.target.value)} />
        <label>Ticker (optional, blank = market-wide)</label>
        <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="e.g. TSRP" />
        <button className="primary" type="submit" style={{ marginTop: 8 }}>Post</button>
      </form>

      <h2 style={{ marginTop: 20 }}>Recent News</h2>
      <div className="loa-list">
        {news.map(n => (
          <div className="loa-card" key={n.id}>
            <div className="loa-card-top loa-card-top-stack">
              <span className="verification-identity-name" style={{ fontSize: "var(--text-sm)" }}>{n.headline}</span>
              <span className="muted">{new Date(n.created_at).toLocaleString()}</span>
            </div>
            {n.body && <div className="log-card-field">{n.body}</div>}
            {n.impact_percent !== null && <div className={pctClass(n.impact_percent)}>{pct(n.impact_percent)}</div>}
          </div>
        ))}
        {news.length === 0 && <p className="muted">No news yet.</p>}
      </div>
    </>
  );
}

// ==================================================================
// Audit Log
// ==================================================================
function AuditLogTab() {
  const [log, setLog] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/super-admin/stock-market/audit-log").then(({ log }) => setLog(log)).catch(err => setError(err.message));
  }, []);

  return (
    <>
      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}
      <p className="muted card-subtitle" style={{ marginTop: 16 }}>Every Super Admin stock market action -- who, what, and when.</p>
      <div className="loa-list">
        {log.map(entry => (
          <div className="loa-card" key={entry.id}>
            <div className="loa-card-top loa-card-top-stack">
              <span className="badge loa-status-pending">{entry.action}{entry.ticker ? ` -- ${entry.ticker}` : ""}</span>
              <span className="muted">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
            <div className="log-card-field">
              <NamedHolder discordId={entry.actor_discord_id} prefix="actor" row={entry} />
            </div>
            {entry.reason && <div className="log-card-field"><span className="muted">Reason:</span> {entry.reason}</div>}
          </div>
        ))}
        {log.length === 0 && <p className="muted">No admin actions logged yet.</p>}
      </div>
    </>
  );
}

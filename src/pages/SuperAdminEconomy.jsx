import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import DiscordIdentity, { discordDisplayName } from "../components/DiscordIdentity";
import AccountPicker from "../components/AccountPicker";
import CustomSelect from "../components/CustomSelect";
import { usePolling } from "../hooks/usePolling";

const CURRENCY = "$";
const GAMES = ["slots", "roulette", "blackjack"];
const GAME_LABELS = { slots: "Slots", roulette: "Roulette", blackjack: "Blackjack" };
// Read-only views poll at the "moderately active" tier. Panels with
// editable fields bound directly to the fetched state (EconomyConfigPanel)
// deliberately don't -- unlike StockMarketAdmin's pattern, there's no
// separate child-component state to protect it from being overwritten.
const ADMIN_POLL_MS = 15_000;

function fmt(n) {
  return `${CURRENCY}${Number(n ?? 0).toLocaleString()}`;
}

function NamedHolder({ discordId, prefix, row }) {
  return (
    <DiscordIdentity
      variant="row"
      nickname={row[`${prefix}_nickname`]} username={row[`${prefix}_username`]}
      discordId={discordId} avatarHash={row[`${prefix}_avatar_hash`]} size={22}
      showId={false}
    />
  );
}

// ==================================================================
// Overview -- read-only snapshot of where all the money in the economy
// currently sits.
// ==================================================================
export function EconomyOverviewPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [printAmount, setPrintAmount] = useState("");
  const [printReason, setPrintReason] = useState("");
  const [printing, setPrinting] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTarget, setWithdrawTarget] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawPickerKey, setWithdrawPickerKey] = useState(0);

  usePolling(() => apiFetch("/super-admin/economy-overview").then(d => { setData(d); setError(null); }).catch(err => setError(err.message)), ADMIN_POLL_MS);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  async function printMoney(e) {
    e.preventDefault();
    const amount = Math.trunc(Number(printAmount));
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!confirm(`Print ${fmt(amount)} into the Government reserve? This permanently grows the money supply.`)) return;
    setPrinting(true);
    setError(null);
    try {
      const next = await apiFetch("/super-admin/economy-overview/print-money", { method: "POST", body: { amount, reason: printReason || undefined } });
      setData(next);
      setPrintAmount(""); setPrintReason("");
      flash(`Printed ${fmt(amount)}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setPrinting(false);
    }
  }

  async function withdrawMoney(e) {
    e.preventDefault();
    const amount = Math.trunc(Number(withdrawAmount));
    if (!Number.isFinite(amount) || amount <= 0 || !withdrawTarget.trim()) return;
    if (!confirm(`Withdraw ${fmt(amount)} from the Government reserve into account ${withdrawTarget.trim()}?`)) return;
    setWithdrawing(true);
    setError(null);
    try {
      const next = await apiFetch("/super-admin/economy-overview/withdraw-money", { method: "POST", body: { amount, targetDiscordId: withdrawTarget.trim(), reason: withdrawReason || undefined } });
      setData(next);
      flash(`Withdrew ${fmt(amount)} to ${withdrawTarget.trim()}.`);
      setWithdrawAmount(""); setWithdrawTarget(""); setWithdrawReason(""); setWithdrawPickerKey(k => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setWithdrawing(false);
    }
  }

  if (error && !data) return <div className="error-banner">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  const capPercent = data.moneySupplyCap ? Math.min(100, (data.totalMoneySupply / data.moneySupplyCap) * 100) : 0;

  return (
    <>
      <p className="muted card-subtitle">A live snapshot of the entire economy, updating automatically.</p>
      {error && <div className="error-banner">{error}</div>}
      {notice && <div className="success-banner">{notice}</div>}
      <div className="card-grid">
        <div className="stat-tile"><div className="muted">Total Money Supply</div><div className="verification-identity-name">{fmt(data.totalMoneySupply)}</div></div>
        <div className="stat-tile"><div className="muted">In Player Wallets</div><div className="verification-identity-name">{fmt(data.totalWalletBalance)} <span className="muted">({data.walletCount})</span></div></div>
        <div className="stat-tile"><div className="muted">In Savings</div><div className="verification-identity-name">{fmt(data.totalSavings)}</div></div>
        <div className="stat-tile"><div className="muted">In Business Treasuries</div><div className="verification-identity-name">{fmt(data.totalBusinessTreasury)} <span className="muted">({data.businessCount})</span></div></div>
        <div className="stat-tile"><div className="muted">Government Reserve</div><div className="verification-identity-name">{fmt(data.governmentBalance)}</div></div>
        <div className="stat-tile"><div className="muted">Locked in Stock Market</div><div className="verification-identity-name">{fmt(data.stockMarketBalance)}</div></div>
        <div className="stat-tile"><div className="muted">In Lottery Pots</div><div className="verification-identity-name">{fmt(data.lotteryPotTotal)}</div></div>
      </div>

      <h2 style={{ marginTop: 20 }}>Money Supply Cap</h2>
      <p className="muted card-subtitle">
        {data.moneySupplyCapEnabled
          ? `Enabled -- once total supply reaches ${fmt(data.moneySupplyCap)}, /work, /daily, crime rewards, new loans, and stock dividends stop minting and draw from the Government Reserve instead. Change the cap or turn it off from Bot Settings.`
          : "Disabled -- the economy is currently free to grow without limit. Enable it from Bot Settings."}
      </p>
      {data.moneySupplyCapEnabled && (
        <div style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", height: 10, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ width: `${capPercent}%`, height: "100%", background: capPercent >= 100 ? "var(--danger)" : "var(--accent)" }} />
        </div>
      )}
      <p className="muted">{fmt(data.totalMoneySupply)} / {fmt(data.moneySupplyCap)} ({capPercent.toFixed(1)}%)</p>

      <h2 style={{ marginTop: 20 }}>Print Money</h2>
      <p className="muted card-subtitle">Intentionally grows the money supply by minting directly into the Government Reserve. The only other way new money enters the economy is through /work, /daily, crime rewards, new loans, and stock dividends (and only up to the cap above).</p>
      <form onSubmit={printMoney} className="button-row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label>Amount</label>
          <input type="number" min="1" value={printAmount} onChange={e => setPrintAmount(e.target.value)} style={{ width: 150 }} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Reason (optional)</label>
          <input value={printReason} onChange={e => setPrintReason(e.target.value)} />
        </div>
        <button className="primary" type="submit" disabled={printing}>{printing ? "Printing…" : "Print Money"}</button>
      </form>

      <h2 style={{ marginTop: 20 }}>Withdraw Money</h2>
      <p className="muted card-subtitle">Moves money out of the Government Reserve into any account -- a real transfer, not a burn. Capped at whatever's currently in the reserve.</p>
      <div className="form-inline-field" style={{ maxWidth: 340, marginBottom: 8 }}>
        <label>To Player</label>
        <AccountPicker key={withdrawPickerKey} onSelect={m => setWithdrawTarget(m.discordId)} placeholder="Search by username or nickname" />
      </div>
      <form onSubmit={withdrawMoney} className="button-row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label>Amount</label>
          <input type="number" min="1" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} style={{ width: 150 }} />
        </div>
        <div>
          <label>Or System Wallet / ID</label>
          <input value={withdrawTarget} onChange={e => setWithdrawTarget(e.target.value)} placeholder="e.g. GOVERNMENT" style={{ width: 180 }} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Reason (optional)</label>
          <input value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)} />
        </div>
        <button className="secondary" type="submit" disabled={withdrawing}>{withdrawing ? "Withdrawing…" : "Withdraw Money"}</button>
      </form>

      <h2 style={{ marginTop: 20 }}>Top 10 Wallets</h2>
      <div className="loa-list">
        {data.topWallets.map(w => (
          <div className="loa-card loa-card-row" key={w.discord_id}>
            <NamedHolder discordId={w.discord_id} prefix="holder" row={w} />
            <span className="muted" style={{ marginLeft: "auto" }}>{fmt(w.balance)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ==================================================================
// Global economy config -- taxes + system on/off switches.
// ==================================================================
export function EconomyConfigPanel() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    apiFetch("/super-admin/economy-config").then(setConfig).catch(err => setError(err.message));
  }
  useEffect(load, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const next = await apiFetch("/super-admin/economy-config", { method: "PATCH", body: config });
      setConfig(next);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !config) return <div className="error-banner">{error}</div>;
  if (!config) return <p className="muted">Loading…</p>;

  const SYSTEM_LABELS = {
    daily: "Daily Bonus",
    work: "/work",
    business: "Founding Businesses",
    casino: "Casino Games (all)",
    marketplace: "Marketplace",
    lottery: "Lottery",
  };

  const NEWS_CATEGORY_LABELS = {
    daily_change: "Notable Daily Changes",
    new_high: "New Highs",
    new_low: "New Lows",
    large_trade: "Large Trades",
    new_listing: "New Stock Listings",
    lottery_win: "Lottery Wins",
    market_warning: "Market Warnings",
  };

  return (
    <>
      <p className="muted card-subtitle">Applies live -- no restart needed. Every player faucet and sink can be paused independently for testing or an event.</p>
      {error && <div className="error-banner">{error}</div>}
      {saved && <div className="success-banner">Saved.</div>}

      <h2>Taxes</h2>
      <div className="form-row">
        <div>
          <label>Personal Tax Rate (%)</label>
          <input type="number" step="0.1" min="0" value={config.taxes.personalRate * 100}
            onChange={e => setConfig({ ...config, taxes: { ...config.taxes, personalRate: Number(e.target.value) / 100 } })} />
        </div>
        <div>
          <label>Personal Tax-Free Threshold</label>
          <input type="number" min="0" value={config.taxes.personalThreshold}
            onChange={e => setConfig({ ...config, taxes: { ...config.taxes, personalThreshold: Number(e.target.value) } })} />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Business Tax Rate (%)</label>
          <input type="number" step="0.1" min="0" value={config.taxes.businessRate * 100}
            onChange={e => setConfig({ ...config, taxes: { ...config.taxes, businessRate: Number(e.target.value) / 100 } })} />
        </div>
        <div>
          <label>Business Tax-Free Threshold</label>
          <input type="number" min="0" value={config.taxes.businessThreshold}
            onChange={e => setConfig({ ...config, taxes: { ...config.taxes, businessThreshold: Number(e.target.value) } })} />
        </div>
      </div>

      <h2 style={{ marginTop: 20 }}>Systems</h2>
      <div className="card-grid">
        {Object.keys(SYSTEM_LABELS).map(key => (
          <label className="checkbox-label" key={key}>
            <input
              type="checkbox"
              checked={!!config.systems[key]}
              onChange={e => setConfig({ ...config, systems: { ...config.systems, [key]: e.target.checked } })}
            />
            {SYSTEM_LABELS[key]}
          </label>
        ))}
      </div>

      <h2 style={{ marginTop: 20 }}>Economy News Sensitivity</h2>
      <p className="muted card-subtitle">
        Controls the automated news system (daily-change sweeps, new highs/lows, large trades, new listings,
        lottery wins, market warnings) -- not the manual crash/rally/event tools, which always post.
      </p>
      <label>Minimum Importance to Post to Discord</label>
      <CustomSelect
        value={config.newsSensitivity.minImportanceToPost}
        onChange={v => setConfig({ ...config, newsSensitivity: { ...config.newsSensitivity, minImportanceToPost: v } })}
        options={[
          { value: "minor", label: "Minor and up (everything)" },
          { value: "notable", label: "Notable and up (default)" },
          { value: "major", label: "Major only" },
        ]}
      />
      <p className="muted" style={{ marginTop: 4, marginBottom: 12 }}>
        The website's news feed always shows every category regardless of this setting -- it only gates the Discord channel.
      </p>
      <div className="card-grid">
        {Object.entries(NEWS_CATEGORY_LABELS).map(([key, label]) => (
          <label className="checkbox-label" key={key}>
            <input
              type="checkbox"
              checked={config.newsSensitivity.enabledCategories[key] !== false}
              onChange={e => setConfig({
                ...config,
                newsSensitivity: {
                  ...config.newsSensitivity,
                  enabledCategories: { ...config.newsSensitivity.enabledCategories, [key]: e.target.checked },
                },
              })}
            />
            {label}
          </label>
        ))}
      </div>

      <h2 style={{ marginTop: 20 }}>Crime System</h2>
      <p className="muted card-subtitle">
        Bank/ATM/store robbery and pickpocket -- optional high-risk ways to earn money. Keep these below what
        jobs/business/investing/casino can pay so crime stays a side activity, not the best strategy.
      </p>
      {Object.entries(CRIME_LABELS).map(([key, label]) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <label className="checkbox-label" style={{ marginBottom: 4 }}><strong>{label}</strong></label>
          <div className="form-row">
            <div>
              <label>Success Chance (%)</label>
              <input type="number" step="1" min="0" max="100" value={Math.round(config.crime[key].successChance * 100)}
                onChange={e => setConfig({ ...config, crime: { ...config.crime, [key]: { ...config.crime[key], successChance: Number(e.target.value) / 100 } } })} />
            </div>
            <div>
              <label>Cooldown (minutes)</label>
              <input type="number" min="0" value={config.crime[key].cooldownMinutes}
                onChange={e => setConfig({ ...config, crime: { ...config.crime, [key]: { ...config.crime[key], cooldownMinutes: Number(e.target.value) } } })} />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label>Min Payout</label>
              <input type="number" min="0" value={config.crime[key].minPayout}
                onChange={e => setConfig({ ...config, crime: { ...config.crime, [key]: { ...config.crime[key], minPayout: Number(e.target.value) } } })} />
            </div>
            <div>
              <label>Max Payout</label>
              <input type="number" min="0" value={config.crime[key].maxPayout}
                onChange={e => setConfig({ ...config, crime: { ...config.crime, [key]: { ...config.crime[key], maxPayout: Number(e.target.value) } } })} />
            </div>
            <div>
              <label>Fine on Failure</label>
              <input type="number" min="0" value={config.crime[key].fine}
                onChange={e => setConfig({ ...config, crime: { ...config.crime, [key]: { ...config.crime[key], fine: Number(e.target.value) } } })} />
            </div>
            <div>
              <label>Jail Time on Failure (minutes)</label>
              <input type="number" min="0" value={config.crime[key].jailMinutes}
                onChange={e => setConfig({ ...config, crime: { ...config.crime, [key]: { ...config.crime[key], jailMinutes: Number(e.target.value) } } })} />
            </div>
          </div>
        </div>
      ))}

      <h2 style={{ marginTop: 20 }}>Debt System</h2>
      <p className="muted card-subtitle">
        Loan types, rates, and limits (see /loan). Financial reputation (0-1000, 500 neutral) then scales the actual
        rate/limit a player is offered on top of these base numbers -- the swings below control by how much.
      </p>
      {Object.entries(DEBT_LOAN_TYPE_LABELS).map(([key, label]) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <label className="checkbox-label" style={{ marginBottom: 4 }}>
            <strong>{label}</strong>{config.debt.loanTypes[key].requiresBusiness && <span className="muted"> (requires owning a business)</span>}
          </label>
          <div className="form-row">
            <div>
              <label>Base Interest Rate (%)</label>
              <input type="number" step="0.1" min="0" value={config.debt.loanTypes[key].baseInterestRate * 100}
                onChange={e => setConfig({ ...config, debt: { ...config.debt, loanTypes: { ...config.debt.loanTypes, [key]: { ...config.debt.loanTypes[key], baseInterestRate: Number(e.target.value) / 100 } } } })} />
            </div>
            <div>
              <label>Limit Multiplier</label>
              <input type="number" step="0.1" min="0" value={config.debt.loanTypes[key].limitMultiplier}
                onChange={e => setConfig({ ...config, debt: { ...config.debt, loanTypes: { ...config.debt.loanTypes, [key]: { ...config.debt.loanTypes[key], limitMultiplier: Number(e.target.value) } } } })} />
            </div>
            <div>
              <label>Min Reputation Required</label>
              <input type="number" min="0" max="1000" value={config.debt.loanTypes[key].minReputation}
                onChange={e => setConfig({ ...config, debt: { ...config.debt, loanTypes: { ...config.debt.loanTypes, [key]: { ...config.debt.loanTypes[key], minReputation: Number(e.target.value) } } } })} />
            </div>
            <div>
              <label>Term Options (days, comma-separated)</label>
              <input value={config.debt.loanTypes[key].termOptionsDays.join(", ")}
                onChange={e => setConfig({
                  ...config,
                  debt: { ...config.debt, loanTypes: { ...config.debt.loanTypes, [key]: {
                    ...config.debt.loanTypes[key],
                    termOptionsDays: e.target.value.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n > 0),
                  } } },
                })} />
            </div>
          </div>
        </div>
      ))}

      <h3 style={{ marginTop: 16 }}>Financial Reputation Effects</h3>
      <div className="form-row">
        <div>
          <label>Rate Swing (+/- percentage points at min/max reputation)</label>
          <input type="number" step="0.1" min="0" value={config.debt.reputationRateSwing * 100}
            onChange={e => setConfig({ ...config, debt: { ...config.debt, reputationRateSwing: Number(e.target.value) / 100 } })} />
        </div>
        <div>
          <label>Limit Swing (+/- fraction at min/max reputation)</label>
          <input type="number" step="0.1" min="0" value={config.debt.reputationLimitSwing}
            onChange={e => setConfig({ ...config, debt: { ...config.debt, reputationLimitSwing: Number(e.target.value) } })} />
        </div>
      </div>
      <div className="form-row">
        <div>
          <label>Reputation Gain: Early Repayment</label>
          <input type="number" value={config.debt.reputationChanges.earlyRepay}
            onChange={e => setConfig({ ...config, debt: { ...config.debt, reputationChanges: { ...config.debt.reputationChanges, earlyRepay: Number(e.target.value) } } })} />
        </div>
        <div>
          <label>Reputation Gain: On-Time Repayment</label>
          <input type="number" value={config.debt.reputationChanges.onTimeRepay}
            onChange={e => setConfig({ ...config, debt: { ...config.debt, reputationChanges: { ...config.debt.reputationChanges, onTimeRepay: Number(e.target.value) } } })} />
        </div>
        <div>
          <label>Reputation Loss: Default</label>
          <input type="number" value={config.debt.reputationChanges.default}
            onChange={e => setConfig({ ...config, debt: { ...config.debt, reputationChanges: { ...config.debt.reputationChanges, default: Number(e.target.value) } } })} />
        </div>
      </div>

      <div className="button-row" style={{ marginTop: 16 }}>
        <button className="primary" type="button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Changes"}</button>
      </div>
    </>
  );
}

const DEBT_LOAN_TYPE_LABELS = {
  personal: "Personal",
  business: "Business",
  emergency: "Emergency",
  highRisk: "High-Risk",
};

const CRIME_LABELS = {
  bank: "Bank Robbery",
  atm: "ATM Robbery",
  store: "Store Robbery",
  pickpocket: "Pickpocket",
};

// ==================================================================
// Businesses -- search, view, and unrestricted edit (including
// ownership override).
// ==================================================================
export function BusinessesPanel() {
  const [query, setQuery] = useState("");
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  // The background poll must re-run the LAST SUBMITTED search, not
  // whatever's currently typed in the box -- otherwise a poll landing
  // mid-keystroke silently replaces the visible list with results for a
  // half-typed query the admin never submitted. A ref (not state) so
  // typing itself doesn't need to re-render or reset the poll.
  const submittedQuery = useRef("");

  function refresh() {
    apiFetch(`/super-admin/businesses?q=${encodeURIComponent(submittedQuery.current)}`)
      .then(({ businesses }) => { setBusinesses(businesses); setError(null); })
      .catch(err => setError(err.message));
  }

  function search(e) {
    e?.preventDefault();
    submittedQuery.current = query;
    refresh();
  }
  // `selected` (the edit modal below) is a snapshot captured on click, not
  // derived from `businesses` -- refreshing the list in the background
  // never touches whatever's currently open for editing.
  usePolling(refresh, ADMIN_POLL_MS);

  return (
    <>
      <p className="muted card-subtitle">Every player-owned business -- edit any setting, treasury, or ownership directly.</p>
      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={search} className="form-inline-row">
        <div className="form-inline-field">
          <label>Search by name or owner Discord ID</label>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Lucky Star Casino" />
        </div>
        <div className="form-inline-field form-inline-field-btn">
          <label aria-hidden="true">&nbsp;</label>
          <button className="secondary" type="submit">Search</button>
        </div>
      </form>

      <div className="loa-list" style={{ marginTop: 12 }}>
        {businesses.map(b => (
          <div key={b.id} className="loa-card loa-card-row" style={{ cursor: "pointer" }} onClick={() => setSelected(b)}>
            <div>
              <div className="verification-identity-name">{b.name} <span className="badge loa-status-pending">{b.type}</span></div>
              <div className="muted">
                Owner: <DiscordIdentity nickname={b.owner_nickname} username={b.owner_username} discordId={b.owner_discord_id} showAvatar={false} showId={false} />
              </div>
            </div>
            <span className="muted" style={{ marginLeft: "auto" }}>{fmt(b.treasury)}</span>
          </div>
        ))}
        {businesses.length === 0 && <p className="muted">No businesses found.</p>}
      </div>

      {selected && (
        <BusinessEditModal
          business={selected}
          onClose={() => setSelected(null)}
          onSaved={updated => { setSelected(null); setBusinesses(businesses.map(b => b.id === updated.id ? updated : b)); }}
        />
      )}
    </>
  );
}

function BusinessEditModal({ business, onClose, onSaved }) {
  const [name, setName] = useState(business.name);
  const [type, setType] = useState(business.type);
  const [treasury, setTreasury] = useState(business.treasury);
  const [minBet, setMinBet] = useState(business.min_bet);
  const [maxBet, setMaxBet] = useState(business.max_bet);
  const [slotPayoutRate, setSlotPayoutRate] = useState(business.slot_payout_rate);
  const [vipMinBalance, setVipMinBalance] = useState(business.vip_min_balance ?? "");
  const [ownerDiscordId, setOwnerDiscordId] = useState(business.owner_discord_id);
  const [newOwnerLabel, setNewOwnerLabel] = useState(null); // set only if the owner is actually being changed via the picker
  const [enabledGames, setEnabledGames] = useState(() => {
    try { return JSON.parse(business.enabled_games); } catch { return []; }
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function toggleGame(game) {
    setEnabledGames(prev => prev.includes(game) ? prev.filter(g => g !== game) : [...prev, game]);
  }

  async function save() {
    if (ownerDiscordId !== business.owner_discord_id) {
      const fromLabel = discordDisplayName(business.owner_nickname, business.owner_username, business.owner_discord_id);
      const toLabel = newOwnerLabel ?? ownerDiscordId;
      if (!confirm(`Override ownership from ${fromLabel} to ${toLabel}? This cannot be undone from here.`)) return;
    }
    setSaving(true);
    setError(null);
    try {
      const { business: updated } = await apiFetch(`/super-admin/businesses/${business.id}`, {
        method: "PATCH",
        body: {
          name, type, treasury: Number(treasury), minBet: Number(minBet), maxBet: Number(maxBet),
          slotPayoutRate: Number(slotPayoutRate),
          vipMinBalance: vipMinBalance === "" ? null : Number(vipMinBalance),
          enabledGames, ownerDiscordId,
        },
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Edit {business.name}</h2>
        {error && <div className="error-banner">{error}</div>}

        <label>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} />

        <div className="form-row">
          <div>
            <label>Type</label>
            <CustomSelect value={type} onChange={setType} options={[{ value: "storefront", label: "Storefront" }, { value: "casino", label: "Casino" }, { value: "bank", label: "Bank" }, { value: "insurance", label: "Insurance Company" }]} />
          </div>
          <div>
            <label>Treasury</label>
            <input type="number" value={treasury} onChange={e => setTreasury(e.target.value)} />
          </div>
        </div>

        {type === "casino" && (
          <>
            <div className="form-row">
              <div><label>Min Bet</label><input type="number" value={minBet} onChange={e => setMinBet(e.target.value)} /></div>
              <div><label>Max Bet</label><input type="number" value={maxBet} onChange={e => setMaxBet(e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div><label>Slot Payout Rate (%)</label><input type="number" value={slotPayoutRate} onChange={e => setSlotPayoutRate(e.target.value)} /></div>
              <div><label>VIP Min Balance (blank = none)</label><input type="number" value={vipMinBalance} onChange={e => setVipMinBalance(e.target.value)} /></div>
            </div>
            <label>Enabled Games</label>
            <div className="card-grid">
              {GAMES.map(g => (
                <label className="checkbox-label" key={g}>
                  <input type="checkbox" checked={enabledGames.includes(g)} onChange={() => toggleGame(g)} /> {GAME_LABELS[g]}
                </label>
              ))}
            </div>
          </>
        )}

        <label style={{ marginTop: 12 }}>Owner</label>
        <div className="button-row" style={{ alignItems: "center", marginBottom: 4 }}>
          <DiscordIdentity variant="row" nickname={business.owner_nickname} username={business.owner_username} discordId={business.owner_discord_id} avatarHash={business.owner_avatar_hash} showId={false} />
        </div>
        <AccountPicker
          placeholder="Search to transfer ownership to someone else..."
          onSelect={m => { setOwnerDiscordId(m.discordId); setNewOwnerLabel(m.nickname || m.username || "Unknown Member"); }}
        />
        {ownerDiscordId !== business.owner_discord_id && (
          <p className="muted field-hint">New owner: {newOwnerLabel}. This will override ownership -- confirmation required on save.</p>
        )}

        <div className="button-row" style={{ marginTop: 16 }}>
          <button className="primary" type="button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Changes"}</button>
          <button className="secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// Casino house controls -- per-game settings, saved profiles, bet-size
// tiers, stats, and recent transactions, for a single selected casino.
// ==================================================================
export function CasinoControlsPanel() {
  const [casinos, setCasinos] = useState([]);
  const [casinoId, setCasinoId] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/super-admin/casinos").then(({ casinos }) => {
      setCasinos(casinos);
      if (casinos.length > 0) setCasinoId(String(casinos[0].id));
    }).catch(err => setError(err.message));
  }, []);

  const casino = casinos.find(c => String(c.id) === casinoId);

  return (
    <>
      <p className="muted card-subtitle">Configure payout rates, win probabilities, bet limits, and profiles per game -- changes apply on the next bet, no restart.</p>
      {error && <div className="error-banner">{error}</div>}
      {casinos.length === 0 && !error && <p className="muted">No casinos exist yet.</p>}

      {casinos.length > 0 && (
        <>
          <label>Casino</label>
          <CustomSelect
            value={casinoId}
            onChange={setCasinoId}
            options={casinos.map(c => ({ value: String(c.id), label: `${c.name} (owner: ${c.owner_nickname || c.owner_username || "Unknown Member"})` }))}
          />
        </>
      )}

      {casino && <CasinoGameControls key={casino.id} casino={casino} />}
    </>
  );
}

function CasinoGameControls({ casino }) {
  const [game, setGame] = useState("slots");
  const [settings, setSettings] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function loadAll() {
    apiFetch(`/super-admin/casinos/${casino.id}/settings`).then(({ settings }) => setSettings(settings.find(s => s.game === game)));
    apiFetch(`/super-admin/casinos/${casino.id}/profiles/${game}`).then(({ profiles }) => setProfiles(profiles));
    apiFetch(`/super-admin/casinos/${casino.id}/bet-tiers/${game}`).then(({ rules }) => setRules(rules));
    apiFetch(`/super-admin/casinos/${casino.id}/stats`).then(setStats);
    apiFetch(`/super-admin/casinos/${casino.id}/transactions?limit=20`).then(({ transactions }) => setTransactions(transactions));
  }
  useEffect(loadAll, [casino.id, game]);

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { settings: next } = await apiFetch(`/super-admin/casinos/${casino.id}/settings`, {
        method: "PATCH",
        body: {
          game,
          enabled: settings.enabled,
          payoutRate: settings.payout_rate === "" ? null : Number(settings.payout_rate),
          winProbabilityBp: settings.win_probability_bp === "" ? null : Number(settings.win_probability_bp),
          minBet: settings.min_bet === "" ? null : Number(settings.min_bet),
          maxBet: settings.max_bet === "" ? null : Number(settings.max_bet),
        },
      });
      setSettings(next);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetSettings() {
    if (!confirm(`Reset ${GAME_LABELS[game]} back to the business's default settings?`)) return;
    await apiFetch(`/super-admin/casinos/${casino.id}/settings/${game}/reset`, { method: "POST" });
    loadAll();
  }

  async function saveProfile() {
    const name = prompt("Save the current live settings as a profile named:");
    if (!name) return;
    const { profiles } = await apiFetch(`/super-admin/casinos/${casino.id}/profiles/${game}`, { method: "POST", body: { name } });
    setProfiles(profiles);
  }

  async function applyProfile(name) {
    if (!confirm(`Apply the "${name}" profile to ${GAME_LABELS[game]}? This overwrites the current live settings immediately.`)) return;
    const { settings: next } = await apiFetch(`/super-admin/casinos/${casino.id}/profiles/${game}/${encodeURIComponent(name)}/apply`, { method: "POST" });
    setSettings(next);
  }

  async function deleteProfile(name) {
    if (!confirm(`Delete the "${name}" profile?`)) return;
    await apiFetch(`/super-admin/casinos/${casino.id}/profiles/${game}/${encodeURIComponent(name)}`, { method: "DELETE" });
    setProfiles(profiles.filter(p => p.name !== name));
  }

  const [tierMin, setTierMin] = useState("");
  const [tierMax, setTierMax] = useState("");
  const [tierPayoutRate, setTierPayoutRate] = useState("");
  const [tierWinProb, setTierWinProb] = useState("");

  async function addRule(e) {
    e.preventDefault();
    if (!tierMin) return;
    const { rule } = await apiFetch(`/super-admin/casinos/${casino.id}/bet-tiers/${game}`, {
      method: "POST",
      body: {
        minWager: Number(tierMin),
        maxWager: tierMax === "" ? undefined : Number(tierMax),
        payoutRate: tierPayoutRate === "" ? undefined : Number(tierPayoutRate),
        winProbabilityBp: tierWinProb === "" ? undefined : Number(tierWinProb),
      },
    });
    setRules([...rules, rule]);
    setTierMin(""); setTierMax(""); setTierPayoutRate(""); setTierWinProb("");
  }

  async function removeRule(id) {
    await apiFetch(`/super-admin/bet-tiers/${id}`, { method: "DELETE" });
    setRules(rules.filter(r => r.id !== id));
  }

  if (!settings) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="tabs" role="tablist" style={{ marginTop: 16 }}>
        {GAMES.map(g => (
          <button key={g} type="button" className={`tab ${game === g ? "active" : ""}`} onClick={() => setGame(g)}>{GAME_LABELS[g]}</button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {saved && <div className="success-banner">Saved.</div>}

      <h2 style={{ marginTop: 12 }}>{GAME_LABELS[game]} Settings</h2>
      <label className="checkbox-label">
        <input type="checkbox" checked={!!settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} /> Enabled at this casino
      </label>
      <div className="form-row">
        <div>
          <label>{game === "slots" ? "Target Payout Rate / RTP (%)" : "Payout Scale (% of normal, 100 = normal)"}</label>
          <input type="number" placeholder="business default" value={settings.payout_rate ?? ""} onChange={e => setSettings({ ...settings, payout_rate: e.target.value })} />
        </div>
        {game === "slots" && (
          <div>
            <label>Jackpot Chance Override (basis points, 100 = 1%)</label>
            <input type="number" placeholder="default 200 (2%)" value={settings.win_probability_bp ?? ""} onChange={e => setSettings({ ...settings, win_probability_bp: e.target.value })} />
          </div>
        )}
      </div>
      <div className="form-row">
        <div><label>Min Bet Override</label><input type="number" placeholder="business default" value={settings.min_bet ?? ""} onChange={e => setSettings({ ...settings, min_bet: e.target.value })} /></div>
        <div><label>Max Bet Override</label><input type="number" placeholder="business default" value={settings.max_bet ?? ""} onChange={e => setSettings({ ...settings, max_bet: e.target.value })} /></div>
      </div>
      <div className="button-row">
        <button className="primary" type="button" disabled={saving} onClick={saveSettings}>{saving ? "Saving…" : "Save Live Settings"}</button>
        <button className="secondary" type="button" onClick={resetSettings}>Reset to Default</button>
        <button className="secondary" type="button" onClick={saveProfile}>Save as Profile</button>
      </div>

      {profiles.length > 0 && (
        <>
          <h2 style={{ marginTop: 20 }}>Saved Profiles</h2>
          <div className="loa-list">
            {profiles.map(p => (
              <div className="loa-card loa-card-row" key={p.name}>
                <div>
                  <div className="verification-identity-name">{p.name}</div>
                  <div className="muted">Payout rate: {p.payout_rate ?? "default"} &middot; Enabled: {p.enabled ? "yes" : "no"}</div>
                </div>
                <div className="button-row" style={{ marginLeft: "auto" }}>
                  <button className="secondary small" type="button" onClick={() => applyProfile(p.name)}>Apply</button>
                  <button className="btn-red small" type="button" onClick={() => deleteProfile(p.name)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ marginTop: 20 }}>Bet-Size Tiers</h2>
      <p className="muted card-subtitle">Different payout rates apply automatically above/below a wager threshold.</p>
      <form onSubmit={addRule} className="form-row">
        <div><label>Min Wager</label><input type="number" required value={tierMin} onChange={e => setTierMin(e.target.value)} /></div>
        <div><label>Max Wager (blank = no cap)</label><input type="number" value={tierMax} onChange={e => setTierMax(e.target.value)} /></div>
        <div><label>Payout Rate Override</label><input type="number" value={tierPayoutRate} onChange={e => setTierPayoutRate(e.target.value)} /></div>
        {game === "slots" && <div><label>Jackpot Chance Override (bp)</label><input type="number" value={tierWinProb} onChange={e => setTierWinProb(e.target.value)} /></div>}
        <div className="form-inline-field-btn"><label aria-hidden="true">&nbsp;</label><button className="secondary" type="submit">Add Rule</button></div>
      </form>
      <div className="loa-list">
        {rules.map(r => (
          <div className="loa-card loa-card-row" key={r.id}>
            <span>${r.min_wager.toLocaleString()}{r.max_wager ? ` - $${r.max_wager.toLocaleString()}` : "+"}: payout rate {r.payout_rate ?? "default"}</span>
            <button className="btn-red small" type="button" style={{ marginLeft: "auto" }} onClick={() => removeRule(r.id)}>Remove</button>
          </div>
        ))}
        {rules.length === 0 && <p className="muted">No bet-size tiers configured.</p>}
      </div>

      {stats && (
        <>
          <h2 style={{ marginTop: 20 }}>Profit / Loss</h2>
          <div className="card-grid">
            <div className="stat-tile"><div className="muted">Total Wagered</div><div className="verification-identity-name">{fmt(stats.wagered)}</div></div>
            <div className="stat-tile"><div className="muted">Total Paid Out</div><div className="verification-identity-name">{fmt(stats.paidOut)}</div></div>
            <div className="stat-tile"><div className="muted">Net Profit</div><div className="verification-identity-name">{fmt(stats.netProfit)}</div></div>
            <div className="stat-tile"><div className="muted">Rounds Played</div><div className="verification-identity-name">{stats.rounds}</div></div>
          </div>
        </>
      )}

      <h2 style={{ marginTop: 20 }}>Recent Transactions</h2>
      <div className="loa-list">
        {transactions.map(t => (
          <div className="loa-card loa-card-row" key={t.id}>
            <NamedHolder discordId={t.discord_id} prefix="player" row={t} />
            <span className="muted">{GAME_LABELS[t.game] ?? t.game}</span>
            <span className="muted" style={{ marginLeft: "auto" }}>bet {fmt(t.bet)} &rarr; paid {fmt(t.payout)}</span>
          </div>
        ))}
        {transactions.length === 0 && <p className="muted">No rounds played yet.</p>}
      </div>
    </>
  );
}

// ==================================================================
// Lottery
// ==================================================================
export function LotteryPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [ticketPrice, setTicketPrice] = useState(100);

  function load() {
    apiFetch("/super-admin/lottery").then(d => { setData(d); setError(null); }).catch(err => setError(err.message));
  }
  usePolling(load, ADMIN_POLL_MS);

  async function create(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/super-admin/lottery", { method: "POST", body: { ticketPrice: Number(ticketPrice) } });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function draw() {
    if (!confirm(`Draw a winner now for the pot of ${fmt(data.current.pot)}? This picks and pays out a winner immediately.`)) return;
    try {
      await apiFetch(`/super-admin/lottery/${data.current.id}/draw`, { method: "POST" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function voidCurrent() {
    if (!confirm("Void the current lottery? All tickets purchased are forfeited with no payout.")) return;
    await apiFetch(`/super-admin/lottery/${data.current.id}/void`, { method: "POST" });
    load();
  }

  if (!data) return <p className="muted">Loading…</p>;

  return (
    <>
      <p className="muted card-subtitle">One lottery runs at a time. Players buy in with `/lottery buy`; drawing pays the whole pot to one weighted-random winner.</p>
      {error && <div className="error-banner">{error}</div>}

      {data.current ? (
        <>
          <div className="card-grid">
            <div className="stat-tile"><div className="muted">Ticket Price</div><div className="verification-identity-name">{fmt(data.current.ticket_price)}</div></div>
            <div className="stat-tile"><div className="muted">Current Pot</div><div className="verification-identity-name">{fmt(data.current.pot)}</div></div>
            <div className="stat-tile"><div className="muted">Entrants</div><div className="verification-identity-name">{data.entrants.length}</div></div>
          </div>
          <div className="button-row" style={{ marginTop: 12 }}>
            <button className="primary" type="button" onClick={draw}>Draw Winner Now</button>
            <button className="btn-red" type="button" onClick={voidCurrent}>Void Lottery</button>
          </div>

          <h2 style={{ marginTop: 20 }}>Entrants</h2>
          <div className="loa-list">
            {data.entrants.map(en => (
              <div className="loa-card loa-card-row" key={en.discord_id}>
                <NamedHolder discordId={en.discord_id} prefix="player" row={en} />
                <span className="muted" style={{ marginLeft: "auto" }}>{en.ticket_count} ticket(s)</span>
              </div>
            ))}
            {data.entrants.length === 0 && <p className="muted">No tickets sold yet.</p>}
          </div>
        </>
      ) : (
        <form onSubmit={create} className="form-inline-row">
          <div className="form-inline-field">
            <label>Ticket Price</label>
            <input type="number" min="1" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} />
          </div>
          <div className="form-inline-field-btn">
            <label aria-hidden="true">&nbsp;</label>
            <button className="primary" type="submit">Start New Lottery</button>
          </div>
        </form>
      )}

      {data.history.length > 0 && (
        <>
          <h2 style={{ marginTop: 20 }}>History</h2>
          <div className="loa-list">
            {data.history.map(l => (
              <div className="loa-card" key={l.id}>
                <div className="loa-card-top loa-card-top-stack">
                  <span className={`badge ${l.status === "drawn" ? "loa-status-approved" : l.status === "void" ? "loa-status-denied" : "loa-status-pending"}`}>{l.status}</span>
                  <span className="muted">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                <div className="log-card-field">Ticket price {fmt(l.ticket_price)} &middot; Pot {fmt(l.pot)}</div>
                {l.winner_discord_id && (
                  <div className="log-card-field">Winner: <NamedHolder discordId={l.winner_discord_id} prefix="winner" row={l} /></div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ==================================================================
// Storefronts -- manage any player-owned storefront's items and prices.
// ==================================================================
export function StorefrontsPanel() {
  const [storefronts, setStorefronts] = useState([]);
  const [storefrontId, setStorefrontId] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/super-admin/storefronts").then(({ storefronts }) => {
      setStorefronts(storefronts);
      if (storefronts.length > 0) setStorefrontId(String(storefronts[0].id));
    }).catch(err => setError(err.message));
  }, []);

  const storefront = storefronts.find(s => String(s.id) === storefrontId);

  return (
    <>
      <p className="muted card-subtitle">
        Oversight for any player-owned storefront's products and sales. Gameplay effects (tool requirements,
        temporary boosts, cooldown/jail reduction) are set by the owner in Discord via /storefrontowner --
        this view covers name, price, stock, and category.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {storefronts.length === 0 && !error && <p className="muted">No storefronts exist yet.</p>}

      {storefronts.length > 0 && (
        <>
          <label>Storefront</label>
          <CustomSelect
            value={storefrontId}
            onChange={setStorefrontId}
            options={storefronts.map(s => ({ value: String(s.id), label: `${s.name} (owner: ${s.owner_nickname || s.owner_username || "Unknown Member"})` }))}
          />
        </>
      )}

      {storefront && <StorefrontProductsEditor key={storefront.id} storefront={storefront} />}
    </>
  );
}

const STOREFRONT_CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "medical", label: "Medical" },
  { value: "clothing", label: "Clothing" },
  { value: "electronics", label: "Electronics" },
  { value: "tools", label: "Tools" },
  { value: "security", label: "Security" },
  { value: "general", label: "General" },
];

function effectSummary(p) {
  if (!p.effect_type) return null;
  if (p.effect_type === "requirement") return `Required for ${p.effect_target}${p.consumable ? " (consumed on use)" : ""}`;
  if (p.effect_type === "crime_success_boost") return `+${Math.round(p.effect_value * 100)}% crime success, ${Math.round(p.effect_duration_ms / 60000)}m`;
  if (p.effect_type === "crime_cooldown_reset") return `-${Math.round(p.effect_value / 60000)}m ${p.effect_target} cooldown`;
  if (p.effect_type === "work_cooldown_reset") return `-${Math.round(p.effect_value / 60000)}m work cooldown`;
  if (p.effect_type === "jail_time_reduction") return `-${Math.round(p.effect_value / 60000)}m jail time`;
  return null;
}

function StorefrontProductsEditor({ storefront }) {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  function loadAll() {
    apiFetch(`/super-admin/storefronts/${storefront.id}/products`).then(({ products }) => setProducts(products));
    apiFetch(`/super-admin/storefronts/${storefront.id}/sales`).then(({ stats, sales }) => { setStats(stats); setSales(sales); });
  }
  useEffect(loadAll, [storefront.id]);

  async function addProduct(e) {
    e.preventDefault();
    if (!name || !price) return;
    try {
      const { products } = await apiFetch(`/super-admin/storefronts/${storefront.id}/products`, {
        method: "POST",
        body: { name, category, price: Number(price), stock: stock === "" ? undefined : Number(stock) },
      });
      setProducts(products);
      setName(""); setPrice(""); setStock("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeProduct(product) {
    if (!confirm(`Remove ${product.name} from this storefront?`)) return;
    await apiFetch(`/super-admin/storefronts/${storefront.id}/products/${product.id}`, { method: "DELETE" });
    setProducts(products.filter(p => p.id !== product.id));
  }

  return (
    <>
      {error && <div className="error-banner">{error}</div>}

      <h2 style={{ marginTop: 16 }}>Products</h2>
      <form onSubmit={addProduct} className="form-row">
        <div><label>Name</label><input required value={name} onChange={e => setName(e.target.value)} /></div>
        <div>
          <label>Category</label>
          <CustomSelect value={category} onChange={setCategory} options={STOREFRONT_CATEGORIES} />
        </div>
        <div><label>Price</label><input type="number" required min="1" value={price} onChange={e => setPrice(e.target.value)} /></div>
        <div><label>Stock (blank = unlimited)</label><input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} /></div>
        <div className="form-inline-field-btn"><label aria-hidden="true">&nbsp;</label><button className="secondary" type="submit">Add Product</button></div>
      </form>

      <div className="loa-list">
        {products.map(p => (
          <div className="loa-card loa-card-row" key={p.id}>
            <span>{p.name} <span className="muted">({STOREFRONT_CATEGORIES.find(c => c.value === p.category)?.label ?? p.category})</span></span>
            <span className="muted">{fmt(p.price)}{p.stock !== null ? ` -- ${p.stock} in stock` : " -- unlimited"}{!p.available ? " -- SOLD OUT" : ""}</span>
            {effectSummary(p) && <span className="muted">{effectSummary(p)}</span>}
            <button className="btn-red small" type="button" style={{ marginLeft: "auto" }} onClick={() => removeProduct(p)}>Remove</button>
          </div>
        ))}
        {products.length === 0 && <p className="muted">Nothing for sale yet.</p>}
      </div>

      {stats && (
        <>
          <h2 style={{ marginTop: 20 }}>Sales</h2>
          <div className="card-grid">
            <div className="stat-tile"><div className="muted">Total Revenue</div><div className="verification-identity-name">{fmt(stats.revenue)}</div></div>
            <div className="stat-tile"><div className="muted">Total Sales</div><div className="verification-identity-name">{stats.sales}</div></div>
            <div className="stat-tile"><div className="muted">Unique Customers</div><div className="verification-identity-name">{stats.uniqueCustomers}</div></div>
          </div>
        </>
      )}

      <h2 style={{ marginTop: 20 }}>Recent Sales</h2>
      <div className="loa-list">
        {sales.map(s => (
          <div className="loa-card loa-card-row" key={s.id}>
            <NamedHolder discordId={s.discord_id} prefix="buyer" row={s} />
            <span className="muted">{s.product_name} x{s.quantity}</span>
            <span className="muted" style={{ marginLeft: "auto" }}>{fmt(s.total_price)}</span>
          </div>
        ))}
        {sales.length === 0 && <p className="muted">No sales yet.</p>}
      </div>
    </>
  );
}

// ==================================================================
// Government Catalog -- full control over what any storefront can
// stock (see highrock-bot's storefront.js/govCatalog.js). This is the
// single source of truth every storefront reads live -- adding,
// editing, disabling, or deleting an item here takes effect
// immediately, no bot deploy needed.
// ==================================================================
const EFFECT_TYPE_OPTIONS = [
  { value: "", label: "None (cosmetic)" },
  { value: "requirement", label: "Requirement -- gates a crime type behind owning one" },
  { value: "crime_success_boost", label: "Crime Success Boost -- temporary success % bump" },
  { value: "crime_cooldown_reset", label: "Crime Cooldown Reset -- instant" },
  { value: "work_cooldown_reset", label: "Work Cooldown Reset -- instant" },
  { value: "jail_time_reduction", label: "Jail Time Reduction -- instant" },
];

function catalogEffectSummary(item) {
  if (!item.effect_type) return "Cosmetic, no effect";
  if (item.effect_type === "requirement") {
    return `Required for ${item.effect_target === "CHOOSE" ? "a crime type the owner picks" : item.effect_target}${item.consumable ? " (consumed on use)" : " (persistent)"}`;
  }
  if (item.effect_type === "crime_success_boost") return `+${Math.round(item.effect_value * 100)}% crime success, ${item.duration_minutes}m`;
  if (item.effect_type === "crime_cooldown_reset") return `-${item.effect_value}m ${item.effect_target === "CHOOSE" ? "(owner picks crime type)" : item.effect_target} cooldown`;
  if (item.effect_type === "work_cooldown_reset") return `-${item.effect_value}m work cooldown`;
  if (item.effect_type === "jail_time_reduction") return `-${item.effect_value}m jail time`;
  return "Cosmetic";
}

const EMPTY_CATALOG_FORM = {
  key: "", name: "", description: "", category: "general", wholesalePrice: "",
  effectType: "", effectTarget: "", effectValue: "", durationMinutes: "", consumable: false, enabled: true,
};

export function GovernmentCatalogPanel() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [crimeTypes, setCrimeTypes] = useState([]);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_CATALOG_FORM);

  function load() {
    apiFetch("/super-admin/gov-catalog").then(({ items, categories, crimeTypes }) => {
      setItems(items);
      setCategories(categories);
      setCrimeTypes(crimeTypes);
    }).catch(err => setError(err.message));
  }
  useEffect(load, []);

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      key: item.key, name: item.name, description: item.description ?? "", category: item.category,
      wholesalePrice: String(item.wholesale_price),
      effectType: item.effect_type ?? "", effectTarget: item.effect_target ?? "",
      effectValue: item.effect_value ?? "", durationMinutes: item.duration_minutes ?? "",
      consumable: !!item.consumable, enabled: !!item.enabled,
    });
  }

  function startCreate() {
    setEditingId("new");
    setForm(EMPTY_CATALOG_FORM);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_CATALOG_FORM);
  }

  async function save(e) {
    e.preventDefault();
    const body = {
      key: form.key || undefined,
      name: form.name,
      description: form.description,
      category: form.category,
      wholesalePrice: Number(form.wholesalePrice),
      effectType: form.effectType || null,
      effectTarget: form.effectTarget || null,
      effectValue: form.effectValue === "" ? null : Number(form.effectValue),
      durationMinutes: form.durationMinutes === "" ? null : Number(form.durationMinutes),
      consumable: form.consumable,
      enabled: form.enabled,
    };
    try {
      if (editingId === "new") {
        await apiFetch("/super-admin/gov-catalog", { method: "POST", body });
      } else {
        await apiFetch(`/super-admin/gov-catalog/${editingId}`, { method: "PATCH", body });
      }
      cancelEdit();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.name}" from the catalog? Storefronts that already stocked it keep their existing inventory, but can never restock it.`)) return;
    await apiFetch(`/super-admin/gov-catalog/${item.id}`, { method: "DELETE" });
    load();
  }

  const showsTarget = form.effectType === "requirement" || form.effectType === "crime_cooldown_reset";
  const showsBoostFields = form.effectType === "crime_success_boost";
  const showsMinutesOnly = form.effectType === "crime_cooldown_reset" || form.effectType === "work_cooldown_reset" || form.effectType === "jail_time_reduction";

  return (
    <>
      <p className="muted card-subtitle">
        Every product a storefront can ever stock comes from here -- name, description, category, wholesale price,
        and what it actually does are all set by you. A storefront owner can only pick how many units to buy and
        what to resell them for; they can never change the description or the effect.
      </p>
      {error && <div className="error-banner">{error}</div>}

      {editingId === null && (
        <button className="secondary" type="button" onClick={startCreate} style={{ marginBottom: 16 }}>+ New Catalog Item</button>
      )}

      {editingId !== null && (
        <form onSubmit={save} className="form-row" style={{ flexWrap: "wrap", marginBottom: 20 }}>
          <div><label>Name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Key (blank = auto from name)</label><input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="auto" /></div>
          <div style={{ flexBasis: "100%" }}><label>Description</label><input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <label>Category</label>
            <CustomSelect value={form.category} onChange={v => setForm({ ...form, category: v })} options={categories.map(c => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))} />
          </div>
          <div><label>Wholesale Price</label><input type="number" required min="1" value={form.wholesalePrice} onChange={e => setForm({ ...form, wholesalePrice: e.target.value })} /></div>
          <div>
            <label>Effect</label>
            <CustomSelect value={form.effectType} onChange={v => setForm({ ...form, effectType: v })} options={EFFECT_TYPE_OPTIONS} />
          </div>
          {showsTarget && (
            <div>
              <label>Crime Type Target</label>
              <CustomSelect
                value={form.effectTarget}
                onChange={v => setForm({ ...form, effectTarget: v })}
                options={[{ value: "CHOOSE", label: "Owner picks when stocking" }, ...crimeTypes.map(c => ({ value: c, label: c }))]}
              />
            </div>
          )}
          {showsBoostFields && (
            <>
              <div><label>Boost % (0-1)</label><input type="number" step="0.01" min="0.01" max="1" required value={form.effectValue} onChange={e => setForm({ ...form, effectValue: e.target.value })} /></div>
              <div><label>Duration (minutes)</label><input type="number" min="1" required value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: e.target.value })} /></div>
            </>
          )}
          {showsMinutesOnly && (
            <div><label>Minutes Reduced</label><input type="number" min="1" required value={form.effectValue} onChange={e => setForm({ ...form, effectValue: e.target.value })} /></div>
          )}
          {form.effectType === "requirement" && (
            <div>
              <label>Consumable?</label>
              <CustomSelect value={form.consumable ? "yes" : "no"} onChange={v => setForm({ ...form, consumable: v === "yes" })} options={[{ value: "no", label: "No -- persistent" }, { value: "yes", label: "Yes -- used up on a gated crime attempt" }]} />
            </div>
          )}
          <div>
            <label>Enabled</label>
            <CustomSelect value={form.enabled ? "yes" : "no"} onChange={v => setForm({ ...form, enabled: v === "yes" })} options={[{ value: "yes", label: "Yes -- stockable" }, { value: "no", label: "No -- hidden from browsing/stocking" }]} />
          </div>
          <div className="form-inline-field-btn"><label aria-hidden="true">&nbsp;</label><button className="secondary" type="submit">{editingId === "new" ? "Create" : "Save"}</button></div>
          <div className="form-inline-field-btn"><label aria-hidden="true">&nbsp;</label><button className="btn-red" type="button" onClick={cancelEdit}>Cancel</button></div>
        </form>
      )}

      <div className="loa-list">
        {items.map(item => (
          <div className="loa-card loa-card-row" key={item.id}>
            <span>{item.name} <span className="muted">({item.category})</span>{!item.enabled && <span className="muted"> -- DISABLED</span>}</span>
            <span className="muted">{fmt(item.wholesale_price)} wholesale</span>
            <span className="muted">{catalogEffectSummary(item)}</span>
            <button className="secondary small" type="button" style={{ marginLeft: "auto" }} onClick={() => startEdit(item)}>Edit</button>
            <button className="btn-red small" type="button" onClick={() => remove(item)}>Delete</button>
          </div>
        ))}
        {items.length === 0 && <p className="muted">No catalog items yet.</p>}
      </div>
    </>
  );
}

// ==================================================================
// Debt & Loans -- oversight for the player-driven /loan system. Loan
// issuing/repayment itself always happens in Discord; everything here is
// correction (edit/forgive), the two leaderboards, reputation lookup, and
// the bulk "economy-wide debt event" action.
// ==================================================================
const LOAN_STATUS_LABELS = { active: "Active", defaulted: "Defaulted", repaid: "Repaid", forgiven: "Forgiven" };

export function DebtPanel() {
  const [loans, setLoans] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [leaderboard, setLeaderboard] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [lookupId, setLookupId] = useState("");
  const [lookupLabel, setLookupLabel] = useState(null);
  const [lookupPickerKey, setLookupPickerKey] = useState(0);
  const [reputation, setReputation] = useState(null);
  const [newReputation, setNewReputation] = useState("");

  const [eventPercent, setEventPercent] = useState("");
  const [eventReason, setEventReason] = useState("");
  const [applyingEvent, setApplyingEvent] = useState(false);

  function load() {
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    apiFetch(`/super-admin/debt/loans${qs}`).then(({ loans }) => { setLoans(loans); setError(null); }).catch(err => setError(err.message));
    apiFetch("/super-admin/debt/leaderboard").then(l => { setLeaderboard(l); setError(null); }).catch(err => setError(err.message));
  }
  usePolling(load, ADMIN_POLL_MS, [statusFilter]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  async function editBalance(loan) {
    const amountOwed = prompt(`New amount owed for this ${loan.loan_type} loan (currently ${fmt(loan.amount_owed)}):`, loan.amount_owed);
    if (amountOwed === null) return;
    const reason = prompt("Reason (optional):") ?? undefined;
    try {
      await apiFetch(`/super-admin/debt/loans/${loan.id}`, { method: "PATCH", body: { amountOwed: Number(amountOwed), reason } });
      flash("Balance updated.");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function forgive(loan) {
    if (!confirm(`Forgive this ${loan.loan_type} loan (${fmt(loan.amount_owed)} owed)? This can't be undone.`)) return;
    const reason = prompt("Reason (optional):") ?? undefined;
    try {
      await apiFetch(`/super-admin/debt/loans/${loan.id}/forgive`, { method: "POST", body: { reason } });
      flash("Loan forgiven.");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function lookupReputation(member) {
    setLookupId(member.discordId);
    setLookupLabel(member.nickname || member.username || "Unknown Member");
    try {
      const { score } = await apiFetch(`/super-admin/debt/reputation/${member.discordId}`);
      setReputation(score);
      setNewReputation(String(score));
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveReputation() {
    const score = Number(newReputation);
    if (!Number.isFinite(score)) return;
    const reason = prompt("Reason (optional):") ?? undefined;
    try {
      const result = await apiFetch(`/super-admin/debt/reputation/${lookupId.trim()}`, { method: "PATCH", body: { score, reason } });
      setReputation(result.score);
      flash("Reputation updated.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function applyEvent(e) {
    e.preventDefault();
    const percent = Number(eventPercent);
    if (!Number.isFinite(percent) || percent === 0) return;
    if (!confirm(`Apply a ${percent > 0 ? "+" : ""}${percent}% adjustment to every open loan's balance? This affects every player with an active or defaulted loan.`)) return;
    setApplyingEvent(true);
    setError(null);
    try {
      const result = await apiFetch("/super-admin/debt/event", { method: "POST", body: { percent, reason: eventReason || undefined } });
      flash(`Applied to ${result.loansAffected} loan(s), total balance change ${fmt(result.totalDelta)}.`);
      setEventPercent(""); setEventReason("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setApplyingEvent(false);
    }
  }

  return (
    <>
      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}
      {notice && <div className="success-banner">{notice}</div>}

      {leaderboard && (
        <div className="card-grid" style={{ marginTop: 16 }}>
          <div>
            <h2>Richest Players</h2>
            <div className="loa-list">
              {leaderboard.richest.map(w => (
                <div className="loa-card loa-card-row" key={w.discord_id}>
                  <NamedHolder discordId={w.discord_id} prefix="player" row={w} />
                  <span className="muted" style={{ marginLeft: "auto" }}>{fmt(w.netWorth)}</span>
                </div>
              ))}
              {leaderboard.richest.length === 0 && <p className="muted">No wallets yet.</p>}
            </div>
          </div>
          <div>
            <h2>Most Indebted</h2>
            <div className="loa-list">
              {leaderboard.mostIndebted.map(w => (
                <div className="loa-card loa-card-row" key={w.discord_id}>
                  <NamedHolder discordId={w.discord_id} prefix="player" row={w} />
                  <span className="muted" style={{ marginLeft: "auto" }}>{fmt(w.totalOwed)} ({w.openLoans})</span>
                </div>
              ))}
              {leaderboard.mostIndebted.length === 0 && <p className="muted">No open loans.</p>}
            </div>
          </div>
        </div>
      )}

      <h2 style={{ marginTop: 20 }}>Financial Reputation Lookup</h2>
      <div style={{ maxWidth: 340 }}>
        <AccountPicker key={lookupPickerKey} onSelect={lookupReputation} />
      </div>
      {lookupLabel && <p className="muted" style={{ marginTop: 4 }}>Looking up: {lookupLabel}</p>}
      {reputation !== null && (
        <div className="button-row" style={{ marginTop: 8, alignItems: "flex-end" }}>
          <div>
            <label>Score (0-1000)</label>
            <input type="number" min="0" max="1000" value={newReputation} onChange={e => setNewReputation(e.target.value)} style={{ width: 120 }} />
          </div>
          <button className="primary" type="button" onClick={saveReputation}>Save</button>
        </div>
      )}

      <h2 style={{ marginTop: 20 }}>Economy-Wide Debt Event</h2>
      <p className="muted card-subtitle">Bulk-adjusts every active or defaulted loan's remaining balance by a percentage -- e.g. -20% for broad relief, or +10% to simulate a rate hike.</p>
      <form onSubmit={applyEvent} className="button-row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label>Percent (e.g. -20 or 10)</label>
          <input type="number" step="1" value={eventPercent} onChange={e => setEventPercent(e.target.value)} style={{ width: 120 }} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>Reason (optional)</label>
          <input value={eventReason} onChange={e => setEventReason(e.target.value)} />
        </div>
        <button className="primary" type="submit" disabled={applyingEvent}>{applyingEvent ? "Applying…" : "Apply Event"}</button>
      </form>

      <div className="modal-title-row" style={{ marginTop: 20, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>All Loans</h2>
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: "", label: "All" }, ...Object.entries(LOAN_STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
        />
      </div>
      <div className="loa-list">
        {loans.map(l => (
          <div className="loa-card" key={l.id}>
            <div className="loa-card-top loa-card-top-stack">
              <NamedHolder discordId={l.discord_id} prefix="borrower" row={l} />
              <span className={`badge ${l.status === "repaid" ? "loa-status-approved" : l.status === "defaulted" ? "loa-status-denied" : "loa-status-pending"}`}>
                {LOAN_STATUS_LABELS[l.status] ?? l.status}
              </span>
            </div>
            <div className="log-card-field">
              {DEBT_LOAN_TYPE_LABELS[l.loan_type] ?? l.loan_type} -- {fmt(l.principal)} borrowed, {fmt(l.amount_owed)} owed, {(l.interest_rate * 100).toFixed(1)}% interest
            </div>
            <div className="log-card-field muted">
              Issued {new Date(l.issued_at).toLocaleString()} -- Due {new Date(l.due_at).toLocaleString()}
            </div>
            {(l.status === "active" || l.status === "defaulted") && (
              <div className="button-row" style={{ marginTop: 8 }}>
                <button className="secondary" type="button" onClick={() => editBalance(l)}>Edit Balance</button>
                <button className="danger" type="button" onClick={() => forgive(l)}>Forgive</button>
              </div>
            )}
          </div>
        ))}
        {loans.length === 0 && <p className="muted">No loans found.</p>}
      </div>
    </>
  );
}

// ==================================================================
// Player Insurance -- oversight of every personal policy/claim, plus
// the ability to approve/deny a claim directly (unrestricted, same
// philosophy as everywhere else here -- normally a claim needs the
// insurer's own permission check, which Super Admin bypasses). Policy
// purchasing/claim submission itself stays entirely player-driven via
// highrock-bot's /insurance -- this panel never creates either.
// ==================================================================
const INSURANCE_TYPE_LABELS = { theft: "Theft", crime: "Crime", gambling: "Gambling", general: "General" };
const CLAIM_STATUS_LABELS = { pending: "Pending", approved: "Approved", denied: "Denied" };

export function InsurancePanel() {
  const [companies, setCompanies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  function load() {
    apiFetch("/super-admin/insurance/companies").then(({ companies }) => { setCompanies(companies); setError(null); }).catch(err => setError(err.message));
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    const qs = params.toString() ? `?${params}` : "";
    apiFetch(`/super-admin/insurance/claims${qs}`).then(({ claims }) => { setClaims(claims); setError(null); }).catch(err => setError(err.message));
  }
  usePolling(load, ADMIN_POLL_MS, [statusFilter, typeFilter]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  async function approve(claim) {
    const input = prompt(`Payout amount (requested ${fmt(claim.requested_payout)}, limit ${fmt(claim.coverage_limit)}). Leave blank to pay the requested amount:`, claim.requested_payout);
    if (input === null) return;
    const payout = input.trim() === "" ? undefined : Number(input);
    try {
      const { claim: updated } = await apiFetch(`/super-admin/insurance/claims/${claim.id}/approve`, { method: "POST", body: { payout } });
      flash(`Claim #${claim.id} approved -- paid ${fmt(updated.approved_payout)}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deny(claim) {
    if (!confirm(`Deny claim #${claim.id} (requesting ${fmt(claim.requested_payout)})?`)) return;
    const reason = prompt("Reason (shown to the claimant, optional):") ?? undefined;
    try {
      await apiFetch(`/super-admin/insurance/claims/${claim.id}/deny`, { method: "POST", body: { reason } });
      flash(`Claim #${claim.id} denied.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}
      {notice && <div className="success-banner">{notice}</div>}

      <h2 style={{ marginTop: 16 }}>Insurance Companies</h2>
      <div className="loa-list">
        {companies.map(c => (
          <div className="loa-card loa-card-row" key={c.id}>
            <NamedHolder discordId={c.owner_discord_id} prefix="owner" row={c} />
            <span className="muted" style={{ marginLeft: 8 }}>{c.name}</span>
            <span className="muted" style={{ marginLeft: "auto" }}>{fmt(c.treasury)} treasury</span>
          </div>
        ))}
        {companies.length === 0 && <p className="muted">No insurance companies founded yet.</p>}
      </div>

      <div className="modal-title-row" style={{ marginTop: 20, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Claims</h2>
        <div className="button-row">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: "", label: "All Statuses" }, ...Object.entries(CLAIM_STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
          />
          <CustomSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={[{ value: "", label: "All Types" }, ...Object.entries(INSURANCE_TYPE_LABELS).map(([value, label]) => ({ value, label }))]}
          />
        </div>
      </div>
      <div className="loa-list">
        {claims.map(c => (
          <div className="loa-card" key={c.id}>
            <div className="loa-card-top loa-card-top-stack">
              <NamedHolder discordId={c.discord_id} prefix="claimant" row={c} />
              <span className={`badge ${c.status === "approved" ? "loa-status-approved" : c.status === "denied" ? "loa-status-denied" : "loa-status-pending"}`}>
                {CLAIM_STATUS_LABELS[c.status] ?? c.status}
              </span>
            </div>
            <div className="log-card-field">
              #{c.id} -- {INSURANCE_TYPE_LABELS[c.policy_type] ?? c.policy_type} -- lost {fmt(c.amount_lost)}, requested {fmt(c.requested_payout)}
              {c.status === "approved" && ` -- paid ${fmt(c.approved_payout)}`}
            </div>
            <div className="log-card-field muted">
              Coverage limit {fmt(c.coverage_limit)}, deductible {fmt(c.deductible)}
              {c.source_table ? ` -- ${c.source_table} #${c.source_id}` : c.description ? ` -- "${c.description}"` : ""}
            </div>
            <div className="log-card-field muted">
              Submitted {new Date(c.created_at).toLocaleString()}
              {c.decided_at ? ` -- decided ${new Date(c.decided_at).toLocaleString()}` : ""}
              {c.status === "denied" && c.decline_reason ? ` -- ${c.decline_reason}` : ""}
            </div>
            {c.status === "pending" && (
              <div className="button-row" style={{ marginTop: 8 }}>
                <button className="primary" type="button" onClick={() => approve(c)}>Approve</button>
                <button className="danger" type="button" onClick={() => deny(c)}>Deny</button>
              </div>
            )}
          </div>
        ))}
        {claims.length === 0 && <p className="muted">No claims found.</p>}
      </div>
    </>
  );
}

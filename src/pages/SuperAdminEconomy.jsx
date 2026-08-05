import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import DiscordAvatar from "../components/DiscordAvatar";
import CustomSelect from "../components/CustomSelect";

const CURRENCY = "$";
const GAMES = ["slots", "roulette", "blackjack"];
const GAME_LABELS = { slots: "Slots", roulette: "Roulette", blackjack: "Blackjack" };

function fmt(n) {
  return `${CURRENCY}${Number(n ?? 0).toLocaleString()}`;
}

function NamedHolder({ discordId, prefix, row }) {
  return (
    <div className="verification-identity-row" style={{ gap: 8 }}>
      <DiscordAvatar discordId={discordId} avatarHash={row[`${prefix}_avatar_hash`]} size={22} />
      <span>{row[`${prefix}_username`] ?? discordId}</span>
    </div>
  );
}

// ==================================================================
// Overview -- read-only snapshot of where all the money in the economy
// currently sits.
// ==================================================================
export function EconomyOverviewPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/super-admin/economy-overview").then(setData).catch(err => setError(err.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <>
      <p className="muted card-subtitle">A snapshot of the entire economy -- refresh the page for the latest numbers.</p>
      <div className="card-grid">
        <div className="stat-tile"><div className="muted">Total Money Supply</div><div className="verification-identity-name">{fmt(data.totalMoneySupply)}</div></div>
        <div className="stat-tile"><div className="muted">In Player Wallets</div><div className="verification-identity-name">{fmt(data.totalWalletBalance)} <span className="muted">({data.walletCount})</span></div></div>
        <div className="stat-tile"><div className="muted">In Savings</div><div className="verification-identity-name">{fmt(data.totalSavings)}</div></div>
        <div className="stat-tile"><div className="muted">In Business Treasuries</div><div className="verification-identity-name">{fmt(data.totalBusinessTreasury)} <span className="muted">({data.businessCount})</span></div></div>
        <div className="stat-tile"><div className="muted">Government Wallet</div><div className="verification-identity-name">{fmt(data.governmentBalance)}</div></div>
        <div className="stat-tile"><div className="muted">Locked in Stock Market</div><div className="verification-identity-name">{fmt(data.stockMarketBalance)}</div></div>
      </div>

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

      <div className="button-row" style={{ marginTop: 16 }}>
        <button className="primary" type="button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Changes"}</button>
      </div>
    </>
  );
}

// ==================================================================
// Businesses -- search, view, and unrestricted edit (including
// ownership override).
// ==================================================================
export function BusinessesPanel() {
  const [query, setQuery] = useState("");
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  function search(e) {
    e?.preventDefault();
    apiFetch(`/super-admin/businesses?q=${encodeURIComponent(query)}`).then(({ businesses }) => setBusinesses(businesses)).catch(err => setError(err.message));
  }
  useEffect(search, []);

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
              <div className="muted">Owner: {b.owner_username ?? b.owner_discord_id}</div>
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
      if (!confirm(`Override ownership from ${business.owner_discord_id} to ${ownerDiscordId}? This cannot be undone from here.`)) return;
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
            <CustomSelect value={type} onChange={setType} options={[{ value: "storefront", label: "Storefront" }, { value: "casino", label: "Casino" }]} />
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

        <label style={{ marginTop: 12 }}>Owner Discord ID</label>
        <input value={ownerDiscordId} onChange={e => setOwnerDiscordId(e.target.value)} />
        {ownerDiscordId !== business.owner_discord_id && (
          <p className="muted field-hint">This will override ownership -- confirmation required on save.</p>
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
            options={casinos.map(c => ({ value: String(c.id), label: `${c.name} (owner: ${c.owner_username ?? c.owner_discord_id})` }))}
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
    apiFetch("/super-admin/lottery").then(setData).catch(err => setError(err.message));
  }
  useEffect(load, []);

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
  const [catalog, setCatalog] = useState({});
  const [storefrontId, setStorefrontId] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/super-admin/storefronts").then(({ storefronts, catalog }) => {
      setStorefronts(storefronts);
      setCatalog(catalog);
      if (storefronts.length > 0) setStorefrontId(String(storefronts[0].id));
    }).catch(err => setError(err.message));
  }, []);

  const storefront = storefronts.find(s => String(s.id) === storefrontId);

  return (
    <>
      <p className="muted card-subtitle">Stock items, set prices, and review sales for any player-owned storefront.</p>
      {error && <div className="error-banner">{error}</div>}
      {storefronts.length === 0 && !error && <p className="muted">No storefronts exist yet.</p>}

      {storefronts.length > 0 && (
        <>
          <label>Storefront</label>
          <CustomSelect
            value={storefrontId}
            onChange={setStorefrontId}
            options={storefronts.map(s => ({ value: String(s.id), label: `${s.name} (owner: ${s.owner_username ?? s.owner_discord_id})` }))}
          />
        </>
      )}

      {storefront && <StorefrontListingsEditor key={storefront.id} storefront={storefront} catalog={catalog} />}
    </>
  );
}

function StorefrontListingsEditor({ storefront, catalog }) {
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [error, setError] = useState(null);

  const [itemKey, setItemKey] = useState(Object.keys(catalog)[0] ?? "");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  function loadAll() {
    apiFetch(`/super-admin/storefronts/${storefront.id}/listings`).then(({ listings }) => setListings(listings));
    apiFetch(`/super-admin/storefronts/${storefront.id}/sales`).then(({ stats, sales }) => { setStats(stats); setSales(sales); });
  }
  useEffect(loadAll, [storefront.id]);

  async function addOrUpdateListing(e) {
    e.preventDefault();
    if (!itemKey || !price) return;
    try {
      const { listings } = await apiFetch(`/super-admin/storefronts/${storefront.id}/listings`, {
        method: "POST",
        body: { itemKey, price: Number(price), stock: stock === "" ? undefined : Number(stock) },
      });
      setListings(listings);
      setPrice(""); setStock("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeListing(key) {
    if (!confirm(`Stop selling ${catalog[key]?.label ?? key} here?`)) return;
    await apiFetch(`/super-admin/storefronts/${storefront.id}/listings/${key}`, { method: "DELETE" });
    setListings(listings.filter(l => l.item_key !== key));
  }

  return (
    <>
      {error && <div className="error-banner">{error}</div>}

      <h2 style={{ marginTop: 16 }}>Listings</h2>
      <form onSubmit={addOrUpdateListing} className="form-row">
        <div>
          <label>Item</label>
          <CustomSelect value={itemKey} onChange={setItemKey} options={Object.entries(catalog).map(([key, item]) => ({ value: key, label: item.label }))} />
        </div>
        <div><label>Price</label><input type="number" required min="1" value={price} onChange={e => setPrice(e.target.value)} /></div>
        <div><label>Stock (blank = unlimited)</label><input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} /></div>
        <div className="form-inline-field-btn"><label aria-hidden="true">&nbsp;</label><button className="secondary" type="submit">Save Listing</button></div>
      </form>

      <div className="loa-list">
        {listings.map(l => (
          <div className="loa-card loa-card-row" key={l.item_key}>
            <span>{catalog[l.item_key]?.label ?? l.item_key}</span>
            <span className="muted">{fmt(l.price)}{l.stock !== null ? ` -- ${l.stock} in stock` : " -- unlimited"}</span>
            <button className="btn-red small" type="button" style={{ marginLeft: "auto" }} onClick={() => removeListing(l.item_key)}>Remove</button>
          </div>
        ))}
        {listings.length === 0 && <p className="muted">Nothing for sale yet.</p>}
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
            <span className="muted">{catalog[s.item_key]?.label ?? s.item_key} x{s.quantity}</span>
            <span className="muted" style={{ marginLeft: "auto" }}>{fmt(s.total_price)}</span>
          </div>
        ))}
        {sales.length === 0 && <p className="muted">No sales yet.</p>}
      </div>
    </>
  );
}

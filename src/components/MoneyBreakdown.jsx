// Fixed categorical order/colors reused from the same gradient set already
// used for changelog cards (see data/changelogColors.js) -- kept in a fixed
// order (never cycled/reassigned) and always paired with a direct label,
// since a couple of these hues sit close together for colorblind viewers.
const SEGMENTS = [
  { key: "wallets", label: "Player Wallets", color: "var(--btn-blue-2)" },
  { key: "savings", label: "Savings", color: "var(--btn-green-2)" },
  { key: "treasury", label: "Business Treasuries", color: "var(--btn-orange-2)" },
  { key: "government", label: "Government", color: "var(--btn-pink-2)" },
  { key: "stockMarket", label: "Stock Market Escrow", color: "var(--text-faint)" },
];

function fmt(n) {
  return `$${Number(n ?? 0).toLocaleString()}`;
}

export default function MoneyBreakdown({ values, total }) {
  if (!total) return <p className="muted">No money in circulation yet.</p>;

  return (
    <div className="money-breakdown">
      <div className="money-breakdown-bar">
        {SEGMENTS.map(seg => {
          const value = values[seg.key] ?? 0;
          const pct = (value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={seg.key}
              className="money-breakdown-segment"
              style={{ width: `${pct}%`, background: seg.color }}
              title={`${seg.label}: ${fmt(value)}`}
            />
          );
        })}
      </div>
      <div className="money-breakdown-legend">
        {SEGMENTS.map(seg => {
          const value = values[seg.key] ?? 0;
          if (value <= 0) return null;
          return (
            <div className="money-breakdown-legend-item" key={seg.key}>
              <span className="money-breakdown-swatch" style={{ background: seg.color }} />
              <span className="money-breakdown-legend-label">{seg.label}</span>
              <span className="money-breakdown-legend-value muted">{fmt(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

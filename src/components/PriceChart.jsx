import { useMemo, useRef, useState } from "react";

const WIDTH = 640;
const HEIGHT = 220;
const PAD_X = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

// Below ~2 days, a date alone ("Aug 7") can't distinguish two points from
// the same day, so short ranges (the new 5-hour default) also show a time.
const SHOW_TIME_BELOW_MS = 2 * 24 * 60 * 60 * 1000;

function formatDate(ts, spanMs) {
  const d = new Date(ts);
  return spanMs < SHOW_TIME_BELOW_MS
    ? d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * A single-series price line chart with a hover crosshair + tooltip. No
 * charting library -- this app has zero UI dependencies by design, and one
 * line series doesn't need one. Line color follows the same gain/loss
 * status convention already used everywhere else in the app (board-value
 * .positive/.negative in Leaderboards.jsx), not an arbitrary categorical hue.
 */
export default function PriceChart({ history }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const points = useMemo(() => {
    if (!history || history.length < 2) return [];
    const minTs = history[0].timestamp;
    const maxTs = history[history.length - 1].timestamp;
    const minPrice = Math.min(...history.map(p => p.price));
    const maxPrice = Math.max(...history.map(p => p.price));
    const priceSpan = maxPrice - minPrice || 1;
    const tsSpan = maxTs - minTs || 1;

    return history.map(p => ({
      x: PAD_X + ((p.timestamp - minTs) / tsSpan) * (WIDTH - PAD_X * 2),
      y: PAD_TOP + (1 - (p.price - minPrice) / priceSpan) * (HEIGHT - PAD_TOP - PAD_BOTTOM),
      price: p.price,
      timestamp: p.timestamp,
    }));
  }, [history]);

  if (points.length < 2) {
    return <div className="price-chart-empty muted">Not enough price history yet.</div>;
  }

  const spanMs = points[points.length - 1].timestamp - points[0].timestamp;
  const rising = points[points.length - 1].price >= points[0].price;
  const lineColor = rising ? "var(--success)" : "var(--danger)";
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} L${points[0].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} Z`;

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  function handleMove(e) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div className="price-chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="price-chart-svg"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#priceFill)" stroke="none" />
        <path d={path} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {hovered && (
          <>
            <line x1={hovered.x} y1={PAD_TOP} x2={hovered.x} y2={HEIGHT - PAD_BOTTOM} stroke="var(--border-default)" strokeWidth="1" />
            <circle cx={hovered.x} cy={hovered.y} r="4" fill={lineColor} stroke="var(--card-bg)" strokeWidth="2" />
          </>
        )}
      </svg>

      <div className="price-chart-axis">
        <span>{formatDate(points[0].timestamp, spanMs)}</span>
        <span>{formatDate(points[points.length - 1].timestamp, spanMs)}</span>
      </div>

      {hovered && (
        <div
          className="price-chart-tooltip"
          style={{ left: `${(hovered.x / WIDTH) * 100}%` }}
        >
          <div className="price-chart-tooltip-price">${hovered.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          <div className="price-chart-tooltip-date">{formatDate(hovered.timestamp, spanMs)}</div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useRef, useState } from "react";

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

/**
 * A single-series price line chart -- no legend (one series, the title
 * already says what it is), a crosshair that snaps to the nearest point,
 * and a tooltip with price + timestamp. Color reflects the period's
 * performance (gain/loss), the standard finance-chart convention for
 * this specific case: green up, red down, accent if flat/no history.
 */
export default function StockPriceChart({ history, height = HEIGHT }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const points = useMemo(() => (history ?? []).map(h => ({ price: h.price, recordedAt: h.recorded_at })), [history]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (points.length === 0) return { minPrice: 0, maxPrice: 1 };
    const prices = points.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? { minPrice: min * 0.95, maxPrice: max * 1.05 || 1 } : { minPrice: min, maxPrice: max };
  }, [points]);

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const xAt = i => PAD.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * innerW);
  const yAt = price => PAD.top + innerH - ((price - minPrice) / (maxPrice - minPrice || 1)) * innerH;

  const netChange = points.length >= 2 ? points[points.length - 1].price - points[0].price : 0;
  const color = netChange > 0 ? "var(--success)" : netChange < 0 ? "var(--danger)" : "var(--accent)";

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.price)}`).join(" ");
  const areaPath = points.length > 0
    ? `${linePath} L ${xAt(points.length - 1)} ${PAD.top + innerH} L ${xAt(0)} ${PAD.top + innerH} Z`
    : "";

  const gridLines = 4;
  const gridPrices = Array.from({ length: gridLines + 1 }, (_, i) => minPrice + ((maxPrice - minPrice) * i) / gridLines);

  function handleMove(e) {
    if (points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((_, i) => {
      const dist = Math.abs(xAt(i) - svgX);
      if (dist < nearestDist) { nearestDist = dist; nearest = i; }
    });
    setHoverIndex(nearest);
  }

  if (points.length === 0) {
    return <p className="muted">No price history yet.</p>;
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const tooltipLeft = hovered ? (xAt(hoverIndex) / WIDTH) * 100 : 0;
  const tooltipAlignRight = tooltipLeft > 65;

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${height}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {gridPrices.map((price, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yAt(price)} y2={yAt(price)} stroke="var(--border-subtle)" strokeWidth="1" />
            <text x={PAD.left - 8} y={yAt(price)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="var(--text-faint)">
              ${price.toFixed(price < 10 ? 2 : 0)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={color} opacity="0.1" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {hoverIndex !== null && (
          <>
            <line x1={xAt(hoverIndex)} x2={xAt(hoverIndex)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--border-default)" strokeWidth="1" />
            <circle cx={xAt(hoverIndex)} cy={yAt(hovered.price)} r="4" fill={color} stroke="var(--surface-sunken)" strokeWidth="2" />
          </>
        )}

        <circle cx={xAt(points.length - 1)} cy={yAt(points[points.length - 1].price)} r="4" fill={color} stroke="var(--surface-sunken)" strokeWidth="2" />
        <text x={xAt(points.length - 1) - 6} y={yAt(points[points.length - 1].price) - 10} textAnchor="end" fontSize="12" fontWeight="650" fill="var(--text-primary)">
          ${points[points.length - 1].price.toFixed(2)}
        </text>
      </svg>

      {hovered && (
        <div
          className="stock-chart-tooltip"
          style={{ left: `${tooltipLeft}%`, ...(tooltipAlignRight ? { transform: "translateX(-100%)" } : {}) }}
        >
          <div className="stock-chart-tooltip-price">${hovered.price.toFixed(2)}</div>
          <div className="stock-chart-tooltip-time muted">{new Date(hovered.recordedAt).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

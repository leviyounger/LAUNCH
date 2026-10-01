'use client';

import { useId, useState } from 'react';

export type Point = { label: string; value: number | null };

const LINE = '#0A6E6A';
const FILL = '#25F4EE';
const GRID = '#D2D2D7';
const AXIS = '#86868B';
const INK = '#1D1D1F';

function money(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

/**
 * One measure, one axis. GMV over 7 days and GMV over 28 days live on different
 * scales, so each gets its own panel rather than sharing a y-axis.
 */
export default function LineChart({ title, points }: { title: string; points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId().replace(/:/g, '');

  const real = points.filter((p) => p.value !== null) as { label: string; value: number }[];

  if (real.length === 0) {
    return (
      <figure>
        <figcaption className="chart-title">{title}</figcaption>
        <p className="empty">Nothing submitted yet.</p>
      </figure>
    );
  }

  const W = 640;
  const H = 180;
  const padL = 8;
  const padR = 64;
  const padT = 22;
  const padB = 28;

  const max = Math.max(...real.map((p) => p.value), 1);
  const n = points.length;
  const x = (i: number) => (n === 1 ? padL : padL + (i * (W - padL - padR)) / (n - 1));
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

  const drawn = points
    .map((p, i) => ({ ...p, i, cx: x(i), cy: p.value === null ? null : y(p.value) }))
    .filter((c) => c.cy !== null) as { label: string; value: number; i: number; cx: number; cy: number }[];

  const line = drawn.map((c, k) => `${k === 0 ? 'M' : 'L'}${c.cx.toFixed(1)},${c.cy.toFixed(1)}`).join(' ');
  const base = H - padB;
  const area = `${line} L${drawn[drawn.length - 1].cx.toFixed(1)},${base} L${drawn[0].cx.toFixed(1)},${base} Z`;
  const band = (W - padL - padR) / Math.max(n - 1, 1) || 60;
  const last = drawn[drawn.length - 1];
  const active = hover === null ? null : drawn.find((c) => c.i === hover) || null;

  const ticks = [0, max / 2, max];

  return (
    <figure>
      <figcaption className="chart-title">{title}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`${title}. ${drawn.map((d) => `${d.label}: ${money(d.value)}`).join('. ')}`}
        style={{ display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={FILL} stopOpacity="0.20" />
            <stop offset="100%" stopColor={FILL} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, k) => (
          <g key={k}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
            <text x={W - padR + 10} y={y(t) + 4} fill={AXIS} fontSize="12" fontFamily="inherit">
              {money(t)}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradId})`} stroke="none" />
        <path d={line} fill="none" stroke={LINE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {drawn.map((c) => (
          <circle
            key={c.i}
            cx={c.cx}
            cy={c.cy}
            r={active && active.i === c.i ? 5 : 3.5}
            fill="#FFFFFF"
            stroke={LINE}
            strokeWidth="2"
          />
        ))}

        {points.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={x(i) - band / 2}
            y={0}
            width={band}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {active && <line x1={active.cx} x2={active.cx} y1={padT - 8} y2={base} stroke={GRID} strokeWidth="1" />}

        {last && !active && (
          <text x={last.cx - 9} y={last.cy - 13} fill={INK} fontSize="13" fontWeight="600" textAnchor="end" fontFamily="inherit">
            {money(last.value)}
          </text>
        )}

        {drawn.map((c, k) =>
          k === 0 || k === drawn.length - 1 || drawn.length <= 4 ? (
            <text
              key={`lab-${c.i}`}
              x={c.cx}
              y={H - 8}
              fill={AXIS}
              fontSize="12"
              textAnchor={k === 0 ? 'start' : k === drawn.length - 1 ? 'end' : 'middle'}
              fontFamily="inherit"
            >
              {c.label}
            </text>
          ) : null
        )}
      </svg>

      <p className="tipline">
        {active ? (
          <>
            <strong>{money(active.value)}</strong> &nbsp;week ending {active.label}
          </>
        ) : (
          <>Hover any week to read its number.</>
        )}
      </p>
    </figure>
  );
}

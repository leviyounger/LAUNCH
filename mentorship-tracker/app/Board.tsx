'use client';

import type { BoardRow } from './api/board/route';

export const count = (v: number | null | undefined) =>
  v === null || v === undefined ? '--' : Math.round(v).toLocaleString('en-US');

export const money = (v: number | null | undefined) =>
  v === null || v === undefined ? '--' : '$' + Math.round(v).toLocaleString('en-US');

export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

/** Week over week change on 28 day orders, as one compact chip. */
export function Delta({ d }: { d: number | null }) {
  if (d === null) return <span className="chip flat">First week</span>;
  if (Math.abs(d) < 0.005) return <span className="chip flat">0%</span>;
  const pct = Math.round(Math.abs(d) * 100);
  return d > 0 ? (
    <span className="chip up">{'↑'} {pct}%</span>
  ) : (
    <span className="chip down">{'↓'} {pct}%</span>
  );
}

/** Read only standings for members. Orders only, never dollars. */
export default function Board({ rows, myHandle }: { rows: BoardRow[]; myHandle: string }) {
  if (rows.length === 0) {
    return <div className="board glass"><p className="empty">Nobody has submitted yet. You are first.</p></div>;
  }
  const max = Math.max(1, rows[0].orders28 || 0);
  return (
    <div className="board glass">
      {rows.map((r, i) => {
        const you = r.handle === myHandle;
        return (
          <div key={r.handle} className={'lb' + (i === 0 ? ' first' : '') + (i < 3 ? ' top' : '') + (you ? ' you' : '')}>
            <span className="rk">{i + 1}</span>
            <span className="who">
              <span className="h">
                {r.name}
                <span className="hd">@{r.handle}</span>
                {you && <span className="youtag">You</span>}
              </span>
              <span className="track">
                <span className="fill" style={{ width: `${Math.max(2, ((r.orders28 || 0) / max) * 100).toFixed(1)}%` }} />
              </span>
            </span>
            <Delta d={r.delta} />
            <span className="g">
              {count(r.orders28)}
              <small>orders</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}

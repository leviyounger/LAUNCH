'use client';

import type { BoardRow } from './api/board/route';

export const money = (v: number | null) => (v === null || v === undefined ? '--' : '$' + Math.round(v).toLocaleString('en-US'));

export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

/** Week over week change on the 28 day number, as one compact chip. */
export function Delta({ d }: { d: number | null }) {
  if (d === null) return <span className="chip flat">First week</span>;
  if (Math.abs(d) < 0.005) return <span className="chip flat">0%</span>;
  const pct = Math.round(Math.abs(d) * 100);
  return d > 0 ? (
    <span className="chip up">{'\u2191'} {pct}%</span>
  ) : (
    <span className="chip down">{'\u2193'} {pct}%</span>
  );
}

export function TileBody({ row, rank, isYou }: { row: BoardRow; rank: number; isYou: boolean }) {
  return (
    <>
      <span className="gloss" />
      <span className="edge" />
      <span className="rim" />
      <span className="prism" />
      {rank === 1 && <span className="crown" />}
      <span className="rank">{rank}</span>
      <span className="in">
        <span className="nm">
          {row.name}
          {isYou && <span className="youtag">You</span>}
        </span>
        <span className="hd">@{row.handle}</span>
        <span className="big">{money(row.gmv28)}</span>
        <span className="mt">28 day GMV</span>
        <Delta d={row.delta} />
      </span>
    </>
  );
}

/** Read only standings. Mentees see this; nothing here is clickable. */
export default function Board({ rows, myHandle }: { rows: BoardRow[]; myHandle: string }) {
  if (rows.length === 0) {
    return <p className="empty">Nobody has submitted yet. You are first.</p>;
  }
  return (
    <div className="tiles">
      {rows.map((r, i) => (
        <div
          key={r.handle}
          className={'tile' + (i === 0 ? ' top1' : '') + (r.handle === myHandle ? ' you' : '')}
        >
          <TileBody row={r} rank={i + 1} isYou={r.handle === myHandle} />
        </div>
      ))}
    </div>
  );
}

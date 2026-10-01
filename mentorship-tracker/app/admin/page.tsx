'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import LineChart from './chart';

type Row = {
  id: number;
  handle: string;
  display_name: string;
  week_ending: string;
  gmv_7: string | number | null;
  gmv_28: string | number | null;
  samples_sent: number | null;
  gmv_max_spend: string | number | null;
  videos_posted: number | null;
  lives_count: number | null;
  created_at: string;
};

type Member = {
  handle: string;
  name: string;
  rows: Row[];
  latest: Row;
  delta: number | null;
};

const num = (v: string | number | null) => (v === null || v === '' ? null : Number(v));
const money = (v: number | null) => (v === null ? '--' : '$' + Math.round(v).toLocaleString('en-US'));
const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

function Delta({ d }: { d: number | null }) {
  if (d === null) return <span className="chip flat">First week</span>;
  if (Math.abs(d) < 0.005) return <span className="chip flat">0%</span>;
  const pct = Math.round(Math.abs(d) * 100);
  return d > 0 ? (
    <span className="chip up">{'\u2191'} {pct}%</span>
  ) : (
    <span className="chip down">{'\u2193'} {pct}%</span>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data', { cache: 'no-store' });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const data = await res.json();
      setRows(data.rows || []);
      setAuthed(true);
    } catch {
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setLoginError(d.error || 'Wrong PIN.');
      return;
    }
    setPassword('');
    load();
  }

  const members: Member[] = useMemo(() => {
    const byHandle = new Map<string, Row[]>();
    for (const r of rows) {
      const list = byHandle.get(r.handle) || [];
      list.push(r);
      byHandle.set(r.handle, list);
    }
    const out: Member[] = [];
    for (const [handle, list] of byHandle) {
      const sorted = [...list].sort((a, b) => a.week_ending.localeCompare(b.week_ending));
      const latest = sorted[sorted.length - 1];
      const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
      const a = num(latest.gmv_28);
      const b = prev ? num(prev.gmv_28) : null;
      const delta = a !== null && b !== null && b > 0 ? (a - b) / b : null;
      out.push({ handle, name: latest.display_name, rows: sorted, latest, delta });
    }
    return out.sort((a, b) => (num(b.latest.gmv_28) || 0) - (num(a.latest.gmv_28) || 0));
  }, [rows]);

  const totalGmv = useMemo(
    () => members.reduce((sum, m) => sum + (num(m.latest.gmv_28) || 0), 0),
    [members]
  );

  if (authed === null) {
    return (
      <main className="shell narrow">
        <p className="empty">Loading.</p>
      </main>
    );
  }

  if (authed === false) {
    return (
      <main className="shell narrow">
        <span className="logo" role="img" aria-label="Launch Academy" />
        <h1>Dashboard</h1>
        <form className="panel pad stack" style={{ marginTop: 30 }} onSubmit={login}>
          <div className="field">
            <label htmlFor="pw">PIN</label>
            <input
              id="pw"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="primary" type="submit">Unlock</button>
          {loginError && <p className="err">{loginError}</p>}
        </form>
        <p className="foot">Launch Academy &nbsp;·&nbsp; Private</p>
      </main>
    );
  }

  const member = open ? members.find((m) => m.handle === open) : null;

  if (member) {
    const weeks = member.rows.map((r) => ({ label: shortDate(r.week_ending), v7: num(r.gmv_7), v28: num(r.gmv_28) }));

    return (
      <main className="shell">
        <button className="quiet" onClick={() => setOpen(null)}>&larr; All members</button>

        <span className="logo sm" role="img" aria-label="Launch Academy" style={{ marginTop: 26 }} />
        <p className="kicker" style={{ marginTop: 14 }}>@{member.handle}</p>
        <h1 style={{ fontSize: 'clamp(30px,5vw,46px)' }}>{member.name}</h1>

        <div className="stats" style={{ marginTop: 28 }}>
          <div className="stat"><div className="k">GMV 7 day</div><div className="v">{money(num(member.latest.gmv_7))}</div></div>
          <div className="stat"><div className="k">GMV 28 day</div><div className="v">{money(num(member.latest.gmv_28))}</div></div>
          <div className="stat"><div className="k">GMV Max spend</div><div className="v">{money(num(member.latest.gmv_max_spend))}</div></div>
          <div className="stat"><div className="k">Samples</div><div className="v">{member.latest.samples_sent ?? '--'}</div></div>
          <div className="stat"><div className="k">Videos</div><div className="v">{member.latest.videos_posted ?? '--'}</div></div>
          <div className="stat"><div className="k">Lives</div><div className="v">{member.latest.lives_count ?? '--'}</div></div>
          <div className="stat"><div className="k">Weeks in</div><div className="v">{member.rows.length}</div></div>
          <div className="stat"><div className="k">Last submitted</div><div className="v" style={{ fontSize: 20 }}>{shortDate(member.latest.week_ending)}</div></div>
        </div>

        <div className="panel pad" style={{ marginTop: 22 }}>
          <LineChart title="GMV, last 7 days" points={weeks.map((w) => ({ label: w.label, value: w.v7 }))} />
          <div style={{ height: 30 }} />
          <LineChart title="GMV, last 28 days" points={weeks.map((w) => ({ label: w.label, value: w.v28 }))} />
        </div>

        <p className="foot">Launch Academy &nbsp;·&nbsp; Private</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="logo-row"><span className="logo" role="img" aria-label="Launch Academy" /><p className="kicker">Mentor view</p></div>
      <h1>The board</h1>

      <div className="stats" style={{ maxWidth: 760, marginTop: 30 }}>
        <div className="stat"><div className="k">Members</div><div className="v">{members.length}</div></div>
        <div className="stat"><div className="k">Combined 28 day GMV</div><div className="v">{money(totalGmv)}</div></div>
        <div className="stat"><div className="k">Submissions</div><div className="v">{rows.length}</div></div>
      </div>

      <h2 style={{ marginTop: 52 }}>Standings</h2>
      <p className="sm" style={{ margin: '8px 0 22px' }}>
        {loading ? 'Refreshing.' : 'Click anyone to open their full history.'}
      </p>

      {members.length === 0 && <p className="empty">No submissions yet. Send the link out and they will show up here.</p>}

      <div className="tiles">
        {members.map((m, i) => (
          <button
            className={'tile' + (i === 0 ? ' top1' : '')}
            key={m.handle}
            onClick={() => setOpen(m.handle)}
          >
            <span className="gloss" />
            <span className="edge" />
            <span className="rim" />
            <span className="prism" />
            {i === 0 && <span className="crown" />}
            <span className="rank">{i + 1}</span>
            <span className="in">
              <span className="nm">{m.name}</span>
              <span className="hd">@{m.handle}</span>
              <span className="big">{money(num(m.latest.gmv_28))}</span>
              <span className="mt">28 day GMV</span>
              <Delta d={m.delta} />
            </span>
          </button>
        ))}
      </div>

      <p className="foot">Launch Academy &nbsp;·&nbsp; Private</p>
    </main>
  );
}

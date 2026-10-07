'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import LineChart from './chart';
import { Delta, count, money, shortDate } from '../Board';

type Row = {
  id: number;
  handle: string;
  display_name: string;
  program: string | null;
  orders_28: number | null;
  week_ending: string;
  gmv_7: string | number | null;
  gmv_28: string | number | null;
  samples_sent: number | null;
  gmv_max_spend: string | number | null;
  videos_posted: number | null;
  lives_count: number | null;
  created_at: string;
};

type Program = 'accelerator' | 'academy';

type Member = {
  handle: string;
  name: string;
  program: Program;
  rows: Row[];
  latest: Row;
  delta: number | null;
};

const num = (v: string | number | null) => (v === null || v === '' ? null : Number(v));
const LABEL: Record<Program, string> = { accelerator: 'Accelerator', academy: 'Academy' };

function Header({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="top">
      <div className="brand">
        <span className="wordmark">MENTOR VIEW</span>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}

function Foot() {
  return (
    <footer className="foot">
      <span>Mentorship Tracker</span>
      <span>Private. Only you can open this page.</span>
    </footer>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Program>('all');
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
      const a = latest.orders_28;
      const b = prev ? prev.orders_28 : null;
      const delta = a !== null && b !== null && b > 0 ? (a - b) / b : null;
      const program: Program = latest.program === 'academy' ? 'academy' : 'accelerator';
      out.push({ handle, name: latest.display_name, program, rows: sorted, latest, delta });
    }
    return out.sort((a, b) => (b.latest.orders_28 || 0) - (a.latest.orders_28 || 0));
  }, [rows]);

  const shown = useMemo(() => (filter === 'all' ? members : members.filter((m) => m.program === filter)), [members, filter]);
  const totalOrders = shown.reduce((s, m) => s + (m.latest.orders_28 || 0), 0);
  const totalGmv = shown.reduce((s, m) => s + (num(m.latest.gmv_28) || 0), 0);
  const inProgram = (p: Program) => members.filter((m) => m.program === p).length;

  if (authed === null) {
    return (
      <main className="wrap narrow">
        <p className="empty">Loading.</p>
      </main>
    );
  }

  if (authed === false) {
    return (
      <main className="wrap narrow">
        <Header title="Dashboard" />
        <form className="panel glass" onSubmit={login}>
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
        <Foot />
      </main>
    );
  }

  const member = open ? members.find((m) => m.handle === open) : null;

  if (member) {
    const L = member.latest;
    const pts = (pick: (r: Row) => number | null) => member.rows.map((r) => ({ label: shortDate(r.week_ending), value: pick(r) }));

    return (
      <main className="wrap">
        <div><button className="quiet glass" onClick={() => setOpen(null)}>&larr; All members</button></div>
        <header className="top">
          <div className="brand">
            <span className="wordmark">@{member.handle.toUpperCase()} &nbsp;&middot;&nbsp; {LABEL[member.program].toUpperCase()}</span>
            <h1>{member.name}</h1>
          </div>
        </header>

        <section className="stats">
          <div className="stat glass dark"><span className="k">Orders, 28 days</span><span className="v">{count(L.orders_28)}</span></div>
          <div className="stat glass"><span className="k">GMV, 28 days</span><span className="v">{money(num(L.gmv_28))}</span></div>
          <div className="stat glass"><span className="k">GMV, 7 days</span><span className="v">{money(num(L.gmv_7))}</span></div>
          <div className="stat glass"><span className="k">GMV Max spend</span><span className="v">{money(num(L.gmv_max_spend))}</span></div>
          <div className="stat glass"><span className="k">Samples</span><span className="v">{count(L.samples_sent)}</span></div>
          <div className="stat glass"><span className="k">Videos</span><span className="v">{count(L.videos_posted)}</span></div>
          <div className="stat glass"><span className="k">Lives</span><span className="v">{count(L.lives_count)}</span></div>
          <div className="stat glass"><span className="k">Weeks in</span><span className="v">{member.rows.length}</span></div>
          <div className="stat glass"><span className="k">Last submitted</span><span className="v">{shortDate(L.week_ending)}</span></div>
        </section>

        <section className="charts glass">
          <LineChart title="Orders, last 28 days" kind="count" points={pts((r) => r.orders_28)} />
          <LineChart title="GMV, last 28 days" points={pts((r) => num(r.gmv_28))} />
          <LineChart title="GMV, last 7 days" points={pts((r) => num(r.gmv_7))} />
        </section>

        <Foot />
      </main>
    );
  }

  return (
    <main className="wrap">
      <Header title="The Board" action={<button className="quiet glass" onClick={load}>{loading ? 'Refreshing' : 'Refresh'}</button>} />

      <section className="totals">
        <div className="glass hero"><span className="eyebrow">GMV, 28 days, combined</span><b>{money(totalGmv)}</b></div>
        <div className="glass"><span className="eyebrow">Orders, 28 days, combined</span><b>{count(totalOrders)}</b></div>
        <div className="glass"><span className="eyebrow">Members</span><b>{shown.length}</b></div>
        <div className="glass"><span className="eyebrow">Accelerator / Academy</span><b>{inProgram('accelerator')} / {inProgram('academy')}</b></div>
      </section>

      <section aria-labelledby="stH">
        <div className="sec-head">
          <h2 id="stH">Standings</h2>
          <div className="controls">
            <span className="eyebrow">Click anyone for their history</span>
            <div className="seg glass" role="group" aria-label="Filter by program">
              {(['all', 'accelerator', 'academy'] as const).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : LABEL[f]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="board glass">
          {shown.length === 0 && <p className="empty">No submissions yet. Send the link out and they will show up here.</p>}
          {shown.map((m, i) => {
            const max = Math.max(1, shown[0].latest.orders_28 || 0);
            return (
              <button
                type="button"
                key={m.handle}
                className={'lb' + (i === 0 ? ' first' : '') + (i < 3 ? ' top' : '')}
                onClick={() => setOpen(m.handle)}
              >
                <span className="rk">{i + 1}</span>
                <span className="who">
                  <span className="h">
                    {m.name}
                    <span className="hd">@{m.handle}</span>
                    <span className="tag" style={{ marginLeft: 8 }}>{LABEL[m.program]}</span>
                  </span>
                  <span className="track">
                    <span className="fill" style={{ width: `${Math.max(2, ((m.latest.orders_28 || 0) / max) * 100).toFixed(1)}%` }} />
                  </span>
                </span>
                <Delta d={m.delta} />
                <span className="g">
                  {count(m.latest.orders_28)}
                  <small>{money(num(m.latest.gmv_28))} GMV</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <Foot />
    </main>
  );
}

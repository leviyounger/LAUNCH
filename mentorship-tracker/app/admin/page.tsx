'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Delta, count, money, shortDate } from '../Board';
import type { Submission } from '@/lib/store';

type Program = 'accelerator' | 'academy';

type Member = {
  handle: string;
  name: string;
  program: Program;
  rows: Submission[];
  latest: Submission;
  delta: number | null;
};

const LABEL: Record<Program, string> = { accelerator: 'Accelerator', academy: 'Academy' };

function stamp(iso: string) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function Foot() {
  return (
    <footer className="foot">
      <span>Mentorship Tracker</span>
      <span>Mentor view. Only you can open this page.</span>
      <span>Members only ever see orders. Dollars stay here.</span>
    </footer>
  );
}

function Bars({ rows, pick, fmt }: { rows: Submission[]; pick: (r: Submission) => number | null; fmt: (v: number | null) => string }) {
  const recent = rows.slice(-8);
  const max = Math.max(1, ...recent.map((r) => pick(r) || 0));
  if (!recent.length) return <p className="note">Nothing submitted yet.</p>;
  return (
    <div className="bars">
      {recent.map((r) => {
        const v = pick(r);
        return (
          <div className="bar" key={r.week_ending}>
            <span className="lbl">{shortDate(r.week_ending)}</span>
            <span className="track"><span className="fill" style={{ width: `${(((v || 0) / max) * 100).toFixed(1)}%` }} /></span>
            <span className="val">{fmt(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [rows, setRows] = useState<Submission[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Program>('all');
  const [sort, setSort] = useState<'orders' | 'gmv'>('orders');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const detailRef = useRef<HTMLElement>(null);

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
    const byHandle = new Map<string, Submission[]>();
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
      out.push({
        handle,
        name: latest.display_name,
        program: latest.program === 'academy' ? 'academy' : 'accelerator',
        rows: sorted,
        latest,
        delta: a !== null && b !== null && b > 0 ? (a - b) / b : null,
      });
    }
    return out.sort((x, y) => (y.latest.orders_28 || 0) - (x.latest.orders_28 || 0));
  }, [rows]);

  const scoped = useMemo(() => (filter === 'all' ? members : members.filter((m) => m.program === filter)), [members, filter]);
  const rankOf = (h: string) => scoped.findIndex((m) => m.handle === h) + 1;
  const tiles = useMemo(() => {
    let list = sort === 'orders' ? scoped : [...scoped].sort((a, b) => (b.latest.gmv_28 || 0) - (a.latest.gmv_28 || 0));
    if (q) list = list.filter((m) => (m.handle + ' ' + m.name).toLowerCase().includes(q));
    return list;
  }, [scoped, sort, q]);

  const lastSync = rows.reduce((s, r) => (r.created_at > s ? r.created_at : s), '');
  const totalOrders = scoped.reduce((s, m) => s + (m.latest.orders_28 || 0), 0);
  const totalGmv = scoped.reduce((s, m) => s + (m.latest.gmv_28 || 0), 0);
  const open = openId ? members.find((m) => m.handle === openId) || null : null;

  function choose(h: string | null, scroll: boolean) {
    setOpenId(h);
    if (h && scroll) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }), 0);
    }
  }

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
        <header className="top">
          <div className="brand">
            <span className="wordmark">TIKTOK MENTORSHIP</span>
            <h1>Mentor View</h1>
          </div>
        </header>
        <form className="panel glass" onSubmit={login}>
          <div className="field">
            <label htmlFor="pw">PIN</label>
            <input id="pw" type="password" inputMode="numeric" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="primary" type="submit">Unlock</button>
          {loginError && <p className="err">{loginError}</p>}
        </form>
        <Foot />
      </main>
    );
  }

  const top = scoped.slice(0, 10);
  const max = Math.max(1, top[0]?.latest.orders_28 || 0);

  return (
    <main className="wrap">
      <header className="top">
        <div className="brand">
          <span className="wordmark">TIKTOK MENTORSHIP</span>
          <h1>Mentor View</h1>
        </div>
        <div className="sync">
          <span className={'pill glass' + (lastSync ? '' : ' wait')}>{lastSync ? 'Updated ' + stamp(lastSync) : 'Waiting on submissions'}</span>
          <button className="quiet glass" onClick={load}>{loading ? 'Refreshing' : 'Refresh'}</button>
        </div>
      </header>

      <section className="totals" aria-label="Last 28 days">
        <div className="glass hero"><span className="eyebrow">GMV, 28 days, combined</span><b>{money(totalGmv)}</b></div>
        <div className="glass"><span className="eyebrow">Orders, 28 days</span><b>{count(totalOrders)}</b></div>
        <div className="glass"><span className="eyebrow">Members</span><b>{scoped.length}</b></div>
        <div className="glass"><span className="eyebrow">Accelerator / Academy</span><b>{members.filter((m) => m.program === 'accelerator').length} / {members.filter((m) => m.program === 'academy').length}</b></div>
      </section>

      <section aria-labelledby="lbH">
        <div className="sec-head">
          <h2 id="lbH">Leaderboard</h2>
          <div className="controls">
            <span className="eyebrow">Ranked by 28 day orders</span>
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
          {!top.length && <p className="empty">No submissions yet. Send the link out and members show up here.</p>}
          {top.map((m, i) => (
            <button type="button" key={m.handle} className={'lb' + (i === 0 ? ' first' : '') + (i < 3 ? ' top' : '')} onClick={() => choose(m.handle, true)}>
              <span className="rk">{i + 1}</span>
              <span className="who">
                <span className="h">
                  {m.name}
                  <span className="hd">@{m.handle}</span>
                  <span className="tag" style={{ marginLeft: 8 }}>{LABEL[m.program]}</span>
                </span>
                <span className="track"><span className="fill" style={{ width: `${Math.max(2, ((m.latest.orders_28 || 0) / max) * 100).toFixed(1)}%` }} /></span>
              </span>
              <Delta d={m.delta} />
              <span className="g">
                {count(m.latest.orders_28)}
                <small>{money(m.latest.gmv_28)} GMV</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {open && (
        <section className="detail glass" ref={detailRef} aria-live="polite">
          <div className="dh">
            <div>
              <h3>#{rankOf(open.handle) || '--'} &nbsp;{open.name}</h3>
              <div className="meta">@{open.handle} &nbsp;&middot;&nbsp; {LABEL[open.program]} &nbsp;&middot;&nbsp; {open.rows.length} {open.rows.length === 1 ? 'week' : 'weeks'} in</div>
            </div>
            <button type="button" onClick={() => choose(null, false)}>Close</button>
          </div>
          <div className="pane">
            <div className="kv">
              <div className="stat2 main"><span className="eyebrow">Orders, 28 days</span><b>{count(open.latest.orders_28)}</b></div>
              <div className="stat2 main"><span className="eyebrow">GMV, 28 days</span><b>{money(open.latest.gmv_28)}</b></div>
              <div className="stat2"><span className="eyebrow">GMV, 7 days</span><b>{money(open.latest.gmv_7)}</b></div>
              <div className="stat2"><span className="eyebrow">GMV Max spend</span><b>{money(open.latest.gmv_max_spend)}</b></div>
              <div className="stat2"><span className="eyebrow">Samples sent</span><b>{count(open.latest.samples_sent)}</b></div>
              <div className="stat2"><span className="eyebrow">Videos</span><b>{count(open.latest.videos_posted)}</b></div>
              <div className="stat2"><span className="eyebrow">Lives</span><b>{count(open.latest.lives_count)}</b></div>
              <div className="stat2"><span className="eyebrow">Last submitted</span><b>{shortDate(open.latest.week_ending)}</b></div>
            </div>
          </div>
          <div className="pane">
            <span className="eyebrow">Orders, last 28 days, by week</span>
            <Bars rows={open.rows} pick={(r) => r.orders_28} fmt={count} />
            <span className="eyebrow" style={{ marginTop: 8 }}>GMV, last 28 days, by week</span>
            <Bars rows={open.rows} pick={(r) => r.gmv_28} fmt={money} />
          </div>
        </section>
      )}

      <section aria-labelledby="mH">
        <div className="sec-head">
          <h2 id="mH">Members</h2>
          <div className="controls">
            <input id="q" className="glass" type="search" placeholder="Find a member" aria-label="Find a member" value={q} onChange={(e) => setQ(e.target.value.trim().toLowerCase().replace(/^@/, ''))} />
            <div className="seg glass" role="group" aria-label="Sort tiles">
              <button type="button" aria-pressed={sort === 'orders'} onClick={() => setSort('orders')}>Orders</button>
              <button type="button" aria-pressed={sort === 'gmv'} onClick={() => setSort('gmv')}>GMV</button>
            </div>
          </div>
        </div>
        <div className="tiles">
          {!tiles.length && <div className="empty glass">{q ? 'No member matches that search.' : 'Nobody here yet.'}</div>}
          {tiles.map((m) => (
            <button
              type="button"
              key={m.handle}
              className={'tile glass' + (m.handle === openId ? ' open' : '')}
              onClick={() => choose(m.handle === openId ? null : m.handle, true)}
              aria-label={`${m.name}, ${count(m.latest.orders_28)} orders, ${money(m.latest.gmv_28)} GMV`}
            >
              <span className="top">
                <span className="nm">{m.name}</span>
                <span className="rank">#{rankOf(m.handle)}</span>
              </span>
              <span className="big">{sort === 'orders' ? count(m.latest.orders_28) : money(m.latest.gmv_28)}<small>{sort === 'orders' ? 'orders' : 'GMV'}</small></span>
              <span className="sub">
                <span>{sort === 'orders' ? money(m.latest.gmv_28) + ' GMV' : count(m.latest.orders_28) + ' orders'}</span>
                <span className="tag">{LABEL[m.program]}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <Foot />
    </main>
  );
}

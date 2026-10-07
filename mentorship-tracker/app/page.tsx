'use client';

import { useCallback, useEffect, useState } from 'react';
import Board, { count } from './Board';
import type { BoardRow } from './api/board/route';

const K_CODE = 'la_code';
const K_HANDLE = 'la_handle';
const K_NAME = 'la_name';
const K_WEEK = 'la_week';

/** The Sunday that ends the current week. */
function weekEnding() {
  const d = new Date();
  const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  u.setUTCDate(u.getUTCDate() + ((7 - u.getUTCDay()) % 7));
  return u.toISOString().slice(0, 10);
}

function read(k: string) {
  try {
    return localStorage.getItem(k) || '';
  } catch {
    return '';
  }
}
function write(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}
function forget(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

function Header({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="top">
      <div className="brand">
        <span className="wordmark">TIKTOK MENTORSHIP</span>
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
      <span>Mentored by Levi Younger</span>
    </footer>
  );
}

const EMPTY = { displayName: '', handle: '', orders28: '', gmv7: '', gmv28: '', samples: '', spend: '', videos: '', lives: '' };

export default function Home() {
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [codeError, setCodeError] = useState('');

  const [myHandle, setMyHandle] = useState('');
  const [submittedWeek, setSubmittedWeek] = useState('');
  const [view, setView] = useState<'form' | 'board'>('form');

  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const c = read(K_CODE);
    const h = read(K_HANDLE);
    const w = read(K_WEEK);
    if (c) {
      setCode(c);
      setUnlocked(true);
    }
    setMyHandle(h);
    setSubmittedWeek(w);
    setForm((f) => ({ ...f, displayName: read(K_NAME), handle: h ? '@' + h : '' }));
    setView(w === weekEnding() ? 'board' : 'form');
    setReady(true);
  }, []);

  const loadBoard = useCallback(async (theCode: string) => {
    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: theCode }),
      });
      if (res.status === 401) {
        forget(K_CODE);
        setUnlocked(false);
        setCodeError('That code is not right. Check it with Levi.');
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setRows(data.rows || []);
    } catch {
      /* leave the board as it is */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (unlocked && view === 'board') loadBoard(code);
  }, [unlocked, view, code, loadBoard]);

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setCodeError('Enter the code you were given.');
      return;
    }
    setCodeError('');
    write(K_CODE, code.trim());
    setUnlocked(true);
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.displayName.trim() || !form.handle.trim()) {
      setError('Name and TikTok handle are both required.');
      return;
    }
    if (!form.orders28.trim()) {
      setError('Add your orders for the last 28 days. Use 0 if you have none yet.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          setUnlocked(false);
          forget(K_CODE);
          setCodeError('That code is not right. Check it with Levi.');
        } else {
          setError(data.error || 'Something went wrong. Try again.');
        }
        return;
      }

      const h = form.handle.trim().replace(/^@+/, '').toLowerCase();
      const w = weekEnding();
      write(K_HANDLE, h);
      write(K_NAME, form.displayName.trim());
      write(K_WEEK, w);
      setMyHandle(h);
      setSubmittedWeek(w);
      setView('board');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  if (!ready) return <main className="wrap narrow" />;

  if (!unlocked) {
    return (
      <main className="wrap narrow">
        <Header title="Mentorship Tracker" />
        <p className="lead">Enter the access code Levi gave you. You only have to do this once on this device.</p>
        <form className="panel glass" onSubmit={unlock}>
          <div className="field">
            <label htmlFor="code">Access code</label>
            <input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Type it here" autoComplete="off" autoCapitalize="none" />
          </div>
          <button className="primary" type="submit">Continue</button>
          {codeError && <p className="err">{codeError}</p>}
        </form>
        <Foot />
      </main>
    );
  }

  if (view === 'board') {
    const myRank = rows.findIndex((r) => r.handle === myHandle) + 1;
    const total = rows.reduce((s, r) => s + (r.orders28 || 0), 0);

    return (
      <main className="wrap">
        <Header
          title="The Board"
          action={<button className="quiet glass" onClick={() => setView('form')}>Update my numbers</button>}
        />

        <section className="totals" aria-label="This week">
          <div className="glass hero"><span className="eyebrow">Your rank</span><b>{myRank ? `#${myRank} of ${rows.length}` : '--'}</b></div>
          <div className="glass"><span className="eyebrow">Orders, 28 days, everyone</span><b>{count(total)}</b></div>
          <div className="glass"><span className="eyebrow">On the board</span><b>{rows.length}</b></div>
          <div className="glass"><span className="eyebrow">Top seller</span><b>{rows[0] ? '@' + rows[0].handle : '--'}</b></div>
        </section>

        <section aria-labelledby="lbH">
          <div className="sec-head">
            <h2 id="lbH">Leaderboard</h2>
            <span className="eyebrow">Ranked by orders, last 28 days</span>
          </div>
          {loaded ? <Board rows={rows} myHandle={myHandle} /> : <div className="board glass"><p className="empty">Loading the board.</p></div>}
        </section>

        <Foot />
      </main>
    );
  }

  return (
    <main className="wrap narrow">
      <Header
        title="This Week"
        action={
          submittedWeek === weekEnding() ? (
            <button className="quiet glass" onClick={() => setView('board')}>Leaderboard</button>
          ) : undefined
        }
      />
      <p className="lead">Put your numbers in and the board opens up. Everyone sees orders only. Your dollar numbers go to Levi and nobody else.</p>

      <form className="panel glass" onSubmit={submit}>
        <div className="group">
          <div className="row2">
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" value={form.displayName} onChange={set('displayName')} placeholder="First and last" autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="handle">TikTok handle</label>
              <input id="handle" value={form.handle} onChange={set('handle')} placeholder="@yourshop" autoComplete="off" autoCapitalize="none" />
            </div>
          </div>
        </div>

        <div className="group">
          <div className="field feature">
            <label htmlFor="orders28">
              Orders, last 28 days
              <span className="sub">Seller Center home page. Set the date to Last 28 days and copy the Orders number. This is what shows on the board.</span>
            </label>
            <input id="orders28" value={form.orders28} onChange={set('orders28')} placeholder="0" inputMode="numeric" />
          </div>
        </div>

        <div className="group">
          <span className="eyebrow">Only Levi sees these</span>
          <div className="row2">
            <div className="field">
              <label htmlFor="gmv7">GMV, last 7 days<span className="sub">Dollars, numbers only</span></label>
              <input id="gmv7" value={form.gmv7} onChange={set('gmv7')} placeholder="0" inputMode="decimal" />
            </div>
            <div className="field">
              <label htmlFor="gmv28">GMV, last 28 days<span className="sub">Dollars, numbers only</span></label>
              <input id="gmv28" value={form.gmv28} onChange={set('gmv28')} placeholder="0" inputMode="decimal" />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="samples">Samples sent<span className="sub">Products sent to creators</span></label>
              <input id="samples" value={form.samples} onChange={set('samples')} placeholder="0" inputMode="numeric" />
            </div>
            <div className="field">
              <label htmlFor="spend">GMV Max spend<span className="sub">Dollars spent this week</span></label>
              <input id="spend" value={form.spend} onChange={set('spend')} placeholder="0" inputMode="decimal" />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="videos">Videos you published<span className="sub">Your own, not affiliates</span></label>
              <input id="videos" value={form.videos} onChange={set('videos')} placeholder="0" inputMode="numeric" />
            </div>
            <div className="field">
              <label htmlFor="lives">TikTok lives<span className="sub">How many times you went live</span></label>
              <input id="lives" value={form.lives} onChange={set('lives')} placeholder="0" inputMode="numeric" />
            </div>
          </div>
        </div>

        <button className="primary" type="submit" disabled={sending}>
          {sending ? 'Sending' : 'Submit and see the board'}
        </button>
        {error && <p className="err">{error}</p>}
      </form>

      <Foot />
    </main>
  );
}

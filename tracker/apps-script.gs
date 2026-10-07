/**
 * Mentorship Tracker, backend.
 *
 * Lives on the Mentorship Tracker Google Sheet (Extensions, Apps Script) and is
 * deployed as a Web app: Execute as Me, Who has access Anyone. The tracker page
 * posts to it, and every submission lands as a row in the first tab.
 *
 * Members only ever get orders back. Dollar figures leave the sheet only for the
 * admin view, and only with the PIN.
 */

// Change any of these whenever you like, then Deploy, Manage deployments, Edit, New version.
const ACADEMY_CODE = 'SET_IN_APPS_SCRIPT';
const ACCELERATOR_CODE = 'SET_IN_APPS_SCRIPT';
const ADMIN_PIN = 'SET_IN_APPS_SCRIPT';

const HEADERS = [
  'week_ending', 'handle', 'display_name', 'program', 'orders_28',
  'gmv_7', 'gmv_28', 'samples_sent', 'gmv_max_spend', 'videos_posted',
  'lives_count', 'created_at',
];
const TEXT = { week_ending: 1, handle: 1, display_name: 1, program: 1, created_at: 1 };

/* ---------------- entry points ---------------- */

function doGet() {
  return json_({ ok: true, service: 'Mentorship Tracker' });
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ error: 'Bad request.' });
  }
  try {
    if (body.action === 'board') return json_(board_(body));
    if (body.action === 'submit') return json_(submit_(body));
    if (body.action === 'admin') return json_(admin_(body));
    return json_({ error: 'Unknown action.' });
  } catch (err) {
    return json_({ error: 'Something went wrong. Try again in a moment.' });
  }
}

/* ---------------- actions ---------------- */

function programFor_(code) {
  const c = String(code || '').trim().toLowerCase();
  if (!c) return null;
  if (c === String(ACCELERATOR_CODE).toLowerCase()) return 'accelerator';
  if (c === String(ACADEMY_CODE).toLowerCase()) return 'academy';
  return null;
}

function board_(body) {
  const program = programFor_(body.code);
  if (!program) return { error: 'wrong_code' };

  const rows = rows_().filter(function (r) { return (r.program || 'accelerator') === program; });
  const byHandle = {};
  let updated = '';
  rows.forEach(function (r) {
    (byHandle[r.handle] = byHandle[r.handle] || []).push(r);
    if (r.created_at > updated) updated = r.created_at;
  });

  const out = Object.keys(byHandle).map(function (h) {
    const list = byHandle[h].sort(function (a, b) { return a.week_ending < b.week_ending ? -1 : 1; });
    const latest = list[list.length - 1];
    const prev = list.length > 1 ? list[list.length - 2] : null;
    const a = latest.orders_28;
    const b = prev ? prev.orders_28 : null;
    return {
      handle: h,
      name: latest.display_name,
      week: latest.week_ending,
      orders28: a,
      delta: a !== null && b !== null && b > 0 ? (a - b) / b : null,
    };
  });
  out.sort(function (x, y) { return (y.orders28 || 0) - (x.orders28 || 0); });
  return { program: program, rows: out, updated: updated || null };
}

function submit_(body) {
  const program = programFor_(body.code);
  if (!program) return { error: 'wrong_code' };

  const name = String(body.displayName || '').trim().slice(0, 120);
  const handle = String(body.handle || '').trim().replace(/^@+/, '').toLowerCase().slice(0, 80);
  if (!name || !handle) return { error: 'Name and TikTok handle are both required.' };
  const orders = count_(body.orders28);
  if (orders === null) return { error: 'Add your orders for the last 28 days. Use 0 if you have none yet.' };

  const row = {
    week_ending: weekEnding_(new Date()),
    handle: handle,
    display_name: name,
    program: program,
    orders_28: orders,
    gmv_7: money_(body.gmv7),
    gmv_28: money_(body.gmv28),
    samples_sent: count_(body.samples),
    gmv_max_spend: money_(body.spend),
    videos_posted: count_(body.videos),
    lives_count: count_(body.lives),
    created_at: new Date().toISOString(),
  };

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = tab_();
    const values = sh.getDataRange().getValues();
    const line = HEADERS.map(function (h) {
      const v = row[h];
      if (v === null || v === undefined || v === '') return '';
      return TEXT[h] ? "'" + String(v) : v; // apostrophe keeps Sheets from reformatting text
    });
    let at = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][1]) === handle && day_(values[i][0]) === row.week_ending) { at = i + 1; break; }
    }
    if (at > 0) sh.getRange(at, 1, 1, HEADERS.length).setValues([line]);
    else sh.appendRow(line);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, program: program, week: row.week_ending };
}

function admin_(body) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('pin_fails') || 0);
  if (fails >= 10) return { error: 'Too many wrong PINs. Try again in 15 minutes.' };
  if (String(body.pin || '') !== String(ADMIN_PIN)) {
    cache.put('pin_fails', String(fails + 1), 900);
    return { error: 'wrong_pin' };
  }
  return { rows: rows_() };
}

/* ---------------- sheet helpers ---------------- */

function tab_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function rows_() {
  const values = tab_().getDataRange().getValues();
  return values.slice(1).map(function (v) {
    const o = {};
    HEADERS.forEach(function (h, j) {
      const x = v[j];
      if (x === '' || x === null || x === undefined) o[h] = null;
      else if (TEXT[h]) o[h] = x instanceof Date ? iso_(x) : String(x);
      else o[h] = Number(x);
    });
    o.week_ending = day_(v[0]);
    o.program = o.program ? String(o.program).toLowerCase() : null;
    return o;
  }).filter(function (o) { return o.handle && o.week_ending; });
}

/* ---------------- small utilities ---------------- */

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function iso_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
}
function day_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v || '').slice(0, 10);
}
/** The Sunday that ends the current week, as YYYY-MM-DD. */
function weekEnding_(d) {
  const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  u.setUTCDate(u.getUTCDate() + ((7 - u.getUTCDay()) % 7));
  return u.toISOString().slice(0, 10);
}
function money_(v) {
  const s = String(v === undefined || v === null ? '' : v).replace(/[$,\s]/g, '');
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}
function count_(v) {
  const s = String(v === undefined || v === null ? '' : v).replace(/[,\s]/g, '');
  if (!s) return null;
  const n = parseInt(s, 10);
  return isFinite(n) && n >= 0 ? n : null;
}

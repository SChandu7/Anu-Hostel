/* ============================================================
   ANU Hostel Management System — app.js
   Screens, state and the 3D hostel viewer.
   Base data is generated (data.js); only changes are persisted,
   so localStorage stays small and the demo reloads instantly.
   ============================================================ */

/* ---------- state ---------- */

const KEY = 'anu.hms.v2';

const Disk = (() => {
  let ok = true;
  try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); } catch (e) { ok = false; }
  let mem = null;
  return {
    persistent: ok,
    read() { if (!ok) return mem; try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    write(d) { mem = d; if (!ok) return; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { ok = false; toast('Storage full — changes stay in this tab only.', 'bad'); } },
    clear() { mem = null; if (ok) { try { localStorage.removeItem(KEY); } catch (e) {} } }
  };
})();

const State = {
  base: null,
  saved: null,
  cache: null,

  boot() {
    this.base = buildDataset();
    this.saved = Disk.read() || { overrides: {}, added: [], promotions: 0, maintenance: null, session: null, draft: null };
    if (!this.saved.overrides) this.saved = { overrides: {}, added: [], promotions: 0, maintenance: null, session: null, draft: null };
    this.cache = null;
  },
  save() { this.cache = null; Disk.write(this.saved); },
  reset() { Disk.clear(); this.boot(); },

  /* promotion is applied on read so a year rollover costs no storage */
  promote(rec) {
    const shift = this.saved.promotions - (rec.pv || 0);
    if (!shift) return rec;
    const idx = YEARS.indexOf(rec.academic.year);
    if (idx < 0) return rec;
    const next = idx + shift;
    const s = JSON.parse(JSON.stringify(rec));
    if (next > 3) {
      s.academic.year = 'Passed out';
      s.alumni = true;
      s.room = null;
      s.validTill = null;
      return s;
    }
    s.academic.year = YEARS[next];
    s.validYear = s.academic.year;
    if (s.validTill) {
      const endY = new Date(s.validTill).getUTCFullYear() + shift;
      s.validTill = new Date(Date.UTC(endY, 3, 30, 23, 59)).toISOString();
    }
    if (s.room) s.room.block = BLOCK_OF_YEAR[s.academic.year];
    return s;
  },

  apps() {
    if (this.cache) return this.cache;
    const o = this.saved.overrides;
    const list = this.base.students.map(s => o[s.id] || s)
      .concat(this.saved.added.map(s => o[s.id] || s))
      .map(s => this.promote(s));
    this.cache = list;
    return list;
  },

  app(id) { return this.apps().find(a => a.id === id); },

  put(rec) {
    rec.pv = this.saved.promotions;
    this.saved.overrides[rec.id] = rec;
    this.save();
  },
  add(rec) {
    rec.pv = this.saved.promotions;
    this.saved.added.unshift(rec);
    this.save();
  },
  maintenanceSet() {
    return new Set(this.saved.maintenance || this.base.maintenance);
  },

  session() { return this.saved.session; },
  signIn(u) { this.saved.session = u; this.save(); },
  signOut() { this.saved.session = null; this.save(); },
  draft() { return this.saved.draft; },
  setDraft(d) { this.saved.draft = d; this.save(); },
  clearDraft() { this.saved.draft = null; this.save(); }
};

/* ---------- accounts ---------- */

const ROLES = { student: 'Student', warden: 'Warden', hod: 'Head of Department', principal: 'Principal', cw: 'Chief Warden', admin: 'Administrator' };

const USERS = [
  { email: 'warden.boys@anu.ac.in', pass: 'demo123', role: 'warden', name: 'K. Srinivasa Rao', dept: null },
  { email: 'hod.cse@anu.ac.in', pass: 'demo123', role: 'hod', name: 'Dr. P. Lakshmi Devi', dept: 'CSE' },
  { email: 'principal@anu.ac.in', pass: 'demo123', role: 'principal', name: 'Dr. M. Venkateswara Rao', dept: null },
  { email: 'chiefwarden@anu.ac.in', pass: 'demo123', role: 'cw', name: 'Dr. B. Ananda Kumar', dept: null },
  { email: 'admin@anu.ac.in', pass: 'demo123', role: 'admin', name: 'Hostel Office', dept: null },
  { email: 'rahul.k@student.anu.ac.in', pass: 'demo123', role: 'student', name: 'Rahul Kancherla', dept: null }
];

const SIGNATURES = {
  hod: 'M4 30 C 16 6, 26 40, 38 18 S 58 4, 70 26 C 78 40, 88 16, 104 22 L 118 20',
  principal: 'M4 26 C 14 8, 22 36, 34 20 C 44 8, 50 34, 62 22 S 84 8, 96 28 C 102 38, 112 18, 122 24',
  cw: 'M6 28 C 14 10, 24 34, 36 16 C 46 2, 54 32, 66 24 S 88 12, 98 30 L 116 18'
};

/* ---------- tiny helpers ---------- */

/* Drop the university logo in as logo.png next to index.html and it is used
   everywhere automatically; without the file the lettermark shows instead. */
const SEAL = `<span class="seal"><img class="seal__img" src="logo.png" alt="Acharya Nagarjuna University" onload="this.closest('.seal').classList.add('seal--has')" onerror="this.closest('.seal').classList.add('seal--text')"><span class="seal__txt">ANU</span></span>`;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function inr(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
function initials(n) { return String(n || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }
function fileSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'; }

function dt(iso, withTime = true) {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return withTime ? date + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : date;
}

function approvalCount(a) { return ['hod', 'principal', 'cw'].filter(k => a.approvals[k]).length; }

function cardValid(a) {
  if (!a.validTill) return false;
  return new Date(a.validTill).getTime() >= Date.now();
}
/* Base session ends 30 Apr 2027. Each academic year a student advances into
   pushes the end date one year on, so a promotion always extends validity. */
const SESSION_END_YEAR = 2027;
function validTillFor(year, promotions) {
  const p = (typeof promotions === 'number') ? promotions : (State.saved ? State.saved.promotions : 0);
  return new Date(Date.UTC(SESSION_END_YEAR + p, 3, 30, 23, 59)).toISOString();
}

function statusInfo(a) {
  const n = approvalCount(a);
  if (a.alumni) return { text: 'Passed out', cls: 'plain', bucket: 'alumni' };
  if (a.status === 'REJECTED') return { text: 'Sent back', cls: 'rejected', bucket: 'rejected' };
  if (a.status === 'PENDING') return { text: 'Pending with warden', cls: 'pending', bucket: 'pending' };
  if (n === 0) return { text: 'Awaiting signatures', cls: 'active', bucket: 'active' };
  if (n === 3) return { text: 'Approved 3 of 3', cls: 'final', bucket: 'approved' };
  return { text: `Signed ${n} of 3`, cls: 'success', bucket: 'active' };
}

function pill(a) { const s = statusInfo(a); return `<span class="pill pill--${s.cls}">${esc(s.text)}</span>`; }

function avatar(a, cls = '') {
  const color = a.avatarColor || '#14509B';
  return a.photo
    ? `<span class="av ${cls}"><img src="${esc(a.photo)}" alt="${esc(a.student.name)}" loading="lazy" onerror="this.parentNode.textContent='${esc(initials(a.student.name))}'" /></span>`
    : `<span class="av ${cls}" style="background:${color}">${esc(initials(a.student.name))}</span>`;
}

function personCell(a) {
  return `<div class="person">${avatar(a, 'av--sm')}<div style="min-width:0">
    <div class="person__n">${esc(a.student.name)}</div>
    <div class="person__s mono">${esc(a.rollNo || a.id)}</div>
  </div></div>`;
}

function roomLabel(a) { return a.room ? `Block ${a.room.block} · ${a.room.roomNo}` : '—'; }
function qrMatrix(text, size = 25) {
  /* deterministic pseudo-QR: stable per string, with finder squares.
     Good enough to scan visually in the demo; the real build encodes a URL. */
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
  const m = Array.from({ length: size }, () => Array(size).fill(0));
  const finder = (ox, oy) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    const edge = x === 0 || x === 6 || y === 0 || y === 6;
    const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
    m[oy + y][ox + x] = edge || core ? 1 : 0; } };
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const inF = (x < 8 && y < 8) || (x > size - 9 && y < 8) || (x < 8 && y > size - 9);
    if (!inF) m[y][x] = rnd() < 0.46 ? 1 : 0;
  }
  return m;
}

function qrSvg(text, px = 132) {
  const m = qrMatrix(text), n = m.length, c = px / n;
  let r = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) r += `<rect x="${(x * c).toFixed(2)}" y="${(y * c).toFixed(2)}" width="${c.toFixed(2)}" height="${c.toFixed(2)}"/>`;
  return `<svg viewBox="0 0 ${px} ${px}" width="${px}" height="${px}" role="img" aria-label="Hostel ID QR code" style="background:#fff;border-radius:8px">
    <g fill="#0D1526">${r}</g></svg>`;
}

function sigSvg(role) { return `<svg viewBox="0 0 126 42" aria-hidden="true"><path d="${SIGNATURES[role]}" stroke="#14509B" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`; }

function toast(msg, kind = '') {
  const box = $('#toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' toast--' + kind : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

function openModal({ title, sub, body, actions = [], wide = false }) {
  const stale = $('#modalRoot');
  const root = stale.cloneNode(false);
  stale.replaceWith(root);
  root.innerHTML = `
    <div class="modal-backdrop" data-close="1">
      <div class="modal ${wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal__head">
          <div><h3>${esc(title)}</h3>${sub ? `<p>${sub}</p>` : ''}</div>
          <button class="xbtn" data-close="1" aria-label="Close">×</button>
        </div>
        <div class="modal__body">${body}</div>
        ${actions.length ? `<div class="modal__foot">${actions.map((a, i) => `<button class="btn ${a.cls || 'btn--ghost'}" data-act="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}
      </div>
    </div>`;
  root.onclick = e => {
    if (e.target.dataset.close) return closeModal();
    const b = e.target.closest('[data-act]');
    if (b) actions[+b.dataset.act].run(closeModal);
  };
  document.addEventListener('keydown', escClose);
}
function escClose(e) { if (e.key === 'Escape') closeModal(); }
function closeModal() { $('#modalRoot').innerHTML = ''; document.removeEventListener('keydown', escClose); }

function showErr(id, msg) {
  const el = document.querySelector(`[data-err="${id}"]`);
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  const i = document.getElementById(id);
  if (i) i.classList.add('is-bad');
}

/* ---------- shell ---------- */

const ICONS = {
  home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10.5 12 3l9 7.5V21H3z"/></svg>',
  inbox: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 13h5l2 3h4l2-3h5"/><path d="M3 13 5 5h14l2 8v6H3z"/></svg>',
  users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 11a3 3 0 1 0 0-6"/><path d="M18 20c0-2.6-1-4.3-2.5-5.2"/></svg>',
  building: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21V5l8-2v18M12 21V9l8 2v10M3 21h18"/><path d="M7 8h1M7 12h1M7 16h1M16 14h1M16 18h1"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m4 12.5 5 5L20 6.5"/></svg>',
  chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  id: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5 16.5c.8-1.5 2-2.2 3.5-2.2s2.7.7 3.5 2.2M15 10h4M15 14h4"/></svg>',
  doc: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>'
};

function navFor(role) {
  const apps = State.apps();
  const pending = apps.filter(a => a.status === 'PENDING').length;
  const mine = k => apps.filter(a => (a.status === 'ACTIVE' || a.status === 'SUCCESS') && !a.approvals[k] && !a.alumni).length;

  if (role === 'warden') return [
    { hash: '#/warden', label: 'Verification queue', icon: 'inbox', count: pending },
    { hash: '#/warden/applications', label: 'All applications', icon: 'doc' },
    { hash: '#/warden/hostel', label: 'Hostel &amp; rooms', icon: 'building' },
    { hash: '#/warden/students', label: 'Residents', icon: 'users' },
    { hash: '#/scan', label: 'Gate scanner', icon: 'id' }
  ];
  if (role === 'hod' || role === 'principal' || role === 'cw') return [
    { hash: '#/authority', label: 'Awaiting signature', icon: 'check', count: mine(role) },
    { hash: '#/authority/signed', label: 'Signed by me', icon: 'doc' },
    { hash: '#/authority/hostel', label: 'Hostel occupancy', icon: 'building' }
  ];
  if (role === 'admin') return [
    { hash: '#/admin', label: 'Overview', icon: 'chart' },
    { hash: '#/admin/applications', label: 'Applications', icon: 'doc' },
    { hash: '#/admin/students', label: 'Student directory', icon: 'users' },
    { hash: '#/admin/hostel', label: 'Hostel &amp; rooms', icon: 'building' },
    { hash: '#/scan', label: 'Gate scanner', icon: 'id' }
  ];
  return [
    { hash: '#/student', label: 'My application', icon: 'home' },
    { hash: '#/student/room', label: 'My room', icon: 'building' },
    { hash: '#/student/id', label: 'Hostel ID card', icon: 'id' }
  ];
}

/* renders sidebar + topbar + content; returns the content node */
function shell({ title, sub, actions = '', body }) {
  const s = State.session();
  const nav = navFor(s.role);
  const here = location.hash || '#/';

  $('#app').innerHTML = `
    <div class="shell">
      <aside class="side" id="sideNav">
        <button class="side__brand" data-go="#/">
          ${SEAL}
          <span>
            <span class="brand__name">Hostel MS</span>
            <span class="brand__sub">${esc(SESSION_LABEL)} · Boys hostel</span>
          </span>
        </button>
        <div class="side__label">${esc(ROLES[s.role])}</div>
        ${nav.map(n => `<button class="navitem ${here === n.hash ? 'is-on' : ''}" data-go="${n.hash}">
          <span class="navitem__ic">${ICONS[n.icon]}</span>${n.label}
          ${n.count ? `<span class="navitem__count">${n.count}</span>` : ''}
        </button>`).join('')}
        <div class="side__foot">
          <div class="sideuser">
            <span class="av" style="background:var(--blue-800)">${esc(initials(s.name))}</span>
            <span><span class="sideuser__n">${esc(s.name)}</span><span class="sideuser__r">${esc(ROLES[s.role])}</span></span>
          </div>
          <button class="btn btn--ghost btn--sm btn--wide" id="signOutBtn">Sign out</button>
        </div>
      </aside>

      <div class="main">
        <div class="topbar noprint">
          <button class="btn btn--ghost btn--sm menubtn" id="menuBtn" aria-label="Menu">☰</button>
          <div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
          <span class="topbar__spacer"></span>
          ${actions}
        </div>
        <div class="content" id="content">${body}</div>
      </div>
    </div>`;

  $('#signOutBtn').onclick = () => { State.signOut(); go('#/'); toast('Signed out.'); };
  const mb = $('#menuBtn');
  if (mb) mb.onclick = () => $('#sideNav').classList.toggle('is-open');
  window.scrollTo(0, 0);
  return $('#content');
}

function publicPage(html) {
  $('#app').innerHTML = $('#tpl-topnav').innerHTML + html;
  window.scrollTo(0, 0);
}

function requireRole(roles) {
  const s = State.session();
  if (s && roles.includes(s.role)) return s;
  publicPage(`<section class="screen authpage"><div class="authcard" style="text-align:center">
    <h2>Sign in to continue</h2>
    <p>This area is for ${roles.map(r => ROLES[r]).join(', ')} accounts.</p>
    <button class="btn btn--primary btn--wide" data-go="#/login">Go to sign in</button>
  </div></section>`);
  return null;
}

/* ---------- router ---------- */

const ROUTES = {
  '#/': renderLanding,
  '#/login': renderLogin,
  '#/apply': renderApply,
  '#/scan': renderScanner,
  '#/student': renderStudent,
  '#/student/room': () => renderHostelPage('student'),
  '#/student/id': renderStudentId,
  '#/warden': renderWardenQueue,
  '#/warden/applications': renderWardenApplications,
  '#/warden/hostel': () => renderHostelPage('warden'),
  '#/warden/students': () => renderDirectory('warden'),
  '#/authority': () => renderAuthority(false),
  '#/authority/signed': () => renderAuthority(true),
  '#/authority/hostel': () => renderHostelPage('authority'),
  '#/admin': renderAdminOverview,
  '#/admin/applications': renderAdminApplications,
  '#/admin/students': () => renderDirectory('admin'),
  '#/admin/hostel': () => renderHostelPage('admin')
};

function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

function route() {
  closeModal();
  destroyCharts();
  disposeScene();
  const fn = ROUTES[(location.hash || '#/').split('?')[0]] || renderLanding;
  fn();
}

function homeFor(role) {
  return { student: '#/student', warden: '#/warden', hod: '#/authority', principal: '#/authority', cw: '#/authority', admin: '#/admin' }[role] || '#/';
}

/* ---------- landing + login ---------- */

function renderLanding() {
  publicPage($('#tpl-landing').innerHTML);
  const apps = State.apps();
  const residents = apps.filter(a => a.room).length;
  const stats = [
    [TOTAL_BEDS.toLocaleString('en-IN'), 'Beds across 4 blocks'],
    [residents.toLocaleString('en-IN'), 'Students in residence'],
    [(TOTAL_BEDS - residents).toLocaleString('en-IN'), 'Beds available now'],
    [inr(FEE), 'Hostel fee per year']
  ];
  $('#heroStats').innerHTML = stats.map(([b, s]) => `<div class="hero__stat"><b>${b}</b><span>${s}</span></div>`).join('');
}

function renderLogin() {
  publicPage($('#tpl-login').innerHTML);

  const demo = [['Student', 'rahul.k@student.anu.ac.in'], ['Warden', 'warden.boys@anu.ac.in'], ['HOD', 'hod.cse@anu.ac.in'],
    ['Principal', 'principal@anu.ac.in'], ['Chief Warden', 'chiefwarden@anu.ac.in'], ['Admin', 'admin@anu.ac.in']];

  $('#roleChips').innerHTML = demo.map(([l, e]) => `<button class="chip" data-email="${e}">${l}</button>`).join('');
  $('#roleChips').onclick = e => {
    const b = e.target.closest('[data-email]');
    if (!b) return;
    $$('.chip').forEach(c => c.classList.remove('is-on'));
    b.classList.add('is-on');
    $('#loginEmail').value = b.dataset.email;
    $('#loginPass').value = 'demo123';
  };

  const submit = () => {
    const email = $('#loginEmail').value.trim().toLowerCase();
    const pass = $('#loginPass').value;
    let user = USERS.find(u => u.email === email && u.pass === pass);
    if (!user && pass === 'demo123') {
      const owned = State.apps().find(a => a.student.email.toLowerCase() === email);
      if (owned) user = { email, role: 'student', name: owned.student.name, dept: null };
    }
    if (!user) {
      const err = $('#loginErr');
      err.textContent = 'That email and password do not match an account. Demo accounts use the password demo123.';
      err.classList.remove('hidden');
      return;
    }
    State.signIn({ email: user.email, role: user.role, name: user.name, dept: user.dept });
    toast(`Signed in as ${ROLES[user.role]}.`, 'ok');
    go(homeFor(user.role));
  };

  $('#loginBtn').onclick = submit;
  $('#loginPass').onkeydown = e => { if (e.key === 'Enter') submit(); };
}

/* ============================================================
   QR scanner — public gate verification
   ============================================================ */

let SCAN = null;

function stopScanner() {
  if (SCAN && SCAN.stream) { SCAN.stream.getTracks().forEach(t => t.stop()); }
  if (SCAN && SCAN.raf) cancelAnimationFrame(SCAN.raf);
  SCAN = null;
}

function renderScanner() {
  stopScanner();
  publicPage(`
    <div class="scanpage"><div class="wrap" style="max-width:960px;padding:26px 0 60px">
      <div class="scanhead">
        <div><h1>Gate verification</h1><p class="muted">Scan a resident's hostel ID QR to confirm the card is valid for this session.</p></div>
        <button class="btn btn--ghost btn--sm" data-go="#/">Home</button>
      </div>

      <div class="scangrid">
        <div class="card"><div class="card__body">
          <div class="scanview" id="scanView">
            <video id="scanVid" playsinline muted></video>
            <div class="scanview__frame"></div>
            <div class="scanview__off" id="scanOff">
              <p>Camera is off</p>
              <button class="btn btn--blue btn--sm" id="startCam">Start camera</button>
            </div>
          </div>
          <p class="field__hint" style="margin-top:10px">Camera needs permission. If it will not start, enter a hostel ID by hand below — the demo verifies the same way.</p>
          <div style="display:flex;gap:8px;margin-top:10px">
            <input class="input" id="manualId" placeholder="Enter hostel ID e.g. 26CS7896" style="text-transform:uppercase" />
            <button class="btn btn--blue" id="manualBtn">Verify</button>
          </div>
          <div class="scandemo">
            <span>Demo codes:</span>
            ${DEMO_SCAN_IDS.map(id => `<button class="chip" data-demo="${id}">${id}</button>`).join('')}
          </div>
        </div></div>

        <div id="scanResult"><div class="card"><div class="card__body scanidle">
          <div class="scanidle__ic">▣</div>
          <h3>Waiting for a scan</h3>
          <p class="muted">Point the camera at a card's QR, or enter an ID. A valid card shows the student's photo and details.</p>
        </div></div></div>
      </div>
    </div></div>`);

  const verify = raw => {
    const id = String(raw || '').trim().toUpperCase();
    const a = State.apps().find(x => x.hostelId === id);
    showScanResult(id, a);
  };

  $('#manualBtn').onclick = () => verify($('#manualId').value);
  $('#manualId').onkeydown = e => { if (e.key === 'Enter') verify($('#manualId').value); };
  document.querySelectorAll('[data-demo]').forEach(b => b.onclick = () => { $('#manualId').value = b.dataset.demo; verify(b.dataset.demo); });
  $('#startCam').onclick = startCamera;
}

function startCamera() {
  const vid = $('#scanVid'), off = $('#scanOff');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('This browser cannot open the camera. Use manual entry.', 'bad');
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      SCAN = { stream };
      vid.srcObject = stream;
      vid.play();
      off.classList.add('hidden');
      $('#scanView').classList.add('is-live');
      toast('Camera on. Hold a QR in the frame, or use a demo code.', 'ok');
      /* Note: decoding a live QR needs a decoder library. In this demo the
         camera provides the gate-scanning experience; matching is done from
         the demo codes / manual entry so it works offline with no extra deps. */
    })
    .catch(() => toast('Camera permission denied. Use manual entry or a demo code.', 'bad'));
}

function showScanResult(id, a) {
  const box = $('#scanResult');
  if (!id) return;

  if (!a) {
    box.innerHTML = `<div class="card scanbad"><div class="card__body" style="text-align:center">
      <div class="scanverdict scanverdict--bad">✕</div>
      <h3>No match</h3>
      <p class="muted">No card with hostel ID <b class="mono">${esc(id)}</b>. Do not admit.</p>
    </div></div>`;
    toast('No match — do not admit.', 'bad');
    return;
  }

  const valid = cardValid(a);
  /* log the scan */
  const rec = JSON.parse(JSON.stringify(a));
  rec.scans = rec.scans || [];
  rec.scans.unshift({ at: new Date().toISOString(), point: 'Main gate', result: valid ? 'valid' : 'expired' });
  State.put(rec);

  box.innerHTML = `
    <div class="card ${valid ? 'scanok' : 'scanbad'}"><div class="card__body">
      <div style="text-align:center;margin-bottom:14px">
        <div class="scanverdict ${valid ? 'scanverdict--ok' : 'scanverdict--bad'}">${valid ? '✓' : '⌛'}</div>
        <h3>${valid ? 'Valid card · admit' : 'Expired card · do not admit'}</h3>
        <p class="muted" style="margin:2px 0 0">Hostel ID <b class="mono">${esc(a.hostelId)}</b>${valid ? '' : ' · needs promotion for the new year'}</p>
      </div>
      <div style="max-width:420px;margin:0 auto">${idCard(a)}</div>
      <div class="sectionlbl" style="margin-top:18px">Recent gate scans</div>
      <div class="tl">${rec.scans.slice(0, 5).map(sc => `<div class="tlitem is-${sc.result === 'valid' ? 'done' : 'bad'}">
        <div class="tlitem__dot">${sc.result === 'valid' ? '✓' : '×'}</div>
        <div class="tlitem__t">${esc(sc.point)} · ${sc.result === 'valid' ? 'admitted' : 'refused'}</div>
        <div class="tlitem__s">${dt(sc.at)}</div></div>`).join('')}</div>
    </div></div>`;
  toast(valid ? 'Valid card — admit.' : 'Card expired — do not admit.', valid ? 'ok' : 'bad');
}

/* ============================================================
   Application wizard
   ============================================================ */

const STEPS = ['Personal', 'Family & address', 'Academic', 'Documents', 'Fee payment', 'Review'];

function blankDraft() {
  return {
    step: 0,
    photo: null,
    student: { name: '', phone: '', email: '', aadhaar: '', dob: '', bloodGroup: '' },
    parent: { father: '', mother: '', occupation: '', phone: '', guardian: '' },
    address: { door: '', street: '', village: '', mandal: '', district: '', state: 'Andhra Pradesh', pincode: '' },
    academic: { eamcetRank: '', course: '', year: '', allotmentNo: '', category: '', annualIncome: '' },
    documents: {},
    payment: { txnRef: '', screenshot: '' },
    agreePrivacy: false, agreeRules: false,
    savedAt: null
  };
}

function renderApply() {
  const d = State.draft() || blankDraft();
  if (!State.draft()) State.setDraft(d);

  publicPage(`
    <div class="applypage"><div class="wrap">
      <div class="pagehead">
        <div>
          <h1>Hostel application</h1>
          <p>Boys hostel · session ${esc(SESSION_LABEL)} · fee ${inr(FEE)} · block allotted by year of study</p>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span class="saveflag" id="saveFlag"></span>
          <button class="btn btn--ghost btn--sm" id="quickFill">⚡ Fill full form</button>
        </div>
      </div>
      <div class="steps" id="steps"></div>
      <div id="stepBody"></div>
    </div></div>`);

  drawSteps();
  drawStep();
  $('#quickFill').onclick = quickFill;
}

/* fills the whole form with plausible demo details — for walkthroughs, not real applications */
function quickFill() {
  const r = a => a[Math.floor(Math.random() * a.length)];
  const int = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const first = r(FIRST_NAMES), surname = r(SURNAMES);
  const course = r(COURSES), year = r(YEARS);
  const seq = int(1000, 9999);

  const d = {
    step: 5,
    photo: `https://randomuser.me/api/portraits/men/${int(0, 98)}.jpg`,
    student: {
      name: `${first} ${surname}`,
      phone: '9' + int(100000000, 899999999),
      email: `${first.split(' ')[0].toLowerCase()}.${surname[0].toLowerCase()}${seq}@student.anu.ac.in`,
      aadhaar: `${int(2000, 9999)} ${int(1000, 9999)} ${int(1000, 9999)}`,
      dob: `${int(2003, 2007)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      bloodGroup: r(['O+', 'B+', 'A+', 'AB+', 'O-', 'B-'])
    },
    parent: {
      father: `${r(FIRST_NAMES).split(' ')[0]} ${surname}`,
      mother: `${r(MOTHER_NAMES)} ${surname}`,
      occupation: r(OCCUPATIONS),
      phone: '9' + int(100000000, 899999999),
      guardian: ''
    },
    address: {
      door: `${int(1, 12)}-${int(10, 199)}-${int(1, 40)}`,
      street: r(STREETS), village: r(VILLAGES), mandal: r(MANDALS),
      district: r(DISTRICTS), state: 'Andhra Pradesh', pincode: String(int(520001, 524999))
    },
    academic: {
      eamcetRank: String(int(900, 42000)),
      course, year,
      allotmentNo: `AL-${course.slice(0, 2).toUpperCase()}-${int(1000, 9999)}`,
      category: r(CATEGORIES),
      annualIncome: String(int(6, 42) * 10000)
    },
    documents: {},
    payment: { txnRef: 'UPI' + int(100000000000, 999999999999), screenshot: `payment_${first.split(' ')[0].toLowerCase()}.jpg` },
    savedAt: new Date().toISOString()
  };

  DOC_TYPES.forEach(([k, label]) => {
    d.documents[k] = { type: k, label, name: `${k}_${first.split(' ')[0].toLowerCase()}.pdf`, size: int(120, 2400) * 1024, uploadedAt: new Date().toISOString() };
  });

  State.setDraft(d);
  drawSteps();
  drawStep();
  toast(`Filled with demo details for ${d.student.name}. Review and submit.`, 'ok');
}

function drawSteps() {
  const d = State.draft();
  $('#steps').innerHTML = STEPS.map((t, i) => `
    <button class="step ${i === d.step ? 'is-on' : ''} ${i < d.step ? 'is-done' : ''}" data-step="${i}">
      <span class="step__n">${i < d.step ? '✓ ' : ''}0${i + 1}</span>
      <div class="step__t">${t}</div>
    </button>`).join('');
  $('#steps').onclick = e => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const t = +b.dataset.step;
    if (t <= State.draft().step) { State.draft().step = t; State.save(); drawSteps(); drawStep(); }
  };
  $('#saveFlag').innerHTML = d.savedAt ? `Saved <b>${dt(d.savedAt)}</b>` : 'Your work saves on every step';
}

function saveDraft() { const d = State.draft(); d.savedAt = new Date().toISOString(); State.save(); drawSteps(); }

function drawStep() {
  const d = State.draft();
  const fns = [stepPersonal, stepFamily, stepAcademic, stepDocuments, stepPayment, stepReview];
  $('#stepBody').innerHTML = fns[d.step](d);

  const head = $('.panel__head');
  if (head) {
    head.insertAdjacentHTML('afterbegin',
      `<button class="btn btn--ghost btn--sm" id="stepFill" style="float:right;margin-left:12px">⚡ Quick fill</button>`);
    $('#stepFill').onclick = () => quickFillStep(d.step);
  }
  wireStep(d);
}

/* demo generators shared by the section and full-form fills */
const RQ = {
  pick: a => a[Math.floor(Math.random() * a.length)],
  int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  phone() { return '9' + this.int(100000000, 899999999); }
};

function quickFillStep(step) {
  const d = State.draft();
  const r = RQ.pick.bind(RQ), int = RQ.int.bind(RQ);
  const surname = d.student.name ? d.student.name.split(' ').slice(-1)[0] : r(SURNAMES);
  const first = d.student.name ? d.student.name.split(' ')[0] : r(FIRST_NAMES);

  if (step === 0) {
    const f = r(FIRST_NAMES), sn = r(SURNAMES);
    d.photo = `https://randomuser.me/api/portraits/men/${int(0, 98)}.jpg`;
    d.student = {
      name: `${f} ${sn}`,
      phone: RQ.phone(),
      email: `${f.split(' ')[0].toLowerCase()}.${sn[0].toLowerCase()}${int(1000, 9999)}@student.anu.ac.in`,
      aadhaar: `${int(2000, 9999)} ${int(1000, 9999)} ${int(1000, 9999)}`,
      dob: `${int(2003, 2007)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      bloodGroup: r(['O+', 'B+', 'A+', 'AB+', 'O-', 'B-'])
    };
  }

  if (step === 1) {
    d.parent = { father: `${r(FIRST_NAMES).split(' ')[0]} ${surname}`, mother: `${r(MOTHER_NAMES)} ${surname}`,
      occupation: r(OCCUPATIONS), phone: RQ.phone(), guardian: '' };
    d.address = { door: `${int(1, 12)}-${int(10, 199)}-${int(1, 40)}`, street: r(STREETS), village: r(VILLAGES),
      mandal: r(MANDALS), district: r(DISTRICTS), state: 'Andhra Pradesh', pincode: String(int(520001, 524999)) };
  }

  if (step === 2) {
    const course = r(COURSES);
    d.academic = { eamcetRank: String(int(900, 42000)), course, year: r(YEARS),
      allotmentNo: `AL-${course.slice(0, 2).toUpperCase()}-${int(1000, 9999)}`,
      category: r(CATEGORIES), annualIncome: String(int(6, 42) * 10000) };
  }

  if (step === 3) {
    DOC_TYPES.forEach(([k, label]) => {
      d.documents[k] = { type: k, label, name: `${k}_${first.toLowerCase()}.pdf`,
        size: int(120, 2400) * 1024, uploadedAt: new Date().toISOString() };
    });
  }

  if (step === 4) {
    d.payment = { txnRef: 'UPI' + int(100000000000, 999999999999), screenshot: `payment_${first.toLowerCase()}.jpg` };
  }

  if (step === 5) return quickFill();

  saveDraft();
  drawStep();
  toast('Section filled with demo details.', 'ok');
}

function foot(back, next, cls = 'btn--primary') {
  return `<div class="panel__foot">
    <button class="btn btn--ghost" id="backBtn" ${back ? '' : 'disabled'}>Back</button>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn--ghost" id="saveBtn">Save and continue later</button>
      <button class="btn ${cls}" id="nextBtn">${next}</button>
    </div>
  </div>`;
}

function field(id, label, value, o = {}) {
  const { type = 'text', ph = '', hint = '', req = true } = o;
  return `<div class="field">
    <label for="${id}">${label} ${req ? '<span class="req">*</span>' : ''}</label>
    <input class="input" id="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(ph)}" />
    ${hint ? `<div class="field__hint">${hint}</div>` : ''}
    <div class="err hidden" data-err="${id}"></div>
  </div>`;
}

function selectField(id, label, value, options, ph, req = true) {
  return `<div class="field">
    <label for="${id}">${label} ${req ? '<span class="req">*</span>' : ''}</label>
    <select class="select" id="${id}">
      <option value="">${ph}</option>
      ${options.map(o => `<option value="${esc(o)}" ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}
    </select>
    <div class="err hidden" data-err="${id}"></div>
  </div>`;
}

function stepPersonal(d) {
  return `<div class="panel">
    <div class="panel__head"><h2>Personal details</h2><p>Your photo appears on the hostel ID card, the room register and every list the warden sees.</p></div>

    <div class="photopick">
      <div class="photopick__ph" id="photoPrev">${d.photo ? `<img src="${d.photo}" alt="Your photo" />` : 'Passport photo'}</div>
      <div style="min-width:220px;flex:1">
        <div class="field" style="margin-bottom:8px">
          <label for="f_photo">Student photo <span class="req">*</span></label>
          <input class="input" id="f_photo" type="file" accept="image/*" />
          <div class="field__hint">Face the camera against a plain background. The image is resized automatically.</div>
          <div class="err hidden" data-err="f_photo"></div>
        </div>
      </div>
    </div>

    ${field('f_name', 'Full name', d.student.name, { ph: 'Rahul Kancherla' })}
    <div class="grid2">
      ${field('f_phone', 'Phone number', d.student.phone, { ph: '9848012345', hint: '10 digits' })}
      ${field('f_email', 'Email', d.student.email, { type: 'email', ph: 'name@student.anu.ac.in' })}
    </div>
    <div class="grid3">
      ${field('f_aadhaar', 'Aadhaar number', d.student.aadhaar, { ph: '1234 5678 9012' })}
      ${field('f_dob', 'Date of birth', d.student.dob, { type: 'date' })}
      ${selectField('f_blood', 'Blood group', d.student.bloodGroup, ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'], 'Select')}
    </div>
    ${foot(false, 'Continue to family details')}
  </div>`;
}

function stepFamily(d) {
  return `<div class="panel">
    <div class="panel__head"><h2>Family and address</h2><p>The hostel office contacts your parent for leave approvals and emergencies.</p></div>

    <div class="sectionlbl">Parent details</div>
    <div class="grid2">
      ${field('f_father', "Father's name", d.parent.father, { ph: 'Venkateswara Rao Kancherla' })}
      ${field('f_mother', "Mother's name", d.parent.mother, { ph: 'Padma Kancherla' })}
    </div>
    <div class="grid3">
      ${selectField('f_occ', 'Parent occupation', d.parent.occupation, OCCUPATIONS, 'Select')}
      ${field('f_pphone', 'Parent phone number', d.parent.phone, { ph: '9848011111' })}
      ${field('f_guardian', 'Local guardian', d.parent.guardian, { ph: 'Name and relation', req: false })}
    </div>

    <div class="sectionlbl">Home address</div>
    <div class="grid2">
      ${field('f_door', 'Door number', d.address.door, { ph: '5-118-22' })}
      ${field('f_street', 'Street', d.address.street, { ph: 'Main Road' })}
    </div>
    <div class="grid3">
      ${field('f_village', 'Village or town', d.address.village, { ph: 'Kolakaluru' })}
      ${selectField('f_mandal', 'Mandal', d.address.mandal, MANDALS, 'Select mandal')}
      ${selectField('f_district', 'District', d.address.district, DISTRICTS, 'Select district')}
    </div>
    <div class="grid2">
      ${field('f_state', 'State', d.address.state, {})}
      ${field('f_pin', 'Pincode', d.address.pincode, { ph: '522019' })}
    </div>
    ${foot(true, 'Continue to academic details')}
  </div>`;
}

function stepAcademic(d) {
  const block = d.academic.year ? BLOCK_OF_YEAR[d.academic.year] : null;
  return `<div class="panel">
    <div class="panel__head"><h2>Academic details</h2><p>Your year of study decides the block you are allotted.</p></div>
    <div class="grid2">
      ${field('f_rank', 'EAMCET rank', d.academic.eamcetRank, { type: 'number', ph: '4821' })}
      ${field('f_allot', 'Allotment number', d.academic.allotmentNo, { ph: 'AL-CS-2600' })}
    </div>
    <div class="grid2">
      ${selectField('f_course', 'Branch', d.academic.course, COURSES, 'Select branch')}
      ${selectField('f_year', 'Year of study', d.academic.year, YEARS, 'Select year')}
    </div>
    ${block ? `<div class="callout callout--green">Students in ${esc(d.academic.year)} stay in <b>Block ${block}</b>. The warden allots your exact room after approval.</div>` : ''}
    <div class="grid2">
      ${selectField('f_cat', 'Community category', d.academic.category, CATEGORIES, 'Select category')}
      ${field('f_income', 'Annual family income (₹)', d.academic.annualIncome, { type: 'number', ph: '210000', hint: 'As stated on your income certificate' })}
    </div>
    ${foot(true, 'Continue to documents')}
  </div>`;
}

function stepDocuments(d) {
  const box = ([key, label], required) => {
    const f = d.documents[key];
    return `<div class="drop ${f ? 'is-filled' : ''}">
      <div class="drop__t">${label} ${required ? '<span class="req">*</span>' : ''}</div>
      <div class="drop__s">PDF, JPG or PNG · up to 5 MB</div>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-doc="${key}" data-label="${label}" />
      ${f ? `<div class="filerow">✓ ${esc(f.name)} · ${fileSize(f.size)}
        <button class="btn--link" data-rmdoc="${key}" style="color:var(--red)">Remove</button></div>` : ''}
    </div>`;
  };
  return `<div class="panel">
    <div class="panel__head"><h2>Documents</h2><p>Clear scans or photos are both accepted. The warden checks each file before approving.</p></div>
    <div class="callout callout--orange">Carry the originals to check-in — the warden may ask to see them.</div>
    <div class="uploads">
      ${box(DOC_TYPES[0], true)}${box(DOC_TYPES[1], true)}${box(DOC_TYPES[2], true)}${box(DOC_TYPES[3], true)}${box(DOC_TYPES[4], false)}
    </div>
    <div class="err hidden" data-err="docs" style="margin-top:12px"></div>
    ${foot(true, 'Continue to fee payment')}
  </div>`;
}

function stepPayment(d) {
  return `<div class="panel">
    <div class="panel__head"><h2>Fee payment</h2><p>Pay ${inr(FEE)} with any UPI app, then upload the confirmation screenshot.</p></div>
    <div class="callout">Payment happens outside this portal. The hostel office matches your reference number against the bank statement.</div>
    <div class="paygrid">
      <div class="qrbox">
        ${qrPlaceholder()}
        <div class="qrbox__amt">${inr(FEE)}</div>
        <div class="qrbox__lbl">Scan with PhonePe, GPay or Paytm</div>
      </div>
      <div>
        <div class="paylist">
          <div class="payrow"><div><div class="payrow__k">UPI ID</div><div class="payrow__v mono">${BANK.upi}</div></div><button class="btn btn--ghost btn--sm" data-copy="${BANK.upi}">Copy</button></div>
          <div class="payrow"><div><div class="payrow__k">Account number</div><div class="payrow__v mono">${BANK.account}</div></div><button class="btn btn--ghost btn--sm" data-copy="${BANK.account.replace(/ /g, '')}">Copy</button></div>
          <div class="payrow"><div><div class="payrow__k">IFSC</div><div class="payrow__v mono">${BANK.ifsc}</div></div><button class="btn btn--ghost btn--sm" data-copy="${BANK.ifsc}">Copy</button></div>
          <div class="payrow"><div><div class="payrow__k">Account holder</div><div class="payrow__v" style="font-size:13px">${BANK.holder}</div></div></div>
        </div>
        ${field('f_txn', 'UPI reference number', d.payment.txnRef, { ph: 'UPI883412000000', hint: 'Shown in your payment app right after the transfer' })}
        <div class="field">
          <label>Payment screenshot <span class="req">*</span></label>
          <div class="drop ${d.payment.screenshot ? 'is-filled' : ''}">
            <div class="drop__s">Upload the success screen from your payment app</div>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" data-doc="paymentShot" data-label="Payment screenshot" />
            ${d.payment.screenshot ? `<div class="filerow">✓ ${esc(d.payment.screenshot)}</div>` : ''}
          </div>
          <div class="err hidden" data-err="shot"></div>
        </div>
      </div>
    </div>
    ${foot(true, 'Review application')}
  </div>`;
}

function stepReview(d) {
  const row = (k, v) => `<div class="kv"><div class="kv__k">${k}</div><div class="kv__v">${esc(v || '—')}</div></div>`;
  const docs = Object.values(d.documents);
  const block = d.academic.year ? BLOCK_OF_YEAR[d.academic.year] : '—';
  return `<div class="panel">
    <div class="panel__head"><h2>Review and submit</h2><p>Check everything once. After submission the warden receives your file and you cannot edit it.</p></div>

    <div class="bio__top">
      <span class="av av--xl">${d.photo ? `<img src="${d.photo}" alt="" />` : esc(initials(d.student.name))}</span>
      <div class="bio__id">
        <h3>${esc(d.student.name || 'Your name')}</h3>
        <p>${esc(d.academic.course || '—')} · ${esc(d.academic.year || '—')}</p>
        <div class="bio__chips">
          <span class="tag">Block ${esc(block)}</span>
          <span class="tag">${esc(d.academic.category || '—')}</span>
          <span class="tag">Fee ${inr(FEE)}</span>
        </div>
      </div>
    </div>

    <div class="reviewgroup"><h4>Personal</h4>
      ${row('Full name', d.student.name)}${row('Phone', d.student.phone)}${row('Email', d.student.email)}
      ${row('Aadhaar', d.student.aadhaar)}${row('Date of birth', d.student.dob)}${row('Blood group', d.student.bloodGroup)}
    </div>
    <div class="reviewgroup"><h4>Parent details</h4>
      ${row("Father's name", d.parent.father)}${row("Mother's name", d.parent.mother)}
      ${row('Occupation', d.parent.occupation)}${row('Parent phone', d.parent.phone)}${row('Local guardian', d.parent.guardian)}
    </div>
    <div class="reviewgroup"><h4>Address</h4>
      ${row('Door and street', [d.address.door, d.address.street].filter(Boolean).join(', '))}
      ${row('Village or town', d.address.village)}${row('Mandal', d.address.mandal)}
      ${row('District', d.address.district)}${row('State and pincode', [d.address.state, d.address.pincode].filter(Boolean).join(' — '))}
    </div>
    <div class="reviewgroup"><h4>Academic</h4>
      ${row('EAMCET rank', d.academic.eamcetRank)}${row('Branch', d.academic.course)}${row('Year of study', d.academic.year)}
      ${row('Allotment number', d.academic.allotmentNo)}${row('Category', d.academic.category)}
      ${row('Annual family income', d.academic.annualIncome ? inr(d.academic.annualIncome) : '')}
    </div>
    <div class="reviewgroup"><h4>Documents (${docs.length})</h4>
      <div style="padding:14px 16px" class="doclist">
        ${docs.map(f => `<div class="docitem"><div class="docitem__ic">${f.name.split('.').pop().toUpperCase().slice(0, 3)}</div>
          <div><div class="docitem__t">${esc(f.label)}</div><div class="docitem__s">${esc(f.name)} · ${fileSize(f.size)}</div></div></div>`).join('')}
      </div>
    </div>
    <div class="reviewgroup"><h4>Fee payment</h4>
      ${row('Amount', inr(FEE))}${row('Reference number', d.payment.txnRef)}${row('Screenshot', d.payment.screenshot)}
    </div>

    <div class="agree">
      <label class="agree__row"><input type="checkbox" id="agreePrivacy" ${d.agreePrivacy ? 'checked' : ''} />
        <span>I have read and accept the <b>Privacy policy &amp; terms and conditions</b>.</span></label>
      <label class="agree__row"><input type="checkbox" id="agreeRules" ${d.agreeRules ? 'checked' : ''} />
        <span>I agree to abide by the hostel <b>Rules &amp; regulations</b>.</span></label>
      <div class="err hidden" data-err="agree"></div>
    </div>
    <div class="callout">On submit your status becomes <b>Pending</b> and the file moves to the warden's queue. You can track every signature from your dashboard.</div>
    ${foot(true, 'Submit application', 'btn--blue')}
  </div>`;
}

function qrPlaceholder() {
  let cells = '';
  const on = (x, y) => ((x * 7 + y * 13 + (x % 3) * (y % 5)) % 5) < 2;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    const ring = finder && !((x % 7 > 0 && x % 7 < 6 && y % 7 > 0 && y % 7 < 6) && !(x % 7 > 1 && x % 7 < 5 && y % 7 > 1 && y % 7 < 5));
    if (ring || (!finder && on(x, y))) cells += `<rect x="${x * 5}" y="${y * 5}" width="5" height="5" fill="#0D1526"/>`;
  }
  return `<svg viewBox="0 0 105 105" role="img" aria-label="UPI QR code for the hostel fee"><rect width="105" height="105" fill="#fff"/>${cells}</svg>`;
}

/* resize an uploaded photo so it stays small enough to store */
function readPhoto(file, cb) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const w = 300, h = Math.round(img.height * (w / img.width));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => cb(null);
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

function wireStep(d) {
  $$('[data-copy]').forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Copied ' + b.dataset.copy, 'ok'); }
    catch (e) { toast('Copy failed — select the text instead.', 'bad'); }
  });

  const photoInput = $('#f_photo');
  if (photoInput) photoInput.onchange = () => {
    const f = photoInput.files[0];
    if (!f) return;
    readPhoto(f, url => {
      if (!url) return toast('That image could not be read.', 'bad');
      d.photo = url;
      saveDraft();
      $('#photoPrev').innerHTML = `<img src="${url}" alt="Your photo" />`;
      toast('Photo added.', 'ok');
    });
  };

  $$('[data-doc]').forEach(inp => inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast('That file is larger than 5 MB.', 'bad'); inp.value = ''; return; }
    if (inp.dataset.doc === 'paymentShot') d.payment.screenshot = f.name;
    else d.documents[inp.dataset.doc] = { type: inp.dataset.doc, label: inp.dataset.label, name: f.name, size: f.size, uploadedAt: new Date().toISOString() };
    saveDraft(); drawStep();
    toast('Attached ' + f.name, 'ok');
  });

  $$('[data-rmdoc]').forEach(b => b.onclick = () => { delete d.documents[b.dataset.rmdoc]; saveDraft(); drawStep(); });

  const val = id => { const el = $('#' + id); return el ? el.value.trim() : ''; };

  const collect = () => {
    if (d.step === 0) {
      d.student.name = val('f_name'); d.student.phone = val('f_phone'); d.student.email = val('f_email');
      d.student.aadhaar = val('f_aadhaar'); d.student.dob = val('f_dob'); d.student.bloodGroup = val('f_blood');
    }
    if (d.step === 1) {
      d.parent.father = val('f_father'); d.parent.mother = val('f_mother'); d.parent.occupation = val('f_occ');
      d.parent.phone = val('f_pphone'); d.parent.guardian = val('f_guardian');
      d.address.door = val('f_door'); d.address.street = val('f_street'); d.address.village = val('f_village');
      d.address.mandal = val('f_mandal'); d.address.district = val('f_district'); d.address.state = val('f_state'); d.address.pincode = val('f_pin');
    }
    if (d.step === 2) {
      d.academic.eamcetRank = val('f_rank'); d.academic.allotmentNo = val('f_allot'); d.academic.course = val('f_course');
      d.academic.year = val('f_year'); d.academic.category = val('f_cat'); d.academic.annualIncome = val('f_income');
    }
    if (d.step === 4) d.payment.txnRef = val('f_txn');
    if (d.step === 5) { d.agreePrivacy = $('#agreePrivacy').checked; d.agreeRules = $('#agreeRules').checked; }
  };

  $('#backBtn').onclick = () => { collect(); d.step = Math.max(0, d.step - 1); saveDraft(); drawSteps(); drawStep(); };
  $('#saveBtn').onclick = () => { collect(); saveDraft(); toast('Saved. Come back any time on this device.', 'ok'); };
  $('#nextBtn').onclick = () => {
    collect();
    if (!validateStep(d)) return;
    saveDraft();
    if (d.step === 5) return submitApplication(d);
    d.step++; saveDraft(); drawSteps(); drawStep();
  };

  /* year change refreshes the block callout */
  const yearSel = $('#f_year');
  if (yearSel) yearSel.onchange = () => { collect(); saveDraft(); drawStep(); };
}

function validateStep(d) {
  $$('.err').forEach(e => e.classList.add('hidden'));
  $$('.is-bad').forEach(e => e.classList.remove('is-bad'));
  let ok = true;
  const fail = (id, m) => { showErr(id, m); ok = false; };

  if (d.step === 0) {
    if (!d.photo) fail('f_photo', 'Upload a passport photo — it prints on your hostel ID card.');
    if (d.student.name.length < 3) fail('f_name', 'Enter your full name.');
    if (!/^[6-9]\d{9}$/.test(d.student.phone.replace(/\s/g, ''))) fail('f_phone', 'Enter a 10-digit Indian mobile number.');
    if (!/^\S+@\S+\.\S+$/.test(d.student.email)) fail('f_email', 'Enter a valid email address.');
    if (!/^\d{12}$/.test(d.student.aadhaar.replace(/\s/g, ''))) fail('f_aadhaar', 'Aadhaar must be 12 digits.');
    if (!d.student.dob) fail('f_dob', 'Enter your date of birth.');
    if (!d.student.bloodGroup) fail('f_blood', 'Select your blood group.');
    if (ok && State.apps().some(a => a.student.email.toLowerCase() === d.student.email.toLowerCase())) {
      fail('f_email', 'An application already exists for this email. Sign in to track it.');
    }
  }

  if (d.step === 1) {
    if (!d.parent.father) fail('f_father', "Enter your father's name.");
    if (!d.parent.mother) fail('f_mother', "Enter your mother's name.");
    if (!d.parent.occupation) fail('f_occ', 'Select an occupation.');
    if (!/^[6-9]\d{9}$/.test(d.parent.phone.replace(/\s/g, ''))) fail('f_pphone', 'Enter a 10-digit parent phone number.');
    if (!d.address.door) fail('f_door', 'Enter your door number.');
    if (!d.address.street) fail('f_street', 'Enter your street.');
    if (!d.address.village) fail('f_village', 'Enter your village or town.');
    if (!d.address.mandal) fail('f_mandal', 'Select your mandal.');
    if (!d.address.district) fail('f_district', 'Select your district.');
    if (!/^\d{6}$/.test(d.address.pincode)) fail('f_pin', 'Pincode must be 6 digits.');
  }

  if (d.step === 2) {
    if (!d.academic.eamcetRank || +d.academic.eamcetRank < 1) fail('f_rank', 'Enter your EAMCET rank.');
    if (!d.academic.allotmentNo) fail('f_allot', 'Enter the allotment number from your allotment order.');
    if (!d.academic.course) fail('f_course', 'Select your branch.');
    if (!d.academic.year) fail('f_year', 'Select your year of study.');
    if (!d.academic.category) fail('f_cat', 'Select your community category.');
    if (!d.academic.annualIncome) fail('f_income', 'Enter the income shown on your certificate.');
  }

  if (d.step === 3) {
    const need = ['allotment', 'joining', 'income', 'caste'].filter(k => !d.documents[k]);
    if (need.length) {
      const el = document.querySelector('[data-err="docs"]');
      el.textContent = `Attach ${need.length} more document${need.length > 1 ? 's' : ''} before continuing.`;
      el.classList.remove('hidden'); ok = false;
    }
  }

  if (d.step === 4) {
    if (!/^[A-Za-z0-9]{8,}$/.test(d.payment.txnRef)) fail('f_txn', 'Enter the reference number from your payment app (at least 8 characters).');
    if (!d.payment.screenshot) {
      const el = document.querySelector('[data-err="shot"]');
      el.textContent = 'Upload the payment screenshot.';
      el.classList.remove('hidden'); ok = false;
    }
  }

  if (d.step === 5) {
    if (!d.agreePrivacy || !d.agreeRules) {
      const el = document.querySelector('[data-err="agree"]');
      el.textContent = 'Tick both boxes to submit your application.';
      el.classList.remove('hidden'); ok = false;
    }
  }

  if (!ok) toast('Fix the highlighted fields to continue.', 'bad');
  return ok;
}

function submitApplication(d) {
  const now = new Date().toISOString();
  const code = { CSE: 'CS', ECE: 'EC', EEE: 'EE', MECH: 'ME', CIVIL: 'CE', IT: 'IT' }[d.academic.course] || 'XX';
  const seq = 9000 + State.saved.added.length + 1;
  const yy = { '1st Year': '26', '2nd Year': '25', '3rd Year': '24', '4th Year': '23' }[d.academic.year] || '26';

  /* unique hostel ID: YY + branch + random 4 digits */
  const taken = new Set(State.apps().map(a => a.hostelId));
  let hostelId;
  do { hostelId = yy + code + (1000 + Math.floor(Math.random() * 9000)); } while (taken.has(hostelId));

  const rec = {
    id: 'ANU/HM/26/' + seq,
    hostelId,
    validYear: d.academic.year,
    validTill: null,
    scans: [],
    rollNo: `Y26${code}${seq}`,
    photo: d.photo,
    avatarColor: '#14509B',
    student: { ...d.student },
    parent: { ...d.parent },
    address: { ...d.address },
    academic: { ...d.academic, eamcetRank: +d.academic.eamcetRank, annualIncome: +d.academic.annualIncome },
    documents: Object.values(d.documents),
    payment: { amount: FEE, txnRef: d.payment.txnRef, screenshot: d.payment.screenshot, paidAt: now },
    status: 'PENDING',
    approvals: { hod: null, principal: null, cw: null },
    wardenReview: null,
    room: null,
    rejection: null,
    submittedAt: now,
    history: [{ at: now, label: 'Application submitted', by: d.student.name }]
  };

  State.add(rec);
  State.clearDraft();
  State.signIn({ email: rec.student.email, role: 'student', name: rec.student.name, dept: null });
  toast('Application submitted. Reference ' + rec.id, 'ok');
  submittedScreen(rec.id);
}

/* confirmation screen shown right after submit — carries the direct-approval shortcut */
function submittedScreen(id) {
  const a = State.app(id);
  publicPage(`
    <div class="applypage"><div class="wrap" style="max-width:640px;padding-top:36px">
      <div class="card">
        <div class="card__body" style="text-align:center">
          <div class="okmark">✓</div>
          <h2 style="font-size:22px;margin-bottom:6px">Application submitted</h2>
          <p class="muted" style="margin:0 auto 4px;max-width:44ch">Your file is in the warden's queue. You can track every signature from your dashboard.</p>
          <div class="submitmeta">
            <div><span>Reference</span><b class="mono">${esc(a.id)}</b></div>
            <div><span>Hostel ID</span><b class="mono" style="color:var(--blue)">${esc(a.hostelId)}</b></div>
            <div><span>Status</span>${pill(a)}</div>
          </div>

          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:22px">
            <button class="btn btn--blue" data-go="#/student">Go to my dashboard</button>
            <button class="btn btn--primary" id="directBtn">Direct approval (staff)</button>
          </div>

          <div class="callout callout--orange" style="text-align:left;margin:22px 0 0">
            <b>Direct approval</b> is a staff shortcut for spot admissions at the counter. It records the warden, HOD, principal and chief warden signatures together, then goes straight to room allotment and issues the ID card. Regular applications wait for each authority to sign.
          </div>
        </div>
      </div>
    </div></div>`);

  $('#directBtn').onclick = () => directApproval(id, () => submittedScreen(id));
}

/* stamp all approvals, then allot a room, then show the issued card */
function directApproval(id, back) {
  const rec = stampFullApproval(JSON.parse(JSON.stringify(State.app(id))), 'Hostel Office (counter)');
  State.put(rec);
  toast('All approvals recorded. Allot a room to issue the ID card.', 'ok');
  allotRoom(id, null, () => issuedCardScreen(id));
}

function issuedCardScreen(id) {
  const a = State.app(id);
  publicPage(`
    <div class="applypage"><div class="wrap" style="max-width:700px;padding-top:30px">
      <div class="card"><div class="card__body" style="text-align:center">
        <div class="okmark okmark--green">✓</div>
        <h2 style="font-size:22px;margin-bottom:6px">Approved and ID card issued</h2>
        <p class="muted" style="margin:0 auto 20px;max-width:46ch">${esc(a.student.name)} is now a resident. The card below is valid till ${dt(a.validTill, false)} and carries a scannable QR at the gate.</p>
        <div style="max-width:460px;margin:0 auto 18px">${idCard(a)}</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn--ghost" onclick="window.print()">Print card</button>
          <button class="btn btn--blue" data-go="#/student">Open dashboard</button>
          <button class="btn btn--primary" data-go="#/scan">Open QR scanner</button>
        </div>
      </div></div>
    </div></div>`);
}

/* ============================================================
   Student screens
   ============================================================ */

function stampFullApproval(rec, by) {
  const now = new Date().toISOString();
  rec.status = 'SUCCESS';
  rec.rejection = null;
  if (!rec.wardenReview) {
    rec.wardenReview = { by, at: now, remarks: 'Directly approved by staff.' };
    rec.history.push({ at: now, label: 'Verified by warden (direct)', by });
  }
  ['hod', 'principal', 'cw'].forEach(k => {
    if (!rec.approvals[k]) {
      rec.approvals[k] = { by: AUTHORITY[k].name, at: now, direct: true };
      rec.history.push({ at: now, label: `Signed by ${AUTHORITY[k].label} (direct)`, by: AUTHORITY[k].name });
    }
  });
  rec.validYear = rec.academic.year;
  rec.validTill = validTillFor(rec.academic.year, State.saved.promotions);
  return rec;
}

function myApplication() {
  const s = State.session();
  return State.apps().find(a => a.student.email.toLowerCase() === s.email.toLowerCase());
}

function renderStudent() {
  const s = requireRole(['student']);
  if (!s) return;
  const app = myApplication();

  if (!app) {
    shell({
      title: 'My application', sub: 'Nothing submitted yet',
      body: `<div class="card"><div class="empty">
        <h4>No application on file</h4>
        <p>Start your hostel application — about ten minutes with your documents ready.</p>
        <button class="btn btn--primary" data-go="#/apply">Start application</button>
      </div></div>`
    });
    return;
  }

  const n = approvalCount(app);
  const done = n === 3;

  shell({
    title: `Hello, ${app.student.name.split(' ')[0]}`,
    sub: `Application ${app.id} · submitted ${dt(app.submittedAt, false)}`,
    actions: `${pill(app)}${done ? `<button class="btn btn--ghost btn--sm" id="printBtn" style="margin-left:10px">Print approved file</button>` : ''}`,
    body: `
      ${app.status === 'REJECTED' ? `<div class="callout callout--red"><b>Sent back by the warden.</b><br>${esc(app.rejection.reason)}
        <div style="margin-top:6px;font-size:12.5px">${esc(app.rejection.by)} · ${dt(app.rejection.at)}</div></div>` : ''}

      <div class="track">
        <div class="card">
          <div class="card__head"><div><h3>Application progress</h3><p>Updates the moment an authority signs.</p></div></div>
          <div class="card__body">
            ${studentTimeline(app)}
            <div class="progressbar"><span style="width:${(n / 3) * 100}%"></span></div>
            <div class="progresslbl"><span>Signatures collected</span><b class="mono">${n} / 3</b></div>
          </div>
        </div>

        <div class="stack">
          <div class="card">
            <div class="card__head"><div><h3>Room</h3><p>Allotted by the warden.</p></div></div>
            <div class="card__body">
              ${app.room ? `
                <div class="kv" style="padding:0 0 8px"><div class="kv__k">Block</div><div class="kv__v">Block ${esc(app.room.block)} · ${esc(YEAR_OF_BLOCK[app.room.block] || '')}</div></div>
                <div class="kv" style="padding:0 0 8px"><div class="kv__k">Floor</div><div class="kv__v">${esc(FLOORS[app.room.floorIdx].label)}</div></div>
                <div class="kv" style="padding:0 0 12px"><div class="kv__k">Room and bed</div><div class="kv__v mono">${app.room.roomNo} · bed ${app.room.bed}</div></div>
                <button class="btn btn--blue btn--sm btn--wide" data-go="#/student/room">View my room and roommates</button>`
                : `<p style="margin:0;font-size:13.5px;color:var(--muted)">Not allotted yet. Your block will be <b>${esc(BLOCK_OF_YEAR[app.academic.year] || '—')}</b> based on your year of study.</p>`}
            </div>
          </div>

          <div class="card">
            <div class="card__head"><div><h3>Hostel ID card</h3><p>${done ? 'Issued — 3 of 3 signed.' : `${3 - n} signature${3 - n > 1 ? 's' : ''} remaining.`}</p></div></div>
            <div class="card__body">${done ? idCard(app) : `<p style="margin:0;font-size:13.5px;color:var(--muted)">The card unlocks once all three authorities have signed.</p>`}</div>
          </div>

          <div class="card">
            <div class="card__head"><div><h3>Your submission</h3><p>${app.documents.length} documents · fee ${inr(FEE)} paid</p></div></div>
            <div class="card__body" style="display:grid;gap:8px">
              ${app.documents.map(f => docItem(f, app.id)).join('')}
            </div>
          </div>
        </div>
      </div>

      ${done ? `<div class="card" style="margin-top:18px"><div class="card__head"><div><h3>Signatures on file</h3><p>Approved application, ready to print.</p></div></div>
        <div class="card__body">${sigRow(app)}</div></div>` : ''}`
  });

  const p = $('#printBtn');
  if (p) p.onclick = () => window.print();
  wireRowActions();
}

function docItem(f, appId) {
  const open = appId ? `data-docopen="${esc(f.type)}" data-docapp="${esc(appId)}"` : '';
  return `<div class="docitem ${appId ? 'docitem--open' : ''}" ${open}>
    <div class="docitem__ic">${esc(String(f.name).split('.').pop().toUpperCase().slice(0, 3))}</div>
    <div style="min-width:0"><div class="docitem__t">${esc(f.label)}</div>
      <div class="docitem__s">${esc(f.name)} · ${fileSize(f.size)}</div></div>
    ${appId ? '<span class="docitem__go">View</span>' : ''}</div>`;
}

/* ---------- demo document viewer ----------
   Every student opens the same rendered sample for now. When the Django API
   lands, swap the preview for the S3 URL stored on the Document record. */

function docPage(a, type) {
  const L = (y, w, t) => `<rect x="60" y="${y}" width="${w}" height="7" rx="3.5" fill="#DDE3EC"/>` +
    (t ? `<text x="60" y="${y + 7}" font-family="Inter,sans-serif" font-size="13" fill="#2C3A4F">${esc(t)}</text>` : '');
  const meta = {
    allotment: ['ALLOTMENT ORDER', 'Hostel accommodation allotment — boys hostel'],
    joining: ['JOINING REPORT', 'Reported for hostel accommodation'],
    income: ['INCOME CERTIFICATE', 'Issued by the Tahsildar, ' + a.address.mandal],
    caste: ['COMMUNITY CERTIFICATE', 'Issued by the Tahsildar, ' + a.address.mandal],
    marks: ['MARKS MEMORANDUM', 'Statement of marks — previous semester'],
    payment: ['PAYMENT CONFIRMATION', 'UPI transfer to the hostel fund']
  }[type] || ['DOCUMENT', ''];

  if (type === 'payment') {
    return `<svg viewBox="0 0 620 780" style="width:100%;height:auto;background:#fff;border-radius:10px">
      <rect width="620" height="780" fill="#F7F9FC"/>
      <rect x="70" y="60" width="480" height="660" rx="26" fill="#fff" stroke="#E3E8EF"/>
      <circle cx="310" cy="200" r="52" fill="#E3F5EC"/>
      <path d="M285 200 l17 18 l34 -38" stroke="#12915A" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="310" y="300" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-size="26" font-weight="700" fill="#0D1526">Payment successful</text>
      <text x="310" y="360" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-size="44" font-weight="800" fill="#0D1526">₹15,000</text>
      <text x="310" y="392" text-anchor="middle" font-family="Inter,sans-serif" font-size="14" fill="#64748B">Paid to ${esc(BANK.upi)}</text>
      <line x1="110" y1="440" x2="510" y2="440" stroke="#EFF2F7"/>
      <text x="110" y="480" font-family="Inter,sans-serif" font-size="13" fill="#64748B">UPI reference</text>
      <text x="510" y="480" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="13" fill="#0D1526">${esc(a.payment.txnRef)}</text>
      <text x="110" y="516" font-family="Inter,sans-serif" font-size="13" fill="#64748B">From</text>
      <text x="510" y="516" text-anchor="end" font-family="Inter,sans-serif" font-size="13" fill="#0D1526">${esc(a.student.name)}</text>
      <text x="110" y="552" font-family="Inter,sans-serif" font-size="13" fill="#64748B">Date</text>
      <text x="510" y="552" text-anchor="end" font-family="Inter,sans-serif" font-size="13" fill="#0D1526">${dt(a.payment.paidAt, false)}</text>
      <text x="310" y="650" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="#94A3B8">Sample screenshot — demo data</text>
    </svg>`;
  }

  return `<svg viewBox="0 0 620 800" style="width:100%;height:auto;background:#fff;border-radius:10px">
    <rect width="620" height="800" fill="#fff" stroke="#E3E8EF"/>
    <rect x="0" y="0" width="620" height="96" fill="#F3F7FD"/>
    <rect x="34" y="26" width="44" height="44" rx="11" fill="#14509B"/>
    <text x="56" y="55" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-size="14" font-weight="800" fill="#fff">ANU</text>
    <text x="94" y="46" font-family="Plus Jakarta Sans,sans-serif" font-size="17" font-weight="700" fill="#0D1526">Acharya Nagarjuna University</text>
    <text x="94" y="68" font-family="Inter,sans-serif" font-size="12" fill="#64748B">Nagarjuna Nagar, Guntur — 522510 · Boys hostel office</text>

    <text x="310" y="150" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-size="19" font-weight="800" fill="#0D1526" letter-spacing="2">${meta[0]}</text>
    <text x="310" y="176" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" fill="#64748B">${esc(meta[1])}</text>
    <line x1="60" y1="200" x2="560" y2="200" stroke="#E3E8EF"/>

    <text x="60" y="240" font-family="Inter,sans-serif" font-size="13" fill="#64748B">Name</text>
    <text x="230" y="240" font-family="Inter,sans-serif" font-size="13.5" fill="#0D1526" font-weight="600">${esc(a.student.name)}</text>
    <text x="60" y="272" font-family="Inter,sans-serif" font-size="13" fill="#64748B">Roll number</text>
    <text x="230" y="272" font-family="IBM Plex Mono,monospace" font-size="13" fill="#0D1526">${esc(a.rollNo)}</text>
    <text x="60" y="304" font-family="Inter,sans-serif" font-size="13" fill="#64748B">Branch and year</text>
    <text x="230" y="304" font-family="Inter,sans-serif" font-size="13.5" fill="#0D1526">${esc(a.academic.course)} · ${esc(a.academic.year)}</text>
    <text x="60" y="336" font-family="Inter,sans-serif" font-size="13" fill="#64748B">Allotment number</text>
    <text x="230" y="336" font-family="IBM Plex Mono,monospace" font-size="13" fill="#0D1526">${esc(a.academic.allotmentNo)}</text>
    <text x="60" y="368" font-family="Inter,sans-serif" font-size="13" fill="#64748B">Address</text>
    <text x="230" y="368" font-family="Inter,sans-serif" font-size="12.5" fill="#0D1526">${esc(a.address.village)}, ${esc(a.address.mandal)}, ${esc(a.address.district)}</text>

    <line x1="60" y1="400" x2="560" y2="400" stroke="#EFF2F7"/>
    ${L(432, 470)}${L(456, 500)}${L(480, 430)}${L(504, 490)}${L(528, 360)}
    ${L(576, 480)}${L(600, 440)}

    <path d="M400 690 C 420 660, 440 720, 470 680 S 520 660, 545 690" stroke="#14509B" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <line x1="390" y1="712" x2="560" y2="712" stroke="#94A3B8"/>
    <text x="475" y="732" text-anchor="middle" font-family="Inter,sans-serif" font-size="11.5" fill="#64748B">Issuing authority</text>

    <circle cx="120" cy="690" r="42" fill="none" stroke="#C8372D" stroke-width="2" opacity=".55"/>
    <text x="120" y="686" text-anchor="middle" font-family="Inter,sans-serif" font-size="10" fill="#C8372D" opacity=".75">OFFICE</text>
    <text x="120" y="700" text-anchor="middle" font-family="Inter,sans-serif" font-size="10" fill="#C8372D" opacity=".75">SEAL</text>

    <text x="310" y="772" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" fill="#94A3B8">Sample document — demo data, not a real certificate</text>
  </svg>`;
}

function openDocViewer(appId, type) {
  const a = State.app(appId);
  if (!a) return;
  const list = a.documents.concat([{ type: 'payment', label: 'Payment screenshot', name: a.payment.screenshot, size: 480000 }]);
  const cur = list.find(f => f.type === type) || list[0];

  openModal({
    title: cur.label,
    sub: `${esc(a.student.name)} · <span class="mono">${esc(cur.name)}</span>`,
    wide: true,
    body: `<div style="display:grid;grid-template-columns:190px 1fr;gap:18px">
      <div style="display:grid;gap:7px;align-content:start">
        ${list.map(f => `<button class="btn ${f.type === cur.type ? 'btn--blue' : 'btn--ghost'} btn--sm"
          style="justify-content:flex-start" data-docswap="${esc(f.type)}">${esc(f.label)}</button>`).join('')}
      </div>
      <div>${docPage(a, cur.type)}</div>
    </div>
    <div class="callout" style="margin:18px 0 0">Demo build: every student opens the same rendered sample. With the Django API each document loads its own file from S3.</div>`,
    actions: [{ label: 'Close', run: c => c() }]
  });

  $('#modalRoot').addEventListener('click', e => {
    const b = e.target.closest('[data-docswap]');
    if (b) openDocViewer(appId, b.dataset.docswap);
  });
}

function studentTimeline(app) {
  const verified = !!app.wardenReview;
  const item = (state, t, s) => `<div class="tlitem is-${state}"><div class="tlitem__dot">${state === 'done' ? '✓' : state === 'bad' ? '×' : ''}</div>
    <div class="tlitem__t">${t}</div><div class="tlitem__s">${s}</div></div>`;

  const auth = k => {
    const a = app.approvals[k];
    if (a) return item('done', `Signed by ${AUTHORITY[k].label}`, `${esc(a.by)} · ${dt(a.at)}`);
    if (!verified) return item('todo', `${AUTHORITY[k].label} signature`, 'Opens after warden verification');
    return item('now', `Waiting on ${AUTHORITY[k].label}`, esc(AUTHORITY[k].name));
  };

  return `
    <div class="tl">
      ${item('done', 'Application submitted', dt(app.submittedAt))}
      ${app.status === 'REJECTED' ? item('bad', 'Sent back by warden', dt(app.rejection.at))
        : verified ? item('done', 'Verified by warden', `${esc(app.wardenReview.by)} · ${dt(app.wardenReview.at)}`)
        : item('now', 'With the warden', 'Documents and payment being checked')}
    </div>
    <div class="tlgroup">
      <div class="tlgroup__lbl">Three signatures · collected in parallel</div>
      <div class="tl">${auth('hod')}${auth('principal')}${auth('cw')}</div>
    </div>
    <div class="tl">
      ${approvalCount(app) === 3 ? item('done', 'Final approval completed', app.room ? `Room ${app.room.roomNo}, Block ${app.room.block}` : 'Room allotment pending')
        : item('todo', 'Final approval', 'Completes at 3 of 3 signatures')}
    </div>`;
}

function idCard(app) {
  const valid = cardValid(app);
  return `<div class="idcard">
    <div class="idcard__top">
      ${SEAL}
      <span><strong>Hostel Identity Card</strong><span>Acharya Nagarjuna University · Boys hostel</span></span>
      <span class="idcard__spacer"></span>
      <span class="idcard__valid ${valid ? '' : 'idcard__valid--bad'}">${valid ? 'Valid' : 'Expired'}</span>
    </div>
    <div class="idcard__body">
      ${avatar(app, 'av--xl')}
      <div class="idcard__rows">
        <div class="idrow"><span>Name</span><b>${esc(app.student.name)}</b></div>
        <div class="idrow"><span>Hostel ID</span><b class="mono" style="color:var(--blue)">${esc(app.hostelId)}</b></div>
        <div class="idrow"><span>Course</span><b>${esc(app.academic.course)} · ${esc(app.academic.year)}</b></div>
        <div class="idrow"><span>Block · room</span><b>${app.room ? 'Block ' + esc(app.room.block) + ' · ' + app.room.roomNo + ' · bed ' + app.room.bed : 'To be allotted'}</b></div>
        <div class="idrow"><span>Blood group</span><b>${esc(app.student.bloodGroup || '—')}</b></div>
        <div class="idrow"><span>Valid till</span><b class="${valid ? '' : 'is-expired'}">${app.validTill ? dt(app.validTill, false) : '—'}</b></div>
      </div>
      <div class="idcard__qr">
        ${qrSvg(app.hostelId, 116)}
        <span class="idcard__qr-lbl">Scan at the gate</span>
      </div>
    </div>
    <div class="idcard__foot"><span class="mono">${esc(app.hostelId)}</span><span>${esc(app.academic.year)} · ${valid ? 'Active' : 'Renew on promotion'}</span></div>
  </div>`;
}

function sigRow(app) {
  return `<div class="sigs">${['hod', 'principal', 'cw'].map(k => {
    const a = app.approvals[k];
    return a ? `<div class="sig"><div class="sig__ink">${sigSvg(k)}</div><div class="sig__name">${esc(a.by)}</div>
        <div class="sig__role">${AUTHORITY[k].label} · ${dt(a.at, false)}</div></div>`
      : `<div class="sig sig--wait"><div class="sig__ink">Awaiting signature</div><div class="sig__name">${esc(AUTHORITY[k].name)}</div>
        <div class="sig__role">${AUTHORITY[k].label}</div></div>`;
  }).join('')}</div>`;
}

function renderStudentId() {
  const s = requireRole(['student']);
  if (!s) return;
  const app = myApplication();
  const done = app && approvalCount(app) === 3;

  shell({
    title: 'Hostel ID card',
    sub: done ? 'Carry this card at check-in and at the hostel gate' : 'Issued after all three signatures',
    actions: done ? `<button class="btn btn--ghost btn--sm" id="printBtn">Print card</button>` : '',
    body: done
      ? `<div style="max-width:460px">${idCard(app)}</div>
         <div class="card" style="margin-top:18px;max-width:640px"><div class="card__head"><div><h3>Signatures</h3></div></div>
         <div class="card__body">${sigRow(app)}</div></div>`
      : `<div class="card"><div class="empty"><h4>Card not issued yet</h4>
          <p>${app ? `${3 - approvalCount(app)} signature(s) remaining on your application.` : 'Submit an application first.'}</p>
          <button class="btn btn--primary" data-go="${app ? '#/student' : '#/apply'}">${app ? 'View progress' : 'Start application'}</button></div></div>`
  });

  const p = $('#printBtn');
  if (p) p.onclick = () => window.print();
  wireRowActions();
}

/* ============================================================
   Shared: bio-data
   ============================================================ */

function bioBody(a, opts = {}) {
  const row = (k, v) => `<div class="kv"><div class="kv__k">${k}</div><div class="kv__v">${esc(v || '—')}</div></div>`;
  const addr = [a.address.door, a.address.street, a.address.village, a.address.mandal,
    a.address.district + ' — ' + a.address.pincode, a.address.state].filter(Boolean).join(', ');

  return `
    <div class="bio__top">
      ${avatar(a, 'av--xl')}
      <div class="bio__id" style="flex:1;min-width:220px">
        <h3>${esc(a.student.name)}</h3>
        <p><span class="mono">${esc(a.rollNo)}</span> · ${esc(a.academic.course)} · ${esc(a.academic.year)}</p>
        <div class="bio__chips">
          ${pill(a)}
          <span class="tag" style="background:var(--blue);color:#fff;border-color:var(--blue)">Hostel ID ${esc(a.hostelId)}</span>
          ${a.room ? `<span class="tag">Block ${esc(a.room.block)} · Room ${a.room.roomNo} · Bed ${a.room.bed}</span>` : `<span class="tag">No room allotted</span>`}
          ${a.validTill ? `<span class="tag" style="${cardValid(a) ? 'background:var(--green-100);color:var(--green-700);border-color:#A9DDC2' : 'background:var(--red-100);color:var(--red-700);border-color:#EFB9B4'}">${cardValid(a) ? 'Valid till ' + dt(a.validTill, false) : 'Card expired'}</span>` : ''}
          <span class="tag">${esc(a.address.district)}</span>
        </div>
      </div>
      ${opts.editable ? `<button class="btn btn--ghost btn--sm" data-edit="${esc(a.id)}">Edit details</button>` : ''}
    </div>

    <div class="sectionlbl">Personal</div>
    <div class="reviewgroup">
      ${row('Hostel ID', a.hostelId)}${row('Application ID', a.id)}${row('Phone', a.student.phone)}
      ${row('Email', a.student.email)}${row('Aadhaar', a.student.aadhaar)}${row('Date of birth', a.student.dob)}
      ${row('Blood group', a.student.bloodGroup)}${row('Card valid till', a.validTill ? dt(a.validTill, false) + (cardValid(a) ? '' : ' (expired)') : 'Not issued')}
    </div>

    <div class="sectionlbl">Parent details</div>
    <div class="reviewgroup">
      ${row("Father's name", a.parent.father)}${row("Mother's name", a.parent.mother)}
      ${row('Occupation', a.parent.occupation)}${row('Parent phone', a.parent.phone)}${row('Local guardian', a.parent.guardian)}
    </div>

    <div class="sectionlbl">Address</div>
    <div class="reviewgroup">${row('Home address', addr)}</div>

    <div class="sectionlbl">Academic</div>
    <div class="reviewgroup">
      ${row('EAMCET rank', a.academic.eamcetRank)}${row('Branch', a.academic.course)}${row('Year of study', a.academic.year)}
      ${row('Allotment number', a.academic.allotmentNo)}${row('Annual family income', inr(a.academic.annualIncome))}
    </div>

    <div class="sectionlbl">Documents (${a.documents.length})</div>
    <div class="doclist">${a.documents.map(f => docItem(f, a.id)).join('')}${docItem({ type: 'payment', label: 'Payment screenshot', name: a.payment.screenshot, size: 480000 }, a.id)}</div>

    <div class="sectionlbl">Fee payment</div>
    <div class="reviewgroup">
      ${row('Amount', inr(a.payment.amount))}${row('Reference', a.payment.txnRef)}
      ${row('Screenshot', a.payment.screenshot)}${row('Paid on', dt(a.payment.paidAt))}
    </div>

    <div class="sectionlbl">Signatures</div>
    ${sigRow(a)}

    ${(a.scans && a.scans.length) ? `<div class="sectionlbl">Gate scan log (${a.scans.length})</div>
      <div class="tl">${a.scans.slice(0, 8).map(sc => `<div class="tlitem is-${sc.result === 'valid' ? 'done' : 'bad'}">
        <div class="tlitem__dot">${sc.result === 'valid' ? '✓' : '×'}</div>
        <div class="tlitem__t">${esc(sc.point)} · ${sc.result === 'valid' ? 'admitted' : 'refused'}</div>
        <div class="tlitem__s">${dt(sc.at)}</div></div>`).join('')}</div>` : ''}

    <div class="sectionlbl">History</div>
    <div class="tl">${a.history.map(h => `<div class="tlitem is-done"><div class="tlitem__dot">✓</div>
      <div class="tlitem__t">${esc(h.label)}</div><div class="tlitem__s">${esc(h.by)} · ${dt(h.at)}</div></div>`).join('')}</div>`;
}

function openBio(id, actions = []) {
  const a = State.app(id);
  if (!a) return;
  const s = State.session();
  const editable = s && s.role === 'admin';
  openModal({
    title: a.student.name,
    sub: `<span class="mono">${esc(a.rollNo)}</span> · ${esc(a.academic.course)} · ${esc(a.academic.year)}`,
    body: bioBody(a, { editable }),
    actions, wide: true
  });
  const e = document.querySelector('[data-edit]');
  if (e) e.onclick = () => { closeModal(); openEditStudent(a.id); };
  $('#modalRoot').addEventListener('click', ev => {
    const dv = ev.target.closest('[data-docopen]');
    if (dv) openDocViewer(dv.dataset.docapp, dv.dataset.docopen);
  });
}

/* ============================================================
   Filters, tables and shared row actions
   ============================================================ */

const F = {
  apps: { q: '', status: '', course: '', year: '', page: 1 },
  dir: { q: '', block: '', floor: '', course: '', year: '', district: '', occupancy: '', page: 1 }
};
const PER_PAGE = 25;

function matchApp(a, f) {
  const q = f.q.trim().toLowerCase();
  if (q) {
    const hay = [a.student.name, a.id, a.hostelId, a.rollNo, a.student.phone, a.student.email,
      a.room ? `${a.room.block} ${a.room.roomNo}` : '', a.address.district].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.status && statusInfo(a).bucket !== f.status) return false;
  if (f.course && a.academic.course !== f.course) return false;
  if (f.year && a.academic.year !== f.year) return false;
  if (f.block && (!a.room || a.room.block !== f.block)) return false;
  if (f.floor !== undefined && f.floor !== '' && (!a.room || String(a.room.floorIdx) !== f.floor)) return false;
  if (f.district && a.address.district !== f.district) return false;
  return true;
}

function selOpts(list, value) {
  return list.map(o => `<option value="${esc(o)}" ${String(o) === String(value) ? 'selected' : ''}>${esc(o)}</option>`).join('');
}

function pager(total, f, key) {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (f.page > pages) f.page = pages;
  return `<div class="pager">
    <span>Page ${f.page} of ${pages} · ${total.toLocaleString('en-IN')} record${total === 1 ? '' : 's'}</span>
    <span style="display:flex;gap:8px">
      <button class="btn btn--ghost btn--sm" data-page="${f.page - 1}" ${f.page <= 1 ? 'disabled' : ''}>Previous</button>
      <button class="btn btn--ghost btn--sm" data-page="${f.page + 1}" ${f.page >= pages ? 'disabled' : ''}>Next</button>
    </span>
  </div>`;
}

function slice(list, f) { return list.slice((f.page - 1) * PER_PAGE, f.page * PER_PAGE); }

function wireFilters(f, rerender) {
  $$('[data-f]').forEach(el => {
    const ev = el.tagName === 'INPUT' ? 'input' : 'change';
    el.addEventListener(ev, () => {
      f[el.dataset.f] = el.value;
      f.page = 1;
      const pos = el.selectionStart;
      rerender();
      if (ev === 'input') {
        const again = document.querySelector(`[data-f="${el.dataset.f}"]`);
        if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) {} }
      }
    });
  });
  const c = $('#content');
  c.addEventListener('click', e => {
    const p = e.target.closest('[data-page]');
    if (p && !p.disabled) { f.page = +p.dataset.page; rerender(); }
  });
}

function exportCsv(list, name) {
  const head = ['Application ID', 'Roll number', 'Name', 'Branch', 'Year', 'Block', 'Room', 'Bed', 'Phone', 'Parent phone', 'District', 'Category', 'EAMCET rank', 'Status', 'Signatures', 'Payment ref', 'Submitted'];
  const rows = list.map(a => [a.id, a.rollNo, a.student.name, a.academic.course, a.academic.year,
    a.room ? a.room.block : '', a.room ? a.room.roomNo : '', a.room ? a.room.bed : '', a.student.phone, a.parent.phone,
    a.address.district, a.academic.category, a.academic.eamcetRank, statusInfo(a).text, approvalCount(a) + '/3', a.payment.txnRef, dt(a.submittedAt, false)]);
  const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const el = document.createElement('a');
  el.href = url; el.download = name; el.click();
  URL.revokeObjectURL(url);
  toast('CSV downloaded.', 'ok');
}

/* ============================================================
   Warden
   ============================================================ */

function renderWardenQueue() {
  const s = requireRole(['warden']);
  if (!s) return;

  const apps = State.apps();
  const pending = apps.filter(a => a.status === 'PENDING').sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const verified = apps.filter(a => (a.status === 'ACTIVE' || a.status === 'SUCCESS') && !a.alumni);
  const noRoom = verified.filter(a => !a.room && approvalCount(a) === 3);

  shell({
    title: 'Verification queue',
    sub: `${s.name} · boys hostel · session ${SESSION_LABEL}`,
    body: `
      <div class="grid-m">
        <div class="metric metric--orange"><div class="metric__k">Waiting for you</div><div class="metric__v">${pending.length}</div><div class="metric__d">to verify</div></div>
        <div class="metric metric--blue"><div class="metric__k">With authorities</div><div class="metric__v">${verified.filter(a => approvalCount(a) < 3).length}</div><div class="metric__d">signatures pending</div></div>
        <div class="metric metric--green"><div class="metric__k">Fully approved</div><div class="metric__v">${apps.filter(a => approvalCount(a) === 3 && !a.alumni).length}</div><div class="metric__d">3 of 3 signed</div></div>
        <div class="metric metric--orange"><div class="metric__k">Rooms to allot</div><div class="metric__v">${noRoom.length}</div><div class="metric__d">approved, no bed</div></div>
        <div class="metric metric--red"><div class="metric__k">Sent back</div><div class="metric__v">${apps.filter(a => a.status === 'REJECTED').length}</div><div class="metric__d">with students</div></div>
      </div>

      <div class="card">
        <div class="card__head"><div><h3>Pending verification</h3><p>Oldest first — check documents and payment before approving.</p></div></div>
        ${pending.length ? `<div class="tablescroll"><table class="data">
          <thead><tr><th>Student</th><th>Branch</th><th>Year</th><th>Rank</th><th>Payment</th><th>Docs</th><th>Submitted</th><th></th></tr></thead>
          <tbody>${pending.map(a => `<tr>
            <td>${personCell(a)}</td><td>${esc(a.academic.course)}</td><td>${esc(a.academic.year)}</td>
            <td class="num">${a.academic.eamcetRank}</td><td class="num">${esc(a.payment.txnRef)}</td>
            <td>${a.documents.length}</td><td class="cell-sub">${dt(a.submittedAt, false)}</td>
            <td style="text-align:right"><button class="btn btn--primary btn--sm" data-review="${esc(a.id)}">Review</button></td>
          </tr>`).join('')}</tbody></table></div>`
          : `<div class="empty"><h4>Queue is clear</h4><p>Every submitted application has been verified.</p></div>`}
      </div>

      ${noRoom.length ? `<div class="card">
        <div class="card__head"><div><h3>Approved, waiting for a room</h3><p>Allot a bed so the ID card can be printed.</p></div>
          <span class="card__spacer"></span><button class="btn btn--ghost btn--sm" data-go="#/warden/hostel">Open hostel view</button></div>
        <div class="tablescroll"><table class="data">
          <thead><tr><th>Student</th><th>Branch</th><th>Year</th><th>Goes to</th><th>Approved</th><th></th></tr></thead>
          <tbody>${noRoom.map(a => `<tr>
            <td>${personCell(a)}</td><td>${esc(a.academic.course)}</td><td>${esc(a.academic.year)}</td>
            <td><span class="tag">Block ${esc(BLOCK_OF_YEAR[a.academic.year] || '—')}</span></td>
            <td class="cell-sub">${dt(a.approvals.principal ? a.approvals.principal.at : a.wardenReview.at, false)}</td>
            <td style="text-align:right"><button class="btn btn--blue btn--sm" data-allot="${esc(a.id)}">Allot room</button></td>
          </tr>`).join('')}</tbody></table></div></div>` : ''}`
  });

  wireRowActions();
}

function renderWardenApplications() {
  const s = requireRole(['warden']);
  if (!s) return;
  const f = F.apps;
  const all = State.apps().filter(a => !a.alumni);
  const list = all.filter(a => matchApp(a, f));

  shell({
    title: 'All applications',
    sub: 'Every file for this session',
    actions: `<button class="btn btn--ghost btn--sm" id="csvBtn">Export CSV</button>`,
    body: `
      <div class="filters">
        <input class="input input--search" data-f="q" value="${esc(f.q)}" placeholder="Search name, roll number, phone or room" />
        <select class="select" data-f="status"><option value="">All statuses</option>
          ${selOpts(['pending', 'active', 'approved', 'rejected'], f.status)}</select>
        <select class="select" data-f="course"><option value="">All branches</option>${selOpts(COURSES, f.course)}</select>
        <select class="select" data-f="year"><option value="">All years</option>${selOpts(YEARS, f.year)}</select>
        <span class="filters__spacer"></span>
        <span class="filters__count">${list.length} of ${all.length}</span>
      </div>
      ${appsTable(list, f)}`
  });

  $('#csvBtn').onclick = () => exportCsv(list, 'anu-hostel-applications.csv');
  wireFilters(f, renderWardenApplications);
  wireRowActions();
}

function appsTable(list, f) {
  const rows = slice(list, f);
  return `<div class="card">
    <div class="tablescroll"><table class="data">
      <thead><tr><th>Student</th><th>Branch</th><th>Year</th><th>Status</th><th>Room</th><th>Submitted</th><th></th></tr></thead>
      <tbody>${rows.length ? rows.map(a => `<tr class="clickable" data-bio="${esc(a.id)}">
        <td>${personCell(a)}</td><td>${esc(a.academic.course)}</td><td>${esc(a.academic.year)}</td>
        <td>${pill(a)}</td><td class="num">${esc(roomLabel(a))}</td>
        <td class="cell-sub">${dt(a.submittedAt, false)}</td>
        <td style="text-align:right;white-space:nowrap">
          ${a.status === 'PENDING' ? `<button class="btn btn--primary btn--sm" data-review="${esc(a.id)}">Review</button>` : ''}
          ${approvalCount(a) === 3 && !a.room ? `<button class="btn btn--blue btn--sm" data-allot="${esc(a.id)}">Allot room</button>` : ''}
          ${a.room ? `<button class="btn btn--ghost btn--sm" data-allot="${esc(a.id)}">Change room</button>` : ''}
        </td></tr>`).join('')
        : `<tr><td colspan="7"><div class="empty"><h4>Nothing matches these filters</h4><p>Clear a filter to widen the search.</p></div></td></tr>`}
      </tbody></table></div>
    ${pager(list.length, f)}
  </div>`;
}

/* row actions shared by every table */
function wireRowActions() {
  const c = $('#content');
  if (!c) return;
  c.addEventListener('click', e => {
    const dv = e.target.closest('[data-docopen]');
    if (dv) { e.stopPropagation(); return openDocViewer(dv.dataset.docapp, dv.dataset.docopen); }
    const bio = e.target.closest('[data-bio]');
    const rev = e.target.closest('[data-review]');
    const alt = e.target.closest('[data-allot]');
    const sgn = e.target.closest('[data-sign]');
    const edt = e.target.closest('[data-editrow]');
    if (rev) { e.stopPropagation(); return wardenReview(rev.dataset.review); }
    if (alt) { e.stopPropagation(); return allotRoom(alt.dataset.allot); }
    if (sgn) { e.stopPropagation(); return openSign(sgn.dataset.sign); }
    if (edt) { e.stopPropagation(); return openEditStudent(edt.dataset.editrow); }
    if (bio) return openBio(bio.dataset.bio);
  });
}

function wardenReview(id) {
  const a = State.app(id);
  if (!a) return;
  openModal({
    title: a.student.name,
    sub: `<span class="mono">${esc(a.id)}</span> · submitted ${dt(a.submittedAt)}`,
    body: bioBody(a),
    wide: true,
    actions: [
      { label: 'Send back', cls: 'btn--danger', run: () => { closeModal(); rejectModal(id); } },
      { label: 'Verify and forward', cls: 'btn--primary', run: c => {
        const rec = JSON.parse(JSON.stringify(State.app(id)));
        const now = new Date().toISOString();
        rec.status = 'ACTIVE'; rec.rejection = null;
        rec.wardenReview = { by: State.session().name, at: now, remarks: 'Documents and payment verified.' };
        rec.history.push({ at: now, label: 'Verified by warden', by: State.session().name });
        State.put(rec); c(); route();
        toast('Verified. Now visible to HOD, principal and chief warden.', 'ok');
      } }
    ]
  });
}

function rejectModal(id) {
  const a = State.app(id);
  openModal({
    title: 'Send this application back',
    sub: 'The student sees your reason and can fix it and resubmit.',
    body: `<div class="field"><label for="rejReason">Reason <span class="req">*</span></label>
      <textarea class="textarea" id="rejReason" placeholder="Say exactly what is wrong and what to upload instead."></textarea>
      <div class="err hidden" data-err="rejReason"></div></div>`,
    actions: [
      { label: 'Cancel', run: c => c() },
      { label: 'Send back to student', cls: 'btn--danger', run: c => {
        const reason = $('#rejReason').value.trim();
        if (reason.length < 10) return showErr('rejReason', 'Write at least a short sentence so the student knows what to fix.');
        const rec = JSON.parse(JSON.stringify(State.app(id)));
        const now = new Date().toISOString();
        rec.status = 'REJECTED';
        rec.rejection = { reason, by: State.session().name, at: now };
        rec.history.push({ at: now, label: 'Sent back by warden', by: State.session().name });
        State.put(rec); c(); route();
        toast('Sent back to ' + a.student.name.split(' ')[0] + '.', 'bad');
      } }
    ]
  });
}

/* ---------- room allotment ---------- */

function occupancyIndex() {
  const map = {};
  State.apps().forEach(a => {
    if (!a.room) return;
    const key = `${a.room.block}-${a.room.roomNo}`;
    (map[key] = map[key] || []).push(a);
  });
  return map;
}

function freeBeds(block, roomNo, occ) {
  const taken = new Set((occ[`${block}-${roomNo}`] || []).map(a => a.room.bed));
  return [1, 2, 3, 4].filter(b => !taken.has(b));
}

function allotRoom(id, presetRoom, onDone) {
  const a = State.app(id);
  if (!a) return;
  const occ = occupancyIndex();
  const maint = State.maintenanceSet();
  const block = a.room ? a.room.block : (BLOCK_OF_YEAR[a.academic.year] || 'A');

  const roomsWithSpace = [];
  FLOORS.forEach(f => roomNumbersOf(f.idx).forEach(no => {
    const key = `${block}-${no}`;
    if (maint.has(key)) return;
    const free = freeBeds(block, no, occ).filter(b => !(a.room && a.room.roomNo === no && a.room.bed === b));
    const count = (occ[key] || []).length;
    if (free.length) roomsWithSpace.push({ no, free, count, floor: f.label });
  }));

  const chosen = presetRoom || (a.room ? a.room.roomNo : (roomsWithSpace[0] || {}).no);

  openModal({
    title: 'Allot room',
    sub: `${esc(a.student.name)} · ${esc(a.academic.year)} · Block ${esc(block)}`,
    body: `
      <div class="callout callout--green">${esc(a.academic.year)} students stay in <b>Block ${esc(block)}</b>. Only rooms with a free bed are listed.</div>
      <div class="grid2">
        <div class="field">
          <label for="roomSel">Room <span class="req">*</span></label>
          <select class="select" id="roomSel">
            ${roomsWithSpace.map(r => `<option value="${r.no}" ${r.no === chosen ? 'selected' : ''}>${r.no} — ${r.floor} · ${4 - r.count} bed${4 - r.count === 1 ? '' : 's'} free</option>`).join('')}
          </select>
          <div class="err hidden" data-err="roomSel"></div>
        </div>
        <div class="field">
          <label for="bedSel">Bed <span class="req">*</span></label>
          <select class="select" id="bedSel"></select>
        </div>
      </div>
      <div id="roomMates"></div>`,
    actions: [
      { label: 'Cancel', run: c => c() },
      ...(a.room ? [{ label: 'Release bed', cls: 'btn--danger', run: c => {
        const rec = JSON.parse(JSON.stringify(State.app(id)));
        const now = new Date().toISOString();
        rec.history.push({ at: now, label: `Bed released — Block ${rec.room.block}, room ${rec.room.roomNo}`, by: (State.session() || {}).name || 'Hostel Office' });
        rec.room = null;
        State.put(rec); c(); route();
        toast('Bed released.', 'ok');
      } }] : []),
      { label: 'Save allotment', cls: 'btn--blue', run: c => {
        const no = +$('#roomSel').value;
        const bed = +$('#bedSel').value;
        if (!no || !bed) return showErr('roomSel', 'Pick a room with a free bed.');
        const rec = JSON.parse(JSON.stringify(State.app(id)));
        const now = new Date().toISOString();
        rec.room = { block, floorIdx: Math.floor(no / 100) - 1, roomNo: no, bed, assignedBy: State.session().name, assignedAt: now };
        rec.history.push({ at: now, label: `Room allotted — Block ${block}, room ${no}, bed ${bed}`, by: (State.session() || {}).name || 'Hostel Office' });
        State.put(rec); c();
        toast(`Allotted Block ${block}, room ${no}, bed ${bed}.`, 'ok');
        if (onDone) onDone(); else route();
      } }
    ]
  });

  const refresh = () => {
    const no = +$('#roomSel').value;
    const r = roomsWithSpace.find(x => x.no === no);
    $('#bedSel').innerHTML = (r ? r.free : []).map(b => `<option value="${b}">Bed ${b}</option>`).join('');
    const mates = (occ[`${block}-${no}`] || []).filter(m => m.id !== id);
    $('#roomMates').innerHTML = mates.length
      ? `<div class="sectionlbl">Current occupants of room ${no}</div><div class="beds">${mates.map(m => bedCard(m)).join('')}</div>`
      : `<div class="callout">Room ${no} is empty right now.</div>`;
  };
  if ($('#roomSel')) { $('#roomSel').onchange = refresh; refresh(); }
}

function bedCard(a) {
  return `<div class="bed" data-bio="${esc(a.id)}">${avatar(a)}
    <div style="min-width:0">
      <div class="person__n">${esc(a.student.name)}</div>
      <div class="person__s">${esc(a.academic.course)} · ${esc(a.academic.year)}</div>
      <div class="bed__no">Bed ${a.room ? a.room.bed : '—'} · ${esc(a.rollNo)}</div>
    </div></div>`;
}

/* ============================================================
   Authority (HOD / Principal / Chief Warden)
   ============================================================ */

function renderAuthority(signedView) {
  const s = requireRole(['hod', 'principal', 'cw']);
  if (!s) return;
  const key = s.role;
  const label = AUTHORITY[key].label;

  let pool = State.apps().filter(a => (a.status === 'ACTIVE' || a.status === 'SUCCESS') && !a.alumni);
  if (key === 'hod' && s.dept) pool = pool.filter(a => a.academic.course === s.dept);

  const waiting = pool.filter(a => !a.approvals[key]);
  const signed = pool.filter(a => a.approvals[key]);
  const list = signedView ? signed : waiting;

  shell({
    title: signedView ? 'Signed by me' : 'Awaiting your signature',
    sub: `${s.name}${key === 'hod' && s.dept ? ` · ${s.dept} department` : ''} · signature applied from your stored specimen`,
    body: `
      <div class="grid-m">
        <div class="metric metric--orange"><div class="metric__k">Waiting for your signature</div><div class="metric__v">${waiting.length}</div><div class="metric__d">verified by warden</div></div>
        <div class="metric metric--green"><div class="metric__k">You have signed</div><div class="metric__v">${signed.length}</div><div class="metric__d">this session</div></div>
        <div class="metric metric--blue"><div class="metric__k">Fully approved</div><div class="metric__v">${pool.filter(a => approvalCount(a) === 3).length}</div><div class="metric__d">3 of 3</div></div>
      </div>

      ${signedView ? '' : `<div class="callout">Signing here does not block anyone. The other two authorities can sign before or after you, in any order.</div>`}

      <div class="card">
        <div class="card__head"><div><h3>${signedView ? 'Files you have signed' : 'Files waiting for you'}</h3>
          <p>${list.length} record${list.length === 1 ? '' : 's'}</p></div></div>
        ${list.length ? `<div class="tablescroll"><table class="data">
          <thead><tr><th>Student</th><th>Branch</th><th>Year</th><th>Rank</th><th>Progress</th><th>Room</th><th>${signedView ? 'Signed on' : 'Verified'}</th><th></th></tr></thead>
          <tbody>${list.slice(0, 120).map(a => `<tr class="clickable" data-bio="${esc(a.id)}">
            <td>${personCell(a)}</td><td>${esc(a.academic.course)}</td><td>${esc(a.academic.year)}</td>
            <td class="num">${a.academic.eamcetRank}</td><td>${pill(a)}</td><td class="num">${esc(roomLabel(a))}</td>
            <td class="cell-sub">${dt(signedView ? a.approvals[key].at : a.wardenReview.at, false)}</td>
            <td style="text-align:right">${signedView ? '' : `<button class="btn btn--primary btn--sm" data-sign="${esc(a.id)}">Sign</button>`}</td>
          </tr>`).join('')}</tbody></table></div>`
          : `<div class="empty"><h4>${signedView ? 'No signatures yet' : 'Nothing waiting'}</h4>
              <p>${signedView ? 'Open the queue and sign a file to see it here.' : 'Every verified application already carries your signature.'}</p></div>`}
      </div>`
  });

  wireRowActions();
}

function openSign(id) {
  const a = State.app(id);
  const s = State.session();
  const key = s.role;
  openModal({
    title: a.student.name,
    sub: `<span class="mono">${esc(a.id)}</span> · verified by ${esc(a.wardenReview.by)} on ${dt(a.wardenReview.at, false)}`,
    wide: true,
    body: bioBody(a) + `<div class="sectionlbl">Your signature</div>
      <div class="sig" style="max-width:240px"><div class="sig__ink">${sigSvg(key)}</div>
      <div class="sig__name">${esc(AUTHORITY[key].name)}</div>
      <div class="sig__role">${AUTHORITY[key].label} · stored specimen</div></div>`,
    actions: [
      { label: 'Close', run: c => c() },
      { label: 'Apply signature and approve', cls: 'btn--primary', run: c => {
        const rec = JSON.parse(JSON.stringify(State.app(id)));
        const now = new Date().toISOString();
        rec.approvals[key] = { by: AUTHORITY[key].name, at: now };
        rec.status = 'SUCCESS';
        rec.history.push({ at: now, label: `Signed by ${AUTHORITY[key].label}`, by: AUTHORITY[key].name });
        State.put(rec); c(); route();
        const n = approvalCount(rec);
        toast(n === 3 ? 'Final approval complete — ready for room allotment.' : `Signed. ${n} of 3 collected.`, 'ok');
      } }
    ]
  });
}

/* ============================================================
   Admin
   ============================================================ */

function renderAdminOverview() {
  const s = requireRole(['admin']);
  if (!s) return;
  const apps = State.apps().filter(a => !a.alumni);
  const residents = apps.filter(a => a.room);
  const b = a => statusInfo(a).bucket;

  shell({
    title: 'Overview',
    sub: `Session ${SESSION_LABEL} · ${TOTAL_BEDS} beds across ${BLOCKS.length} blocks`,
    actions: `<button class="btn btn--ghost btn--sm" data-go="#/admin/students">Student directory</button>`,
    body: `
      <div class="grid-m">
        <div class="metric metric--blue"><div class="metric__k">Applications</div><div class="metric__v">${apps.length}</div><div class="metric__d">this session</div></div>
        <div class="metric metric--orange"><div class="metric__k">Pending</div><div class="metric__v">${apps.filter(a => b(a) === 'pending').length}</div><div class="metric__d">with warden</div></div>
        <div class="metric metric--blue"><div class="metric__k">Awaiting signatures</div><div class="metric__v">${apps.filter(a => b(a) === 'active').length}</div><div class="metric__d">verified files</div></div>
        <div class="metric metric--green"><div class="metric__k">Fully approved</div><div class="metric__v">${apps.filter(a => b(a) === 'approved').length}</div><div class="metric__d">3 of 3 signed</div></div>
        <div class="metric metric--red"><div class="metric__k">Sent back</div><div class="metric__v">${apps.filter(a => b(a) === 'rejected').length}</div><div class="metric__d">awaiting resubmission</div></div>
        <div class="metric metric--green"><div class="metric__k">Beds occupied</div><div class="metric__v">${residents.length}</div><div class="metric__d">${Math.round(residents.length / TOTAL_BEDS * 100)}% of ${TOTAL_BEDS}</div></div>
      </div>

      <div class="chartgrid">
        <div class="card"><div class="card__head"><div><h3>Applications by department</h3><p>Split by approval stage</p></div></div>
          <div class="card__body"><div class="chartbox"><canvas id="chDept"></canvas></div></div></div>
        <div class="card"><div class="card__head"><div><h3>Where files are sitting</h3><p>Current status of every application</p></div></div>
          <div class="card__body"><div class="chartbox"><canvas id="chStatus"></canvas></div></div></div>
      </div>

      <div class="chartgrid">
        <div class="card"><div class="card__head"><div><h3>Submissions per day</h3><p>Last 14 days</p></div></div>
          <div class="card__body"><div class="chartbox"><canvas id="chDaily"></canvas></div></div></div>
        <div class="card"><div class="card__head"><div><h3>Block occupancy</h3><p>Beds filled per block</p></div></div>
          <div class="card__body statline">
            ${BLOCKS.map(bl => {
              const cap = FLOORS.length * ROOMS_PER_FLOOR * BEDS_PER_ROOM;
              const n = residents.filter(a => a.room.block === bl.key).length;
              return `<div><div class="statrow"><span>${bl.name} · ${bl.year}</span><b>${n}/${cap}</b></div>
                <div class="bar"><span style="width:${(n / cap) * 100}%"></span></div></div>`;
            }).join('')}
            <div style="margin-top:6px">
              ${['hod', 'principal', 'cw'].map(k => {
                const ver = apps.filter(a => a.wardenReview);
                const done = ver.filter(a => a.approvals[k]).length;
                const pct = ver.length ? Math.round(done / ver.length * 100) : 0;
                return `<div style="margin-top:10px"><div class="statrow"><span>${AUTHORITY[k].label} signature turnout</span><b>${pct}%</b></div>
                  <div class="bar bar--blue"><span style="width:${pct}%"></span></div></div>`;
              }).join('')}
            </div>
          </div></div>
      </div>`
  });

  drawCharts(apps);
}

function renderAdminApplications() {
  const s = requireRole(['admin']);
  if (!s) return;
  const f = F.apps;
  const all = State.apps();
  const list = all.filter(a => matchApp(a, f));

  shell({
    title: 'Applications',
    sub: 'Every file, including passed-out students',
    actions: `<button class="btn btn--ghost btn--sm" id="csvBtn">Export CSV</button>`,
    body: `
      <div class="filters">
        <input class="input input--search" data-f="q" value="${esc(f.q)}" placeholder="Search name, roll number, phone or room" />
        <select class="select" data-f="status"><option value="">All statuses</option>${selOpts(['pending', 'active', 'approved', 'rejected', 'alumni'], f.status)}</select>
        <select class="select" data-f="course"><option value="">All branches</option>${selOpts(COURSES, f.course)}</select>
        <select class="select" data-f="year"><option value="">All years</option>${selOpts(YEARS, f.year)}</select>
        <span class="filters__spacer"></span><span class="filters__count">${list.length} of ${all.length}</span>
      </div>
      ${appsTable(list, f)}`
  });

  $('#csvBtn').onclick = () => exportCsv(list, 'anu-hostel-applications.csv');
  wireFilters(f, renderAdminApplications);
  wireRowActions();
}

function renderDirectory(role) {
  const s = requireRole(role === 'admin' ? ['admin'] : ['warden']);
  if (!s) return;
  const f = F.dir;
  const all = State.apps().filter(a => a.room || approvalCount(a) === 3);
  const list = all.filter(a => {
    if (!matchApp(a, f)) return false;
    if (f.occupancy === 'allotted' && !a.room) return false;
    if (f.occupancy === 'unallotted' && a.room) return false;
    return true;
  });
  const rows = slice(list, f);

  shell({
    title: role === 'admin' ? 'Student directory' : 'Residents',
    sub: `${all.filter(a => a.room).length} students in residence · click a row for full bio-data`,
    actions: `${role === 'admin' ? `<button class="btn btn--ghost btn--sm" id="promoteBtn">Promote academic year</button>` : ''}
      <button class="btn btn--ghost btn--sm" id="csvBtn">Export CSV</button>`,
    body: `
      <div class="filters">
        <input class="input input--search" data-f="q" value="${esc(f.q)}" placeholder="Search name, roll number, phone, room or district" />
        <select class="select" data-f="block"><option value="">All blocks</option>${selOpts(BLOCKS.map(b => b.key), f.block)}</select>
        <select class="select" data-f="floor"><option value="">All floors</option>
          ${FLOORS.map(fl => `<option value="${fl.idx}" ${String(fl.idx) === f.floor ? 'selected' : ''}>${fl.label}</option>`).join('')}</select>
        <select class="select" data-f="year"><option value="">All years</option>${selOpts(YEARS, f.year)}</select>
        <select class="select" data-f="course"><option value="">All branches</option>${selOpts(COURSES, f.course)}</select>
        <select class="select" data-f="district"><option value="">All districts</option>${selOpts(DISTRICTS, f.district)}</select>
        <select class="select" data-f="occupancy"><option value="">Room: any</option>
          <option value="allotted" ${f.occupancy === 'allotted' ? 'selected' : ''}>Allotted</option>
          <option value="unallotted" ${f.occupancy === 'unallotted' ? 'selected' : ''}>Not allotted</option></select>
        <span class="filters__spacer"></span><span class="filters__count">${list.length} of ${all.length}</span>
      </div>

      <div class="card">
        <div class="tablescroll"><table class="data">
          <thead><tr><th>Student</th><th>Hostel ID</th><th>Branch</th><th>Year</th><th>Block</th><th>Room · bed</th><th>Card</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows.length ? rows.map(a => `<tr class="clickable" data-bio="${esc(a.id)}">
            <td>${personCell(a)}</td><td class="num" style="color:var(--blue);font-weight:600">${esc(a.hostelId)}</td>
            <td>${esc(a.academic.course)}</td><td>${esc(a.academic.year)}</td>
            <td>${a.room ? 'Block ' + esc(a.room.block) : '—'}</td>
            <td class="num">${a.room ? a.room.roomNo + ' · ' + a.room.bed : '—'}</td>
            <td>${a.validTill ? `<span class="pill pill--${cardValid(a) ? 'final' : 'rejected'}">${cardValid(a) ? 'Valid' : 'Expired'}</span>` : '<span class="cell-sub">—</span>'}</td>
            <td>${pill(a)}</td>
            <td style="text-align:right;white-space:nowrap">
              ${role === 'admin' ? `<button class="btn btn--ghost btn--sm" data-editrow="${esc(a.id)}">Edit</button>` : ''}
              <button class="btn btn--blue btn--sm" data-allot="${esc(a.id)}">${a.room ? 'Move' : 'Allot'}</button>
            </td></tr>`).join('')
            : `<tr><td colspan="9"><div class="empty"><h4>No students match these filters</h4><p>Clear a filter to widen the search.</p></div></td></tr>`}
          </tbody></table></div>
        ${pager(list.length, f)}
      </div>`
  });

  $('#csvBtn').onclick = () => exportCsv(list, 'anu-hostel-students.csv');
  const pb = $('#promoteBtn');
  if (pb) pb.onclick = promoteYear;
  wireFilters(f, () => renderDirectory(role));
  wireRowActions();
}

function promoteYear() {
  openModal({
    title: 'Promote a student',
    sub: 'Renews the hostel ID validity into the next academic year',
    body: `
      <div class="field">
        <label for="promoPick">Student <span class="req">*</span></label>
        <input class="input" id="promoPick" placeholder="Type a name or hostel ID" autocomplete="off" />
        <div class="err hidden" data-err="promoPick"></div>
        <div id="promoMatches" class="promomatches"></div>
      </div>
      <div id="promoCard"></div>
      <div class="promobulk">
        <span class="muted" style="font-size:12.5px">Starting a new session for everyone at once?</span>
        <button class="btn btn--ghost btn--sm" id="promoBulk">Bulk promote all →</button>
      </div>`,
    actions: [{ label: 'Close', run: c => c() }]
  });

  let chosen = null;
  const pick = $('#promoPick');
  const matches = $('#promoMatches');

  pick.oninput = () => {
    const q = pick.value.trim().toLowerCase();
    chosen = null; $('#promoCard').innerHTML = '';
    if (q.length < 2) { matches.innerHTML = ''; return; }
    const hits = State.apps().filter(a => !a.alumni &&
      (a.student.name.toLowerCase().includes(q) || a.hostelId.toLowerCase().includes(q))).slice(0, 6);
    matches.innerHTML = hits.map(a => `<button class="promomatch" data-pick="${esc(a.id)}">
      ${avatar(a, 'av--sm')}<div style="min-width:0"><div class="person__n">${esc(a.student.name)}</div>
      <div class="person__s mono">${esc(a.hostelId)} · ${esc(a.academic.year)}</div></div></button>`).join('');
    matches.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => selectPromo(b.dataset.pick));
  };

  function selectPromo(id) {
    chosen = State.app(id);
    pick.value = chosen.student.name;
    matches.innerHTML = '';
    const idx = YEARS.indexOf(chosen.academic.year);
    const isFinal = idx === 3;
    $('#promoCard').innerHTML = `
      <div class="promopanel">
        <div class="bed" style="cursor:default">${avatar(chosen)}<div>
          <div class="person__n">${esc(chosen.student.name)}</div>
          <div class="person__s mono">${esc(chosen.hostelId)} · ${esc(chosen.academic.course)}</div></div></div>
        <div class="promopanel__arrow">
          <span class="tag">${esc(chosen.academic.year)}</span> →
          <span class="tag" style="background:var(--green-100);color:var(--green-700);border-color:#A9DDC2">${isFinal ? 'Passed out' : YEARS[idx + 1] + ' · Block ' + BLOCK_OF_YEAR[YEARS[idx + 1]]}</span>
        </div>

        ${isFinal ? `<div class="callout callout--orange">This student is in the final year. Promoting marks them passed out and releases their bed.</div>` : `
        <div class="sectionlbl">Promotion proof</div>
        <div class="uploads">
          <div class="drop" id="dropYear"><div class="drop__t">Promoted-year proof <span class="req">*</span></div>
            <div class="drop__s">Pass memo or promotion letter — image or PDF</div>
            <input type="file" accept="image/*,.pdf" id="fileYear"><div class="filerow hidden" id="rowYear"></div></div>
          <div class="drop" id="dropPay"><div class="drop__t">Fee payment screenshot <span class="req">*</span></div>
            <div class="drop__s">This year's hostel fee ${inr(FEE)}</div>
            <input type="file" accept="image/*,.pdf" id="filePay"><div class="filerow hidden" id="rowPay"></div></div>
        </div>
        <div class="err hidden" data-err="promoProof"></div>`}

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
          <button class="btn ${isFinal ? 'btn--danger' : 'btn--blue'}" id="promoGo">${isFinal ? 'Mark passed out' : 'Submit promotion'}</button>
        </div>
      </div>`;

    const proof = { year: null, pay: null };
    const bind = (inputId, rowId, key) => {
      const el = $('#' + inputId);
      if (!el) return;
      el.onchange = () => { const f = el.files[0]; if (!f) return;
        proof[key] = f.name; const r = $('#' + rowId); r.textContent = '✓ ' + f.name; r.classList.remove('hidden');
        el.closest('.drop').classList.add('is-filled'); };
    };
    bind('fileYear', 'rowYear', 'year');
    bind('filePay', 'rowPay', 'pay');

    $('#promoGo').onclick = () => {
      if (!isFinal && (!proof.year || !proof.pay)) {
        const el = document.querySelector('[data-err="promoProof"]');
        el.textContent = 'Attach both the promotion proof and the fee payment screenshot.';
        el.classList.remove('hidden'); return;
      }
      const rec = JSON.parse(JSON.stringify(chosen));
      const now = new Date().toISOString();
      const i = YEARS.indexOf(rec.academic.year);
      if (i === 3) {
        rec.academic.year = 'Passed out'; rec.alumni = true; rec.validTill = null;
        rec.history.push({ at: now, label: 'Marked passed out', by: State.session().name });
        if (rec.room) { rec.history.push({ at: now, label: `Bed released — Block ${rec.room.block}, room ${rec.room.roomNo}`, by: State.session().name }); rec.room = null; }
      } else {
        rec.academic.year = YEARS[i + 1];
        rec.validYear = rec.academic.year;
        const endY = rec.validTill ? new Date(rec.validTill).getUTCFullYear() + 1 : SESSION_END_YEAR + 1;
        rec.validTill = new Date(Date.UTC(endY, 3, 30, 23, 59)).toISOString();
        if (rec.room) rec.room.block = BLOCK_OF_YEAR[rec.academic.year];
        rec.payment.txnRef = 'UPI-RENEW-' + Math.floor(Math.random() * 1e9);
        rec.history.push({ at: now, label: `Promoted to ${rec.academic.year} · card renewed to ${dt(rec.validTill, false)}`, by: State.session().name });
        rec.history.push({ at: now, label: `Promotion proof: ${proof.year} · fee: ${proof.pay}`, by: State.session().name });
      }
      State.put(rec); closeModal(); route();
      toast(i === 3 ? `${rec.student.name.split(' ')[0]} marked passed out.` : `Promoted to ${rec.academic.year}. Card valid till ${dt(rec.validTill, false)}.`, 'ok');
    };
  }

  $('#promoBulk').onclick = bulkPromote;
}

function bulkPromote() {
  const apps = State.apps().filter(a => !a.alumni);
  const finals = apps.filter(a => a.academic.year === '4th Year').length;
  openModal({
    title: 'Bulk promote — new session',
    sub: 'Every student moves up one year',
    body: `<div class="callout callout--orange">Everyone shifts A → B → C → D and their hostel ID validity extends one year.
      <b>${finals}</b> final-year students are marked passed out and their beds released. This skips per-student proof.</div>
      <div class="reviewgroup">${YEARS.map((y, i) => `<div class="kv"><div class="kv__k">${y}</div>
        <div class="kv__v">${apps.filter(a => a.academic.year === y).length} students → ${i === 3 ? 'Passed out' : YEARS[i + 1] + ' · Block ' + BLOCK_OF_YEAR[YEARS[i + 1]]}</div></div>`).join('')}</div>`,
    actions: [
      { label: 'Cancel', run: c => c() },
      { label: 'Promote everyone', cls: 'btn--blue', run: c => { State.saved.promotions += 1; State.save(); c(); route(); toast('Session promoted for all students.', 'ok'); } }
    ]
  });
}

function openEditStudent(id) {
  const a = State.app(id);
  if (!a) return;
  openModal({
    title: 'Edit student details',
    sub: `<span class="mono">${esc(a.rollNo)}</span> · ${esc(a.student.name)}`,
    wide: true,
    body: `
      <div class="sectionlbl">Personal</div>
      ${field('e_name', 'Full name', a.student.name)}
      <div class="grid3">
        ${field('e_phone', 'Phone', a.student.phone)}
        ${field('e_email', 'Email', a.student.email, { type: 'email' })}
        ${selectField('e_blood', 'Blood group', a.student.bloodGroup, ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'], 'Select')}
      </div>

      <div class="sectionlbl">Parent</div>
      <div class="grid2">
        ${field('e_father', "Father's name", a.parent.father)}
        ${field('e_mother', "Mother's name", a.parent.mother)}
      </div>
      <div class="grid2">
        ${selectField('e_occ', 'Occupation', a.parent.occupation, OCCUPATIONS, 'Select')}
        ${field('e_pphone', 'Parent phone', a.parent.phone)}
      </div>

      <div class="sectionlbl">Address</div>
      <div class="grid3">
        ${field('e_village', 'Village or town', a.address.village)}
        ${selectField('e_mandal', 'Mandal', a.address.mandal, MANDALS, 'Select')}
        ${selectField('e_district', 'District', a.address.district, DISTRICTS, 'Select')}
      </div>

      <div class="sectionlbl">Academic</div>
      <div class="grid3">
        ${selectField('e_course', 'Branch', a.academic.course, COURSES, 'Select')}
        ${selectField('e_year', 'Year of study', a.academic.year, YEARS, 'Select')}
        ${selectField('e_cat', 'Category', a.academic.category, CATEGORIES, 'Select')}
      </div>
      <div class="callout">Changing the year does not move the student's bed. Use <b>Allot room</b> after saving if the block should change.</div>`,
    actions: [
      { label: 'Cancel', run: c => c() },
      { label: 'Save changes', cls: 'btn--blue', run: c => {
        const v = id2 => $('#' + id2).value.trim();
        if (v('e_name').length < 3) return showErr('e_name', 'Enter the full name.');
        if (!/^[6-9]\d{9}$/.test(v('e_phone').replace(/\s/g, ''))) return showErr('e_phone', 'Enter a 10-digit mobile number.');
        const rec = JSON.parse(JSON.stringify(State.app(id)));
        rec.student.name = v('e_name'); rec.student.phone = v('e_phone'); rec.student.email = v('e_email'); rec.student.bloodGroup = v('e_blood');
        rec.parent.father = v('e_father'); rec.parent.mother = v('e_mother'); rec.parent.occupation = v('e_occ'); rec.parent.phone = v('e_pphone');
        rec.address.village = v('e_village'); rec.address.mandal = v('e_mandal'); rec.address.district = v('e_district');
        rec.academic.course = v('e_course'); rec.academic.year = v('e_year'); rec.academic.category = v('e_cat');
        rec.history.push({ at: new Date().toISOString(), label: 'Details updated by hostel office', by: State.session().name });
        State.put(rec); c(); route();
        toast('Student details updated.', 'ok');
      } }
    ]
  });
}

/* ---------- charts ---------- */

let CHARTS = [];
function destroyCharts() { CHARTS.forEach(c => { try { c.destroy(); } catch (e) {} }); CHARTS = []; }

function drawCharts(apps) {
  if (typeof Chart === 'undefined') return;
  destroyCharts();
  const BLUE = '#14509B', LIGHT = '#5C8FD6', ORANGE = '#F07A13', GREEN = '#12915A', RED = '#C8372D';
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.color = '#64748B';
  const b = a => statusInfo(a).bucket;

  const dept = COURSES.map(c => apps.filter(a => a.academic.course === c));
  CHARTS.push(new Chart($('#chDept'), {
    type: 'bar',
    data: {
      labels: COURSES,
      datasets: [
        { label: 'Pending', data: dept.map(d => d.filter(a => b(a) === 'pending').length), backgroundColor: ORANGE, borderRadius: 4 },
        { label: 'Awaiting signatures', data: dept.map(d => d.filter(a => b(a) === 'active').length), backgroundColor: LIGHT, borderRadius: 4 },
        { label: 'Fully approved', data: dept.map(d => d.filter(a => b(a) === 'approved').length), backgroundColor: GREEN, borderRadius: 4 },
        { label: 'Sent back', data: dept.map(d => d.filter(a => b(a) === 'rejected').length), backgroundColor: RED, borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EFF2F7' } } },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 9, usePointStyle: true, pointStyle: 'circle' } } }
    }
  }));

  const counts = ['pending', 'active', 'approved', 'rejected'].map(k => apps.filter(a => b(a) === k).length);
  CHARTS.push(new Chart($('#chStatus'), {
    type: 'doughnut',
    data: { labels: ['Pending with warden', 'Awaiting signatures', 'Fully approved', 'Sent back'],
      datasets: [{ data: counts, backgroundColor: [ORANGE, LIGHT, GREEN, RED], borderWidth: 0, hoverOffset: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 9, usePointStyle: true, pointStyle: 'circle' } } } }
  }));

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toDateString();
    days.push({ label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), n: apps.filter(a => new Date(a.submittedAt).toDateString() === key).length });
  }
  CHARTS.push(new Chart($('#chDaily'), {
    type: 'line',
    data: { labels: days.map(d => d.label), datasets: [{ label: 'Applications', data: days.map(d => d.n), borderColor: BLUE, backgroundColor: 'rgba(20,80,155,.12)', fill: true, tension: .35, pointRadius: 3, pointBackgroundColor: BLUE }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EFF2F7' } } }, plugins: { legend: { display: false } } }
  }));
}

/* ============================================================
   Hostel view — 3D campus, 3D block, 2D floor plan
   ============================================================ */

const HV = { block: 'A', view: '3d', mode: 'campus' };

function blockStats(key) {
  const occ = occupancyIndex();
  const maint = State.maintenanceSet();
  const cap = FLOORS.length * ROOMS_PER_FLOOR * BEDS_PER_ROOM;
  let filled = 0, full = 0, part = 0, empty = 0, maintCount = 0;
  const floors = FLOORS.map(f => ({ label: f.label, idx: f.idx, filled: 0, cap: ROOMS_PER_FLOOR * BEDS_PER_ROOM }));

  FLOORS.forEach(f => roomNumbersOf(f.idx).forEach(no => {
    const id = `${key}-${no}`;
    if (maint.has(id)) { maintCount++; return; }
    const n = (occ[id] || []).length;
    filled += n;
    floors[f.idx].filled += n;
    if (n === 0) empty++; else if (n === BEDS_PER_ROOM) full++; else part++;
  }));

  return { cap, filled, free: cap - filled - maintCount * BEDS_PER_ROOM, full, part, empty, maint: maintCount, floors };
}

function roomState(block, no, occ, maint) {
  const id = `${block}-${no}`;
  if (maint.has(id)) return { cls: 'maint', n: 0, label: 'Maintenance' };
  const n = (occ[id] || []).length;
  return { cls: n === 0 ? 'empty' : n === BEDS_PER_ROOM ? 'full' : 'part', n, label: `${n}/${BEDS_PER_ROOM} occupied` };
}

function renderHostelPage(role) {
  const s = requireRole(role === 'student' ? ['student'] : role === 'authority' ? ['hod', 'principal', 'cw'] : [role]);
  if (!s) return;

  const me = role === 'student' ? myApplication() : null;
  if (me && me.room) { HV.block = me.room.block; HV.mode = 'block'; }

  const canEdit = s.role === 'warden' || s.role === 'admin';
  const st = blockStats(HV.block);
  const bl = BLOCKS.find(b => b.key === HV.block);

  shell({
    title: role === 'student' ? 'My room' : 'Hostel and rooms',
    sub: `${BLOCKS.length} blocks · ${FLOORS.length} floors each · ${ROOMS_PER_FLOOR} rooms per floor · ${BEDS_PER_ROOM} beds per room`,
    actions: `<div class="segbar" id="viewSeg">
        <button data-view="3d" class="${HV.view === '3d' ? 'is-on' : ''}">3D view</button>
        <button data-view="plan" class="${HV.view === 'plan' ? 'is-on' : ''}">Floor plan</button>
      </div>`,
    body: `
      <div class="blocktabs" id="blockTabs">
        ${BLOCKS.map(b => {
          const bs = blockStats(b.key);
          return `<button class="blocktab ${HV.block === b.key ? 'is-on' : ''}" data-block="${b.key}">
            <b>${b.name}</b><span>${b.year}</span><em>${bs.filled}/${bs.cap} beds</em></button>`;
        }).join('')}
      </div>

      <div class="hostelgrid">
        <div>
          ${HV.view === '3d' ? `<div class="viewer">
              <canvas id="scene3d"></canvas>
              <div class="viewer__bar">
                <span class="viewer__crumb" id="crumb"></span>
                <button class="btn btn--ghost btn--sm" id="backCampus">All blocks</button>
              </div>
              <div class="viewer__hint">Drag to rotate · scroll to zoom · click a room to open it</div>
            </div>`
            : `<div class="card"><div class="card__head"><div><h3>${esc(bl.name)} floor plan</h3><p>${esc(bl.year)} · rooms ${roomNumbersOf(0)[0]}–${roomNumbersOf(2)[19]}</p></div>
                <span class="card__spacer"></span>${legendHtml()}</div>
              <div class="card__body floorplan">${FLOORS.map(f => floorPlanHtml(HV.block, f)).join('')}</div></div>`}
          ${HV.view === '3d' ? `<div class="card" style="margin-top:18px"><div class="card__body">${legendHtml()}</div></div>` : ''}
        </div>

        <div class="stack">
          ${me ? myRoomCard(me) : ''}
          <div class="card">
            <div class="card__head"><div><h3>${esc(bl.name)}</h3><p>${esc(bl.year)} · warden ${esc(bl.warden)}</p></div></div>
            <div class="card__body statline">
              <div><div class="statrow"><span>Beds occupied</span><b>${st.filled}/${st.cap}</b></div>
                <div class="bar"><span style="width:${st.filled / st.cap * 100}%"></span></div></div>
              ${st.floors.map(f => `<div><div class="statrow"><span>${f.label}</span><b>${f.filled}/${f.cap}</b></div>
                <div class="bar bar--blue"><span style="width:${f.filled / f.cap * 100}%"></span></div></div>`).join('')}
              <div class="statrow" style="border-top:1px solid var(--line-soft);padding-top:10px"><span>Rooms full</span><b>${st.full}</b></div>
              <div class="statrow"><span>Rooms partly filled</span><b>${st.part}</b></div>
              <div class="statrow"><span>Rooms empty</span><b>${st.empty}</b></div>
              <div class="statrow"><span>Under maintenance</span><b>${st.maint}</b></div>
            </div>
          </div>

          <div class="card">
            <div class="card__head"><div><h3>Open a room</h3><p>Type a room number in this block</p></div></div>
            <div class="card__body">
              <div style="display:flex;gap:8px">
                <input class="input" id="roomJump" placeholder="e.g. 214" inputmode="numeric" />
                <button class="btn btn--blue" id="roomJumpBtn">Open</button>
              </div>
              <div class="err hidden" data-err="roomJump"></div>
            </div>
          </div>

          ${canEdit ? `<div class="card"><div class="card__head"><div><h3>Recently allotted</h3><p>Last five beds assigned</p></div></div>
            <div class="card__body" style="display:grid;gap:9px">
              ${State.apps().filter(a => a.room && a.room.assignedAt).sort((a, b) => new Date(b.room.assignedAt) - new Date(a.room.assignedAt)).slice(0, 5)
                .map(a => `<div class="bed" data-bio="${esc(a.id)}">${avatar(a, 'av--sm')}<div style="min-width:0">
                  <div class="person__n">${esc(a.student.name)}</div>
                  <div class="person__s">Block ${esc(a.room.block)} · ${a.room.roomNo} · bed ${a.room.bed}</div></div></div>`).join('')}
            </div></div>` : ''}
        </div>
      </div>`
  });

  /* wiring */
  $('#blockTabs').onclick = e => {
    const b = e.target.closest('[data-block]');
    if (!b) return;
    HV.block = b.dataset.block; HV.mode = 'block';
    renderHostelPage(role);
  };
  $('#viewSeg').onclick = e => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    HV.view = b.dataset.view;
    renderHostelPage(role);
  };

  const jump = () => {
    const no = +$('#roomJump').value;
    const valid = FLOORS.some(f => roomNumbersOf(f.idx).includes(no));
    if (!valid) return showErr('roomJump', `Enter a room between 101–120, 201–220 or 301–320.`);
    openRoomModal(HV.block, no);
  };
  $('#roomJumpBtn').onclick = jump;
  $('#roomJump').onkeydown = e => { if (e.key === 'Enter') jump(); };

  $('#content').addEventListener('click', e => {
    const cell = e.target.closest('[data-room]');
    if (cell) return openRoomModal(cell.dataset.block, +cell.dataset.room);
  });
  wireRowActions();

  if (HV.view === '3d') {
    const back = $('#backCampus');
    back.onclick = () => { HV.mode = 'campus'; buildScene(); };
    HV.mode = HV.mode === 'campus' ? 'campus' : 'block';
    initScene();
  }
}

function legendHtml() {
  return `<div class="legend">
    <span><i style="background:var(--green-100);border-color:#A9DDC2"></i>Full (4/4)</span>
    <span><i style="background:var(--orange-100);border-color:#F6CFA6"></i>Partly filled</span>
    <span><i style="background:#fff"></i>Empty</span>
    <span><i style="background:var(--red-100);border-color:#EFB9B4"></i>Maintenance</span>
  </div>`;
}

function floorPlanHtml(block, floor) {
  const occ = occupancyIndex();
  const maint = State.maintenanceSet();
  const nums = roomNumbersOf(floor.idx);
  const filled = nums.reduce((s, n) => s + ((occ[`${block}-${n}`] || []).length), 0);

  /* the same quadrangle as the 3D block: 5 rooms to a side, courtyard in the middle */
  const areaOf = i => {
    const wing = Math.floor(i / 5), k = i % 5;
    if (wing === 0) return `1 / ${k + 2} / 2 / ${k + 3}`;       // north, left to right
    if (wing === 1) return `${k + 2} / 7 / ${k + 3} / 8`;        // east, top to bottom
    if (wing === 2) return `7 / ${6 - k} / 8 / ${7 - k}`;        // south, right to left
    return `${6 - k} / 1 / ${7 - k} / 2`;                        // west, bottom to top
  };

  const cells = nums.map((no, i) => {
    const st = roomState(block, no, occ, maint);
    return `<button class="roomcell roomcell--${st.cls}" style="grid-area:${areaOf(i)}" data-room="${no}" data-block="${block}"
      title="Room ${no} — ${st.label}"><b>${no}</b><span>${st.cls === 'maint' ? 'maint' : st.n + '/4'}</span></button>`;
  }).join('');

  return `<div class="floorrow">
    <div class="floorrow__head"><h4>${floor.label}</h4>
      <span class="pill pill--plain">${nums[0]}–${nums[19]}</span>
      <span class="cell-sub">${filled}/${ROOMS_PER_FLOOR * BEDS_PER_ROOM} beds occupied</span></div>
    <div class="quad">
      ${cells}
      <div class="quad__yard">Courtyard<span>corridor runs around all four wings</span></div>
    </div>
  </div>`;
}

function myRoomCard(me) {
  if (!me || !me.room) {
    return `<div class="card"><div class="card__head"><div><h3>My room</h3><p>Not allotted yet</p></div></div>
      <div class="card__body"><p style="margin:0;font-size:13.5px;color:var(--muted)">
      Your block will be <b>${esc(BLOCK_OF_YEAR[me ? me.academic.year : ''] || '—')}</b>. The warden allots the exact room after all three signatures.</p></div></div>`;
  }
  const mates = (occupancyIndex()[`${me.room.block}-${me.room.roomNo}`] || []).filter(m => m.id !== me.id);
  return `<div class="card"><div class="card__head"><div><h3>My room</h3>
    <p>Block ${esc(me.room.block)} · ${esc(FLOORS[me.room.floorIdx].label)} · room ${me.room.roomNo}, bed ${me.room.bed}</p></div></div>
    <div class="card__body">
      <button class="btn btn--blue btn--sm btn--wide" data-room="${me.room.roomNo}" data-block="${esc(me.room.block)}">Open my room</button>
      <div class="sectionlbl">Roommates (${mates.length})</div>
      ${mates.length ? `<div style="display:grid;gap:9px">${mates.map(m => bedCard(m)).join('')}</div>`
        : `<p style="margin:0;font-size:13px;color:var(--muted)">No roommates yet — the other beds are free.</p>`}
    </div></div>`;
}

function openRoomModal(block, no) {
  const occ = occupancyIndex();
  const maint = State.maintenanceSet();
  const st = roomState(block, no, occ, maint);
  const people = occ[`${block}-${no}`] || [];
  const s = State.session();
  const canEdit = s.role === 'warden' || s.role === 'admin';
  const floor = FLOORS[Math.floor(no / 100) - 1];

  const beds = [1, 2, 3, 4].map(b => {
    const who = people.find(p => p.room.bed === b);
    if (who) return bedCard(who);
    if (st.cls === 'maint') return `<div class="bed bed--free">Bed ${b} · room under maintenance</div>`;
    return `<div class="bed bed--free">Bed ${b} free${canEdit ? ` · <button class="btn--link" data-assign="${b}">Assign a student</button>` : ''}</div>`;
  }).join('');

  openModal({
    title: `Block ${block} · Room ${no}`,
    sub: `${esc(floor.label)} · ${esc(YEAR_OF_BLOCK[block])} · ${st.cls === 'maint' ? 'under maintenance' : st.label}`,
    body: `<div class="beds">${beds}</div>
      <div class="sectionlbl">Room</div>
      <div class="reviewgroup">
        <div class="kv"><div class="kv__k">Block and floor</div><div class="kv__v">Block ${esc(block)} · ${esc(floor.label)}</div></div>
        <div class="kv"><div class="kv__k">Capacity</div><div class="kv__v">${BEDS_PER_ROOM} beds</div></div>
        <div class="kv"><div class="kv__k">Occupied</div><div class="kv__v">${people.length} of ${BEDS_PER_ROOM}</div></div>
        <div class="kv"><div class="kv__k">Reserved for</div><div class="kv__v">${esc(YEAR_OF_BLOCK[block])} students</div></div>
      </div>`,
    actions: canEdit ? [
      { label: st.cls === 'maint' ? 'Mark as available' : 'Mark under maintenance', cls: 'btn--ghost', run: c => {
        const set = State.maintenanceSet();
        const key = `${block}-${no}`;
        if (set.has(key)) set.delete(key);
        else {
          if (people.length) return toast('Move the students out before marking this room for maintenance.', 'bad');
          set.add(key);
        }
        State.saved.maintenance = Array.from(set);
        State.save(); c(); route();
        toast('Room status updated.', 'ok');
      } },
      { label: 'Close', run: c => c() }
    ] : [{ label: 'Close', run: c => c() }]
  });

  const root = $('#modalRoot');
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-bio]');
    const asg = e.target.closest('[data-assign]');
    const dv = e.target.closest('[data-docopen]');
    if (dv) return openDocViewer(dv.dataset.docapp, dv.dataset.docopen);
    if (asg) { closeModal(); return openAssign(block, no, +asg.dataset.assign); }
    if (b) { closeModal(); openBio(b.dataset.bio); }
  });
}

function openAssign(block, no, bed) {
  const year = YEAR_OF_BLOCK[block];
  const pool = State.apps().filter(a => !a.room && approvalCount(a) === 3 && !a.alumni);
  const fit = pool.filter(a => a.academic.year === year);
  const others = pool.filter(a => a.academic.year !== year);

  openModal({
    title: `Assign a student to room ${no}, bed ${bed}`,
    sub: `Block ${esc(block)} · reserved for ${esc(year)}`,
    body: fit.length || others.length ? `
      ${fit.length ? `<div class="sectionlbl">Approved ${esc(year)} students without a bed (${fit.length})</div>
        <div class="beds">${fit.slice(0, 20).map(a => `<div class="bed" data-pick="${esc(a.id)}">${avatar(a)}
          <div style="min-width:0"><div class="person__n">${esc(a.student.name)}</div>
          <div class="person__s">${esc(a.academic.course)} · ${esc(a.rollNo)}</div></div></div>`).join('')}</div>`
        : `<div class="callout callout--orange">No approved ${esc(year)} students are waiting for a bed right now.</div>`}
      ${others.length ? `<div class="sectionlbl">Other approved students (${others.length}) — different year, place only if needed</div>
        <div class="beds">${others.slice(0, 12).map(a => `<div class="bed" data-pick="${esc(a.id)}">${avatar(a)}
          <div style="min-width:0"><div class="person__n">${esc(a.student.name)}</div>
          <div class="person__s">${esc(a.academic.course)} · ${esc(a.academic.year)}</div></div></div>`).join('')}</div>` : ''}`
      : `<div class="empty"><h4>Nobody is waiting for a bed</h4><p>Every fully approved student already has a room.</p></div>`,
    actions: [{ label: 'Close', run: c => c() }]
  });

  $('#modalRoot').addEventListener('click', e => {
    const p = e.target.closest('[data-pick]');
    if (!p) return;
    const rec = JSON.parse(JSON.stringify(State.app(p.dataset.pick)));
    const now = new Date().toISOString();
    rec.room = { block, floorIdx: Math.floor(no / 100) - 1, roomNo: no, bed, assignedBy: State.session().name, assignedAt: now };
    rec.history.push({ at: now, label: `Room allotted — Block ${block}, room ${no}, bed ${bed}`, by: State.session().name });
    State.put(rec); closeModal(); route();
    toast(`${rec.student.name.split(' ')[0]} placed in room ${no}, bed ${bed}.`, 'ok');
  });
}

/* ---------- three.js scene ---------- */

let SC = null;

function disposeScene() {
  if (!SC) return;
  cancelAnimationFrame(SC.raf);
  window.removeEventListener('resize', SC.onResize);
  try { SC.renderer.dispose(); } catch (e) {}
  SC = null;
}

function initScene() {
  const canvas = $('#scene3d');
  if (!canvas) return;
  if (typeof THREE === 'undefined') {
    canvas.parentNode.innerHTML = `<div class="empty"><h4>3D viewer unavailable</h4>
      <p>The 3D library did not load. Switch to the floor plan for the same information.</p></div>`;
    return;
  }
  disposeScene();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 2000);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe7f2, 1.05));
  const dir = new THREE.DirectionalLight(0xffffff, 0.55);
  dir.position.set(60, 120, 70);
  scene.add(dir);

  SC = {
    renderer, scene, camera, canvas,
    group: new THREE.Group(),
    orbit: { theta: -0.72, phi: 1.05, radius: 190, target: new THREE.Vector3(0, 12, 0) },
    picks: [], hover: null, tip: null, raf: 0, dragging: false, moved: 0
  };
  scene.add(SC.group);

  SC.onResize = () => {
    const w = canvas.clientWidth || canvas.parentNode.clientWidth;
    const h = canvas.clientHeight || 520;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', SC.onResize);

  bindSceneEvents();
  buildScene();
  SC.onResize();

  const loop = () => {
    SC.raf = requestAnimationFrame(loop);
    const o = SC.orbit;
    camera.position.set(
      o.target.x + o.radius * Math.sin(o.phi) * Math.sin(o.theta),
      o.target.y + o.radius * Math.cos(o.phi),
      o.target.z + o.radius * Math.sin(o.phi) * Math.cos(o.theta)
    );
    camera.lookAt(o.target);
    renderer.render(scene, camera);
  };
  loop();
}

function labelSprite(text, size = 44, color = '#0D1526') {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  c.width = 512; c.height = 128;
  ctx.font = `700 ${size}px 'Plus Jakarta Sans', sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(46, 11.5, 1);
  return sp;
}

const COL = { full: 0x12915A, part: 0xF07A13, empty: 0xF3F7FD, maint: 0xC8372D, slab: 0xDDE5F0, wall: 0x9FB8DA };

function clearGroup() {
  const g = SC.group;
  while (g.children.length) {
    const c = g.children.pop();
    if (c.geometry) c.geometry.dispose();
    if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); }
  }
  SC.picks = [];
}

function buildScene() {
  if (!SC) return;
  clearGroup();
  if (HV.mode === 'campus') buildCampus(); else buildBlock(HV.block);
  const crumb = $('#crumb');
  if (crumb) crumb.textContent = HV.mode === 'campus' ? 'ANU boys hostel · 4 blocks' : `Block ${HV.block} · ${YEAR_OF_BLOCK[HV.block]}`;
  const back = $('#backCampus');
  if (back) back.style.display = HV.mode === 'campus' ? 'none' : '';
}

function buildCampus() {
  const g = SC.group;
  SC.orbit = { theta: -0.72, phi: 1.0, radius: 210, target: new THREE.Vector3(0, 10, 0) };

  const ground = new THREE.Mesh(new THREE.BoxGeometry(230, 1, 190), new THREE.MeshLambertMaterial({ color: 0xEFF3F9 }));
  ground.position.y = -0.5;
  g.add(ground);

  const spots = [[-55, -45], [55, -45], [-55, 45], [55, 45]];

  BLOCKS.forEach((b, i) => {
    const st = blockStats(b.key);
    const [x, z] = spots[i];
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(66, 34, 34),
      new THREE.MeshLambertMaterial({ color: 0xE7F0FC })
    );
    body.position.set(x, 17, z);
    body.userData = { block: b.key, tip: `${b.name} · ${b.year} — ${st.filled}/${st.cap} beds` };
    g.add(body);
    SC.picks.push(body);

    /* one band per floor, coloured by how full that floor is */
    st.floors.forEach(f => {
      const ratio = f.filled / f.cap;
      const col = ratio > 0.85 ? COL.full : ratio > 0.15 ? COL.part : COL.empty;
      const band = new THREE.Mesh(new THREE.BoxGeometry(67, 3.4, 35), new THREE.MeshLambertMaterial({ color: col }));
      band.position.set(x, 6 + f.idx * 11, z);
      band.userData = { block: b.key, tip: `${b.name} · ${f.label} — ${f.filled}/${f.cap} beds` };
      g.add(band);
      SC.picks.push(band);
    });

    const roof = new THREE.Mesh(new THREE.BoxGeometry(70, 1.6, 38), new THREE.MeshLambertMaterial({ color: 0x14509B }));
    roof.position.set(x, 34.8, z);
    g.add(roof);

    const lab = labelSprite(`${b.name} · ${b.year}`, 40);
    lab.position.set(x, 44, z);
    g.add(lab);

    const cnt = labelSprite(`${st.filled}/${st.cap} beds`, 32, '#64748B');
    cnt.position.set(x, 39, z);
    cnt.scale.set(38, 9.5, 1);
    g.add(cnt);
  });
}

function buildBlock(key) {
  const g = SC.group;
  SC.orbit = { theta: -0.72, phi: 1.0, radius: 190, target: new THREE.Vector3(0, 28, 0) };

  const occ = occupancyIndex();
  const maint = State.maintenanceSet();

  /* 20 rooms per floor sit around a courtyard — 5 to a side, like the real block */
  const SIDE = 5, STEP = 10, OUT = 24;
  const placeOf = i => {
    const wing = Math.floor(i / SIDE), k = i % SIDE, off = (k - (SIDE - 1) / 2) * STEP;
    if (wing === 0) return { x: off, z: -OUT, w: 8.4, d: 11 };        // north wing
    if (wing === 1) return { x: OUT, z: off, w: 11, d: 8.4 };          // east wing
    if (wing === 2) return { x: -off, z: OUT, w: 8.4, d: 11 };         // south wing
    return { x: -OUT, z: -off, w: 11, d: 8.4 };                        // west wing
  };

  FLOORS.forEach(f => {
    const y = f.idx * 26;

    const slab = new THREE.Mesh(new THREE.BoxGeometry(62, 1.4, 62), new THREE.MeshLambertMaterial({ color: COL.slab }));
    slab.position.set(0, y, 0);
    g.add(slab);

    /* open courtyard in the middle */
    const yard = new THREE.Mesh(new THREE.BoxGeometry(31, 0.6, 31), new THREE.MeshLambertMaterial({ color: 0xEAF4EE }));
    yard.position.set(0, y + 1, 0);
    g.add(yard);

    /* corridor ring between the courtyard and the rooms */
    const ring = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 40), new THREE.MeshLambertMaterial({ color: 0xF7F9FC }));
    ring.position.set(0, y + 0.9, 0);
    g.add(ring);

    const lab = labelSprite(f.label, 34, '#14509B');
    lab.position.set(-52, y + 8, 0);
    lab.scale.set(40, 10, 1);
    g.add(lab);

    roomNumbersOf(f.idx).forEach((no, i) => {
      const p = placeOf(i);
      const st = roomState(key, no, occ, maint);
      const box = new THREE.Mesh(new THREE.BoxGeometry(p.w, 9, p.d), new THREE.MeshLambertMaterial({ color: COL[st.cls] }));
      box.position.set(p.x, y + 5.2, p.z);
      box.userData = { room: no, block: key, tip: `Room ${no} · ${st.cls === 'maint' ? 'maintenance' : st.n + '/4 occupied'}` };
      g.add(box);
      SC.picks.push(box);
    });
  });

  const lab = labelSprite(`Block ${key} · ${YEAR_OF_BLOCK[key]}`, 44);
  lab.position.set(0, 82, 0);
  g.add(lab);
}

function bindSceneEvents() {
  const c = SC.canvas;
  const ray = new THREE.Raycaster();
  const v = new THREE.Vector2();
  let last = null;

  const setTip = (text, x, y) => {
    const wrapEl = c.parentNode;
    if (!text) { if (SC.tip) { SC.tip.remove(); SC.tip = null; } return; }
    if (!SC.tip) { SC.tip = document.createElement('div'); SC.tip.className = 'viewer__tip'; wrapEl.appendChild(SC.tip); }
    SC.tip.textContent = text;
    SC.tip.style.left = x + 'px';
    SC.tip.style.top = y + 'px';
  };

  const hit = e => {
    const r = c.getBoundingClientRect();
    v.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    v.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(v, SC.camera);
    const list = ray.intersectObjects(SC.picks, false);
    return list.length ? list[0].object : null;
  };

  c.onpointerdown = e => { SC.dragging = true; SC.moved = 0; last = { x: e.clientX, y: e.clientY }; c.setPointerCapture(e.pointerId); };
  c.onpointerup = e => {
    SC.dragging = false;
    try { c.releasePointerCapture(e.pointerId); } catch (err) {}
    if (SC.moved > 6) return;
    const o = hit(e);
    if (!o) return;
    if (o.userData.room) return openRoomModal(o.userData.block, o.userData.room);
    if (o.userData.block) { HV.block = o.userData.block; HV.mode = 'block'; buildScene(); }
  };

  c.onpointermove = e => {
    if (SC.dragging && last) {
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      SC.moved += Math.abs(dx) + Math.abs(dy);
      SC.orbit.theta -= dx * 0.006;
      SC.orbit.phi = Math.min(1.45, Math.max(0.22, SC.orbit.phi - dy * 0.005));
      last = { x: e.clientX, y: e.clientY };
      setTip(null);
      return;
    }
    const o = hit(e);
    const r = c.getBoundingClientRect();
    if (o) {
      c.style.cursor = 'pointer';
      setTip(o.userData.tip, e.clientX - r.left, e.clientY - r.top);
    } else {
      c.style.cursor = 'grab';
      setTip(null);
    }
  };

  c.onpointerleave = () => { SC.dragging = false; setTip(null); };
  c.onwheel = e => {
    e.preventDefault();
    SC.orbit.radius = Math.min(420, Math.max(70, SC.orbit.radius + e.deltaY * 0.18));
  };
}

/* ============================================================
   Hidden role switcher + boot
   ============================================================ */

let devOpen = false;

function toggleDev(force) {
  devOpen = force !== undefined ? force : !devOpen;
  const root = $('#devRoot');
  if (!devOpen) { root.innerHTML = ''; return; }
  root.innerHTML = `<div class="devpanel noprint">
    <h4>Demo controls</h4>
    <p>Alt + D toggles this panel. Storage: ${Disk.persistent ? 'localStorage' : 'this tab only'}.</p>
    <div class="devpanel__list">
      ${Object.keys(ROLES).map(r => `<button data-role="${r}">Switch to ${ROLES[r]}</button>`).join('')}
    </div>
    <button class="btn btn--danger btn--sm btn--wide" data-reset="1">Reset demo data</button>
  </div>`;

  root.onclick = e => {
    const r = e.target.closest('[data-role]');
    if (r) {
      const role = r.dataset.role;
      const u = USERS.find(x => x.role === role);
      State.signIn({ email: u.email, role: u.role, name: u.name, dept: u.dept });
      toast('Switched to ' + ROLES[role], 'ok');
      return go(homeFor(role));
    }
    if (e.target.closest('[data-reset]')) {
      State.reset();
      toast('Demo data reset to seed.', 'ok');
      go('#/');
    }
  };
}

document.addEventListener('keydown', e => {
  if (e.altKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); toggleDev(); }
});

let brandClicks = 0, brandTimer = null;
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) {
    if (g.closest('.side__brand') || g.classList.contains('brand')) {
      brandClicks++;
      clearTimeout(brandTimer);
      brandTimer = setTimeout(() => { if (brandClicks < 3) go(g.dataset.go); brandClicks = 0; }, 380);
      if (brandClicks >= 3) { clearTimeout(brandTimer); brandClicks = 0; toggleDev(true); }
      return;
    }
    go(g.dataset.go);
  }
});

window.addEventListener('hashchange', route);

State.boot();
route();

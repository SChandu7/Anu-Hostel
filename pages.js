/* ============================================================
   InfoREDZ — pages.js
   One controller per page, dispatched from body[data-page].
   ============================================================ */

/* ------------------------------------------------------------
   Shared: does this click come from a control inside the card?
   ------------------------------------------------------------ */
function fromControl(e) {
  return !!e.target.closest('a, button, input, select, textarea');
}

/* ------------------------------------------------------------
   SPLASH  (index.html)
   ------------------------------------------------------------ */
const SplashPage = {
  init() {
    const word = document.getElementById('splashWord');
    const groups = document.getElementById('splashGroups');
    const full = 'InfoREDZ';
    let i = 0;

    const type = () => {
      i += 1;
      const typed = full.slice(0, i);
      const head = typed.slice(0, 4);
      const tail = typed.slice(4);
      word.innerHTML = U.esc(head) + (tail ? '<em>' + U.esc(tail) + '</em>' : '') +
                       (i < full.length ? '<span class="splash__caret"></span>' : '');
      if (i < full.length) setTimeout(type, 105);
      else setTimeout(showGroups, 160);
    };

    const showGroups = () => {
      CONFIG.BLOOD_GROUPS.slice(0, 5).forEach((g, n) => {
        const el = document.createElement('span');
        el.className = 'bbadge bbadge--sm';
        el.style.animationDelay = (n * 70) + 'ms';
        el.textContent = g;
        groups.appendChild(el);
      });
      setTimeout(route, 900);
    };

    const route = () => {
      if (Auth.isLoggedIn || Auth.isGuest) location.replace('donors.html');
      else location.replace('auth.html');
    };

    setTimeout(type, 520);
    document.getElementById('splashSkip').addEventListener('click', route);
  }
};

/* ------------------------------------------------------------
   AUTH  (auth.html)
   ------------------------------------------------------------ */
const AuthPage = {
  role: 'donor',
  picked: null,

  init() {
    if (Auth.isLoggedIn) { location.replace('donors.html'); return; }

    document.querySelectorAll('.tabs__btn').forEach(btn => {
      btn.addEventListener('click', () => this.showTab(btn.dataset.tab));
    });
    document.querySelectorAll('.role-opt').forEach(opt => {
      opt.addEventListener('click', () => this.setRole(opt.dataset.role));
    });

    document.getElementById('loginForm').addEventListener('submit', e => this.login(e));
    document.getElementById('registerForm').addEventListener('submit', e => this.register(e));
    document.getElementById('guestBtn').addEventListener('click', () => {
      Auth.signInGuest();
      location.href = 'donors.html';
    });
    document.getElementById('gpsBtn').addEventListener('click', () => this.useGps());

    const cityInput = document.getElementById('regCity');
    cityInput.addEventListener('input', U.debounce(() => this.suggestCities(cityInput.value), 420));
    document.addEventListener('click', e => { if (!e.target.closest('#cityWrap')) this.clearSuggestions(); });

    document.querySelectorAll('[data-fill]').forEach(b => {
      b.addEventListener('click', () => {
        document.getElementById('loginEmail').value = b.dataset.fill;
        document.getElementById('loginPassword').value = 'demo123';
      });
    });

    this.setRole('donor');
    if (U.qs('tab') === 'register') this.showTab('register');
  },

  showTab(tab) {
    document.querySelectorAll('.tabs__btn').forEach(b => b.classList.toggle('is-on', b.dataset.tab === tab));
    document.getElementById('loginPane').hidden = tab !== 'login';
    document.getElementById('registerPane').hidden = tab !== 'register';
  },

  setRole(role) {
    this.role = role;
    document.querySelectorAll('.role-opt').forEach(o => o.classList.toggle('is-on', o.dataset.role === role));
    document.getElementById('donorFields').hidden = role !== 'donor';
    document.getElementById('bankFields').hidden = role !== 'blood_bank';
    document.getElementById('regNameLabel').textContent =
      role === 'donor' ? 'Full name' : 'Contact person name';
  },

  async suggestCities(q) {
    const wrap = document.getElementById('cityWrap');
    this.clearSuggestions();
    const results = await Geo.searchCity(q);
    if (!results.length) return;
    const list = document.createElement('div');
    list.className = 'ac-list';
    list.innerHTML = results.map((r, i) => '<button type="button" data-i="' + i + '">' + U.esc(r.label) + '</button>').join('');
    list.addEventListener('click', e => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      const r = results[Number(b.dataset.i)];
      document.getElementById('regCity').value = r.label.split(',')[0].trim();
      this.picked = { lat: r.lat, lng: r.lng };
      this.clearSuggestions();
    });
    wrap.appendChild(list);
  },

  clearSuggestions() {
    const old = document.querySelector('#cityWrap .ac-list');
    if (old) old.remove();
  },

  async useGps() {
    const btn = document.getElementById('gpsBtn');
    btn.disabled = true; btn.textContent = 'Locating…';
    try {
      const p = await Geo.locate();
      this.picked = { lat: p.lat, lng: p.lng };
      const city = await Geo.cityFrom(p.lat, p.lng);
      if (city) document.getElementById('regCity').value = city;
      UI.toast('Location set' + (city ? ' — ' + city : '') + '.', 'success');
    } catch (e) {}
    btn.disabled = false; btn.textContent = 'Use my location';
  },

  async login(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const email = document.getElementById('loginEmail').value.trim();
    const pw = document.getElementById('loginPassword').value;
    if (!email || !pw) { UI.toast('Enter your email and password.', 'error'); return; }

    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      Auth.signIn(await Api.login(email, pw));
      location.href = 'donors.html';
    } catch (err) {
      UI.toast(err.message || 'Could not sign in.', 'error');
      btn.disabled = false; btn.textContent = 'Sign in';
    }
  },

  async register(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    const g = id => document.getElementById(id).value.trim();

    if (!document.getElementById('regTerms').checked) {
      UI.toast('Please accept the terms to continue.', 'error'); return;
    }

    const payload = {
      role: this.role,
      email: g('regEmail'),
      password: document.getElementById('regPassword').value,
      name: g('regName'),
      city: g('regCity'),
      latitude: this.picked ? this.picked.lat : null,
      longitude: this.picked ? this.picked.lng : null
    };

    if (this.role === 'donor') {
      Object.assign(payload, {
        blood_group: g('regGroup'), age: Number(g('regAge')) || null,
        weight: Number(g('regWeight')) || null, gender: g('regGender'),
        last_donated: g('regLast'), phone: g('regPhone')
      });
      if (!payload.blood_group) { UI.toast('Choose your blood group.', 'error'); return; }
      if (!payload.phone) { UI.toast('A phone number is required so people can reach you.', 'error'); return; }
    } else {
      Object.assign(payload, {
        bank_name: g('regBankName'), bank_address: g('regBankAddress'),
        bank_phone: g('regBankPhone'), timing: g('regTiming')
      });
      if (!payload.bank_name) { UI.toast('Enter the blood bank name.', 'error'); return; }
    }

    btn.disabled = true; btn.textContent = 'Creating account…';
    try {
      Auth.signIn(await Api.register(payload));
      UI.toast('Welcome to InfoREDZ.', 'success');
      setTimeout(() => location.href = 'donors.html', 480);
    } catch (err) {
      UI.toast(err.message || 'Could not create the account.', 'error');
      btn.disabled = false; btn.textContent = 'Create account';
    }
  }
};

/* ------------------------------------------------------------
   DONORS  (donors.html)
   ------------------------------------------------------------ */
const DonorsPage = {
  filters: { blood_group: '', search: '', available: '' },
  sortByDistance: false,
  donors: [],

  init() {
    if (!Auth.requireSession()) return;
    this.renderGreeting();
    this.renderChips();
    this.bind();
    this.loadStats();
    this.load();
  },

  renderGreeting() {
    const u = Auth.user;
    const first = u ? (u.role === 'blood_bank' ? u.bank_name : u.name).split(' ')[0] : null;
    const k = document.getElementById('heroKicker');
    if (k) k.textContent = first ? 'Welcome back, ' + first : 'Browsing as a guest';
  },

  renderChips() {
    document.getElementById('groupChips').innerHTML =
      '<button class="chip is-on" data-g="">All groups</button>' +
      CONFIG.BLOOD_GROUPS.map(g => '<button class="chip" data-g="' + g + '">' + g + '</button>').join('') +
      '<button class="chip chip--toggle" id="availChip">Available only</button>' +
      '<button class="chip chip--toggle" id="nearChip">Nearest first</button>';
  },

  bind() {
    const search = document.getElementById('donorSearch');
    search.addEventListener('input', U.debounce(() => {
      this.filters.search = search.value.trim();
      document.getElementById('searchClear').hidden = !this.filters.search;
      this.load();
    }, 300));
    document.getElementById('searchClear').addEventListener('click', () => {
      search.value = ''; this.filters.search = '';
      document.getElementById('searchClear').hidden = true;
      this.load(); search.focus();
    });

    document.getElementById('groupChips').addEventListener('click', async e => {
      const chip = e.target.closest('.chip'); if (!chip) return;

      if (chip.id === 'availChip') {
        chip.classList.toggle('is-on');
        this.filters.available = chip.classList.contains('is-on') ? 'true' : '';
        this.load(); return;
      }
      if (chip.id === 'nearChip') {
        if (!chip.classList.contains('is-on')) {
          try { await Geo.locate(); } catch (err) { return; }
        }
        chip.classList.toggle('is-on');
        this.sortByDistance = chip.classList.contains('is-on');
        this.render(); return;
      }
      document.querySelectorAll('#groupChips .chip[data-g]').forEach(c => c.classList.remove('is-on'));
      chip.classList.add('is-on');
      this.filters.blood_group = chip.dataset.g;
      this.load();
    });

    document.getElementById('list').addEventListener('click', e => this.onListClick(e));
    document.getElementById('list').addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card--tap')) {
        e.preventDefault(); this.detail(Number(e.target.dataset.open));
      }
    });

    document.querySelectorAll('[data-eligibility]').forEach(b =>
      b.addEventListener('click', () => UI.eligibilityChecker()));
  },

  async loadStats() {
    try {
      const s = await Api.stats();
      document.getElementById('statTotal').textContent = s.total_donors;
      document.getElementById('statAvail').textContent = s.available_donors;
      document.getElementById('statCities').textContent = s.cities;
      document.getElementById('statBanks').textContent = s.total_banks;
    } catch (e) {}
  },

  async load() {
    const host = document.getElementById('list');
    host.innerHTML = UI.skeletonCards(6);
    try {
      this.donors = await Api.listDonors(this.filters);
      this.render();
    } catch (err) {
      host.innerHTML = UI.empty('Could not load donors', err.message,
        '<button class="btn btn--primary" onclick="DonorsPage.load()">Try again</button>');
    }
  },

  render() {
    const host = document.getElementById('list');
    let list = this.donors.slice();
    const pos = Geo.last;

    if (this.sortByDistance && pos) {
      list.forEach(d => { d._km = U.distanceKm(pos.lat, pos.lng, d.latitude, d.longitude); });
      list.sort((a, b) => (a._km == null) - (b._km == null) || (a._km - b._km));
    }

    document.getElementById('listCount').textContent =
      list.length + (list.length === 1 ? ' donor' : ' donors') +
      (this.filters.blood_group ? ' with ' + this.filters.blood_group : '');

    host.innerHTML = list.length
      ? list.map(d => this.card(d)).join('')
      : UI.empty('No donors match this search',
          'Try a different blood group, or clear the filters and start again.',
          '<button class="btn btn--ghost" onclick="DonorsPage.resetFilters()">Clear filters</button>');
  },

  resetFilters() {
    this.filters = { blood_group: '', search: '', available: '' };
    this.sortByDistance = false;
    document.getElementById('donorSearch').value = '';
    document.getElementById('searchClear').hidden = true;
    this.renderChips();
    this.load();
  },

  card(d) {
    const dist = d._km != null ? '<span>' + Icons.nav + U.fmtDistance(d._km) + '</span>' : '';
    return '' +
    '<article class="card card--tap" data-open="' + d.id + '" tabindex="0" role="button" aria-label="Open ' + U.esc(d.name) + '">' +
      '<div class="dcard">' +
        '<div class="dcard__head">' +
          '<div class="dcard__avatar">' + U.esc(U.initials(d.name)) +
            '<span class="dcard__dot' + (d.is_available ? ' dcard__dot--on' : '') + '"></span>' +
          '</div>' +
          '<div class="dcard__id">' +
            '<h3 class="dcard__name">' + U.esc(d.name) + '</h3>' +
            '<div class="dcard__meta">' +
              '<span>' + Icons.pin + U.esc(d.city || 'Unknown') + '</span>' +
              '<span>' + Icons.drop + (d.donation_count || 0) + ' donations</span>' + dist +
            '</div>' +
          '</div>' +
          UI.bloodBadge(d.blood_group) +
        '</div>' +
        '<div class="dcard__tags">' +
          (d.is_available
            ? '<span class="tag tag--ok"><i class="tag__dot"></i>Available</span>'
            : '<span class="tag"><i class="tag__dot"></i>Unavailable</span>') +
          '<span class="tag">Last donated: ' + U.esc(d.last_donated || 'Never') + '</span>' +
          (d.age ? '<span class="tag">' + d.age + ' yrs</span>' : '') +
        '</div>' +
        '<div class="dcard__actions">' +
          (Auth.isLoggedIn
            ? '<button class="btn btn--primary btn--sm" data-call="' + d.id + '">' + Icons.phone + 'Call</button>' +
              '<button class="btn btn--green btn--sm" data-wa="' + d.id + '">' + Icons.chat + 'WhatsApp</button>'
            : '<a class="btn btn--ghost btn--sm" href="auth.html">Sign in to contact</a>') +
        '</div>' +
      '</div>' +
    '</article>';
  },

  async onListClick(e) {
    const card = e.target.closest('[data-open]');
    const call = e.target.closest('[data-call]');
    const wa   = e.target.closest('[data-wa]');

    if (!call && !wa) {
      if (card && !fromControl(e)) this.detail(Number(card.dataset.open));
      return;
    }

    const id = Number((call || wa).dataset.call || (call || wa).dataset.wa);
    const d = this.donors.find(x => x.id === id);
    if (!d) return;

    if (!d.is_available) {
      const go = await UI.confirm({
        title: 'Marked unavailable',
        message: d.name.split(' ')[0] + ' has switched off availability. Contact anyway?',
        confirmLabel: 'Contact anyway'
      });
      if (!go) return;
    }
    if (call) {
      const ok = await UI.confirm({ title: 'Call ' + d.name + '?', message: '+91 ' + d.phone + ' will open in your phone app.', confirmLabel: 'Call now' });
      if (ok) location.href = U.tel(d.phone);
    } else {
      const ok = await UI.confirm({ title: 'Message ' + d.name + '?', message: 'WhatsApp will open with a short message ready to send.', confirmLabel: 'Open WhatsApp' });
      if (ok) window.open(U.wa(d.phone, 'Hello ' + d.name + ', I found you on InfoREDZ. I am looking for ' + d.blood_group + ' blood. Are you available to help?'), '_blank', 'noopener');
    }
  },

  async detail(id) {
    const d = this.donors.find(x => x.id === id) || await Api.donorDetail(id);
    const compat = U.canDonateTo(d.blood_group);
    UI.sheet({
      title: d.name,
      body:
        '<div style="display:flex;gap:16px;align-items:center;margin-bottom:18px">' +
          '<div class="dcard__avatar" style="width:66px;height:66px;font-size:21px">' + U.esc(U.initials(d.name)) + '</div>' +
          '<div>' + UI.bloodBadge(d.blood_group, 'lg') +
          '<div style="font-size:13px;color:' + (d.is_available ? 'var(--success)' : 'var(--text-muted)') + ';margin-top:8px;font-weight:700">' +
            (d.is_available ? 'Available now' : 'Not available right now') + '</div></div>' +
        '</div>' +
        '<div class="kv"><span>' + Icons.pin + 'City</span><span>' + U.esc(d.city || '—') + '</span></div>' +
        '<div class="kv"><span>' + Icons.drop + 'Donations</span><span>' + (d.donation_count || 0) + '</span></div>' +
        '<div class="kv"><span>' + Icons.clock + 'Last donated</span><span>' + U.esc(d.last_donated || 'Never') + '</span></div>' +
        '<div class="kv"><span>' + Icons.user + 'Age / Gender</span><span>' + (d.age || '—') + ' · ' + U.esc(d.gender || '—') + '</span></div>' +
        '<div class="kv"><span>' + Icons.cal + 'Member since</span><span>' + U.fmtDate(d.created_at) + '</span></div>' +
        '<h4 style="margin:20px 0 4px;font-size:13.5px;color:var(--ink-mid)">Can donate to</h4>' +
        '<div class="compat-grid">' + compat.map(g => '<span class="tag tag--info">' + g + '</span>').join('') + '</div>',
      actions: Auth.isLoggedIn
        ? [{ label: 'WhatsApp', variant: 'ghost', keepOpen: true, onClick: () => window.open(U.wa(d.phone), '_blank', 'noopener') },
           { label: 'Call ' + d.name.split(' ')[0], variant: 'primary', keepOpen: true, onClick: () => { location.href = U.tel(d.phone); } }]
        : [{ label: 'Close', variant: 'ghost' },
           { label: 'Sign in to contact', variant: 'primary', keepOpen: true, onClick: () => { location.href = 'auth.html'; } }]
    });
  }
};

/* ------------------------------------------------------------
   BLOOD BANKS  (banks.html)
   ------------------------------------------------------------ */
const BanksPage = {
  banks: [],
  filters: { search: '', blood_group: '' },

  init() {
    if (!Auth.requireSession()) return;
    document.getElementById('bankGroupChips').innerHTML =
      '<button class="chip is-on" data-g="">Any group</button>' +
      CONFIG.BLOOD_GROUPS.map(g => '<button class="chip" data-g="' + g + '">' + g + ' in stock</button>').join('');

    const s = document.getElementById('bankSearch');
    s.addEventListener('input', U.debounce(() => { this.filters.search = s.value.trim(); this.load(); }, 300));

    document.getElementById('bankGroupChips').addEventListener('click', e => {
      const c = e.target.closest('.chip'); if (!c) return;
      document.querySelectorAll('#bankGroupChips .chip').forEach(x => x.classList.remove('is-on'));
      c.classList.add('is-on');
      this.filters.blood_group = c.dataset.g;
      this.load();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => { this.load(); UI.toast('Stock refreshed.'); });
    document.getElementById('bankList').addEventListener('click', e => this.onClick(e));
    document.getElementById('bankList').addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card--tap')) {
        e.preventDefault(); this.detail(Number(e.target.dataset.open));
      }
    });
    this.load();
  },

  async load() {
    const host = document.getElementById('bankList');
    host.innerHTML = UI.skeletonCards(6);
    try {
      this.banks = await Api.listBanks(this.filters);
      this.render();
    } catch (err) {
      host.innerHTML = UI.empty('Could not load blood banks', err.message,
        '<button class="btn btn--primary" onclick="BanksPage.load()">Try again</button>');
    }
  },

  render() {
    const host = document.getElementById('bankList');
    document.getElementById('bankCount').textContent =
      this.banks.length + (this.banks.length === 1 ? ' centre' : ' centres');
    host.innerHTML = this.banks.length
      ? this.banks.map(b => this.card(b)).join('')
      : UI.empty('No centres found', 'Try another city, or clear the blood group filter.',
          '<button class="btn btn--ghost" onclick="BanksPage.reset()">Clear filters</button>');
  },

  reset() {
    this.filters = { search: '', blood_group: '' };
    document.getElementById('bankSearch').value = '';
    document.querySelectorAll('#bankGroupChips .chip').forEach((x, i) => x.classList.toggle('is-on', i === 0));
    this.load();
  },

  card(b) {
    const stock = b.stock || {};
    const four = ['O+', 'O-', 'A+', 'A-'];
    const total = CONFIG.BLOOD_GROUPS.reduce((s, g) => s + (Number(stock[g]) || 0), 0);
    return '' +
    '<article class="card card--tap" data-open="' + b.id + '" tabindex="0" role="button" aria-label="Open ' + U.esc(b.bank_name) + '">' +
      '<div class="bcard">' +
        '<div class="bcard__head">' +
          '<div class="bcard__icon">' + Icons.hospital + '</div>' +
          '<div class="bcard__id">' +
            '<h3 class="bcard__name">' + U.esc(b.bank_name) + '</h3>' +
            '<div class="bcard__sub">' +
              '<span>' + Icons.pin + U.esc(b.city || '—') + '</span>' +
              (b.timing ? '<span>' + Icons.clock + U.esc(b.timing) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="bcard__right">' +
            (b.is_open ? '<span class="tag tag--ok">OPEN</span>' : '<span class="tag tag--bad">CLOSED</span>') +
            '<div class="bcard__rating">' + Icons.star + (Number(b.rating) || 0).toFixed(1) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="bcard__body">' +
          '<div class="stock-grid">' + four.map(g => UI.stockChip(g, stock[g])).join('') + '</div>' +
          '<p class="bcard__total">' + total + ' units across all eight groups · maintained by the centre</p>' +
          '<div class="bcard__foot">' +
            '<a class="btn btn--primary btn--sm" href="' + U.tel(b.bank_phone) + '">' + Icons.phone + 'Call</a>' +
            '<a class="btn btn--outline btn--sm" target="_blank" rel="noopener" href="' + U.maps(b.latitude, b.longitude, b.bank_name) + '">' + Icons.nav + 'Navigate</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</article>';
  },

  onClick(e) {
    const card = e.target.closest('[data-open]');
    if (card && !fromControl(e)) this.detail(Number(card.dataset.open));
  },

  detail(id) {
    const b = this.banks.find(x => x.id === id);
    if (!b) return;
    const stock = b.stock || {};
    UI.sheet({
      title: b.bank_name,
      body:
        '<div class="kv"><span>' + Icons.clock + 'Timing</span><span>' + U.esc(b.timing || 'Not listed') + '</span></div>' +
        '<div class="kv"><span>' + Icons.pin + 'Address</span><span>' + U.esc(b.bank_address || '—') + '</span></div>' +
        '<div class="kv"><span>' + Icons.phone + 'Phone</span><a href="' + U.tel(b.bank_phone) + '">' + U.esc(b.bank_phone || '—') + '</a></div>' +
        '<div class="kv"><span>' + Icons.star + 'Rating</span><span>' + (Number(b.rating) || 0).toFixed(1) + ' / 5.0</span></div>' +
        '<div class="kv"><span>' + Icons.dot + 'Status</span><span style="color:' + (b.is_open ? 'var(--success)' : 'var(--danger)') + '">' +
          (b.is_open ? 'Currently open' : 'Currently closed') + '</span></div>' +
        '<h4 style="margin:22px 0 12px;font-size:15px;display:flex;align-items:center;gap:8px">' + Icons.drop + 'Blood stock availability</h4>' +
        '<div class="stock-grid">' + CONFIG.BLOOD_GROUPS.map(g => UI.stockChip(g, stock[g])).join('') + '</div>' +
        '<p style="font-size:12px;color:var(--text-muted);margin-top:14px">Units shown are approximate. Call the centre to confirm before travelling.</p>',
      actions: [
        { label: 'Call bank', variant: 'ghost', keepOpen: true, onClick: () => { location.href = U.tel(b.bank_phone); } },
        { label: 'Navigate', variant: 'primary', keepOpen: true, onClick: () => window.open(U.maps(b.latitude, b.longitude, b.bank_name), '_blank', 'noopener') }
      ]
    });
  }
};

/* ------------------------------------------------------------
   MAP  (map.html)
   ------------------------------------------------------------ */
const MapPage = {
  map: null, donorLayer: null, bankLayer: null, meMarker: null,

  async init() {
    if (!Auth.requireSession()) return;
    if (typeof L === 'undefined') {
      document.getElementById('map').innerHTML =
        '<div style="padding:60px 20px">' + UI.empty('Map could not load', 'The map library needs an internet connection. Check your network and reload.') + '</div>';
      return;
    }

    this.map = L.map('map', { zoomControl: false }).setView([16.5062, 80.6480], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.donorLayer = L.layerGroup().addTo(this.map);
    this.bankLayer = L.layerGroup().addTo(this.map);

    document.getElementById('toggleDonors').addEventListener('click', e => {
      e.currentTarget.classList.toggle('is-on');
      this.map.hasLayer(this.donorLayer) ? this.map.removeLayer(this.donorLayer) : this.map.addLayer(this.donorLayer);
    });
    document.getElementById('toggleBanks').addEventListener('click', e => {
      e.currentTarget.classList.toggle('is-on');
      this.map.hasLayer(this.bankLayer) ? this.map.removeLayer(this.bankLayer) : this.map.addLayer(this.bankLayer);
    });
    document.getElementById('locateBtn').addEventListener('click', () => this.locate());

    await this.loadPins();
    this.locate({ silent: true });
  },

  icon(kind) {
    return L.divIcon({ className: '', html: '<div class="pin pin--' + kind + '"></div>', iconSize: [26, 26], iconAnchor: [13, 24] });
  },

  async loadPins() {
    try {
      const [donors, banks] = await Promise.all([Api.donorsMap(), Api.banksMap()]);

      donors.forEach(d => {
        L.marker([d.latitude, d.longitude], { icon: this.icon('donor') })
          .bindPopup(
            '<div class="pop__n">' + U.esc(d.name) + ' · ' + U.esc(d.blood_group) + '</div>' +
            '<div class="pop__m">' + U.esc(d.city || '') + ' · Available</div>' +
            (Auth.isLoggedIn && d.phone
              ? '<div class="pop__a"><a href="' + U.tel(d.phone) + '">Call</a>' +
                '<a class="alt" target="_blank" rel="noopener" href="' + U.wa(d.phone) + '">WhatsApp</a></div>'
              : '<div class="pop__a"><a href="auth.html">Sign in to contact</a></div>'))
          .addTo(this.donorLayer);
      });

      banks.forEach(b => {
        L.marker([b.latitude, b.longitude], { icon: this.icon('bank') })
          .bindPopup(
            '<div class="pop__n">' + U.esc(b.bank_name) + '</div>' +
            '<div class="pop__m">' + U.esc(b.city || '') + ' · ' + (b.is_open ? 'Open' : 'Closed') + '</div>' +
            '<div class="pop__a"><a href="' + U.tel(b.bank_phone) + '">Call</a>' +
            '<a class="alt" target="_blank" rel="noopener" href="' + U.maps(b.latitude, b.longitude, b.bank_name) + '">Directions</a></div>')
          .addTo(this.bankLayer);
      });

      document.getElementById('mapCount').textContent = donors.length + ' donors · ' + banks.length + ' centres';
    } catch (err) {
      UI.toast('Could not load map pins: ' + err.message, 'error');
    }
  },

  async locate(opts = {}) {
    try {
      const p = await Geo.locate(opts);
      if (this.meMarker) this.map.removeLayer(this.meMarker);
      this.meMarker = L.marker([p.lat, p.lng], { icon: this.icon('me') })
        .bindPopup('<div class="pop__n">You are here</div>').addTo(this.map);
      this.map.setView([p.lat, p.lng], 11);
    } catch (e) {}
  }
};

/* ------------------------------------------------------------
   REQUESTS  (emergency.html)
   ------------------------------------------------------------ */
const EmergencyPage = {
  requests: [], filter: { blood_group: '', status: 'open' }, matchMine: false,

  init() {
    if (!Auth.requireSession()) return;
    document.getElementById('reqChips').innerHTML =
      '<button class="chip is-on" data-g="">All groups</button>' +
      CONFIG.BLOOD_GROUPS.map(g => '<button class="chip" data-g="' + g + '">' + g + '</button>').join('') +
      '<button class="chip chip--toggle is-on" id="openOnly">Open only</button>' +
      (Auth.user && Auth.user.blood_group ? '<button class="chip" id="matchMine">I can help (' + Auth.user.blood_group + ')</button>' : '');

    document.getElementById('reqChips').addEventListener('click', e => {
      const c = e.target.closest('.chip'); if (!c) return;
      if (c.id === 'openOnly') {
        c.classList.toggle('is-on');
        this.filter.status = c.classList.contains('is-on') ? 'open' : '';
        this.load(); return;
      }
      if (c.id === 'matchMine') {
        c.classList.toggle('is-on');
        this.matchMine = c.classList.contains('is-on');
        this.render(); return;
      }
      document.querySelectorAll('#reqChips .chip[data-g]').forEach(x => x.classList.remove('is-on'));
      c.classList.add('is-on');
      this.filter.blood_group = c.dataset.g;
      this.load();
    });

    document.querySelectorAll('[data-new-request]').forEach(b =>
      b.addEventListener('click', () => this.newRequest()));
    document.getElementById('reqList').addEventListener('click', e => this.onClick(e));
    this.load();
  },

  async load() {
    const host = document.getElementById('reqList');
    host.innerHTML = UI.skeletonCards(4);
    try {
      this.requests = await Api.listRequests(this.filter);
      this.render();
    } catch (err) {
      host.innerHTML = UI.empty('Could not load requests', err.message);
    }
  },

  render() {
    const host = document.getElementById('reqList');
    let list = this.requests.slice();

    if (this.matchMine && Auth.user && Auth.user.blood_group) {
      const canHelp = U.canDonateTo(Auth.user.blood_group);
      list = list.filter(r => canHelp.includes(r.blood_group));
    }
    document.getElementById('reqCount').textContent =
      list.length + (list.length === 1 ? ' request' : ' requests');

    host.innerHTML = list.length
      ? list.map(r => this.card(r)).join('')
      : UI.empty('Nothing open right now',
          'That is good news. Post a request if someone you know needs help.',
          '<button class="btn btn--primary" onclick="EmergencyPage.newRequest()">Post a request</button>');
  },

  card(r) {
    const done = r.status !== 'open';
    const me = Auth.user;
    const iCanHelp = me && me.blood_group && U.canDonateTo(me.blood_group).includes(r.blood_group);
    const urgencyTag = { critical: 'tag--bad', urgent: 'tag--warn', normal: 'tag--ok' }[r.urgency] || 'tag';
    const pos = Geo.last;
    const km = pos ? U.distanceKm(pos.lat, pos.lng, r.latitude, r.longitude) : null;

    return '' +
    '<article class="card card--tap rcard rcard--' + (done ? 'done' : U.esc(r.urgency)) + '" data-open="' + r.id + '" tabindex="0" role="button">' +
      '<div class="rcard__head">' +
        UI.bloodBadge(r.blood_group, 'lg') +
        '<div style="flex:1;min-width:0">' +
          '<div class="rcard__t">' + U.esc(r.patient_name || 'Patient') + '</div>' +
          '<div class="rcard__u">' + r.units + ' unit' + (r.units > 1 ? 's' : '') + ' needed · posted ' + U.timeAgo(r.created_at) + '</div>' +
        '</div>' +
        '<span class="tag ' + urgencyTag + '">' + U.esc(done ? 'Fulfilled' : r.urgency) + '</span>' +
      '</div>' +
      '<div class="dcard__meta" style="margin-top:14px">' +
        '<span>' + Icons.hospital + U.esc(r.hospital || '—') + '</span>' +
        '<span>' + Icons.pin + U.esc(r.city || '—') + (km != null ? ' · ' + U.fmtDistance(km) : '') + '</span>' +
      '</div>' +
      (r.note ? '<p class="rcard__note">' + U.esc(r.note) + '</p>' : '') +
      (iCanHelp && !done ? '<div class="rcard__match">' + Icons.drop + 'Your ' + U.esc(me.blood_group) + ' is a match' + '</div>' : '') +
      (done ? '' :
      '<div class="rcard__foot">' +
        '<a class="btn btn--primary btn--sm" href="' + U.tel(r.contact_phone) + '">' + Icons.phone + 'Call</a>' +
        '<a class="btn btn--green btn--sm" target="_blank" rel="noopener" href="' +
          U.wa(r.contact_phone, 'Hello, I saw the ' + r.blood_group + ' request on InfoREDZ for ' + (r.patient_name || 'a patient') + ' at ' + (r.hospital || '') + '. I would like to help.') + '">' + Icons.chat + 'WhatsApp</a>' +
      '</div>') +
    '</article>';
  },

  async onClick(e) {
    const card = e.target.closest('[data-open]');
    if (card && !fromControl(e)) this.detail(Number(card.dataset.open));
  },

  detail(id) {
    const r = this.requests.find(x => x.id === id);
    if (!r) return;
    const me = Auth.user;
    const givers = U.canReceiveFrom(r.blood_group);

    UI.sheet({
      title: r.patient_name || 'Blood request',
      body:
        '<div style="display:flex;gap:16px;align-items:center;margin-bottom:18px">' +
          UI.bloodBadge(r.blood_group, 'lg') +
          '<div><div style="font-size:17px;font-weight:800">' + r.units + ' unit' + (r.units > 1 ? 's' : '') + ' needed</div>' +
          '<div style="font-size:13px;color:var(--text-muted);font-weight:600">Posted ' + U.timeAgo(r.created_at) + '</div></div>' +
        '</div>' +
        '<div class="kv"><span>' + Icons.hospital + 'Hospital</span><span>' + U.esc(r.hospital || '—') + '</span></div>' +
        '<div class="kv"><span>' + Icons.pin + 'City</span><span>' + U.esc(r.city) + '</span></div>' +
        '<div class="kv"><span>' + Icons.phone + 'Contact</span><a href="' + U.tel(r.contact_phone) + '">' + U.esc(r.contact_phone) + '</a></div>' +
        '<div class="kv"><span>' + Icons.alert + 'Urgency</span><span>' + U.esc(r.urgency) + '</span></div>' +
        '<div class="kv"><span>' + Icons.dot + 'Status</span><span>' + (r.status === 'open' ? 'Open' : 'Fulfilled') + '</span></div>' +
        (r.note ? '<p class="rcard__note">' + U.esc(r.note) + '</p>' : '') +
        '<h4 style="margin:20px 0 4px;font-size:13.5px;color:var(--ink-mid)">Groups that can donate</h4>' +
        '<div class="compat-grid">' + givers.map(g => '<span class="tag tag--info">' + g + '</span>').join('') + '</div>' +
        (me && r.created_by === me.id && r.status === 'open'
          ? '<button class="btn btn--green btn--block" data-close-req="' + r.id + '" style="margin-top:18px">Mark this request fulfilled</button>' : ''),
      actions: [
        { label: 'Find matching donors', variant: 'ghost', keepOpen: true, onClick: () => this.matchingDonors(r.blood_group) },
        { label: 'Call contact', variant: 'primary', keepOpen: true, onClick: () => { location.href = U.tel(r.contact_phone); } }
      ]
    });

    const backdrop = document.querySelector('.sheet-backdrop');
    backdrop.addEventListener('click', async e => {
      const b = e.target.closest('[data-close-req]');
      if (!b) return;
      await Api.closeRequest(Number(b.dataset.closeReq), Auth.userId);
      if (backdrop._close) backdrop._close(null);
      UI.toast('Request marked fulfilled.', 'success');
      this.load();
    });
  },

  async matchingDonors(group) {
    const givers = U.canReceiveFrom(group);
    const all = await Api.listDonors({ available: 'true' });
    const matches = all.filter(d => givers.includes(d.blood_group));
    UI.sheet({
      title: 'Donors who can give ' + group,
      body: matches.length
        ? '<p class="sheet__text sheet__text--muted">Compatible groups: ' + givers.join(', ') + '</p>' +
          matches.slice(0, 24).map(d =>
            '<div class="kv"><span>' + U.esc(d.name) + ' · ' + U.esc(d.city) + '</span>' +
            '<span>' + UI.bloodBadge(d.blood_group, 'sm') +
            (Auth.isLoggedIn ? ' <a href="' + U.tel(d.phone) + '" style="margin-left:10px">Call</a>' : '') +
            '</span></div>').join('')
        : '<p class="sheet__text">No available donor matches this group right now. A blood bank is the faster route.</p>',
      actions: [{ label: 'Close', variant: 'ghost' },
                { label: 'Open blood banks', variant: 'primary', keepOpen: true, onClick: () => { location.href = 'banks.html'; } }]
    });
  },

  newRequest() {
    if (!Auth.isLoggedIn) {
      UI.sheet({ title: 'Sign in first', body: '<p class="sheet__text">Requests need an account so donors know who to contact.</p>',
        actions: [{ label: 'Cancel', variant: 'ghost' }, { label: 'Sign in', variant: 'primary', keepOpen: true, onClick: () => location.href = 'auth.html' }] });
      return;
    }
    const u = Auth.user;
    UI.sheet({
      title: 'Post a request',
      body:
        '<div class="field"><label for="rqName">Patient name</label><input id="rqName" class="input" placeholder="Who needs help"></div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="rqGroup">Blood group</label><select id="rqGroup" class="input">' +
            CONFIG.BLOOD_GROUPS.map(g => '<option>' + g + '</option>').join('') + '</select></div>' +
          '<div class="field"><label for="rqUnits">Units</label><input id="rqUnits" class="input" type="number" min="1" max="10" value="1"></div>' +
        '</div>' +
        '<div class="field"><label for="rqHospital">Hospital</label><input id="rqHospital" class="input" placeholder="Hospital or clinic name"></div>' +
        '<div class="field"><label for="rqCity">City</label><input id="rqCity" class="input" value="' + U.esc(u.city || '') + '"></div>' +
        '<div class="field"><label for="rqPhone">Contact number</label><input id="rqPhone" class="input" inputmode="numeric" value="' + U.esc(u.phone || u.bank_phone || '') + '"></div>' +
        '<div class="field"><label for="rqUrg">How urgent</label><select id="rqUrg" class="input">' +
          '<option value="critical">Critical — needed today</option>' +
          '<option value="urgent" selected>Urgent — within 2 days</option>' +
          '<option value="normal">Planned — scheduled procedure</option></select></div>' +
        '<div class="field"><label for="rqNote">Anything else</label><textarea id="rqNote" class="input" placeholder="Optional — a line that helps donors decide"></textarea></div>',
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        { label: 'Post request', variant: 'primary', keepOpen: true, onClick: async (root, close) => {
            const v = id => root.querySelector('#' + id).value.trim();
            if (!v('rqName') || !v('rqPhone') || !v('rqCity')) { UI.toast('Patient name, city and contact number are required.', 'error'); return; }
            try {
              await Api.createRequest({
                blood_group: v('rqGroup'), units: Number(v('rqUnits')) || 1,
                patient_name: v('rqName'), hospital: v('rqHospital'), city: v('rqCity'),
                contact_phone: v('rqPhone'), urgency: v('rqUrg'), note: v('rqNote'),
                latitude: u.latitude, longitude: u.longitude, created_by: u.id
              });
              close(true);
              UI.toast('Request posted. Donors nearby can see it now.', 'success');
              this.load();
            } catch (err) { UI.toast(err.message, 'error'); }
          } }
      ]
    });
  }
};

/* ------------------------------------------------------------
   PROFILE  (profile.html)
   ------------------------------------------------------------ */
const ProfilePage = {
  me: null,

  async init() {
    if (!Auth.requireSession()) return;
    if (Auth.isGuest) { this.renderGuest(); return; }
    try {
      this.me = await Api.getProfile(Auth.userId);
      Auth.signIn(this.me);
    } catch (e) { this.me = Auth.user; }
    this.me.role === 'blood_bank' ? this.renderBank() : this.renderDonor();
  },

  hero(title, sub, initials, stats) {
    document.getElementById('proHero').innerHTML =
      '<div class="container pro-hero__inner">' +
        '<div class="pro-hero__avatar">' + U.esc(initials) + '</div>' +
        '<div>' +
          '<div class="pro-hero__name">' + U.esc(title) + '</div>' +
          '<div class="pro-hero__role">' + U.esc(sub) + '</div>' +
        '</div>' +
        '<div class="pro-hero__stats">' + stats.map(([n, l]) =>
          '<div><div class="pro-hero__n">' + U.esc(String(n)) + '</div><div class="pro-hero__l">' + U.esc(l) + '</div></div>').join('') +
        '</div>' +
      '</div>';
  },

  /* ---------- GUEST ---------- */
  async renderGuest() {
    let s = { total_donors: '—', total_banks: '—', cities: '—' };
    try { s = await Api.stats(); } catch (e) {}
    this.hero('Guest', 'Browsing without an account', 'G',
      [[s.total_donors, 'Donors'], [s.total_banks, 'Centres'], ['12K+', 'Lives touched']]);

    const team = [
      ['Dr. Akif Baig', 'CEO & Content Head', 'MBBS, DNB, DM (Cardiology)'],
      ['Dr. M.A. Sameena Farheen', 'Founder & Editor', 'MBBS, MD (Gen Med)'],
      ['Nihal Baig', 'Co-Founder & CTO', 'BTech & MTech (IITB)'],
      ['Chandrasekhar', 'Engineering', 'B.Tech AI/ML']
    ];

    document.getElementById('proBody').innerHTML =
      '<div class="pro-cols">' +
        '<div>' +
          '<section class="panel"><div class="panel__body--static" style="padding-top:22px">' +
            '<h2 style="margin-bottom:12px">Why InfoREDZ exists</h2>' +
            '<p style="font-size:15px;color:var(--ink-mid)">Finding a donor at short notice usually means calling twenty people who each know one more person. ' +
            'InfoREDZ puts willing donors and verified centres on one list, with the phone number right there.</p>' +
            '<ul class="steps" style="margin-top:14px">' +
              '<li>Free for everyone. No fees, no commission, no ads.</li>' +
              '<li>Donors decide when they are visible and can hide anytime.</li>' +
              '<li>Blood banks maintain their own stock counts.</li>' +
              '<li>Nothing is routed through us — you call each other directly.</li>' +
            '</ul>' +
          '</div></section>' +

          '<section class="panel"><div class="panel__body--static" style="padding-top:22px">' +
            '<h3 style="margin-bottom:16px">The team</h3>' +
            '<div class="team-grid">' + team.map(([n, r, q]) =>
              '<div class="team-card"><div class="team-card__pic">' + U.esc(U.initials(n)) + '</div>' +
              '<div class="team-card__n">' + U.esc(n) + '</div>' +
              '<div class="team-card__r">' + U.esc(r) + '</div>' +
              '<div class="team-card__q">' + U.esc(q) + '</div></div>').join('') +
            '</div>' +
          '</div></section>' +
        '</div>' +

        '<div>' +
          '<section class="card feature" style="background:var(--rose-pale);border-color:var(--rose-soft)">' +
            '<div class="feature__mark">' + Icons.drop + '</div>' +
            '<h3>Ready to be someone\u2019s match?</h3>' +
            '<p>Create a free account to appear in searches, contact donors and post requests.</p>' +
            '<a class="btn btn--primary" href="auth.html?tab=register">Create free account</a>' +
          '</section>' +
          '<section class="card feature" style="margin-top:18px">' +
            '<div class="feature__mark">' + Icons.check + '</div>' +
            '<h3>Can you donate?</h3>' +
            '<p>A 30-second self-check against age, weight and the gap since your last donation.</p>' +
            '<button class="btn btn--outline" onclick="UI.eligibilityChecker()">Check my eligibility</button>' +
          '</section>' +
        '</div>' +
      '</div>' +
      '<div style="margin-top:22px"><button class="btn btn--ghost" onclick="UI.menuAction(\'logout\')">Leave guest mode</button></div>';
  },

  /* ---------- DONOR ---------- */
  renderDonor() {
    const d = this.me;
    this.hero(d.name, 'Blood donor', U.initials(d.name),
      [[d.donation_count || 0, 'Donations'], [d.blood_group || '—', 'Blood group'], [d.city || '—', 'City']]);

    document.getElementById('proBody').innerHTML =
      '<div class="pro-cols">' +
        '<div>' +
          '<section class="panel">' +
            '<div class="panel__row">' +
              '<div style="flex:1"><h3>Show me in searches</h3>' +
              '<p>Turn this off and your card and map pin disappear until you switch it back on.</p></div>' +
              '<label class="switch"><input type="checkbox" id="availToggle"' + (d.is_available ? ' checked' : '') + '>' +
              '<span class="switch__track"></span><span class="switch__thumb"></span></label>' +
            '</div>' +
          '</section>' +

          '<section class="panel is-open" id="editCard">' +
            '<button class="panel__head" data-toggle>' + Icons.edit + 'My details' + Icons.chev + '</button>' +
            '<div class="panel__body">' +
              '<div class="field-row"><div class="field"><label for="pName">Name</label><input id="pName" class="input" value="' + U.esc(d.name || '') + '"></div>' +
              '<div class="field"><label for="pCity">City</label><input id="pCity" class="input" value="' + U.esc(d.city || '') + '"></div></div>' +
              '<div class="field-row">' +
                '<div class="field"><label for="pAge">Age</label><input id="pAge" class="input" type="number" value="' + (d.age || '') + '"></div>' +
                '<div class="field"><label for="pWeight">Weight (kg)</label><input id="pWeight" class="input" type="number" value="' + (d.weight || '') + '"></div>' +
              '</div>' +
              '<div class="field-row">' +
                '<div class="field"><label for="pGroup">Blood group</label><select id="pGroup" class="input">' +
                  CONFIG.BLOOD_GROUPS.map(g => '<option' + (d.blood_group === g ? ' selected' : '') + '>' + g + '</option>').join('') + '</select></div>' +
                '<div class="field"><label for="pPhone">Phone</label><input id="pPhone" class="input" inputmode="numeric" value="' + U.esc(d.phone || '') + '"></div>' +
              '</div>' +
              '<div class="field"><label for="pLast">Last donated</label><select id="pLast" class="input">' +
                ['Never', 'Less than 3 months ago', '3-6 months ago', 'More than 6 months ago']
                  .map(o => '<option' + (d.last_donated === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>' +
              '<label class="check"><input type="checkbox" id="pCond"' + (d.has_condition ? ' checked' : '') + '>' +
                '<span>I have a medical condition staff should know about</span></label>' +
              '<button class="btn btn--primary" id="saveDonor">Save changes</button>' +
            '</div>' +
          '</section>' +

          '<section class="panel" id="histCard">' +
            '<button class="panel__head" data-toggle>' + Icons.drop + 'Donation history' + Icons.chev + '</button>' +
            '<div class="panel__body"><div id="histList">' + UI.skeletonCards(1) + '</div>' +
              '<button class="btn btn--outline" id="logDonation" style="margin-top:16px">Log a new donation</button>' +
            '</div>' +
          '</section>' +

          '<section class="panel" id="locCard">' +
            '<button class="panel__head" data-toggle>' + Icons.pin + 'Map location' + Icons.chev + '</button>' +
            '<div class="panel__body">' +
              '<p style="font-size:14px;color:var(--ink-mid)">Your pin currently sits at ' +
                (d.latitude ? d.latitude.toFixed(3) + ', ' + d.longitude.toFixed(3) : 'no location yet') + '.</p>' +
              '<button class="btn btn--ghost" id="updateLoc">Update to my current location</button>' +
            '</div>' +
          '</section>' +
        '</div>' +

        '<div>' +
          '<section class="card feature">' +
            '<div class="feature__mark">' + Icons.check + '</div>' +
            '<h3>Can you donate right now?</h3>' +
            '<p>Check yourself against age, weight and the gap since your last donation before you say yes to a request.</p>' +
            '<button class="btn btn--outline" onclick="UI.eligibilityChecker()">Check my eligibility</button>' +
          '</section>' +
          '<section class="card feature" style="margin-top:18px">' +
            '<div class="feature__mark">' + Icons.alert + '</div>' +
            '<h3>Open requests</h3>' +
            '<p>People near you looking for a match today. Filter to the groups your ' + U.esc(d.blood_group || 'blood') + ' can supply.</p>' +
            '<a class="btn btn--primary" href="emergency.html">See requests</a>' +
          '</section>' +
          '<section class="card feature" style="margin-top:18px">' +
            '<div class="feature__mark">' + Icons.settings + '</div>' +
            '<h3>Account</h3>' +
            '<p>Sign out of this browser, or restore the demo dataset to its starting state.</p>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
              '<button class="btn btn--danger btn--sm" onclick="UI.menuAction(\'logout\')">Sign out</button>' +
              (CONFIG.DEMO_MODE ? '<button class="btn btn--ghost btn--sm" id="resetDemoBtn">Reset demo data</button>' : '') +
            '</div>' +
          '</section>' +
        '</div>' +
      '</div>';

    this.bindPanels();
    this.bindReset();

    document.getElementById('availToggle').addEventListener('change', async e => {
      try {
        await Api.updateProfile(d.id, { is_available: e.target.checked });
        Auth.update({ is_available: e.target.checked });
        UI.toast(e.target.checked ? 'You are visible to people searching.' : 'You are hidden from searches.', 'success');
      } catch (err) { UI.toast(err.message, 'error'); e.target.checked = !e.target.checked; }
    });
    document.getElementById('saveDonor').addEventListener('click', () => this.saveDonor());
    document.getElementById('updateLoc').addEventListener('click', () => this.updateLoc());
    document.getElementById('logDonation').addEventListener('click', () => this.logDonation());
    this.loadHistory();
  },

  bindReset() {
    const btn = document.getElementById('resetDemoBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const ok = await UI.confirm({ title: 'Reset demo data?', message: 'All demo edits, requests and new accounts return to the starting set.', confirmLabel: 'Reset', variant: 'danger' });
      if (ok) { DemoDB.reset(); Auth.signOut(); location.href = 'auth.html'; }
    });
  },

  async loadHistory() {
    const host = document.getElementById('histList');
    if (!host) return;
    try {
      const rows = await Api.listDonations(this.me.id);
      host.innerHTML = rows.length
        ? rows.map(r => {
            const dt = new Date(r.donated_at);
            return '<div class="hist-row">' +
              '<div class="hist-row__date"><div class="hist-row__d">' + dt.getDate() + '</div>' +
              '<div class="hist-row__m">' + dt.toLocaleDateString('en-IN', { month: 'short' }) + '</div></div>' +
              '<div style="min-width:0"><div class="hist-row__b">' + U.esc(r.blood_bank || 'Donation') + '</div>' +
              '<div class="hist-row__c">' + U.esc(r.city || '') + (r.notes ? ' · ' + U.esc(r.notes) : '') + ' · ' + dt.getFullYear() + '</div></div>' +
            '</div>';
          }).join('')
        : '<p style="font-size:14px;color:var(--text-muted);padding:8px 0">No donations logged yet. Add your first one below.</p>';
    } catch (e) { host.innerHTML = '<p style="font-size:14px;color:var(--text-muted)">Could not load history.</p>'; }
  },

  logDonation() {
    UI.sheet({
      title: 'Log a donation',
      body:
        '<div class="field"><label for="ldDate">Date</label><input id="ldDate" class="input" type="date" value="' + new Date().toISOString().slice(0, 10) + '"></div>' +
        '<div class="field"><label for="ldBank">Where</label><input id="ldBank" class="input" placeholder="Blood bank or camp name"></div>' +
        '<div class="field"><label for="ldCity">City</label><input id="ldCity" class="input" value="' + U.esc(this.me.city || '') + '"></div>' +
        '<div class="field"><label for="ldNote">Notes</label><input id="ldNote" class="input" placeholder="Optional — whole blood, platelets…"></div>',
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        { label: 'Save donation', variant: 'primary', keepOpen: true, onClick: async (root, close) => {
            const v = id => root.querySelector('#' + id).value.trim();
            if (!v('ldBank')) { UI.toast('Enter where you donated.', 'error'); return; }
            await Api.logDonation({ donor: this.me.id, donated_at: v('ldDate'), blood_bank: v('ldBank'), city: v('ldCity'), notes: v('ldNote') });
            close(true);
            UI.toast('Donation logged. Thank you.', 'success');
            this.me = await Api.getProfile(this.me.id);
            Auth.signIn(this.me);
            this.loadHistory();
          } }
      ]
    });
  },

  async saveDonor() {
    const btn = document.getElementById('saveDonor');
    const v = id => document.getElementById(id).value.trim();
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const updated = await Api.updateProfile(this.me.id, {
        name: v('pName'), city: v('pCity'),
        age: Number(v('pAge')) || null, weight: Number(v('pWeight')) || null,
        blood_group: v('pGroup'), phone: v('pPhone'), last_donated: v('pLast'),
        has_condition: document.getElementById('pCond').checked
      });
      this.me = updated; Auth.signIn(updated);
      UI.toast('Profile saved.', 'success');
    } catch (err) { UI.toast(err.message, 'error'); }
    btn.disabled = false; btn.textContent = 'Save changes';
  },

  async updateLoc() {
    const btn = document.getElementById('updateLoc');
    btn.disabled = true; btn.textContent = 'Locating…';
    try {
      const p = await Geo.locate();
      const city = await Geo.cityFrom(p.lat, p.lng);
      await Api.updateLocation(this.me.id, p.lat, p.lng, city || this.me.city);
      Auth.update({ latitude: p.lat, longitude: p.lng, city: city || this.me.city });
      UI.toast('Map location updated.', 'success');
    } catch (e) {}
    btn.disabled = false; btn.textContent = 'Update to my current location';
  },

  /* ---------- BLOOD BANK ---------- */
  renderBank() {
    const b = this.me;
    const stock = b.stock || {};
    const total = CONFIG.BLOOD_GROUPS.reduce((s, g) => s + (Number(stock[g]) || 0), 0);
    this.hero(b.bank_name, 'Blood bank', U.initials(b.bank_name),
      [[total, 'Units in stock'], [(Number(b.rating) || 0).toFixed(1), 'Rating'], [b.city || '—', 'City']]);

    document.getElementById('proBody').innerHTML =
      '<div class="pro-cols">' +
        '<div>' +
          '<section class="panel"><div class="panel__row">' +
            '<div style="flex:1"><h3>We are open right now</h3>' +
            '<p>Shown as OPEN or CLOSED on every listing and map pin.</p></div>' +
            '<label class="switch"><input type="checkbox" id="openToggle"' + (b.is_open ? ' checked' : '') + '>' +
            '<span class="switch__track"></span><span class="switch__thumb"></span></label>' +
          '</div></section>' +

          '<section class="panel is-open" id="stockCard">' +
            '<button class="panel__head" data-toggle>' + Icons.drop + 'Update stock' + Icons.chev + '</button>' +
            '<div class="panel__body">' +
              '<div class="field-row" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">' +
                CONFIG.BLOOD_GROUPS.map(g =>
                  '<div class="field"><label for="st_' + g + '">' + g + ' units</label>' +
                  '<input id="st_' + g + '" class="input" type="number" min="0" value="' + (Number(stock[g]) || 0) + '"></div>').join('') +
              '</div>' +
              '<button class="btn btn--primary" id="saveStock">Save stock</button>' +
            '</div>' +
          '</section>' +

          '<section class="panel" id="editBankCard">' +
            '<button class="panel__head" data-toggle>' + Icons.edit + 'Centre details' + Icons.chev + '</button>' +
            '<div class="panel__body">' +
              '<div class="field"><label for="bName">Bank name</label><input id="bName" class="input" value="' + U.esc(b.bank_name || '') + '"></div>' +
              '<div class="field"><label for="bCity">City</label><input id="bCity" class="input" value="' + U.esc(b.city || '') + '"></div>' +
              '<div class="field"><label for="bAddr">Address</label><textarea id="bAddr" class="input">' + U.esc(b.bank_address || '') + '</textarea></div>' +
              '<div class="field-row">' +
                '<div class="field"><label for="bPhone">Phone</label><input id="bPhone" class="input" inputmode="numeric" value="' + U.esc(b.bank_phone || '') + '"></div>' +
                '<div class="field"><label for="bTiming">Timing</label><input id="bTiming" class="input" value="' + U.esc(b.timing || '') + '" placeholder="9 AM - 9 PM"></div>' +
              '</div>' +
              '<button class="btn btn--primary" id="saveBank">Save changes</button>' +
            '</div>' +
          '</section>' +
        '</div>' +

        '<div>' +
          '<section class="card feature">' +
            '<div class="feature__mark">' + Icons.chart + '</div>' +
            '<h3>Network dashboard</h3>' +
            '<p>Donors by group, units on shelf across every centre, and where the register is thin.</p>' +
            '<a class="btn btn--primary" href="admin.html">Open dashboard</a>' +
          '</section>' +
          '<section class="card feature" style="margin-top:18px">' +
            '<div class="feature__mark">' + Icons.alert + '</div>' +
            '<h3>Open requests</h3>' +
            '<p>See who is looking for stock you may already have on the shelf.</p>' +
            '<a class="btn btn--outline" href="emergency.html">See requests</a>' +
          '</section>' +
          '<section class="card feature" style="margin-top:18px">' +
            '<div class="feature__mark">' + Icons.settings + '</div>' +
            '<h3>Account</h3>' +
            '<p>Sign out of this browser, or restore the demo dataset to its starting state.</p>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
              '<button class="btn btn--danger btn--sm" onclick="UI.menuAction(\'logout\')">Sign out</button>' +
              (CONFIG.DEMO_MODE ? '<button class="btn btn--ghost btn--sm" id="resetDemoBtn">Reset demo data</button>' : '') +
            '</div>' +
          '</section>' +
        '</div>' +
      '</div>';

    this.bindPanels();
    this.bindReset();

    document.getElementById('openToggle').addEventListener('change', async e => {
      try {
        await Api.updateProfile(b.id, { is_open: e.target.checked });
        Auth.update({ is_open: e.target.checked });
        UI.toast(e.target.checked ? 'Listed as open.' : 'Listed as closed.', 'success');
      } catch (err) { UI.toast(err.message, 'error'); e.target.checked = !e.target.checked; }
    });
    document.getElementById('saveStock').addEventListener('click', () => this.saveStock());
    document.getElementById('saveBank').addEventListener('click', () => this.saveBank());
  },

  async saveStock() {
    const btn = document.getElementById('saveStock');
    btn.disabled = true; btn.textContent = 'Saving…';
    const patch = {};
    CONFIG.BLOOD_GROUPS.forEach(g => { patch[g] = Math.max(0, Number(document.getElementById('st_' + g).value) || 0); });
    try {
      await Api.updateStock(this.me.id, patch);
      this.me.stock = patch; Auth.update({ stock: patch });
      UI.toast('Stock updated. Listings now show the new counts.', 'success');
    } catch (err) { UI.toast(err.message, 'error'); }
    btn.disabled = false; btn.textContent = 'Save stock';
  },

  async saveBank() {
    const btn = document.getElementById('saveBank');
    const v = id => document.getElementById(id).value.trim();
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const updated = await Api.updateProfile(this.me.id, {
        bank_name: v('bName'), city: v('bCity'), bank_address: v('bAddr'),
        bank_phone: v('bPhone'), timing: v('bTiming')
      });
      this.me = updated; Auth.signIn(updated);
      UI.toast('Centre details saved.', 'success');
    } catch (err) { UI.toast(err.message, 'error'); }
    btn.disabled = false; btn.textContent = 'Save changes';
  },

  bindPanels() {
    document.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.panel').classList.toggle('is-open'));
    });
  }
};

/* ------------------------------------------------------------
   DASHBOARD  (admin.html)
   ------------------------------------------------------------ */
const AdminPage = {
  donors: [], banks: [], requests: [], tableMode: 'donors',

  async init() {
    if (!Auth.requireSession()) return;
    document.getElementById('adminTableSearch').addEventListener('input',
      U.debounce(e => this.renderTable(e.target.value.trim().toLowerCase()), 250));
    document.querySelectorAll('[data-tab-table]').forEach(b =>
      b.addEventListener('click', () => {
        document.querySelectorAll('[data-tab-table]').forEach(x => x.classList.remove('is-on'));
        b.classList.add('is-on');
        this.tableMode = b.dataset.tabTable;
        this.renderTable(document.getElementById('adminTableSearch').value.trim().toLowerCase());
      }));
    await this.load();
  },

  async load() {
    try {
      const [donors, banks, requests, stats] = await Promise.all([
        Api.listDonors({}), Api.listBanks({}), Api.listRequests({}), Api.stats()
      ]);
      this.donors = donors; this.banks = banks; this.requests = requests;
      this.renderKpis(stats);
      this.renderGroupChart();
      this.renderStockChart();
      this.renderAvailChart();
      this.renderCityChart();
      this.renderTable('');
    } catch (err) {
      document.getElementById('adminBody').innerHTML = UI.empty('Dashboard could not load', err.message);
    }
  },

  renderKpis(s) {
    const openReq = this.requests.filter(r => r.status === 'open').length;
    const critical = this.requests.filter(r => r.status === 'open' && r.urgency === 'critical').length;
    const totalUnits = this.banks.reduce((sum, b) =>
      sum + CONFIG.BLOOD_GROUPS.reduce((x, g) => x + (Number((b.stock || {})[g]) || 0), 0), 0);
    const pct = s.total_donors ? Math.round(s.available_donors / s.total_donors * 100) : 0;

    document.getElementById('kpis').innerHTML =
      this.kpi('Registered donors', s.total_donors, pct + '% available now', 'up') +
      this.kpi('Blood centres', s.total_banks, s.open_banks + ' open right now', 'up') +
      this.kpi('Units on shelf', totalUnits, 'across ' + s.total_banks + ' centres', '') +
      this.kpi('Open requests', openReq, critical ? critical + ' marked critical' : 'none critical', critical ? 'warn' : 'up');
  },

  kpi(label, num, delta, tone) {
    return '<div class="kpi"><div class="kpi__l">' + U.esc(label) + '</div>' +
           '<div class="kpi__n">' + num + '</div>' +
           '<div class="kpi__d' + (tone ? ' kpi__d--' + tone : '') + '">' + U.esc(delta) + '</div></div>';
  },

  renderGroupChart() {
    const counts = CONFIG.BLOOD_GROUPS.map(g => ({ g, n: this.donors.filter(d => d.blood_group === g).length }));
    const max = Math.max(1, ...counts.map(c => c.n));
    document.getElementById('groupChart').innerHTML = counts.map(c =>
      '<div class="bar-row"><span class="bar-row__g">' + c.g + '</span>' +
      '<div class="bar-row__t"><div class="bar-row__f" style="width:' + (c.n / max * 100) + '%"></div></div>' +
      '<span class="bar-row__v">' + c.n + '</span></div>').join('');
  },

  renderStockChart() {
    const totals = CONFIG.BLOOD_GROUPS.map(g => ({
      g, n: this.banks.reduce((s, b) => s + (Number((b.stock || {})[g]) || 0), 0)
    }));
    const max = Math.max(1, ...totals.map(t => t.n));
    document.getElementById('stockChart').innerHTML = totals.map(t =>
      '<div class="bar-row"><span class="bar-row__g">' + t.g + '</span>' +
      '<div class="bar-row__t"><div class="bar-row__f bar-row__f--stock" style="width:' + (t.n / max * 100) + '%"></div></div>' +
      '<span class="bar-row__v">' + t.n + '</span></div>').join('');

    const shortages = totals.filter(t => t.n < CONFIG.STOCK_LOW).map(t => t.g);
    document.getElementById('stockNote').innerHTML = shortages.length
      ? '<span class="tag tag--warn">Running low network-wide: ' + shortages.join(', ') + '</span>'
      : '<span class="tag tag--ok">Every group is above the low-stock line</span>';
  },

  renderAvailChart() {
    const avail = this.donors.filter(d => d.is_available).length;
    const away = this.donors.length - avail;
    const total = Math.max(1, this.donors.length);
    const slices = [
      { label: 'Available', n: avail, color: '#1E8A4A' },
      { label: 'Hidden', n: away, color: '#EDD8D8' }
    ];
    const R = 52, C = 2 * Math.PI * R;
    let offset = 0;
    const rings = slices.map(s => {
      const len = s.n / total * C;
      const seg = '<circle cx="66" cy="66" r="' + R + '" fill="none" stroke="' + s.color + '" stroke-width="22" ' +
                  'stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 66 66)"/>';
      offset += len; return seg;
    }).join('');

    document.getElementById('availChart').innerHTML =
      '<div class="donut-wrap">' +
        '<svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label="Donor availability">' + rings +
          '<text x="66" y="62" text-anchor="middle" font-size="26" font-weight="900" fill="#1A0A0A">' + avail + '</text>' +
          '<text x="66" y="80" text-anchor="middle" font-size="10" font-weight="700" fill="#8B5555">AVAILABLE</text>' +
        '</svg>' +
        '<div class="donut-key">' + slices.map(s =>
          '<div><i style="background:' + s.color + '"></i>' + s.label + ' — ' + s.n + '</div>').join('') + '</div>' +
      '</div>';
  },

  renderCityChart() {
    const cities = {};
    this.donors.forEach(d => { const c = d.city || 'Unknown'; cities[c] = (cities[c] || 0) + 1; });
    const top = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 6);
    document.getElementById('cityChart').innerHTML = top.length
      ? top.map(([c, n]) =>
          '<div class="bar-row" style="grid-template-columns:110px 1fr 32px">' +
          '<span class="bar-row__g" style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + U.esc(c) + '</span>' +
          '<div class="bar-row__t"><div class="bar-row__f" style="width:' + (n / top[0][1] * 100) + '%"></div></div>' +
          '<span class="bar-row__v">' + n + '</span></div>').join('')
      : '<p style="font-size:14px;color:var(--text-muted)">No city data yet.</p>';
  },

  renderTable(q) {
    const host = document.getElementById('adminTable');
    if (this.tableMode === 'banks') {
      const rows = this.banks.filter(b => !q || (b.bank_name + b.city).toLowerCase().includes(q));
      host.innerHTML =
        '<table class="tbl"><thead><tr><th>Centre</th><th>City</th><th>Status</th><th>Units</th><th>Phone</th></tr></thead><tbody>' +
        rows.map(b => {
          const units = CONFIG.BLOOD_GROUPS.reduce((s, g) => s + (Number((b.stock || {})[g]) || 0), 0);
          return '<tr><td class="tbl__name">' + U.esc(b.bank_name) + '</td><td>' + U.esc(b.city || '—') + '</td>' +
            '<td>' + (b.is_open ? '<span class="tag tag--ok">Open</span>' : '<span class="tag tag--bad">Closed</span>') + '</td>' +
            '<td>' + units + '</td><td>' + U.esc(b.bank_phone || '—') + '</td></tr>';
        }).join('') + '</tbody></table>';
    } else if (this.tableMode === 'requests') {
      const rows = this.requests.filter(r => !q || (r.patient_name + r.city + r.blood_group).toLowerCase().includes(q));
      host.innerHTML =
        '<table class="tbl"><thead><tr><th>Patient</th><th>Group</th><th>Units</th><th>City</th><th>Urgency</th><th>Status</th><th>Posted</th></tr></thead><tbody>' +
        rows.map(r =>
          '<tr><td class="tbl__name">' + U.esc(r.patient_name) + '</td><td>' + UI.bloodBadge(r.blood_group, 'sm') + '</td>' +
          '<td>' + r.units + '</td><td>' + U.esc(r.city) + '</td><td>' + U.esc(r.urgency) + '</td>' +
          '<td>' + (r.status === 'open' ? '<span class="tag tag--warn">Open</span>' : '<span class="tag tag--ok">Fulfilled</span>') + '</td>' +
          '<td>' + U.timeAgo(r.created_at) + '</td></tr>').join('') + '</tbody></table>';
    } else {
      const rows = this.donors.filter(d => !q || (d.name + d.city + d.blood_group).toLowerCase().includes(q));
      host.innerHTML =
        '<table class="tbl"><thead><tr><th>Donor</th><th>Group</th><th>City</th><th>Status</th><th>Donations</th><th>Last donated</th></tr></thead><tbody>' +
        rows.map(d =>
          '<tr><td class="tbl__name">' + U.esc(d.name) + '</td><td>' + UI.bloodBadge(d.blood_group, 'sm') + '</td>' +
          '<td>' + U.esc(d.city || '—') + '</td>' +
          '<td>' + (d.is_available ? '<span class="tag tag--ok">Available</span>' : '<span class="tag">Hidden</span>') + '</td>' +
          '<td>' + (d.donation_count || 0) + '</td><td>' + U.esc(d.last_donated || 'Never') + '</td></tr>').join('') +
        '</tbody></table>';
    }
    if (!host.querySelector('tbody tr')) host.innerHTML = UI.empty('Nothing matches', 'Try a different search term.');
  }
};

/* ------------------------------------------------------------
   ICONS
   ------------------------------------------------------------ */
const Icons = {
  pin:      '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>',
  drop:     '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 3s5.5 6 5.5 10a5.5 5.5 0 1 1-11 0C6.5 9 12 3 12 3z"/></svg>',
  phone:    '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z"/></svg>',
  chat:     '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1z"/></svg>',
  nav:      '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2 3 21l9-4 9 4z"/></svg>',
  clock:    '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4V6h-2v7.4l5 3 1-1.7z"/></svg>',
  star:     '<svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="m12 17.3 6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7l-7.1.6 5.4 4.7-1.6 7z"/></svg>',
  hospital: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M4 21V8l8-5 8 5v13h-6v-5h-4v5H4zm7-11h2v2h2v2h-2v2h-2v-2H9v-2h2v-2z"/></svg>',
  user:     '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z"/></svg>',
  cal:      '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 8v9H5v-9h14z"/></svg>',
  dot:      '<svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>',
  edit:     '<svg viewBox="0 0 24 24" width="19" height="19"><path fill="currentColor" d="M3 17.2V21h3.8L18 9.8 14.2 6 3 17.2zM20.7 7.3a1 1 0 0 0 0-1.4l-2.6-2.6a1 1 0 0 0-1.4 0L15 5l3.8 3.8 1.9-1.5z"/></svg>',
  chev:     '<svg class="panel__chev" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="m7 10 5 5 5-5z"/></svg>',
  alert:    '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z"/></svg>',
  map:      '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="m9 3-6 2v16l6-2 6 2 6-2V3l-6 2-6-2zm0 2.2 6 2v11.6l-6-2V5.2z"/></svg>',
  chart:    '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4 20h16v2H2V2h2v18zm3-3V9h3v8H7zm5 0V4h3v13h-3zm5 0v-6h3v6h-3z"/></svg>',
  check:    '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 15-5-5 1.4-1.4L11 14.2l6.6-6.6L19 9l-8 8z"/></svg>',
  info:     '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.9 4a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L16 3H8l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.7 7.7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L8 21h8l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z"/></svg>',
  search:   '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.3l5 5 1.4-1.4-5-5A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/></svg>',
  plus:     '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>'
};

/* ------------------------------------------------------------
   DISPATCH
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  const map = {
    splash: SplashPage, auth: AuthPage, donors: DonorsPage,
    banks: BanksPage, map: MapPage, profile: ProfilePage,
    emergency: EmergencyPage, admin: AdminPage
  };
  if (page !== 'splash') bootPage();
  const ctrl = map[page];
  if (ctrl) ctrl.init();
});

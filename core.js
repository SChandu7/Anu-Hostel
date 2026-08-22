/* ============================================================
   InfoREDZ Web — core.js
   Config · Storage · Auth · Demo DB · API service · UI helpers
   Loaded by every page before pages.js
   ============================================================ */

/* ------------------------------------------------------------
   1. CONFIG  — flip DEMO_MODE to false to go live
   ------------------------------------------------------------ */
const CONFIG = {
  DEMO_MODE: true,                                       // <— single switch
  API_BASE : 'https://api.chandus7.in/api/inforedz',     // trailing slash NOT included
  APP_NAME : 'InfoREDZ',
  SUPPORT_EMAIL: 'infusionmedzone@gmail.com',
  SUPPORT_PHONE: '919381740718',
  PRIVACY_URL  : 'https://schandu7.github.io/infumedz/',
  BLOOD_GROUPS : ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  STOCK_GOOD: 15,
  STOCK_LOW : 5
};

/* ------------------------------------------------------------
   2. STORAGE — localStorage with in-memory fallback
   ------------------------------------------------------------ */
const Store = (() => {
  const mem = {};
  let usable = true;
  try { const k = '__ir__'; localStorage.setItem(k, '1'); localStorage.removeItem(k); }
  catch (e) { usable = false; }

  return {
    get(key, fallback = null) {
      try {
        const raw = usable ? localStorage.getItem(key) : mem[key];
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      try { usable ? localStorage.setItem(key, raw) : (mem[key] = raw); }
      catch (e) { mem[key] = raw; }
    },
    remove(key) {
      try { usable ? localStorage.removeItem(key) : delete mem[key]; }
      catch (e) { delete mem[key]; }
    }
  };
})();

/* ------------------------------------------------------------
   3. AUTH STATE  — mirrors AuthState in main.dart
   ------------------------------------------------------------ */
const Auth = {
  get user()       { return Store.get('ir_user', null); },
  get role()       { return this.user ? this.user.role : (Store.get('ir_guest', false) ? 'guest' : null); },
  get userId()     { return this.user ? this.user.id : null; },
  get isLoggedIn() { return !!this.user; },
  get isGuest()    { return !this.user && Store.get('ir_guest', false) === true; },

  signIn(user) { Store.set('ir_user', user); Store.remove('ir_guest'); },
  signInGuest() { Store.remove('ir_user'); Store.set('ir_guest', true); },
  update(patch) { const u = this.user; if (u) Store.set('ir_user', Object.assign({}, u, patch)); },
  signOut() { Store.remove('ir_user'); Store.remove('ir_guest'); },

  /** Redirect to auth if no session at all. */
  requireSession() {
    if (!this.isLoggedIn && !this.isGuest) { location.replace('auth.html'); return false; }
    return true;
  }
};

/* ------------------------------------------------------------
   4. DEMO DATABASE
   Seeded once, then persisted so edits survive a refresh.
   Reset from the Profile page or with DemoDB.reset().
   ------------------------------------------------------------ */
const DemoDB = (() => {
  const KEY = 'ir_demo_db_v1';

  const seed = () => ({
    users: [
      /* ---------- DONORS (12) ---------- */
      { id: 1, role: 'donor', name: 'Akif Ahamad Baig', email: 'akif@demo.in', password: 'demo123',
        blood_group: 'B-', city: 'Guntur', age: 27, gender: 'Male', weight: 72,
        last_donated: '3-6 months ago', has_condition: false, is_available: true,
        donation_count: 6, phone: '9885012345', latitude: 16.3067, longitude: 80.4365, created_at: '2024-11-02' },

      { id: 2, role: 'donor', name: 'Azahar Shaik', email: 'azahar@demo.in', password: 'demo123',
        blood_group: 'A+', city: 'Mangalagiri', age: 24, gender: 'Male', weight: 68,
        last_donated: 'Less than 3 months ago', has_condition: false, is_available: false,
        donation_count: 3, phone: '9885023456', latitude: 16.4307, longitude: 80.5680, created_at: '2025-01-18' },

      { id: 3, role: 'donor', name: 'Sameena Farheen', email: 'sameena@demo.in', password: 'demo123',
        blood_group: 'O+', city: 'Vijayawada', age: 31, gender: 'Female', weight: 58,
        last_donated: 'More than 6 months ago', has_condition: false, is_available: true,
        donation_count: 11, phone: '9885034567', latitude: 16.5062, longitude: 80.6480, created_at: '2024-08-09' },

      { id: 4, role: 'donor', name: 'Nihal Baig', email: 'nihal@demo.in', password: 'demo123',
        blood_group: 'O-', city: 'Hyderabad', age: 29, gender: 'Male', weight: 75,
        last_donated: 'More than 6 months ago', has_condition: false, is_available: true,
        donation_count: 9, phone: '9885045678', latitude: 17.3850, longitude: 78.4867, created_at: '2024-06-21' },

      { id: 5, role: 'donor', name: 'Praveen Kumar', email: 'praveen@demo.in', password: 'demo123',
        blood_group: 'A-', city: 'Tenali', age: 22, gender: 'Male', weight: 64,
        last_donated: 'Never', has_condition: false, is_available: true,
        donation_count: 0, phone: '9885056789', latitude: 16.2430, longitude: 80.6400, created_at: '2025-04-11' },

      { id: 6, role: 'donor', name: 'Lakshmi Priya', email: 'lakshmi@demo.in', password: 'demo123',
        blood_group: 'B+', city: 'Bapatla', age: 26, gender: 'Female', weight: 55,
        last_donated: '3-6 months ago', has_condition: false, is_available: true,
        donation_count: 4, phone: '9885067890', latitude: 15.9040, longitude: 80.4670, created_at: '2025-02-27' },

      { id: 7, role: 'donor', name: 'Rahul Varma', email: 'rahul@demo.in', password: 'demo123',
        blood_group: 'AB+', city: 'Ongole', age: 34, gender: 'Male', weight: 80,
        last_donated: 'Less than 3 months ago', has_condition: false, is_available: false,
        donation_count: 7, phone: '9885078901', latitude: 15.5057, longitude: 80.0499, created_at: '2024-12-05' },

      { id: 8, role: 'donor', name: 'Sneha Reddy', email: 'sneha@demo.in', password: 'demo123',
        blood_group: 'O+', city: 'Eluru', age: 23, gender: 'Female', weight: 52,
        last_donated: 'More than 6 months ago', has_condition: false, is_available: true,
        donation_count: 2, phone: '9885089012', latitude: 16.7107, longitude: 81.0952, created_at: '2025-03-30' },

      { id: 9, role: 'donor', name: 'Imran Khan', email: 'imran@demo.in', password: 'demo123',
        blood_group: 'B-', city: 'Nellore', age: 38, gender: 'Male', weight: 78,
        last_donated: '3-6 months ago', has_condition: true, is_available: false,
        donation_count: 14, phone: '9885090123', latitude: 14.4426, longitude: 79.9865, created_at: '2024-05-16' },

      { id: 10, role: 'donor', name: 'Divya Sri', email: 'divya@demo.in', password: 'demo123',
        blood_group: 'AB-', city: 'Rajahmundry', age: 28, gender: 'Female', weight: 60,
        last_donated: 'More than 6 months ago', has_condition: false, is_available: true,
        donation_count: 5, phone: '9885101234', latitude: 17.0005, longitude: 81.8040, created_at: '2024-10-01' },

      { id: 11, role: 'donor', name: 'Karthik Naidu', email: 'karthik@demo.in', password: 'demo123',
        blood_group: 'A+', city: 'Visakhapatnam', age: 25, gender: 'Male', weight: 70,
        last_donated: 'Never', has_condition: false, is_available: true,
        donation_count: 0, phone: '9885112345', latitude: 17.6868, longitude: 83.2185, created_at: '2025-05-08' },

      { id: 12, role: 'donor', name: 'Fatima Begum', email: 'fatima@demo.in', password: 'demo123',
        blood_group: 'O-', city: 'Kurnool', age: 30, gender: 'Female', weight: 57,
        last_donated: '3-6 months ago', has_condition: false, is_available: true,
        donation_count: 8, phone: '9885123456', latitude: 15.8281, longitude: 78.0373, created_at: '2024-09-14' },

      /* ---------- BLOOD BANKS (6) ---------- */
      { id: 101, role: 'blood_bank', name: 'Sekhar Rao', email: 'famous@demo.in', password: 'demo123',
        bank_name: 'Famous Blood Centre', bank_address: 'Near Health Hospital, Main Road',
        bank_phone: '9949597079', city: 'Bapatla', timing: '9 AM - 9 PM', rating: 4.5,
        is_open: true, latitude: 15.9045, longitude: 80.4690, created_at: '2024-07-12',
        stock: { 'O+': 18, 'O-': 4, 'A+': 12, 'A-': 3, 'B+': 21, 'B-': 6, 'AB+': 9, 'AB-': 2 } },

      { id: 102, role: 'blood_bank', name: 'Ramesh Babu', email: 'healthcenter@demo.in', password: 'demo123',
        bank_name: 'Health Center Blood Bank', bank_address: 'Powerpet, Opp. Bus Stand',
        bank_phone: '9949512340', city: 'Eluru', timing: '24 Hours', rating: 4.2,
        is_open: true, latitude: 16.7120, longitude: 81.0980, created_at: '2024-08-03',
        stock: { 'O+': 7, 'O-': 1, 'A+': 16, 'A-': 8, 'B+': 4, 'B-': 0, 'AB+': 11, 'AB-': 5 } },

      { id: 103, role: 'blood_bank', name: 'Sunitha Rani', email: 'cityblood@demo.in', password: 'demo123',
        bank_name: 'City Care Blood Bank', bank_address: 'MG Road, Beside Govt. Hospital',
        bank_phone: '9949523451', city: 'Guntur', timing: '8 AM - 10 PM', rating: 4.7,
        is_open: true, latitude: 16.3080, longitude: 80.4400, created_at: '2024-04-25',
        stock: { 'O+': 34, 'O-': 12, 'A+': 28, 'A-': 9, 'B+': 30, 'B-': 14, 'AB+': 16, 'AB-': 7 } },

      { id: 104, role: 'blood_bank', name: 'Naveen Chandra', email: 'lifeline@demo.in', password: 'demo123',
        bank_name: 'Lifeline Blood Centre', bank_address: 'Benz Circle, 2nd Floor',
        bank_phone: '9949534562', city: 'Vijayawada', timing: '24 Hours', rating: 4.4,
        is_open: true, latitude: 16.5050, longitude: 80.6500, created_at: '2024-03-19',
        stock: { 'O+': 22, 'O-': 6, 'A+': 5, 'A-': 2, 'B+': 19, 'B-': 3, 'AB+': 4, 'AB-': 1 } },

      { id: 105, role: 'blood_bank', name: 'Anil Kumar', email: 'testcentre@demo.in', password: 'demo123',
        bank_name: 'Sanjeevani Blood Centre', bank_address: 'Ring Road, Near Metro Pillar 42',
        bank_phone: '9949545673', city: 'Hyderabad', timing: '9 AM - 6 PM', rating: 4.0,
        is_open: false, latitude: 17.3900, longitude: 78.4800, created_at: '2024-11-28',
        stock: { 'O+': 15, 'O-': 0, 'A+': 3, 'A-': 0, 'B+': 8, 'B-': 2, 'AB+': 0, 'AB-': 0 } },

      { id: 106, role: 'blood_bank', name: 'Padma Latha', email: 'redcross@demo.in', password: 'demo123',
        bank_name: 'Coastal Red Cross Centre', bank_address: 'Beach Road, Sector 4',
        bank_phone: '9949556784', city: 'Visakhapatnam', timing: '7 AM - 11 PM', rating: 4.6,
        is_open: true, latitude: 17.6880, longitude: 83.2160, created_at: '2024-06-02',
        stock: { 'O+': 26, 'O-': 9, 'A+': 20, 'A-': 11, 'B+': 17, 'B-': 5, 'AB+': 13, 'AB-': 4 } }
    ],

    /* ---------- EMERGENCY REQUESTS ---------- */
    requests: [
      { id: 1, blood_group: 'O-', units: 2, patient_name: 'R. Sailaja', hospital: 'Govt. General Hospital',
        city: 'Guntur', contact_phone: '9885012345', urgency: 'critical', note: 'Post-surgery, needed today.',
        latitude: 16.3067, longitude: 80.4365, status: 'open', created_by: 1,
        created_at: new Date(Date.now() - 2 * 3600e3).toISOString() },
      { id: 2, blood_group: 'B+', units: 1, patient_name: 'K. Mohan', hospital: 'Ramesh Hospitals',
        city: 'Vijayawada', contact_phone: '9885034567', urgency: 'urgent', note: 'Dialysis patient.',
        latitude: 16.5062, longitude: 80.6480, status: 'open', created_by: 3,
        created_at: new Date(Date.now() - 9 * 3600e3).toISOString() },
      { id: 3, blood_group: 'A+', units: 3, patient_name: 'S. Anjali', hospital: 'Apollo Hospitals',
        city: 'Hyderabad', contact_phone: '9885045678', urgency: 'normal', note: 'Scheduled for Friday.',
        latitude: 17.3850, longitude: 78.4867, status: 'open', created_by: 4,
        created_at: new Date(Date.now() - 26 * 3600e3).toISOString() },
      { id: 4, blood_group: 'AB-', units: 1, patient_name: 'D. Prasad', hospital: 'Sri Sai Nursing Home',
        city: 'Rajahmundry', contact_phone: '9885101234', urgency: 'urgent', note: 'Rare group, please share.',
        latitude: 17.0005, longitude: 81.8040, status: 'fulfilled', created_by: 10,
        created_at: new Date(Date.now() - 3 * 86400e3).toISOString() }
    ],

    /* ---------- DONATION LOG ---------- */
    donations: [
      { id: 1, donor: 1, donated_at: '2025-05-14', blood_bank: 'City Care Blood Bank', city: 'Guntur', notes: 'Whole blood' },
      { id: 2, donor: 1, donated_at: '2025-01-22', blood_bank: 'Famous Blood Centre', city: 'Bapatla', notes: 'Camp donation' },
      { id: 3, donor: 1, donated_at: '2024-09-08', blood_bank: 'City Care Blood Bank', city: 'Guntur', notes: '' },
      { id: 4, donor: 3, donated_at: '2025-06-02', blood_bank: 'Lifeline Blood Centre', city: 'Vijayawada', notes: 'Platelets' },
      { id: 5, donor: 3, donated_at: '2025-02-11', blood_bank: 'Lifeline Blood Centre', city: 'Vijayawada', notes: '' },
      { id: 6, donor: 4, donated_at: '2025-04-19', blood_bank: 'Sanjeevani Blood Centre', city: 'Hyderabad', notes: '' },
      { id: 7, donor: 6, donated_at: '2025-05-30', blood_bank: 'Famous Blood Centre', city: 'Bapatla', notes: '' },
      { id: 8, donor: 12, donated_at: '2025-03-04', blood_bank: 'Coastal Red Cross Centre', city: 'Visakhapatnam', notes: '' }
    ],
    nextId: 200
  });

  let db = Store.get(KEY, null);
  if (!db) { db = seed(); Store.set(KEY, db); }

  const save = () => Store.set(KEY, db);

  return {
    get data() { return db; },
    save,
    reset() { db = seed(); save(); },
    newId() { db.nextId += 1; save(); return db.nextId; }
  };
})();

/* ------------------------------------------------------------
   5. UTILITIES
   ------------------------------------------------------------ */
const U = {
  esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  initials(name) {
    const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  },

  /** Great-circle distance in km. */
  distanceKm(lat1, lng1, lat2, lng2) {
    if ([lat1, lng1, lat2, lng2].some(v => v == null || isNaN(v))) return null;
    const R = 6371, toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  fmtDistance(km) {
    if (km == null) return '';
    return km < 1 ? Math.round(km * 1000) + ' m away' : km.toFixed(km < 10 ? 1 : 0) + ' km away';
  },

  timeAgo(iso) {
    const then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return hrs + ' hr ago';
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'yesterday' : days + ' days ago';
  },

  fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso || '—');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  stockLevel(units) {
    const n = Number(units) || 0;
    if (n >= CONFIG.STOCK_GOOD) return 'good';
    if (n >= CONFIG.STOCK_LOW)  return 'low';
    return 'critical';
  },

  /** Which groups can receive from this donor group. */
  canDonateTo(group) {
    const map = {
      'O-': ['O-','O+','A-','A+','B-','B+','AB-','AB+'], 'O+': ['O+','A+','B+','AB+'],
      'A-': ['A-','A+','AB-','AB+'], 'A+': ['A+','AB+'],
      'B-': ['B-','B+','AB-','AB+'], 'B+': ['B+','AB+'],
      'AB-': ['AB-','AB+'], 'AB+': ['AB+']
    };
    return map[group] || [];
  },

  /** Which groups this recipient can receive from. */
  canReceiveFrom(group) {
    return CONFIG.BLOOD_GROUPS.filter(g => U.canDonateTo(g).includes(group));
  },

  tel(phone)  { return 'tel:+91' + String(phone).replace(/\D/g, '').slice(-10); },
  wa(phone, text) {
    const n = String(phone).replace(/\D/g, '').slice(-10);
    return 'https://wa.me/91' + n + (text ? '?text=' + encodeURIComponent(text) : '');
  },
  maps(lat, lng, label) {
    if (lat == null || lng == null) return 'https://www.google.com/maps/search/' + encodeURIComponent(label || '');
    return 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng;
  },

  qs(name) { return new URLSearchParams(location.search).get(name); },
  debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
};

/* ------------------------------------------------------------
   6. API SERVICE
   Same function names in demo + live mode.
   ------------------------------------------------------------ */
const Api = (() => {

  /* ---------- live transport ---------- */
  async function http(method, path, { params, body } = {}) {
    let url = CONFIG.API_BASE + path;
    if (params) {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) q.append(k, v); });
      const s = q.toString(); if (s) url += '?' + s;
    }
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
    let json = null;
    try { json = await res.json(); } catch (e) { /* non-JSON error page */ }
    if (!res.ok || !json || json.success === false) {
      throw new Error((json && json.message) || 'Request failed (' + res.status + ')');
    }
    return json.data !== undefined ? json.data : json;
  }

  /* ---------- demo helpers ---------- */
  const wait = (ms = 220) => new Promise(r => setTimeout(r, ms));
  const users = () => DemoDB.data.users;
  const clone = o => JSON.parse(JSON.stringify(o));
  const stripPw = u => { const c = clone(u); delete c.password; return c; };

  function demoFilterDonors({ blood_group, city, available, search } = {}) {
    let list = users().filter(u => u.role === 'donor');
    if (blood_group) list = list.filter(u => u.blood_group === blood_group);
    if (city)        list = list.filter(u => (u.city || '').toLowerCase().includes(city.toLowerCase()));
    if (String(available) === 'true') list = list.filter(u => u.is_available);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(u => (u.name || '').toLowerCase().includes(s) ||
                              (u.city || '').toLowerCase().includes(s) ||
                              (u.blood_group || '').toLowerCase().includes(s));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name)).map(stripPw);
  }

  function demoFilterBanks({ city, search, blood_group } = {}) {
    let list = users().filter(u => u.role === 'blood_bank');
    if (city)   list = list.filter(u => (u.city || '').toLowerCase().includes(city.toLowerCase()));
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(u => (u.bank_name || '').toLowerCase().includes(s) ||
                              (u.city || '').toLowerCase().includes(s));
    }
    if (blood_group) list = list.filter(u => (u.stock || {})[blood_group] > 0);
    return list.sort((a, b) => a.bank_name.localeCompare(b.bank_name)).map(stripPw);
  }

  return {
    get demo() { return CONFIG.DEMO_MODE; },

    /* ---- AUTH ---- */
    async login(email, password) {
      if (!CONFIG.DEMO_MODE) {
        const d = await http('POST', '/login/', { body: { email, password } });
        return d.user || d;
      }
      await wait();
      const u = users().find(x => x.email.toLowerCase() === String(email).toLowerCase().trim());
      if (!u || u.password !== password) throw new Error('Invalid email or password.');
      return stripPw(u);
    },

    async register(payload) {
      if (!CONFIG.DEMO_MODE) {
        const d = await http('POST', '/register/', { body: payload });
        return d.user || d;
      }
      await wait();
      const email = String(payload.email || '').toLowerCase().trim();
      if (users().some(u => u.email.toLowerCase() === email))
        throw new Error('An account with this email already exists.');
      if (!payload.password || payload.password.length < 6)
        throw new Error('Password must be at least 6 characters.');

      const u = Object.assign({
        id: DemoDB.newId(), created_at: new Date().toISOString().slice(0, 10),
        donation_count: 0, is_available: true, is_open: true, rating: 0, has_condition: false
      }, payload, { email });
      if (u.role === 'blood_bank' && !u.stock) {
        u.stock = CONFIG.BLOOD_GROUPS.reduce((a, g) => (a[g] = 0, a), {});
      }
      users().push(u); DemoDB.save();
      return stripPw(u);
    },

    /* ---- PROFILE ---- */
    async getProfile(userId) {
      if (!CONFIG.DEMO_MODE) return http('GET', '/profile/', { params: { user_id: userId } });
      await wait(120);
      const u = users().find(x => x.id === Number(userId));
      if (!u) throw new Error('User not found.');
      return stripPw(u);
    },

    async updateProfile(userId, patch) {
      if (!CONFIG.DEMO_MODE)
        return http('PATCH', '/profile/', { body: Object.assign({ user_id: userId }, patch) });
      await wait(180);
      const u = users().find(x => x.id === Number(userId));
      if (!u) throw new Error('User not found.');
      Object.assign(u, patch); DemoDB.save();
      return stripPw(u);
    },

    async updateLocation(userId, latitude, longitude, city) {
      if (!CONFIG.DEMO_MODE)
        return http('POST', '/location/', { body: { user_id: userId, latitude, longitude, city } });
      return this.updateProfile(userId, { latitude, longitude, city });
    },

    /* ---- DONORS ---- */
    async listDonors(filters) {
      if (!CONFIG.DEMO_MODE) return http('GET', '/donors/', { params: filters });
      await wait(150); return demoFilterDonors(filters);
    },
    async donorsMap() {
      if (!CONFIG.DEMO_MODE) return http('GET', '/donors/map/');
      await wait(120);
      return users().filter(u => u.role === 'donor' && u.is_available && u.latitude != null).map(stripPw);
    },
    async donorDetail(id) {
      if (!CONFIG.DEMO_MODE) return http('GET', '/donors/' + id + '/');
      await wait(100);
      const u = users().find(x => x.id === Number(id) && x.role === 'donor');
      if (!u) throw new Error('Donor not found.');
      return stripPw(u);
    },

    /* ---- BLOOD BANKS ---- */
    async listBanks(filters) {
      if (!CONFIG.DEMO_MODE) return http('GET', '/blood-banks/', { params: filters });
      await wait(150); return demoFilterBanks(filters);
    },
    async banksMap() {
      if (!CONFIG.DEMO_MODE) return http('GET', '/blood-banks/map/');
      await wait(120);
      return users().filter(u => u.role === 'blood_bank' && u.latitude != null).map(stripPw);
    },
    async bankDetail(id) {
      if (!CONFIG.DEMO_MODE) return http('GET', '/blood-banks/' + id + '/');
      await wait(100);
      const u = users().find(x => x.id === Number(id) && x.role === 'blood_bank');
      if (!u) throw new Error('Blood bank not found.');
      return stripPw(u);
    },
    async updateStock(userId, stock) {
      if (!CONFIG.DEMO_MODE)
        return http('PATCH', '/blood-banks/stock/', { body: Object.assign({ user_id: userId }, stock) });
      await wait(180);
      const u = users().find(x => x.id === Number(userId));
      if (!u) throw new Error('User not found.');
      u.stock = Object.assign({}, u.stock, stock); DemoDB.save();
      return u.stock;
    },

    /* ---- STATS ---- */
    async stats() {
      if (!CONFIG.DEMO_MODE) return http('GET', '/stats/');
      await wait(100);
      const d = users().filter(u => u.role === 'donor');
      const b = users().filter(u => u.role === 'blood_bank');
      return {
        total_donors: d.length,
        available_donors: d.filter(x => x.is_available).length,
        total_banks: b.length,
        open_banks: b.filter(x => x.is_open).length,
        cities: new Set(users().map(u => u.city).filter(Boolean)).size,
        total_donations: DemoDB.data.donations.length
      };
    },

    /* ---- EMERGENCY REQUESTS (needs BACKEND_PATCH.md endpoints when live) ---- */
    async listRequests(filters = {}) {
      if (!CONFIG.DEMO_MODE) return http('GET', '/requests/', { params: filters });
      await wait(140);
      let list = clone(DemoDB.data.requests);
      if (filters.blood_group) list = list.filter(r => r.blood_group === filters.blood_group);
      if (filters.city) list = list.filter(r => (r.city || '').toLowerCase().includes(filters.city.toLowerCase()));
      if (filters.status) list = list.filter(r => r.status === filters.status);
      return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    async createRequest(payload) {
      if (!CONFIG.DEMO_MODE) return http('POST', '/requests/', { body: payload });
      await wait(200);
      const r = Object.assign({ id: DemoDB.newId(), status: 'open', created_at: new Date().toISOString() }, payload);
      DemoDB.data.requests.unshift(r); DemoDB.save();
      return r;
    },
    async closeRequest(id, userId) {
      if (!CONFIG.DEMO_MODE) return http('PATCH', '/requests/', { body: { request_id: id, user_id: userId, status: 'fulfilled' } });
      await wait(150);
      const r = DemoDB.data.requests.find(x => x.id === Number(id));
      if (r) { r.status = 'fulfilled'; DemoDB.save(); }
      return r;
    },

    /* ---- DONATION HISTORY ---- */
    async listDonations(userId) {
      if (!CONFIG.DEMO_MODE) return http('GET', '/donations/', { params: { user_id: userId } });
      await wait(120);
      return clone(DemoDB.data.donations)
        .filter(d => d.donor === Number(userId))
        .sort((a, b) => new Date(b.donated_at) - new Date(a.donated_at));
    },
    async logDonation(payload) {
      if (!CONFIG.DEMO_MODE) return http('POST', '/donations/', { body: payload });
      await wait(180);
      const rec = Object.assign({ id: DemoDB.newId() }, payload);
      DemoDB.data.donations.unshift(rec);
      const u = users().find(x => x.id === Number(payload.donor));
      if (u) { u.donation_count = (u.donation_count || 0) + 1; u.last_donated = 'Less than 3 months ago'; }
      DemoDB.save();
      return rec;
    }
  };
})();

/* ------------------------------------------------------------
   7. GEOLOCATION
   ------------------------------------------------------------ */
const Geo = {
  get last() { return Store.get('ir_last_pos', null); },

  locate({ silent = false } = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Location is not supported in this browser.')); return; }
      navigator.geolocation.getCurrentPosition(
        pos => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, at: Date.now() };
          Store.set('ir_last_pos', p);
          resolve(p);
        },
        err => {
          if (!silent) {
            UI.toast(err.code === 1 ? 'Location permission was blocked. Allow it in your browser settings to sort by distance.'
                                    : 'Could not read your location. Try again.', 'error');
          }
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  },

  /** Free reverse geocode via Nominatim (same service the app uses). */
  async cityFrom(lat, lng) {
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&zoom=10', {
        headers: { 'Accept': 'application/json' }
      });
      const j = await r.json();
      const a = j.address || {};
      return a.city || a.town || a.village || a.county || a.state_district || '';
    } catch (e) { return ''; }
  },

  async searchCity(q) {
    if (!q || q.length < 3) return [];
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=6&q=' + encodeURIComponent(q));
      const j = await r.json();
      return j.map(x => ({
        label: x.display_name.split(',').slice(0, 2).join(',').trim(),
        full: x.display_name,
        lat: parseFloat(x.lat), lng: parseFloat(x.lon)
      }));
    } catch (e) { return []; }
  }
};

/* ------------------------------------------------------------
   8. SHARED UI  — toast, sheet, modal, chrome, skeletons
   ------------------------------------------------------------ */
const UI = {

  /* ---------- toast ---------- */
  toast(message, type = 'info', ms = 3200) {
    let host = document.querySelector('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="toast__dot"></span><span>' + U.esc(message) + '</span>';
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 260); }, ms);
  },

  /* ---------- bottom sheet / dialog ---------- */
  sheet({ title, body, actions = [], size = 'auto' }) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'sheet-backdrop';
      wrap.innerHTML =
        '<div class="sheet sheet--' + size + '" role="dialog" aria-modal="true" aria-label="' + U.esc(title || 'Dialog') + '">' +
          '<div class="sheet__grip"></div>' +
          (title ? '<h3 class="sheet__title">' + U.esc(title) + '</h3>' : '') +
          '<div class="sheet__body">' + (body || '') + '</div>' +
          (actions.length
            ? '<div class="sheet__actions">' + actions.map((a, i) =>
                '<button class="btn ' + (a.variant === 'primary' ? 'btn--primary' : a.variant === 'danger' ? 'btn--danger' : 'btn--ghost') +
                '" data-idx="' + i + '">' + U.esc(a.label) + '</button>').join('') + '</div>'
            : '') +
        '</div>';

      const close = val => {
        wrap.classList.remove('is-in');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => { wrap.remove(); document.body.classList.remove('no-scroll'); resolve(val); }, 220);
      };
      const onKey = e => { if (e.key === 'Escape') close(null); };

      wrap.addEventListener('click', e => {
        if (e.target === wrap) close(null);
        const btn = e.target.closest('[data-idx]');
        if (btn) {
          const act = actions[Number(btn.dataset.idx)];
          if (act.keepOpen) { act.onClick && act.onClick(wrap, close); return; }
          close(act.value !== undefined ? act.value : true);
        }
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      document.body.classList.add('no-scroll');
      requestAnimationFrame(() => wrap.classList.add('is-in'));
      wrap._close = close;
    });
  },

  confirm({ title, message, confirmLabel = 'Confirm', variant = 'primary' }) {
    return this.sheet({
      title,
      body: '<p class="sheet__text">' + U.esc(message) + '</p>',
      actions: [
        { label: 'Cancel', variant: 'ghost', value: false },
        { label: confirmLabel, variant, value: true }
      ]
    });
  },

  /* ---------- page chrome: header + drawer + footer ---------- */
  mountChrome(page) {
    const header = document.getElementById('siteHeader');
    if (header) header.innerHTML = this.headerHTML(page);

    if (!document.querySelector('.drawer')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = this.drawerHTML(page);
      while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
    }

    const footer = document.getElementById('siteFooter');
    if (footer) footer.innerHTML = this.footerHTML();

    this.bindChrome();
  },

  navItems(page) {
    const items = [
      ['donors.html',    'donors',    'Find a donor', Icons.drop],
      ['banks.html',     'banks',     'Blood banks',  Icons.hospital],
      ['emergency.html', 'emergency', 'Requests',     Icons.alert],
      ['map.html',       'map',       'Map',          Icons.map]
    ];
    if (Auth.role === 'blood_bank') items.push(['admin.html', 'admin', 'Dashboard', Icons.chart]);
    items.push(['profile.html', 'profile', Auth.isGuest ? 'About' : 'My profile', Icons.user]);
    return items.map(i => Object.assign(i, { active: i[1] === page }));
  },

  headerHTML(page) {
    return '' +
      '<div class="container site-header__inner">' +
        '<a class="brand" href="donors.html" aria-label="InfoREDZ home">' +
          '<span class="brand__logo" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 21s-7-4.8-7-10a7 7 0 1 1 14 0c0 5.2-7 10-7 10z" opacity=".18"/><path fill="currentColor" d="M13.5 6h-3v3h-3v3h3v3h3v-3h3V9h-3V6z"/></svg>' +
          '</span>' +
          '<span class="brand__word">Info<em>REDZ</em></span>' +
        '</a>' +
        '<nav class="mainnav" aria-label="Main navigation">' +
          this.navItems(page).map(([href, key, label]) =>
            '<a href="' + href + '"' + (key === page ? ' class="is-active" aria-current="page"' : '') + '>' + label + '</a>').join('') +
        '</nav>' +
        '<div class="header-actions">' +
          (Auth.isLoggedIn
            ? '<a class="btn btn--outline btn--sm header-cta" href="emergency.html">Post a request</a>'
            : '<a class="btn btn--primary btn--sm header-cta" href="auth.html?tab=register">Create free account</a>') +
          '<button class="icon-btn" id="menuBtn" aria-label="More options" aria-haspopup="dialog">' +
            '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="5" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/></svg>' +
          '</button>' +
          '<button class="burger" id="burgerBtn" aria-label="Open navigation" aria-expanded="false"><span></span></button>' +
        '</div>' +
      '</div>';
  },

  drawerHTML(page) {
    const u = Auth.user;
    const who = u ? (u.role === 'blood_bank' ? u.bank_name : u.name) : 'Guest';
    const sub = u ? (u.role === 'blood_bank' ? 'Blood bank account' : 'Donor account') : 'Browsing without an account';

    return '' +
      '<div class="drawer-scrim" id="drawerScrim"></div>' +
      '<aside class="drawer" id="siteDrawer" aria-label="Site navigation">' +
        '<div class="drawer__head">' +
          '<div class="drawer__who">' + U.esc(sub) + '</div>' +
          '<div class="drawer__name">' + U.esc(who) + '</div>' +
        '</div>' +
        '<nav class="drawer__nav">' +
          this.navItems(page).map(([href, key, label, icon]) =>
            '<a href="' + href + '"' + (key === page ? ' class="is-active"' : '') + '>' + icon + label + '</a>').join('') +
          '<div class="drawer__sep"></div>' +
          '<a href="#" data-drawer-act="eligibility">' + Icons.check + 'Check my eligibility</a>' +
          '<a href="#" data-drawer-act="how">' + Icons.info + 'How it works</a>' +
          '<a href="#" data-drawer-act="support">' + Icons.phone + 'Help &amp; support</a>' +
        '</nav>' +
        '<div class="drawer__foot">' +
          (Auth.isLoggedIn
            ? '<button class="btn btn--ghost" data-drawer-act="logout">Sign out</button>'
            : '<a class="btn btn--primary" href="auth.html?tab=register">Create free account</a>') +
          '<div class="drawer__mini">' +
            '<a href="' + CONFIG.PRIVACY_URL + '" target="_blank" rel="noopener">Privacy</a>' +
            '<a href="' + CONFIG.PRIVACY_URL + '" target="_blank" rel="noopener">Terms</a>' +
            '<span>Made in India</span>' +
          '</div>' +
        '</div>' +
      '</aside>';
  },

  footerHTML() {
    return '' +
      '<div class="container site-footer__inner">' +
        '<div class="site-footer__brand">' +
          '<div class="brand">' +
            '<span class="brand__logo" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M13.5 6h-3v3h-3v3h3v3h3v-3h3V9h-3V6z"/></svg>' +
            '</span>' +
            '<span class="brand__word">Info<em>REDZ</em></span>' +
          '</div>' +
          '<p>A free, direct line between people who need blood and people willing to give it. No fees, no commission, no middlemen — you call each other.</p>' +
        '</div>' +
        '<div class="fcol"><h4>Find</h4>' +
          '<a href="donors.html">Donors</a><a href="banks.html">Blood banks</a>' +
          '<a href="emergency.html">Open requests</a><a href="map.html">Map</a></div>' +
        '<div class="fcol"><h4>Account</h4>' +
          '<a href="profile.html">My profile</a><a href="auth.html?tab=register">Create account</a>' +
          '<a href="auth.html">Sign in</a></div>' +
        '<div class="fcol"><h4>Contact</h4>' +
          '<a href="mailto:' + CONFIG.SUPPORT_EMAIL + '">' + CONFIG.SUPPORT_EMAIL + '</a>' +
          '<a href="tel:+' + CONFIG.SUPPORT_PHONE + '">+91 93817 40718</a>' +
          '<a href="' + CONFIG.PRIVACY_URL + '" target="_blank" rel="noopener">Privacy policy</a></div>' +
      '</div>' +
      '<div class="container site-footer__base">' +
        '<span>&copy; ' + new Date().getFullYear() + ' InfoREDZ · Infusion MedZone</span>' +
        '<span>Stock counts are maintained by each centre. Always call to confirm.</span>' +
      '</div>';
  },

  toggleDrawer(open) {
    const on = open === undefined ? !document.body.classList.contains('drawer-open') : open;
    document.body.classList.toggle('drawer-open', on);
    document.body.classList.toggle('no-scroll', on);
    const b = document.getElementById('burgerBtn');
    if (b) b.setAttribute('aria-expanded', String(on));
  },

  bindChrome() {
    const burger = document.getElementById('burgerBtn');
    if (burger) burger.addEventListener('click', () => this.toggleDrawer());

    const scrim = document.getElementById('drawerScrim');
    if (scrim) scrim.addEventListener('click', () => this.toggleDrawer(false));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) this.toggleDrawer(false);
    });

    const drawer = document.getElementById('siteDrawer');
    if (drawer) drawer.addEventListener('click', e => {
      const a = e.target.closest('[data-drawer-act]');
      if (!a) return;
      e.preventDefault();
      const act = a.dataset.drawerAct;
      this.toggleDrawer(false);
      setTimeout(() => UI.menuAction(act), 260);
    });

    const btn = document.getElementById('menuBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const logged = Auth.isLoggedIn;
      const rows = [
        ['about',       'About InfoREDZ'],
        ['how',         'How it works'],
        ['eligibility', 'Check my eligibility'],
        ['share',       'Share InfoREDZ'],
        ['support',     'Help & support'],
        ['privacy',     'Privacy policy'],
        [logged ? 'logout' : 'signin', logged ? 'Sign out' : 'Sign in']
      ];
      if (Auth.role === 'blood_bank') rows.splice(3, 0, ['admin', 'Bank dashboard']);
      UI.sheet({
        title: 'Menu',
        body: '<div class="menu-list">' + rows.map(([k, label]) =>
          '<button class="menu-list__item" data-act="' + k + '">' + label + '</button>').join('') + '</div>'
      });
      document.querySelector('.sheet-backdrop').addEventListener('click', e => {
        const item = e.target.closest('[data-act]');
        if (!item) return;
        const backdrop = document.querySelector('.sheet-backdrop');
        const act = item.dataset.act;
        if (backdrop && backdrop._close) backdrop._close(null);
        setTimeout(() => UI.menuAction(act), 240);
      });
    });
  },

  async menuAction(act) {
    switch (act) {
      case 'about':
        UI.sheet({ title: 'About InfoREDZ', body:
          '<p class="sheet__text">InfoREDZ connects willing donors, blood banks and people searching for help — in one place, free, with no middlemen. ' +
          'Donors control when they are visible. Blood banks keep their own stock counts up to date. Anyone can browse without an account.</p>' +
          '<p class="sheet__text sheet__text--muted">Built by Infusion MedZone · Made in India</p>',
          actions: [{ label: 'Close', variant: 'ghost' }] });
        break;
      case 'how':
        UI.sheet({ title: 'How it works', body:
          '<ol class="steps">' +
            '<li><b>Search</b> by blood group, city or name — or open the map to see who is close by.</li>' +
            '<li><b>Reach out</b> with one tap on Call or WhatsApp. Nothing goes through us.</li>' +
            '<li><b>Confirm stock</b> with the blood bank before you travel. Counts are updated by the banks themselves.</li>' +
            '<li><b>Mark yourself available</b> from your profile when you are ready to donate again.</li>' +
          '</ol>', actions: [{ label: 'Got it', variant: 'primary' }] });
        break;
      case 'eligibility': UI.eligibilityChecker(); break;
      case 'share':
        if (navigator.share) {
          try { await navigator.share({ title: 'InfoREDZ', text: 'Find blood donors and blood banks near you.', url: location.origin }); }
          catch (e) { /* user cancelled */ }
        } else {
          try { await navigator.clipboard.writeText(location.origin); UI.toast('Link copied to clipboard.', 'success'); }
          catch (e) { UI.toast('Copy this link: ' + location.origin); }
        }
        break;
      case 'support':
        UI.sheet({ title: 'Help & support', body:
          '<div class="kv"><span>Email</span><a href="mailto:' + CONFIG.SUPPORT_EMAIL + '">' + CONFIG.SUPPORT_EMAIL + '</a></div>' +
          '<div class="kv"><span>Phone</span><a href="tel:+' + CONFIG.SUPPORT_PHONE + '">+91 93817 40718</a></div>',
          actions: [{ label: 'Close', variant: 'ghost' }] });
        break;
      case 'privacy': window.open(CONFIG.PRIVACY_URL, '_blank', 'noopener'); break;
      case 'admin': location.href = 'admin.html'; break;
      case 'signin': location.href = 'auth.html'; break;
      case 'logout': {
        const ok = await UI.confirm({ title: 'Sign out?', message: 'You will need to sign in again to update your profile.', confirmLabel: 'Sign out', variant: 'danger' });
        if (ok) { Auth.signOut(); location.href = 'auth.html'; }
        break;
      }
    }
  },

  /* ---------- eligibility checker ---------- */
  eligibilityChecker() {
    const u = Auth.user || {};
    UI.sheet({
      title: 'Check my eligibility',
      size: 'tall',
      body:
        '<p class="sheet__text sheet__text--muted">A quick self-check based on standard Indian donation guidance. The final decision is always made by staff at the centre.</p>' +
        '<div class="field"><label for="elAge">Age</label><input id="elAge" class="input" type="number" min="10" max="99" value="' + (u.age || '') + '" placeholder="e.g. 25"></div>' +
        '<div class="field"><label for="elWeight">Weight (kg)</label><input id="elWeight" class="input" type="number" min="20" max="200" value="' + (u.weight || '') + '" placeholder="e.g. 60"></div>' +
        '<div class="field"><label for="elLast">Last donation</label><select id="elLast" class="input">' +
          ['Never', 'Less than 3 months ago', '3-6 months ago', 'More than 6 months ago']
            .map(o => '<option' + (u.last_donated === o ? ' selected' : '') + '>' + o + '</option>').join('') +
        '</select></div>' +
        '<label class="check"><input type="checkbox" id="elWell"><span>I feel well today — no fever, cold or infection in the last 2 weeks</span></label>' +
        '<label class="check"><input type="checkbox" id="elMeds"><span>I am not on antibiotics or blood-thinning medication</span></label>' +
        '<label class="check"><input type="checkbox" id="elIink"><span>No tattoo, piercing or major surgery in the last 6 months</span></label>' +
        '<div id="elResult" class="el-result" hidden></div>',
      actions: [
        { label: 'Close', variant: 'ghost' },
        { label: 'Check', variant: 'primary', keepOpen: true, onClick: root => {
            const age = Number(root.querySelector('#elAge').value);
            const wt  = Number(root.querySelector('#elWeight').value);
            const last = root.querySelector('#elLast').value;
            const well = root.querySelector('#elWell').checked;
            const meds = root.querySelector('#elMeds').checked;
            const ink  = root.querySelector('#elIink').checked;
            const blockers = [];
            if (!age || age < 18) blockers.push('Donors must be at least 18.');
            if (age > 65) blockers.push('Above 65, donation needs a doctor\u2019s clearance.');
            if (!wt || wt < 50) blockers.push('Minimum weight for donation is 50 kg.');
            if (last === 'Less than 3 months ago') blockers.push('Wait at least 3 months between whole-blood donations.');
            if (!well) blockers.push('You should be fully well on the day you donate.');
            if (!meds) blockers.push('Certain medications require a waiting period.');
            if (!ink)  blockers.push('Recent tattoo, piercing or surgery needs a 6-month gap.');

            const box = root.querySelector('#elResult');
            box.hidden = false;
            box.className = 'el-result ' + (blockers.length ? 'el-result--no' : 'el-result--yes');
            box.innerHTML = blockers.length
              ? '<b>Not just yet</b><ul>' + blockers.map(b => '<li>' + U.esc(b) + '</li>').join('') + '</ul>'
              : '<b>You look eligible</b><p>Carry a photo ID, eat a proper meal beforehand and drink plenty of water.</p>';
            box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } }
      ]
    });
  },

  /* ---------- skeletons & empty states ---------- */
  skeletonCards(n = 3) {
    return Array.from({ length: n }, () => '<div class="skel-card"></div>').join('');
  },

  empty(title, hint, actionHTML = '') {
    return '<div class="empty">' +
      '<div class="empty__mark" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="34" height="34"><path fill="currentColor" d="M12 3s5.5 6 5.5 10a5.5 5.5 0 1 1-11 0C6.5 9 12 3 12 3z" opacity=".25"/></svg>' +
      '</div>' +
      '<h3>' + U.esc(title) + '</h3><p>' + U.esc(hint) + '</p>' + actionHTML + '</div>';
  },

  /* ---------- reusable card fragments ---------- */
  bloodBadge(group, size = '') {
    return '<span class="bbadge ' + (size ? 'bbadge--' + size : '') + '">' + U.esc(group || '—') + '</span>';
  },

  stockChip(group, units) {
    const lvl = U.stockLevel(units);
    return '<div class="stock-chip stock-chip--' + lvl + '">' +
             '<span class="stock-chip__g">' + U.esc(group) + '</span>' +
             '<span class="stock-chip__n">' + (Number(units) || 0) + '</span>' +
           '</div>';
  }
};

/* ------------------------------------------------------------
   9. BOOT — every page calls this from pages.js
   ------------------------------------------------------------ */
function bootPage() {
  const page = document.body.dataset.page;
  UI.mountChrome(page);
  document.documentElement.classList.add('is-ready');
}

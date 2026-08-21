/* ============================================================
   ANU Hostel Management System — data.js
   Deterministic demo dataset. Same seed → same 960-bed hostel,
   so screenshots and bug reports stay reproducible.
   Shapes here mirror the Django models planned for phase 2.
   ============================================================ */

const FEE = 15000;
const SESSION_LABEL = '2026–27';

const BLOCKS = [
  { key: 'A', name: 'Block A', year: '1st Year', warden: 'K. Srinivasa Rao' },
  { key: 'B', name: 'Block B', year: '2nd Year', warden: 'K. Srinivasa Rao' },
  { key: 'C', name: 'Block C', year: '3rd Year', warden: 'M. Ravi Shankar' },
  { key: 'D', name: 'Block D', year: '4th Year', warden: 'M. Ravi Shankar' }
];

const FLOORS = [
  { idx: 0, key: 'ground', label: 'Ground floor', base: 100 },
  { idx: 1, key: 'first', label: 'First floor', base: 200 },
  { idx: 2, key: 'second', label: 'Second floor', base: 300 }
];

const ROOMS_PER_FLOOR = 20;
const BEDS_PER_ROOM = 4;
const TOTAL_BEDS = BLOCKS.length * FLOORS.length * ROOMS_PER_FLOOR * BEDS_PER_ROOM; // 960

const COURSES = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const YEAR_OF_BLOCK = { A: '1st Year', B: '2nd Year', C: '3rd Year', D: '4th Year' };
const BLOCK_OF_YEAR = { '1st Year': 'A', '2nd Year': 'B', '3rd Year': 'C', '4th Year': 'D' };
const CATEGORIES = ['OC', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'BC-E', 'SC', 'ST', 'EWS'];

const DISTRICTS = ['Guntur', 'Bapatla', 'Palnadu', 'Krishna', 'NTR', 'Prakasam', 'West Godavari', 'Eluru', 'Nellore', 'Kurnool', 'Anantapur', 'Kadapa', 'Chittoor', 'Visakhapatnam', 'Srikakulam'];
const MANDALS = ['Tenali', 'Mangalagiri', 'Ponnur', 'Chilakaluripet', 'Narasaraopet', 'Repalle', 'Sattenapalli', 'Bapatla', 'Vinukonda', 'Piduguralla', 'Gurazala', 'Macherla', 'Nuzvid', 'Gudivada', 'Kandukur'];
const VILLAGES = ['Kolakaluru', 'Pedakakani', 'Vadlamudi', 'Nambur', 'Chebrolu', 'Duggirala', 'Amaravathi', 'Tadikonda', 'Medikonduru', 'Phirangipuram', 'Kollipara', 'Vemuru', 'Emani', 'Modukuru', 'Pedanandipadu'];
const STREETS = ['Main Road', 'Gandhi Bazaar Street', 'Temple Street', 'Bank Colony', 'NGO Colony', 'Sivalayam Street', 'Market Road', 'Nehru Nagar', 'Ambedkar Colony', 'Rice Mill Road'];
const OCCUPATIONS = ['Farmer', 'Agricultural labour', 'Government employee', 'Private employee', 'Auto driver', 'Small business', 'Teacher', 'Mason', 'Electrician', 'Retired'];

const FIRST_NAMES = ['Rahul', 'Sai Teja', 'Naveen', 'Harsha Vardhan', 'Praveen', 'Karthik', 'Vamsi Krishna', 'Ganesh', 'Rohit', 'Sandeep', 'Bharath', 'Yashwanth', 'Manoj Kumar', 'Dinesh', 'Anil', 'Suresh', 'Ramesh', 'Kiran', 'Pavan', 'Chaitanya', 'Nikhil', 'Sri Harsha', 'Ajay', 'Vinay', 'Tarun', 'Mahesh', 'Srikanth', 'Charan', 'Aditya', 'Jagadeesh', 'Lokesh', 'Uday Kiran', 'Prasad', 'Venkatesh', 'Siva Sankar', 'Rajesh', 'Ashok', 'Gopi Krishna', 'Hemanth', 'Nagarjuna', 'Sunil', 'Deepak', 'Abhinav', 'Krishna Chaitanya', 'Sathish', 'Naresh', 'Raviteja', 'Balaji', 'Arun Kumar', 'Chandra Sekhar', 'Durga Prasad', 'Eswar', 'Giridhar', 'Jyothi Swaroop', 'Kalyan', 'Madhu', 'Nithin', 'Omkar', 'Phani Kumar', 'Raghavendra'];

const SURNAMES = ['Kancherla', 'Bandaru', 'Yadlapalli', 'Pothina', 'Chowdary', 'Sunkara', 'Mandava', 'Pasupuleti', 'Gollapudi', 'Nallapaneni', 'Kolli', 'Vemuri', 'Alluri', 'Bhogadi', 'Chintalapudi', 'Devarakonda', 'Eluri', 'Gadde', 'Guntupalli', 'Immaneni', 'Jampani', 'Kommineni', 'Lakkaraju', 'Maddineni', 'Nadendla', 'Pantham', 'Raavi', 'Sagi', 'Tummala', 'Uppalapati', 'Valluri', 'Yerramsetti', 'Adusumilli', 'Bommidala', 'Chalasani', 'Dasari', 'Gattem', 'Injeti', 'Kotha', 'Lanka', 'Mullapudi', 'Nutakki', 'Peddireddy', 'Rayapati', 'Samineni', 'Tenali', 'Vadlamani', 'Yalamanchili', 'Bhimavarapu', 'Chekuri'];

const MOTHER_NAMES = ['Lakshmi', 'Padma', 'Sridevi', 'Nagamani', 'Rajeswari', 'Vijaya', 'Anasuya', 'Kumari', 'Swarupa', 'Bharathi', 'Sarojini', 'Venkata Ramana', 'Aruna', 'Madhavi', 'Suneetha'];

const DOC_TYPES = [
  ['allotment', 'Allotment order'],
  ['joining', 'Joining report'],
  ['income', 'Income certificate'],
  ['caste', 'Community certificate'],
  ['aadhaarcard', 'Aadhaar card']
];

const AUTHORITY = {
  hod: { key: 'hod', label: 'HOD', name: 'Dr. P. Lakshmi Devi' },
  principal: { key: 'principal', label: 'Principal', name: 'Dr. M. Venkateswara Rao' },
  cw: { key: 'cw', label: 'Chief Warden', name: 'Dr. B. Ananda Kumar' }
};

const BANK = {
  upi: 'anuhostel@sbi',
  account: '3421 8890 4471',
  ifsc: 'SBIN0020193',
  holder: 'Principal, ANU College of Engineering — Hostel Fund',
  branch: 'SBI, ANU Campus Branch'
};

const AV_COLORS = ['#14509B', '#0B6B41', '#B75708', '#5C8FD6', '#0A3271', '#12915A'];

/* ---------- deterministic RNG ---------- */

function rngFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- helpers ---------- */

function roomNumbersOf(floorIdx) {
  const base = FLOORS[floorIdx].base;
  return Array.from({ length: ROOMS_PER_FLOOR }, (_, i) => base + i + 1); // 101..120
}

function allRoomIds() {
  const out = [];
  BLOCKS.forEach(b => FLOORS.forEach(f => roomNumbersOf(f.idx).forEach(n => out.push(`${b.key}-${n}`))));
  return out;
}

function parseRoomId(id) {
  const [block, no] = id.split('-');
  const n = +no;
  return { block, no: n, floorIdx: Math.floor(n / 100) - 1 };
}

function isoDaysAgo(days, hour = 10, min = 15) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

/* ---------- dataset builder ---------- */

function buildDataset(seed = 20260818) {
  const rnd = rngFrom(seed);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  /* rooms under maintenance — kept out of allocation */
  const maintenance = new Set(['B-214', 'C-108', 'A-319', 'D-205', 'C-311', 'A-112']);

  const students = [];
  const usedNames = new Set();
  let serial = 1000;
  let rollSeq = 1000;

  const admitYear = { '1st Year': 26, '2nd Year': 25, '3rd Year': 24, '4th Year': 23 };
  const branchCode = { CSE: 'CS', ECE: 'EC', EEE: 'EE', MECH: 'ME', CIVIL: 'CE', IT: 'IT' };
  const admitYY = { '1st Year': '26', '2nd Year': '25', '3rd Year': '24', '4th Year': '23' };
  const usedHostelIds = new Set();
  function makeHostelId(year, course) {
    let id;
    do { id = admitYY[year] + branchCode[course] + int(1000, 9999); } while (usedHostelIds.has(id));
    usedHostelIds.add(id);
    return id;
  }

  function makeName() {
    for (let i = 0; i < 60; i++) {
      const n = `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`;
      if (!usedNames.has(n)) { usedNames.add(n); return n; }
    }
    const n = `${pick(FIRST_NAMES)} ${pick(SURNAMES)} ${usedNames.size}`;
    usedNames.add(n);
    return n;
  }

  function makeStudent(year, room, bed, ageDays) {
    const name = makeName();
    const first = name.split(' ')[0];
    const surname = name.split(' ').slice(-1)[0];
    const course = pick(COURSES);
    const district = pick(DISTRICTS);
    const usePhoto = rnd() < 0.45;
    const appId = 'ANU/HM/26/' + (++serial);
    const submitted = isoDaysAgo(ageDays, int(9, 17), int(0, 59));

    return {
      id: appId,
      hostelId: makeHostelId(year, course),
      validYear: year,
      validTill: null,
      scans: [],
      rollNo: `Y${admitYear[year]}${branchCode[course]}${++rollSeq}`,
      photo: usePhoto ? `https://randomuser.me/api/portraits/men/${int(0, 98)}.jpg` : null,
      avatarColor: AV_COLORS[Math.floor(rnd() * AV_COLORS.length)],
      student: {
        name,
        phone: '9' + int(100000000, 899999999),
        email: `${first.toLowerCase().replace(/\s/g, '')}.${surname[0].toLowerCase()}${serial}@student.anu.ac.in`,
        aadhaar: `${int(2000, 9999)} ${int(1000, 9999)} ${int(1000, 9999)}`,
        dob: `${int(2003, 2008)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
        bloodGroup: pick(['O+', 'B+', 'A+', 'AB+', 'O-', 'B-'])
      },
      parent: {
        father: `${pick(FIRST_NAMES).split(' ')[0]} ${surname}`,
        mother: `${pick(MOTHER_NAMES)} ${surname}`,
        occupation: pick(OCCUPATIONS),
        phone: '9' + int(100000000, 899999999),
        guardian: rnd() < 0.15 ? `${pick(FIRST_NAMES).split(' ')[0]} ${pick(SURNAMES)} (uncle)` : ''
      },
      address: {
        door: `${int(1, 12)}-${int(10, 199)}-${int(1, 40)}`,
        street: pick(STREETS),
        village: pick(VILLAGES),
        mandal: pick(MANDALS),
        district,
        state: 'Andhra Pradesh',
        pincode: String(int(520001, 524999))
      },
      academic: {
        course,
        year,
        eamcetRank: int(900, 42000),
        allotmentNo: `AL-${branchCode[course]}-${int(1000, 9999)}`,
        category: pick(CATEGORIES),
        annualIncome: int(6, 42) * 10000
      },
      documents: DOC_TYPES.slice(0, rnd() < 0.6 ? 5 : 4).map(([k, label]) => ({
        type: k, label,
        name: `${k}_${first.toLowerCase()}.pdf`,
        size: int(120, 2400) * 1024,
        uploadedAt: submitted
      })),
      payment: {
        amount: FEE,
        txnRef: 'UPI' + int(100000000000, 999999999999),
        screenshot: `payment_${first.toLowerCase()}.jpg`,
        paidAt: submitted
      },
      status: 'PENDING',
      approvals: { hod: null, principal: null, cw: null },
      wardenReview: null,
      room: room ? { block: room.block, floorIdx: room.floorIdx, roomNo: room.no, bed } : null,
      rejection: null,
      submittedAt: submitted,
      history: [{ at: submitted, label: 'Application submitted', by: name }]
    };
  }

  function approveFully(s, ageDays) {
    const vAt = isoDaysAgo(Math.max(ageDays - 2, 0), 11, 20);
    s.status = 'SUCCESS';
    s.wardenReview = { by: 'K. Srinivasa Rao', at: vAt, remarks: 'Documents and payment verified.' };
    s.history.push({ at: vAt, label: 'Verified by warden', by: 'K. Srinivasa Rao' });
    ['hod', 'cw', 'principal'].forEach((k, i) => {
      const at = isoDaysAgo(Math.max(ageDays - 3 - i, 0), 12 + i * 2, 10);
      s.approvals[k] = { by: AUTHORITY[k].name, at };
      s.history.push({ at, label: `Signed by ${AUTHORITY[k].label}`, by: AUTHORITY[k].name });
    });
    s.validTill = validTillFor(s.validYear);
    if (s.room) {
      const at = isoDaysAgo(Math.max(ageDays - 4, 0), 16, 30);
      s.room.assignedBy = 'K. Srinivasa Rao';
      s.room.assignedAt = at;
      s.history.push({ at, label: `Room allotted — Block ${s.room.block}, room ${s.room.roomNo}`, by: 'K. Srinivasa Rao' });
    }
    s.history.sort((a, b) => new Date(a.at) - new Date(b.at));
    const gates = ['Main gate', 'Block entrance', 'Mess entry'];
    const nScans = int(0, 4);
    for (let k = 0; k < nScans; k++) {
      s.scans.push({ at: isoDaysAgo(int(0, 6), int(6, 22), int(0, 59)), point: gates[int(0, gates.length - 1)], result: 'valid' });
    }
    s.scans.sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  function validTillFor(year) {
    /* card is valid to 30 April of the academic-year end.
       admit year 26 → 1st year ends Apr 2027, etc. Everyone in this
       session is valid to 30 Apr 2027 for their current year. */
    return new Date(Date.UTC(2027, 3, 30, 23, 59)).toISOString();
  }

  /* ---- residents: fill each block to roughly 72% ---- */
  const targets = { A: 182, B: 176, C: 170, D: 163 };

  BLOCKS.forEach(b => {
    let placed = 0;
    const target = targets[b.key];
    const rooms = [];
    FLOORS.forEach(f => roomNumbersOf(f.idx).forEach(no => {
      const id = `${b.key}-${no}`;
      if (!maintenance.has(id)) rooms.push({ block: b.key, no, floorIdx: f.idx });
    }));

    /* shuffle so vacancies scatter across floors instead of piling up at the end */
    for (let i = rooms.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [rooms[i], rooms[j]] = [rooms[j], rooms[i]];
    }

    /* two passes: first give most rooms 3–4 students, then top up */
    rooms.forEach(room => {
      if (placed >= target) return;
      const r = rnd();
      let n = r < 0.56 ? 4 : r < 0.78 ? 3 : r < 0.9 ? 2 : r < 0.96 ? 1 : 0;
      n = Math.min(n, target - placed);
      for (let bed = 1; bed <= n; bed++) {
        const ageDays = 12 + Math.floor(rnd() * 48);
        const s = makeStudent(YEAR_OF_BLOCK[b.key], room, bed, ageDays);
        approveFully(s, ageDays);
        students.push(s);
        placed++;
      }
    });
  });

  /* ---- live pipeline: recent applications with no room yet ---- */
  const pipeline = [
    ['PENDING', 14], ['ACTIVE', 8], ['S1', 7], ['S2', 6], ['REJECTED', 4], ['S3_NOROOM', 5]
  ];

  pipeline.forEach(([kind, count]) => {
    for (let i = 0; i < count; i++) {
      const year = pick(YEARS);
      const ageDays = int(0, 9);
      const s = makeStudent(year, null, null, ageDays);

      if (kind === 'PENDING') { students.push(s); continue; }

      if (kind === 'REJECTED') {
        const at = isoDaysAgo(Math.max(ageDays - 1, 0), 15, 40);
        s.status = 'REJECTED';
        s.rejection = {
          reason: pick([
            'Income certificate is expired. Upload one issued within the last 12 months and resubmit.',
            'Payment screenshot is unreadable. Upload a clear screenshot showing the reference number.',
            'Allotment order does not match the allotment number entered. Correct it and resubmit.',
            'Joining report is missing the college seal. Get it attested and upload again.'
          ]),
          by: 'K. Srinivasa Rao', at
        };
        s.history.push({ at, label: 'Sent back by warden', by: 'K. Srinivasa Rao' });
        students.push(s);
        continue;
      }

      const vAt = isoDaysAgo(Math.max(ageDays - 1, 0), 11, 5);
      s.status = 'ACTIVE';
      s.wardenReview = { by: 'K. Srinivasa Rao', at: vAt, remarks: 'Documents and payment verified.' };
      s.history.push({ at: vAt, label: 'Verified by warden', by: 'K. Srinivasa Rao' });

      const nSign = { ACTIVE: 0, S1: 1, S2: 2, S3_NOROOM: 3 }[kind];
      ['hod', 'cw', 'principal'].slice(0, nSign).forEach((k, j) => {
        const at = isoDaysAgo(Math.max(ageDays - 1 - j, 0), 13 + j, 25);
        s.approvals[k] = { by: AUTHORITY[k].name, at };
        s.history.push({ at, label: `Signed by ${AUTHORITY[k].label}`, by: AUTHORITY[k].name });
        s.status = 'SUCCESS';
      });

      s.history.sort((a, b) => new Date(a.at) - new Date(b.at));
      students.push(s);
    }
  });

  /* ---- one known account for the demo student login ---- */
  const demo = students.find(s => s.room && s.room.block === 'B');
  if (demo) {
    demo.student.name = 'Rahul Kancherla';
    demo.student.email = 'rahul.k@student.anu.ac.in';
    demo.student.phone = '9848012345';
    demo.photo = 'https://randomuser.me/api/portraits/men/32.jpg';
    demo.parent.father = 'Venkateswara Rao Kancherla';
    demo.parent.mother = 'Padma Kancherla';
    demo.hostelId = '26CS7896';
    usedHostelIds.add('26CS7896');
  }

  /* fixed hostel IDs on a few residents so the QR scanner demo has known-good codes */
  const fixed = ['25EC4410', '24ME8123', '26IT3067', '23CE5590'];
  const residentsList = students.filter(s => s.room && s.hostelId !== '26CS7896');
  fixed.forEach((fid, i) => { if (residentsList[i]) residentsList[i].hostelId = fid; });

  return {
    students,
    maintenance: Array.from(maintenance),
    session: SESSION_LABEL,
    generatedAt: new Date().toISOString()
  };
}

/* Node export for the build-time sanity check; ignored in the browser. */
const DEMO_SCAN_IDS = ['26CS7896', '25EC4410', '24ME8123', '26IT3067', '23CE5590'];
if (typeof module !== 'undefined') module.exports = { buildDataset, BLOCKS, FLOORS, TOTAL_BEDS, allRoomIds, parseRoomId, DEMO_SCAN_IDS };

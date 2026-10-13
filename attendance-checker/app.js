// ============================================================
//   ATTENDANCE CHECKER — app.js
//   Teacher File  : OSquare wide-format (P / A / N/A per date)
//   Student File  : Long-format (one row per present student-date)
// ============================================================

// ── State ──────────────────────────────────────────────────
let teacherData = null;
let studentData = null;
let lastResults = null;

// ── Toast ──────────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  const icon = type === 'success'
    ? '<i class="fa-solid fa-circle-check"></i>'
    : type === 'error'
    ? '<i class="fa-solid fa-circle-xmark"></i>'
    : '<i class="fa-solid fa-circle-info"></i>';
  t.innerHTML = icon + ' ' + msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3400);
}

// ── Date helpers ───────────────────────────────────────────
function normalizeDate(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    // DD/MM/YYYY
    let m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`;
    // MM-DD-YYYY or DD-MM-YYYY
    m = val.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) return `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`;
    return val.trim();
  }
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
  }
  return String(val);
}

const MONTH_MAP = {
  Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
  Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'
};

function parseHeaderDate(str, yearHint) {
  if (!str) return null;
  // "Tue, Sep 01" / "Sep 01"
  let m = str.match(/[A-Za-z]{3},?\s+([A-Za-z]{3})\s+(\d{1,2})/);
  if (m) return `${String(m[2]).padStart(2,'0')}/${MONTH_MAP[m[1]] || '01'}/${yearHint}`;
  m = str.match(/([A-Za-z]{3})\s+(\d{1,2})/);
  if (m) return `${String(m[2]).padStart(2,'0')}/${MONTH_MAP[m[1]] || '01'}/${yearHint}`;
  return null;
}

// Short label for table header: "01/09" → "01 Sep"
const SHORT_MON = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function shortDateLabel(dateStr) {
  const p = dateStr.split('/');
  if (p.length === 3) return `${p[0]}<br><span style="font-size:0.62rem;opacity:.7">${SHORT_MON[parseInt(p[1])] || p[1]}</span>`;
  return dateStr;
}

// ── Parse Teacher (OSquare) File ───────────────────────────
function parseTeacherFile(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(raw.length, 12); i++) {
    const row = raw[i];
    if (!row) continue;
    if (row.some(c => c && /faculty/i.test(String(c)))) { headerRowIdx = i; break; }
    if (row.some(c => c && /^batch$/i.test(String(c).trim()))) { headerRowIdx = i; break; }
  }
  if (headerRowIdx < 0) throw new Error('Teacher file میں header row نہیں ملی۔ براہ کرم صحیح file منتخب کریں۔');

  const headers = raw[headerRowIdx];
  let yearHint = new Date().getFullYear();
  if (raw[0] && raw[0][0]) {
    const m = String(raw[0][0]).match(/20\d{2}/);
    if (m) yearHint = parseInt(m[0]);
  }

  // Column index map
  const ci = {};
  headers.forEach((h, i) => {
    if (!h) return;
    const s = String(h).trim().toLowerCase();
    if (s === 'student id')    ci.studentId = i;
    if (s === 'student name')  ci.studentName = i;
    if (s === 'batch')         ci.batch = i;
    if (s === 'faculty name')  ci.faculty = i;
    if (s === 'day')           ci.day = i;
    if (s === 'slot')          ci.slot = i;
    if (s === 'total days')    ci.totalDays = i;
    if (s === 'total attended') ci.totalAttended = i;
  });

  const firstDateIdx = Math.max(ci.slot ?? 8, ci.batch ?? 5) + 1;
  const lastDateIdx  = (ci.totalDays ?? headers.length - 2) - 1;

  const dateColumns = [];
  for (let i = firstDateIdx; i <= lastDateIdx; i++) {
    const h = headers[i];
    if (!h) continue;
    const ds = parseHeaderDate(String(h), yearHint);
    if (ds) dateColumns.push({ colIndex: i, dateStr: ds, rawHeader: String(h) });
  }

  const rows = [];
  const teachers = new Set();
  const batches  = new Set();

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || !row[ci.batch]) continue;
    const batch      = String(row[ci.batch]      || '').trim();
    const faculty    = String(row[ci.faculty]    || '').trim();
    const studentId  = String(row[ci.studentId]  || '').trim();
    const studentName= String(row[ci.studentName]|| '').trim();
    if (!batch) continue;

    const status = {};
    for (const dc of dateColumns) {
      const v = row[dc.colIndex];
      status[dc.dateStr] = (v === null || v === undefined || v === '') ? null : String(v).trim().toUpperCase();
    }

    rows.push({ studentId, studentName, batch, faculty, status });
    if (faculty) teachers.add(faculty);
    if (batch)   batches.add(batch);
  }

  return { teachers: [...teachers].sort(), batches: [...batches].sort(), dateColumns, rows, yearHint };
}

// ── Parse Student Attendance Report (Long Format) ──────────
function parseStudentFile(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(raw.length, 20); i++) {
    const row = raw[i];
    if (!row) continue;
    if (row.some(c => c && /student id/i.test(String(c))) &&
        row.some(c => c && /attendance date/i.test(String(c)))) {
      headerRowIdx = i; break;
    }
  }
  if (headerRowIdx < 0) throw new Error('Student file میں header row نہیں ملی۔');

  const headers = raw[headerRowIdx];
  const ci = {};
  headers.forEach((h, i) => {
    if (!h) return;
    const s = String(h).trim().toLowerCase();
    if (s === 'student id')       ci.studentId = i;
    if (s === 'student name')     ci.studentName = i;
    if (s === 'attendance date')  ci.attDate = i;
    if (s === 'batch details')    ci.batch = i;
    if (s === 'employee name')    ci.employee = i;
  });

  const map = new Map();
  let count = 0;
  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;
    const studentId = row[ci.studentId] ? String(row[ci.studentId]).trim() : null;
    const attDateRaw = row[ci.attDate];
    if (!studentId || !attDateRaw) continue;
    const attDate = normalizeDate(attDateRaw);
    if (!attDate) continue;
    map.set(`${studentId}|${attDate}`, {
      studentName: row[ci.studentName] ? String(row[ci.studentName]).trim() : '',
      batch:       row[ci.batch]       ? String(row[ci.batch]).trim() : '',
      employee:    row[ci.employee]    ? String(row[ci.employee]).trim() : ''
    });
    count++;
  }
  console.log(`Student file indexed: ${count} records`);
  return { map };
}

// ── File Handlers ──────────────────────────────────────────
let filesReady = { teacher: false, student: false };

document.getElementById('teacherFile').addEventListener('change', async function (e) {
  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session) {
    showToast('Barah-e-karam pehle login karein aur coupon code enter karein!', 'error');
    e.target.value = '';
    return;
  }
  const file = e.target.files[0];
  if (!file) return;
  setStatus('teacher', '', `<i class="fa-solid fa-spinner fa-spin"></i> &nbsp;"${file.name}" پڑھ رہے ہیں...`);
  document.getElementById('teacherProgress').classList.add('active');
  try {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: 'array', cellDates: false });
    teacherData = parseTeacherFile(wb);
    document.getElementById('teacherProgress').classList.remove('active');
    setStatus('teacher', 'success',
      `<i class="fa-solid fa-circle-check"></i> &nbsp;${teacherData.rows.length} students &nbsp;|&nbsp; ${teacherData.teachers.length} teachers &nbsp;|&nbsp; ${teacherData.dateColumns.length} dates`);
    document.getElementById('teacherUploadBox').classList.add('done');
    document.querySelector('#teacherUploadBox .upload-icon-wrap').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    filesReady.teacher = true;
    if (filesReady.student) onBothReady();
  } catch (err) {
    document.getElementById('teacherProgress').classList.remove('active');
    setStatus('teacher', 'error', `<i class="fa-solid fa-circle-xmark"></i> &nbsp;${err.message}`);
    showToast('Teacher file error: ' + err.message, 'error');
  }
});

document.getElementById('studentFile').addEventListener('change', async function (e) {
  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session) {
    showToast('Barah-e-karam pehle login karein aur coupon code enter karein!', 'error');
    e.target.value = '';
    return;
  }
  const file = e.target.files[0];
  if (!file) return;
  setStatus('student', '', `<i class="fa-solid fa-spinner fa-spin"></i> &nbsp;"${file.name}" پڑھ رہے ہیں... (بڑی file)`);
  document.getElementById('studentProgress').classList.add('active');
  try {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: 'array', cellDates: false });
    studentData = parseStudentFile(wb);
    document.getElementById('studentProgress').classList.remove('active');
    setStatus('student', 'success',
      `<i class="fa-solid fa-circle-check"></i> &nbsp;${studentData.map.size.toLocaleString()} records indexed`);
    document.getElementById('studentUploadBox').classList.add('done');
    document.querySelector('#studentUploadBox .upload-icon-wrap').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    filesReady.student = true;
    if (filesReady.teacher) onBothReady();
  } catch (err) {
    document.getElementById('studentProgress').classList.remove('active');
    setStatus('student', 'error', `<i class="fa-solid fa-circle-xmark"></i> &nbsp;${err.message}`);
    showToast('Student file error: ' + err.message, 'error');
  }
});

function setStatus(which, type, html) {
  const el = document.getElementById(`${which}Status`);
  el.innerHTML = html;
  el.className = `file-status ${type}`;
}

function onBothReady() {
  const ts = document.getElementById('teacherSelect');
  ts.innerHTML = '<option value="">— Teacher منتخب کریں —</option>';
  teacherData.teachers.forEach(t => {
    const o = document.createElement('option');
    o.value = o.textContent = t;
    ts.appendChild(o);
  });
  document.getElementById('step2').style.display = 'block';
  requestAnimationFrame(() =>
    document.getElementById('step2').scrollIntoView({ behavior: 'smooth', block: 'start' })
  );
  showToast('دونوں files load ہو گئیں! Teacher منتخب کریں۔', 'success');
}

// ── Dropdowns ──────────────────────────────────────────────
document.getElementById('teacherSelect').addEventListener('change', function () {
  const teacher = this.value;
  const bs = document.getElementById('batchSelect');
  bs.innerHTML = '<option value="">— Batch منتخب کریں —</option>';
  bs.disabled = true;
  document.getElementById('analyzeBtn').disabled = true;
  if (!teacher) return;

  const batches = new Set();
  teacherData.rows.forEach(r => { if (r.faculty === teacher) batches.add(r.batch); });
  [...batches].sort().forEach(b => {
    const o = document.createElement('option');
    o.value = o.textContent = b;
    bs.appendChild(o);
  });
  bs.disabled = false;
});

document.getElementById('batchSelect').addEventListener('change', function () {
  document.getElementById('analyzeBtn').disabled = !this.value;
});

// ── Analysis ───────────────────────────────────────────────
function runAnalysis() {
  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session) {
    showToast('Session khatam ho chuka hai. Barah-e-karam dobara login karein.', 'error');
    if (typeof renderAuthGatekeeper === 'function') renderAuthGatekeeper();
    return;
  }
  const teacher = document.getElementById('teacherSelect').value;
  const batch   = document.getElementById('batchSelect').value;
  if (!teacher || !batch) return;

  const batchRows = teacherData.rows.filter(r => r.faculty === teacher && r.batch === batch);
  if (!batchRows.length) {
    showToast('اس batch میں کوئی student نہیں ملا۔', 'error');
    return;
  }

  const dc = teacherData.dateColumns;
  const results = [];
  let matchCnt = 0, mismatchCnt = 0, absentCnt = 0, naCnt = 0;

  for (const row of batchRows) {
    const dateResults = {};
    for (const col of dc) {
      const ts  = row.status[col.dateStr]; // Teacher status
      const sKey = `${row.studentId}|${col.dateStr}`;
      const inSR = studentData.map.has(sKey); // Student present in report?

      let cellType, tv, sv;

      if (ts === 'N/A') {
        cellType = 'na'; tv = 'N/A'; sv = '—'; naCnt++;
      } else if (ts === null || ts === '') {
        cellType = 'empty'; tv = '—'; sv = '—';
      } else if (ts === 'P') {
        tv = 'P';
        if (inSR) { sv = 'P'; cellType = 'match'; matchCnt++; }
        else       {
          // Teacher (OSquare) marked Present but NOT in Aptrack → OSquare side mismatch
          sv = 'A'; cellType = 'mismatch'; mismatchCnt++;
        }
      } else if (ts === 'A') {
        tv = 'A';
        if (inSR) {
          // Aptrack shows Present but Teacher (OSquare) marked Absent → Aptrack side mismatch
          sv = 'P'; cellType = 'mismatch'; mismatchCnt++;
        } else { sv = 'A'; cellType = 'absent'; absentCnt++; }
      } else {
        tv = ts; sv = inSR ? 'P' : 'A'; cellType = 'empty';
      }

      // Determine mismatch source label
      let mismatchSource = null;
      if (cellType === 'mismatch') {
        // tv=P, sv=A → Teacher P مارکا لیکن Aptrack میں نہیں → (Aptrack) side
        // tv=A, sv=P → Aptrack میں P ہے لیکن OSquare A → (OSquare) side
        mismatchSource = (tv === 'P' && sv === 'A') ? 'aptrack' : 'osquare';
      }

      dateResults[col.dateStr] = { cellType, tv, sv, mismatchSource };
    }
    results.push({ studentId: row.studentId, studentName: row.studentName, dateResults });
  }

  lastResults = { teacher, batch, results, dateColumns: dc };

  document.getElementById('resultSubtitle').textContent =
    `Teacher: ${teacher}  |  Batch: ${batch}  |  ${batchRows.length} Students  |  ${dc.length} Class Days`;

  renderStats(batchRows.length, matchCnt, mismatchCnt, absentCnt, dc.length);
  renderTable(results, dc);

  document.getElementById('step3').style.display = 'block';
  requestAnimationFrame(() =>
    document.getElementById('step3').scrollIntoView({ behavior: 'smooth', block: 'start' })
  );

  const msg = mismatchCnt > 0
    ? `Analysis مکمل! ${mismatchCnt} mismatches ملے۔`
    : 'Analysis مکمل! سب attendance match ہے ✓';
  showToast(msg, mismatchCnt > 0 ? 'error' : 'success');
}

// ── Render Stats ───────────────────────────────────────────
function renderStats(total, match, mismatch, absent, days) {
  const statsRow = document.getElementById('statsRow');
  statsRow.innerHTML = `
    <div class="stat-card stat-purple">
      <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
      <div class="stat-info">
        <div class="stat-num">${total}</div>
        <div class="stat-label">Total Students</div>
      </div>
    </div>
    <div class="stat-card stat-blue">
      <div class="stat-icon"><i class="fa-solid fa-calendar-days"></i></div>
      <div class="stat-info">
        <div class="stat-num">${days}</div>
        <div class="stat-label">Class Days</div>
      </div>
    </div>
    <div class="stat-card stat-green">
      <div class="stat-icon"><i class="fa-solid fa-circle-check"></i></div>
      <div class="stat-info">
        <div class="stat-num">${match}</div>
        <div class="stat-label">Matched</div>
      </div>
    </div>
    <div class="stat-card stat-red">
      <div class="stat-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <div class="stat-info">
        <div class="stat-num">${mismatch}</div>
        <div class="stat-label">Mismatches</div>
      </div>
    </div>
    <div class="stat-card stat-gray">
      <div class="stat-icon"><i class="fa-solid fa-circle-minus"></i></div>
      <div class="stat-info">
        <div class="stat-num">${absent}</div>
        <div class="stat-label">Both Absent</div>
      </div>
    </div>
  `;
}

// ── Render Table ───────────────────────────────────────────
function renderTable(results, dateColumns) {
  const container = document.getElementById('tableContainer');

  let thead = '<thead><tr><th>#</th><th>Student</th>';
  for (const dc of dateColumns) {
    thead += `<th class="date-col">${shortDateLabel(dc.dateStr)}</th>`;
  }
  thead += '</tr></thead>';

  let tbody = '<tbody>';
  results.forEach((r, idx) => {
    tbody += `<tr>
      <td>${idx + 1}</td>
      <td>
        <div class="student-name-cell">${esc(r.studentName)}</div>
        <div class="student-id-cell"><i class="fa-solid fa-id-badge" style="font-size:0.6rem;opacity:.6"></i> ${esc(r.studentId)}</div>
      </td>`;

    for (const dc of dateColumns) {
      const cell = r.dateResults[dc.dateStr];
      if (!cell || cell.cellType === 'empty') {
        tbody += `<td><span class="cell-empty">—</span></td>`;
        continue;
      }
      const { cellType, tv, sv, mismatchSource } = cell;

      if (cellType === 'match') {
        tbody += `<td>
          <div class="cell-badge cell-match" title="Both Present — Match">
            <span class="top"><i class="fa-solid fa-check" style="font-size:0.6rem"></i> P</span>
            <span class="bot">P / P</span>
          </div>
        </td>`;

      } else if (cellType === 'mismatch') {
        const isOSQ = mismatchSource === 'osquare';
        const srcClass  = isOSQ ? 'src-osquare'  : 'src-aptrack';
        const srcLabel  = isOSQ ? '(OSquare)'    : '(Aptrack)';
        const tipText   = isOSQ
          ? `OSquare: P  |  Aptrack: Absent — OSquare نے Present مارکا لیکن Aptrack میں record نہیں`
          : `OSquare: A  |  Aptrack: P — Aptrack میں Present ہے لیکن OSquare نے Absent مارکا`;
        tbody += `<td>
          <div class="cell-badge cell-mismatch" title="${tipText}">
            <span class="top"><i class="fa-solid fa-triangle-exclamation" style="font-size:0.6rem"></i> ${esc(tv)}/${esc(sv)}</span>
            <span class="bot mismatch-src ${srcClass}">${srcLabel}</span>
          </div>
        </td>`;

      } else if (cellType === 'absent') {
        tbody += `<td>
          <div class="cell-badge cell-absent" title="دونوں Absent">
            <span class="top"><i class="fa-solid fa-circle-minus" style="font-size:0.6rem"></i> A</span>
            <span class="bot">A / A</span>
          </div>
        </td>`;

      } else if (cellType === 'na') {
        tbody += `<td>
          <div class="cell-badge cell-na" title="Holiday / N/A">
            <span class="top"><i class="fa-solid fa-ban" style="font-size:0.6rem"></i> N/A</span>
            <span class="bot">—</span>
          </div>
        </td>`;

      } else {
        tbody += `<td><span class="cell-empty">—</span></td>`;
      }
    }
    tbody += '</tr>';
  });
  tbody += '</tbody>';
  container.innerHTML = `<table>${thead}${tbody}</table>`;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Export: Full Report ────────────────────────────────────
function exportReport() {
  if (!lastResults) return;
  buildExcel(lastResults.results, lastResults.dateColumns, lastResults.teacher, lastResults.batch, false);
}

// ── Export: Mismatches Only ────────────────────────────────
function exportMismatchOnly() {
  if (!lastResults) return;
  const filtered = lastResults.results.filter(r =>
    Object.values(r.dateResults).some(d => d && d.cellType === 'mismatch')
  );
  if (!filtered.length) {
    showToast('کوئی mismatch نہیں! سب match ہے ✓', 'success');
    return;
  }
  buildExcel(filtered, lastResults.dateColumns, lastResults.teacher, lastResults.batch, true);
}

// ── Build & Download Excel ─────────────────────────────────
function buildExcel(results, dateColumns, teacher, batch, mismatchOnly) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Attendance Matrix ──
  const aoa = [];

  // Title row
  aoa.push([`OSquare Education — Attendance ${mismatchOnly ? 'Mismatch' : 'Comparison'} Report`]);
  aoa.push([`Teacher: ${teacher}   |   Batch: ${batch}   |   Generated: ${new Date().toLocaleDateString('en-GB')}`]);
  aoa.push([]); // blank

  // Header row
  const header = ['#', 'Student ID', 'Student Name', ...dateColumns.map(dc => dc.dateStr), 'Total P (Teacher)', 'Total P (Student)', 'Mismatches'];
  aoa.push(header);

  // Data rows
  results.forEach((r, idx) => {
    let teacherP = 0, studentP = 0, mismatches = 0;
    const cells = dateColumns.map(dc => {
      const c = r.dateResults[dc.dateStr];
      if (!c || c.cellType === 'empty') return '—';
      if (c.cellType === 'na')      return 'N/A';
      if (c.cellType === 'absent')  return 'A / A';
      if (c.cellType === 'match')   { teacherP++; studentP++; return 'P / P'; }
      if (c.cellType === 'mismatch') {
        mismatches++;
        if (c.tv === 'P') teacherP++;
        if (c.sv === 'P') studentP++;
        return `${c.tv} / ${c.sv}`;
      }
      return `${c.tv} / ${c.sv}`;
    });
    aoa.push([idx + 1, r.studentId, r.studentName, ...cells, teacherP, studentP, mismatches]);
  });

  aoa.push([]); // blank
  aoa.push(['Note: Cell format is  Teacher Status / Student Status']);

  const ws1 = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws1['!cols'] = [
    { wch: 4 },   // #
    { wch: 16 },  // Student ID
    { wch: 30 },  // Student Name
    ...dateColumns.map(() => ({ wch: 10 })),
    { wch: 18 }, { wch: 18 }, { wch: 12 }
  ];

  // Merge title row
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: header.length - 1 } }
  ];

  // Apply colors using cell styles
  applyExcelStyles(ws1, results, dateColumns, mismatchOnly);

  XLSX.utils.book_append_sheet(wb, ws1, 'Attendance Report');

  // ── Sheet 2: Mismatch Summary ──
  if (!mismatchOnly) {
    const summaryAoa = buildSummarySheet(results, dateColumns, teacher, batch);
    const ws2 = XLSX.utils.aoa_to_sheet(summaryAoa);
    ws2['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Mismatch Summary');
  }

  const fname = `Attendance_${batch}_${teacher.replace(/[^a-zA-Z0-9]/g,'_')}_${mismatchOnly ? 'Mismatches' : 'Full'}_${datestamp()}.xlsx`;
  XLSX.writeFile(wb, fname);
  showToast(`"${fname}" download ہو رہی ہے`, 'success');
}

// ── Excel Cell Styles (colors) ─────────────────────────────
function applyExcelStyles(ws, results, dateColumns, mismatchOnly) {
  const headerRowOffset = 3; // rows 0,1,2 = title, subtitle, blank
  const dataStartRow    = headerRowOffset + 1; // row index of first data row

  // Color palette
  const C = {
    match:     { fgColor: { rgb: 'C6EFCE' } }, // light green
    mismatch:  { fgColor: { rgb: 'FFC7CE' } }, // light red
    absent:    { fgColor: { rgb: 'EDEDED' } }, // light gray
    na:        { fgColor: { rgb: 'FFEB9C' } }, // light yellow
    headerBg:  { fgColor: { rgb: '4F46E5' } }, // indigo
    titleBg:   { fgColor: { rgb: '3B3580' } }, // dark indigo
    subBg:     { fgColor: { rgb: '6C63B0' } }, // medium indigo
    whiteFont: { rgb: 'FFFFFF' },
    darkFont:  { rgb: '1E293B' },
    matchFont: { rgb: '276221' },
    mmFont:    { rgb: '9C0006' },
    abFont:    { rgb: '636363' },
    naFont:    { rgb: '9C6500' },
  };

  const boldFont = (color) => ({ bold: true, color: { rgb: color }, sz: 11 });
  const centerAlign = { horizontal: 'center', vertical: 'center', wrapText: true };
  const leftAlign   = { horizontal: 'left',   vertical: 'center' };

  // Title row (row 0)
  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleCell]) {
    ws[titleCell].s = {
      fill: { patternType: 'solid', fgColor: C.titleBg },
      font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
      alignment: leftAlign
    };
  }

  // Subtitle row (row 1)
  const subCell = XLSX.utils.encode_cell({ r: 1, c: 0 });
  if (ws[subCell]) {
    ws[subCell].s = {
      fill: { patternType: 'solid', fgColor: C.subBg },
      font: { bold: false, sz: 10, color: { rgb: 'FFFFFF' } },
      alignment: leftAlign
    };
  }

  // Header row (row 3)
  const hRow = headerRowOffset;
  const totalCols = 3 + dateColumns.length + 3;
  for (let c = 0; c < totalCols; c++) {
    const ref = XLSX.utils.encode_cell({ r: hRow, c });
    if (!ws[ref]) continue;
    ws[ref].s = {
      fill: { patternType: 'solid', fgColor: C.headerBg },
      font: boldFont('FFFFFF'),
      alignment: centerAlign,
      border: {
        bottom: { style: 'medium', color: { rgb: 'FFFFFF' } }
      }
    };
  }

  // Data cells
  results.forEach((r, rowIdx) => {
    const excelRow = dataStartRow + rowIdx;

    // # column
    const numRef = XLSX.utils.encode_cell({ r: excelRow, c: 0 });
    if (ws[numRef]) ws[numRef].s = { alignment: centerAlign, font: { sz: 10, color: { rgb: '94A3B8' } } };

    // Student ID
    const idRef = XLSX.utils.encode_cell({ r: excelRow, c: 1 });
    if (ws[idRef]) ws[idRef].s = { alignment: leftAlign, font: { sz: 10, color: { rgb: '475569' } } };

    // Student Name
    const nameRef = XLSX.utils.encode_cell({ r: excelRow, c: 2 });
    if (ws[nameRef]) ws[nameRef].s = { alignment: leftAlign, font: { bold: true, sz: 11, color: { rgb: '1E293B' } } };

    // Date cells
    dateColumns.forEach((dc, ci) => {
      const cell = r.dateResults[dc.dateStr];
      const ref  = XLSX.utils.encode_cell({ r: excelRow, c: 3 + ci });
      if (!ws[ref]) return;

      if (!cell || cell.cellType === 'empty') {
        ws[ref].s = { alignment: centerAlign, font: { sz: 10, color: { rgb: 'CBD5E1' } } };
      } else if (cell.cellType === 'match') {
        ws[ref].s = {
          fill: { patternType: 'solid', fgColor: C.match },
          font: { bold: true, sz: 10, color: { rgb: C.matchFont } },
          alignment: centerAlign
        };
      } else if (cell.cellType === 'mismatch') {
        ws[ref].s = {
          fill: { patternType: 'solid', fgColor: C.mismatch },
          font: { bold: true, sz: 10, color: { rgb: C.mmFont } },
          alignment: centerAlign
        };
      } else if (cell.cellType === 'absent') {
        ws[ref].s = {
          fill: { patternType: 'solid', fgColor: C.absent },
          font: { sz: 10, color: { rgb: C.abFont } },
          alignment: centerAlign
        };
      } else if (cell.cellType === 'na') {
        ws[ref].s = {
          fill: { patternType: 'solid', fgColor: C.na },
          font: { sz: 10, color: { rgb: C.naFont } },
          alignment: centerAlign
        };
      }
    });

    // Summary columns (Total P Teacher, Total P Student, Mismatches)
    const colBase = 3 + dateColumns.length;
    for (let c = 0; c < 3; c++) {
      const ref = XLSX.utils.encode_cell({ r: excelRow, c: colBase + c });
      if (!ws[ref]) continue;
      ws[ref].s = {
        alignment: centerAlign,
        font: { bold: c === 2, sz: 11, color: { rgb: c === 2 && ws[ref].v > 0 ? 'B91C1C' : '1E293B' } }
      };
    }
  });
}

// ── Mismatch Summary Sheet ─────────────────────────────────
function buildSummarySheet(results, dateColumns, teacher, batch) {
  const aoa = [];
  aoa.push([`Mismatch Summary — Teacher: ${teacher} | Batch: ${batch}`]);
  aoa.push([`Generated: ${new Date().toLocaleString('en-GB')}`]);
  aoa.push([]);
  aoa.push([
    '#',
    'Student ID',
    'Student Name',
    'Date',
    'OSquare Status',
    'Aptrack Status',
    'Mismatch Source',
    'Description'
  ]);

  let idx = 0;
  for (const r of results) {
    for (const dc of dateColumns) {
      const cell = r.dateResults[dc.dateStr];
      if (!cell || cell.cellType !== 'mismatch') continue;
      idx++;

      const isOSQ = cell.mismatchSource === 'osquare';
      const source = isOSQ ? 'OSquare' : 'Aptrack';
      const desc   = isOSQ
        ? 'Aptrack mein Present hai lekin OSquare ne Absent marka'
        : 'OSquare ne Present marka lekin Aptrack mein record nahi';

      aoa.push([
        idx,
        r.studentId,
        r.studentName,
        dc.dateStr,
        cell.tv,   // OSquare
        cell.sv,   // Aptrack
        source,    // Mismatch Source
        desc
      ]);
    }
  }

  if (idx === 0) {
    aoa.push(['', '', '', '', '', '', '', 'No mismatches found — all attendance matches!']);
  }

  return aoa;
}

function datestamp() {
  const d = new Date();
  return `${d.getDate().toString().padStart(2,'0')}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getFullYear()}`;
}

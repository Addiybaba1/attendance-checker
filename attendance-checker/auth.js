// ============================================================
//   ATTENDANCE CHECKER — auth.js
//   Admin Panel, Coupon Code Generator, 2-Hour Expiry Engine,
//   JSON Database & Client-Side Authentication for GitHub Pages
// ============================================================

const AUTH_DB_KEY = 'attendance_checker_db_v1';
const AUTH_SESSION_KEY = 'attendance_checker_session_v1';
const TWO_HOURS_MINUTES = 120;

// ── Global Toast Notification ──────────────────────────────
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  const icon = type === 'success'
    ? '<i class="fa-solid fa-circle-check"></i>'
    : type === 'error'
    ? '<i class="fa-solid fa-circle-xmark"></i>'
    : '<i class="fa-solid fa-circle-info"></i>';
  t.innerHTML = icon + ' ' + msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3500);
}

// ── Default Initial Database (Client-side JSON) ─────────────
const DEFAULT_DB = {
  admin: {
    username: 'AsadAli',
    password: 'AsadAli123!@',
    name: 'Asad Ali (Admin)'
  },
  settings: {
    systemName: 'Attendance Checker – Addiy Dot Code Education',
    defaultDurationMinutes: TWO_HOURS_MINUTES
  },
  users: [
    {
      id: 'usr_test_101',
      name: 'Testing Teacher',
      username: 'testuser',
      password: 'test123',
      couponCode: 'OSQ-TEST-2H',
      couponDurationMinutes: TWO_HOURS_MINUTES,
      couponCreatedAt: Date.now(),
      activatedAt: null,
      expiresAt: null,
      status: 'unused', // 'unused' | 'active' | 'expired'
      createdAt: Date.now()
    }
  ],
  couponsHistory: [
    {
      code: 'OSQ-TEST-2H',
      userId: 'usr_test_101',
      username: 'testuser',
      createdAt: Date.now(),
      status: 'unused'
    }
  ]
};

// ── DB Helpers ──────────────────────────────────────────────
function getDB() {
  try {
    const raw = localStorage.getItem(AUTH_DB_KEY);
    if (!raw) {
      saveDB(DEFAULT_DB);
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
    const data = JSON.parse(raw);
    if (!data.users || !data.admin) {
      saveDB(DEFAULT_DB);
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
    // Auto-migrate old default credentials if present
    if (data.admin.username === 'admin' && data.admin.password === 'admin123') {
      data.admin.username = 'AsadAli';
      data.admin.password = 'AsadAli123!@';
      data.admin.name = 'Asad Ali (Admin)';
      saveDB(data);
    }
    // Ensure test user exists for testing
    if (!data.users.some(u => u.username === 'testuser')) {
      data.users.unshift({
        id: 'usr_test_101',
        name: 'Testing Teacher',
        username: 'testuser',
        password: 'test123',
        couponCode: 'OSQ-TEST-2H',
        couponDurationMinutes: TWO_HOURS_MINUTES,
        couponCreatedAt: Date.now(),
        activatedAt: null,
        expiresAt: null,
        status: 'unused',
        createdAt: Date.now()
      });
      saveDB(data);
    }
    return data;
  } catch (e) {
    console.error('Error loading DB from localStorage:', e);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function saveDB(data) {
  try {
    localStorage.setItem(AUTH_DB_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving DB to localStorage:', e);
    showToast('Browser storage error. Please check storage space.', 'error');
  }
}

// ── Session Helpers ─────────────────────────────────────────
function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setSession(session) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

// ── Coupon Generator ────────────────────────────────────────
function generateCouponCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const db = getDB();
  const existingCodes = new Set();
  
  (db.users || []).forEach(u => { if (u.couponCode) existingCodes.add(u.couponCode.toUpperCase()); });
  (db.couponsHistory || []).forEach(c => { if (c.code) existingCodes.add(c.code.toUpperCase()); });

  let attempts = 0;
  while (attempts < 500) {
    attempts++;
    let randNum = Math.floor(1000 + Math.random() * 9000);
    let randChars = '';
    for (let i = 0; i < 2; i++) {
      randChars += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `OSQ-${randNum}-${randChars}`;
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  return `OSQ-${Date.now().toString().slice(-6)}`;
}

// ── Format Helpers ──────────────────────────────────────────
function formatTimeRemaining(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDateDisplay(timestamp) {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
}

// ── Expiry Checker & Timer Engine ───────────────────────────
let timerInterval = null;

function startTimerEngine() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const session = getSession();
    if (!session) return;

    // Check if session is regular user
    if (session.role === 'user') {
      const now = Date.now();
      const timeLeft = (session.expiresAt || 0) - now;

      if (timeLeft <= 0) {
        // EXPIRED! Auto Kickout
        handleUserExpiryKickout(session);
        return;
      }

      // Update Header Timer Pill
      updateHeaderUserTimer(timeLeft);
    }

    // If Admin modal is open, live update table times
    const modal = document.getElementById('adminModal');
    if (modal && modal.classList.contains('active')) {
      liveUpdateAdminTableTimers();
    }
  }, 1000);
}

function updateHeaderUserTimer(timeLeftMs) {
  const timerPill = document.getElementById('headerTimerPill');
  if (!timerPill) return;

  const timeStr = formatTimeRemaining(timeLeftMs);
  timerPill.innerHTML = `<i class="fa-regular fa-clock"></i> <span>${timeStr} Baqi</span>`;

  // Warning thresholds
  const minutesLeft = timeLeftMs / (1000 * 60);
  timerPill.classList.remove('warning', 'danger');
  if (minutesLeft <= 10) {
    timerPill.classList.add('danger');
  } else if (minutesLeft <= 30) {
    timerPill.classList.add('warning');
  }
}

// Kick out user automatically when 2 hours finish
function handleUserExpiryKickout(session) {
  console.log('User session expired. Kicking out:', session.username);
  
  // Update status in DB to expired
  const db = getDB();
  const user = db.users.find(u => u.username.toLowerCase() === session.username.toLowerCase());
  if (user) {
    user.status = 'expired';
    saveDB(db);
  }

  // Clear session
  clearSession();

  // Play subtle alert tone if browser allows
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    // Ignore audio error
  }

  // Show Expired Modal
  showExpiredModal(session);

  // Update layout back to locked/login
  renderAuthGatekeeper();
}

function showExpiredModal(session) {
  const modal = document.getElementById('expiredModal');
  const userDisp = document.getElementById('expiredUserName');
  const codeDisp = document.getElementById('expiredUserCode');
  if (userDisp) userDisp.textContent = session ? session.name || session.username : 'User';
  if (codeDisp) codeDisp.textContent = session ? session.couponCode || '—' : '—';
  if (modal) modal.classList.add('active');
}

function closeExpiredModal() {
  const modal = document.getElementById('expiredModal');
  if (modal) modal.classList.remove('active');
  // Switch to login user tab
  switchAuthTab('user');
}

// ── Authentication Actions ──────────────────────────────────
function handleAdminLogin(username, password) {
  const db = getDB();
  const u = (username || '').trim();
  const p = (password || '').trim();

  if (u === db.admin.username && p === db.admin.password) {
    const session = {
      role: 'admin',
      username: db.admin.username,
      name: db.admin.name,
      loginAt: Date.now(),
      expiresAt: null // Lifetime / Free
    };
    setSession(session);
    showToast(`Welcome Admin! Full Lifetime Access Granted.`, 'success');
    renderAuthGatekeeper();
    return true;
  } else {
    showToast('Ghalat Admin Username ya Password!', 'error');
    return false;
  }
}

function handleUserLogin(username, password, couponInput) {
  const db = getDB();
  const u = (username || '').trim().toLowerCase();
  const p = (password || '').trim();
  const code = (couponInput || '').trim().toUpperCase();

  if (!u || !p || !code) {
    showToast('Tamam fields (Username, Password aur Coupon Code) bharein!', 'error');
    return false;
  }

  // Find user
  const user = db.users.find(usr => usr.username.toLowerCase() === u);
  if (!user) {
    showToast('Yeh User mojood nahi hai. Barah-e-karam Admin se rabta karein.', 'error');
    return false;
  }

  if (user.password !== p) {
    showToast('Ghalat Password! Barah-e-karam dobara koshish karein.', 'error');
    return false;
  }

  // Verify Coupon Code
  if (!user.couponCode || user.couponCode.toUpperCase() !== code) {
    showToast('Ghalat Coupon Code! Barah-e-karam sahi code enter karein.', 'error');
    return false;
  }

  const now = Date.now();
  const durationMs = (user.couponDurationMinutes || TWO_HOURS_MINUTES) * 60 * 1000;

  // Check Coupon Status
  if (user.status === 'expired') {
    showToast('Yeh Coupon Code EXPIRE ho chuka hai! Admin se new coupon lein.', 'error');
    return false;
  }

  if (user.status === 'unused') {
    // First time activation! Start 2-hour countdown
    user.status = 'active';
    user.activatedAt = now;
    user.expiresAt = now + durationMs;
    saveDB(db);

    const session = {
      role: 'user',
      userId: user.id,
      username: user.username,
      name: user.name,
      couponCode: user.couponCode,
      loginAt: now,
      expiresAt: user.expiresAt
    };
    setSession(session);
    showToast(`Access Verified! 2 Ghante ka access shuru ho gaya hai.`, 'success');
    renderAuthGatekeeper();
    return true;
  }

  if (user.status === 'active') {
    // Check if time is still valid
    if (now >= user.expiresAt) {
      user.status = 'expired';
      saveDB(db);
      showToast('Aapka coupon code expire ho chuka hai! Admin se naya code lein.', 'error');
      return false;
    }

    // Resume valid active session
    const session = {
      role: 'user',
      userId: user.id,
      username: user.username,
      name: user.name,
      couponCode: user.couponCode,
      loginAt: now,
      expiresAt: user.expiresAt
    };
    setSession(session);
    showToast(`Welcome back! Remaining access restored.`, 'success');
    renderAuthGatekeeper();
    return true;
  }

  return false;
}

function handleLogout() {
  clearSession();
  showToast('Aap kamyabi se logout ho gaye hain.', 'success');
  renderAuthGatekeeper();
}

// ── UI Rendering & Sync ─────────────────────────────────────
function renderAuthGatekeeper() {
  const session = getSession();
  const overlay = document.getElementById('authOverlay');
  const mainApp = document.querySelector('.main');
  const headerRight = document.querySelector('.header-right');

  if (!session) {
    // Locked: Show Login Overlay, Hide Main App Content
    if (overlay) overlay.classList.add('active');
    if (mainApp) mainApp.style.filter = 'blur(10px)';
    if (mainApp) mainApp.style.pointerEvents = 'none';

    // Clear header controls
    if (headerRight) {
      headerRight.innerHTML = `
        <div class="header-badge">
          <span class="pulse-dot"></span>
          Secure Access
        </div>
      `;
    }
  } else {
    // Unlocked: Hide Login Overlay, Show Main App Content
    if (overlay) overlay.classList.remove('active');
    if (mainApp) mainApp.style.filter = 'none';
    if (mainApp) mainApp.style.pointerEvents = 'auto';

    // Update Header Right according to role
    if (session.role === 'admin') {
      headerRight.innerHTML = `
        <div class="admin-badge-hdr">
          <i class="fa-solid fa-crown" style="color:#fbbf24;"></i>
          Admin (Free Lifetime)
        </div>
        <button class="btn-header-action btn-admin-panel" onclick="openAdminPanel()">
          <i class="fa-solid fa-gauge-high"></i> Admin Panel
        </button>
        <button class="btn-header-action btn-logout" onclick="handleLogout()" title="Logout">
          <i class="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      `;
    } else {
      // User
      const timeLeft = Math.max(0, (session.expiresAt || 0) - Date.now());
      headerRight.innerHTML = `
        <div class="user-status-pill">
          <i class="fa-regular fa-user" style="color:#4f46e5;"></i>
          <span>${session.name || session.username}</span>
        </div>
        <div class="timer-pill" id="headerTimerPill">
          <i class="fa-regular fa-clock"></i>
          <span>${formatTimeRemaining(timeLeft)} Baqi</span>
        </div>
        <button class="btn-header-action btn-logout" onclick="handleLogout()" title="Logout">
          <i class="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      `;
    }
  }
}

function switchAuthTab(tab) {
  const userBtn = document.getElementById('tabUserBtn');
  const adminBtn = document.getElementById('tabAdminBtn');
  const userForm = document.getElementById('userLoginForm');
  const adminForm = document.getElementById('adminLoginForm');

  if (tab === 'admin') {
    if (adminBtn) adminBtn.classList.add('active');
    if (userBtn) userBtn.classList.remove('active');
    if (adminForm) adminForm.classList.add('active');
    if (userForm) userForm.classList.remove('active');
  } else {
    if (userBtn) userBtn.classList.add('active');
    if (adminBtn) adminBtn.classList.remove('active');
    if (userForm) userForm.classList.add('active');
    if (adminForm) adminForm.classList.remove('active');
  }
}

// ── Admin Dashboard Controls ────────────────────────────────
function openAdminPanel() {
  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.classList.add('active');
    renderAdminDashboard();
  }
}

function closeAdminPanel() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.remove('active');
}

function renderAdminDashboard() {
  const db = getDB();
  const now = Date.now();

  // Metrics
  const totalUsers = db.users.length;
  let activeUsers = 0;
  let expiredUsers = 0;
  let unusedUsers = 0;

  db.users.forEach(u => {
    if (u.status === 'active') {
      if (now < u.expiresAt) activeUsers++;
      else expiredUsers++;
    } else if (u.status === 'expired') {
      expiredUsers++;
    } else {
      unusedUsers++;
    }
  });

  const totalCoupons = (db.couponsHistory || []).length || totalUsers;

  document.getElementById('statTotalUsers').textContent = totalUsers;
  document.getElementById('statActiveUsers').textContent = activeUsers;
  document.getElementById('statExpiredUsers').textContent = expiredUsers;
  document.getElementById('statTotalCoupons').textContent = totalCoupons;

  renderAdminUsersTable();
}

function renderAdminUsersTable(filterText = '') {
  const db = getDB();
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  const now = Date.now();
  const query = (filterText || '').toLowerCase().trim();

  const filtered = db.users.filter(u => {
    if (!query) return true;
    return (
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.username && u.username.toLowerCase().includes(query)) ||
      (u.couponCode && u.couponCode.toLowerCase().includes(query))
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-table-state">
            <i class="fa-solid fa-users-slash"></i>
            <p>${query ? 'Koi user match nahi hua.' : 'Filhal koi users mojood nahi hain. Naya user banayein!'}</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(user => {
    // Evaluate status & remaining
    let statusClass = 'unused';
    let statusLabel = 'Unused (2h Waiting)';
    let remainingText = '—';
    let isExpired = false;

    if (user.status === 'active') {
      const remainingMs = (user.expiresAt || 0) - now;
      if (remainingMs > 0) {
        statusClass = 'active';
        statusLabel = 'Active (In Use)';
        remainingText = `<span class="remaining-pill" data-user-id="${user.id}">${formatTimeRemaining(remainingMs)}</span>`;
      } else {
        statusClass = 'expired';
        statusLabel = 'Expired';
        remainingText = '<span class="remaining-pill expired">Khatam</span>';
        isExpired = true;
      }
    } else if (user.status === 'expired') {
      statusClass = 'expired';
      statusLabel = 'Expired';
      remainingText = '<span class="remaining-pill expired">Khatam</span>';
      isExpired = true;
    }

    return `
      <tr id="row-user-${user.id}">
        <td>
          <div class="user-cell">
            <div class="user-avatar">${(user.name || user.username).charAt(0).toUpperCase()}</div>
            <div>
              <div class="user-meta-name">${escapeHtml(user.name || user.username)}</div>
              <div class="user-meta-uname">@${escapeHtml(user.username)}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-family:monospace;font-size:0.85rem;color:#475569;">${escapeHtml(user.password)}</span>
        </td>
        <td>
          <div class="coupon-pill-wrap">
            <span class="coupon-code-txt">${escapeHtml(user.couponCode || 'N/A')}</span>
            <button class="btn-mini-copy" onclick="copyText('${user.couponCode}', 'Coupon Code')" title="Copy Coupon">
              <i class="fa-regular fa-copy"></i>
            </button>
          </div>
        </td>
        <td>
          <span class="badge-status ${statusClass}">
            <i class="fa-solid fa-circle" style="font-size:0.45rem;"></i> ${statusLabel}
          </span>
        </td>
        <td class="cell-time-remaining">
          ${remainingText}
        </td>
        <td>
          <div class="row-actions">
            <button class="btn-row-action btn-renew" onclick="regenerateCouponForUser('${user.id}')" title="Naya 2-Hour Coupon Generate Karein">
              <i class="fa-solid fa-arrows-rotate"></i>
            </button>
            <button class="btn-row-action" onclick="extendUserDuration('${user.id}', 60)" title="+1 Ghanta Extend Karein" style="color:#0284c7;border-color:#bae6fd;background:#f0f9ff;">
              <i class="fa-solid fa-clock-rotate-left"></i>
            </button>
            <button class="btn-row-action btn-wa" onclick="shareWhatsAppInvite('${user.id}')" title="WhatsApp Message Copy Karein">
              <i class="fa-brands fa-whatsapp"></i>
            </button>
            <button class="btn-row-action btn-del" onclick="deleteUser('${user.id}')" title="User Delete Karein">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function liveUpdateAdminTableTimers() {
  const db = getDB();
  const now = Date.now();
  const pills = document.querySelectorAll('.remaining-pill[data-user-id]');

  pills.forEach(pill => {
    const uid = pill.getAttribute('data-user-id');
    const user = db.users.find(u => u.id === uid);
    if (user && user.status === 'active') {
      const rem = (user.expiresAt || 0) - now;
      if (rem > 0) {
        pill.textContent = formatTimeRemaining(rem);
      } else {
        pill.textContent = 'Khatam';
        pill.classList.add('expired');
        // Trigger re-render to update badges
        renderAdminUsersTable();
      }
    }
  });
}

// ── User Management Functions ───────────────────────────────
function openAddUserModal() {
  const modal = document.getElementById('addUserModal');
  const form = document.getElementById('addUserForm');
  if (form) form.reset();

  // Pre-generate a unique random coupon code
  const newCode = generateCouponCode();
  const codeDisp = document.getElementById('modalGeneratedCoupon');
  if (codeDisp) codeDisp.textContent = newCode;
  
  if (modal) modal.classList.add('active');
}

function closeAddUserModal() {
  const modal = document.getElementById('addUserModal');
  if (modal) modal.classList.remove('active');
}

function shuffleModalCoupon() {
  const newCode = generateCouponCode();
  const codeDisp = document.getElementById('modalGeneratedCoupon');
  if (codeDisp) codeDisp.textContent = newCode;
}

function submitAddUser(event) {
  event.preventDefault();
  const name = document.getElementById('newUserName').value.trim();
  const username = document.getElementById('newUserUsername').value.trim().toLowerCase();
  const password = document.getElementById('newUserPassword').value.trim();
  const duration = parseInt(document.getElementById('newUserDuration').value) || TWO_HOURS_MINUTES;
  const couponCode = document.getElementById('modalGeneratedCoupon').textContent.trim();

  if (!name || !username || !password || !couponCode) {
    showToast('Tamam zaroori fields bharein!', 'error');
    return;
  }

  const db = getDB();

  // Check unique username
  if (db.users.some(u => u.username.toLowerCase() === username)) {
    showToast(`Username "${username}" pehle se mojood hai! Mukhtalif username chunein.`, 'error');
    return;
  }

  const newUser = {
    id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    name: name,
    username: username,
    password: password,
    couponCode: couponCode,
    couponDurationMinutes: duration,
    couponCreatedAt: Date.now(),
    activatedAt: null,
    expiresAt: null,
    status: 'unused',
    createdAt: Date.now()
  };

  db.users.unshift(newUser);

  if (!db.couponsHistory) db.couponsHistory = [];
  db.couponsHistory.push({
    code: couponCode,
    userId: newUser.id,
    username: newUser.username,
    createdAt: Date.now(),
    status: 'unused'
  });

  saveDB(db);
  closeAddUserModal();
  renderAdminDashboard();

  showToast(`User "${name}" ban gaya! Coupon Code: ${couponCode}`, 'success');

  // Prompt to copy WhatsApp details
  shareWhatsAppInvite(newUser.id);
}

function regenerateCouponForUser(userId) {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return;

  const newCode = generateCouponCode();
  user.couponCode = newCode;
  user.status = 'unused'; // Reset to unused so 2 hours starts when they login
  user.activatedAt = null;
  user.expiresAt = null;
  user.couponCreatedAt = Date.now();
  user.couponDurationMinutes = TWO_HOURS_MINUTES;

  if (!db.couponsHistory) db.couponsHistory = [];
  db.couponsHistory.push({
    code: newCode,
    userId: user.id,
    username: user.username,
    createdAt: Date.now(),
    status: 'unused'
  });

  saveDB(db);
  renderAdminDashboard();

  showToast(`Naya Coupon Code: ${newCode} (${user.name} ke liye) generate ho gaya!`, 'success');
  shareWhatsAppInvite(user.id);
}

function extendUserDuration(userId, minutesToAdd = 60) {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return;

  const now = Date.now();
  const addMs = minutesToAdd * 60 * 1000;

  if (user.status === 'active' && user.expiresAt && user.expiresAt > now) {
    user.expiresAt += addMs;
  } else {
    // If expired or unused, activate/re-enable for the duration
    user.status = 'active';
    user.activatedAt = now;
    user.expiresAt = now + addMs;
  }

  saveDB(db);
  renderAdminDashboard();
  showToast(`${user.name} ka time +${minutesToAdd} minutes extend kar diya gaya!`, 'success');
}

function deleteUser(userId) {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return;

  if (!confirm(`Kya aap waqai "${user.name || user.username}" ko delete karna chahte hain?`)) {
    return;
  }

  db.users = db.users.filter(u => u.id !== userId);
  saveDB(db);
  renderAdminDashboard();
  showToast(`User "${user.name}" delete ho gaya.`, 'success');
}

function shareWhatsAppInvite(userId) {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return;

  const siteUrl = window.location.href.split('#')[0];
  const hours = Math.round((user.couponDurationMinutes || TWO_HOURS_MINUTES) / 60);

  const text = 
`*Assalam-o-Alaikum ${user.name}!* 🌟
Aapka Attendance Checker Portal access ready hai:

🌐 *Portal Link:* ${siteUrl}
👤 *Username:* ${user.username}
🔑 *Password:* ${user.password}
🎟️ *Coupon Code:* ${user.couponCode}
⏱️ *Validity:* ${hours} Ghante (Login aur coupon dalne ke baad)

_Note: Login ke waqt coupon code zaroor enter karein._`;

  copyText(text, 'User Login Info & Coupon (Ready to paste in WhatsApp)');
}

// ── JSON Database Export & Import ───────────────────────────
function exportDatabaseAsJSON() {
  const db = getDB();
  const jsonStr = JSON.stringify(db, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_checker_database_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Database JSON file download ho gayi!', 'success');
}

function importDatabaseFromJSON(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.admin || !Array.isArray(parsed.users)) {
        showToast('Invalid JSON database file!', 'error');
        return;
      }
      saveDB(parsed);
      showToast('Database kamyabi se restore ho gaya!', 'success');
      renderAdminDashboard();
      renderAuthGatekeeper();
    } catch (err) {
      showToast('JSON file read karne me khata: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  fileInput.value = '';
}

function handleUpdateAdminCredentials(event) {
  event.preventDefault();
  const newU = document.getElementById('adminNewUsername').value.trim();
  const newP = document.getElementById('adminNewPassword').value.trim();

  if (!newU || !newP) {
    showToast('Username aur password khali nahi ho sakte!', 'error');
    return;
  }

  const db = getDB();
  db.admin.username = newU;
  db.admin.password = newP;
  saveDB(db);

  showToast('Admin login credentials update ho gaye!', 'success');
}

function handleResetDatabase() {
  if (!confirm('Warning: Kya aap tamam users aur data reset karna chahte hain?')) return;
  saveDB(DEFAULT_DB);
  showToast('Database reset ho gaya default par.', 'success');
  renderAdminDashboard();
  renderAuthGatekeeper();
}

// ── Utility Helpers ─────────────────────────────────────────
function copyText(str, label = 'Text') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(str).then(() => {
      showToast(`${label} copy ho gaya!`, 'success');
    }).catch(() => {
      fallbackCopy(str, label);
    });
  } else {
    fallbackCopy(str, label);
  }
}

function fallbackCopy(str, label) {
  const ta = document.createElement('textarea');
  ta.value = str;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(`${label} copy ho gaya!`, 'success');
  } catch (e) {
    showToast('Copy nahi ho saka, manually copy karein.', 'error');
  }
  document.body.removeChild(ta);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
  } else {
    input.type = 'password';
    btn.innerHTML = '<i class="fa-regular fa-eye"></i>';
  }
}

function switchAdminTab(tabName) {
  const tabUsers = document.getElementById('adminTabBtnUsers');
  const tabBackup = document.getElementById('adminTabBtnBackup');
  const viewUsers = document.getElementById('adminViewUsers');
  const viewBackup = document.getElementById('adminViewBackup');

  if (tabName === 'backup') {
    if (tabBackup) tabBackup.classList.add('active');
    if (tabUsers) tabUsers.classList.remove('active');
    if (viewBackup) viewBackup.style.display = 'block';
    if (viewUsers) viewUsers.style.display = 'none';
  } else {
    if (tabUsers) tabUsers.classList.add('active');
    if (tabBackup) tabBackup.classList.remove('active');
    if (viewUsers) viewUsers.style.display = 'block';
    if (viewBackup) viewBackup.style.display = 'none';
  }
}

// ── DOM Initialization ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Ensure DB exists
  getDB();

  // Start ticker
  startTimerEngine();

  // Render initial gatekeeper
  renderAuthGatekeeper();

  // Setup User Search Filter in Admin table
  const searchInput = document.getElementById('adminSearchUsers');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderAdminUsersTable(e.target.value);
    });
  }

  // Setup Login Form Submissions
  const userLoginForm = document.getElementById('userLoginForm');
  if (userLoginForm) {
    userLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('userLoginName').value;
      const p = document.getElementById('userLoginPass').value;
      const c = document.getElementById('userLoginCoupon').value;
      handleUserLogin(u, p, c);
    });
  }

  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('adminLoginName').value;
      const p = document.getElementById('adminLoginPass').value;
      handleAdminLogin(u, p);
    });
  }
});

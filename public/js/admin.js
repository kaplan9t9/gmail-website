const API = '/api';
let adminToken = localStorage.getItem('adminToken');
let adminData = null;

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (adminToken) {
    showAdminDashboard();
    loadAdminData();
  }
  initAdminLogin();
  initNavigation();
  initForms();
  initTheme();
});

// Theme
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

// Admin Login
function initAdminLogin() {
  document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('adminLoginBtn');
    const token = document.getElementById('adminToken').value.trim();

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Verifying...';

    try {
      const res = await fetch(`${API}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', githubToken: token })
      });
      const data = await res.json();

      if (!res.ok) {
        showAlert('adminLoginAlert', data.error, 'error');
        btn.disabled = false;
        btn.textContent = 'Login as Admin';
        return;
      }

      adminToken = data.token;
      localStorage.setItem('adminToken', adminToken);
      showAdminDashboard();
      loadAdminData();
    } catch (err) {
      showAlert('adminLoginAlert', 'Connection error', 'error');
      btn.disabled = false;
      btn.textContent = 'Login as Admin';
    }
  });
}

function showAdminDashboard() {
  document.getElementById('adminLoginPage').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'flex';
}

// Navigation
function initNavigation() {
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.section-page').forEach(s => s.classList.add('section-hidden'));
      document.getElementById(`section-${section}`).classList.remove('section-hidden');
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  // Gmail filter tabs
  document.querySelectorAll('#adminGmailFilters .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#adminGmailFilters .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderAdminGmails(tab.dataset.filter);
    });
  });
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// API helper
async function adminApiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API}/${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Load all data
async function loadAdminData() {
  showLoading();
  try {
    adminData = await adminApiCall('admin?section=all');

    // Stats
    const s = adminData.stats;
    document.getElementById('adminTotalUsers').textContent = s.totalUsers;
    document.getElementById('adminTotalGmails').textContent = s.totalGmails;
    document.getElementById('adminPendingGmails').textContent = s.pendingGmails;
    document.getElementById('adminApprovedGmails').textContent = s.approvedGmails;
    document.getElementById('adminPendingWithdrawals').textContent = s.pendingWithdrawals;
    document.getElementById('adminTotalComments').textContent = s.totalComments;

    renderUsers();
    renderAdminGmails('all');
    renderPendingWithdrawals();
    renderApprovedWithdrawals();
    renderComments();
    loadSettings();

    hideLoading();
  } catch (err) {
    hideLoading();
    if (err.message === 'Admin access required') {
      adminLogout();
      return;
    }
    showToast(err.message, 'error');
  }
}

function renderUsers() {
  const tbody = document.getElementById('adminUsersTable');
  const users = adminData.users || [];
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><span>👥</span><p>No users yet</p></td></tr>';
    return;
  }

  // Get gmail counts per user
  const gmails = adminData.gmails || [];
  tbody.innerHTML = users.map((u, i) => {
    const userGmails = gmails.filter(g => g.userId === u.id);
    const pending = userGmails.filter(g => g.status === 'pending').length;
    const approved = userGmails.filter(g => g.status === 'approved').length;
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${esc(u.fullName)}</strong></td>
        <td>${esc(u.easyPaisaNumber)}</td>
        <td>${esc(u.gmail)}</td>
        <td><span class="badge badge-pending">${pending}</span></td>
        <td><span class="badge badge-approved">${approved}</span></td>
        <td>${fmtDate(u.createdAt)}</td>
      </tr>
    `;
  }).join('');
}

function renderAdminGmails(filter) {
  const tbody = document.getElementById('adminGmailsTable');
  let gmails = adminData.gmails || [];
  if (filter !== 'all') {
    gmails = gmails.filter(g => g.status === filter);
  }

  if (gmails.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><span>📧</span><p>No Gmails found</p></td></tr>';
    return;
  }

  tbody.innerHTML = gmails.map((g, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(g.userName)}</td>
      <td>${esc(g.gmail)}</td>
      <td>${esc(g.password)}</td>
      <td><span class="badge badge-${g.status}">${g.status}</span></td>
      <td>${fmtDate(g.submittedAt)}</td>
      <td>
        ${g.status === 'pending' ? `
          <button class="btn btn-success btn-sm" onclick="approveGmail('${g.id}')">✅ Approve</button>
          <button class="btn btn-danger btn-sm" onclick="disqualifyGmail('${g.id}')">❌ Disqualify</button>
        ` : g.status === 'approved' ? `
          <button class="btn btn-danger btn-sm" onclick="disqualifyGmail('${g.id}')">❌ Disqualify</button>
        ` : '-'}
      </td>
    </tr>
  `).join('');
}

function renderPendingWithdrawals() {
  const tbody = document.getElementById('adminPendingWithdrawTable');
  const pending = (adminData.withdrawals || []).filter(w => w.status === 'pending');

  if (pending.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><span>⏳</span><p>No pending requests</p></td></tr>';
    return;
  }

  tbody.innerHTML = pending.map((w, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(w.userName)}</td>
      <td>${esc(w.holderName)}</td>
      <td>${esc(w.easyPaisaNumber)}</td>
      <td><strong>${w.approvedGmailCount}</strong></td>
      <td>${fmtDate(w.requestedAt)}</td>
      <td>
        <button class="btn btn-success btn-sm" onclick="approveWithdrawal('${w.id}')">✅ Approve</button>
      </td>
    </tr>
  `).join('');
}

function renderApprovedWithdrawals() {
  const tbody = document.getElementById('adminApprovedWithdrawTable');
  const approved = (adminData.withdrawals || []).filter(w => w.status === 'approved');

  if (approved.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span>✅</span><p>No approved withdrawals yet</p></td></tr>';
    return;
  }

  tbody.innerHTML = approved.map((w, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(w.userName)}</td>
      <td>${esc(w.holderName)}</td>
      <td>${esc(w.easyPaisaNumber)}</td>
      <td><strong>${w.approvedGmailCount}</strong></td>
      <td>${fmtDate(w.approvedAt)}</td>
    </tr>
  `).join('');
}

function renderComments() {
  const tbody = document.getElementById('adminCommentsTable');
  const comments = adminData.comments || [];

  if (comments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><span>💬</span><p>No comments yet</p></td></tr>';
    return;
  }

  tbody.innerHTML = comments.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${esc(c.userName)}</strong></td>
      <td>${esc(c.userNumber)}</td>
      <td style="max-width:400px; white-space:pre-wrap;">${esc(c.comment)}</td>
      <td>${fmtDate(c.createdAt)}</td>
    </tr>
  `).join('');
}

async function loadSettings() {
  try {
    const settings = adminData.settings || {};
    document.getElementById('videoUrlInput').value = settings.videoUrl || '';
    document.getElementById('namesInput').value = (settings.namesList || []).join('\n');
  } catch (err) {}
}

// Actions
async function approveGmail(id) {
  try {
    showLoading();
    await adminApiCall('admin', 'POST', { action: 'approve-gmail', gmailId: id });
    showToast('Gmail approved!', 'success');
    await loadAdminData();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
}

async function disqualifyGmail(id) {
  try {
    showLoading();
    await adminApiCall('admin', 'POST', { action: 'disqualify-gmail', gmailId: id });
    showToast('Gmail disqualified', 'success');
    await loadAdminData();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
}

async function approveWithdrawal(id) {
  if (!confirm('Approve this withdrawal? This will reset the user\'s approved Gmail count to 0.')) return;
  try {
    showLoading();
    const data = await adminApiCall('admin', 'POST', { action: 'approve-withdrawal', withdrawalId: id });
    showToast(data.message, 'success');
    await loadAdminData();
  } catch (err) {
    hideLoading();
    showToast(err.message, 'error');
  }
}

// Forms
function initForms() {
  document.getElementById('videoSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const videoUrl = document.getElementById('videoUrlInput').value.trim();
      await adminApiCall('admin', 'POST', { action: 'update-settings', videoUrl });
      showAlert('videoSettingsAlert', 'Video URL saved!', 'success');
      showToast('Video URL updated', 'success');
    } catch (err) {
      showAlert('videoSettingsAlert', err.message, 'error');
    }
  });

  document.getElementById('namesSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const text = document.getElementById('namesInput').value;
      const namesList = text.split('\n').map(n => n.trim()).filter(n => n);
      await adminApiCall('admin', 'POST', { action: 'update-settings', namesList });
      showAlert('namesSettingsAlert', `Saved ${namesList.length} names!`, 'success');
      showToast('Names list updated', 'success');
    } catch (err) {
      showAlert('namesSettingsAlert', err.message, 'error');
    }
  });
}

// Utilities
function esc(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}

function fmtDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = `<div class="alert alert-${type}">${type === 'error' ? '⚠️' : '✅'} ${msg}</div>`;
    setTimeout(() => el.innerHTML = '', 5000);
  }
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}
function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function adminLogout() {
  localStorage.removeItem('adminToken');
  window.location.reload();
}

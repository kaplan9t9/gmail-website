const API = '/api';
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let dashboardData = null;

// Auth check
if (!token || !user) {
  window.location.href = '/';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('userName').textContent = user?.fullName || 'User';
  initNavigation();
  initForms();
  loadDashboard();
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
      // Close sidebar on mobile
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  // Gmail filter tabs
  document.querySelectorAll('#section-my-gmails .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#section-my-gmails .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderMyGmails(tab.dataset.filter);
    });
  });
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// API helper
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API}/${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Load dashboard
async function loadDashboard() {
  try {
    dashboardData = await apiCall('dashboard');

    // Stats
    document.getElementById('pendingCount').textContent = dashboardData.pendingGmails;
    document.getElementById('approvedCount').textContent = dashboardData.approvedGmails;
    document.getElementById('withdrawStatus').textContent =
      dashboardData.hasPendingWithdraw ? 'Pending' :
      dashboardData.approvedGmails >= 10 ? 'Eligible' : 'Not Yet';

    // Video
    if (dashboardData.videoUrl) {
      const embedUrl = convertDriveUrl(dashboardData.videoUrl);
      document.getElementById('videoContainer').innerHTML =
        `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
    }

    // Names list
    if (dashboardData.namesList && dashboardData.namesList.length > 0) {
      document.getElementById('namesList').innerHTML =
        dashboardData.namesList.map(n => `<span class="name-tag">${escapeHtml(n)}</span>`).join('');
    }

    // My Gmails
    renderMyGmails('all');

    // Withdraw section
    updateWithdrawSection();

    hideLoading();
  } catch (err) {
    console.error('Dashboard load error:', err);
    hideLoading();
    if (err.message === 'Unauthorized') {
      logout();
    }
    showToast(err.message, 'error');
  }
}

function renderMyGmails(filter) {
  if (!dashboardData) return;
  let gmails = dashboardData.gmails || [];
  if (filter !== 'all') {
    gmails = gmails.filter(g => g.status === filter);
  }

  const tbody = document.getElementById('myGmailsTable');
  if (gmails.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><span>📭</span><p>No Gmails found</p></td></tr>';
    return;
  }

  tbody.innerHTML = gmails.map((g, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(g.gmail)}</td>
      <td>${escapeHtml(g.password)}</td>
      <td><span class="badge badge-${g.status}">${g.status}</span></td>
      <td>${formatDate(g.submittedAt)}</td>
    </tr>
  `).join('');
}

function updateWithdrawSection() {
  const approved = dashboardData.approvedGmails;
  const hasPending = dashboardData.hasPendingWithdraw;
  const withdrawals = dashboardData.withdrawals || [];

  document.getElementById('currentApproved').textContent = approved;

  if (hasPending) {
    document.getElementById('withdrawPending').style.display = '';
    document.getElementById('withdrawEligible').style.display = 'none';
    document.getElementById('withdrawNotEligible').style.display = 'none';
  } else if (approved >= 10) {
    document.getElementById('withdrawEligible').style.display = '';
    document.getElementById('withdrawNotEligible').style.display = 'none';
    document.getElementById('withdrawPending').style.display = 'none';
    document.getElementById('withdrawBadge').textContent = `${approved} Approved`;
  } else {
    document.getElementById('withdrawNotEligible').style.display = '';
    document.getElementById('withdrawEligible').style.display = 'none';
    document.getElementById('withdrawPending').style.display = 'none';
  }

  // History
  const historyTbody = document.getElementById('withdrawHistoryTable');
  if (withdrawals.length === 0) {
    historyTbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span>📋</span><p>No withdrawal history</p></td></tr>';
  } else {
    historyTbody.innerHTML = withdrawals.map((w, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(w.holderName)}</td>
        <td>${escapeHtml(w.easyPaisaNumber)}</td>
        <td>${w.approvedGmailCount}</td>
        <td><span class="badge badge-${w.status}">${w.status}</span></td>
        <td>${formatDate(w.requestedAt)}</td>
      </tr>
    `).join('');
  }
}

// Forms
function initForms() {
  // Quick Submit
  document.getElementById('quickSubmitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitGmail('quickGmail', 'quickPassword', 'quickSubmitBtn', 'quickSubmitAlert');
  });

  // Full Submit
  document.getElementById('submitGmailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitGmail('gmailInput', 'gmailPasswordInput', 'submitGmailBtn', 'submitGmailAlert');
  });

  // Withdraw
  document.getElementById('withdrawForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('withdrawBtn');
    const holderName = document.getElementById('holderName').value.trim();
    const easyPaisaNumber = document.getElementById('withdrawNumber').value.trim();

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Submitting...';

    try {
      const data = await apiCall('withdraw', 'POST', { holderName, easyPaisaNumber });
      showAlert('withdrawAlert', data.message, 'success');
      showToast(data.message, 'success');
      document.getElementById('withdrawForm').reset();
      await loadDashboard();
    } catch (err) {
      showAlert('withdrawAlert', err.message, 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Request Withdrawal';
  });

  // Comment
  document.getElementById('commentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('commentBtn');
    const comment = document.getElementById('commentInput').value.trim();

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Sending...';

    try {
      const data = await apiCall('comment', 'POST', { comment });
      showAlert('commentAlert', data.message, 'success');
      showToast(data.message, 'success');
      document.getElementById('commentForm').reset();
    } catch (err) {
      showAlert('commentAlert', err.message, 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Send Comment';
  });
}

async function submitGmail(gmailId, passId, btnId, alertId) {
  const btn = document.getElementById(btnId);
  const gmail = document.getElementById(gmailId).value.trim();
  const password = document.getElementById(passId).value.trim();

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting...';

  try {
    const data = await apiCall('gmail', 'POST', { gmail, password });
    showAlert(alertId, data.message, 'success');
    showToast('Gmail submitted!', 'success');
    document.getElementById(gmailId).value = '';
    document.getElementById(passId).value = '';
    await loadDashboard();
  } catch (err) {
    showAlert(alertId, err.message, 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Submit';
  if (btnId === 'submitGmailBtn') btn.textContent = 'Submit Gmail';
}

// Utilities
function convertDriveUrl(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  return url;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatDate(dateStr) {
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

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

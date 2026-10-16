/**
 * app.js - Main Application Controller for My Money (Android PWA & Dark Mode)
 * Handles authentication, user profile, theme toggling (Light/Dark), and transaction logic.
 */

// Application State
const AppState = {
  period: 'this-month', // 'this-month', 'last-7-days', 'today', 'all', 'custom'
  startDate: '',
  endDate: '',
  typeFilter: 'all', // 'all', 'income', 'expense'
  categoryFilter: 'all',
  searchQuery: '',
  activeModalType: 'income', // 'income' or 'expense'
  editingId: null
};

// Theme Manager (Light & Dark Mode with Sun/Moon icons)
const ThemeManager = {
  STORAGE_KEY: 'my_money_theme_v1',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.setTheme('dark', false);
    } else {
      this.setTheme('light', false);
    }
  },

  setTheme(theme, save = true) {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    if (save) {
      localStorage.setItem(this.STORAGE_KEY, theme);
    }

    this.updateIcons(theme);

    // Update charts if already initialized
    if (typeof updateAllCharts === 'function' && typeof getFilteredTransactions === 'function') {
      const filtered = getFilteredTransactions();
      updateAllCharts(filtered);
    }
  },

  toggle() {
    const isDark = document.documentElement.classList.contains('dark');
    this.setTheme(isDark ? 'light' : 'dark', true);
    showToast(isDark ? 'Beralih ke Tema Terang ☀️' : 'Beralih ke Tema Gelap 🌙', 'info');
  },

  updateIcons(theme) {
    const isDark = theme === 'dark';
    const buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(btn => {
      if (isDark) {
        // Show Sun icon (clicking will switch to light)
        btn.innerHTML = `<i data-lucide="sun" class="w-4 h-4 sm:w-5 sm:h-5 text-amber-400"></i>`;
        btn.setAttribute('title', 'Ganti ke Tema Terang (☀️)');
        btn.setAttribute('aria-label', 'Ganti ke Tema Terang');
      } else {
        // Show Moon icon (clicking will switch to dark)
        btn.innerHTML = `<i data-lucide="moon" class="w-4 h-4 sm:w-5 sm:h-5 text-slate-600"></i>`;
        btn.setAttribute('title', 'Ganti ke Tema Gelap (🌙)');
        btn.setAttribute('aria-label', 'Ganti ke Tema Gelap');
      }
    });
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
};

window.ThemeManager = ThemeManager;

// DOM Elements Cache
const DOM = {};

document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  initDOM();
  initDatePresets();
  populateCategorySelects();
  populateAccountSelects();
  setupEventListeners();
  setupCurrencyInputs();

  // Initial Auth Check
  checkAuthState();
});

/**
 * Cache DOM elements
 */
function initDOM() {
  // Auth & View Containers
  DOM.loginSection = document.getElementById('loginSection');
  DOM.mainDashboard = document.getElementById('mainDashboard');
  DOM.navLoggedInActions = document.getElementById('navLoggedInActions');
  DOM.mobileBottomNav = document.getElementById('mobileBottomNav');
  DOM.loginForm = document.getElementById('loginForm');
  DOM.loginUsername = document.getElementById('loginUsername');
  DOM.loginPassword = document.getElementById('loginPassword');
  DOM.loginErrorAlert = document.getElementById('loginErrorAlert');
  DOM.loginErrorMessage = document.getElementById('loginErrorMessage');

  // User Profile
  DOM.navUserName = document.getElementById('navUserName');
  DOM.navUserHandle = document.getElementById('navUserHandle');
  DOM.navUserAvatar = document.getElementById('navUserAvatar');
  DOM.dashboardUserAvatar = document.getElementById('dashboardUserAvatar');
  DOM.dashboardGreeting = document.getElementById('dashboardGreeting');
  DOM.bottomNavUserAvatar = document.getElementById('bottomNavUserAvatar');
  DOM.profileModal = document.getElementById('profileModal');
  DOM.profileForm = document.getElementById('profileForm');
  DOM.profileBadgeName = document.getElementById('profileBadgeName');
  DOM.profileBadgeUsername = document.getElementById('profileBadgeUsername');
  DOM.profileBadgeAvatar = document.getElementById('profileBadgeAvatar');
  DOM.selectedAvatarLabel = document.getElementById('selectedAvatarLabel');
  DOM.avatarTemplateGrid = document.getElementById('avatarTemplateGrid');
  DOM.editProfileName = document.getElementById('editProfileName');
  DOM.editUsername = document.getElementById('editUsername');
  DOM.editCurrentPassword = document.getElementById('editCurrentPassword');
  DOM.editNewPassword = document.getElementById('editNewPassword');

  // Dashboard Metrics
  DOM.totalIncome = document.getElementById('totalIncome');
  DOM.totalExpense = document.getElementById('totalExpense');
  DOM.netBalance = document.getElementById('netBalance');
  DOM.expenseRatio = document.getElementById('expenseRatio');
  DOM.transactionCount = document.getElementById('transactionCount');

  // Table & Cards
  DOM.txTableBody = document.getElementById('txTableBody');
  DOM.txMobileContainer = document.getElementById('txMobileContainer');
  DOM.txEmptyState = document.getElementById('txEmptyState');

  // Filters
  DOM.periodSelect = document.getElementById('periodSelect');
  DOM.customDateRange = document.getElementById('customDateRange');
  DOM.startDateInput = document.getElementById('startDateInput');
  DOM.endDateInput = document.getElementById('endDateInput');

  DOM.typeFilterBtns = document.querySelectorAll('.type-filter-btn');
  DOM.categoryFilterSelect = document.getElementById('categoryFilterSelect');
  DOM.searchInput = document.getElementById('searchInput');

  // Transaction Modal
  DOM.txModal = document.getElementById('txModal');
  DOM.modalTitle = document.getElementById('modalTitle');
  DOM.txForm = document.getElementById('txForm');
  DOM.tabIncome = document.getElementById('tabIncome');
  DOM.tabExpense = document.getElementById('tabExpense');
  DOM.txIdInput = document.getElementById('txIdInput');
  DOM.txDateInput = document.getElementById('txDateInput');
  DOM.txAmountInput = document.getElementById('txAmountInput');
  DOM.txCategorySelect = document.getElementById('txCategorySelect');
  DOM.txAccountSelect = document.getElementById('txAccountSelect');
  DOM.txNoteInput = document.getElementById('txNoteInput');

  DOM.toastContainer = document.getElementById('toastContainer');
}

/**
 * Check Authentication State
 */
function checkAuthState() {
  const currentUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;

  if (currentUser) {
    // User is logged in
    if (DOM.loginSection) DOM.loginSection.classList.add('hidden');
    if (DOM.mainDashboard) DOM.mainDashboard.classList.remove('hidden');
    if (DOM.navLoggedInActions) {
      DOM.navLoggedInActions.classList.remove('hidden');
      DOM.navLoggedInActions.classList.add('flex');
    }
    if (DOM.mobileBottomNav) {
      DOM.mobileBottomNav.classList.remove('hidden');
      DOM.mobileBottomNav.classList.add('flex');
    }

    // Update User Avatar & Name in Navbar
    updateNavbarUser(currentUser);

    // Refresh Dashboard Data
    refreshView();

    // Background sync from Cloud Firestore if available
    if (typeof StorageManager !== 'undefined' && typeof StorageManager.syncFromCloud === 'function') {
      StorageManager.syncFromCloud().catch(() => {});
    }
  } else {
    // User is NOT logged in
    if (DOM.loginSection) DOM.loginSection.classList.remove('hidden');
    if (DOM.mainDashboard) DOM.mainDashboard.classList.add('hidden');
    if (DOM.navLoggedInActions) {
      DOM.navLoggedInActions.classList.add('hidden');
      DOM.navLoggedInActions.classList.remove('flex');
    }
    if (DOM.mobileBottomNav) {
      DOM.mobileBottomNav.classList.add('hidden');
      DOM.mobileBottomNav.classList.remove('flex');
    }
  }

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

let activeModalAvatar = 'logo_sultan';

/**
 * Render Avatar Badge Element
 */
function renderUserAvatar(el, userOrAvatarId, size = 'sm') {
  if (!el) return;
  const avatarId = typeof userOrAvatarId === 'string' 
    ? userOrAvatarId 
    : (userOrAvatarId && userOrAvatarId.avatar ? userOrAvatarId.avatar : 'logo_sultan');
  
  const tpl = typeof AuthManager !== 'undefined' && AuthManager.getAvatarTemplate 
    ? AuthManager.getAvatarTemplate(avatarId) 
    : { icon: 'crown', bg: 'from-amber-500 to-yellow-400', text: 'text-amber-950' };

  let sizeClass = 'w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs';
  let iconSize = 'w-4 h-4';

  if (size === 'xs') {
    sizeClass = 'w-5 h-5 rounded-md text-[10px]';
    iconSize = 'w-3.5 h-3.5';
  } else if (size === 'md') {
    sizeClass = 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl text-sm shadow-md';
    iconSize = 'w-6 h-6';
  } else if (size === 'lg') {
    sizeClass = 'w-12 h-12 rounded-2xl text-base shadow-md';
    iconSize = 'w-6 h-6';
  }

  el.className = `${sizeClass} bg-gradient-to-tr ${tpl.bg} ${tpl.text} flex items-center justify-center font-bold shadow-xs shrink-0 transition-transform active:scale-95`;
  el.innerHTML = `<i data-lucide="${tpl.icon}" class="${iconSize}"></i>`;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Update User Avatar & Name in Navbar, Greeting Banner, and Mobile Bar
 */
function updateNavbarUser(user) {
  if (!user) return;
  const displayName = user.name || user.username || 'Akun Saya';
  
  if (DOM.navUserName) {
    DOM.navUserName.textContent = displayName;
  }
  if (DOM.navUserHandle) {
    DOM.navUserHandle.textContent = `@${user.username}`;
  }
  if (DOM.navUserAvatar) {
    renderUserAvatar(DOM.navUserAvatar, user, 'sm');
  }
  if (DOM.bottomNavUserAvatar) {
    renderUserAvatar(DOM.bottomNavUserAvatar, user, 'xs');
  }
  if (DOM.dashboardGreeting) {
    DOM.dashboardGreeting.textContent = `Halo, ${displayName}! 👋`;
  }
  if (DOM.dashboardUserAvatar) {
    renderUserAvatar(DOM.dashboardUserAvatar, user, 'md');
  }
}

/**
 * Render 16 Avatar Templates Grid in Profile Modal
 */
function renderAvatarTemplateGrid(selectedId) {
  if (!DOM.avatarTemplateGrid || typeof AuthManager === 'undefined') return;
  DOM.avatarTemplateGrid.innerHTML = '';

  const templates = AuthManager.AVATAR_TEMPLATES || [];
  templates.forEach(tpl => {
    const isSelected = tpl.id === selectedId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `relative flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
      isSelected 
        ? 'bg-amber-100/90 dark:bg-amber-950/80 ring-2 ring-amber-500 scale-105 shadow-sm' 
        : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800/80'
    }`;
    btn.onclick = () => selectModalAvatar(tpl.id);

    btn.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr ${tpl.bg} ${tpl.text} flex items-center justify-center shadow-xs mb-1">
        <i data-lucide="${tpl.icon}" class="w-4 h-4"></i>
      </div>
      <span class="text-[9px] font-semibold text-slate-700 dark:text-slate-300 truncate w-full text-center leading-tight">${tpl.name}</span>
      ${isSelected ? `<div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] shadow-sm"><i data-lucide="check" class="w-2.5 h-2.5"></i></div>` : ''}
    `;

    DOM.avatarTemplateGrid.appendChild(btn);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Handle Template Logo Selection in Modal
 */
function selectModalAvatar(avatarId) {
  activeModalAvatar = avatarId;
  const tpl = AuthManager.getAvatarTemplate(avatarId);
  if (DOM.selectedAvatarLabel) {
    DOM.selectedAvatarLabel.textContent = tpl.name;
  }
  if (DOM.profileBadgeAvatar) {
    renderUserAvatar(DOM.profileBadgeAvatar, avatarId, 'lg');
  }
  renderAvatarTemplateGrid(avatarId);
}
window.selectModalAvatar = selectModalAvatar;

/**
 * Toggle Password Input Visibility
 */
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    if (icon) icon.setAttribute('data-lucide', 'eye');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Profile Modal: Open & Populate
 */
function openProfileModal() {
  const currentUser = AuthManager.getCurrentUser();
  if (!currentUser) return;

  activeModalAvatar = currentUser.avatar || 'logo_sultan';
  const displayName = currentUser.name || currentUser.username;

  if (DOM.profileBadgeName) DOM.profileBadgeName.textContent = displayName;
  if (DOM.profileBadgeUsername) DOM.profileBadgeUsername.textContent = currentUser.username;
  if (DOM.profileBadgeAvatar) renderUserAvatar(DOM.profileBadgeAvatar, activeModalAvatar, 'lg');

  if (DOM.editProfileName) DOM.editProfileName.value = currentUser.name || '';
  if (DOM.editUsername) DOM.editUsername.value = currentUser.username;
  if (DOM.editCurrentPassword) DOM.editCurrentPassword.value = '';
  if (DOM.editNewPassword) DOM.editNewPassword.value = '';

  const tpl = AuthManager.getAvatarTemplate(activeModalAvatar);
  if (DOM.selectedAvatarLabel) DOM.selectedAvatarLabel.textContent = tpl.name;

  renderAvatarTemplateGrid(activeModalAvatar);

  if (DOM.profileModal) DOM.profileModal.classList.remove('modal-hidden');
  if (DOM.editProfileName) DOM.editProfileName.focus();

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Logout Trigger
 */
function triggerLogout() {
  if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
    closeModal('profileModal');
    AuthManager.logout();
    checkAuthState();
    showToast('Anda telah keluar dari akun.', 'info');
  }
}

/**
 * Initialize default date fields
 */
function initDatePresets() {
  const today = getTodayString();
  if (DOM.txDateInput) DOM.txDateInput.value = today;

  // Default custom date range: Start of this month to today
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const firstDay = `${yyyy}-${mm}-01`;

  if (DOM.startDateInput) DOM.startDateInput.value = firstDay;
  if (DOM.endDateInput) DOM.endDateInput.value = today;

  AppState.startDate = firstDay;
  AppState.endDate = today;
}

/**
 * Populate Category Dropdowns
 */
function populateCategorySelects(targetType = 'income') {
  const select = DOM.txCategorySelect;
  if (!select) return;

  const categories = DEFAULT_CATEGORIES[targetType] || [];
  select.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

  // Update Category Filter dropdown
  updateCategoryFilterDropdown();
}

/**
 * Update Category Filter dropdown based on current data
 */
function updateCategoryFilterDropdown() {
  const filterSelect = DOM.categoryFilterSelect;
  if (!filterSelect) return;

  const allTx = StorageManager.getAll();
  const uniqueCats = new Set();
  allTx.forEach(t => {
    if (t.category) uniqueCats.add(t.category);
  });

  let options = '<option value="all">Semua Kategori</option>';
  uniqueCats.forEach(cat => {
    options += `<option value="${cat}">${cat}</option>`;
  });
  filterSelect.innerHTML = options;
  filterSelect.value = AppState.categoryFilter;
}

/**
 * Populate Account Dropdowns
 */
function populateAccountSelects() {
  const select = DOM.txAccountSelect;
  if (!select) return;
  select.innerHTML = DEFAULT_ACCOUNTS.map(acc => `<option value="${acc}">${acc}</option>`).join('');
}

/**
 * Event Listeners Setup
 */
function setupEventListeners() {
  // Login Form Submit (Clean and secure login)
  if (DOM.loginForm) {
    DOM.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = DOM.loginUsername.value;
      const p = DOM.loginPassword.value;
      const res = AuthManager.login(u, p);

      if (res.success) {
        if (DOM.loginErrorAlert) DOM.loginErrorAlert.classList.add('hidden');
        DOM.loginForm.reset();
        checkAuthState();
        showToast(`Selamat datang kembali, ${res.user.username}!`, 'success');
      } else {
        if (DOM.loginErrorAlert) {
          DOM.loginErrorAlert.classList.remove('hidden');
          DOM.loginErrorMessage.textContent = res.message;
        }
      }
    });
  }

  // Profile Form Submit (Update Profile Name, Avatar & Credentials)
  if (DOM.profileForm) {
    DOM.profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentUser = AuthManager.getCurrentUser();
      if (!currentUser) return;

      const newName = DOM.editProfileName ? DOM.editProfileName.value.trim() : '';
      const newAvatar = activeModalAvatar;
      const newUsername = DOM.editUsername ? DOM.editUsername.value.trim() : '';
      const currentPassword = DOM.editCurrentPassword ? DOM.editCurrentPassword.value : '';
      const newPassword = DOM.editNewPassword ? DOM.editNewPassword.value.trim() : '';

      const result = AuthManager.updateProfile(currentUser.id, {
        newName,
        newAvatar,
        newUsername,
        newPassword,
        currentPassword
      });

      if (result.success) {
        showToast(result.message, 'success');
        updateNavbarUser(result.user);
        closeModal('profileModal');
      } else {
        showToast(result.message, 'error');
      }
    });
  }

  // Period filter change
  if (DOM.periodSelect) {
    DOM.periodSelect.addEventListener('change', (e) => {
      AppState.period = e.target.value;
      if (AppState.period === 'custom') {
        DOM.customDateRange.classList.remove('hidden');
        DOM.customDateRange.classList.add('flex');
      } else {
        DOM.customDateRange.classList.add('hidden');
        DOM.customDateRange.classList.remove('flex');
      }
      refreshView();
    });
  }

  // Custom date inputs
  if (DOM.startDateInput) {
    DOM.startDateInput.addEventListener('change', (e) => {
      AppState.startDate = e.target.value;
      refreshView();
    });
  }
  if (DOM.endDateInput) {
    DOM.endDateInput.addEventListener('change', (e) => {
      AppState.endDate = e.target.value;
      refreshView();
    });
  }

  // Type filter buttons (Semua, Pemasukan, Pengeluaran)
  DOM.typeFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.typeFilterBtns.forEach(b => {
        b.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
        b.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-50');
      });
      btn.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
      btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-50');

      AppState.typeFilter = btn.dataset.type;
      refreshView();
    });
  });

  // Category filter
  if (DOM.categoryFilterSelect) {
    DOM.categoryFilterSelect.addEventListener('change', (e) => {
      AppState.categoryFilter = e.target.value;
      refreshView();
    });
  }

  // Search input
  if (DOM.searchInput) {
    DOM.searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value.toLowerCase().trim();
      refreshView();
    });
  }

  // Tab switch in Transaction Modal
  if (DOM.tabIncome) {
    DOM.tabIncome.addEventListener('click', () => setModalType('income'));
  }
  if (DOM.tabExpense) {
    DOM.tabExpense.addEventListener('click', () => setModalType('expense'));
  }

  // Transaction Form Submit
  if (DOM.txForm) {
    DOM.txForm.addEventListener('submit', handleTransactionSubmit);
  }

  // Listen to data change events
  window.addEventListener('rekap:dataChanged', () => {
    refreshView();
    updateCategoryFilterDropdown();
  });
}

/**
 * Format input nominal with thousands separator while typing
 */
function setupCurrencyInputs() {
  if (!DOM.txAmountInput) return;

  DOM.txAmountInput.addEventListener('input', (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      e.target.value = '';
      return;
    }
    const num = parseInt(raw, 10);
    e.target.value = num.toLocaleString('id-ID');
  });
}

/**
 * Filter transactions based on active state
 */
function getFilteredTransactions() {
  const all = StorageManager.getAll();
  const now = new Date();
  const todayStr = getTodayString();

  return all.filter(t => {
    // 1. Filter by Type
    if (AppState.typeFilter !== 'all' && t.type !== AppState.typeFilter) {
      return false;
    }

    // 2. Filter by Category
    if (AppState.categoryFilter !== 'all' && t.category !== AppState.categoryFilter) {
      return false;
    }

    // 3. Filter by Search Query
    if (AppState.searchQuery) {
      const q = AppState.searchQuery;
      const matchNote = (t.note || '').toLowerCase().includes(q);
      const matchCategory = (t.category || '').toLowerCase().includes(q);
      const matchAccount = (t.account || '').toLowerCase().includes(q);
      const matchAmount = t.amount.toString().includes(q);
      if (!matchNote && !matchCategory && !matchAccount && !matchAmount) {
        return false;
      }
    }

    // 4. Filter by Period
    const tDate = t.date;
    if (AppState.period === 'today') {
      return tDate === todayStr;
    } else if (AppState.period === 'last-7-days') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 7);
      const past7Str = past7.toISOString().split('T')[0];
      return tDate >= past7Str && tDate <= todayStr;
    } else if (AppState.period === 'this-month') {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const startOfMonth = `${yyyy}-${mm}-01`;
      return tDate >= startOfMonth;
    } else if (AppState.period === 'custom') {
      if (AppState.startDate && tDate < AppState.startDate) return false;
      if (AppState.endDate && tDate > AppState.endDate) return false;
      return true;
    }

    return true; // 'all'
  });
}

/**
 * Refresh full UI: Metrics, Charts, Table & Mobile Cards
 */
function refreshView() {
  const currentUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
  if (!currentUser) return;

  const filtered = getFilteredTransactions();

  updateMetrics(filtered);
  renderTable(filtered);
  renderMobileCards(filtered);

  if (typeof updateAllCharts === 'function') {
    updateAllCharts(filtered);
  }

  // Re-initialize Lucide icons if available
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

/**
 * Update Top Metric Cards
 */
function updateMetrics(transactions) {
  let income = 0;
  let expense = 0;

  transactions.forEach(t => {
    if (t.type === 'income') {
      income += t.amount;
    } else {
      expense += t.amount;
    }
  });

  const net = income - expense;
  const ratio = income > 0 ? ((expense / income) * 100).toFixed(1) : (expense > 0 ? 100 : 0);

  if (DOM.totalIncome) DOM.totalIncome.textContent = formatRupiah(income);
  if (DOM.totalExpense) DOM.totalExpense.textContent = formatRupiah(expense);
  
  if (DOM.netBalance) {
    DOM.netBalance.textContent = (net < 0 ? '- ' : '') + formatRupiah(Math.abs(net));
    if (net >= 0) {
      DOM.netBalance.className = 'text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate';
    } else {
      DOM.netBalance.className = 'text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 truncate';
    }
  }

  if (DOM.expenseRatio) {
    DOM.expenseRatio.textContent = `${ratio}% dari pemasukan`;
  }

  if (DOM.transactionCount) {
    DOM.transactionCount.textContent = `${transactions.length} Transaksi`;
  }
}

/**
 * Render Desktop Transaction Table
 */
function renderTable(transactions) {
  if (!DOM.txTableBody) return;

  if (transactions.length === 0) {
    DOM.txTableBody.innerHTML = '';
    if (DOM.txEmptyState) DOM.txEmptyState.classList.remove('hidden');
    return;
  }

  if (DOM.txEmptyState) DOM.txEmptyState.classList.add('hidden');

  // Sort descending by date, then createdAt
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) {
      return new Date(b.date) - new Date(a.date);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  DOM.txTableBody.innerHTML = sorted.map(tx => {
    const isIncome = tx.type === 'income';
    const amountClass = isIncome ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold';
    const sign = isIncome ? '+ ' : '- ';
    const typeBadge = isIncome
      ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">Pemasukan</span>`
      : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">Pengeluaran</span>`;

    return `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-100 dark:border-slate-800">
        <td class="px-5 py-3.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
          <div class="font-medium text-slate-800 dark:text-slate-100">${formatDateIndo(tx.date)}</div>
          <div class="text-xs text-slate-400">${tx.date}</div>
        </td>
        <td class="px-5 py-3.5 whitespace-nowrap text-sm">
          ${typeBadge}
        </td>
        <td class="px-5 py-3.5 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
          <div class="font-medium">${tx.category || '-'}</div>
          <div class="text-xs text-slate-400">${tx.account || 'Tunai'}</div>
        </td>
        <td class="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
          ${tx.note ? tx.note : '<span class="text-slate-400 italic">Tanpa catatan</span>'}
        </td>
        <td class="px-5 py-3.5 whitespace-nowrap text-sm text-right ${amountClass}">
          ${sign}${formatRupiah(tx.amount)}
        </td>
        <td class="px-5 py-3.5 whitespace-nowrap text-right text-sm font-medium">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="editTransaction('${tx.id}')" class="text-slate-500 dark:text-slate-400 hover:text-amber-600 p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors" title="Edit Transaksi">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteTransaction('${tx.id}')" class="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors" title="Hapus Transaksi">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Mobile Transaction Cards (Optimized for Android Screens)
 */
function renderMobileCards(transactions) {
  if (!DOM.txMobileContainer) return;

  if (transactions.length === 0) {
    DOM.txMobileContainer.innerHTML = '';
    return;
  }

  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) {
      return new Date(b.date) - new Date(a.date);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  DOM.txMobileContainer.innerHTML = sorted.map(tx => {
    const isIncome = tx.type === 'income';
    const amountColor = isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
    const sign = isIncome ? '+ ' : '- ';
    const iconName = isIncome ? 'arrow-down-left' : 'arrow-up-right';
    const iconBg = isIncome ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300';

    return `
      <div class="p-3.5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-xs flex flex-col gap-2">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0">
              <i data-lucide="${iconName}" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">${tx.category || '-'}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">${formatDateIndo(tx.date)} &bull; ${tx.account || 'Tunai'}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold text-sm sm:text-base ${amountColor}">${sign}${formatRupiah(tx.amount)}</div>
          </div>
        </div>

        ${tx.note ? `<div class="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">${tx.note}</div>` : ''}

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <button onclick="editTransaction('${tx.id}')" class="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg flex items-center gap-1 transition-colors">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit
          </button>
          <button onclick="deleteTransaction('${tx.id}')" class="px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 rounded-lg flex items-center gap-1 transition-colors">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Set Modal Type (Income vs Expense)
 */
function setModalType(type) {
  AppState.activeModalType = type;

  if (type === 'income') {
    DOM.tabIncome.className = 'flex-1 py-2 text-center text-xs sm:text-sm font-semibold rounded-lg bg-emerald-500 text-white shadow-sm transition-all flex items-center justify-center gap-1.5';
    DOM.tabExpense.className = 'flex-1 py-2 text-center text-xs sm:text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5';
    DOM.modalTitle.textContent = AppState.editingId ? 'Edit Pemasukan' : 'Catat Pemasukan Baru';
  } else {
    DOM.tabExpense.className = 'flex-1 py-2 text-center text-xs sm:text-sm font-semibold rounded-lg bg-rose-500 text-white shadow-sm transition-all flex items-center justify-center gap-1.5';
    DOM.tabIncome.className = 'flex-1 py-2 text-center text-xs sm:text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5';
    DOM.modalTitle.textContent = AppState.editingId ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru';
  }

  populateCategorySelects(type);
}

/**
 * Open Modal for Adding Transaction
 */
function openAddModal(type = 'income') {
  AppState.editingId = null;
  DOM.txForm.reset();
  DOM.txIdInput.value = '';
  DOM.txDateInput.value = getTodayString();
  setModalType(type);

  DOM.txModal.classList.remove('modal-hidden');
  DOM.txAmountInput.focus();
}

/**
 * Edit Transaction
 */
function editTransaction(id) {
  const all = StorageManager.getAll();
  const tx = all.find(t => t.id === id);
  if (!tx) return;

  AppState.editingId = id;
  DOM.txIdInput.value = tx.id;
  setModalType(tx.type);

  DOM.txDateInput.value = tx.date;
  DOM.txAmountInput.value = tx.amount.toLocaleString('id-ID');
  DOM.txCategorySelect.value = tx.category;
  DOM.txAccountSelect.value = tx.account || DEFAULT_ACCOUNTS[0];
  DOM.txNoteInput.value = tx.note || '';

  DOM.txModal.classList.remove('modal-hidden');
  DOM.txAmountInput.focus();
}

/**
 * Close Modal
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('modal-hidden');
  }
}

/**
 * Handle Form Submit
 */
function handleTransactionSubmit(e) {
  e.preventDefault();

  const amount = parseRupiah(DOM.txAmountInput.value);
  if (!amount || amount <= 0) {
    showToast('Silakan masukkan nominal transaksi yang valid', 'error');
    DOM.txAmountInput.focus();
    return;
  }

  const txData = {
    type: AppState.activeModalType,
    date: DOM.txDateInput.value || getTodayString(),
    amount: amount,
    category: DOM.txCategorySelect.value,
    account: DOM.txAccountSelect.value,
    note: DOM.txNoteInput.value
  };

  if (AppState.editingId) {
    // Update existing
    StorageManager.update(AppState.editingId, txData);
    showToast('Transaksi berhasil diperbarui!', 'success');
  } else {
    // Add new
    StorageManager.add(txData);
    showToast('Transaksi berhasil dicatat!', 'success');
  }

  closeModal('txModal');
  refreshView();
}

/**
 * Delete Transaction
 */
function deleteTransaction(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini?')) {
    return;
  }

  StorageManager.delete(id);
  showToast('Catatan transaksi telah dihapus.', 'info');
  refreshView();
}

/**
 * Quick Add Prompt for Bottom Navigation FAB
 */
function openQuickAddPrompt() {
  openAddModal('expense'); // Default to expense as it is most common in mobile
}

/**
 * Floating Toast Message
 */
function showToast(message, type = 'info') {
  if (!DOM.toastContainer) return;

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-slate-800 dark:bg-slate-700 text-white'
  };

  const icons = {
    success: 'check-circle',
    error: 'alert-circle',
    info: 'info'
  };

  toast.className = `flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i>
    <span>${message}</span>
  `;

  DOM.toastContainer.appendChild(toast);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  // Auto dismiss
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3200);
}

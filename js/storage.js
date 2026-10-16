/**
 * storage.js - Data Layer for My Money
 * Handles LocalStorage operations scoped per user account.
 */

// Helper to get storage key scoped to current logged-in user
function getUserStorageKey() {
  const user = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
  return user ? `my_money_transactions_${user.id}` : 'my_money_transactions_guest';
}

// Daftar Kategori Default
const DEFAULT_CATEGORIES = {
  income: [
    'Gaji Pokok',
    'Bisnis / Penjualan',
    'Pekerjaan Sampingan',
    'Bonus & Insentif',
    'Investasi & Dividen',
    'Hadiah & Hibah',
    'Pengembalian Dana (Refund)',
    'Lain-lain'
  ],
  expense: [
    'Makanan & Minuman',
    'Transportasi & Bensin',
    'Belanja Kebutuhan',
    'Tempat Tinggal / Kos',
    'Tagihan (Listrik, Air, Wifi)',
    'Hiburan & Langganan',
    'Kesehatan & Medis',
    'Pendidikan & Kursus',
    'Donasi & Sedekah',
    'Cicilan & Hutang',
    'Lain-lain'
  ]
};

// Daftar Akun / Metode Pembayaran Default
const DEFAULT_ACCOUNTS = [
  'Tunai (Cash)',
  'Transfer Bank (BCA/Mandiri/BRI)',
  'E-Wallet (GoPay/OVO/ShopeePay/DANA)',
  'Kartu Kredit / Debit',
  'Lainnya'
];

// Helper: Format number to Rupiah string
function formatRupiah(amount, withPrefix = true) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('id-ID', {
    maximumFractionDigits: 0
  });
  return withPrefix ? `Rp ${formatted}` : formatted;
}

// Helper: Parse Rupiah string to clean number
function parseRupiah(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const cleaned = str.toString().replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}

// Helper: Format YYYY-MM-DD to Indonesian human date
function formatDateIndo(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
}

// Helper: Get today date in YYYY-MM-DD format
function getTodayString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Generate Realistic Sample Data for testing
function generateSampleData() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const padDay = (d) => String(d).padStart(2, '0');

  return [
    {
      id: 'tx_sample_1',
      type: 'income',
      date: `${yyyy}-${mm}-${padDay(1)}`,
      amount: 6500000,
      category: 'Gaji Pokok',
      account: 'Transfer Bank (BCA/Mandiri/BRI)',
      note: 'Gaji Bulanan',
      createdAt: Date.now() - 86400000 * 5
    },
    {
      id: 'tx_sample_2',
      type: 'expense',
      date: `${yyyy}-${mm}-${padDay(2)}`,
      amount: 1200000,
      category: 'Tempat Tinggal / Kos',
      account: 'Transfer Bank (BCA/Mandiri/BRI)',
      note: 'Sewa Kos Bulanan',
      createdAt: Date.now() - 86400000 * 4
    },
    {
      id: 'tx_sample_3',
      type: 'expense',
      date: `${yyyy}-${mm}-${padDay(2)}`,
      amount: 350000,
      category: 'Tagihan (Listrik, Air, Wifi)',
      account: 'E-Wallet (GoPay/OVO/ShopeePay/DANA)',
      note: 'Token Listrik & Internet',
      createdAt: Date.now() - 86400000 * 4
    },
    {
      id: 'tx_sample_4',
      type: 'expense',
      date: `${yyyy}-${mm}-${padDay(3)}`,
      amount: 185000,
      category: 'Makanan & Minuman',
      account: 'Tunai (Cash)',
      note: 'Makan siang & belanja bahan harian',
      createdAt: Date.now() - 86400000 * 3
    },
    {
      id: 'tx_sample_5',
      type: 'income',
      date: `${yyyy}-${mm}-${padDay(4)}`,
      amount: 850000,
      category: 'Pekerjaan Sampingan',
      account: 'Transfer Bank (BCA/Mandiri/BRI)',
      note: 'Jasa Desain Proyek Lepas',
      createdAt: Date.now() - 86400000 * 2
    },
    {
      id: 'tx_sample_6',
      type: 'expense',
      date: `${yyyy}-${mm}-${padDay(4)}`,
      amount: 90000,
      category: 'Transportasi & Bensin',
      account: 'Tunai (Cash)',
      note: 'Bensin kendaraan & Parkir',
      createdAt: Date.now() - 86400000 * 2
    },
    {
      id: 'tx_sample_7',
      type: 'expense',
      date: `${yyyy}-${mm}-${padDay(Math.min(now.getDate(), 28))}`,
      amount: 220000,
      category: 'Belanja Kebutuhan',
      account: 'E-Wallet (GoPay/OVO/ShopeePay/DANA)',
      note: 'Belanja perlengkapan bulanan',
      createdAt: Date.now() - 86400000
    }
  ];
}

// Storage Manager
const StorageManager = {
  // Fetch all transactions from storage for active user
  getAll() {
    try {
      const key = getUserStorageKey();
      const stored = localStorage.getItem(key);
      if (!stored) {
        // Seed initial sample for user_1
        const user = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
        if (user && user.id === 'user_1') {
          const initial = generateSampleData();
          this.saveAll(initial);
          return initial;
        }
        return [];
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error('Gagal memuat transaksi dari penyimpanan lokal', e);
      return [];
    }
  },

  // Save full array to storage for active user
  saveAll(transactions) {
    try {
      const key = getUserStorageKey();
      localStorage.setItem(key, JSON.stringify(transactions));
      window.dispatchEvent(new CustomEvent('rekap:dataChanged', { detail: { transactions } }));
      return true;
    } catch (e) {
      console.error('Gagal menyimpan transaksi ke penyimpanan lokal', e);
      return false;
    }
  },

  // Add a single transaction
  add(txData) {
    const transactions = this.getAll();
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: txData.type, // 'income' or 'expense'
      date: txData.date || getTodayString(),
      amount: Number(txData.amount) || 0,
      category: txData.category || 'Lain-lain',
      account: txData.account || 'Tunai (Cash)',
      note: (txData.note || '').trim(),
      createdAt: Date.now()
    };
    transactions.unshift(newTx);
    this.saveAll(transactions);

    // Sync to Cloud Firestore asynchronously
    const user = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
    if (user && typeof FirebaseCloud !== 'undefined') {
      FirebaseCloud.saveTransaction(user.id, newTx);
    }

    return newTx;
  },

  // Update transaction by ID
  update(id, updatedFields) {
    const transactions = this.getAll();
    const idx = transactions.findIndex(t => t.id === id);
    if (idx === -1) return null;

    transactions[idx] = {
      ...transactions[idx],
      ...updatedFields,
      amount: Number(updatedFields.amount !== undefined ? updatedFields.amount : transactions[idx].amount),
      updatedAt: Date.now()
    };

    this.saveAll(transactions);

    // Sync to Cloud Firestore asynchronously
    const user = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
    if (user && typeof FirebaseCloud !== 'undefined') {
      FirebaseCloud.saveTransaction(user.id, transactions[idx]);
    }

    return transactions[idx];
  },

  // Delete transaction by ID
  delete(id) {
    const transactions = this.getAll();
    const filtered = transactions.filter(t => t.id !== id);
    this.saveAll(filtered);

    // Sync to Cloud Firestore asynchronously
    const user = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
    if (user && typeof FirebaseCloud !== 'undefined') {
      FirebaseCloud.deleteTransaction(user.id, id);
    }

    return filtered;
  },

  // Sinkronisasi dari Cloud Firestore
  async syncFromCloud() {
    const user = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
    if (!user || typeof FirebaseCloud === 'undefined') return;

    const cloudData = await FirebaseCloud.fetchTransactions(user.id);
    if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
      this.saveAll(cloudData);
    }
  }
};


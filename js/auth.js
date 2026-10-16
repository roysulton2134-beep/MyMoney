/**
 * auth.js - Authentication & Account Management for My Money
 * Manages 4 predefined user accounts, active sessions, and credential updates.
 */

const MY_MONEY_USERS_KEY = 'my_money_users_v1';
const MY_MONEY_SESSION_KEY = 'my_money_session_v1';

// 16 Template Logo Avatar Keren & Modern
const AVATAR_TEMPLATES = [
  { id: 'logo_sultan', name: 'Sultan Gold', icon: 'crown', bg: 'from-amber-500 to-yellow-400', text: 'text-amber-950', ring: 'ring-amber-500' },
  { id: 'logo_wallet', name: 'Smart Wallet', icon: 'wallet', bg: 'from-emerald-500 to-teal-400', text: 'text-emerald-950', ring: 'ring-emerald-500' },
  { id: 'logo_rocket', name: 'Roket Cuan', icon: 'rocket', bg: 'from-blue-600 to-indigo-500', text: 'text-white', ring: 'ring-blue-500' },
  { id: 'logo_diamond', name: 'Berlian Murni', icon: 'gem', bg: 'from-cyan-400 to-blue-500', text: 'text-white', ring: 'ring-cyan-500' },
  { id: 'logo_chart', name: 'Investor Pro', icon: 'trending-up', bg: 'from-violet-600 to-purple-400', text: 'text-white', ring: 'ring-purple-500' },
  { id: 'logo_badge', name: 'Piala Juara', icon: 'award', bg: 'from-yellow-400 to-amber-500', text: 'text-amber-950', ring: 'ring-yellow-500' },
  { id: 'logo_briefcase', name: 'Eksekutif', icon: 'briefcase', bg: 'from-slate-700 to-slate-900', text: 'text-white', ring: 'ring-slate-500' },
  { id: 'logo_shield', name: 'Dana Aman', icon: 'shield-check', bg: 'from-teal-500 to-emerald-600', text: 'text-white', ring: 'ring-teal-500' },
  { id: 'logo_target', name: 'Target Goals', icon: 'target', bg: 'from-rose-500 to-red-600', text: 'text-white', ring: 'ring-rose-500' },
  { id: 'logo_sparkles', name: 'Bintang Sukses', icon: 'sparkles', bg: 'from-orange-400 to-amber-500', text: 'text-white', ring: 'ring-orange-500' },
  { id: 'logo_piggy', name: 'Celengan', icon: 'piggy-bank', bg: 'from-pink-500 to-rose-400', text: 'text-white', ring: 'ring-pink-500' },
  { id: 'logo_coffee', name: 'Kopi Santai', icon: 'coffee', bg: 'from-amber-700 to-yellow-800', text: 'text-amber-100', ring: 'ring-amber-600' },
  { id: 'logo_zap', name: 'Kilat Finansial', icon: 'zap', bg: 'from-yellow-400 to-orange-500', text: 'text-amber-950', ring: 'ring-yellow-500' },
  { id: 'logo_landmark', name: 'Bankir', icon: 'landmark', bg: 'from-indigo-600 to-blue-700', text: 'text-white', ring: 'ring-indigo-500' },
  { id: 'logo_creditcard', name: 'Cashless Card', icon: 'credit-card', bg: 'from-fuchsia-600 to-pink-500', text: 'text-white', ring: 'ring-fuchsia-500' },
  { id: 'logo_flame', name: 'Semangat Cuan', icon: 'flame', bg: 'from-red-500 to-orange-500', text: 'text-white', ring: 'ring-red-500' }
];

// Helper untuk mengambil detail template logo
function getAvatarTemplate(avatarId) {
  return AVATAR_TEMPLATES.find(t => t.id === avatarId) || AVATAR_TEMPLATES[0];
}

// 4 Akun Bawaan Awal
const INITIAL_ACCOUNTS = [
  { id: 'user_1', name: 'Akun 1', username: 'aa', password: 'aa1', avatar: 'logo_sultan' },
  { id: 'user_2', name: 'Akun 2', username: 'ab', password: 'ab1', avatar: 'logo_wallet' },
  { id: 'user_3', name: 'Akun 3', username: 'ac', password: 'ac1', avatar: 'logo_rocket' },
  { id: 'user_4', name: 'Akun 4', username: 'ad', password: 'ad1', avatar: 'logo_diamond' }
];

const AuthManager = {
  AVATAR_TEMPLATES,
  getAvatarTemplate,

  // Inisialisasi daftar akun jika belum ada di localStorage
  init() {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(MY_MONEY_USERS_KEY);
      if (!stored) {
        localStorage.setItem(MY_MONEY_USERS_KEY, JSON.stringify(INITIAL_ACCOUNTS));
      }
    } catch (e) {
      console.error('Gagal menginisialisasi akun pengguna', e);
    }
    // Sinkronisasi akun lintas perangkat melalui Cloud Firestore
    this.syncUsersWithCloud().catch(() => {});
  },

  // Sinkronisasi kredensial akun dari dan ke Firestore
  async syncUsersWithCloud() {
    if (typeof FirebaseCloud === 'undefined') return;
    try {
      const cloudUsers = await FirebaseCloud.fetchUsers();
      if (cloudUsers && cloudUsers.length > 0) {
        const localUsers = this.getUsers();
        const merged = localUsers.map(lu => {
          const cu = cloudUsers.find(c => c.id === lu.id);
          if (cu) {
            return (cu.updatedAt || 0) >= (lu.updatedAt || 0) ? { ...lu, ...cu } : lu;
          }
          return lu;
        });
        localStorage.setItem(MY_MONEY_USERS_KEY, JSON.stringify(merged));
      } else {
        const currentUsers = this.getUsers();
        for (const u of currentUsers) {
          await FirebaseCloud.saveUser(u);
        }
      }
    } catch (e) {
      console.warn('Gagal sinkron akun dengan Cloud:', e);
    }
  },

  // Mengambil semua akun
  getUsers() {
    this.init();
    try {
      if (typeof localStorage === 'undefined') return [...INITIAL_ACCOUNTS];
      const data = localStorage.getItem(MY_MONEY_USERS_KEY);
      const list = data ? JSON.parse(data) : [...INITIAL_ACCOUNTS];
      return list.map((u, i) => {
        const defaultAvatar = INITIAL_ACCOUNTS[i] ? INITIAL_ACCOUNTS[i].avatar : 'logo_sultan';
        return {
          name: u.name || `Akun ${i + 1}`,
          avatar: u.avatar || defaultAvatar,
          ...u
        };
      });
    } catch (e) {
      return [...INITIAL_ACCOUNTS];
    }
  },

  // Menyimpan daftar akun
  saveUsers(users) {
    try {
      localStorage.setItem(MY_MONEY_USERS_KEY, JSON.stringify(users));
      return true;
    } catch (e) {
      console.error('Gagal menyimpan daftar pengguna', e);
      return false;
    }
  },

  // Mengambil data user yang sedang login
  getCurrentUser() {
    try {
      const session = localStorage.getItem(MY_MONEY_SESSION_KEY);
      if (!session) return null;
      const { userId } = JSON.parse(session);
      const users = this.getUsers();
      const freshUser = users.find(u => u.id === userId);
      return freshUser || null;
    } catch (e) {
      return null;
    }
  },

  // Login dengan username & password
  login(username, password) {
    const users = this.getUsers();
    const cleanUsername = (username || '').trim();

    // Verifikasi username dan password
    const user = users.find(u => u.username === cleanUsername && u.password === password);

    if (!user) {
      return {
        success: false,
        message: 'Username atau password salah! Pastikan data akun benar.'
      };
    }

    // Buat sesi aktif
    try {
      const sessionData = {
        userId: user.id,
        username: user.username,
        name: user.name || user.username,
        avatar: user.avatar || 'logo_sultan',
        loginTime: Date.now()
      };
      localStorage.setItem(MY_MONEY_SESSION_KEY, JSON.stringify(sessionData));
      window.dispatchEvent(new CustomEvent('auth:login', { detail: { user } }));
      return { success: true, user };
    } catch (e) {
      return { success: false, message: 'Gagal membuat sesi login di peramban.' };
    }
  },

  // Logout / Keluar
  logout() {
    try {
      localStorage.removeItem(MY_MONEY_SESSION_KEY);
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return true;
    } catch (e) {
      return false;
    }
  },

  // Perbarui Nama Profil, Avatar Logo Template, Username & Password
  updateProfile(userId, { newName, newAvatar, newUsername, newPassword, currentPassword }) {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return { success: false, message: 'Akun tidak ditemukan!' };
    }

    const targetUser = users[userIndex];
    const cleanNewUsername = (newUsername || '').trim();
    const isUsernameChanging = cleanNewUsername && cleanNewUsername !== targetUser.username;
    const isPasswordChanging = Boolean(newPassword && newPassword.trim().length > 0);

    // Jika username atau password diubah, wajib verifikasi password saat ini
    if (isUsernameChanging || isPasswordChanging) {
      if (!currentPassword || targetUser.password !== currentPassword) {
        return {
          success: false,
          message: 'Password saat ini salah! Diperlukan untuk verifikasi perubahan username atau kata sandi.'
        };
      }
    }

    // Validasi & terapkan username baru jika diganti
    if (isUsernameChanging) {
      const isUsernameTaken = users.some(u => u.id !== userId && u.username.toLowerCase() === cleanNewUsername.toLowerCase());
      if (isUsernameTaken) {
        return {
          success: false,
          message: `Username "${cleanNewUsername}" sudah digunakan oleh akun lain. Silakan pilih username lain!`
        };
      }
      targetUser.username = cleanNewUsername;
    }

    // Ganti password jika diisi
    if (isPasswordChanging) {
      targetUser.password = newPassword.trim();
    }

    // Ganti Nama Profil jika diisi
    if (newName && newName.trim()) {
      targetUser.name = newName.trim();
    }

    // Ganti Foto Profil Template jika dipilih
    if (newAvatar) {
      targetUser.avatar = newAvatar;
    }

    targetUser.updatedAt = Date.now();
    users[userIndex] = targetUser;

    // Simpan ke localStorage
    this.saveUsers(users);

    // Sinkronkan ke Firebase Cloud Firestore
    if (typeof FirebaseCloud !== 'undefined' && typeof FirebaseCloud.saveUser === 'function') {
      FirebaseCloud.saveUser(targetUser).catch(e => console.warn('Gagal sync user ke Cloud:', e));
    }

    // Perbarui sesi aktif
    const session = {
      userId: targetUser.id,
      username: targetUser.username,
      name: targetUser.name,
      avatar: targetUser.avatar,
      loginTime: Date.now()
    };
    localStorage.setItem(MY_MONEY_SESSION_KEY, JSON.stringify(session));

    window.dispatchEvent(new CustomEvent('auth:updated', { detail: { user: targetUser } }));

    return {
      success: true,
      user: targetUser,
      message: 'Profil akun (nama & foto profil template) berhasil diperbarui!'
    };
  },

  // Alias kompatibilitas
  updateCredentials(userId, params) {
    return this.updateProfile(userId, params);
  }
};

// Expose globally on window
if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}

// Inisialisasi saat script dimuat
AuthManager.init();


/**
 * firebase-config.js - Firebase Initialization & Cloud Firestore Sync for My Money
 */

const firebaseConfig = {
  apiKey: "AIzaSyB2p1UHloeKuiaz-By-zqntbkXS2YbTYTU",
  authDomain: "project3-edf0f.firebaseapp.com",
  projectId: "project3-edf0f",
  storageBucket: "project3-edf0f.firebasestorage.app",
  messagingSenderId: "1050253195191",
  appId: "1:1050253195191:web:8753b7f9df1d1c3ea6da32"
};

// Inisialisasi Firebase & Cloud Firestore
let firebaseDb = null;

if (typeof firebase !== 'undefined') {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    firebaseDb = firebase.firestore();
    window.firebaseDb = firebaseDb;
    console.log("Firebase Cloud Firestore berhasil diinisialisasi.");
  } catch (error) {
    console.warn("Inisialisasi Firebase:", error);
  }
}

// Helper Sinkronisasi Cloud Firestore
const FirebaseCloud = {
  getDb() {
    return window.firebaseDb || firebaseDb;
  },

  // Simpan / Perbarui transaksi ke Firestore di awan
  async saveTransaction(userId, tx) {
    const db = this.getDb();
    if (!db || !userId) return false;
    try {
      await db.collection("users").doc(userId).collection("transactions").doc(tx.id).set(tx);
      return true;
    } catch (e) {
      console.warn("Gagal menyinkronkan transaksi ke Firestore:", e);
      return false;
    }
  },

  // Hapus transaksi dari Firestore
  async deleteTransaction(userId, txId) {
    const db = this.getDb();
    if (!db || !userId) return false;
    try {
      await db.collection("users").doc(userId).collection("transactions").doc(txId).delete();
      return true;
    } catch (e) {
      console.warn("Gagal menghapus transaksi dari Firestore:", e);
      return false;
    }
  },

  // Ambil transaksi dari Firestore untuk sinkronisasi antar perangkat
  async fetchTransactions(userId) {
    const db = this.getDb();
    if (!db || !userId) return null;
    try {
      const snapshot = await db.collection("users").doc(userId).collection("transactions").get();
      if (snapshot.empty) return null;
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      return list;
    } catch (e) {
      console.warn("Gagal mengambil data dari Firestore:", e);
      return null;
    }
  },

  // Simpan / update kredensial akun pengguna ke Firestore
  async saveUser(user) {
    const db = this.getDb();
    if (!db || !user || !user.id) return false;
    try {
      await db.collection("system_accounts").doc(user.id).set({
        id: user.id,
        name: user.name || 'Akun Saya',
        username: user.username,
        password: user.password,
        avatar: user.avatar || 'logo_sultan',
        updatedAt: user.updatedAt || Date.now()
      }, { merge: true });
      return true;
    } catch (e) {
      console.warn("Gagal menyinkronkan akun ke Firestore:", e);
      return false;
    }
  },

  // Ambil semua akun pengguna dari Firestore untuk sinkronisasi kredensial lintas perangkat
  async fetchUsers() {
    const db = this.getDb();
    if (!db) return null;
    try {
      const snapshot = await db.collection("system_accounts").get();
      if (snapshot.empty) return null;
      const list = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.id && d.username && d.password) {
          list.push(d);
        }
      });
      return list.length > 0 ? list : null;
    } catch (e) {
      console.warn("Gagal mengambil data akun dari Firestore:", e);
      return null;
    }
  }
};

window.FirebaseCloud = FirebaseCloud;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig, FirebaseCloud };
}

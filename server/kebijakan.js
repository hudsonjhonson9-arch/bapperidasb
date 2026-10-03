// Kebijakan hak akses per route.
//
// Format: daftar aturan berurutan; aturan pertama yang cocok menang. Semua pola
// di-anchor penuh (^...$) supaya tidak ada prefix yang bocor, misalnya /api/berita
// tidak boleh ikut cocok untuk /api/berita/abc.
//
// Level akses:
//   PUBLIK  tanpa login
//   ADMIN   sudah login sebagai admin
//
// Route yang tidak terdaftar tetap butuh ADMIN, bukan dibuka bebas. Jadi route
// baru default-nya tertutup dan harus memilih levelnya di sini dengan sadar.

export const PUBLIK = 'publik';
export const ADMIN = 'admin';

const t = (m, lvl, pola) => ({ m, lvl, pola: new RegExp(`^${pola}$`) });

const ATURAN = [
  // ── Publik ──────────────────────────────────────────────────────────────
  t('GET', PUBLIK, '/api/health'),
  t('POST', PUBLIK, '/api/auth/login'),
  // Logout tetap publik: kalau cookie-nya sudah kedaluwarsa, klien harus tetap
  // bisa membersihkannya, bukan mendapat 401 dan menyimpan cookie basi.
  t('POST', PUBLIK, '/api/auth/logout'),
  // Satu request untuk seluruh data yang dirender halaman publik.
  t('GET', PUBLIK, '/api/init'),
  // Tautan file dokumen diberikan terpisah dari daftar. Tanpa ini, satu request
  // /api/init cukup untuk menarik semua URL dokumen tanpa pernah mengeklik apa pun.
  t('GET', PUBLIK, '/api/dokumen/[^/]+/file'),
  // Dua endpoint yang memang dimaksudkan untuk pengunjung publik, bukan admin:
  // form kontak dan portal Klinik Inovasi (kiriman OPD).
  t('POST', PUBLIK, '/api/kontak'),
  t('POST', PUBLIK, '/api/inovasi'),

  // ── Admin ───────────────────────────────────────────────────────────────
  // Semua handler lain (CRUD berita/dokumen/slider/program/metrics/inovasi,
  // daftar pesan, session check) otomatis tertangani oleh default di bawah.
];

export function kebutuhan(method, path) {
  // Express memakai non-strict routing secara bawaan, jadi /api/berita/ dan
  // /api/berita ditangani handler yang sama. Pola di tabel harus meniru itu,
  // kalau tidak garis miring akhir menjadi celah melewati aturan.
  const p = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  for (const a of ATURAN) {
    if (a.m && a.m !== method) continue;
    if (a.pola.test(p)) return a.lvl;
  }
  return ADMIN;
}
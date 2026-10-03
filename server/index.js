import express from 'express';
import cors    from 'cors';
import dotenv  from 'dotenv';
import pg      from 'pg';
import bcrypt  from 'bcryptjs';
import path    from 'path';
import fs      from 'fs';
import { fileURLToPath } from 'url';
import {
  NAMA_COOKIE, MASA_JAM,
  rahasia, buatToken, verifikasiToken, periksaKonfigurasiSession,
  bacaCookie, pasangCookie, lepasCookie, PANJANG_MINIMUM,
} from './session.js';
import { PUBLIK, ADMIN, kebutuhan } from './kebijakan.js';
import { kirim as kirimEmail, emailSiap } from './email.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app       = express();
const isProd    = process.env.NODE_ENV === 'production';

// CORS: default hanya menerima origin yang sama. Aplikasi disajikan dari server
// sendiri, jadi tidak butuh allow-list. Kalau ada integrator dari domain lain,
// sebutkan lewat CORS_ORIGIN (daftar origin dipisah koma). Jangan pakai '*'
// bersamaan dengan cookie session: itu membiarkan situs mana pun membaca respons
// API atas nama admin yang sedang login.
const ORIGIN_TERDAFTAR = (process.env.CORS_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ORIGIN_TERDAFTAR.includes(origin)),
  credentials: true,
}));

// Payload API hanya berisi metadata: file dikirim langsung dari browser ke Google
// Apps Script, tidak pernah lewat Express sebagai base64. Jadi 2 MB sudah jauh
// lebih dari cukup, bahkan untuk konten berita yang panjang.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// ── PostgreSQL ──────────────────────────────────────────────────────────────
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const queryDB = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

// ── Gerbang session ─────────────────────────────────────────────────────────
// Satu titik ini yang menegakkan hak akses semua /api. Level tiap rute diambil
// dari server/kebijakan.js, bukan dari UI.
//
// Keputusan lama yang dibongkar di sini: situs ini sebelumnya menganggap
// localStorage + PIN "2026" sebagai login, dan thumbnail data ditulis sebagai
// header X-App-Token yang hardcoded di frontend. Token itu bocor ke siapa pun yang
// membuka view-source, jadi siapa pun bisa menulis ke database tanpa login. Sekarang
// PIN hanya dicocokkan di server dan hasilnya cookie HttpOnly bertanda tangan.
app.use(async (req, res, next) => {
  const reqPath = req.originalUrl.split('?')[0];
  if (!reqPath.startsWith('/api')) return next();

  if (kebutuhan(req.method, reqPath) === PUBLIK) return next();

  // Tanpa rahasia yang sah, jangan menerima token apa pun: memverifikasi tanpa
  // kunci berarti menerima cookie buatan. Gagal tertutup lebih aman.
  const secret = rahasia();
  if (!secret)
    return res.status(500).json({
      error: `Session belum dikonfigurasi: SESSION_SECRET wajib diisi (minimal ${PANJANG_MINIMUM} karakter)`,
    });

  const muatan = verifikasiToken(bacaCookie(req), secret);
  if (!muatan)
    return res.status(401).json({ error: 'Sesi berakhir, silakan login kembali' });

  try {
    // Role dan status aktif dibaca ulang tiap request, bukan disimpan di token:
    // admin yang dinonaktifkan atau dicabut haknya langsung kehilangan akses tanpa
    // perlu menunggu token lamanya kedaluwarsa.
    const { rows } = await pool.query(
      `SELECT id, username, nama, role, aktif FROM bapperida_admin WHERE username = $1`,
      [muatan.sub]
    );
    const u = rows[0];
    if (!u) return res.status(401).json({ error: 'Akun tidak ditemukan' });
    if (!u.aktif)
      return res.status(403).json({ error: 'Akun Anda dinonaktifkan. Hubungi administrator.' });

    req.pengguna = { id: u.id, username: u.username, nama: u.nama || u.username, role: u.role };
    next();
  } catch (e) {
    console.error('Gerbang session error:', e.message);
    res.status(500).json({ error: 'Gagal memeriksa sesi' });
  }
});

// ── Static files (production) ───────────────────────────────────────────────
// Di production, Express serve hasil build React dari /dist
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
}

// ── Auto-migrasi: jalankan db/schema.sql saat boot ──────────────────────────
(async () => {
  const berkas = path.join(__dirname, '..', 'db', 'schema.sql');
  try {
    const sql = fs.readFileSync(berkas, 'utf8');
    await pool.query(sql);
    console.log('Skema database siap (db/schema.sql).');
  } catch (e) {
    console.error('Gagal menjalankan db/schema.sql:', e.message);
    console.error('Periksa DATABASE_URL, atau jalankan manual: psql "$DATABASE_URL" -f db/schema.sql');
  }
  await seedAdmin();
})();

// Akun admin pertama dibuat dari env hanya kalau tabel masih kosong. Setelah itu
// env diabaikan supaya mengganti ADMIN_PIN tidak diam-diam mengembalikan PIN lama
// pada akun yang sudah diganti lewat panel.
async function seedAdmin() {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const pin      = String(process.env.ADMIN_PIN || '');
  if (!username || !pin) {
    console.warn('ADMIN_USERNAME / ADMIN_PIN belum diisi; tidak ada akun admin yang di-seed.');
    return;
  }
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM bapperida_admin');
    if (rows[0].n > 0) return;
    if (pin.length < 6)
      console.warn(`ADMIN_PIN hanya ${pin.length} karakter. Untuk keamanan minimal 6 karakter.`);
    const pinHash = await bcrypt.hash(pin, 12);
    await pool.query(
      `INSERT INTO bapperida_admin (username, nama, pin_hash, role) VALUES ($1, $2, $3, 'admin')`,
      [username, process.env.ADMIN_NAMA || 'Administrator BAPPERIDA', pinHash]
    );
    console.log(`Akun admin "${username}" dibuat dari ADMIN_PIN. Ganti PIN lewat panel setelah login.`);
  } catch (e) {
    console.error('Seed admin error:', e.message);
  }
}

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', async (_, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', email: emailSiap() });
  } catch {
    res.status(500).json({ status: 'db error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════

// Pembatas percobaan login, disimpan di memori proses. PIN pendek dan endpoint ini
// terbuka untuk publik, jadi tanpa pembatas PIN bisa ditebak otomatis.
// Sengaja: hilang saat restart, itu diterima — ini bantalan, bukan kontrol utama.
const COBA_MAX    = 5;
const COBA_JENDAL = 15 * 60 * 1000;
const percobaan   = new Map(); // kunci → { jumlah, resetPada }

function kunciPercobaan(req, username) {
  return `${req.ip}|${String(username || '').toLowerCase()}`;
}

function terlaluBanyak(req, username) {
  const s = percobaan.get(kunciPercobaan(req, username));
  if (!s) return false;
  if (Date.now() > s.resetPada) { percobaan.delete(kunciPercobaan(req, username)); return false; }
  return s.jumlah >= COBA_MAX;
}

function catatGagal(req, username) {
  const kunci = kunciPercobaan(req, username);
  const s = percobaan.get(kunci);
  if (s && Date.now() < s.resetPada) s.jumlah += 1;
  else percobaan.set(kunci, { jumlah: 1, resetPada: Date.now() + COBA_JENDAL });
}

app.post('/api/auth/login', async (req, res) => {
  const { username, pin } = req.body;
  if (!username || !pin)
    return res.status(400).json({ error: 'Username dan PIN diperlukan' });

  if (terlaluBanyak(req, username))
    return res.status(429).json({ error: 'Terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi.' });

  try {
    const { rows } = await pool.query(
      'SELECT id, username, nama, pin_hash, role, aktif FROM bapperida_admin WHERE username = $1',
      [String(username).trim()]
    );
    const akun = rows[0];

    // Password tetap dibandingkan meski akun tidak ada, supaya waktu respons tidak
    // membocorkan username mana yang terdaftar.
    const hashBocor = '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu';
    const cocok = await bcrypt.compare(String(pin), akun ? akun.pin_hash : hashBocor);

    // Pesan yang sama untuk "tidak ada" dan "PIN salah": jangan beri petunjuk.
    if (!akun || !cocok) {
      catatGagal(req, username);
      return res.status(401).json({ error: 'Username atau PIN salah' });
    }
    if (!akun.aktif)
      return res.status(403).json({ error: 'Akun Anda dinonaktifkan. Hubungi administrator.' });

    percobaan.delete(kunciPercobaan(req, username));
    await pool.query('UPDATE bapperida_admin SET last_login = NOW() WHERE id = $1', [akun.id]);

    let token;
    try {
      token = buatToken(akun.username);
    } catch (e) {
      console.error('Login: session error:', e.message);
      return res.status(500).json({ error: 'Session belum dikonfigurasi. Hubungi administrator.' });
    }
    pasangCookie(res, token);

    res.json({
      message: 'Login berhasil',
      user: { id: akun.id, username: akun.username, nama: akun.nama || akun.username, role: akun.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
});

// Sesi yang sedang berlaku, dibaca dari cookie.
app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.pengguna || null });
});

app.post('/api/auth/logout', (_, res) => {
  lepasCookie(res);
  res.json({ message: 'Logout berhasil' });
});

app.put('/api/auth/pin', async (req, res) => {
  const { pin_lama, pin_baru } = req.body;
  if (!pin_baru || String(pin_baru).length < 6)
    return res.status(400).json({ error: 'PIN baru minimal 6 karakter' });

  try {
    const { rows } = await pool.query('SELECT pin_hash FROM bapperida_admin WHERE id = $1', [req.pengguna.id]);
    if (!rows.length) return res.status(404).json({ error: 'Akun tidak ditemukan' });

    if (!(await bcrypt.compare(String(pin_lama || ''), rows[0].pin_hash)))
      return res.status(401).json({ error: 'PIN lama salah' });

    await pool.query(
      'UPDATE bapperida_admin SET pin_hash = $1 WHERE id = $2',
      [await bcrypt.hash(String(pin_baru), 12), req.pengguna.id]
    );
    res.json({ message: 'PIN berhasil diubah' });
  } catch (err) {
    console.error('Ganti PIN error:', err);
    res.status(500).json({ error: 'Gagal mengubah PIN' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIK
// ═══════════════════════════════════════════════════════════════════════════

// Peta entitas: satu tempat yang menentukan tabel, kolom, dan urutan. Enam modul
// CMS punya bentuk yang sama (id + daftar kolom + urutan), jadi handler-nya
// dibuat generik di bawah. Kolom ditulis ulang ke alias yang sama dengan keluaran
// webhook n8n lama supaya komponen halaman publik tidak perlu disentuh.
const ENTITAS = {
  berita: {
    tabel: 'bapperida_berita',
    wajib: ['judul'],
    kolom: [
      ['judul', 'teks', 'Judul berita'],
      ['konten', 'teks', 'Isi berita'],
      ['kategori', 'teks', 'Kategori'],
      ['tanggal', 'tanggal', 'Tanggal'],
      ['gambar_data', 'teks', 'URL gambar'],
      ['emoji', 'teks', 'Emoji'],
      ['is_featured', 'bool', 'Berita unggulan'],
      ['priority', 'int', 'Urutan'],
      ['layout_size', 'teks', 'Ukuran layout'],
      ['col_span', 'int', 'Lebar kolom'],
      ['row_span', 'int', 'Tinggi baris'],
    ],
    baca: `id, judul, konten, kategori, tanggal,
                  gambar_data AS gambar_url, emoji, is_featured, priority,
                  layout_size, col_span, row_span`,
    urut: 'priority ASC, id DESC',
  },

  dokumen: {
    tabel: 'bapperida_dokumen',
    wajib: ['judul'],
    kolom: [
      ['judul', 'teks', 'Judul dokumen'],
      ['kategori', 'teks', 'Kategori'],
      ['tipe', 'teks', 'Tipe file'],
      ['ukuran', 'teks', 'Ukuran'],
      ['tanggal', 'tanggal', 'Tanggal terbit'],
      ['icon_data', 'teks', 'Emoji ikon'],
      ['publik', 'bool', 'Tampilkan di situs publik'],
      ['url', 'teks', 'URL file'],
    ],
    baca: `id, judul, kategori, tipe, ukuran, tanggal, icon_data AS icon, publik`,
    urut: 'id DESC',
  },

  slider: {
    tabel: 'bapperida_slider',
    wajib: [],
    kolom: [
      ['gambar_data', 'teks', 'URL gambar'],
      ['judul', 'teks', 'Judul teks'],
      ['subjudul', 'teks', 'Subjudul teks'],
    ],
    baca: `id, gambar_data AS gambar_url, judul, subjudul`,
    urut: 'id ASC',
  },

  program: {
    tabel: 'bapperida_program',
    wajib: ['title'],
    kolom: [
      ['icon_data', 'teks', 'Emoji ikon'],
      ['title', 'teks', 'Nama program'],
      ['cat', 'teks', 'Kategori'],
      ['desc', 'teks', 'Deskripsi'],
      ['status', 'teks', 'Status'],
      ['sc', 'teks', 'Sasaran'],
      ['priority', 'int', 'Urutan'],
    ],
    // desc perlu tanda kutip: itu keyword SQL di PostgreSQL.
    baca: `id, icon_data AS icon, title, cat, "desc", status, sc, priority`,
    urut: 'priority ASC, id ASC',
  },

  metrics: {
    tabel: 'bapperida_metrics',
    wajib: ['label'],
    kolom: [
      ['label', 'teks', 'Label metrik'],
      ['value', 'teks', 'Nilai'],
      ['icon', 'teks', 'Emoji ikon'],
      ['priority', 'int', 'Urutan'],
    ],
    baca: `id, label, value, icon, priority`,
    urut: 'priority ASC, id ASC',
  },

  inovasi: {
    tabel: 'bapperida_inovasi',
    wajib: ['judul_inovasi'],
    kolom: [
      ['opd_nama', 'teks', 'Nama OPD'],
      ['judul_inovasi', 'teks', 'Judul inovasi'],
      ['nama_inovator', 'teks', 'Nama inovator'],
      ['jenis_inovasi', 'teks', 'Jenis inovasi'],
      ['tahapan_inovasi', 'teks', 'Tahapan'],
      ['rancang_bangun', 'teks', 'Rancang bangun'],
      ['link_video', 'teks', 'Link video'],
      ['dokumen_dukung', 'json', 'Dokumen pendukung'],
      ['skor_iga', 'int', 'Skor IGA'],
      ['kategori_skor', 'teks', 'Kategori skor'],
      ['regulasi_inovasi', 'teks', 'Regulasi'],
      ['anggaran_inovasi', 'teks', 'Anggaran'],
      ['waktu_uji_coba', 'tanggal', 'Waktu uji coba'],
      ['waktu_penerapan', 'tanggal', 'Waktu penerapan'],
      ['status_approval', 'teks', 'Status persetujuan'],
    ],
    baca: `id, opd_nama, judul_inovasi, nama_inovator, jenis_inovasi, tahapan_inovasi,
                  rancang_bangun, link_video, dokumen_dukung, skor_iga, kategori_skor,
                  regulasi_inovasi, anggaran_inovasi, waktu_uji_coba, waktu_penerapan,
                  status_approval, created_at`,
    urut: 'created_at DESC',
  },
};

// Nama kolom yang dikirim klien ada dua ejaan: nama kolom asli (gambar_data) dan
// alias yang selama ini dipakai form (gambar_url, icon). Dipetakan dari nama
// kolom database -> daftar nama yang diterima dari client.
const ALIAS_KOLOM = {
  gambar_data: ['gambar_url', 'gambar', 'gambar_data'],
  icon_data: ['icon', 'icon_data'],
};

// Hitung ulang skor IGA di server. Form publik hanya menampilkan estimasi,
// jadi angka yang tampil di browser tidak boleh dipercaya: kalau tidak, siapa
// saja bisa mengirim body JSON langsung dengan skor 100.
function hitungSkorIga(d) {
  let skor = 0;

  const rancang = String(d.rancang_bangun || '').trim();
  if (rancang && rancang.split(/\s+/).filter(Boolean).length >= 300) skor += 20;

  if (d.tahapan_inovasi === 'Penerapan') skor += 20;
  else if (d.tahapan_inovasi === 'Uji Coba') skor += 10;
  else if (d.tahapan_inovasi === 'Inisiatif') skor += 5;

  if (d.regulasi_inovasi === 'Perbup') skor += 15;
  else if (d.regulasi_inovasi === 'SK Kepala OPD') skor += 10;
  else if (d.regulasi_inovasi === 'SOP') skor += 5;

  if (d.anggaran_inovasi === 'Ada') skor += 15;

  if (String(d.link_video || '').length > 10) skor += 10;

  const dokumen = Array.isArray(d.dokumen_dukung) ? d.dokumen_dukung : [];
  if (dokumen.length > 0) skor += 20;

  return Math.min(100, skor);
}

function kategoriIga(skor) {
  if (skor >= 80) return 'Sangat Inovatif';
  if (skor >= 50) return 'Inovatif';
  return 'Kurang Inovatif';
}

function coerce(nilai, tipe) {
  if (nilai === undefined || nilai === null) return null;
  const kosong = String(nilai).trim();
  switch (tipe) {
    case 'bool':
      if (kosong === '') return false;
      return kosong === true || kosong === 'true' || kosong === '1' || kosong === 'on' || kosong === 1;
    case 'int': {
      if (kosong === '') return null;
      const n = Number.parseInt(kosong, 10);
      return Number.isFinite(n) ? n : null;
    }
    case 'tanggal':
      // Input type="date" mengirim yyyy-mm-dd. Nilai kosong harus jadi NULL, bukan
      // string kosong, karena ''::date akan ditolak PostgreSQL.
      return kosong === '' ? null : kosong;
    case 'json':
      if (typeof nilai !== 'string') return nilai;
      if (kosong === '') return [];
      try {
        const parsed = JSON.parse(kosong);
        return parsed;
      } catch {
        throw Object.assign(new Error('Kolom JSON tidak valid'), { status: 400 });
      }
    default:
      return kosong;
  }
}

// Nama kolom bapperida_program.desc adalah keyword SQL. Nilai placeholder sudah
// dipisah dari teks SQL, tapi nama kolom belum, sehingga setiap SQL yang menyebut
// kolom harus lewat fungsi ini. Nama yang tidak lolos pola identitas maupun
// termasuk daftar keyword tetap dikutip, bukan ditolak, supaya tabel bersama
// dengan arsip-digital tetap bisa ditulis dari sini.
const SQL_KEYWORD = new Set([
  'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'authorization',
  'between', 'binary', 'both', 'case', 'cast', 'check', 'collate', 'column',
  'constraint', 'create', 'cross', 'current_date', 'default', 'deferrable', 'desc',
  'distinct', 'do', 'else', 'end', 'except', 'false', 'for', 'foreign', 'freeze',
  'from', 'full', 'grant', 'group', 'having', 'ilike', 'in', 'initially', 'inner',
  'intersect', 'into', 'is', 'isnull', 'join', 'leading', 'left', 'like', 'limit',
  'natural', 'not', 'notnull', 'null', 'offset', 'on', 'only', 'or', 'order',
  'outer', 'overlaps', 'placing', 'primary', 'references', 'returning', 'right',
  'select', 'session_user', 'similar', 'some', 'symmetric', 'table', 'then', 'to',
  'trailing', 'true', 'union', 'unique', 'user', 'using', 'variadic', 'verbose',
  'when', 'where', 'window', 'with',
]);

const sqlIdent = (nama) =>
  /^[a-z_][a-z0-9_]*$/.test(nama) && !SQL_KEYWORD.has(nama) ? nama : `"${nama}"`;

// Ubah body request menjadi { kolom: nilai } sesuai definisi entitas.
function normalisasi(entitas, body) {
  const { kolom } = entitas;
  const hasil = {};

  for (const [nama, tipe] of kolom) {
    const kandidat = [nama, ...(ALIAS_KOLOM[nama] || [])];
    const sumber = kandidat.find(k => Object.prototype.hasOwnProperty.call(body, k));
    if (sumber === undefined) continue;
    hasil[nama] = coerce(body[sumber], tipe);
  }

  for (const nama of entitas.wajib) {
    const v = hasil[nama];
    if (v === undefined || v === null || v === '')
      return { galat: `Kolom "${nama}" wajib diisi` };
  }
  return { hasil };
}

// Master data untuk halaman publik: satu request, enam daftar.
//
// `url` dokumen sengaja TIDAK ikut dikirim. Di n8n lama, endpoint list hanya
// mengembalikan url kalau dipanggil dengan ?id=, jadi siapa pun tidak bisa menarik
// semua tautan file dalam satu request. Kalau url ikut di /api/init, proteksi itu
// hilang — gunakan GET /api/dokumen/:id/file per dokumen.
app.get('/api/init', async (_, res) => {
  try {
    const [berita, dokumen, slider, program, metrics, inovasi] = await Promise.all([
      queryDB(`SELECT ${ENTITAS.berita.baca} FROM ${ENTITAS.berita.tabel} ORDER BY ${ENTITAS.berita.urut}`),
      // Hanya yang publik = TRUE, dan tanpa kolom url.
      queryDB(`SELECT ${ENTITAS.dokumen.baca} FROM ${ENTITAS.dokumen.tabel} WHERE publik = TRUE ORDER BY id DESC`),
      queryDB(`SELECT ${ENTITAS.slider.baca} FROM ${ENTITAS.slider.tabel} ORDER BY ${ENTITAS.slider.urut}`),
      queryDB(`SELECT ${ENTITAS.program.baca} FROM ${ENTITAS.program.tabel} ORDER BY ${ENTITAS.program.urut}`),
      queryDB(`SELECT ${ENTITAS.metrics.baca} FROM ${ENTITAS.metrics.tabel} ORDER BY ${ENTITAS.metrics.urut}`),
      // Yang sudah disetujui admin saja. Kiriman OPD baru berstatus Pending dan
      // tidak boleh bocor ke halaman publik.
      queryDB(
        `SELECT ${ENTITAS.inovasi.baca} FROM ${ENTITAS.inovasi.tabel}
          WHERE status_approval = 'Approved' ORDER BY skor_iga DESC, id DESC`
      ),
    ]);

    res.json({ berita, dokumen, slider, program, metrics, inovasi });
  } catch (err) {
    console.error('/api/init error:', err);
    res.status(500).json({ error: 'Gagal memuat data' });
  }
});

// Tautan file satu dokumen, diberikan terpisah dari daftar. Hanya dokumen publik
// yang boleh diambil lewat jalur tanpa login.
app.get('/api/dokumen/:id/file', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID tidak valid' });

  try {
    const { rows } = await pool.query(
      'SELECT url, judul, tipe, ukuran FROM bapperida_dokumen WHERE id = $1 AND publik = TRUE',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    if (!rows[0].url) return res.status(404).json({ error: 'Dokumen ini belum punya tautan file' });
    res.json({ id, url: rows[0].url });
  } catch (err) {
    console.error('Dokumen file error:', err);
    res.status(500).json({ error: 'Gagal mengambil tautan dokumen' });
  }
});

// Form kontak: simpan dulu, kirim email belakangan.
app.post('/api/kontak', async (req, res) => {
  const { nama, email, subjek, pesan } = req.body;

  if (!nama || !email || !pesan)
    return res.status(400).json({ error: 'Nama, email, dan pesan wajib diisi' });
  // Batas panjang prevents someone stuffing 10 MB into one TEXT column.
  if (String(pesan).length > 5000)
    return res.status(400).json({ error: 'Pesan maksimal 5000 karakter' });
  // Hanya pemeriksaan kasar. Verifikasi sesungguhnya adalah apakah alamat email
  // itu benar-benar menerima balasan, bukan regex di sini.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)))
    return res.status(400).json({ error: 'Format email tidak valid' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO bapperida_pesan (nama, email, subjek, pesan) VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [String(nama).slice(0, 200), String(email).slice(0, 200), String(subjek || '').slice(0, 300), String(pesan)]
    );

    const hasilEmail = await kirimEmail({ nama, email, subjek, pesan });

    res.json({
      message: 'Pesan Anda telah terkirim. Terima kasih!',
      id: rows[0].id,
      terkirim: hasilEmail.terkirim,
    });
  } catch (err) {
    console.error('Kontak error:', err);
    res.status(500).json({ error: 'Gagal mengirim pesan' });
  }
});

// Portal Klinik Inovasi: OPD mengirim usulan, statusnya Pending sampai disetujui
// admin. Tidak ada PUBLIK/Approve di sini — itu hak admin.
app.post('/api/inovasi', async (req, res) => {
  try {
    const { hasil, galat } = normalisasi(ENTITAS.inovasi, req.body);
    if (galat) return res.status(400).json({ error: galat });

    // Status dan skor dikunci di server. Kalau salah satunya diterima dari body,
    // pengirim bisa mengirim Usulan yang langsung tampil di situs publik atau
    // mencangkokkan kategori IGA.
    delete hasil.status_approval;
    delete hasil.skor_iga;
    delete hasil.kategori_skor;
    hasil.status_approval = 'Pending';
    hasil.skor_iga = hitungSkorIga(hasil);
    hasil.kategori_skor = kategoriIga(hasil.skor_iga);

    const kolom = Object.keys(hasil);
    if (!kolom.length) return res.status(400).json({ error: 'Tidak ada data yang dikirim' });

    const nilai = kolom.map(k => hasil[k]);
    const tempat = kolom.map((_, i) => `$${i + 1}`).join(', ');

    const { rows } = await pool.query(
      `INSERT INTO bapperida_inovasi (${kolom.join(', ')})
       VALUES (${tempat})
       RETURNING id, status_approval, skor_iga, kategori_skor`,
      nilai
    );

    res.status(201).json({
      message: 'Usulan inovasi berhasil dikirim dan menunggu persetujuan admin.',
      inovasi: rows[0],
    });
  } catch (err) {
    console.error('Inovasi submit error:', err);
    res.status(500).json({ error: 'Gagal mengirim usulan inovasi' });
  }
});

// Setujui usulan inovasi supaya tampil di halaman publik.
app.put('/api/inovasi/:id/setujui', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID tidak valid' });

  try {
    const { rowCount } = await pool.query(
      `UPDATE bapperida_inovasi SET status_approval = 'Approved', updated_at = NOW() WHERE id = $1`,
      [id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Usulan tidak ditemukan' });
    res.json({ message: 'Usulan inovasi disetujui dan tayang di situs' });
  } catch (err) {
    console.error('Setujui inovasi error:', err);
    res.status(500).json({ error: 'Gagal menyetujui usulan' });
  }
});

// ── Pesan kontak ────────────────────────────────────────────────────────────
app.get('/api/pesan', async (_, res) => {
  try {
    const baris = await queryDB(
      `SELECT id, nama, email, subjek, pesan, dibaca, created_at
         FROM bapperida_pesan ORDER BY created_at DESC LIMIT 200`
    );
    res.json(baris);
  } catch (err) {
    console.error('Pesan error:', err);
    res.status(500).json({ error: 'Gagal mengambil pesan' });
  }
});

// Nilai dibaca dikirim eksplisit, bukan "balik status yang sekarang". Kalau
// memakai toggle, dua admin yang membuka daftar bersamaan bisa saling
// membalik label tombol dan pesan kembali saja belum terbaca.
app.put('/api/pesan/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID tidak valid' });

  const dibaca = req.body && req.body.dibaca;
  if (typeof dibaca !== 'boolean')
    return res.status(400).json({ error: 'Kirim {"dibaca": true} atau {"dibaca": false}' });

  try {
    const { rowCount } = await pool.query(
      'UPDATE bapperida_pesan SET dibaca = $2 WHERE id = $1',
      [id, dibaca]
    );
    if (!rowCount) return res.status(404).json({ error: 'Pesan tidak ditemukan' });
    res.json({ message: 'Status pesan diperbarui', dibaca });
  } catch (err) {
    console.error('Update pesan error:', err);
    res.status(500).json({ error: 'Gagal memperbarui pesan' });
  }
});

app.delete('/api/pesan/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID tidak valid' });
  try {
    const { rowCount } = await pool.query('DELETE FROM bapperida_pesan WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Pesan tidak ditemukan' });
    res.json({ message: 'Pesan dihapus' });
  } catch (err) {
    console.error('Hapus pesan error:', err);
    res.status(500).json({ error: 'Gagal menghapus pesan' });
  }
});


// ── Ringkasan untuk dashboard admin ─────────────────────────────────────────
app.get('/api/ringkasan', async (_, res) => {
  try {
    // Query ini selalu mengembalikan tepat satu baris, jadi destructure langsung
    // ke objek ringkasan. Menulis jumlah[0] lagi akan mengirim body kosong dan
    // panel admin menampilkan nol semua.
    const [jumlah] = await queryDB(`
      SELECT
        (SELECT COUNT(*) FROM bapperida_berita)                         AS berita,
        (SELECT COUNT(*) FROM bapperida_dokumen)                        AS dokumen,
        (SELECT COUNT(*) FROM bapperida_dokumen WHERE publik = TRUE)    AS dokumen_publik,
        (SELECT COUNT(*) FROM bapperida_slider)                         AS slider,
        (SELECT COUNT(*) FROM bapperida_program)                        AS program,
        (SELECT COUNT(*) FROM bapperida_inovasi WHERE status_approval = 'Pending') AS inovasi_pending,
        (SELECT COUNT(*) FROM bapperida_pesan WHERE dibaca = FALSE)     AS pesan_baru
    `);
    res.json(jumlah);
  } catch (err) {
    console.error('Ringkasan error:', err);
    res.status(500).json({ error: 'Gagal mengambil ringkasan' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: CRUD generik untuk enam entitas di atas
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/:entitas', async (req, res) => {
  const e = ENTITAS[req.params.entitas];
  if (!e) return res.status(404).json({ error: 'Modul tidak dikenal' });
  try {
    const baris = await queryDB(`SELECT ${e.baca} FROM ${e.tabel} ORDER BY ${e.urut}`);
    // Admin butuh kolom url dokumen; /api/init sengaja tidak mengirimnya.
    if (req.params.entitas === 'dokumen') {
      const lengkap = await queryDB(`SELECT id, url FROM ${e.tabel}`);
      const petaUrl = new Map(lengkap.map(d => [d.id, d.url]));
      for (const b of baris) b.url = petaUrl.get(b.id) || '';
    }
    res.json(baris);
  } catch (err) {
    console.error(`List ${req.params.entitas} error:`, err);
    res.status(500).json({ error: 'Gagal mengambil data' });
  }
});

app.post('/api/:entitas', async (req, res) => {
  const e = ENTITAS[req.params.entitas];
  if (!e) return res.status(404).json({ error: 'Modul tidak dikenal' });
  try {
    const { hasil, galat } = normalisasi(e, req.body);
    if (galat) return res.status(400).json({ error: galat });

    const kolom = Object.keys(hasil);
    if (!kolom.length) return res.status(400).json({ error: 'Tidak ada data yang dikirim' });

    const nilai  = kolom.map(k => hasil[k]);
    const tempat = kolom.map((_, i) => `$${i + 1}`).join(', ');

    const { rows } = await pool.query(
      `INSERT INTO ${e.tabel} (${kolom.map(sqlIdent).join(', ')}) VALUES (${tempat}) RETURNING *`,
      nilai
    );
    res.status(201).json({ message: 'Data berhasil disimpan', data: rows[0] });
  } catch (err) {
    console.error(`Create ${req.params.entitas} error:`, err);
    res.status(err.status || 500).json({ error: err.message || 'Gagal menyimpan data' });
  }
});

app.put('/api/:entitas/:id', async (req, res) => {
  const e = ENTITAS[req.params.entitas];
  if (!e) return res.status(404).json({ error: 'Modul tidak dikenal' });

  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID tidak valid' });

  try {
    const { hasil, galat } = normalisasi(e, req.body);
    if (galat) return res.status(400).json({ error: galat });

    const kolom = Object.keys(hasil);
    if (!kolom.length) return res.status(400).json({ error: 'Tidak ada data yang dikirim' });

    // updated_at hanya untuk tabel yang punya kolom itu. bapperida_inovasi punya
    // created_at tapi juga updated_at; semuanya konsisten punya updated_at kecuali
    // tabel yang di-seed sebelum kolom ini ada — dicek dari information_schema
    // di bawah, bukan diasumsikan.
    const set = kolom.map((k, i) => `${sqlIdent(k)} = $${i + 1}`);
    const punyaUpdatedAt = await punyaKolom(e.tabel, 'updated_at');
    if (punyaUpdatedAt) set.push('updated_at = NOW()');

    const { rowCount } = await pool.query(
      `UPDATE ${e.tabel} SET ${set.join(', ')} WHERE id = $${kolom.length + 1}`,
      [...kolom.map(k => hasil[k]), id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Data tidak ditemukan' });

    res.json({ message: 'Data berhasil diperbarui' });
  } catch (err) {
    console.error(`Update ${req.params.entitas} error:`, err);
    res.status(err.status || 500).json({ error: err.message || 'Gagal memperbarui data' });
  }
});

app.delete('/api/:entitas/:id', async (req, res) => {
  const e = ENTITAS[req.params.entitas];
  if (!e) return res.status(404).json({ error: 'Modul tidak dikenal' });

  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID tidak valid' });

  try {
    // Hapus file Drive-nya juga, kalau url-nya bisa dibaca. Kegagalan di sini
    // tidak menggagalkan penghapusan baris: metadata yang sudah hilang lebih sulit
    // dipulihkan daripada file yatim di Drive.
    if (req.params.entitas === 'dokumen' || req.params.entitas === 'slider' || req.params.entitas === 'berita') {
      // Hanya dokumen yang punya kolom url; gambar slider dan berita disimpan
      // di gambar_data. Nama kolomnya dicek dulu supaya error SQL tidak muncul
      // di console setiap kali admin menghapus berita.
      const { rows } = await pool.query(`SELECT * FROM ${e.tabel} WHERE id = $1`, [id]);
      const tautan = rows[0] && (rows[0].url || rows[0].gambar_data);
      if (tautan) hapusDiDrive(tautan).catch(() => {});
    }

    const { rowCount } = await pool.query(`DELETE FROM ${e.tabel} WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json({ error: 'Data tidak ditemukan' });

    res.json({ message: 'Data berhasil dihapus' });
  } catch (err) {
    console.error(`Delete ${req.params.entitas} error:`, err);
    res.status(500).json({ error: 'Gagal menghapus data' });
  }
});

const cacheKolom = new Map();
async function punyaKolom(tabel, kolom) {
  if (!cacheKolom.has(tabel)) {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1`,
      [tabel]
    );
    cacheKolom.set(tabel, new Set(rows.map(r => r.column_name)));
  }
  return cacheKolom.get(tabel).has(kolom);
}

// ── Hapus file di Google Drive lewat GAS ────────────────────────────────────
// Sengaja tidak awaited: pemanggil tidak boleh gagal hanya karena Drive sedang
// tidak bisa dihubungi, dan file yatim di Drive bisa dibereskan manual.
async function hapusDiDrive(url) {
  const gas = process.env.GAS_WEBAPP_URL;
  if (!gas) {
    console.warn('GAS_WEBAPP_URL belum diisi; file di Drive tidak dihapus otomatis.');
    return;
  }
  const id = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]
          || String(url).match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!id) return;

  const res = await fetch(gas, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.GAS_API_KEY ? { 'x-gas-key': process.env.GAS_API_KEY } : {}),
    },
    body: JSON.stringify({ action: 'deleteFile', fileId: id }),
  });
  if (!res.ok) console.error(`GAS deleteFile ${id} gagal: HTTP ${res.status}`);
}

// ── SPA fallback: semua route non-API → index.html (production only) ────────
if (isProd) {
  app.get('*', (_, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

// ── Error handler ───────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // Dicek paling awal supaya konfigurasi session yang salah langsung terlihat di
  // log, bukan baru ketahuan setelah admin mencoba login.
  periksaKonfigurasiSession();
  console.log(`Server berjalan di port ${PORT} [${isProd ? 'production' : 'development'}]`);
});
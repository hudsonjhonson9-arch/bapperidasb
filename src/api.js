// Klien API untuk situs publik dan panel admin.
//
// Semua request melewati /api/* yang dilayani Express native (server/index.js).
// Tidak ada webhook n8n lagi, dan tidak ada token yang ditanam di dalam bundle:
// Instantiate cookie session HttpOnly, jadi admin tidak bisa "login" hanya dengan
// menyalin localStorage seperti dulu.

const BASE = '/api';

// URL Google Apps Script untuk upload file. File tidak pernah lewat Express:
// dikirim dari browser langsung ke Apps Script, yang menyimpannya ke Drive.
const GAS_URL   = import.meta.env.VITE_GAS_WEBAPP_URL || '';
const GAS_KEY   = import.meta.env.VITE_GAS_API_KEY || '';

// Batas 5 MB, sama seperti batas di Code.gs (8 MB) dan yang dulu dipakai form.
// Yang dikunci di sini supaya pengguna tidak menunggu unggahan besar yang pasti ditolak.
export const MAKS_UPLOAD = 5 * 1024 * 1024;

export class ApiError extends Error {
  constructor(pesan, status) {
    super(pesan);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      // Sesi hidup di cookie HttpOnly, jadi cookie harus ikut dikirim.
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Tidak bisa menghubungi server. Periksa koneksi Anda.', 0);
  }

  if (res.status === 204) return null;

  // Pesan error dibaca dari body server, bukan cuma status-nya. Tanpa ini semua
  // kegagalan hanya berbunyi "Gagal (500)" padahal server sudah menjelaskan
  // kolom mana yang sebenarnya salah.
  if (!res.ok) {
    let pesan = `Gagal (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) pesan = data.error;
    } catch { /* body bukan JSON, pakai status saja */ }
    throw new ApiError(pesan, res.status);
  }

  return res.json();
}

export const api = {
  get:  (path)         => request(path),
  post: (path, body)   => request(path, { method: 'POST', body }),
  put:  (path, body)   => request(path, { method: 'PUT', body }),
  patch:(path, body)   => request(path, { method: 'PATCH', body }),
  del:  (path)         => request(path, { method: 'DELETE' }),
};

// ── Data publik ─────────────────────────────────────────────────────────────

// Satu request untuk seluruh data yang dirender halaman publik.
export const ambilInit = () => api.get('/init');

// Tautan file dokumen diberikan terpisah dari daftar, jadi daftar publik tidak
// pernah memuat seluruh URL file sekaligus.
export const ambilTautanDokumen = (id) => api.get(`/dokumen/${id}/file`);

export const kirimKontak = (data) => api.post('/kontak', data);

export const kirimInovasi = (data) => api.post('/inovasi', data);

// ── Auth admin ──────────────────────────────────────────────────────────────

export const login    = (username, pin) => api.post('/auth/login', { username, pin });
export const logout   = () => api.post('/auth/logout');
export const sesi     = () => api.get('/auth/me');
export const gantiPin = (pin_lama, pin_baru) => api.put('/auth/pin', { pin_lama, pin_baru });
export const ringkasan = () => api.get('/ringkasan');

// ── Upload file ke Google Drive lewat Apps Script ───────────────────────────

function bacaSebagaiBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload     = () => resolve(reader.result);
    reader.onerror    = () => reject(new Error('Gagal membaca file dari perangkat Anda.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Unggah satu file ke Drive dan kembalikan { url, fileId, size }.
 * Melempar ApiError dengan pesan yang bisa langsung ditampilkan ke pengguna.
 */
export async function unggahFile(file) {
  if (!GAS_URL)
    throw new ApiError(
      'Alamat Google Apps Script belum diisi. Isi VITE_GAS_WEBAPP_URL di file .env lalu build ulang.',
      0
    );
  if (file.size > MAKS_UPLOAD)
    throw new ApiError(
      `Ukuran file terlalu besar (${formatBytes(file.size)}). Maksimal ${formatBytes(MAKS_UPLOAD)}.`,
      0
    );

  const base64 = await bacaSebagaiBase64(file);

  // Kunci API dikirim di dalam body, bukan hanya di header. Apps Script
  // membalas POST dengan redirect 302 ke script.googleusercontent.com, dan
  // redirect itu membuang header kustom milik kita. Akibatnya header
  // 'x-gas-key' sampai ke doPost dalam keadaan kosong, sementara body
  // diteruskan apa adanya. Kunci di body sekaligus menutup upload langsung dari
  // panel admin yang tidak lewat client ini.
  let res;
  try {
    res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upload',
        name: file.name,
        base64,
        mimeType: file.type,
        ...(GAS_KEY ? { 'x-gas-key': GAS_KEY } : {}),
      }),
    });
  } catch {
    throw new ApiError('Gagal menghubungi Google Drive. Periksa koneksi Anda.', 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error)
    throw new ApiError(data.error || `Upload gagal (${res.status}).`, res.status);

  return data;
}

export function formatBytes(byte) {
  if (!byte) return '-';
  if (byte > 1024 * 1024) return `${(byte / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(byte / 1024)} KB`;
}

// URL thumbnail Google Drive. Drive tidak melayani thumbnail untuk file non gambar,
// jadi pemanggil harus tetap menyiapkan fallback.
export function thumbDrive(url) {
  if (!url) return url;
  const m = String(url).match(/\/d\/([^/]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=s400` : url;
}

// Ubah tautan Drive menjadi URL yang bisa dibuka langsung di browser.
// drive.google.com/file/d/<id>/view jadi /uc?export=download; tanpa ini
// tautan /view menampilkan halaman HTML, bukan berkas.
export function tautanLangsung(url) {
  if (!url) return url;
  const m = String(url).match(/\/d\/([^/?]+)/);
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : url;
}
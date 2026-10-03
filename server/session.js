import crypto from 'node:crypto';

// Session berbasis cookie bertanda tangan HMAC.
//
// Keputusan desain:
// - Role TIDAK disimpan di dalam token. Setiap request membaca role terbaru dari
//   database, jadi pergantian role atau penonaktifan admin berlaku seketika tanpa
//   perlu mencabut token lama.
// - Tanpa SESSION_SECRET, semua issuance dan verifikasi gagal (fail closed).
//   Menerima token tanpa tanda tangan sama artinya menerima cookie buatan, jadi
//   lebih aman menolak semuanya.
// - Tanpa tabel session: tidak ada upkeep, tidak perlu migration, dan restart
//   server tidak mengunci semua orang keluar.

export const NAMA_COOKIE = 'bapperida_session';
export const MASA_JAM = 8;

// Panjang minimum yang diterima. Ambil 16, bukan 32, supaya nilai yang sebenarnya
// wajar tetap jalan; nilai yang lebih pendek ditolak dengan alasan keamanan.
export const PANJANG_MINIMUM = 16;
export const PANJANG_DIANJURKAN = 32;

export function rahasia() {
  const s = process.env.SESSION_SECRET;
  return s && s.trim().length >= PANJANG_MINIMUM ? s : null;
}

// Dipanggil sekali saat boot supaya masalah konfigurasi terlihat di log server,
// bukan baru ketahuan saat semua request mulai 500.
export function periksaKonfigurasiSession() {
  const s = process.env.SESSION_SECRET;
  if (!rahasia()) {
    console.error(
      '\n' +
      '='.repeat(72) +
      '\nSESSION_SECRET belum diatur atau terlalu pendek.\n' +
      'Semua endpoint tulis /api akan dijawab 500 sampai variabel ini disetel.\n' +
      `Isi dengan string acak minimal ${PANJANG_MINIMUM} karakter, misalnya hasil\n` +
      'dari: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
      'Jangan memakai kata sandi pengguna, dan jangan menaruhnya di repo.' +
      '\n' +
      '='.repeat(72) + '\n'
    );
    return false;
  }
  if (s.trim().length < PANJANG_DIANJURKAN) {
    console.warn(
      `SESSION_SECRET hanya ${s.trim().length} karakter; ` +
      `disarankan ${PANJANG_DIANJURKAN} atau lebih.`
    );
  }
  console.log(`Session aktif (rahasia ${s.trim().length} karakter, berlaku ${MASA_JAM} jam).`);
  return true;
}

const b64 = buf => Buffer.from(buf).toString('base64url');

function tandaTangan(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

// Perbandingan waktu-tetap. Panjang harus sama dulu karena timingSafeEqual
// melempar error untuk buffer berbeda panjang.
function samaKonst(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function buatToken(username, secret = rahasia()) {
  if (!secret) throw new Error(`SESSION_SECRET belum diatur atau terlalu pendek (minimal ${PANJANG_MINIMUM} karakter)`);
  const isi = b64(JSON.stringify({
    sub: String(username),
    exp: Math.floor(Date.now() / 1000) + MASA_JAM * 3600,
  }));
  return `${isi}.${tandaTangan(isi, secret)}`;
}

export function verifikasiToken(token, secret = rahasia(), sekarang = Math.floor(Date.now() / 1000)) {
  if (!secret || typeof token !== 'string') return null;
  const titik = token.indexOf('.');
  if (titik < 1) return null;
  const isi = token.slice(0, titik);
  if (!samaKonst(tandaTangan(isi, secret), token.slice(titik + 1))) return null;
  let muatan;
  try {
    muatan = JSON.parse(Buffer.from(isi, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!muatan || typeof muatan.sub !== 'string' || !muatan.sub) return null;
  if (typeof muatan.exp !== 'number' || muatan.exp <= sekarang) return null;
  return muatan;
}

export function bacaCookie(req, nama = NAMA_COOKIE) {
  const mentah = req.headers && req.headers.cookie;
  if (!mentah) return null;
  for (const bagian of mentah.split(';')) {
    const i = bagian.indexOf('=');
    if (i < 0) continue;
    if (bagian.slice(0, i).trim() === nama) {
      try { return decodeURIComponent(bagian.slice(i + 1).trim()); }
      catch { return null; }
    }
  }
  return null;
}

export function pasangCookie(res, token) {
  res.cookie(NAMA_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MASA_JAM * 3600 * 1000,
    path: '/',
  });
}

export function lepasCookie(res) {
  res.clearCookie(NAMA_COOKIE, { path: '/' });
}
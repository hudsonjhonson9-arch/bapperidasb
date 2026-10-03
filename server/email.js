import nodemailer from 'nodemailer';

// Email untuk pesan form kontak.
//
// Dirancang opsional: kalau SMTP_HOST belum diisi, kirim() tidak melempar error
// dan hanya mengembalikan { terkirim: false }. Ini penting karena pesan tetap
// disimpan ke tabel bapperida_pesan sebelum email dicoba, jadi tidak adanya email
// tidak berarti pesan hilang — admin masih membacanya di panel.
//
// Transports dibuat ulang hanya saat konfigurasi berubah, bukan tiap panggilan:
// createTransport() membangun koneksi baru dan tidak murah.

let cache = null;

function transporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const kunci = [host, process.env.SMTP_PORT, process.env.SMTP_USER, process.env.SMTP_PASS].join('|');
  if (cache && cache.kunci === kunci) return cache.transport;

  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  cache = { kunci, transport };
  return transport;
}

export function emailSiap() {
  return !!process.env.SMTP_HOST;
}

export async function kirim({ nama, email, subjek, pesan }) {
  const transport = transporter();
  const tujuan = process.env.MAIL_TO;
  if (!transport || !tujuan) {
    console.log(`[kontak] SMTP belum dikonfigurasi; pesan dari "${nama}" disimpan ke database saja.`);
    return { terkirim: false, alasan: 'SMTP belum dikonfigurasi' };
  }

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || undefined,
      to: tujuan,
      replyTo: email || undefined,
      subject: `[Kontak Website] ${subjek || '(tanpa subjek)'}`,
      text: [
        `Nama    : ${nama || '-'}`,
        `Email   : ${email || '-'}`,
        `Subjek  : ${subjek || '-'}`,
        '',
        pesan,
      ].join('\n'),
    });
    return { terkirim: true };
  } catch (e) {
    // Kegagalan email tidak boleh menggagalkan pengiriman form. Pesan sudah
    // tersimpan sebelum fungsi ini dipanggil, jadi cukup dicatat di log.
    console.error('[kontak] gagal mengirim email:', e.message);
    return { terkirim: false, alasan: e.message };
  }
}
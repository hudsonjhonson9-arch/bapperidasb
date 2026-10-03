# BAPPERIDA Kabupaten Sumba Barat

Situs publik BAPPERIDA dengan panel admin. Backend-nya Node/Express + PostgreSQL
native; berkas pengguna disimpan di Google Drive lewat Google Apps Script.

Versi sebelumnya memakai n8n sebagai backend. Workflow dan skrip perbaikan
n8n sudah dihapus; kalau masih perlu melihat model data yang dulu jadi acuan
tabel, ambil dari riwayat git sebelum commit `ganti backend n8n dengan
Express + PostgreSQL`.

## Isi

| Path | Keterangan |
|---|---|
| `src/App.jsx` | Halaman publik, read-only. Semua data dari `GET /api/init`. |
| `src/Admin.jsx` | Panel admin di `/admin`. Dipakai sebagai chunk terpisah. |
| `src/api.js` | Klien REST + pengunggah file ke Apps Script. |
| `src/main.jsx` | Memilih `App` atau `Admin` berdasarkan `pathname`. |
| `server/index.js` | Express: autentikasi, CRUD, endpoint publik. |
| `server/session.js` | Cookie session bertanda tangan HMAC. |
| `server/kebijakan.js` | Hak akses per route, default-nya tertutup. |
| `server/email.js` | SMTP opsional untuk form kontak. |
| `db/schema.sql` | DDL PostgreSQL, aman dijalankan ulang. |
| `google-apps-script/Code.gs` | Simpan/hapus berkas di Drive. |

## Kebutuhan

- Node.js 18 atau lebih baru
- PostgreSQL 12 atau lebih baru
- Akun Google dengan akses ke folder Drive tujuan

## 1. Database

Skema dijalankan otomatis saat server boot, tapi boleh dijalankan manual lebih
dulu:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Semua `CREATE TABLE` memakai `IF NOT EXISTS` dan tidak pernah `DROP`, jadi
aman untuk database yang juga dipakai `arsip-digital`: kolom tambahan dari sana
tetap utuh.

**Penting untuk database yang sudah berisi data.** `CREATE TABLE IF NOT EXISTS`
melewati tabel yang sudah ada, termasuk kolom-kolom yang belum ada di dalamnya.
Tabel produksi `n8n_storage` misalnya belum punya `updated_at`, padahal setiap
`INSERT` dan `UPDATE` di server memakainya. Karena itu bagian akhir `schema.sql`
berisi blok `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` untuk menutup kekurangan
itu. Blok itu wajib dijalankan; tanpa itu semua operasi tulis berakhir dengan
`column "updated_at" does not exist`.

Blok yang sama juga menangani `bapperida_metrics`, yang di produksi punya kolom
`id` bertipe VARCHAR berisi kode seperti `ipd_2025`, bukan `SERIAL`. Tipe kolom
tidak diubah dan tidak ada yang di-`DROP`, jadi tiga baris metrik lama tetap
utuh.

Tabel yang dipakai:

```
bapperida_admin     akun admin (username + pin_hash bcrypt)
bapperida_berita    berita & kegiatan
bapperida_dokumen   dokumen, bisa dibagi dengan arsip-digital
bapperida_slider    gambar hero
bapperida_program   program & kegiatan unggulan
bapperida_metrics   angka metrik di beranda
bapperida_inovasi   usulan inovasi dari OPD pada Klinik Inovasi
bapperida_pesan     pesan dari form kontak
```

## 2. Google Apps Script untuk Drive

1. Buka [script.google.com](https://script.google.com), buat project baru.
2. Salin isi `google-apps-script/Code.gs`.
3. Isi dua nilai di bagian atas:

   ```js
   var DRIVE_FOLDER_ID = '1AbCdEf...';   // ID folder tujuan di Drive
   var API_KEY         = 'kunci-acak-anda';
   ```

   ID folder bisa diambil dari URL Drive:
   `https://drive.google.com/drive/folders/<ID_FOLDER>`.

4. Deploy → New deployment → Web app:
   - Execute as: **Me**
   - Who has access: **Anyone**

   Folder tujuan harus bisa diakses oleh akun yang menjalankan deployment.

5. Salin URL web app (`https://script.google.com/macros/s/XXXX/exec`).

Setiap kali `Code.gs` diubah, perlu **Deploy → Manage deployments → Edit →
New version**, lalu deploy ulang. Kode yang diubah tidak otomatis berlaku.

## 3. Konfigurasi server

```bash
cp .env.example .env
```

Isi minimal:

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | String koneksi PostgreSQL. |
| `SESSION_SECRET` | Kunci HMAC cookie session. Minimal 16 karakter. Wajib. |
| `ADMIN_USERNAME` | Akun admin pertama, hanya dipakai saat tabel masih kosong. |
| `ADMIN_PIN` | PIN untuk akun tersebut. Minimal 6 karakter. |
| `GAS_WEBAPP_URL` | URL web app dari langkah 2, untuk hapus berkas. |
| `GAS_API_KEY` | Kunci yang sama dengan `API_KEY` di `Code.gs`. |

Buat `SESSION_SECRET` acak:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Tanpa `SESSION_SECRET`, semua endpoint tulis akan dijawab 500 (gagal tertutup),
bukan 401 — supaya kesalahan konfigurasi kelihatan di log saat boot, bukan
terlihat sebagai sekadar "tidak bisa login".

Variabel `SMTP_*` opsional. Kalau `SMTP_HOST` kosong, pesan kontak tetap
disimpan ke `bapperida_pesan` dan bisa dibaca di panel admin, tapi tidak ada
email yang terkirim.

`CORS_ORIGIN` biarkan kosong kalau frontend dan API served dari domain yang
sama. Jangan diisi `*`: wildcard bersama cookie session berarti situs mana pun
bisa membaca respons API.

## 4. Build & jalan

```bash
npm install
npm run dev     # Vite di :5173 + Express di :3000, /api diproksi Vite
```

Untuk produksi:

```bash
npm run build            # hasil di dist/
NODE_ENV=production npm run server
```

Di mode produksi Express melayani `dist/` sekaligus fallback ke `index.html`,
jadi `/admin` bisa dibuka langsung.

> `VITE_GAS_WEBAPP_URL` dan `VITE_GAS_API_KEY` dibaca browser saat build.
> Isi `.env` dulu, baru `npm run build`. Mengganti nilainya tanpa build ulang
> tidak mengubah apa pun di sisi klien.

## 5. Login admin

Buka `/admin`, masuk dengan `ADMIN_USERNAME` dan `ADMIN_PIN`.

PIN awal hanya berlaku untuk seed pertama. Setelah akun ada, nilai `ADMIN_PIN`
di `.env` diabaikan — ganti PIN dari tab **Keamanan** di panel.

## Catatan keamanan

- PIN dicocokkan di server dengan bcrypt. Tidak ada PIN, token, atau
  `localStorage` di dalam bundle frontend.
- Session memakai cookie `HttpOnly` + `SameSite=Lax`, berlaku 8 jam.
- Route yang tidak terdaftar di `server/kebijakan.js` otomatis butuh admin,
  jadi route baru default-nya tertutup.
- Skor IGA dan status persetujuan inovasi dihitung dan ditetapkan server.
  Nilai yang dikirim browser diabaikan, jadi body JSON yang dirakit manual
  tidak bisa membuat usulan yang tayang tanpa review.
- `GET /api/init` tidak mengirim kolom `url` dokumen. Tautan diambil satu per
  satu lewat `GET /api/dokumen/:id/file` saat pengunjung benar-benar menekan
  tombol Lihat, supaya satu request tidak menarik semua berkas sekaligus.
- Login dibatasi 5 kegagalan per kombinasi IP + username dalam 15 menit.
  Pembatas ini di memori proses dan hilang saat restart; ini bantalan, bukan
  kontrol utama.

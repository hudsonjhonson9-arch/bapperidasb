/**
 * BAPPERIDA SUMBA BARAT — Google Apps Script (upload file ke Google Drive)
 *
 * Berbeda dengan Code.gs ARSIP DIGITAL, skrip ini HANYA memegang file di Drive.
 * Metadata (judul, kategori, tanggal, ...) dikirim browser langsung ke server
 * native Express di /api/*. Tidak ada panggilan balik ke server dari sini:
 * metadata adalah urusan server, file adalah urusan Drive.
 *
 * Action yang tersedia (POST, body JSON):
 *   upload       { name, base64, mimeType, folderId? }  → { url, fileId, size }
 *   deleteFile   { fileId }                             → { message, fileId }
 *
 * Deploy:
 *   1. Buka https://script.google.com → New project
 *   2. Paste kode ini, simpan
 *   3. Run checkDrivePermissions() sekali di editor (mendaftarkan scope OAuth)
 *   4. Deploy → New deployment → Web app
 *      Execute as: Me · Access: Anyone
 *   5. Isi API_KEY di bawah dengan nilai yang sama seperti GAS_API_KEY di .env
 *   6. Salin URL web app ke VITE_GAS_WEBAPP_URL (frontend) dan GAS_WEBAPP_URL (server)
 *
 * Folder Drive: ganti DRIVE_FOLDER_ID dengan ID folder tujuan.
 * Cara mencari ID: buka folder di Drive, lihat URL —
 *   https://drive.google.com/drive/folders/1AbCdEf... → ID-nya 1AbCdEf...
 */

// ── KONFIGURASI (ubah sesuai lingkungan) ────────────────────────────────────
var DRIVE_FOLDER_ID = 'GANTI_DENGAN_ID_FOLDER_DRIVE';
var API_KEY         = '';        // samakan dengan GAS_API_KEY di .env server

// Batas ukuran file. Di sisi klien (src/api.js) juga ada batas 5 MB; angka ini
// adalah pengaman terakhir kalau ada pemanggil lain yang mengirim lebih besar.
// Batas Apps Script juga ada (~50 MB untuk POST), tapi jangan bergantung pada itu:
// request sebesar itu bisa ditolak tanpa penjelasan yang berguna.
var MAKS_BYTES = 8 * 1024 * 1024;

function json(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var params;
    try {
      params = JSON.parse(e.postData.contents);
    } catch (err) {
      return json({ error: 'Request body harus berupa JSON' });
    }
    if (!params) return json({ error: 'Request body kosong' });

    // Gerbang API key. Tanpa ini, URL web app Anyone bisa dipakai siapa saja untuk
    // menaruh file mentah ke Drive dan membebani kuota.
    if (API_KEY) {
      var key = (e.parameter && e.parameter['x-gas-key']) ||
                (params['x-gas-key']) ||
                (e.postData.headers && e.postData.headers['x-gas-key']);
      if (key !== API_KEY) {
        return json({ error: 'API key tidak valid' });
      }
    }

    var action = params.action || 'upload';

    if (action === 'upload') {
      if (!params.name || !params.base64) {
        return json({ error: 'name dan base64 wajib diisi' });
      }
      return upload(params);
    }

    if (action === 'deleteFile') {
      if (!params.fileId) return json({ error: 'fileId wajib diisi' });
      return hapus(params.fileId);
    }

    return json({ error: 'action tidak dikenal: ' + action });

  } catch (err) {
    return json({ error: err && err.message ? err.message : String(err) });
  }
}

function upload(params) {
  // base64 dari browser berbentuk data URL: "data:image/png;base64,iVBOR..."
  // utilities.base64Decode menolak karakter non-base64, jadi prefix-nya dibuang dulu.
  var base64 = String(params.base64).replace(/^data:[^;]+;base64,/, '');
  var mime   = params.mimeType || 'application/octet-stream';
  var bytes  = Utilities.base64Decode(base64);

  if (bytes.length > MAKS_BYTES) {
    return json({
      error: 'File terlalu besar (' + Math.round(bytes.length / 1024 / 1024) +
             ' MB). Maksimal ' + Math.round(MAKS_BYTES / 1024 / 1024) + ' MB.'
    });
  }

  var blob   = Utilities.newBlob(bytes, mime, params.name);
  var parent = params.folderId ? params.folderId : DRIVE_FOLDER_ID;
  var file;

  if (parent && parent.indexOf('GANTI_DENGAN') !== 0) {
    file = DriveApp.getFolderById(parent).createFile(blob);
  } else {
    // Folder belum diisi di konfigurasi. Jangan gagalkan upload; simpan di root
    // dan biarkan admin yang memindahkannya. Menolak upload karena satu ID salah
    // lebih buruk daripada file yang berantakan di Drive.
    file = DriveApp.getRootFolder().createFile(blob);
  }

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return json({
    url:    file.getUrl(),
    fileId: file.getId(),
    name:   file.getName(),
    size:   bytes.length,
  });
}

function hapus(fileId) {
  // Terima URL juga, bukan hanya ID, supaya pemanggil boleh mengirim apa yang
  // tersimpan di database tanpa perlu memotong sendiri.
  var id = String(fileId);
  var m = id.match(/\/d\/([a-zA-Z0-9_-]+)/) || id.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m) id = m[1];

  try {
    DriveApp.getFileById(id).setTrashed(true);
    return json({ message: 'File berhasil dihapus', fileId: id });
  } catch (e1) {
    try {
      DriveApp.getFolderById(id).setTrashed(true);
      return json({ message: 'Folder berhasil dihapus', fileId: id });
    } catch (e2) {
      return json({ error: 'File/folder tidak ditemukan di Drive: ' + id });
    }
  }
}

function doGet() {
  return ContentService
    .createTextOutput('BAPPERIDA Sumba Barat — Drive Uploader OK. Folder: ' + DRIVE_FOLDER_ID)
    .setMimeType(ContentService.MimeType.TEXT);
}

function doOptions() {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

// Panggil fungsi ini sekali di editor Apps Script agar scope OAuth Google Drive
// terdaftar. Tanpa langkah ini, deployment pertama gagal saat upload pertama.
function checkDrivePermissions() {
  DriveApp.getRootFolder();
}
-- =============================================================================
-- BAPPERIDA SUMBA BARAT — skema database
--
-- Semua DDL di file ini idempotent (IF NOT EXISTS), jadi aman dijalankan berulang
-- dan aman dijalankan di database yang sudah dipakai n8n (n8n_storage) maupun di
-- database baru. Kolom memakai nama yang sama persis dengan yang dibaca workflow
-- n8n sebelum dihapus, supaya data lama tidak perlu dimigrasi.
--
-- Cara pakai:
--   psql "$DATABASE_URL" -f db/schema.sql
--
-- Catatan: bapperida_dokumen juga dipakai ARSIP DIGITAL, yang menambah beberapa
-- kolom (file_type, status, files, tags, uploader_id, ...). Skema ini tidak
-- menyentuhnya di luar ADD COLUMN IF NOT EXISTS, jadi kedua situs bisa berbagi
-- satu tabel tanpa saling menimpa kolom.
-- =============================================================================

-- ── Berita ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bapperida_berita (
  id           SERIAL PRIMARY KEY,
  judul        TEXT        NOT NULL,
  konten       TEXT        NOT NULL DEFAULT '',
  kategori     TEXT        NOT NULL DEFAULT '',
  tanggal      DATE,
  gambar_data  TEXT        NOT NULL DEFAULT '',
  emoji        TEXT        NOT NULL DEFAULT '',
  is_featured  BOOLEAN     NOT NULL DEFAULT FALSE,
  priority     INTEGER     NOT NULL DEFAULT 0,
  layout_size  TEXT        NOT NULL DEFAULT 'normal',
  col_span     INTEGER     NOT NULL DEFAULT 1,
  row_span     INTEGER     NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Urutan tampil: priority naik, lalu id terbaru duluan.
CREATE INDEX IF NOT EXISTS bapperida_berita_priority_idx
  ON public.bapperida_berita (priority, id DESC);

-- ── Dokumen Publik ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bapperida_dokumen (
  id          SERIAL PRIMARY KEY,
  judul       TEXT        NOT NULL,
  kategori    TEXT        NOT NULL DEFAULT '',
  tipe        TEXT        NOT NULL DEFAULT 'PDF',
  ukuran      TEXT        NOT NULL DEFAULT '',
  tanggal     DATE,
  icon_data   TEXT        NOT NULL DEFAULT '',
  publik      BOOLEAN     NOT NULL DEFAULT FALSE,
  url         TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Halaman publik selalu menyaring publik = TRUE, jadi indeksnya sebagian.
CREATE INDEX IF NOT EXISTS bapperida_dokumen_publik_idx
  ON public.bapperida_dokumen (publik, id DESC);

-- ── Slider Hero ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bapperida_slider (
  id          SERIAL PRIMARY KEY,
  gambar_data TEXT        NOT NULL DEFAULT '',
  judul       TEXT        NOT NULL DEFAULT '',
  subjudul    TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Program & Kegiatan ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bapperida_program (
  id         SERIAL PRIMARY KEY,
  icon_data  TEXT        NOT NULL DEFAULT '',
  title      TEXT        NOT NULL,
  cat        TEXT        NOT NULL DEFAULT '',
  "desc"     TEXT        NOT NULL DEFAULT '',
  status     TEXT        NOT NULL DEFAULT '',
  sc         TEXT        NOT NULL DEFAULT '',
  priority   INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bapperida_program_priority_idx
  ON public.bapperida_program (priority, id);

-- ── Capaian Kinerja (angka di hero) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bapperida_metrics (
  id         SERIAL PRIMARY KEY,
  label      TEXT        NOT NULL,
  value      TEXT        NOT NULL DEFAULT '',
  icon       TEXT        NOT NULL DEFAULT '',
  priority   INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Inovasi Daerah (kiriman OPD, disetujui manual admin) ────────────────────
CREATE TABLE IF NOT EXISTS public.bapperida_inovasi (
  id                SERIAL PRIMARY KEY,
  opd_nama          TEXT        NOT NULL DEFAULT '',
  judul_inovasi     TEXT        NOT NULL,
  nama_inovator     TEXT        NOT NULL DEFAULT '',
  jenis_inovasi     TEXT        NOT NULL DEFAULT '',
  tahapan_inovasi   TEXT        NOT NULL DEFAULT '',
  rancang_bangun    TEXT        NOT NULL DEFAULT '',
  link_video        TEXT        NOT NULL DEFAULT '',
  dokumen_dukung    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  skor_iga          INTEGER     NOT NULL DEFAULT 0,
  kategori_skor     TEXT        NOT NULL DEFAULT 'Kurang',
  regulasi_inovasi  TEXT        NOT NULL DEFAULT '',
  anggaran_inovasi  TEXT        NOT NULL DEFAULT '',
  waktu_uji_coba    DATE,
  waktu_penerapan   DATE,
  -- 'Pending' -> hanya terlihat di admin. 'Approved' -> tampil di situs publik
  -- dan ikut urut berdasarkan skor IGA.
  status_approval   TEXT        NOT NULL DEFAULT 'Pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bapperida_inovasi_status_idx
  ON public.bapperida_inovasi (status_approval, skor_iga DESC);

-- ── Pesan dari form kontak ──────────────────────────────────────────────────
-- n8n hanya meneruskan pesan lewat email, jadi isinya hilang begitu kiriman
-- selesai. Di sini pesan disimpan supaya tetap terbaca di panel admin.
CREATE TABLE IF NOT EXISTS public.bapperida_pesan (
  id         SERIAL PRIMARY KEY,
  nama       TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  subjek     TEXT        NOT NULL DEFAULT '',
  pesan      TEXT        NOT NULL DEFAULT '',
  dibaca     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bapperida_pesan_created_idx
  ON public.bapperida_pesan (created_at DESC);

-- ── Akun admin ──────────────────────────────────────────────────────────────
-- PIN disimpan sebagai hash bcrypt, bukan teks polos. Tanpa ini, siapa pun yang
-- bisa membaca baris tabel ini tahu PIN seluruh admin.
CREATE TABLE IF NOT EXISTS public.bapperida_admin (
  id         SERIAL PRIMARY KEY,
  username   TEXT        NOT NULL UNIQUE,
  nama       TEXT        NOT NULL DEFAULT '',
  pin_hash   TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'admin',
  aktif      BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
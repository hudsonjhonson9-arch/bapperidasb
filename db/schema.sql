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
--
-- PENTING untuk database yang sudah berisi data (mis. n8n_storage):
-- CREATE TABLE IF NOT EXISTS akan MELOMPATI tabel yang sudah ada, termasuk
-- kolom-kolom yang belum ada di dalamnya. Blok ALTER TABLE di paling bawah
-- karena itu wajib: tanpa blok itu, server tetap menulis updated_at dan
-- setiap INSERT/UPDATE berakhir "column updated_at does not exist".
-- Urutan aman: jalankan file ini dua kali, hasil kedua tidak mengubah apa pun.
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

-- =============================================================================
-- Lengkapi tabel yang sudah ada sebelum migrasi ini
--
-- Dipakai database yang sudah berisi data (n8n_storage produksi, dan arsip-digital
-- yang berbagi bapperida_dokumen). Kolom berikut tidak ada di tabel-tabel itu,
-- padahal server membutuhkannya di setiap INSERT, UPDATE, dan ringkasan.
--
-- Semua pernyataan di sini idempotent dan hanya menambah kolom yang belum ada,
-- jadi aman dijalankan berulang dan tidak menyentuh data atau kolom milik situs
-- lain. DEFAULT NOW() hanya berlaku untuk baris yang sudah ada, jadi 57 dokumen
-- lama tidak berubah jadi NULL.
--
-- Diverifikasi terhadap n8n_storage (PostgreSQL 16.13): sebelum blok ini,
-- 6 dari 13 query server gagal dengan "column updated_at does not exist".
-- =============================================================================

ALTER TABLE public.bapperida_berita   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.bapperida_dokumen  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.bapperida_slider   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.bapperida_program  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.bapperida_inovasi  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- bapperida_metrics di n8n_storage BERBEDA dari definisi di atas:
-- kolom id-nya VARCHAR berisi kode seperti 'ipd_2025' / 'sakip_2025', bukan
-- SERIAL. Karena itu kolom id tidak boleh diubah tipenya dan tidak boleh
-- diberi DEFAULT sequence: default-nya harus berupa teks, bukan angka.
--
-- Kolom id itu dipakai sebagai kunci saat mengedit metrik, jadi harus selalu
-- terisi. Form admin tidak punya kolom id, jadi INSERT dari panel akan
-- datang tanpa id; DEFAULT di bawah yang menutupinya. Format 'm_' + hash
-- dipakai supaya tidak mungkin bentrok dengan kode lama seperti 'ipd_2025'.
ALTER TABLE public.bapperida_metrics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.bapperida_metrics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.bapperida_metrics ALTER COLUMN label SET DEFAULT '';
ALTER TABLE public.bapperida_metrics ALTER COLUMN value SET DEFAULT '';
ALTER TABLE public.bapperida_metrics ALTER COLUMN icon SET DEFAULT '';
ALTER TABLE public.bapperida_metrics ALTER COLUMN priority SET DEFAULT 0;

-- DEFAULT id hanya dipasang kalau kolomnya bertipe teks. Di database baru
-- (tabel dibuat dari definisi SERIAL di atas) id sudah punya DEFAULT sequence,
-- jadi jangan ditimpa: DEFAULT text di kolom integer akan ditolak PostgreSQL.
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bapperida_metrics' AND column_name = 'id')
     IN ('character varying', 'character', 'text') THEN
    EXECUTE $ddl$
      ALTER TABLE public.bapperida_metrics
        ALTER COLUMN id SET DEFAULT ('m_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12))
    $ddl$;
  END IF;
END $$;

-- created_at/updated_at tidak ada di tabel lama, jadi belum ada baris lama yang
-- punya keduanya. Kalau ternyata kolomnya sudah ada dengan baris NULL (mis.
-- ditambahkan manual tanpa DEFAULT), isi sekarang supaya urutannya masuk akal.
UPDATE public.bapperida_metrics SET created_at = NOW() WHERE created_at IS NULL;
UPDATE public.bapperida_metrics SET updated_at = NOW() WHERE updated_at IS NULL;
// Panel admin BAPPERIDA. Dimuat sebagai chunk terpisah dari situs publik.
// Navigasi memakai hash (#berita, #pesan, ...) supaya bisa di-bookmark.
import { useState, useEffect, useCallback, useRef } from "react";
import {
  PanelLeftClose, PanelLeftOpen, LayoutDashboard, Newspaper, FileText, Images, ListChecks, Gauge, Lightbulb, Mail,
  ShieldCheck, LogOut, Search, Plus, X, Pencil, Trash2, ExternalLink, ChevronLeft, ChevronRight, Check,
  LayoutGrid, Table2, Play, Upload, Loader2, Image as IkonGambar,
} from "lucide-react";
import {
  api, sesi, login, logout, gantiPin, ringkasan,
  unggahFile, MAKS_UPLOAD, formatBytes, thumbDrive, tautanLangsung,
} from "./api";
import { useDaftar, kosongkanCache, jalankan } from "./admin/data";
import "./admin/tema.css";

const UKURAN = 15;
const tgl = (v) => (v ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—");

// ── Elemen kecil ────────────────────────────────────────────────────────────

// Kalau logo gagal dimuat, tampilkan monogram supaya tata letak tidak berlubang.
function Logo({ ukuran = 36 }) {
  const [rusak, setRusak] = useState(false);
  return rusak
    ? <span className="logo-cadangan" style={{ width: ukuran, height: ukuran }} aria-hidden="true">B</span>
    : <img src="/logo.png" alt="" width={ukuran} style={{ height: "auto", maxHeight: ukuran * 1.15 }} onError={() => setRusak(true)} />;
}

const Tombol = ({ variasi = "", kecil, ...p }) => (
  <button type="button" {...p} className={`tbl ${variasi} ${kecil ? "kecil" : ""}`} />
);

function Kolom({ label, wajib, petunjuk, children }) {
  return (
    <div className="kol">
      <label>{label}{wajib && <span className="bintang"> *</span>}{children}</label>
      {petunjuk && <div className="petunjuk">{petunjuk}</div>}
    </div>
  );
}

// Label membungkus input, jadi klik label memfokuskan input. Untuk blok yang
// berisi beberapa kontrol (unggah gambar) dipakai div + .lbl.
function Blok({ label, wajib, petunjuk, children }) {
  return (
    <div className="kol">
      <div className="lbl">{label}{wajib && <span className="bintang"> *</span>}</div>
      {children}
      {petunjuk && <div className="petunjuk">{petunjuk}</div>}
    </div>
  );
}

function Rangka({ baris = 5 }) {
  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }} aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: baris }, (_, i) => <div key={i} className="rangka" style={{ width: `${92 - (i % 3) * 14}%` }} />)}
    </div>
  );
}

function Modal({ judul, sub, tag, lebar, onTutup, children, kaki }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onTutup();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onTutup]);
  return (
    <div className="tirai tengah" onMouseDown={(e) => e.target === e.currentTarget && onTutup()}>
      <div className={`modal${lebar ? " lebar" : ""}`} role="dialog" aria-modal="true" aria-label={judul}>
        <header>
          <div className="kepala-m">
            <h2>{judul}</h2>
            {sub && <p className="sub">{sub}</p>}
          </div>
          <div className="aksi-m">
            {tag}
            <Tombol variasi="sunyi ikon" aria-label="Tutup" onClick={onTutup}><X size={16} /></Tombol>
          </div>
        </header>
        {children}
        {kaki}
      </div>
    </div>
  );
}

function Konfirmasi({ judul, isi, label = "Hapus", onBatal, onYa }) {
  const [sibuk, setSibuk] = useState(false);
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onBatal();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onBatal]);
  return (
    <div className="tirai tengah" onMouseDown={(e) => e.target === e.currentTarget && onBatal()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={judul}>
        <h2>{judul}</h2>
        <p className="redup">{isi}</p>
        <div className="aksi-d">
          <Tombol variasi="sunyi" onClick={onBatal}>Batal</Tombol>
          <Tombol variasi="bahaya" disabled={sibuk} onClick={async () => { setSibuk(true); try { await onYa(); } finally { setSibuk(false); } }}>
            {sibuk ? "Menghapus…" : label}
          </Tombol>
        </div>
      </div>
    </div>
  );
}

// ── Unggah: dropzone untuk gambar dan berkas ────────────────────────────────
// Dua tempat memakai ini: gambar berita (langsung diunggah saat dipilih) dan
// berkas dokumen (menunggu tombol Simpan). Yang membedakan hanya kapan file
// dikirim ke Drive, jadi validasi, seret-lepas, dan tampilannya dipakai bersama.

const tipeBerkas = (nama = "") => {
  const potong = String(nama).split(".");
  const akhir = potong[potong.length - 1];
  // Nama tanpa titik ("MYSK2026") tidak boleh dipakai mentah sebagai badge.
  return potong.length > 1 && akhir.length <= 5 ? akhir.toUpperCase() : "BERKAS";
};

function ZonaKosong({ ikon: Ikon, judul, petunjuk }) {
  return (
    <span className="zona-kosong">
      <Ikon size={22} aria-hidden="true" />
      <b>{judul}</b>
      <small>{petunjuk}</small>
    </span>
  );
}

function ZonaBukti({ badge, nama, ukuran, catatan }) {
  return (
    <span className="zona-bukti">
      <span className="jenis">{badge}</span>
      <span className="isi">
        <b>{nama}</b>
        {(ukuran || catatan) && <small>{[ukuran, catatan].filter(Boolean).join(" · ")}</small>}
      </span>
    </span>
  );
}

// Dropzone. Klik tombol di tengah membuka pemilih berkas; berkas juga bisa
// dijatuhkan di area mana pun di dalam kotak. Area aksi dan pesan galat berada
// di luar <button> supaya tidak ada elemen interaktif di dalam elemen interaktif.
function ZonaUnggah({ accept, onAmbil, sibuk, ada, galat, aksi, children }) {
  const [seret, setSeret] = useState(false);
  const ref = useRef(null);

  const serah = (files) => { const f = files?.[0]; if (f) onAmbil(f); };

  return (
    <div
      className={`zona${seret ? " seret" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setSeret(false); }}
      onDrop={(e) => { e.preventDefault(); setSeret(false); serah(e.dataTransfer.files); }}
    >
      <button type="button" className="zona-tombol" disabled={sibuk}
        onClick={() => ref.current?.click()}
        aria-label={ada ? "Ganti berkas" : "Pilih berkas"}>
        {children}
      </button>
      <input ref={ref} type="file" accept={accept} hidden
        onChange={(e) => { serah(e.target.files); e.target.value = ""; }} />
      {aksi && <div className="zona-aksi">{aksi}</div>}
      {galat && <div className="galat" role="alert" style={{ marginTop: 8 }}>{galat}</div>}
    </div>
  );
}

function FieldGambar({ label, wajib, value, onChange }) {
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState(null);
  const [terpilih, setTerpilih] = useState(null);

  const pilih = async (file) => {
    setGalat(null);
    // Ukuran dicek sebelum memanggil unggahFile(): berkas diubah jadi base64 dan
    // encode-nya memblokir thread, jadi file sebesar ini akan membekukan tab
    // sebelum ada permintaan yang sempat terkirim.
    if (file.size > MAKS_UPLOAD) {
      setGalat(`Ukuran file terlalu besar (${formatBytes(file.size)}). Maksimal ${formatBytes(MAKS_UPLOAD)}.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setGalat("Berkas yang dipilih bukan gambar.");
      return;
    }
    setSibuk(true);
    try {
      const h = await unggahFile(file);
      setTerpilih({ nama: h.name || file.name, ukuran: formatBytes(h.size ?? file.size) });
      onChange(h.url);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setSibuk(false);
    }
  };

  const lepas = () => { setTerpilih(null); setGalat(null); onChange(""); };

  return (
    <Blok label={label} wajib={wajib} petunjuk={`Maksimal ${formatBytes(MAKS_UPLOAD)}. Dikirim langsung ke Google Drive.`}>
      <ZonaUnggah
        accept="image/*"
        onAmbil={pilih}
        sibuk={sibuk}
        ada={Boolean(value)}
        galat={galat}
        aksi={value && !sibuk && <Tombol kecil variasi="sunyi" onClick={lepas}>Lepas gambar</Tombol>}
      >
        {sibuk ? (
          <span className="zona-sibuk"><Loader2 size={17} className="putar" aria-hidden="true" /> Mengunggah…</span>
        ) : value ? (
          <>
            <img className="zona-gambar" src={thumbDrive(value, 440)} alt={terpilih?.nama || "Pratinjau gambar"} />
            <span className="zona-keterangan">
              <b>{terpilih?.nama || "Gambar saat ini"}</b>
              <small>{[terpilih?.ukuran, "klik untuk mengganti"].filter(Boolean).join(" · ")}</small>
            </span>
          </>
        ) : (
          <ZonaKosong ikon={IkonGambar} judul="Pilih gambar atau seret ke sini"
            petunjuk={`JPG, PNG, atau WebP · maksimal ${formatBytes(MAKS_UPLOAD)}`} />
        )}
      </ZonaUnggah>
    </Blok>
  );
}

// ── Pemilih tata letak grid ─────────────────────────────────────────────────
// Grid beranda selalu 4 kolom. Angka saja sulit dibaca, jadi berita ini
// digambar sebagai miniatur 4×2 dan selnya bisa diklik untuk menentukan
// berapa kolom × baris yang dipakai.
const KOLOM_GRID = 4;
const BARIS_GRID = 2;

function FieldGrid({ col, row, onChange }) {
  const c = Math.min(Math.max(Number(col) || 1, 1), KOLOM_GRID);
  const r = Math.min(Math.max(Number(row) || 1, 1), BARIS_GRID);
  return (
    <Blok label="Tata letak di beranda"
      petunjuk={`Klik sel pada miniatur. Berita ini memakai ${c} kolom × ${r} baris dari grid ${KOLOM_GRID} × ${BARIS_GRID}.`}>
      <div className="grid-pilih" role="group" aria-label="Tata letak berita di grid beranda">
        {Array.from({ length: KOLOM_GRID * BARIS_GRID }, (_, i) => {
          const kc = (i % KOLOM_GRID) + 1;
          const kr = Math.floor(i / KOLOM_GRID) + 1;
          return (
            <button
              type="button"
              key={i}
              className={`sel-grid${kc <= c && kr <= r ? " dipakai" : ""}`}
              aria-pressed={kc === c && kr === r}
              title={`${kc} kolom × ${kr} baris`}
              onClick={() => onChange(kc, kr)}
            />
          );
        })}
      </div>
    </Blok>
  );
}

// ── Definisi modul ──────────────────────────────────────────────────────────
// `kolom` = isi formulir (server tetap memvalidasi). `detail` = isi lengkap
// diambil per baris saat formulir dibuka, karena daftar tidak membawanya.

const FORMULIR = {
  berita: {
    judul: "Berita", detail: true,
    baru: { is_featured: false, col_span: 1, row_span: 1 },
    kolom: [
      { name: "judul", label: "Judul berita", wajib: true },
      { name: "kategori", label: "Kategori" },
      { name: "tanggal", label: "Tanggal", tipe: "date" },
      { name: "gambar_url", label: "Gambar berita", gambar: true },
      { name: "priority", label: "Urutan", tipe: "number", petunjuk: "Angka kecil tampil lebih dulu." },
      { name: "is_featured", label: "Jadikan berita unggulan", tipe: "checkbox" },
      // `tulis` = kolom yang diisi pemilih visual, bukan lewat input biasa.
      { name: "grid", label: "Tata letak di beranda", virtual: true, grid: true, tulis: ["col_span", "row_span"] },
      { name: "konten", label: "Isi berita", tipe: "textarea" },
    ],
  },
  dokumen: {
    judul: "Dokumen", baru: { publik: true, tipe: "PDF" },
    kolom: [
      { name: "judul", label: "Judul dokumen", wajib: true },
      { name: "kategori", label: "Kategori" },
      { name: "tipe", label: "Tipe (PDF, XLSX, DOCX)" },
      { name: "ukuran", label: "Ukuran" },
      { name: "tanggal", label: "Tanggal terbit", tipe: "date" },
      { name: "publik", label: "Tampilkan di situs publik", tipe: "checkbox" },
    ],
  },
  slider: {
    judul: "Slider",
    kolom: [
      { name: "gambar_url", label: "Gambar slider", wajib: true, gambar: true },
      { name: "judul", label: "Judul teks" },
      { name: "subjudul", label: "Subjudul" },
    ],
  },
  program: {
    judul: "Program", detail: true,
    kolom: [
      { name: "title", label: "Nama program", wajib: true },
      { name: "cat", label: "Kategori" },
      { name: "status", label: "Status" },
      { name: "sc", label: "Sasaran" },
      { name: "priority", label: "Urutan", tipe: "number" },
      { name: "desc", label: "Deskripsi", tipe: "textarea" },
    ],
  },
  metrics: {
    judul: "Metrik",
    kolom: [
      { name: "label", label: "Label", wajib: true, petunjuk: "Label tidak bisa diubah setelah dibuat; ubah angkanya saja." },
      { name: "value", label: "Nilai", wajib: true },
      { name: "priority", label: "Urutan", tipe: "number" },
    ],
  },
};

// Kolom tabel per modul. `c` menerima satu baris.
// Tanpa gambar, sel memakai ikon modul — bukan emoji.
const Ikon = ({ b, Ikon: IkonDefault }) => (
  b.gambar_url
    ? <img className="mini" src={thumbDrive(b.gambar_url, 96)} alt="" width="48" height="48" loading="lazy" decoding="async" />
    : <span className="mini" aria-hidden="true">{IkonDefault ? <IkonDefault size={22} /> : <FileText size={22} />}</span>
);
const Judul = ({ b, t, sub, Ikon: IkonDefault }) => (
  <div className="sel-judul"><Ikon b={b} Ikon={IkonDefault} /><div><b>{t}</b>{sub && <small>{sub}</small>}</div></div>
);

const TABEL = {
  berita: [
    ["Berita", (b) => <Judul b={b} t={b.judul} sub={b.kategori} Ikon={Newspaper} />],
    ["Tanggal", (b) => <span className="num">{tgl(b.tanggal)}</span>],
    ["Status", (b) => b.is_featured ? <span className="lencana-s ok">Unggulan</span> : <span className="redup">—</span>],
    ["Urutan", (b) => <span className="num">{b.priority ?? "—"}</span>],
  ],
  dokumen: [
    ["Dokumen", (b) => <Judul b={b} t={b.judul} sub={[b.kategori, b.tipe, b.ukuran].filter(Boolean).join(" · ")} Ikon={FileText} />],
    ["Tanggal", (b) => <span className="num">{tgl(b.tanggal)}</span>],
    ["Tampil", (b) => <span className={`lencana-s ${b.publik ? "ok" : ""}`}>{b.publik ? "Publik" : "Disembunyikan"}</span>],
    ["Berkas", (b) => b.url ? <a href={tautanLangsung(b.url)} target="_blank" rel="noreferrer">Buka <ExternalLink size={12} /></a> : "—"],
  ],
  slider: [
    ["Slide", (b) => <Judul b={b} t={b.judul || "(tanpa judul)"} sub={b.subjudul} Ikon={Images} />],
  ],
  program: [
    ["Program", (b) => <Judul b={b} t={b.title} sub={b.cat} Ikon={ListChecks} />],
    ["Status", (b) => b.status ? <span className="lencana-s">{b.status}</span> : "—"],
    ["Sasaran", (b) => b.sc || "—"],
    ["Urutan", (b) => <span className="num">{b.priority ?? "—"}</span>],
  ],
  metrics: [
    ["Metrik", (b) => <Judul b={b} t={b.label} Ikon={Gauge} />],
    ["Nilai", (b) => <b className="num">{b.value}</b>],
    ["Urutan", (b) => <span className="num">{b.priority ?? "—"}</span>],
  ],
  inovasi: [
    ["Usulan", (b) => <Judul b={b} t={b.judul_inovasi} sub={[b.opd_nama, b.nama_inovator].filter(Boolean).join(" · ")} Ikon={Lightbulb} />],
    ["Skor IGA", (b) => <span className="num"><b>{b.skor_iga}</b> <span className="lencana-s">{b.kategori_skor}</span></span>],
    ["Status", (b) => <span className={`lencana-s ${b.status_approval === "Approved" ? "ok" : "tunggu"}`}>{b.status_approval === "Approved" ? "Disetujui" : "Menunggu"}</span>],
    ["Masuk", (b) => <span className="num">{tgl(b.created_at)}</span>],
  ],
};

const JUDUL_MODUL = {
  berita: ["Berita", "Berita dan kegiatan di beranda situs."],
  dokumen: ["Dokumen", "Berkas yang bisa diunduh pengunjung."],
  slider: ["Slider", "Gambar besar di bagian atas beranda."],
  program: ["Program", "Program dan kegiatan unggulan."],
  metrics: ["Metrik", "Angka ringkas di beranda."],
  inovasi: ["Usulan inovasi", "Usulan dari OPD. Yang belum disetujui tidak tampil di situs publik."],
};

// ── Formulir (laci) ─────────────────────────────────────────────────────────

function FormItem({ modul, item, onTutup, onSelesai }) {
  const def = FORMULIR[modul];
  const edit = Boolean(item.id);
  const [nilai, setNilai] = useState(null);
  const [berkas, setBerkas] = useState(null);
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const urlLama = item.url || "";
  // Nilai tipe dan ukuran milik berkas yang tersimpan. Tanpa ini, memilih lalu
  // membuang berkas baru akan meninggalkan ukuran berkas yang sudah dibuang.
  const asli = useRef({});

  useEffect(() => {
    let batal = false;
    (async () => {
      let dasar = item;
      if (edit && def.detail) {
        try { dasar = await jalankan(() => api.get(`/${modul}/${item.id}`)); }
        catch (e) { if (!batal) setGalat(e.message); return; }
      }
      if (batal) return;
const awal = {};
      for (const k of def.kolom) {
        if (k.virtual) {
          // Kolom virtual (mis. pemilih grid) tidak punya input sendiri, tapi
          // nilai yang ditampilkan batasannya tetap harus terbawa dari data
          // lama supaya berita 2x2 tidak tampak sebagai 1x1 saat diedit.
          for (const n of k.tulis || []) awal[n] = dasar[n] ?? def.baru?.[n] ?? 1;
          continue;
        }
        awal[k.name] = dasar[k.name] ?? def.baru?.[k.name] ?? (k.tipe === "checkbox" ? false : "");
      }
      asli.current = { tipe: awal.tipe ?? "", ukuran: awal.ukuran ?? "" };
      setNilai(awal);
    })();
    return () => { batal = true; };
  }, [item, modul, edit, def]);

  const ubah = (n, v) => setNilai((s) => ({ ...s, [n]: v }));
  const ubahGrid = (col, row) => setNilai((s) => ({ ...s, col_span: col, row_span: row }));

  const pilihBerkas = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBerkas(f);
    const ext = (f.name.split(".").pop() || "").toUpperCase();
    setNilai((s) => ({ ...s, tipe: ext || s.tipe, ukuran: formatBytes(f.size), judul: s.judul || f.name.replace(/\.[^.]+$/, "") }));
  };

  // Memembalikan kolom berkas ke nilai semula. Judul tidak dikembalikan: nama
  // berkas baru hanya dipakai sebagai cadangan, jadi tidak ikut dibuang.
  const buangBerkas = () => {
    setBerkas(null);
    setNilai((s) => ({ ...s, ...asli.current }));
  };

  const kirim = async (e) => {
    e.preventDefault();
    setGalat(null);
    const data = {};
    for (const k of def.kolom) {
      if (k.virtual) {
        // Kolom virtual menulis ke state di luar daftar kolom, jadi harus
        // ikut dikirim eksplisit. Tanpa ini col_span/row_span tidak pernah
        // sampai ke server dan grid di situs tidak berubah.
        for (const n of k.tulis || []) data[n] = nilai[n];
        continue;
      }
      const v = nilai[k.name];
      if (k.tipe === "checkbox") data[k.name] = Boolean(v);
      else if (k.tipe === "number") {
        if (v === "" || v == null) data[k.name] = null;
        else {
          let n = Number(v);
          // Batasi rentang yang diizinkan server agar grid tidak pecah.
          if (!Number.isFinite(n)) return setGalat(`${k.label} harus berupa angka.`);
          if (k.min != null) n = Math.max(k.min, n);
          if (k.max != null) n = Math.min(k.max, n);
          data[k.name] = n;
        }
      }
      else data[k.name] = String(v ?? "").trim();
      if (k.gambar && k.wajib && !data[k.name]) return setGalat(`${k.label} wajib diisi.`);
    }
    setSibuk(true);
    try {
      if (modul === "dokumen" && (berkas || !edit)) {
        if (!berkas) throw new Error("Pilih berkas yang akan diunggah.");
        const h = await unggahFile(berkas);
        data.url = h.url;
        data.ukuran = formatBytes(h.size ?? berkas.size);
      }
      await jalankan(() => (edit ? api.put(`/${modul}/${item.id}`, data) : api.post(`/${modul}`, data)));
      onSelesai(edit ? "Perubahan disimpan." : `${def.judul} ditambahkan.`);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <Modal judul={`${edit ? "Edit" : "Tambah"} ${def.judul.toLowerCase()}`} onTutup={onTutup}
      kaki={<footer>
        <Tombol variasi="sunyi" onClick={onTutup}>Batal</Tombol>
        <button type="submit" form="form-item" className="tbl emas" disabled={sibuk || !nilai}>{sibuk ? "Menyimpan…" : "Simpan"}</button>
      </footer>}>
      <form id="form-item" className="badan" onSubmit={kirim}>
        {galat && <div className="galat" role="alert">{galat}</div>}
        {!nilai ? (galat ? null : <Rangka baris={6} />) : (
          <>
            {modul === "dokumen" && (
              <Blok label={edit ? "Ganti berkas" : "Berkas"} wajib={!edit}
                petunjuk={edit
                  ? `Kosongkan jika berkas tidak diganti. Berkas lama di Google Drive dihapus setelah menyimpan.${urlLama ? "" : " Dokumen ini belum punya berkas."}`
                  : `Maksimal ${formatBytes(MAKS_UPLOAD)}. Tipe dan ukuran terisi otomatis.`}>
                {/* Input file native dengan required dihapus: berkas sekarang
                    divalidasi di kirim(), jadi pesannya bisa ditulis sendiri dan
                    satu jalur galat berlaku untuk klik maupun seret-lepas. */}
                <ZonaUnggah
                  onAmbil={pilihBerkas}
                  ada={Boolean(berkas)}
                  aksi={berkas ? (
                    <Tombol kecil variasi="sunyi" onClick={buangBerkas}>Buang pilihan</Tombol>
                  ) : edit && urlLama ? (
                    <a className="tbl kecil sunyi" href={tautanLangsung(urlLama)} target="_blank" rel="noreferrer">
                      Buka berkas saat ini <ExternalLink size={12} />
                    </a>
                  ) : null}
                >
                  {berkas ? (
                    <ZonaBukti badge={tipeBerkas(berkas.name)} nama={berkas.name}
                      ukuran={formatBytes(berkas.size)} catatan="siap diunggah saat disimpan" />
                  ) : edit && urlLama ? (
                    <ZonaBukti badge={(nilai.tipe || "BERKAS").toUpperCase()}
                      nama={nilai.judul || "Berkas saat ini"} ukuran={nilai.ukuran} catatan="tidak diubah" />
                  ) : (
                    <ZonaKosong ikon={FileText} judul="Pilih berkas atau seret ke sini"
                      petunjuk={`Maksimal ${formatBytes(MAKS_UPLOAD)}`} />
                  )}
                </ZonaUnggah>
              </Blok>
            )}
            {def.kolom.map((k) => k.gambar ? (
              <FieldGambar key={k.name} label={k.label} wajib={k.wajib} value={nilai[k.name]} onChange={(v) => ubah(k.name, v)} />
            ) : k.grid ? (
              <FieldGrid key={k.name} col={nilai.col_span} row={nilai.row_span} onChange={ubahGrid} />
            ) : (
              <Kolom key={k.name} label={k.tipe === "checkbox" ? "" : k.label} wajib={k.wajib} petunjuk={k.petunjuk}>
                {k.tipe === "textarea" ? (
                  <textarea value={nilai[k.name]} onChange={(e) => ubah(k.name, e.target.value)} rows={8} />
                ) : k.tipe === "checkbox" ? (
                  <span className="centang"><input type="checkbox" checked={Boolean(nilai[k.name])} onChange={(e) => ubah(k.name, e.target.checked)} /> {k.label}</span>
                ) : (
                  <input type={k.tipe || "text"} value={nilai[k.name]} onChange={(e) => ubah(k.name, e.target.value)} required={k.wajib}
                    min={k.min} max={k.max} step={k.tipe === "number" ? 1 : undefined} />
                )}
              </Kolom>
            ))}
          </>
        )}
      </form>
    </Modal>
  );
}

// ── Detail usulan inovasi ───────────────────────────────────────────────────
// Redesain: admin memutuskan di dalam modal ini, jadi aksi Setujui pindah ke kaki
// modal — sebelumnya harus menutup modal dulu lalu menekan tombol di baris tabel.
// Isi proposal dibaca, bukan diisi, jadi tampilannya dipisahkan dari form.

const bandskor = (skor) => (skor >= 80 ? "tinggi" : skor >= 50 ? "sedang" : "rendah");
const dokumenOf = (d) => (Array.isArray(d?.dokumen_dukung) ? d.dokumen_dukung : []);
const disetujuiOf = (d) => d?.status_approval === "Approved";

// Satu pasangan label/nilai. Nilai kosong diberi "—" supaya tetap terbaca
// sebagai celah yang perlu diisi, bukan sekadar hilang.
function Pasangan({ label, nilai }) {
  return (
    <div className="di-pasangan">
      <dt>{label}</dt>
      <dd>{nilai || "—"}</dd>
    </div>
  );
}

// Pemaroian saja, tanpa pengambilan data. Dipisah dari DetailInovasi supaya
// bagian yang menentukan tampilan bisa diuji tanpa jaringan.
function IsiDetailInovasi({ d }) {
  const dokumen = dokumenOf(d);
  const skor = Number(d.skor_iga) || 0;

  return (
    <div className="di-tata">
      <div className="di-utama">
        <section className="di-kartu">
          <h3>Rancang bangun</h3>
          {d.rancang_bangun
            ? <p className="di-prosa">{d.rancang_bangun}</p>
            : <p className="redup">Tidak diisi pengusul.</p>}
        </section>

        <section className="di-kartu">
          <h3>Dokumen pendukung{dokumen.length > 0 && <span className="redup"> · {dokumen.length}</span>}</h3>
          {dokumen.length > 0 ? (
            <ul className="di-dok">
              {dokumen.map((x, i) => (
                <li key={i}>
                  <a href={tautanLangsung(x.url)} target="_blank" rel="noreferrer">
                    <span className={`jenis${x.type === "LINK" ? " tautan" : ""}`}>{x.type || "BERKAS"}</span>
                    <span className="isi-dok">
                      <b>{x.name || `Dokumen ${i + 1}`}</b>
                      {x.size && x.size !== "-" && <small>{x.size}</small>}
                    </span>
                    <ExternalLink size={14} />
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="redup">Tidak ada dokumen dilampirkan.</p>}
        </section>

        {d.link_video && (
          <section className="di-kartu">
            <h3>Video</h3>
            <a className="di-video" href={d.link_video} target="_blank" rel="noreferrer">
              <span className="main"><Play size={15} /> Buka video usulan</span>
              <span className="alamat">{d.link_video}</span>
            </a>
          </section>
        )}
      </div>

      <div className="di-sisi">
        <section className={`di-iskor ${bandskor(skor)}`}>
          <div className="angka">{skor}<small>/100</small></div>
          <div className="kategori">{d.kategori_skor || "Belum ada kategori"}</div>
          <div className="meter" role="img" aria-label={`Skor IGA ${skor} dari 100`}>
            <div className="isi" style={{ width: `${Math.min(100, Math.max(0, skor))}%` }} />
          </div>
        </section>

        <section className="di-kartu">
          <h3>Pengusul</h3>
          <dl className="di-meta">
            <Pasangan label="OPD" nilai={d.opd_nama} />
            <Pasangan label="Inovator" nilai={d.nama_inovator} />
          </dl>
        </section>

        <section className="di-kartu">
          <h3>Klasifikasi</h3>
          <dl className="di-meta">
            <Pasangan label="Jenis" nilai={d.jenis_inovasi} />
            <Pasangan label="Tahapan" nilai={d.tahapan_inovasi} />
          </dl>
        </section>

        <section className="di-kartu">
          <h3>Pelaksanaan</h3>
          <dl className="di-meta">
            <Pasangan label="Uji coba" nilai={tgl(d.waktu_uji_coba)} />
            <Pasangan label="Penerapan" nilai={tgl(d.waktu_penerapan)} />
            <Pasangan label="Anggaran" nilai={d.anggaran_inovasi} />
            <Pasangan label="Regulasi" nilai={d.regulasi_inovasi} />
          </dl>
        </section>
      </div>
    </div>
  );
}

function DetailInovasi({ id, onTutup, onSetujui }) {
  const [d, setD] = useState(null);
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    setD(null);
    setGalat(null);
    jalankan(() => api.get(`/inovasi/${id}`)).then(setD).catch((e) => setGalat(e.message));
  }, [id]);

  // onSetujui sudah menangani notifikasi dan penyegaran daftar di induk, jadi di
  // sini cukup status lokal yang diperbarui setelah berhasil.
  const setujui = async () => {
    setSibuk(true);
    try {
      await onSetujui(d);
      setD((v) => ({ ...v, status_approval: "Approved" }));
    } finally {
      setSibuk(false);
    }
  };

  const disetujui = disetujuiOf(d);

  return (
    <Modal
      lebar
      judul={d?.judul_inovasi || "Detail usulan"}
      sub={d ? `Diajukan ${tgl(d.created_at)}` : "Memuat data usulan…"}
      tag={d && <span className={`lencana-s ${disetujui ? "ok" : "tunggu"}`}>{disetujui ? "Disetujui" : "Menunggu"}</span>}
      onTutup={onTutup}
      kaki={
        <footer>
          <Tombol variasi="sunyi" onClick={onTutup}>Tutup</Tombol>
          {d && !disetujui && (
            <Tombol variasi="emas" disabled={sibuk} onClick={setujui}>
              <Check size={16} /> {sibuk ? "Menyetujui…" : "Setujui usulan"}
            </Tombol>
          )}
        </footer>
      }
    >
      <div className="badan">
        {galat && <div className="galat" role="alert">{galat}</div>}
        {!d && !galat && <Rangka baris={7} />}
        {d && <IsiDetailInovasi d={d} />}
      </div>
    </Modal>
  );
}

// ── Pratinjau grid berita ───────────────────────────────────────────────────
// Meniru perhitungan grid di beranda (App.jsx) supaya admin melihat hasil
// akhir yang sama, termasuk fallback untuk berita lama.
function petakGrid(item, idx) {
  let col = item.col_span || 1;
  let row = item.row_span || 1;
  if (!item.col_span && item.layout_size === "large") { col = 2; row = 2; }
  else if (!item.col_span && item.layout_size === "wide") { col = 2; row = 1; }
  else if (!item.col_span && item.layout_size === "tall") { col = 1; row = 2; }
  else if (!item.col_span && !item.layout_size && idx === 0) { col = 2; row = 2; }
  return { col: Math.min(Math.max(col, 1), KOLOM_GRID), row: Math.min(Math.max(row, 1), BARIS_GRID) };
}

function PratinjauGrid({ rows, pilih, onPilih }) {
  return (
    <div className="pratinjau-grid">
      {rows.map((b, idx) => {
        const { col, row } = petakGrid(b, idx);
        return (
          <div
            key={b.id}
            className={`kartu-grid${pilih === b.id ? " sel" : ""}`}
            style={{ gridColumn: `span ${col}`, gridRow: `span ${row}`, cursor: "pointer" }}
            onClick={() => onPilih(b.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPilih(b.id))}
            aria-label={`Edit berita ${b.judul || ""}`}
          >
            <span className="petak">{col}×{row}</span>
            <div className="gambar">
              {b.gambar_url
                // Kartu pratinjau selebar 225–385px tergantung lebar monitor
                // (sidebar 236px + padding, 4 kolom). 800px menutup 385px di
                // layar retina; 220px membuat pratinjau buram justru di monitor
                // besar.
                ? <img src={thumbDrive(b.gambar_url, 800)} alt="" loading="lazy" decoding="async" />
                : <Newspaper size={26} aria-hidden="true" />}
            </div>
            <div className="kaki"><b>{b.judul || "Tanpa judul"}</b></div>
          </div>
        );
      })}
    </div>
  );
}

// ── Modul daftar (berita, dokumen, slider, program, metrik, inovasi) ────────

function Modul({ modul, notif, segarkan, tambahAwal }) {
  const [judul, ket] = JUDUL_MODUL[modul];
  const def = FORMULIR[modul];
  const [cari, setCari] = useState("");
  const [halaman, setHalaman] = useState(0);
  const [form, setForm] = useState(tambahAwal && def ? {} : null);
  const [lihat, setLihat] = useState(null);
  const [hapus, setHapus] = useState(null);
  // Berita bisa dilihat sebagai tabel atau sebagai pratinjau grid seperti beranda.
  const [tampil, setTampil] = useState(modul === "berita" ? "grid" : "tabel");
  const [petak, setPetak] = useState(null);
  const { rows, total, memuat, galat, muatUlang } = useDaftar(modul, { q: cari.trim(), halaman, ukuran: UKURAN });
  const kolom = TABEL[modul];
  const nama = (b) => b.judul || b.title || b.label || b.judul_inovasi || `#${b.id}`;
  const akhir = Math.min((halaman + 1) * UKURAN, total);

  const sesudahUbah = (teks) => { setForm(null); notif(teks); muatUlang(); segarkan(); };

  const setujui = async (b) => {
    try { await jalankan(() => api.put(`/inovasi/${b.id}/setujui`)); notif("Usulan disetujui dan tampil di situs."); muatUlang(); segarkan(); }
    catch (e) { notif(e.message, false); }
  };

  return (
    <>
      <div className="kepala">
        <div><h1>{judul}</h1><p>{ket}</p></div>
        {def && <Tombol variasi="emas" onClick={() => setForm({})}><Plus size={16} /> Tambah {judul.toLowerCase()}</Tombol>}
      </div>

      <div className="panel">
        <div className="alat">
          <div className="cari">
            <Search size={15} aria-hidden="true" />
            <input type="search" placeholder={`Cari ${judul.toLowerCase()}`} aria-label={`Cari ${judul.toLowerCase()}`}
              value={cari} onChange={(e) => { setCari(e.target.value); setHalaman(0); }} />
          </div>
          {memuat && rows && <span className="redup" aria-live="polite">Memperbarui…</span>}
          {modul === "berita" && rows?.length > 0 && (
            <div className="ganti-tampil" role="group" aria-label="Tampilan daftar berita">
              <button type="button" className={tampil === "grid" ? "aktif" : ""} aria-pressed={tampil === "grid"} onClick={() => setTampil("grid")}><LayoutGrid size={14} /> Grid</button>
              <button type="button" className={tampil === "tabel" ? "aktif" : ""} aria-pressed={tampil === "tabel"} onClick={() => setTampil("tabel")}><Table2 size={14} /> Tabel</button>
            </div>
          )}
        </div>

        {galat && <div className="galat" style={{ margin: 14 }}>{galat} <Tombol kecil variasi="sunyi" onClick={muatUlang}>Coba lagi</Tombol></div>}
        {!rows && !galat ? <Rangka /> : rows && (rows.length === 0 ? (
          <div className="kosong"><b>{cari ? "Tidak ada hasil" : `Belum ada ${judul.toLowerCase()}`}</b>{cari ? "Coba kata kunci lain." : def ? "Pilih Tambah untuk membuat yang pertama." : "Usulan dari OPD akan muncul di sini."}</div>
        ) : tampil === "grid" ? (
          <div style={{ padding: 14 }}>
            <p className="petunjuk" style={{ margin: "0 0 12px" }}>Pratinjau tataletak di beranda. Klik kartu untuk mengubah ukuran.</p>
            <PratinjauGrid rows={rows} pilih={petak} onPilih={(id) => { setPetak(id); setForm(rows.find((b) => b.id === id)); }} />
          </div>
        ) : (
          <div className="bungkus">
            <table>
              <thead><tr>{kolom.map(([h]) => <th key={h}>{h}</th>)}<th><span className="sr" style={{ position: "absolute", left: -9999 }}>Aksi</span></th></tr></thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id}>
                    {kolom.map(([h, c]) => <td key={h}>{c(b)}</td>)}
                    <td className="aksi">
                      {modul === "inovasi" ? (
                        <>
                          <Tombol kecil variasi="sunyi" onClick={() => setLihat(b.id)}>Detail</Tombol>
                          {b.status_approval !== "Approved" && <Tombol kecil variasi="emas" onClick={() => setujui(b)}><Check size={14} /> Setujui</Tombol>}
                        </>
                      ) : (
                        <Tombol kecil variasi="sunyi ikon" aria-label={`Edit ${nama(b)}`} onClick={() => setForm(b)}><Pencil size={14} /></Tombol>
                      )}
                      <Tombol kecil variasi="sunyi ikon" aria-label={`Hapus ${nama(b)}`} onClick={() => setHapus(b)}><Trash2 size={14} /></Tombol>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {total > UKURAN && (
          <div className="halaman">
            <span className="num">{halaman * UKURAN + 1}–{akhir} dari {total}</span>
            <div>
              <Tombol kecil variasi="sunyi" disabled={halaman === 0} onClick={() => setHalaman((h) => h - 1)}><ChevronLeft size={14} /> Sebelumnya</Tombol>
              <Tombol kecil variasi="sunyi" disabled={akhir >= total} onClick={() => setHalaman((h) => h + 1)}>Berikutnya <ChevronRight size={14} /></Tombol>
            </div>
          </div>
        )}
      </div>

      {form && <FormItem modul={modul} item={form} onTutup={() => setForm(null)} onSelesai={sesudahUbah} />}
      {lihat && <DetailInovasi id={lihat} onTutup={() => setLihat(null)} onSetujui={setujui} />}
      {hapus && (
        <Konfirmasi judul={`Hapus ${judul.toLowerCase()}?`} onBatal={() => setHapus(null)}
          isi={<><strong>{nama(hapus)}</strong> akan dihapus permanen.{["dokumen", "berita", "slider"].includes(modul) && " Berkas di Google Drive ikut dihapus."}</>}
          onYa={async () => {
            try { await jalankan(() => api.del(`/${modul}/${hapus.id}`)); notif("Dihapus."); setHapus(null); muatUlang(); segarkan(); }
            catch (e) { notif(e.message, false); setHapus(null); }
          }} />
      )}
    </>
  );
}

// ── Pesan masuk ─────────────────────────────────────────────────────────────

function Pesan({ notif, segarkan }) {
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [belum, setBelum] = useState(false);
  const [galat, setGalat] = useState(null);
  const [lagi, setLagi] = useState(false);
  const [hapus, setHapus] = useState(null);
  const UKURAN_PESAN = 20;

  const ambil = useCallback(async (offset) => {
    const p = new URLSearchParams({ limit: UKURAN_PESAN, offset });
    if (belum) p.set("belum", "1");
    return jalankan(() => api.get(`/pesan?${p}`));
  }, [belum]);

  useEffect(() => {
    let batal = false;
    setRows(null); setGalat(null);
    ambil(0).then((h) => { if (!batal) { setRows(h.rows); setTotal(h.total); } })
      .catch((e) => { if (!batal) setGalat(e.message); });
    return () => { batal = true; };
  }, [ambil]);

  const muatLagi = async () => {
    setLagi(true);
    try {
      const h = await ambil(rows.length);
      // Gabung tanpa duplikat: pesan baru yang masuk menggeser offset.
      setRows((r) => [...r, ...h.rows.filter((x) => !r.some((y) => y.id === x.id))]);
      setTotal(h.total);
    } catch (e) { notif(e.message, false); }
    finally { setLagi(false); }
  };

  // Perubahan status dibaca langsung di layar; tidak perlu memuat ulang daftar.
  const tandai = async (p) => {
    const dibaca = !p.dibaca;
    setRows((r) => r.map((x) => (x.id === p.id ? { ...x, dibaca } : x)));
    try { await jalankan(() => api.put(`/pesan/${p.id}`, { dibaca })); segarkan(); }
    catch (e) { setRows((r) => r.map((x) => (x.id === p.id ? { ...x, dibaca: p.dibaca } : x))); notif(e.message, false); }
  };

  return (
    <>
      <div className="kepala"><div><h1>Pesan masuk</h1><p>Pesan dari formulir kontak di situs.</p></div></div>
      <div className="panel">
        <div className="alat">
          <span className="centang">
            <input id="f-belum" type="checkbox" checked={belum} onChange={(e) => setBelum(e.target.checked)} />
            <label htmlFor="f-belum">Hanya yang belum dibaca</label>
          </span>
          {rows && <span className="redup num">{total} pesan</span>}
        </div>
        {galat && <div className="galat" style={{ margin: 14 }}>{galat}</div>}
        {!rows && !galat && <Rangka />}
        {rows?.length === 0 && <div className="kosong"><b>{belum ? "Semua pesan sudah dibaca" : "Belum ada pesan"}</b>{belum ? "Matikan filter untuk melihat semua pesan." : "Pesan dari pengunjung akan muncul di sini."}</div>}
        {rows?.map((p) => (
          <div key={p.id} className={`pesan ${p.dibaca ? "" : "baru"}`}>
            <div>
              <h3>{p.subjek || "(tanpa subjek)"} {!p.dibaca && <span className="lencana-s tunggu">Baru</span>}</h3>
              <div className="meta">{p.nama} · <a href={`mailto:${p.email}`}>{p.email}</a> · {new Date(p.created_at).toLocaleString("id-ID")}</div>
              <p>{p.pesan}</p>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <Tombol kecil variasi="sunyi" onClick={() => tandai(p)}>{p.dibaca ? "Tandai belum dibaca" : "Tandai dibaca"}</Tombol>
              <Tombol kecil variasi="sunyi ikon" aria-label="Hapus pesan" onClick={() => setHapus(p)}><Trash2 size={14} /></Tombol>
            </div>
          </div>
        ))}
        {rows && rows.length < total && (
          <div className="halaman">
            <span className="num">Menampilkan {rows.length} dari {total}</span>
            <Tombol kecil variasi="sunyi" disabled={lagi} onClick={muatLagi}>{lagi ? "Memuat…" : "Muat lebih banyak"}</Tombol>
          </div>
        )}
      </div>
      {hapus && (
        <Konfirmasi judul="Hapus pesan?" isi={`Pesan dari ${hapus.nama || "pengirim"} akan dihapus permanen.`} onBatal={() => setHapus(null)}
          onYa={async () => {
            try { await jalankan(() => api.del(`/pesan/${hapus.id}`)); setRows((r) => r.filter((x) => x.id !== hapus.id)); setTotal((t) => t - 1); notif("Pesan dihapus."); segarkan(); }
            catch (e) { notif(e.message, false); }
            setHapus(null);
          }} />
      )}
    </>
  );
}

// ── Ringkasan ───────────────────────────────────────────────────────────────

function Ringkasan({ data, buka, nama }) {
  const perlu = [
    ["inovasi", data?.inovasi_pending, "usulan inovasi menunggu persetujuan", "Tinjau"],
    ["pesan", data?.pesan_baru, "pesan belum dibaca", "Baca"],
  ];
  const isi = [["berita", "Berita", data?.berita], ["dokumen", "Dokumen", data?.dokumen, `${data?.dokumen_publik ?? 0} tampil di situs`], ["slider", "Slider", data?.slider], ["program", "Program", data?.program]];
  return (
    <>
      <div className="kepala"><div><h1>Ringkasan</h1><p>Yang perlu Anda tindak lanjuti ada di bagian atas.</p></div></div>
      {!data ? <div className="panel"><Rangka baris={3} /></div> : (
        <>
          <div className="perlu">
            {perlu.map(([id, n, teks, aksi]) => (
              <div key={id} className={`panel ${n > 0 ? "" : "nol"}`}>
                <strong>{n ?? 0}</strong><span>{teks}</span>
                {n > 0 && <Tombol variasi="emas" kecil onClick={() => buka(id)}>{aksi}</Tombol>}
              </div>
            ))}
          </div>
          <div className="panel daftar-ringkas">
            {isi.map(([id, label, n, ket]) => (
              <button key={id} onClick={() => buka(id)}><b>{n ?? 0}</b>{label}{ket && <small>{ket}</small>}</button>
            ))}
          </div>
          <div className="panel pintasan">
            <h2>Pintasan</h2>
            <Tombol variasi="emas" onClick={() => buka("berita", true)}><Plus size={16} /> Tulis berita</Tombol>
            <Tombol variasi="sunyi" onClick={() => buka("dokumen", true)}><Plus size={16} /> Unggah dokumen</Tombol>
            <Tombol variasi="sunyi" onClick={() => buka("slider", true)}><Plus size={16} /> Tambah slide</Tombol>
          </div>
        </>
      )}
    </>
  );
}

// ── Keamanan ────────────────────────────────────────────────────────────────

function Keamanan({ username, notif }) {
  const [f, setF] = useState({ lama: "", baru: "", ulang: "" });
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const kirim = async (e) => {
    e.preventDefault();
    if (f.baru !== f.ulang) return setGalat("PIN baru tidak sama dengan konfirmasi.");
    setSibuk(true); setGalat(null);
    try { await jalankan(() => gantiPin(f.lama, f.baru)); notif("PIN berhasil diganti."); setF({ lama: "", baru: "", ulang: "" }); }
    catch (err) { setGalat(err.message); }
    finally { setSibuk(false); }
  };

  return (
    <>
      <div className="kepala"><div><h1>Keamanan akun</h1><p>Masuk sebagai {username}. Ganti PIN bila orang lain pernah mengetahuinya.</p></div></div>
      <form className="panel" style={{ padding: 22, maxWidth: 440 }} onSubmit={kirim}>
        {galat && <div className="galat" role="alert">{galat}</div>}
        <Kolom label="PIN lama" wajib><input type="password" inputMode="numeric" autoComplete="current-password" value={f.lama} onChange={set("lama")} required /></Kolom>
        <Kolom label="PIN baru" wajib petunjuk="Minimal 6 karakter."><input type="password" inputMode="numeric" autoComplete="new-password" minLength={6} value={f.baru} onChange={set("baru")} required /></Kolom>
        <Kolom label="Ulangi PIN baru" wajib><input type="password" inputMode="numeric" autoComplete="new-password" minLength={6} value={f.ulang} onChange={set("ulang")} required /></Kolom>
        <button type="submit" className="tbl emas" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Ganti PIN"}</button>
      </form>
    </>
  );
}

// ── Login ───────────────────────────────────────────────────────────────────

function HalamanLogin({ onMasuk }) {
  const [u, setU] = useState("");
  const [pin, setPin] = useState("");
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);

  const kirim = async (e) => {
    e.preventDefault();
    setSibuk(true); setGalat(null);
    try { const h = await login(u, pin); setPin(""); onMasuk(h.user); }
    catch (err) { setGalat(err.message); }
    finally { setSibuk(false); }
  };

  return (
    <div className="masuk">
      <form onSubmit={kirim}>
        <div className="logo-login"><Logo ukuran={54} /></div>
        <h1>Panel admin BAPPERIDA</h1>
        <p className="sub">Kabupaten Sumba Barat</p>
        {galat && <div className="galat" role="alert">{galat}</div>}
        <Kolom label="Username" wajib><input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoFocus required /></Kolom>
        <Kolom label="PIN" wajib><input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="current-password" required /></Kolom>
        <button type="submit" className="tbl emas" style={{ width: "100%" }} disabled={sibuk}>{sibuk ? "Memeriksa…" : "Masuk"}</button>
        <p style={{ textAlign: "center", marginTop: 16 }}><a href="/" className="redup">Kembali ke situs</a></p>
      </form>
    </div>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────

const MENU = [
  ["Ringkasan", [["ringkasan", "Ringkasan", LayoutDashboard]]],
  ["Konten situs", [["berita", "Berita", Newspaper], ["dokumen", "Dokumen", FileText], ["slider", "Slider", Images], ["program", "Program", ListChecks], ["metrics", "Metrik", Gauge]]],
  ["Masuk dari pengunjung", [["inovasi", "Inovasi", Lightbulb, "inovasi_pending"], ["pesan", "Pesan", Mail, "pesan_baru"]]],
  ["Akun", [["keamanan", "Keamanan", ShieldCheck]]],
];
const ID_TAB = MENU.flatMap(([, m]) => m.map((x) => x[0]));
const tabDariHash = () => { const h = window.location.hash.slice(1); return ID_TAB.includes(h) ? h : "ringkasan"; };

export default function Admin() {
  const [status, setStatus] = useState("memuat");
  const [pengguna, setPengguna] = useState(null);
  const [tab, setTab] = useState(tabDariHash);
  const [ringkas, setRingkas] = useState(null);
  const [toast, setToast] = useState(null);
  // Sidebar bisa dikecilkan jadi bilah ikon; pilihannya diingat di perangkat ini.
  const [kecil, setKecil] = useState(() => { try { return localStorage.getItem("adm-sisi") === "kecil"; } catch { return false; } });
  const ubahSisi = () => setKecil((k) => {
    const baru = !k;
    try { localStorage.setItem("adm-sisi", baru ? "kecil" : "besar"); } catch { /* penyimpanan dinonaktifkan */ }
    return baru;
  });

  const [langsungTambah, setLangsungTambah] = useState(false);
  const buka = useCallback((id, tambah = false) => { setLangsungTambah(tambah); window.location.hash = id; setTab(id); }, []);
  const notif = useCallback((teks, ok = true) => {
    setToast({ teks, ok });
    clearTimeout(notif.t);
    notif.t = setTimeout(() => setToast(null), 3500);
  }, []);
  const muatRingkasan = useCallback(() => { jalankan(ringkasan).then(setRingkas).catch(() => {}); }, []);

  useEffect(() => {
    document.title = "Panel admin · BAPPERIDA Sumba Barat";
    const onHash = () => { setTab(tabDariHash()); };
    const habis = () => { kosongkanCache(); setStatus("belum"); setPengguna(null); };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("sesi-habis", habis);
    sesi().then((h) => { if (h.user) { setPengguna(h.user); setStatus("masuk"); } else setStatus("belum"); }).catch(() => setStatus("belum"));
    return () => { window.removeEventListener("hashchange", onHash); window.removeEventListener("sesi-habis", habis); };
  }, []);

  useEffect(() => { if (status === "masuk") muatRingkasan(); }, [status, muatRingkasan]);

  if (status === "memuat") return <div className="adm"><div className="masuk" style={{ color: "#fff" }}>Memeriksa sesi…</div></div>;
  if (status === "belum") return <div className="adm"><HalamanLogin onMasuk={(u) => { setPengguna(u); setStatus("masuk"); }} /></div>;

  return (
    <div className={`adm ${kecil ? "ringkas" : ""}`}>
      <aside className="sisi">
        <div className="merek"><Logo /><div className="teks"><b>BAPPERIDA</b><small>Sumba Barat</small></div></div>
        <button className="nav lipat" onClick={ubahSisi} aria-label={kecil ? "Perbesar menu" : "Kecilkan menu"} title={kecil ? "Perbesar menu" : "Kecilkan menu"}>
          {kecil ? <PanelLeftOpen size={17} aria-hidden="true" /> : <PanelLeftClose size={17} aria-hidden="true" />}
          <span className="teks">Kecilkan menu</span>
        </button>
        <nav aria-label="Menu admin">
          {MENU.map(([grup, item]) => (
            <div key={grup}>
              <div className="grup">{grup}</div>
              {item.map(([id, label, Ikon, kunci]) => {
                const n = kunci && ringkas?.[kunci];
                return (
                  <button key={id} className="nav" title={kecil ? label : undefined} aria-label={label}
                    aria-current={tab === id ? "page" : undefined} onClick={() => buka(id)}>
                    <Ikon size={17} aria-hidden="true" /><span className="teks">{label}</span>{n > 0 && <span className="lencana">{n}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="pengguna">
          <span className="teks nama">{pengguna.nama || pengguna.username}</span>
          <a href="/" target="_blank" rel="noreferrer" title="Lihat situs" aria-label="Lihat situs"><ExternalLink size={14} /><span className="teks">Lihat situs</span></a>
          <button title="Keluar" aria-label="Keluar" onClick={async () => { try { await logout(); } finally { kosongkanCache(); setStatus("belum"); setPengguna(null); } }}><LogOut size={14} /><span className="teks">Keluar</span></button>
        </div>
      </aside>

      <main className="isi">
        {tab === "ringkasan" && <Ringkasan data={ringkas} buka={buka} nama={pengguna.nama} />}
        {tab === "keamanan" && <Keamanan username={pengguna.username} notif={notif} />}
        {tab === "pesan" && <Pesan notif={notif} segarkan={muatRingkasan} />}
        {JUDUL_MODUL[tab] && <Modul key={tab} modul={tab} notif={notif} segarkan={muatRingkasan} tambahAwal={langsungTambah} />}
      </main>

      {toast && <div className={`toast ${toast.ok ? "" : "gagal"}`} role="status">{toast.teks}</div>}
    </div>
  );
}

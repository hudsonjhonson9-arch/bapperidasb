// Panel admin BAPPERIDA. Dimuat sebagai chunk terpisah dari situs publik.
// Navigasi memakai hash (#berita, #pesan, ...) supaya bisa di-bookmark.
import { useState, useEffect, useCallback, Fragment } from "react";
import {
  PanelLeftClose, PanelLeftOpen, LayoutDashboard, Newspaper, FileText, Images, ListChecks, Gauge, Lightbulb, Mail,
  ShieldCheck, LogOut, Search, Plus, X, Pencil, Trash2, ExternalLink, ChevronLeft, ChevronRight, Check,
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

function Modal({ judul, onTutup, children, kaki }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onTutup();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onTutup]);
  return (
    <div className="tirai tengah" onMouseDown={(e) => e.target === e.currentTarget && onTutup()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={judul}>
        <header>
          <h2>{judul}</h2>
          <Tombol variasi="sunyi ikon" aria-label="Tutup" onClick={onTutup}><X size={16} /></Tombol>
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

// ── Unggah gambar ───────────────────────────────────────────────────────────

function FieldGambar({ label, wajib, value, onChange }) {
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState(null);

  const pilih = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setGalat(null); setSibuk(true);
    try { onChange((await unggahFile(file)).url); }
    catch (err) { setGalat(err.message); }
    finally { setSibuk(false); }
  };

  return (
    <Blok label={label} wajib={wajib} petunjuk={`Maksimal ${formatBytes(MAKS_UPLOAD)}. Dikirim langsung ke Google Drive.`}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label className="tbl sunyi" style={{ cursor: sibuk ? "wait" : "pointer" }}>
          {sibuk ? "Mengunggah…" : value ? "Ganti gambar" : "Pilih gambar"}
          <input type="file" accept="image/*" onChange={pilih} disabled={sibuk} hidden />
        </label>
        {value && !sibuk && <Tombol variasi="sunyi" onClick={() => onChange("")}>Lepas gambar</Tombol>}
      </div>
      {value && <img className="pratinjau" src={thumbDrive(value, 440)} alt="Pratinjau gambar" loading="lazy" />}
      {galat && <div className="galat" style={{ marginTop: 8 }}>{galat}</div>}
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
      { name: "col_span", label: "Lebar grid", tipe: "number", min: 1, max: 4, petunjuk: "Jumlah kolom yang dipakai di grid beranda (1–4)." },
      { name: "row_span", label: "Tinggi grid", tipe: "number", min: 1, max: 2, petunjuk: "Jumlah baris yang dipakai di grid beranda (1–2)." },
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
      for (const k of def.kolom) awal[k.name] = dasar[k.name] ?? def.baru?.[k.name] ?? (k.tipe === "checkbox" ? false : "");
      setNilai(awal);
    })();
    return () => { batal = true; };
  }, [item, modul, edit, def]);

  const ubah = (n, v) => setNilai((s) => ({ ...s, [n]: v }));

  const pilihBerkas = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBerkas(f);
    const ext = (f.name.split(".").pop() || "").toUpperCase();
    setNilai((s) => ({ ...s, tipe: ext || s.tipe, ukuran: formatBytes(f.size), judul: s.judul || f.name.replace(/\.[^.]+$/, "") }));
  };

  const kirim = async (e) => {
    e.preventDefault();
    setGalat(null);
    const data = {};
    for (const k of def.kolom) {
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
                  ? `Kosongkan jika berkas tidak diganti. Berkas lama di Google Drive dihapus setelah disimpan.${urlLama ? "" : " Dokumen ini belum punya berkas."}`
                  : `Maksimal ${formatBytes(MAKS_UPLOAD)}. Tipe dan ukuran terisi otomatis.`}>
                <input type="file" required={!edit} onChange={pilihBerkas} />
                {edit && urlLama && !berkas && <p style={{ marginTop: 6 }}><a href={tautanLangsung(urlLama)} target="_blank" rel="noreferrer">Buka berkas saat ini <ExternalLink size={12} /></a></p>}
              </Blok>
            )}
            {def.kolom.map((k) => k.gambar ? (
              <FieldGambar key={k.name} label={k.label} wajib={k.wajib} value={nilai[k.name]} onChange={(v) => ubah(k.name, v)} />
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

function DetailInovasi({ id, onTutup }) {
  const [d, setD] = useState(null);
  const [galat, setGalat] = useState(null);
  useEffect(() => {
    jalankan(() => api.get(`/inovasi/${id}`)).then(setD).catch((e) => setGalat(e.message));
  }, [id]);
  const baris = d && [
    ["OPD", d.opd_nama], ["Inovator", d.nama_inovator], ["Jenis", d.jenis_inovasi], ["Tahapan", d.tahapan_inovasi],
    ["Regulasi", d.regulasi_inovasi], ["Anggaran", d.anggaran_inovasi], ["Uji coba", tgl(d.waktu_uji_coba)],
    ["Penerapan", tgl(d.waktu_penerapan)], ["Skor IGA", `${d.skor_iga} (${d.kategori_skor})`],
  ];
  return (
    <Modal judul={d?.judul_inovasi || "Detail usulan"} onTutup={onTutup}>
      <div className="badan">
        {galat && <div className="galat">{galat}</div>}
        {!d && !galat && <Rangka baris={7} />}
        {d && (
          <>
            <dl className="rinci">{baris.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v || "—"}</dd></Fragment>)}</dl>
            <Blok label="Rancang bangun"><p style={{ whiteSpace: "pre-wrap", maxWidth: "65ch" }}>{d.rancang_bangun || "—"}</p></Blok>
            {d.link_video && <p><a href={d.link_video} target="_blank" rel="noreferrer">Buka video <ExternalLink size={12} /></a></p>}
            {Array.isArray(d.dokumen_dukung) && d.dokumen_dukung.length > 0 && (
              <Blok label="Dokumen pendukung">
                {d.dokumen_dukung.map((x, i) => <div key={i}><a href={tautanLangsung(x.url)} target="_blank" rel="noreferrer">{x.name || `Dokumen ${i + 1}`}</a></div>)}
              </Blok>
            )}
          </>
        )}
      </div>
    </Modal>
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
        </div>

        {galat && <div className="galat" style={{ margin: 14 }}>{galat} <Tombol kecil variasi="sunyi" onClick={muatUlang}>Coba lagi</Tombol></div>}
        {!rows && !galat ? <Rangka /> : rows && (rows.length === 0 ? (
          <div className="kosong"><b>{cari ? "Tidak ada hasil" : `Belum ada ${judul.toLowerCase()}`}</b>{cari ? "Coba kata kunci lain." : def ? "Pilih Tambah untuk membuat yang pertama." : "Usulan dari OPD akan muncul di sini."}</div>
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
      {lihat && <DetailInovasi id={lihat} onTutup={() => setLihat(null)} />}
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

// Panel admin BAPPERIDA.
//
// Halaman ini terpisah dari situs publik (App.jsx) dan hanya dimuat ketika
// pathname diawali /admin, jadi bundel publik tidak ikut membawa kode admin.
//
// Tidak ada React Router di proyek ini: perpindahan tab cukup state lokal,
// sedangkan perubahan status login memakai storia browser supaya tombol "kembali"
// di panel tidak memuat ulang situs publik.

import { useState, useEffect, useCallback } from "react";
import {
  api, sesi, login, logout, gantiPin, ringkasan,
  unggahFile, MAKS_UPLOAD, formatBytes, thumbDrive, tautanLangsung,
} from "./api";

const C = {
  navy: "#0B2447",
  navyDark: "#061529",
  navyLight: "#19376D",
  gold: "#C9A227",
  goldLight: "#E3B83A",
  offWhite: "#F7F4EE",
  warmGray: "#E8E3D9",
  white: "#FFFFFF",
  textDark: "#0D1B2A",
  textMid: "#4A5568",
  textLight: "#8898AA",
  bahaya: "#dc2626",
  sukses: "#059669",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${C.warmGray}`,
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  background: C.white,
  color: C.textDark,
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: C.textMid,
  marginBottom: 6,
  letterSpacing: "0.02em",
};

function Kolom({ label, children, hint, wajib }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>
        {label}
        {wajib && <span style={{ color: C.bahaya }}> *</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: C.textLight, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function Tombol({ children, onClick, tone = "navy", type = "button", disabled, kecil }) {
  const warna = tone === "bahaya" ? C.bahaya : tone === "gold" ? C.gold : tone === "sunyi" ? C.white : C.navy;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: warna,
        color: tone === "gold" ? C.navyDark : tone === "sunyi" ? C.navy : C.white,
        border: tone === "sunyi" ? `1px solid ${C.navy}` : "none",
        padding: kecil ? "6px 12px" : "11px 20px",
        borderRadius: 8,
        fontSize: kecil ? 12.5 : 14,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Kartu({ children, style }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.warmGray}`,
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Unggah gambar ────────────────────────────────────────────────────────────

/**
 * Menyimpan URL hasil unggah Apps Script ke field tersembunyi milik form.
 * Nilai di input ini yang dikirim ke server; nama kolom database (gambar_data)
 * dan alias form (gambar_url) keduanya diterima normalisasi di server.
 */
function FieldGambar({ name, label, wajib, awal = "" }) {
  const [nilai, setNilai] = useState(awal);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState(null);
  const [pratinjau, setPratinjau] = useState(awal ? thumbDrive(awal) : "");

  useEffect(() => {
    setNilai(awal);
    setPratinjau(awal ? thumbDrive(awal) : "");
    setGalat(null);
  }, [awal]);

  const pilih = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;

    setGalat(null);
    setSibuk(true);
    try {
      const hasil = await unggahFile(file);
      setNilai(hasil.url);
      setPratinjau(thumbDrive(hasil.url));
    } catch (err) {
      setGalat(err.message);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <Kolom label={label} wajib={wajib} hint={`Maksimal ${formatBytes(MAKS_UPLOAD)}. File dikirim langsung ke Google Drive.`}>
      <input type="hidden" name={name} value={nilai} readOnly />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label
          style={{
            display: "inline-block",
            padding: "9px 16px",
            background: C.offWhite,
            border: `1px dashed ${C.warmGray}`,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            color: C.navy,
            cursor: sibuk ? "wait" : "pointer",
          }}
        >
          {sibuk ? "Mengunggah..." : nilai ? "Ganti gambar" : "Pilih gambar"}
          <input type="file" accept="image/*" onChange={pilih} disabled={sibuk} style={{ display: "none" }} />
        </label>
        {nilai && (
          <button
            type="button"
            onClick={() => { setNilai(""); setPratinjau(""); }}
            style={{ background: "none", border: "none", color: C.bahaya, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            Hapus pilihan
          </button>
        )}
      </div>
      {pratinjau && (
        <img src={pratinjau} alt="Pratinjau" style={{ marginTop: 10, maxWidth: 200, borderRadius: 8, border: `1px solid ${C.warmGray}` }} />
      )}
      {galat && <div style={{ color: C.bahaya, fontSize: 12.5, marginTop: 8 }}>⚠️ {galat}</div>}
    </Kolom>
  );
}

// ── Login ───────────────────────────────────────────────────────────────────

function HalamanLogin({ onMasuk }) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);

  const kirim = async (e) => {
    e.preventDefault();
    setSibuk(true);
    setGalat(null);
    try {
      const hasil = await login(username, pin);
      setPin("");
      onMasuk(hasil.user);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: `linear-gradient(145deg, ${C.navyDark}, ${C.navyLight})`, padding: 20 }}>
      <form onSubmit={kirim} style={{ width: "100%", maxWidth: 380, background: C.white, borderRadius: 16, padding: 32, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.2em", color: C.gold }}>BAPPERIDA</div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: C.navy, margin: "8px 0 4px" }}>Panel Admin</h1>
          <p style={{ fontSize: 12.5, color: C.textLight, margin: 0 }}>Kabupaten Sumba Barat</p>
        </div>

        <Kolom label="Username" wajib>
          <input style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </Kolom>
        <Kolom label="PIN" wajib>
          <input style={inputStyle} type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="current-password" required />
        </Kolom>

        {galat && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: C.bahaya, padding: "10px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 }}>
            ⚠️ {galat}
          </div>
        )}

        <Tombol type="submit" tone="gold" disabled={sibuk}>
          {sibuk ? "Memeriksa..." : "Masuk"}
        </Tombol>

        <a href="/" style={{ display: "block", textAlign: "center", marginTop: 18, fontSize: 12.5, color: C.textLight, textDecoration: "none" }}>
          ← Kembali ke situs
        </a>
      </form>
    </div>
  );
}

// ── Definisi formulir per modul ─────────────────────────────────────────────
//
// Kolom di sini hanya untuk tampilan. Server tetap memvalidasi dan melempar
// kolom yang tidak dikenal, jadi menambah field di sini tidak otomatis berarti
// kolom itu tersimpan di database.

const FORMULIR = {
  berita: {
    judul: "Berita",
    kolom: [
      { name: "judul", label: "Judul Berita", wajib: true },
      { name: "kategori", label: "Kategori" },
      { name: "tanggal", label: "Tanggal", tipe: "date" },
      { name: "emoji", label: "Emoji (tanpa gambar)" },
      { name: "priority", label: "Urutan", tipe: "number", hint: "Angka kecil tampil lebih dulu." },
      { name: "is_featured", label: "Berita unggulan", tipe: "checkbox" },
      { name: "konten", label: "Isi Berita", tipe: "textarea", baris: 8 },
      { name: "gambar_url", label: "Gambar Berita", component: "gambar" },
    ],
  },

  dokumen: {
    judul: "Dokumen",
    kolom: [
      { name: "judul", label: "Judul Dokumen", wajib: true },
      { name: "kategori", label: "Kategori" },
      { name: "tipe", label: "Tipe (PDF/XLSX/DOCX)" },
      { name: "ukuran", label: "Ukuran" },
      { name: "tanggal", label: "Tanggal Terbit", tipe: "date" },
      { name: "icon", label: "Emoji Ikon" },
      { name: "publik", label: "Tampilkan di situs publik", tipe: "checkbox" },
    ],
  },

  program: {
    judul: "Program",
    kolom: [
      { name: "title", label: "Nama Program", wajib: true },
      { name: "cat", label: "Kategori" },
      { name: "status", label: "Status" },
      { name: "sc", label: "Sasaran" },
      { name: "priority", label: "Urutan", tipe: "number" },
      { name: "desc", label: "Deskripsi", tipe: "textarea", baris: 5 },
      { name: "icon", label: "Emoji" },
    ],
  },

  metrics: {
    judul: "Metrik",
    kolom: [
      { name: "label", label: "Label", wajib: true, hint: "Label tidak bisa diubah setelah dibuat; ubah nilai angka saja." },
      { name: "value", label: "Nilai", wajib: true },
      { name: "icon", label: "Emoji" },
      { name: "priority", label: "Urutan", tipe: "number" },
    ],
  },

  slider: {
    judul: "Slider",
    kolom: [
      { name: "judul", label: "Judul Teks" },
      { name: "subjudul", label: "Subjudul" },
      { name: "gambar_url", label: "Gambar Slider", wajib: true, component: "gambar" },
    ],
  },
};

function ModalFormulir({ modul, item, onTutup, onSimpan }) {
  const def = FORMULIR[modul];
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState(null);
  const [nilaiAwal, setNilaiAwal] = useState(() => {
    const awal = {};
    for (const k of def.kolom) awal[k.name] = item[k.name] ?? "";
    return awal;
  });

  useEffect(() => {
    // Daftar kolom dibaca dari FORMULIR, bukan dari `def`, jadi tidak perlu
    // dimasukkan ke daftar dependensi: form ini hanya hidup untuk satu modul
    // pada satu waktu.
    const awal = {};
    for (const k of FORMULIR[modul].kolom) awal[k.name] = item[k.name] ?? "";
    setNilaiAwal(awal);
    setGalat(null);
  }, [item, modul]);

  const ubah = (name, nilai) => setNilaiAwal((v) => ({ ...v, [name]: nilai }));

  const kirim = async (e) => {
    e.preventDefault();
    setSibuk(true);
    setGalat(null);

    const data = { ...nilaiAwal };
    for (const k of def.kolom) {
      if (k.tipe === "checkbox") data[k.name] = Boolean(data[k.name]);
      else if (k.tipe === "number") data[k.name] = data[k.name] === "" ? null : Number(data[k.name]);
      else data[k.name] = String(data[k.name] ?? "").trim();
    }
    if (data.url === "") delete data.url;

    try {
      await onSimpan(data);
    } catch (err) {
      setGalat(err.message);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(6,21,41,0.6)", zIndex: 100, display: "grid", placeItems: "center", padding: 20, overflowY: "auto" }} onClick={onTutup}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={kirim} style={{ width: "100%", maxWidth: 560, background: C.white, borderRadius: 14, padding: 26, margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>
            {item.id ? "Edit" : "Tambah"} {def.judul}
          </h2>
          <button type="button" onClick={onTutup} style={{ background: "none", border: "none", fontSize: 22, color: C.textLight, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {def.kolom.map((k) => {
          if (k.component === "gambar") {
            return <FieldGambar key={k.name} name={k.name} label={k.label} wajib={k.wajib} awal={nilaiAwal[k.name] || ""} />;
          }
          return (
            <Kolom key={k.name} label={k.label} wajib={k.wajib} hint={k.hint}>
              {k.tipe === "textarea" ? (
                <textarea style={{ ...inputStyle, minHeight: (k.baris || 5) * 22 }} value={nilaiAwal[k.name] ?? ""} onChange={(e) => ubah(k.name, e.target.value)} />
              ) : k.tipe === "checkbox" ? (
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: C.textMid, cursor: "pointer" }}>
                  <input type="checkbox" checked={Boolean(nilaiAwal[k.name])} onChange={(e) => ubah(k.name, e.target.checked)} />
                  Ya
                </label>
              ) : (
                <input
                  style={inputStyle}
                  type={k.tipe || "text"}
                  value={nilaiAwal[k.name] ?? ""}
                  onChange={(e) => ubah(k.name, e.target.value)}
                  required={k.wajib}
                />
              )}
            </Kolom>
          );
        })}

        {galat && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: C.bahaya, padding: "10px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 }}>
            ⚠️ {galat}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Tombol onClick={onTutup} tone="sunyi">Batal</Tombol>
          <Tombol type="submit" tone="gold" disabled={sibuk}>{sibuk ? "Menyimpan..." : "Simpan"}</Tombol>
        </div>
      </form>
    </div>
  );
}

// ── Tabel data umum ─────────────────────────────────────────────────────────

function TabelData({ modul, baris, onUbah, kolomTampil }) {
  const def = FORMULIR[modul];
  const [edit, setEdit] = useState(null);
  const [konfirmasi, setKonfirmasi] = useState(null);

  const simpan = async (data) => {
    if (edit && edit.id) await api.put(`/${modul}/${edit.id}`, data);
    else await api.post(`/${modul}`, data);
    setEdit(null);
    await onUbah();
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, color: C.navy, margin: 0 }}>{def.judul}</h2>
        <Tombol tone="gold" onClick={() => setEdit({})}>+ Tambah {def.judul}</Tombol>
      </div>

      <Kartu style={{ padding: 0, overflowX: "auto" }}>
        {baris.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textLight, fontSize: 13.5 }}>
            Belum ada data {def.judul.toLowerCase()}.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: C.offWhite, textAlign: "left" }}>
                {kolomTampil.map((c) => (
                  <th key={c} style={{ padding: "12px 16px", fontSize: 11.5, fontWeight: 800, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{c}</th>
                ))}
                <th style={{ padding: "12px 16px" }} />
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.id} style={{ borderTop: `1px solid ${C.warmGray}` }}>
                  {kolomTampil.map((c) => (
                    <td key={c} style={{ padding: "12px 16px", color: C.textMid, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b[c] === null || b[c] === undefined || b[c] === "" ? "—" : String(b[c])}
                    </td>
                  ))}
                  <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <Tombol kecil onClick={() => setEdit(b)}>Edit</Tombol>{" "}
                    <Tombol kecil tone="bahaya" onClick={() => setKonfirmasi(b)}>Hapus</Tombol>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Kartu>

      {edit && <ModalFormulir modul={modul} item={edit} onTutup={() => setEdit(null)} onSimpan={simpan} />}

      {konfirmasi && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,21,41,0.6)", zIndex: 100, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: C.white, borderRadius: 14, padding: 26, maxWidth: 400 }}>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, color: C.navy, marginTop: 0 }}>Hapus {def.judul}?</h3>
            <p style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.6 }}>
              Data <strong>{konfirmasi.judul || konfirmasi.title || konfirmasi.label || `#${konfirmasi.id}`}</strong> akan dihapus permanen.
              {modul === "dokumen" || modul === "berita" || modul === "slider"
                ? " File di Google Drive juga ikut dihapus."
                : " Tindakan ini tidak bisa dibatalkan."}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Tombol tone="sunyi" onClick={() => setKonfirmasi(null)}>Batal</Tombol>
              <Tombol tone="bahaya" onClick={async () => {
                try {
                  await api.del(`/${modul}/${konfirmasi.id}`);
                  setKonfirmasi(null);
                  await onUbah();
                } catch (err) {
                  alert(err.message);
                }
              }}>Hapus</Tombol>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Dokumen: unggah file ────────────────────────────────────────────────────

function DokumenDanFile({ baris, onUbah }) {
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState(null);
  const [form, setForm] = useState({ judul: "", kategori: "", tipe: "PDF", tanggal: "", icon: "📄", publik: true });

  const unggah = async (e) => {
    e.preventDefault();
    setSibuk(true);
    setGalat(null);
    try {
      const hasil = await unggahFile(e.target.file);
      await api.post("/dokumen", {
        ...form,
        ukuran: formatBytes(hasil.size),
        url: hasil.url,
      });
      e.target.reset();
      setForm({ judul: "", kategori: "", tipe: "PDF", tanggal: "", icon: "📄", publik: true });
      await onUbah();
    } catch (err) {
      setGalat(err.message);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <>
      <Kartu style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 700, color: C.navy, marginTop: 0 }}>Unggah Dokumen Baru</h3>
        <p style={{ fontSize: 12.5, color: C.textLight, marginTop: -6 }}>
          File dikirim langsung ke Google Drive lewat Apps Script; Express hanya menyimpan metadata-nya.
        </p>

        <form onSubmit={unggah} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <Kolom label="Judul" wajib><input style={inputStyle} value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required /></Kolom>
            <Kolom label="Kategori"><input style={inputStyle} value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} /></Kolom>
            <Kolom label="Tipe"><input style={inputStyle} value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })} /></Kolom>
            <Kolom label="Tanggal"><input style={inputStyle} type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></Kolom>
            <Kolom label="Emoji"><input style={inputStyle} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></Kolom>
            <Kolom label="Tampilkan di situs publik">
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: C.textMid, cursor: "pointer", paddingTop: 8 }}>
                <input type="checkbox" checked={form.publik} onChange={(e) => setForm({ ...form, publik: e.target.checked })} /> Ya
              </label>
            </Kolom>
          </div>

          <div>
            <label style={labelStyle}>Berkas <span style={{ color: C.bahaya }}>*</span></label>
            <input type="file" required style={{ ...inputStyle, padding: 9 }} />
            <div style={{ fontSize: 11.5, color: C.textLight, marginTop: 5 }}>Maksimal {formatBytes(MAKS_UPLOAD)}.</div>
          </div>

          {galat && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: C.bahaya, padding: "10px 12px", borderRadius: 8, fontSize: 12.5 }}>⚠️ {galat}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Tombol type="submit" tone="gold" disabled={sibuk}>{sibuk ? "Mengunggah..." : "Unggah"}</Tombol>
          </div>
        </form>
      </Kartu>

      <Kartu style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: C.offWhite, textAlign: "left" }}>
              {["Judul", "Kategori", "Tipe", "Ukuran", "Publik", "Berkas"].map((c) => (
                <th key={c} style={{ padding: "12px 16px", fontSize: 11.5, fontWeight: 800, color: C.textMid, textTransform: "uppercase" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {baris.map((d) => (
              <tr key={d.id} style={{ borderTop: `1px solid ${C.warmGray}` }}>
                <td style={{ padding: "12px 16px", color: C.textMid }}>{d.icon} {d.judul}</td>
                <td style={{ padding: "12px 16px", color: C.textMid }}>{d.kategori || "—"}</td>
                <td style={{ padding: "12px 16px", color: C.textMid }}>{d.tipe || "—"}</td>
                <td style={{ padding: "12px 16px", color: C.textMid }}>{d.ukuran || "—"}</td>
                <td style={{ padding: "12px 16px", color: d.publik ? C.sukses : C.textLight }}>{d.publik ? "Ya" : "Tidak"}</td>
                <td style={{ padding: "12px 16px" }}>
                  {d.url ? (
                    <a href={tautanLangsung(d.url)} target="_blank" rel="noreferrer" style={{ color: C.navy, fontWeight: 700, fontSize: 12.5 }}>Buka</a>
                  ) : <span style={{ color: C.textLight }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {baris.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.textLight, fontSize: 13.5 }}>Belum ada dokumen.</div>}
      </Kartu>
    </>
  );
}

// ── Inovasi: review ─────────────────────────────────────────────────────────

function InovasiReview({ baris, onUbah }) {
  const [lihat, setLihat] = useState(null);

  const setujui = async (id) => {
    try {
      await api.put(`/inovasi/${id}/setujui`);
      await onUbah();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <h2 style={{ fontSize: 19, fontWeight: 700, color: C.navy, marginTop: 0 }}>Review Usulan Inovasi</h2>
      <p style={{ fontSize: 12.5, color: C.textLight, marginTop: -8 }}>
        Skor IGA dihitung server. Yang belum disetujui tidak muncul di situs publik.
      </p>

      <div style={{ display: "grid", gap: 14 }}>
        {baris.map((inv) => (
          <Kartu key={inv.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20,
                    background: inv.status_approval === "Approved" ? "#d1fae5" : "#fef3c7",
                    color: inv.status_approval === "Approved" ? C.sukses : "#b45309",
                  }}>
                    {inv.status_approval === "Approved" ? "Disetujui" : "Menunggu"}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{inv.kategori_skor} · Skor {inv.skor_iga}</span>
                </div>
                <h3 style={{ fontSize: 15.5, fontWeight: 700, color: C.navy, margin: "0 0 4px" }}>{inv.judul_inovasi}</h3>
                <div style={{ fontSize: 12.5, color: C.textLight }}>
                  {inv.opd_nama || "OPD tidak diisi"} · {inv.nama_inovator || "inovator tidak diisi"} · {inv.jenis_inovasi || "-"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Tombol kecil tone="sunyi" onClick={() => setLihat(inv)}>Detail</Tombol>
                {inv.status_approval !== "Approved" && (
                  <Tombol kecil tone="gold" onClick={() => setujui(inv.id)}>Setujui</Tombol>
                )}
                <Tombol kecil tone="bahaya" onClick={async () => {
                  if (!confirm(`Hapus usulan "${inv.judul_inovasi}"?`)) return;
                  try {
                    await api.del(`/inovasi/${inv.id}`);
                    await onUbah();
                  } catch (err) {
                    alert(err.message);
                  }
                }}>Hapus</Tombol>
              </div>
            </div>
          </Kartu>
        ))}
        {baris.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.textLight }}>Belum ada usulan inovasi.</div>}
      </div>

      {lihat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(6,21,41,0.6)", zIndex: 100, display: "grid", placeItems: "center", padding: 20, overflowY: "auto" }} onClick={() => setLihat(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.white, borderRadius: 14, padding: 26, maxWidth: 620, maxHeight: "88vh", overflowY: "auto", margin: "auto" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginTop: 0 }}>{lihat.judul_inovasi}</h3>
            {[
              ["OPD", lihat.opd_nama], ["Innovator", lihat.nama_inovator], ["Jenis", lihat.jenis_inovasi],
              ["Tahapan", lihat.tahapan_inovasi], ["Regulasi", lihat.regulasi_inovasi], ["Anggaran", lihat.anggaran_inovasi],
              ["Waktu uji coba", lihat.waktu_uji_coba], ["Waktu penerapan", lihat.waktu_penerapan],
              ["Skor IGA", `${lihat.kategori_skor} (${lihat.skor_iga})`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: `1px solid ${C.warmGray}`, fontSize: 13 }}>
                <span style={{ width: 140, color: C.textLight, flexShrink: 0 }}>{k}</span>
                <span style={{ color: C.textMid }}>{v || "—"}</span>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <div style={{ ...labelStyle }}>Rancang Bangun</div>
              <p style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{lihat.rancang_bangun || "—"}</p>
            </div>
            {lihat.link_video && (
              <a href={lihat.link_video} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: C.navy, fontWeight: 700 }}>Buka video</a>
            )}
            {Array.isArray(lihat.dokumen_dukung) && lihat.dokumen_dukung.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ ...labelStyle }}>Dokumen pendukung</div>
                {lihat.dokumen_dukung.map((d, i) => (
                  <a key={i} href={tautanLangsung(d.url)} target="_blank" rel="noreferrer" style={{ display: "block", fontSize: 12.5, color: C.navy }}>
                    {d.name || `Dokumen ${i + 1}`}
                  </a>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <Tombol tone="sunyi" onClick={() => setLihat(null)}>Tutup</Tombol>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Pesan kontak ────────────────────────────────────────────────────────────

function PesanMasuk({ baris, onUbah }) {
  const tandaiDibaca = async (id, dibaca) => {
    try {
      await api.put(`/pesan/${id}`, { dibaca });
      await onUbah();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <h2 style={{ fontSize: 19, fontWeight: 700, color: C.navy, marginTop: 0 }}>Pesan Masuk</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {baris.map((p) => (
          <Kartu key={p.id} style={{ background: p.dibaca ? C.white : "#fffbeb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>
                  {p.subjek || "(tanpa subjek)"}{!p.dibaca && <span style={{ ...{ fontSize: 11, color: C.bahaya, marginLeft: 8, fontWeight: 800 } }}>BARU</span>}
                </div>
                <div style={{ fontSize: 12.5, color: C.textLight, margin: "4px 0 10px" }}>
                  {p.nama} · {p.email} · {new Date(p.created_at).toLocaleString("id-ID")}
                </div>
                <p style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{p.pesan}</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Tombol kecil tone="sunyi" onClick={() => tandaiDibaca(p.id, !p.dibaca)}>{p.dibaca ? "Tandai belum" : "Tandai dibaca"}</Tombol>
                <Tombol kecil tone="bahaya" onClick={async () => {
                  if (!confirm("Hapus pesan ini?")) return;
                  try {
                    await api.del(`/pesan/${p.id}`);
                    await onUbah();
                  } catch (err) {
                    alert(err.message);
                  }
                }}>Hapus</Tombol>
              </div>
            </div>
          </Kartu>
        ))}
        {baris.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.textLight }}>Belum ada pesan.</div>}
      </div>
    </>
  );
}

// ── Keamanan ────────────────────────────────────────────────────────────────

function Keamanan({ username }) {
  const [pinLama, setPinLama] = useState("");
  const [pinBaru, setPinBaru] = useState("");
  const [ulangi, setUlangi] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState(null);

  const kirim = async (e) => {
    e.preventDefault();
    if (pinBaru !== ulangi) {
      setPesan({ ok: false, teks: "PIN baru tidak sama dengan konfirmasi." });
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      await gantiPin(pinLama, pinBaru);
      setPesan({ ok: true, teks: "PIN berhasil diganti." });
      setPinLama(""); setPinBaru(""); setUlangi("");
    } catch (err) {
      setPesan({ ok: false, teks: err.message });
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div style={{ maxWidth: 460 }}>
      <h2 style={{ fontSize: 19, fontWeight: 700, color: C.navy, marginTop: 0 }}>Keamanan Akun</h2>
      <Kartu>
        <p style={{ fontSize: 13, color: C.textLight, marginTop: 0 }}>
          Akun <strong>{username}</strong>. Ganti PIN bila orang lain pernah mengetahui PIN Anda.
        </p>
        <form onSubmit={kirim}>
          <Kolom label="PIN Lama" wajib><input style={inputStyle} type="password" inputMode="numeric" value={pinLama} onChange={(e) => setPinLama(e.target.value)} required /></Kolom>
          <Kolom label="PIN Baru" wajib hint="Minimal 6 karakter."><input style={inputStyle} type="password" inputMode="numeric" minLength={6} value={pinBaru} onChange={(e) => setPinBaru(e.target.value)} required /></Kolom>
          <Kolom label="Ulangi PIN Baru" wajib><input style={inputStyle} type="password" inputMode="numeric" minLength={6} value={ulangi} onChange={(e) => setUlangi(e.target.value)} required /></Kolom>
          {pesan && (
            <div style={{
              background: pesan.ok ? "#ecfdf5" : "#fef2f2",
              border: `1px solid ${pesan.ok ? "#a7f3d0" : "#fecaca"}`,
              color: pesan.ok ? C.sukses : C.bahaya,
              padding: "10px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14,
            }}>{pesan.teks}</div>
          )}
          <Tombol type="submit" tone="gold" disabled={sibuk}>{sibuk ? "Menyimpan..." : "Ganti PIN"}</Tombol>
        </form>
      </Kartu>
    </div>
  );
}

// ── Panel ───────────────────────────────────────────────────────────────────

const TAB = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "berita", label: "Berita" },
  { id: "dokumen", label: "Dokumen" },
  { id: "slider", label: "Slider" },
  { id: "program", label: "Program" },
  { id: "metrics", label: "Metrik" },
  { id: "inovasi", label: "Inovasi" },
  { id: "pesan", label: "Pesan" },
  { id: "keamanan", label: "Keamanan" },
];

export default function Admin() {
  const [status, setStatus] = useState("memuat");
  const [pengguna, setPengguna] = useState(null);
  const [tab, setTab] = useState(() => {
    const dariHash = window.location.hash.replace("#", "");
    return TAB.some((t) => t.id === dariHash) ? dariHash : "ringkasan";
  });
  const [data, setData] = useState({});
  const [jumlah, setJumlah] = useState(null);
  const [galat, setGalat] = useState(null);

  // Tab disimpan di hash supaya bisa di-bookmark dan tombol "kembali" tidak
  // memuat ulang seluruh panel.
  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.replace("#", "");
      if (TAB.some((t) => t.id === id)) setTab(id);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hasil = await sesi();
        if (!hasil.user) { setStatus("belum"); return; }
        setPengguna(hasil.user);
        setStatus("masuk");
      } catch {
        setStatus("belum");
      }
    })();
  }, []);

  const muat = useCallback(async (modul) => {
    try {
      const baris = await api.get(`/${modul}`);
      setData((d) => ({ ...d, [modul]: baris }));
      setGalat(null);
    } catch (err) {
      // Sesi bisa habis di tengah memakai panel. Kembalikan ke layar login
      // seketika; tabel yang diam-diam kosong akan disalahartikan sebagai
      // "data memang tidak ada".
      if (err.status === 401) { setStatus("belum"); setPengguna(null); return; }
      setGalat(err.message);
    }
  }, []);

  useEffect(() => {
    if (status !== "masuk") return;
    if (tab === "ringkasan") { ringkasan().then(setJumlah).catch((e) => setGalat(e.message)); return; }
    if (tab === "keamanan") return;
    muat(tab);
  }, [tab, status, muat]);

  if (status === "memuat") {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: C.textLight, fontSize: 14 }}>Memeriksa sesi…</div>;
  }

  if (status === "belum") {
    return <HalamanLogin onMasuk={(u) => { setPengguna(u); setStatus("masuk"); }} />;
  }

  const baris = (m) => data[m] || [];
  const muatUlang = () => muat(tab === "keamanan" || tab === "ringkasan" ? "ringkasan" : tab);

  return (
    <div style={{ minHeight: "100vh", background: C.offWhite, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <header style={{ background: C.navyDark, color: C.white, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", color: C.gold }}>BAPPERIDA</span>
          <span style={{ fontSize: 15, fontWeight: 700, marginLeft: 12 }}>Panel Admin</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)" }}>{pengguna.nama}</span>
          <a href="/" style={{ fontSize: 12.5, color: C.gold, fontWeight: 700, textDecoration: "none" }}>Lihat situs</a>
          <Tombol kecil tone="bahaya" onClick={async () => {
            try { await logout(); } finally { setStatus("belum"); setPengguna(null); }
          }}>Keluar</Tombol>
        </div>
      </header>

      <nav style={{ background: C.white, borderBottom: `1px solid ${C.warmGray}`, padding: "0 16px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 2, maxWidth: 1300, margin: "0 auto" }}>
          {TAB.map((t) => (
            <button
              key={t.id}
              onClick={() => { window.location.hash = t.id; setTab(t.id); }}
              style={{
                background: "none", border: "none", borderBottom: `3px solid ${tab === t.id ? C.gold : "transparent"}`,
                padding: "14px 16px", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                color: tab === t.id ? C.navy : C.textMid, whiteSpace: "nowrap",
              }}
            >
              {t.label}
              {t.id === "pesan" && jumlah?.pesan_baru > 0 && (
                <span style={{ marginLeft: 6, background: C.bahaya, color: C.white, fontSize: 10.5, padding: "1px 7px", borderRadius: 10 }}>{jumlah.pesan_baru}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 1300, margin: "0 auto", padding: 28, paddingBottom: 70 }}>
        {galat && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: C.bahaya, padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
            ⚠️ {galat}
          </div>
        )}

        {tab === "ringkasan" && (
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: C.navy, marginTop: 0 }}>Ringkasan</h2>
            {jumlah ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                {[
                  ["Berita", jumlah.berita], ["Dokumen", jumlah.dokumen], ["Dokumen publik", jumlah.dokumen_publik],
                  ["Slider", jumlah.slider], ["Program", jumlah.program],
                  ["Inovasi menunggu", jumlah.inovasi_pending], ["Pesan baru", jumlah.pesan_baru],
                ].map(([label, n]) => (
                  <Kartu key={label}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: C.textLight, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: C.navy, marginTop: 6 }}>{n ?? 0}</div>
                  </Kartu>
                ))}
              </div>
            ) : <div style={{ color: C.textLight, fontSize: 13.5 }}>Memuat ringkasan…</div>}
          </div>
        )}

        {tab === "keamanan" && <Keamanan username={pengguna.username} />}

        {tab === "pesan" && <PesanMasuk baris={baris("pesan")} onUbah={muatUlang} />}

        {tab === "inovasi" && <InovasiReview baris={baris("inovasi")} onUbah={muatUlang} />}

        {tab === "dokumen" && <DokumenDanFile baris={baris("dokumen")} onUbah={muatUlang} />}

        {tab === "berita" && (
          <TabelData modul="berita" baris={baris("berita")} onUbah={muatUlang}
            kolomTampil={["judul", "kategori", "tanggal", "priority", "is_featured"]} />
        )}

        {tab === "slider" && (
          <TabelData modul="slider" baris={baris("slider")} onUbah={muatUlang}
            kolomTampil={["judul", "subjudul", "gambar_url"]} />
        )}

        {tab === "program" && (
          <TabelData modul="program" baris={baris("program")} onUbah={muatUlang}
            kolomTampil={["title", "cat", "status", "sc", "priority"]} />
        )}

        {tab === "metrics" && (
          <TabelData modul="metrics" baris={baris("metrics")} onUbah={muatUlang}
            kolomTampil={["label", "value", "icon", "priority"]} />
        )}
      </main>
    </div>
  );
}

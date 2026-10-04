import { useState, useEffect, useRef } from "react";
import {
  ambilInit, ambilTautanDokumen, kirimKontak, kirimInovasi,
  unggahFile, formatBytes,
  thumbDrive as getDriveThumb, ukuranThumb,
} from "./api";

const LOGO_URL = "/logo.png"; 

import {
  MapPin, Phone, Mail, ChevronDown, Menu, X,
  ArrowRight, Users, User, Calendar, FileText, Download, Eye, Search,
  Target, Lightbulb, BarChart2, BookOpen, Globe, Shield, Play,
  AlertCircle, Loader2, Link2, Book, Star, Building2, Scale, Wallet,
  Package, Info, Newspaper, Smartphone, Check, Paperclip
} from "lucide-react";

const tgl = (v) => { var d = new Date(v); var day = d.getDate().toString().padStart(2,"0"); var month = (d.getMonth()+1).toString().padStart(2,"0"); var year = d.getFullYear(); return day+"/"+month+"/"+year; };const NAV = [
  { id: "beranda", label: "Beranda" },
  { id: "profil", label: "Profil" },
  { id: "visi-misi", label: "Visi & Misi" },
  { id: "struktur", label: "Struktur" },
  { id: "program", label: "Program" },
  { id: "dokumen", label: "Dokumen" },
  { id: "berita", label: "Berita" },
  { id: "inovasi", label: "Inovasi Daerah" },
  { id: "kontak", label: "Kontak" },
];

const C = {
  navy: "#0B2447",
  navyDark: "#061529",
  navyMid: "#0D2E5A",
  navyLight: "#19376D",
  gold: "#C9A227",
  goldLight: "#E3B83A",
  offWhite: "#F7F4EE",
  warmGray: "#E8E3D9",
  white: "#FFFFFF",
  textDark: "#0D1B2A",
  textMid: "#4A5568",
  textLight: "#8898AA",
};

const FadeInImage = ({ src, alt, style, className }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={className} style={{ ...style, backgroundColor: '#f3f4f6', overflow: 'hidden', position: 'relative' }}>
      {!loaded && !error && (
        <div className="shimmer" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
      )}
      {error ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
          <AlertCircle size={22} aria-hidden="true" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 1s ease-in-out'
          }}
          loading="lazy"
        />
      )}
    </div>
  );
};

// Catatan: field upload ini hanya dipakai di portal Klinik Inovasi yang terbuka
// untuk OPD, jadi tetap tinggal di halaman publik. Form admin punya versinya sendiri
// di panel admin karena butuh kontrol tambahan (ganti file, hapus file lama).

// ── Skor IGA ────────────────────────────────────────────────────────────────
// Aturan ini WAJIB sama dengan hitungSkorIga() dan kategoriIga() di
// server/index.js. Form publik hanya menampilkan estimasi, tapi kalau aturannya
// berbeda, angka yang terlihat di form tidak akan cocok dengan yang tersimpan.
const SKOR_IGA = {
  rancang: 20, // rancang bangun >= 300 kata
  tahapan: { Penerapan: 20, 'Uji Coba': 10, Inisiatif: 5 },
  regulasi: { Perbup: 15, 'SK Kepala OPD': 10, SOP: 5 },
  anggaran: { Ada: 15 },
  video: 10,
  dokumen: 20,
};

function skorIga(d) {
  const kata = String(d.rancang_bangun || '').trim().split(/\s+/).filter(Boolean).length;
  const dokumen = Array.isArray(d.dokumen_dukung) ? d.dokumen_dukung : [];
  let skor = 0;
  if (kata >= 300) skor += SKOR_IGA.rancang;
  skor += SKOR_IGA.tahapan[d.tahapan_inovasi] || 0;
  skor += SKOR_IGA.regulasi[d.regulasi_inovasi] || 0;
  skor += SKOR_IGA.anggaran[d.anggaran_inovasi] || 0;
  if (String(d.link_video || '').length > 10) skor += SKOR_IGA.video;
  if (dokumen.length > 0) skor += SKOR_IGA.dokumen;
  return Math.min(100, skor);
}

function kategoriIga(skor) {
  if (skor >= 80) return 'Sangat Inovatif';
  if (skor >= 50) return 'Inovatif';
  return 'Kurang Inovatif';
}

// Tulis estimasi ke display form. Dipanggil dari onChange form dan dari widget
// dokumen: input dokumen disimpan di hidden input yang nilainya berubah tanpa
// memicu event change, jadi 20 poinnya bisa hilang sampai pengguna mengubah
// field lain.
function perbaruiEstimasiIga(idForm = 'inovasi-form') {
  const form = document.getElementById(idForm);
  const el = (suffix) => document.getElementById(`iga-${suffix}`);
  if (!form || !el('score-display') || !el('cat-display')) return;
  const d = Object.fromEntries(new FormData(form).entries());
  try { d.dokumen_dukung = JSON.parse(d.dokumen_dukung || '[]'); }
  catch { d.dokumen_dukung = []; }
  const skor = skorIga(d);
  const kategori = kategoriIga(skor);
  el('score-display').innerText = skor;
  el('score-input').value = skor;
  el('cat-display').innerText = kategori;
  el('cat-input').value = kategori;
}

const MultiFileUploadField = ({ name, label, helpText, onUbah }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [galat, setGalat] = useState('');

  // Unggah, tambah link, dan hapus file semuanya mengubah hidden input tanpa
  // memicu event change, jadi form tidak tahu skornya harus dihitung ulang.
  // Efek ini yang menutup celah itu. Callback disimpan di ref supaya efek hanya
  // bergantung pada files: parent sering me-render dan callback-nya dibuat anew
  // setiap kali, jadi andalkan deps langsung akan memicu efek tiap render.
  const refUbah = useRef(onUbah);
  refUbah.current = onUbah;
  useEffect(() => { refUbah.current?.(); }, [files]);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setGalat('');
    const newFiles = [...files];
    for (const file of selectedFiles) {
      try {
        const hasil = await unggahFile(file);
        newFiles.push({
          name: hasil.name || file.name,
          url: hasil.url,
          type: file.name.split('.').pop().toUpperCase(),
          size: formatBytes(hasil.size),
        });
      } catch (err) {
        // Pesan dari unggahFile() sudah siap ditampilkan: batas ukuran, GAS belum
        // dikonfigurasi, atau error Drive. Jangan ditimpa teks generik.
        setGalat(err.message);
      }
    }
    setFiles(newFiles);
    setUploading(false);
    e.target.value = '';
  };

  const addLink = () => {
    if (!linkInput.trim()) return;
    setFiles([...files, { name: linkInput.trim(), url: linkInput.trim(), type: 'LINK', size: '-' }]);
    setLinkInput('');
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="url" placeholder="Atau tempel link dokumen..." value={linkInput} onChange={e => setLinkInput(e.target.value)} className="form-input" style={{ flex: '1 1 200px', minWidth: 0 }} />
          <button type="button" onClick={addLink} disabled={!linkInput.trim()} className={`btn-garis${linkInput.trim() ? '' : ' nonaktif'}`}><Link2 size={15} aria-hidden="true" /> Tambah Link</button>
        </div>
        <label className={`btn-zona${uploading ? ' nonaktif' : ''}`} htmlFor={`zona-${name}`}>
          <input id={`zona-${name}`} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" onChange={handleFileChange} disabled={uploading} hidden />
          {uploading ? <Loader2 size={16} className="putar" aria-hidden="true" /> : <Paperclip size={16} aria-hidden="true" />}
          {uploading ? 'Mengunggah ke Google Drive...' : 'Pilih file PDF, gambar, atau dokumen'}
        </label>
        {galat && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ef4444', fontWeight: 600 }}><AlertCircle size={13} aria-hidden="true" /> {galat}</div>}
        {files.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', padding: '8px 12px', borderRadius: 8, border: '1px solid #eee' }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: `${C.navy}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.navy }}>
                  {f.type === 'LINK' ? <Link2 size={15} aria-hidden="true" /> : f.type === 'PDF' ? <Book size={15} aria-hidden="true" /> : <FileText size={15} aria-hidden="true" />}
                </div>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: C.textLight }}>{f.size} • {f.type}</div>
                </div>
                <button type="button" onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
              </div>
            ))}
          </div>
        )}
        <input type="hidden" name={name} value={JSON.stringify(files)} />
        <p style={{ fontSize: 11, color: '#666', margin: 0 }}>{helpText || "Upload file (PDF/Gambar) ke Google Drive atau tambah link URL."}</p>
      </div>
    </div>
  );
};


const OrgBox = ({ data, color, isLeader, isBidang }) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ 
        width: isLeader ? 260 : 220,
        background: hovered ? "white" : "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${hovered ? color : "#e2e8f0"}`,
        boxShadow: hovered 
          ? `0 20px 40px ${color}15, 0 1px 3px rgba(0,0,0,0.05)` 
          : "0 4px 12px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        transform: hovered ? "translateY(-8px) scale(1.02)" : "translateY(0) scale(1)",
        zIndex: hovered ? 10 : 1,
        cursor: "pointer"
      }}>
      <div style={{ 
        background: color, 
        color: "white", 
        padding: "16px", 
        textAlign: "center", 
        position: "relative",
        minHeight: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", opacity: 0.8, textTransform: "uppercase", lineHeight: 1.4 }}>{data.title}</div>
        {hovered && <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 40, height: 3, background: "rgba(255,255,255,0.5)", borderRadius: "2px 2px 0 0" }} />}
      </div>
      <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <div style={{ 
            width: 72, height: 72, borderRadius: "24px", 
            background: hovered ? `${color}15` : "#f8fafc", 
            border: `2px solid ${hovered ? color : "#f1f5f9"}`, 
            display: "flex", alignItems: "center", justifyContent: "center", 
            color: hovered ? color : "#94a3b8", transition: "all 0.4s ease",
            transform: hovered ? "rotate(5deg)" : "rotate(0)"
          }}>
            <User size={30} aria-hidden="true" />
          </div>
          {isLeader && (
            <div style={{ position: "absolute", top: -5, right: -5, background: C.gold, color: "white", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }} title="Pimpinan"><Star size={12} aria-hidden="true" /></div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, lineHeight: 1.3, marginBottom: 4 }}>{data.name}</div>
          <div style={{ fontSize: 10, color: C.textLight, fontWeight: 600, letterSpacing: "0.02em" }}>NIP. {data.nip}</div>
        </div>
      </div>
    </div>
  );
};


const PublicInovasiCard = ({ inv }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxChars = 150;
  const showToggle = inv.rancang_bangun && inv.rancang_bangun.length > maxChars;
  
  const displayText = isExpanded 
    ? inv.rancang_bangun 
    : (inv.rancang_bangun ? inv.rancang_bangun.slice(0, maxChars) + "..." : "Tidak ada deskripsi rancang bangun.");

  return (
    <div className="card" style={{ 
      padding: 24, 
      display: "flex", 
      flexDirection: "column", 
      gap: 16,
      background: "white",
      borderRadius: 16,
      boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
      border: `1px solid ${C.warmGray}55`,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      position: "relative"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ 
          fontSize: 10, 
          fontWeight: 800, 
          background: `${C.gold}15`, 
          color: C.gold, 
          padding: "4px 12px", 
          borderRadius: 20,
          letterSpacing: "0.05em"
        }}>
          {inv.kategori_skor?.toUpperCase() || "INOVATIF"}
        </span>
        <span style={{ fontSize: 12, color: C.textLight, fontWeight: 600 }}>
          Skor IGA: <strong style={{ color: C.navy }}>{inv.skor_iga}</strong>
        </span>
      </div>
      
      <div>
        <h3 style={{ 
          fontSize: 18, 
          fontWeight: 700, 
          color: C.navy, 
          lineHeight: 1.4, 
          marginBottom: 8 
        }}>
          {inv.judul_inovasi}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 13, color: C.textMid, display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
            <Building2 size={14} style={{ flex: "none" }} aria-hidden="true" /> {inv.opd_nama}
          </div>
          <div style={{ fontSize: 13, color: C.textLight, display: "flex", alignItems: "center", gap: 6 }}>
            <User size={14} style={{ flex: "none" }} aria-hidden="true" /> {inv.nama_inovator || "Tim Inovator"}
          </div>
          <div style={{ fontSize: 11, color: C.textLight, display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Scale size={12} aria-hidden="true" /> <strong>Regulasi:</strong> {inv.regulasi_inovasi || "SOP"}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Wallet size={12} aria-hidden="true" /> <strong>Anggaran:</strong> {inv.anggaran_inovasi === "Ada" ? "DPA (Ada)" : "Tidak Ada"}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={12} aria-hidden="true" /> <strong>Penerapan:</strong> {inv.waktu_penerapan || "-"}</span>
          </div>
        </div>
      </div>

      {/* Rancang Bangun Section */}
      <div style={{ 
        background: C.offWhite, 
        padding: "14px 16px", 
        borderRadius: 12, 
        borderLeft: `3px solid ${C.gold}`,
        display: "flex",
        flexDirection: "column",
        gap: 8
      }}>
        <div style={{ 
          fontSize: 11, 
          fontWeight: 800, 
          color: C.navy, 
          textTransform: "uppercase", 
          letterSpacing: "0.05em",
          opacity: 0.8
        }}>
          Rancang Bangun & Pokok Perubahan
        </div>
        <p style={{ 
          fontSize: 12.5, 
          color: C.textDark, 
          lineHeight: 1.6, 
          margin: 0,
          whiteSpace: "pre-line"
        }}>
          {displayText}
        </p>
        {showToggle && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ 
              alignSelf: "flex-start",
              background: "none", 
              border: "none", 
              color: C.gold, 
              fontSize: 11, 
              fontWeight: 700, 
              cursor: "pointer", 
              padding: "2px 0",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            {isExpanded ? "Sembunyikan" : "Baca Selengkapnya"}
          </button>
        )}
      </div>

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginTop: "auto", 
        paddingTop: 14, 
        borderTop: `1px solid ${C.warmGray}77` 
      }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ 
            fontSize: 11, 
            color: C.textLight, 
            background: "#f1f5f9", 
            padding: "2px 8px", 
            borderRadius: 4,
            fontWeight: 500
          }}>
            {inv.jenis_inovasi}
          </span>
          <span style={{ 
            fontSize: 11, 
            color: C.textLight, 
            background: "#f1f5f9", 
            padding: "2px 8px", 
            borderRadius: 4,
            fontWeight: 500
          }}>
            Tahap: {inv.tahapan_inovasi}
          </span>
        </div>

        {/* Video Link */}
        {inv.link_video && (
          <a 
            href={inv.link_video} 
            target="_blank" 
            rel="noreferrer" 
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: 6, 
              fontSize: 11.5, 
              fontWeight: 800, 
              color: "#e11d48", 
              background: "#fff1f2", 
              padding: "6px 12px", 
              borderRadius: 6, 
              textDecoration: "none", 
              border: "1px solid #fecdd3",
              transition: "all 0.2s ease-in-out"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ffe4e6";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff1f2";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Play size={10} fill="#e11d48" /> Tonton Video
          </a>
        )}
      </div>
    </div>
  );
};


function useScrollSpy() {
  const [active, setActive] = useState("beranda");
  useEffect(() => {
    const onScroll = () => {
      const sections = NAV.map(n => document.getElementById(n.id)).filter(Boolean);
      let current = "beranda";
      for (const s of sections) {
        if (window.scrollY >= s.offsetTop - 120) current = s.id;
      }
      setActive(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return active;
}

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function PaginationControls({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 28, flexWrap: "wrap" }}>
      <button className="pagination-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button key={p} className={`pagination-btn ${p === page ? "active" : ""}`} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button className="pagination-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dokSearch, setDokSearch] = useState("");
  const [dokFilter, setDokFilter] = useState("Semua");
  const [dokPage, setDokPage] = useState(1);
  const [beritaPage, setBeritaPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Halaman ini sepenuhnya read-only. Panel admin tidak lagi muncul di sini:
// login, form pengelolaan, dan editor tata letak pindah ke /admin
  // (src/Admin.jsx). Yang tersisa di sini hanya portal Klinik Inovasi — form
  // publik yang memang harus bisa dipakai siapa pun tanpa login.
  //
  // Database States
  const [beritaList, setBeritaList] = useState([]);
  const [dokumenList, setDokumenList] = useState([]);
  const [programList, setProgramList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Modal publik yang tersisa: 'preview-dokumen' handled separately, dan
  // 'inovasi-submit' untuk portal OPD.
  const [showModal, setShowModal] = useState(null);

  const [selectedBerita, setSelectedBerita] = useState(null);
  const [previewDokumen, setPreviewDokumen] = useState(null);
  const [showAllBeritaModal, setShowAllBeritaModal] = useState(false);

  // Slider State
  const [sliderList, setSliderList] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [metricsList, setMetricsList] = useState([]);
  const [inovasiList, setInovasiList] = useState([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const orgScale = windowWidth < 1024 
    ? Math.min(0.9, Math.max(0.15, (windowWidth - 96) / 1200)) 
    : 1.0;


  const active = useScrollSpy();

  const ORG_DATA = {
    kepala: { name: "CHARLES HERMANA WERU, S.SOS", nip: "19721102 200112 1 001", title: "KEPALA BADAN" },
    sekretaris: { name: "IMANUEL M. KALEGOTANA, ST., M.SI", nip: "19800315 200501 1 011", title: "SEKRETARIS" },
    kasubag: { name: "YOHANES B. PATI MAKIN, SE", nip: "19701126 200904 1 001", title: "KEPALA SUB BAGIAN UMUM DAN KEPEGAWAIAN" },
    kelompok: ["KELOMPOK JABATAN FUNGSIONAL", "KELOMPOK JABATAN PELAKSANA"],
    bidang: [
      { title: "PEMERINTAHAN DAN PEMBANGUNAN MANUSIA", name: "FIKA MARTIANA, SET", nip: "19860308 201001 2 032" },
      { title: "PERENCANAAN PENGENDALIAN DAN EVALUASI", name: "JACKSON UBULELE DADE, SE., M.ACC", nip: "19910529 201403 1 002" },
      { title: "PEREKONOMIAN DAN SUMBER DAYA ALAM", name: "ALVIAN ZADRAKH TILUATA KOSI, S.PT", nip: "19771122 200501 1 009" },
      { title: "INFRASTRUKTUR DAN KEWILAYAHAN", name: "ERLAN PORO, ST., M.SC", nip: "19860114 201403 1 002" },
      { title: "RISET DAN INOVASI DAERAH", name: "YAHYA ANTOSARI STORY, S.IP", nip: "19790707 200312 1 006" }
    ],
    uptd: "UPTD"
  };

  const handleViewDocument = (d) => {
    if (!d) return;
    const target = d.url || d.data;
    if (!target) return;
    
    if (target.startsWith('data:')) {
      try {
        const parts = target.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const b64Data = parts[1];
        const byteCharacters = atob(b64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (e) {
        console.error("Blob conversion failed, falling back to direct open:", e);
        window.open(target, '_blank');
      }
    } else {
      window.open(target, '_blank');
    }
  };

  // Satu request ke server native. Server sudah melakukan pengurutan dan
  // penyaringan (dokumen publik saja, inovasi yang sudah disetujui), jadi di sini
  // tidak ada lagi logika "bungkus respons n8n" yang dulu dibutuhkan karena
  // webhook mengembalikan array berisi objek { json: ... }.
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await ambilInit();

      if (data.berita)  setBeritaList(data.berita);
      if (data.dokumen) setDokumenList(data.dokumen);
      if (data.slider)  setSliderList(data.slider);
      if (data.program) setProgramList(data.program);
      if (data.metrics) setMetricsList(data.metrics);
      if (data.inovasi) setInovasiList(data.inovasi);

      setFetchError(null);
    } catch (err) {
      console.error("Fetch all fail:", err);
      setFetchError(`Gagal memuat data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (sliderList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % sliderList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [sliderList.length]);

  const handleKontakSubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;

    try {
      btn.disabled = true;
      btn.innerHTML = 'Mengirim...';

      const fd = new FormData(e.target);
      await kirimKontak(Object.fromEntries(fd.entries()));

      alert("Pesan Anda telah terkirim. Terima kasih!");
      e.target.reset();
    } catch (err) {
      // err.message dari server: "Nama, email, dan pesan wajib diisi" dan
      // sejenisnya. Menampilkan teks generik saja membuat pengunjung mencoba
      // ulang tanpa tahu apa yang salah.
      alert(err.message || "Gagal mengirim pesan. Silakan coba lagi nanti.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  };

  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap";
    document.head.appendChild(link);

    const onScroll = () => setScrolled(window.scrollY > 60);
    const onResize = () => {
      setIsMobile(window.innerWidth < 1024);
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    // Inject Global Mobile Fixes
    const style = document.createElement("style");
    style.innerHTML = `
      * { box-sizing: border-box; }
      body, html { overflow-x: hidden; width: 100%; position: relative; }
      .section-padding { padding: 80px 20px; }
      @media (max-width: 768px) {
        .section-padding { padding: 60px 16px; }
        .display { font-size: 28px !important; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        let retries = 0;
        const scrollAttempt = setInterval(() => {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
            clearInterval(scrollAttempt);
          }
          retries++;
          if (retries > 15) clearInterval(scrollAttempt);
        }, 100);
      }
    };
    
    const t = setTimeout(handleHashScroll, 600);
    window.addEventListener("hashchange", handleHashScroll);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", handleHashScroll);
    };
  }, []);

  return (
    <>
      {notification && (
        <div style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 99999,
          background: notification.type === "success" ? "#10b981" : "#ef4444",
          color: "white",
          padding: "16px 24px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          animation: "slideIn 0.3s ease-out forwards",
          fontWeight: 600,
          fontSize: 14
        }}>
          {notification.type === "success" ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
          {notification.message}
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: ${C.offWhite}; color: ${C.textDark}; }
        ::selection { background: ${C.gold}; color: ${C.navyDark}; }

        @keyframes shimmer {
          0% { background-position: -468px 0 }
          100% { background-position: 468px 0 }
        }
        .shimmer {
          animation: shimmer 2s infinite linear;
          background: linear-gradient(to right, #f6f7f8 8%, #edeef1 18%, #f6f7f8 33%);
          background-size: 1000px 100%;
          display: block;
        }
        @keyframes putar { to { transform: rotate(360deg) } }
        .putar { animation: putar .9s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .putar { animation: none } }
        .news-img-container { overflow: hidden; position: relative; }
        .news-img-container:hover .news-img { transform: scale(1.05); }
        .news-img { transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }

        .display { font-family: 'Playfair Display', Georgia, serif; }
        .italic { font-style: italic; }

        .nav-item {
          color: rgba(255,255,255,0.72);
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 6px 0 4px;
          border-bottom: 2px solid transparent;
          transition: color 0.22s, border-color 0.22s;
          white-space: nowrap;
        }
        .nav-item:hover, .nav-item.active {
          color: ${C.gold};
          border-bottom-color: ${C.gold};
        }

        .btn-gold {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${C.gold}; color: ${C.navyDark};
          padding: 13px 30px; border-radius: 4px;
          font-weight: 600; font-size: 14px; letter-spacing: 0.03em;
          cursor: pointer; border: none;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .btn-gold:hover { background: ${C.goldLight}; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(201,162,39,0.3); }

        .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(255,255,255,0.85);
          padding: 13px 30px; border-radius: 4px;
          font-weight: 500; font-size: 14px;
          cursor: pointer; border: 1.5px solid rgba(255,255,255,0.35);
          transition: border-color 0.2s, color 0.2s;
        }
        .btn-ghost:hover { border-color: ${C.gold}; color: ${C.gold}; }

        .card {
          background: ${C.white};
          border-radius: 14px;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .card:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(11,36,71,0.1); }

        .gold-bar { width: 44px; height: 3px; background: ${C.gold}; }
        .eyebrow {
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.11em; text-transform: uppercase;
          color: ${C.gold};
        }
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(26px, 4vw, 44px);
          font-weight: 700;
          color: ${C.navy};
          line-height: 1.18;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fu  { animation: fadeUp 0.9s ease forwards; }
        .fu1 { animation-delay: 0.1s; opacity: 0; }
        .fu2 { animation-delay: 0.28s; opacity: 0; }
        .fu3 { animation-delay: 0.46s; opacity: 0; }
        .fu4 { animation-delay: 0.64s; opacity: 0; }

        @keyframes pulseDot {
          0%,100% { transform: scale(1); opacity: 1; }
          50%     { transform: scale(1.5); opacity: 0.5; }
        }

        .mobile-nav { display: none; }
        @media (max-width: 860px) {
          .desktop-nav { display: none !important; }
          .mobile-nav  { display: block; }
          .hero-grid   { grid-template-columns: 1fr !important; }
          .profil-grid { grid-template-columns: 1fr !important; }
          .kontak-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }

        input, textarea {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 8px;
          padding: 12px 16px;
          color: white;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.35); }
        input:focus, textarea:focus { border-color: ${C.gold}; }
        textarea { resize: none; }

        .dok-card{background:var(--wh,#fff);border-radius:12px;padding:16px 18px;display:flex;align-items:center;gap:14px;transition:transform .2s,box-shadow .2s;border:1px solid #E8E3D9}
        .dok-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(11,36,71,.09)}
        .dok-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:background .18s,color .18s}
        .search-box{width:100%;background:#F7F4EE;border:1.5px solid #E8E3D9;border-radius:10px;padding:11px 16px 11px 42px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;color:#0D1B2A;transition:border-color .2s}
        .search-box:focus{border-color:#C9A227}
        .filter-btn{padding:8px 18px;border-radius:20px;font-size:12.5px;font-weight:500;cursor:pointer;border:1.5px solid #E8E3D9;background:transparent;color:#8898AA;font-family:'DM Sans',sans-serif;transition:all .18s;white-space:nowrap}
        .filter-btn.active{background:#0B2447;border-color:#0B2447;color:#fff}
        .filter-btn:not(.active):hover{border-color:#C9A227;color:#C9A227}

        .pagination-btn{padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid #E8E3D9;background:#fff;color:#0B2447;font-family:'DM Sans',sans-serif;transition:all .18s;min-width:36px}
        .pagination-btn.active{background:#C9A227;border-color:#C9A227;color:#fff}
        .pagination-btn:not(:disabled):hover:not(.active){border-color:#C9A227;color:#C9A227}
        .pagination-btn:disabled{opacity:.4;cursor:not-allowed}

        .hover-gold:hover { color: ${C.gold} !important; }

        .program-card { background: ${C.white}; border-radius: 16px; overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.03); }
        .program-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(11,36,71,0.08); border-color: ${C.gold}33; }

        .berita-thumb { transition: transform 0.4s ease; }
        .berita-wrap:hover .berita-thumb { transform: scale(1.05); }

        .org-node {
          border-radius: 10px; text-align: center; padding: 18px 20px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .org-node:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(11,36,71,0.1); }

        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(11, 36, 71, 0.75); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;
        }
        .modal-content {
          background: white; border-radius: 20px; width: 100%; max-width: 600px;
          max-height: 90vh; overflow-y: auto; overflow-x: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .modal-content * { min-width: 0; }
        .modal-header { padding: 24px 32px; border-bottom: 1px solid ${C.warmGray}; display: flex; align-items: center; justify-content: space-between; }
        .modal-body { padding: 32px; }
        .modal-footer { padding: 24px 32px; border-top: 1px solid ${C.warmGray}; display: flex; justify-content: flex-end; gap: 12px; }
        
        .btn-admin {
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .btn-admin-edit { background: rgba(255,255,255,0.92); color: ${C.navy}; }
        .btn-admin-edit:hover { background: ${C.gold}; color: white; transform: scale(1.15) rotate(15deg); box-shadow: 0 8px 20px rgba(201,162,39,0.3); }
        .btn-admin-del { background: rgba(255,255,255,0.92); color: #ef4444; }
        .btn-admin-del:hover { background: #ef4444; color: white; transform: scale(1.15) rotate(-15deg); box-shadow: 0 8px 20px rgba(239,68,68,0.3); }
        
        .form-group { marginBottom: 20px; }
        .form-label { display: block; font-size: 13px; font-weight: 600; color: ${C.navy}; marginBottom: 8px; }
        .form-input {
          width: 100%; background: ${C.offWhite}; border: 1.5px solid ${C.warmGray};
          border-radius: 10px; padding: 12px 16px; color: ${C.navyDark};
          font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s;
        }
        .form-input:focus { border-color: ${C.gold}; }

        /* Dua kolom di dalam modal. minmax(0,...) wajib: 1fr saja memakai
           min-width auto, jadi isi panjang seperti URL panjang meny pushes
           kolom melebar dan memunculkan scroll horizontal. */
        .form-dua { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        @media (max-width: 620px) { .form-dua { grid-template-columns: minmax(0, 1fr); } }

        /* Pilihan file: dropzone putus-putus, mengikuti radius .form-input. */
        .btn-zona {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; padding: 16px; background: ${C.offWhite};
          border: 2px dashed ${C.warmGray}; border-radius: 10px;
          font-size: 13px; font-weight: 600; color: ${C.navy}; font-family: 'DM Sans', sans-serif;
          cursor: pointer; text-align: center;
          transition: border-color 0.2s, background 0.2s, color 0.2s;
        }
        .btn-zona:hover { border-color: ${C.gold}; background: ${C.white}; color: ${C.gold}; }
        .btn-zona.nonaktif { opacity: 0.55; cursor: progress; }

        /* Tombol aksi sekunder di modal, garis penuh (bukan putus-putus). */
        .btn-garis {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          background: ${C.white}; color: ${C.navy};
          border: 1.5px solid ${C.warmGray}; border-radius: 10px;
          padding: 12px 18px; font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif;
          cursor: pointer; white-space: nowrap; transition: border-color 0.2s, color 0.2s;
        }
        .btn-garis:hover:not(.nonaktif) { border-color: ${C.gold}; color: ${C.gold}; }
        .btn-garis.nonaktif { opacity: 0.5; cursor: not-allowed; }

        .org-wrapper { width: 100%; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; padding-top: 20px; padding-bottom: 80px; display: flex; justify-content: flex-start; }
        .org-container { position: relative; width: 1200px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; padding: 0 40px; }
        .org-spine { position: absolute; top: 100px; bottom: 100px; left: 50%; width: 2.5px; background: #CBD5E1; z-index: 0; transform: translateX(-50%); }
        .org-level-2 { width: 100%; position: relative; display: flex; flex-direction: row; align-items: flex-start; justify-content: center; gap: 0; margin-bottom: 110px; }
        .org-level-3 { width: 100%; position: relative; margin-bottom: 110px; }
        .org-grid { display: grid; gap: 20px; grid-template-columns: repeat(5, 1fr); width: 1120px; margin: 0 auto; }

        .swipe-hint { display: none; }
        @media (max-width: 1024px) {
          .swipe-hint { display: flex !important; align-items: center; justify-content: center; gap: 8px; color: ${C.navy}; font-size: 13px; font-weight: 600; margin-bottom: 24px; animation: pulse 2s infinite; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: translateX(0); }
          50% { opacity: 1; transform: translateX(10px); }
        }
      `}</style>

      {/* ──── NAVBAR ──── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
        background: scrolled ? `rgba(6,21,41,0.96)` : "transparent",
        borderBottom: scrolled ? `1px solid rgba(201,162,39,0.25)` : "none",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        transition: "background 0.4s, border 0.4s",
      }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 28px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => scrollTo("beranda")}>
            <div style={{ width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src={LOGO_URL} alt="Logo BAPPERIDA" style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              <div style={{ display: "none", width: "100%", height: "100%", borderRadius: "50%", background: C.gold, alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18, color: C.navyDark }}>B</span>
              </div>
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1.2, letterSpacing: "0.02em" }}>BAPPERIDA</div>
              <div style={{ color: C.gold, fontSize: 10.5, fontWeight: 400, letterSpacing: "0.05em" }}>Kabupaten Sumba Barat</div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="desktop-nav" style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {NAV.map(n => (
              <span key={n.id} className={`nav-item ${active === n.id ? "active" : ""}`} onClick={() => { scrollTo(n.id); setMenuOpen(false); }}>{n.label}</span>
            ))}
          </nav>

          {/* Mobile toggle */}
          <button className="mobile-nav" onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 4 }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div style={{ background: C.navyDark, borderTop: `1px solid rgba(201,162,39,0.2)`, padding: "8px 28px 20px" }}>
            {NAV.map(n => (
              <div key={n.id} onClick={() => { scrollTo(n.id); setMenuOpen(false); }}
                style={{ padding: "13px 0", color: active === n.id ? C.gold : "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 500, borderBottom: `1px solid rgba(255,255,255,0.07)`, cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                {n.label}
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ──── HERO ──── */}
      <section id="beranda" style={{ minHeight: "100vh", backgroundColor: C.navyDark, display: "flex", flexDirection: "column", justifyContent: "flex-start", paddingTop: "22vh", paddingBottom: "60px", position: "relative", overflow: "hidden" }}>
        {/* Carousel Background */}
        {sliderList.length > 0 ? (
          sliderList.map((slide, idx) => (
            <div
              key={slide.id}
              style={{
                position: "absolute", inset: 0,
                opacity: currentSlide === idx ? 1 : 0,
                transition: "opacity 1.5s ease-in-out",
                zIndex: 0
              }}
            >
              <FadeInImage src={getDriveThumb(slide.gambar_url, 1600)} alt={slide.judul} style={{ width: "100%", height: "100%" }} />
            </div>
          ))
        ) : (
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, ${C.navyDark} 0%, ${C.navyMid} 45%, #1A4A72 100%)`, zIndex: 0 }} />
        )}

        {/* Overlay gradient to ensure text readability */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(150deg, rgba(11,36,71,0.95) 0%, rgba(11,36,71,0.85) 45%, rgba(26,74,114,0.7) 100%)`, zIndex: 0 }} />

        {/* Decorative rings */}
        {[700, 1050, 1400].map((s, i) => (
          <div key={s} style={{ position: "absolute", top: "50%", right: -s * 0.35, transform: "translateY(-50%)", width: s, height: s, borderRadius: "50%", border: `1px solid rgba(201,162,39,${0.07 - i * 0.02})`, pointerEvents: "none" }} />
        ))}
        {/* Vertical gold accent */}
        <div style={{ position: "absolute", left: 0, top: "25%", width: 5, height: "50%", background: `linear-gradient(to bottom, transparent, ${C.gold}, transparent)`, opacity: 0.7 }} />
        {/* Bottom fade */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 140, background: `linear-gradient(to top, ${C.offWhite}, transparent)` }} />

        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 28px", position: "relative", zIndex: 1, width: "100%" }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 64, alignItems: "flex-start" }}>
            {/* Left */}
            <div style={{ position: "relative", zIndex: 1 }}>
              {/* Badge */}
              <div className="fu fu1" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(201,162,39,0.12)", border: `1px solid rgba(201,162,39,0.3)`, borderRadius: 24, padding: "6px 18px", marginBottom: 32 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.gold, animation: "pulseDot 2s infinite" }} />
                <span style={{ color: C.gold, fontSize: 11.5, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase" }}>Pemerintah Kabupaten Sumba Barat</span>
              </div>

              {sliderList.length > 0 && sliderList[currentSlide] && sliderList[currentSlide].judul ? (
                <>
                  <h1 className="fu fu2 display" style={{ fontSize: "clamp(32px, 5vw, 64px)", fontWeight: 800, color: "white", lineHeight: 1.1, marginBottom: 12, textShadow: "0 4px 20px rgba(0,0,0,0.3)", minHeight: "2.2em" }}>
                    {sliderList[currentSlide].judul}
                  </h1>
                  <p className="fu fu3" style={{ fontSize: "clamp(16px, 1.2vw, 20px)", color: "rgba(255,255,255,0.8)", lineHeight: 1.6, maxWidth: 650, marginBottom: 44, fontWeight: 500, minHeight: "3.2em" }}>
                    {sliderList[currentSlide].subjudul}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="fu fu2 display" style={{ fontSize: "clamp(36px, 5.5vw, 70px)", fontWeight: 700, color: "white", lineHeight: 1.08, marginBottom: 6 }}>Badan Perencanaan</h1>
                  <h1 className="display" style={{ fontSize: "clamp(36px, 5.5vw, 70px)", fontWeight: 700, color: C.gold, lineHeight: 1.08, marginBottom: 6 }}>Pembangunan Riset</h1>
                  <h1 className="display" style={{ fontSize: "clamp(36px, 5.5vw, 70px)", fontWeight: 700, color: "rgba(255,255,255,0.88)", lineHeight: 1.08, marginBottom: 32 }}>&amp; Inovasi Daerah</h1>
                  
                  <p className="fu fu3" style={{ fontSize: 16.5, color: "rgba(255,255,255,0.62)", lineHeight: 1.85, maxWidth: 580, marginBottom: 44 }}>
                    Mendorong perencanaan pembangunan daerah yang berkualitas, partisipatif, dan inovatif untuk mewujudkan Kabupaten Sumba Barat yang maju, mandiri, dan sejahtera bagi seluruh masyarakat.
                  </p>
                </>
              )}

              <div className="fu fu4" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 64 }}>
                <button className="btn-gold" onClick={() => scrollTo("profil")}>Kenali Kami <ArrowRight size={15} /></button>
                <button className="btn-ghost" onClick={() => scrollTo("program")}>Program Kerja</button>
              </div>

              {/* Stats */}
              <div className="fu fu4" style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
                {[
                  { val: "2016", label: "Tahun Berdiri" },
                  { val: "48+", label: "ASN Aktif" },
                  { val: "6", label: "Bidang Kerja" },
                  { val: "100%", label: "Komitmen" },
                ].map(s => (
                  <div key={s.label}>
                    <div className="display" style={{ fontSize: 34, fontWeight: 700, color: C.gold, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Decorative card */}
            <div className="fu fu3" style={{ position: "relative" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "36px 32px" }}>
                <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Tugas Pokok & Fungsi</div>
                {[
                  { icon: Target, text: "Perencanaan & pengendalian pembangunan daerah" },
                  { icon: Lightbulb, text: "Pengembangan riset dan inovasi daerah" },
                  { icon: BarChart2, text: "Monitoring, evaluasi & pelaporan program" },
                  { icon: Globe, text: "Koordinasi lintas sektor & kemitraan strategis" },
                  { icon: BookOpen, text: "Penyusunan RPJMD, RKPD & dokumen perencanaan" },
                  { icon: Shield, text: "Pengendalian kualitas perencanaan pembangunan" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `rgba(201,162,39,0.15)`, border: `1px solid rgba(201,162,39,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={14} color={C.gold} />
                    </div>
                    <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.65, paddingTop: 5 }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Slider Dots */}
        {sliderList.length > 1 && (
          <div style={{ position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 2 }}>
            {sliderList.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                style={{ width: currentSlide === idx ? 24 : 8, height: 8, borderRadius: 4, background: currentSlide === idx ? C.gold : "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", transition: "all 0.3s ease" }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Scroll cue */}
        <div onClick={() => scrollTo("profil")} style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", zIndex: 2 }}>
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Gulir ke bawah</span>
          <ChevronDown size={18} color="rgba(255,255,255,0.3)" />
        </div>
      </section>

      {/* ──── PROFIL ──── */}
      <section id="profil" style={{ background: C.white, padding: "96px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div className="profil-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            {/* Text side */}
            <div>
              <div className="gold-bar" style={{ marginBottom: 20 }} />
              <p className="eyebrow" style={{ marginBottom: 14 }}>Tentang Kami</p>
              <h2 className="section-title" style={{ marginBottom: 28 }}>Profil BAPPERIDA<br />Kabupaten Sumba Barat</h2>
              <p style={{ fontSize: 16, color: C.textMid, lineHeight: 1.9, marginBottom: 18 }}>
                Badan Perencanaan Pembangunan Riset dan Inovasi Daerah (BAPPERIDA) Kabupaten Sumba Barat adalah perangkat daerah yang bertanggung jawab dalam perencanaan, pengendalian, dan evaluasi pembangunan daerah secara terpadu dan terkoordinasi.
              </p>
              <p style={{ fontSize: 16, color: C.textMid, lineHeight: 1.9, marginBottom: 36 }}>
                Kami berperan sebagai think tank Pemerintah Kabupaten Sumba Barat dalam merumuskan kebijakan strategis pembangunan yang berorientasi pada peningkatan kualitas hidup masyarakat melalui riset berbasis data dan inovasi berkelanjutan.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { label: "Perencanaan", desc: "Penyusunan RPJMD & RKPD", color: C.navy },
                  { label: "Riset & Inovasi", desc: "Penelitian pembangunan daerah", color: "#1a6b45" },
                  { label: "Pengendalian", desc: "Monitoring & evaluasi program", color: "#7c3aed" },
                  { label: "Koordinasi", desc: "Sinkronisasi lintas sektor", color: "#b45309" },
                ].map(f => (
                  <div key={f.label} style={{ background: C.offWhite, borderRadius: 10, padding: "16px 18px", borderLeft: `3px solid ${f.color}` }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: f.color, marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontSize: 12.5, color: C.textLight }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual side */}
            <div style={{ position: "relative" }}>
              <div style={{ background: `linear-gradient(145deg, ${C.navy} 0%, ${C.navyLight} 100%)`, borderRadius: 18, padding: "40px 36px", color: "white", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(201,162,39,0.18)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -80, left: -80, width: 280, height: 280, borderRadius: "50%", border: "1px solid rgba(201,162,39,0.1)", pointerEvents: "none" }} />

                <div className="display" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, position: "relative" }}>Dasar Hukum</div>
                <div style={{ width: 36, height: 2, background: C.gold, marginBottom: 28 }} />

                {[
                  { no: "01", text: "UU No. 25 Tahun 2004 tentang Sistem Perencanaan Pembangunan Nasional (SPPN)" },
                  { no: "02", text: "PP No. 18 Tahun 2016 tentang Perangkat Daerah sebagaimana diubah dengan PP 72/2019" },
                  { no: "03", text: "Peraturan Daerah Kabupaten Sumba Barat tentang Pembentukan & Susunan Perangkat Daerah" },
                  { no: "04", text: "Perbup Sumba Barat tentang Kedudukan, Susunan Organisasi, Tugas & Fungsi BAPPERIDA" },
                ].map(item => (
                  <div key={item.no} style={{ display: "flex", gap: 14, marginBottom: 20, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 30, height: 30, borderRadius: "50%", background: "rgba(201,162,39,0.18)", border: `1px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.gold, flexShrink: 0 }}>{item.no}</div>
                    <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.7, paddingTop: 4 }}>{item.text}</p>
                  </div>
                ))}
              </div>

              {/* Floating badge */}
              <div style={{ position: "absolute", bottom: -18, right: -18, background: C.gold, borderRadius: 12, padding: "14px 20px", boxShadow: `0 10px 28px rgba(201,162,39,0.45)` }}>
                <div className="display" style={{ fontSize: 13, fontWeight: 700, color: C.navyDark, lineHeight: 1 }}>Est.</div>
                <div className="display" style={{ fontSize: 30, fontWeight: 700, color: C.navyDark, lineHeight: 1.1 }}>2016</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── VISI & MISI ──── */}
      <section id="visi-misi" style={{ background: C.offWhite, padding: "96px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div className="gold-bar" style={{ margin: "0 auto 20px" }} />
            <p className="eyebrow" style={{ marginBottom: 14 }}>Arah & Tujuan</p>
            <h2 className="section-title">Visi &amp; Misi</h2>
          </div>

          {/* Visi box */}
          <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1A527A 100%)`, borderRadius: 18, padding: "52px 56px", textAlign: "center", marginBottom: 40, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")" }} />
            <div style={{ position: "relative" }}>
              <div style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 22 }}>― VISI ―</div>
              <p className="display italic" style={{ fontSize: "clamp(18px, 2.8vw, 28px)", fontWeight: 600, color: "white", lineHeight: 1.65, maxWidth: 820, margin: "0 auto" }}>
                "Terwujudnya Perencanaan Pembangunan Daerah yang Berkualitas, Partisipatif, dan Inovatif Menuju Kabupaten Sumba Barat yang Maju, Mandiri, dan Sejahtera"
              </p>
            </div>
          </div>

          {/* Misi cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16 }}>
            {[
              { n: "M1", title: "Perencanaan Berkualitas", desc: "Meningkatkan kualitas perencanaan pembangunan daerah yang komprehensif, terintegrasi, dan berbasis data valid." },
              { n: "M2", title: "Partisipasi Masyarakat", desc: "Mendorong keterlibatan aktif masyarakat dalam proses perencanaan pembangunan secara transparan dan akuntabel." },
              { n: "M3", title: "Riset & Inovasi", desc: "Mengembangkan kapasitas penelitian dan inovasi daerah sebagai landasan kebijakan pembangunan berbasis bukti." },
              { n: "M4", title: "Pengendalian Efektif", desc: "Memperkuat sistem monitoring dan evaluasi pelaksanaan program pembangunan secara berkala dan terukur." },
              { n: "M5", title: "SDM Profesional", desc: "Meningkatkan kapasitas aparatur perencana yang kompeten, profesional, and memiliki integritas tinggi." },
              { n: "M6", title: "Kolaborasi Strategis", desc: "Membangun kemitraan dengan berbagai pemangku kepentingan untuk pembangunan yang inklusif and berkelanjutan." },
            ].map(m => (
              <div key={m.n} className="card" style={{ padding: "28px 26px", borderTop: `3px solid ${C.gold}` }}>
                <div className="display" style={{ fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: "0.1em", marginBottom: 14 }}>{m.n}</div>
                <h3 style={{ fontSize: 15.5, fontWeight: 600, color: C.navy, marginBottom: 10 }}>{m.title}</h3>
                <p style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.82 }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── CAPAIAN KINERJA 2025 ──── */}
      <section id="kinerja" style={{ background: C.white, padding: "96px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div className="gold-bar" style={{ margin: "0 auto 20px" }} />
            <p className="eyebrow" style={{ marginBottom: 14 }}>Metrik Kinerja</p>
            <h2 className="section-title">Capaian Kinerja 2025</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {metricsList.map(m => (
              <div key={m.id} className="card" style={{ padding: "40px 30px", textAlign: "center", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", background: `linear-gradient(to bottom, #ffffff, ${C.offWhite})`, border: `1px solid ${C.warmGray}`, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
                <div>
                  <div style={{ color: C.gold, marginBottom: 16, display: "flex", justifyContent: "center" }}><BarChart2 size={48} aria-hidden="true" /></div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: C.textMid, marginBottom: 20, lineHeight: 1.5 }}>{m.label}</h3>
                </div>
                <div>
                  <div style={{ fontSize: 42, fontWeight: 800, color: C.navy, letterSpacing: "-0.02em", background: `linear-gradient(90deg, ${C.navy}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {m.value}
                  </div>
                </div>
              </div>
            ))}
            {metricsList.length === 0 && !loading && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", color: C.textLight, padding: 40 }}>Metrik belum tersedia.</div>
            )}
          </div>
        </div>
      </section>

      {/* ──── STRUKTUR ORGANISASI ──── */}
      <section id="struktur" style={{ background: C.offWhite, padding: "96px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div className="gold-bar" style={{ margin: "0 auto 20px" }} />
            <p className="eyebrow" style={{ marginBottom: 14 }}>Organisasi</p>
            <h2 className="section-title">Struktur Organisasi BAPPERIDA<br />Kabupaten Sumba Barat</h2>
            <p style={{ fontSize: 15.5, color: C.textMid, marginTop: 14, maxWidth: 600, margin: "14px auto 0" }}>Berdasarkan Peraturan Bupati Sumba Barat tentang Kedudukan, Susunan Organisasi, Tugas dan Fungsi serta Tata Kerja Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah</p>
          </div>

          <div style={{ 
            width: "100%", 
            background: "transparent", 
            overflow: "auto",
            borderRadius: 20,
            border: `1.5px dashed ${C.warmGray}`,
            padding: "24px 16px",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.01)"
          }}>
            {/* Height-compensated container using computed scaled height */}
            <div style={{ 
              width: 1200 * orgScale,
              height: 1400 * orgScale,
              overflow: "hidden",
              margin: "0 auto",
              position: "relative",
              transition: "width 0.3s ease, height 0.3s ease"
            }}>
              <div style={{ 
                width: 1200,
                height: 1400,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform: `translateX(-50%) scale(${orgScale})`,
                transformOrigin: "top center",
                transition: "transform 0.3s ease",
                position: "absolute",
                top: 0,
                left: "50%"
              }}>
                
                {/* KEPALA BADAN (CENTER) */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", width: "100%" }}>
                  <OrgBox data={ORG_DATA.kepala} color={C.navy} isLeader />
                  <div style={{ width: 3, height: 100, background: `linear-gradient(to bottom, ${C.navy}, #cbd5e1)`, borderRadius: 2 }}></div>
                </div>

                {/* MANAGEMENT HUB */}
                <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center", height: 640 }}>
                  {/* Horizontal connection line at the top of the hub */}
                  <div style={{ 
                    position: "absolute", top: 0, left: "50%", width: "40%", height: 80, 
                    borderTop: "3px solid #cbd5e1", borderLeft: "3px solid #cbd5e1", borderRight: "3px solid #cbd5e1",
                    borderRadius: "24px 24px 0 0", transform: "translateX(-50%)"
                  }}></div>
                  
                  {/* Main vertical trunk through the center */}
                  <div style={{ width: 3, height: "100%", background: "#cbd5e1", position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)" }}></div>

                  {/* Left side: KELOMPOK JABATAN */}
                  <div style={{ position: "absolute", left: "30%", top: 80, transform: "translateX(-50%)", width: 260, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ 
                      padding: "24px 30px", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", color: "#38bdf8", borderRadius: 24, fontWeight: 800, fontSize: 13, textAlign: "center", 
                      boxShadow: "0 10px 30px rgba(0,0,0,0.04)", width: "100%", border: "1px solid #e2e8f0"
                    }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 12, letterSpacing: "0.1em", fontWeight: 900 }}>KELOMPOK JABATAN</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ padding: "8px 12px", background: "#38bdf810", borderRadius: 12 }}>FUNGSIONAL</div>
                        <div style={{ padding: "8px 12px", background: "#38bdf810", borderRadius: 12 }}>PELAKSANA</div>
                      </div>
                    </div>
                  </div>

                  {/* Right side: SEKRETARIS & KASUBAG */}
                  <div style={{ position: "absolute", left: "70%", top: 80, transform: "translateX(-50%)", width: 260, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                    <OrgBox data={ORG_DATA.sekretaris} color={C.navy} />
                    <div style={{ width: 3, height: 40, background: "#cbd5e1" }}></div>
                    <OrgBox data={ORG_DATA.kasubag} color="#0ea5e9" />
                  </div>
                </div>

                {/* VERTICAL CONNECTOR TO BOTTOM */}
                <div style={{ width: 3, height: 120, background: "#cbd5e1" }}></div>

                {/* OPERATIONAL LEVEL (BIDANG) */}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 1180, height: 80, position: "relative" }}>
                    {/* The main horizontal line spanning between the centers of the 1st and 5th boxes */}
                    {/* For 5 boxes of 220px with 20px gap, total width is 1180px. Centers: 110, 350, 590, 830, 1070 */}
                    <div style={{ position: "absolute", top: 0, left: 110, right: 110, height: 3, background: "#cbd5e1" }}></div>
                    
                    {/* Fixed markers at exact centers of each 220px slot */}
                    {[110, 350, 590, 830, 1070].map(pos => (
                      <div key={pos} style={{ 
                        position: "absolute", top: 0, left: pos, width: 3, height: 80, 
                        background: "#cbd5e1", marginLeft: -1.5 
                      }}></div>
                    ))}
                  </div>

                  <div style={{ 
                    display: "flex", 
                    justifyContent: "center",
                    gap: 20, 
                    width: 1180
                  }}>
                    {ORG_DATA.bidang.map((b, i) => (
                      <OrgBox key={i} data={b} color="#0ea5e9" isBidang />
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>





      {/* ──── PROGRAM & KEGIATAN ──── */}
      <section id="program" style={{ background: C.offWhite, padding: "96px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 56, flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="gold-bar" style={{ marginBottom: 20 }} />
              <p className="eyebrow" style={{ marginBottom: 14 }}>Agenda Strategis 2026</p>
              <h2 className="section-title" style={{ maxWidth: 520 }}>Program &amp; Kegiatan Unggulan</h2>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 32 }}>
            {programList.map(p => (
              <div key={p.id} className="program-card" style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
                
                <div style={{ padding: "32px", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                    <div style={{ fontSize: 42, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>{p.icon}</div>
                    <span style={{ background: `${p.sc || C.gold}12`, color: p.sc || C.gold, fontSize: 10, fontWeight: 800, padding: "6px 14px", borderRadius: 20, letterSpacing: "0.04em", whiteSpace: "nowrap", border: `1px solid ${p.sc || C.gold}22` }}>{p.status.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.textLight, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>{p.cat}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 14, lineHeight: 1.4 }}>{p.title}</h3>
                  <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.8, flexGrow: 1 }}>{p.desc}</p>
                </div>
                <div style={{ height: 4, background: `linear-gradient(to right, ${C.navy}, ${p.sc || C.gold})`, opacity: 0.8 }} />
              </div>
            ))}
            {programList.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px", background: "white", borderRadius: 16, border: "1px dashed #ddd" }}>
                <div style={{ color: C.gold, marginBottom: 14 }}><Calendar size={40} aria-hidden="true" /></div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.navy, marginBottom: 6 }}>Belum ada program tersedia</div>
                <div style={{ fontSize: 14, color: C.textLight }}>Data sedang dimuat atau belum ditambahkan oleh admin.</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ──── STANDAR PELAYANAN ──── */}
      <section style={{ background: C.white, padding: "96px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div className="gold-bar" style={{ marginBottom: 20 }} />
          <p className="eyebrow" style={{ marginBottom: 14 }}>Standar Pelayanan</p>
          <h2 className="section-title" style={{ marginBottom: 48 }}>Standar Pelayanan BAPPERIDA</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 32 }}>
            {[
              {
                judul: "Fasilitasi Perencanaan Pembangunan",
                tags: ["Perekonomian & SDA", "Pemerintahan", "Pembangunan Manusia", "Infrastruktur", "Kewilayakan"],
                alurLabel: "Alur mengikuti Permendagri No. 86/2017",
                persyaratan: [
                  "Surat pengantar Kepala PD",
                  "Data kinerja berjalan",
                  "Rancangan awal RKPD & Renstra PD",
                  "Rancangan Renja PD",
                  "Hasil Musrenbang Kecamatan",
                ],
                alur: [
                  { judul: "Ajukan usulan", desc: "Renja/usulan program ke BAPPERIDA" },
                  { judul: "Verifikasi awal", desc: "Cek kesesuaian dengan RKPD & Musrenbang" },
                  { judul: "Forum Perangkat Daerah", desc: "Sepakati program & pagu indikatif" },
                  { judul: "Berita Acara", desc: "Catat hasil kesepakatan Forum PD" },
                  { judul: "Verifikasi akhir", desc: "Cocokkan dengan RKPD final" },
                  { judul: "Rekomendasi terbit", desc: "Dasar penetapan Renja PD" },
                ],
                waktu: "14 hari kerja",
                produk: ["Rekomendasi verifikasi Renja-RKPD", "Berita Acara Forum PD"],
              },
              {
                judul: "Fasilitasi Pelaporan Inovasi Daerah",
                tags: ["Bidang Riset dan Inovasi"],
                persyaratan: [
                  "Formulir usulan inovasi",
                  "SK penetapan inovasi",
                  "Surat pengantar pimpinan PD",
                  "Laporan & dokumentasi kegiatan",
                ],
                alur: [
                  { judul: "Sampaikan data", desc: "Manual atau lewat aplikasi IID" },
                  { judul: "Verifikasi data", desc: "Cek kelengkapan & validitas" },
                  { judul: "Kompilasi & reviu", desc: "Seluruh usulan Perangkat Daerah" },
                  { judul: "Susun laporan", desc: "Indeks inovasi daerah" },
                  { judul: "Unggah laporan", desc: "Ke sistem pelaporan Kemendagri" },
                  { judul: "Bukti pelaporan", desc: "Diserahkan ke Perangkat Daerah" },
                ],
                waktu: "3 hari kerja",
                produk: ["Laporan/Indeks Inovasi Daerah", "Tanda bukti pelaporan"],
              },
            ].map((layanan, idx) => (
              <div key={idx} style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ background: C.navy, padding: "24px 28px" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 12 }}>{layanan.judul}</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {layanan.tags.map(tag => (
                      <span key={tag} style={{ background: `${C.gold}22`, color: C.gold, fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 20, border: `1px solid ${C.gold}44` }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "28px 28px 24px" }}>
                  {/* A: Persyaratan */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: C.gold, color: "white", fontSize: 11, fontWeight: 800 }}>A</span>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Persyaratan Pelayanan</h4>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 8 }}>
                      {layanan.persyaratan.map((p, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: C.textMid, lineHeight: 1.5 }}>
                          <span style={{ color: C.gold, fontSize: 10, marginTop: 5, flexShrink: 0 }}>◆</span>
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                  {layanan.alurLabel && (
                    <p style={{ fontSize: 11.5, color: C.textLight, marginBottom: 16, fontStyle: "italic" }}>{layanan.alurLabel}</p>
                  )}
                  {/* Alur */}
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 14 }}>Alur Pelayanan</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {layanan.alur.map((step, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32, flexShrink: 0 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.navy, color: "white", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
                            {i < layanan.alur.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: `${C.navy}22`, margin: "4px 0" }} />}
                          </div>
                          <div style={{ paddingBottom: i < layanan.alur.length - 1 ? 16 : 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.navy, marginBottom: 2 }}>{step.judul}</div>
                            <div style={{ fontSize: 12.5, color: C.textLight }}>{step.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Info boxes */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ background: "white", border: `1px solid ${C.gold}33`, borderRadius: 10, padding: "14px 18px", flex: "1 1 140px" }}>
                      <div style={{ fontSize: 11, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Waktu pelayanan</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.gold }}>{layanan.waktu}</div>
                    </div>
                    <div style={{ background: "white", border: `1px solid ${C.gold}33`, borderRadius: 10, padding: "14px 18px", flex: "1 1 140px" }}>
                      <div style={{ fontSize: 11, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Biaya / Tarif</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.gold }}>Gratis</div>
                    </div>
                  </div>
                  {/* Produk */}
                  <div style={{ marginTop: 20, borderTop: `1px solid ${C.navy}12`, paddingTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Produk Pelayanan</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {layanan.produk.map((p, i) => (
                        <div key={i} style={{ fontSize: 13, color: C.textMid, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: C.gold, fontSize: 10 }}>◆</span>{p}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Pengelolaan pengaduan */}
          <div style={{ marginTop: 40, background: `rgba(11,36,71,0.04)`, borderRadius: 12, padding: "20px 26px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Pengelolaan pengaduan</div>
              <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>
                Kantor BAPPERIDA, Jl. Wee Karou, Waikabubak, NTT — bapperidasb@gmail.com — Melalui SP4N-LAPOR!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── DOKUMEN PUBLIK ──── */}
      <section id="dokumen" style={{ background: C.offWhite, padding: "96px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, flexWrap: "wrap", gap: 24 }}>
            <div style={{ flex: isMobile ? "0 0 100%" : "1" }}>
              <div className="gold-bar" style={{ marginBottom: 20 }} />
              <p className="eyebrow" style={{ marginBottom: 14 }}>Keterbukaan Informasi</p>
              <h2 className="section-title">Dokumen Publik</h2>
              <p style={{ fontSize: 15, color: C.textMid, marginTop: 10, maxWidth: 520 }}>
                Dokumen resmi perencanaan pembangunan, regulasi, and laporan kinerja BAPPERIDA Kabupaten Sumba Barat tersedia untuk diakses oleh publik.
              </p>
            </div>
            <div style={{ background: `rgba(11,36,71,0.06)`, borderRadius: 12, padding: "14px 22px", textAlign: "center", width: isMobile ? "100%" : "auto", display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: "center", justifyContent: "center", gap: isMobile ? 12 : 2 }}>
              <div className="display" style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.navy }}>{dokumenList.length}</div>
              <div style={{ fontSize: 11.5, color: C.textLight, letterSpacing: "0.06em", textTransform: "uppercase" }}>Total Dokumen</div>
            </div>
          </div>

          {/* Search & Filter */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ position: "relative", maxWidth: isMobile ? "100%" : 480, marginBottom: 20 }}>
              <Search size={16} color={C.textLight} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                className="search-box"
                type="text"
                placeholder="Cari dokumen..."
                value={dokSearch}
                onChange={e => { setDokSearch(e.target.value); setDokPage(1); }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["Semua", ...[...new Set(dokumenList.map(d => d.kategori).filter(Boolean))]].map(kat => (
                  <button key={kat} className={`filter-btn ${dokFilter === kat ? "active" : ""}`} onClick={() => { setDokFilter(kat); setDokPage(1); }}>
                    {kat === "Semua" ? "Semua Kategori" : kat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dokumen List */}
          {(() => {
            const filtered = dokumenList.filter(d =>
              (dokFilter === "Semua" || d.kategori === dokFilter) &&
              (dokSearch === "" || d.judul.toLowerCase().includes(dokSearch.toLowerCase()))
            );
            const pageSize = 10;
            const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
            const curPage = Math.min(dokPage, totalPages);
            const items = filtered.slice((curPage - 1) * pageSize, curPage * pageSize);

            return (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {items.map(dok => (
                      <div key={dok.id} className="dok-card">
                        <div style={{ width: 46, height: 46, borderRadius: 10, background: `${C.navy}12`, border: `1px solid ${C.navy}22`, display: "flex", alignItems: "center", justifyContent: "center", color: C.navy, flexShrink: 0 }}>
                          <FileText size={22} aria-hidden="true" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 600, color: C.navy, marginBottom: 5, lineHeight: 1.4 }}>{dok.judul}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textLight }}>
                              <FileText size={11} /> {dok.tipe || "PDF"}
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: C.textLight }}><Package size={12} aria-hidden="true" /> {dok.ukuran || "-"}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textLight }}>
                              <Calendar size={11} /> {tgl(dok.tanggal)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button onClick={async () => {
                            // /api/init sengaja tidak mengirim kolom url, jadi tautan
                            // diambil saat pengunjung benar-benar menekan tombol Lihat.
                            try {
                              const hasil = await ambilTautanDokumen(dok.id);
                              setPreviewDokumen({ ...dok, url: hasil.url });
                            } catch (e) {
                              alert(e.message || "Gagal memuat dokumen.");
                            }
                          }} className="btn-admin btn-admin-edit" style={{ width: "auto", padding: "0 14px", borderRadius: 10, fontSize: 12, fontWeight: 700 }} title="Lihat Dokumen">
                            <Eye size={14} style={{ marginRight: 6 }} /> Lihat
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
                <PaginationControls page={curPage} totalPages={totalPages} onChange={setDokPage} />
              </>
            );
          })()}

          {/* Empty state */}
          {dokumenList.filter(d =>
            (dokFilter === "Semua" || d.kategori === dokFilter) &&
            (dokSearch === "" || d.judul.toLowerCase().includes(dokSearch.toLowerCase()))
          ).length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textLight }}>
              <div style={{ color: "#cbd5e1", marginBottom: 14 }}><Search size={40} aria-hidden="true" /></div>
              <div style={{ fontSize: 16, fontWeight: 500, color: C.textMid, marginBottom: 6 }}>
                {dokumenList.length === 0 ? "Belum ada dokumen tersedia" : "Dokumen tidak ditemukan"}
              </div>
              <div style={{ fontSize: 14 }}>
                {dokumenList.length === 0 ? "Data sedang dimuat atau belum ditambahkan." : "Coba kata kunci lain atau pilih kategori berbeda"}
              </div>
            </div>
          )}

          {/* Info bar */}
          <div style={{ marginTop: 36, background: `rgba(11,36,71,0.05)`, border: `1px dashed ${C.gold}`, borderRadius: 12, padding: "16px 22px", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: C.gold, display: "flex", flex: "none" }}><Info size={20} aria-hidden="true" /></span>
            <p style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.75 }}>
              Seluruh dokumen yang tersedia di halaman ini merupakan dokumen resmi yang telah disahkan oleh pejabat berwenang. Untuk permintaan dokumen lain atau versi cetak, silakan menghubungi kantor BAPPERIDA secara langsung atau melalui formulir kontak.
            </p>
          </div>
        </div>
      </section>

      {/* ──── BERITA ──── */}
      <section id="berita" style={{ background: C.white, padding: "96px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 52, flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="gold-bar" style={{ marginBottom: 20 }} />
              <p className="eyebrow" style={{ marginBottom: 14 }}>Informasi Terkini</p>
              <h2 className="section-title">Berita &amp; Kegiatan</h2>
              {fetchError && <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#dc2626", fontSize: 13, marginTop: 10 }}><AlertCircle size={14} aria-hidden="true" /> {fetchError}</div>}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn-gold" onClick={() => { setBeritaPage(1); setShowAllBeritaModal(true); }}>Lihat Semua Berita <ArrowRight size={14} /></button>
            </div>
          </div>

          {/* Unified Magazine Grid Layout */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", 
            gridAutoRows: "minmax(120px, auto)",
            gap: 32, 
            marginBottom: 60 
          }}>
            {beritaList.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "56px 20px", background: "white", borderRadius: 16, border: "1px dashed #ddd" }}>
                <div style={{ color: "#cbd5e1", marginBottom: 14 }}><Newspaper size={40} aria-hidden="true" /></div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.navy, marginBottom: 6 }}>Belum ada berita</div>
                <div style={{ fontSize: 14, color: C.textLight }}>Berita dan kegiatan terbaru akan tampil di sini setelah ditambahkan dari panel admin.</div>
              </div>
            ) : beritaList.slice(0, 6).map((item, idx) => {
              // Priority: col_span/row_span from DB, fallback to legacy layout_size, fallback to default
              let col = item.col_span || 1;
              let row = item.row_span || 1;
              
              if (!item.col_span && item.layout_size) {
                if (item.layout_size === 'large') { col = 2; row = 2; }
                else if (item.layout_size === 'wide') { col = 2; row = 1; }
                else if (item.layout_size === 'tall') { col = 1; row = 2; }
              } else if (!item.col_span && idx === 0) {
                col = 2; row = 2; // Default for first item
              }

              const gridStyle = isMobile ? {} : {
                gridColumn: `span ${col}`,
                gridRow: `span ${row}`,
              };

              return (
                <div key={item.id} 
                  onClick={() => setSelectedBerita(item)} 
                  className="magazine-item"
                  style={{ 
                    ...gridStyle,
                    position: "relative",
                    cursor: "pointer", 
                    display: "flex", 
                    flexDirection: "column",
                    transition: "all 0.3s ease",
                    padding: 0,
                    background: "white",
                    borderRadius: 16,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.05)",
                    overflow: "hidden",
                    zIndex: 1
                  }}
                >

                  <div style={{ 
                    height: row === 1 ? 180 : 380, 
                    position: "relative", 
                    overflow: "hidden",
                    flexShrink: 0,
                  }}>
                    <div className="berita-thumb-zoom" style={{ position: "absolute", inset: 0 }}>
                      {item.gambar_url ? (
                        <FadeInImage src={getDriveThumb(item.gambar_url, ukuranThumb(col, row))} alt={item.judul} style={{ width: "100%", height: "100%" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${C.navy} 0%, #1e40af 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: "rgba(255,255,255,.85)", display: "flex" }}>
                          <Newspaper size={row === 1 ? 34 : 50} aria-hidden="true" />
                        </span>
                        </div>
                      )}
                    </div>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }} />
                    <span style={{ position: "absolute", top: 12, left: 12, background: C.gold, color: "white", fontSize: 9, fontWeight: 800, padding: "4px 12px", borderRadius: 4, letterSpacing: "0.05em" }}>{item.kategori.toUpperCase()}</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "20px 24px" }}>
                    <div style={{ color: C.textLight, fontSize: 11, marginBottom: 8, fontWeight: 500 }}>{tgl(item.tanggal)}</div>
                    <h3 style={{ 
                      fontSize: col === 1 ? 15 : 22, 
                      fontWeight: 800, 
                      color: C.navy, 
                      marginBottom: 10, 
                      lineHeight: 1.3,
                      display: "-webkit-box",
                      WebkitLineClamp: row === 1 ? 2 : 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>{item.judul}</h3>
                    
                    {(col > 1 || row > 1) && (
                      <p style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.6, marginBottom: 12, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{item.konten}</p>
                    )}
                    <div className="read-more-link" style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, color: C.gold, fontSize: 12, fontWeight: 700 }}>
                      Selengkapnya <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {beritaList.length > 6 && (
            <div style={{ textAlign: "center" }}>
              <button 
                onClick={() => { setBeritaPage(1); setShowAllBeritaModal(true); }} 
                className="btn-gold" 
                style={{ 
                  background: "transparent", 
                  border: `2px solid ${C.gold}`, 
                  color: C.gold, 
                  padding: "12px 32px",
                  fontSize: 14,
                  fontWeight: 700
                }}
              >
                Lihat Berita Lainnya <ArrowRight size={16} style={{ marginLeft: 8 }} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ──── INOVASI DAERAH ──── */}
      <section id="inovasi" style={{ background: C.offWhite, padding: "96px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 56, flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="gold-bar" style={{ marginBottom: 20 }} />
              <p className="eyebrow" style={{ marginBottom: 14 }}>Klinik Inovasi BAPPERIDA Kabupaten Sumba Barat</p>
              <h2 className="section-title" style={{ maxWidth: 520 }}>Galeri Inovasi Daerah</h2>
            </div>
            <button className="btn-gold" onClick={() => setShowModal('inovasi-submit')} style={{ background: C.gold, color: C.navyDark }}>
              + Kirim Inovasi (Portal OPD)
            </button>
          </div>

          {inovasiList.filter(inv => inv.status_approval === 'Approved').length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textLight, background: "white", borderRadius: 16 }}>
              Belum ada inovasi yang di-approve. Jadilah yang pertama!
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
              {inovasiList.filter(inv => inv.status_approval === 'Approved').map(inv => (
                <PublicInovasiCard key={inv.id} inv={inv} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ──── KONTAK ──── */}
      <section id="kontak" style={{ background: `linear-gradient(145deg, ${C.navyDark} 0%, ${C.navyLight} 100%)`, padding: "96px 28px", color: "white" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div className="kontak-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
            {/* Info */}
            <div>
              <div className="gold-bar" style={{ marginBottom: 20 }} />
              <p className="eyebrow" style={{ marginBottom: 14 }}>Hubungi Kami</p>
              <h2 className="display" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, color: "white", lineHeight: 1.18, marginBottom: 22 }}>Kami Siap<br />Melayani Anda</h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.9, marginBottom: 44 }}>
                Jangan ragu untuk menghubungi kami mengenai informasi perencanaan pembangunan, program kegiatan, kerjasama riset, atau inovasi daerah Kabupaten Sumba Barat.
              </p>

              {/* Jam Layanan */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 32 }}>
                <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Jam Layanan</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 2 }}>
                  Senin – Kamis: 07.30 – 16.00 WITA<br />
                  Jumat: 07.30 – 11.30 WITA<br />
                  Sabtu & Minggu: Tutup
                </div>
              </div>

              {[
                { Icon: MapPin, label: "Alamat Kantor", val: "Jl. Weekarou, Waikabubak, Sumba Barat, NTT 87284" },
                { Icon: Phone, label: "Telepon", val: "(0387) 21050" },
                { Icon: Mail, label: "Email Resmi", val: "bapperida@sumbabarat.go.id" },
              ].map(({ Icon, label, val }) => (
                <div key={label} style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 28 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.1)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={15} color={C.gold} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, letterSpacing: "0.05em", marginBottom: 5 }}>{label}</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, whiteSpace: "pre-line" }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "48px 44px" }}>
              <h3 className="display" style={{ fontSize: 26, fontWeight: 600, marginBottom: 8, color: "white" }}>Kirim Pesan</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 36 }}>Kami akan merespons dalam 1–2 hari kerja</p>

              <form onSubmit={handleKontakSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="form-group-dark">
                    <label style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8, fontWeight: 500 }}>Nama Lengkap *</label>
                    <input name="nama" type="text" placeholder="Nama lengkap" required style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 16px", color: "white" }} />
                  </div>
                  <div className="form-group-dark">
                    <label style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8, fontWeight: 500 }}>Email *</label>
                    <input name="email" type="email" placeholder="email@contoh.com" required style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 16px", color: "white" }} />
                  </div>
                </div>
                <div className="form-group-dark">
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8, fontWeight: 500 }}>Instansi / Organisasi</label>
                  <input name="instansi" type="text" placeholder="Nama instansi (opsional)" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 16px", color: "white" }} />
                </div>
                <div className="form-group-dark">
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8, fontWeight: 500 }}>Perihal</label>
                  <input name="perihal" type="text" placeholder="Topik atau perihal pesan" required style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 16px", color: "white" }} />
                </div>
                <div className="form-group-dark">
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8, fontWeight: 500 }}>Pesan *</label>
                  <textarea name="pesan" rows={4} placeholder="Tuliskan pesan atau pertanyaan Anda..." required style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 16px", color: "white", resize: "none" }} />
                </div>
                <button type="submit" className="btn-gold" style={{ width: "100%", justifyContent: "center", padding: "16px", marginTop: 10, fontSize: 14, fontWeight: 700 }}>
                  Kirim Pesan <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer style={{ background: "#040E1C", borderTop: `1px solid rgba(201,162,39,0.18)`, padding: "56px 28px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
            {/* Brand col */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <img src={LOGO_URL} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  <div style={{ display: "none", width: "100%", height: "100%", borderRadius: "50%", background: C.gold, alignItems: "center", justifyContent: "center" }}>
                    <span className="display" style={{ fontWeight: 700, fontSize: 18, color: C.navyDark }}>B</span>
                  </div>
                </div>
                <div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>BAPPERIDA</div>
                  <div style={{ color: C.gold, fontSize: 11 }}>Kabupaten Sumba Barat</div>
                </div>
              </div>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.38)", lineHeight: 1.9, maxWidth: 290 }}>
                Badan Perencanaan Pembangunan Riset dan Inovasi Daerah Kabupaten Sumba Barat, Nusa Tenggara Timur, Indonesia.
              </p>
              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                {["FB", "IG", "YT", "TW"].map(s => (
                  <div key={s} style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", transition: "background 0.2s, color 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,162,39,0.15)"; e.currentTarget.style.color = C.gold; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
                  >{s}</div>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {[
              { title: "Navigasi", items: ["Beranda", "Profil", "Visi & Misi", "Struktur Organisasi", "Program"] },
              { title: "Layanan", items: ["Musrenbang Online", "Data Pembangunan", "RPJMD & RKPD", "Inovasi Daerah", "Pengumuman"] },
              { title: "Regulasi", items: ["Perda Daerah", "Perbup", "RPJPD", "RPJMD", "RKPD Tahunan"] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ color: C.gold, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 18 }}>{col.title}</div>
                {col.items.map(item => (
                  <div key={item} style={{ fontSize: 13.5, color: "rgba(255,255,255,0.38)", marginBottom: 12, cursor: "pointer", transition: "color 0.2s" }}
                    onMouseEnter={e => e.target.style.color = "rgba(255,255,255,0.8)"}
                    onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.38)"}
                  >{item}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.25)" }}>© 2026 BAPPERIDA Kabupaten Sumba Barat. Seluruh hak dilindungi.</p>
            <div style={{ display: "flex", gap: 24 }}>
              {["Kebijakan Privasi", "Syarat Penggunaan", "Aksesibilitas"].map(t => (
                <span key={t} style={{ fontSize: 12.5, color: "rgba(255,255,255,0.25)", cursor: "pointer" }}
                  onMouseEnter={e => e.target.style.color = "rgba(255,255,255,0.55)"}
                  onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.25)"}
                >{t}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ──── DOKUMEN PREVIEW MODAL ──── */}
      {previewDokumen && (
        <div className="modal-overlay" onClick={() => setPreviewDokumen(null)}>
          <div className="modal-content" style={{ maxWidth: 1000, height: "90vh", padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: "16px 24px" }}>
              <div>
                <h3 className="display" style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>{previewDokumen.judul}</h3>
                <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>{previewDokumen.kategori} &bull; {previewDokumen.ukuran || "Ukuran tidak diketahui"}</div>
              </div>
              <button onClick={() => setPreviewDokumen(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLight }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, background: "#f1f5f9", position: "relative" }}>
              {previewDokumen.url ? (
                isMobile ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: C.textLight, padding: 40, textAlign: "center" }}>
                    <div style={{ color: C.textLight, marginBottom: 16 }}><Smartphone size={46} aria-hidden="true" /></div>
                    <div style={{ fontSize: 16, color: C.navy, fontWeight: 600, marginBottom: 8 }}>Pratinjau Tidak Didukung</div>
                    <div style={{ marginBottom: 20 }}>Pratinjau dokumen PDF langsung tidak selalu didukung di browser mobile. Silakan buka dokumen di tab baru.</div>
                    <button onClick={() => window.open(previewDokumen.url, '_blank')} className="btn-gold" style={{ padding: "10px 20px" }}>
                      Buka Dokumen
                    </button>
                  </div>
                ) : (
                  <iframe
                    src={previewDokumen.url.replace(/\/(edit|view)(\?[^/]*)?$/, '/preview$2')}
                    width="100%"
                    height="100%"
                    style={{ border: "none", position: "absolute", inset: 0 }}
                    title="PDF Preview"
                  />
                )
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: C.textLight, padding: 40, textAlign: "center" }}>
                  <div style={{ color: C.textLight, marginBottom: 16 }}><AlertCircle size={46} aria-hidden="true" /></div>
                  <div style={{ fontSize: 16, color: C.navy, fontWeight: 600, marginBottom: 8 }}>Tautan Dokumen Tidak Tersedia</div>
                  <div>Dokumen ini belum memiliki tautan file untuk dipratinjau.</div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ background: C.white, padding: "16px 24px" }}>
              <button onClick={() => window.open(previewDokumen.url, '_blank')} className="btn-ghost" style={{ borderColor: C.navy, color: C.navy, padding: "8px 16px", fontSize: 13 }}>
                Buka di Tab Baru
              </button>
              <button onClick={() => setPreviewDokumen(null)} className="btn-gold" style={{ padding: "8px 16px", fontSize: 13 }}>Tutup Preview</button>
            </div>
          </div>
        </div>
      )}

      {/* ──── DAFTAR SEMUA BERITA MODAL ──── */}
      {showAllBeritaModal && (
        <div className="modal-overlay" onClick={() => setShowAllBeritaModal(false)}>
          <div className="modal-content" style={{ maxWidth: 800, height: "85vh", display: "flex", flexDirection: "column", padding: 0 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: "20px 24px" }}>
              <h3 className="display" style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>Semua Berita & Kegiatan</h3>
              <button onClick={() => setShowAllBeritaModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLight }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: 24, background: "#f8fafc" }}>
              {(() => {
                const pageSize = 8;
                const totalPages = Math.max(1, Math.ceil(beritaList.length / pageSize));
                const curPage = Math.min(beritaPage, totalPages);
                const items = beritaList.slice((curPage - 1) * pageSize, curPage * pageSize);
                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                      {items.map(item => (
                        <div key={item.id} onClick={() => { setShowAllBeritaModal(false); setSelectedBerita(item); }} className="card" style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 60, height: 60, borderRadius: 10, background: `${C.navy}14`, display: "flex", alignItems: "center", justifyContent: "center", color: C.navy, flexShrink: 0, overflow: "hidden" }}>
                            {item.gambar_url ? (
                              <FadeInImage src={getDriveThumb(item.gambar_url, 200)} alt={item.judul} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <Newspaper size={26} aria-hidden="true" />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ background: `${C.navy}14`, color: C.navy, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{item.kategori}</span>
                              <span style={{ color: C.textLight, fontSize: 12 }}>{tgl(item.tanggal)}</span>
                              {item.is_featured && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: C.gold, fontSize: 11, fontWeight: 700 }}><Star size={12} aria-hidden="true" /> Unggulan</span>}
                            </div>
                            <h4 style={{ fontSize: 15, fontWeight: 600, color: C.navy, lineHeight: 1.4 }}>{item.judul}</h4>
                          </div>
                          <ArrowRight size={18} color={C.textLight} style={{ flexShrink: 0 }} />
                        </div>
                      ))}
                    </div>
                    <PaginationControls page={curPage} totalPages={totalPages} onChange={setBeritaPage} />
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ──── BERITA DETAIL MODAL ──── */}
      {selectedBerita && (
        <div className="modal-overlay" onClick={() => setSelectedBerita(null)}>
          <div className="modal-content" style={{ maxWidth: 800, padding: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ height: 300, background: `linear-gradient(135deg, ${C.navy}, #1A527A)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
              {selectedBerita.gambar_url ? (
                <FadeInImage src={getDriveThumb(selectedBerita.gambar_url, 1600)} alt={selectedBerita.judul} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
              ) : (
                <span style={{ color: "rgba(255,255,255,.75)", display: "flex" }}><Newspaper size={110} aria-hidden="true" /></span>
              )}
              <button onClick={() => setSelectedBerita(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(0,0,0,0.4)", border: "none", color: "white", padding: 8, borderRadius: "50%", cursor: "pointer", backdropFilter: "blur(4px)" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "40px 50px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 20 }}>
                <span style={{ background: `${C.navy}12`, color: C.navy, fontSize: 12, fontWeight: 700, padding: "5px 15px", borderRadius: 20, textTransform: "uppercase" }}>{selectedBerita.kategori}</span>
                <span style={{ color: C.textLight, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><Calendar size={14} /> {tgl(selectedBerita.tanggal)}</span>
              </div>
              <h2 className="display" style={{ fontSize: 32, fontWeight: 700, color: C.navy, marginBottom: 24, lineHeight: 1.3 }}>{selectedBerita.judul}</h2>
              <div style={{ fontSize: 16, color: C.textMid, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
                {selectedBerita.konten || "Tidak ada detail konten untuk berita ini."}
                <br /><br />
                Sumba Barat, {selectedBerita.tanggal} — BAPPERIDA Kabupaten Sumba Barat terus berkomitmen untuk memberikan informasi yang transparan and akuntabel kepada masyarakat terkait perkembangan pembangunan and inovasi daerah.
              </div>
            </div>
            <div className="modal-footer" style={{ background: C.offWhite }}>
              <button onClick={() => setSelectedBerita(null)} className="btn-gold">Tutup Detail</button>
            </div>
          </div>
        </div>
      )}

      {/* ──── MODAL: INOVASI SUBMIT (OPD) ──── */}
      {showModal === 'inovasi-submit' && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 className="display" style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>Klinik Inovasi BAPPERIDA Sumba Barat (Portal OPD)</h3>
              <button onClick={() => setShowModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLight }}><X size={20} /></button>
            </div>
            <form id="inovasi-form" onSubmit={(e) => {
              e.preventDefault();
              // Set status kirim di sini, bukan di onClick tombol. Kalau ada 10
              // field wajib yang belum terisi, browser memblokir submit dan
              // onSubmit tidak pernah dipanggil — kalau status sudah diubah dari
              // onClick, tombolnya jadi nonaktif permanen dan pendingin.
              setIsSaving(true);
              const fd = new FormData(e.target);
              const data = Object.fromEntries(fd.entries());
              data.skor_iga = parseInt(data.skor_iga || 0);
              
              // Handle multiple documents from JSON string
              try {
                data.dokumen_dukung = JSON.parse(data.dokumen_dukung || "[]");
              } catch (e) {
                data.dokumen_dukung = [];
              }
              
              // Skor IGA dihitung ulang di server; nilai yang dikirim OPD hanya
              // dipakai sebagai pratinjau di form dan tidak pernah dipercaya.
              delete data.skor_iga;
              delete data.kategori_skor;
              delete data.status_approval;

              kirimInovasi(data)
                .then(() => {
                  setShowModal(null);
                  showNotification("Inovasi terkirim dan menunggu review admin.");
                })
                .catch((err) => {
                  showNotification(err.message || "Gagal mengirim inovasi.", "error");
                })
                .finally(() => setIsSaving(false));
}} onChange={() => perbaruiEstimasiIga()}>

              <div className="modal-body">
                <div style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}44`, padding: 15, borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>Estimasi Skor Inovasi: <span id="iga-score-display" style={{ fontSize: 18 }}>0</span>/100 (<span id="iga-cat-display">Kurang Inovatif</span>)</div>
                  <input type="hidden" id="iga-score-input" name="skor_iga" value="0" />
                  <input type="hidden" id="iga-cat-input" name="kategori_skor" value="Kurang Inovatif" />
                </div>
                
                <div className="form-group form-dua">
                  <div>
                    <label className="form-label">Nama Instansi / OPD</label>
                    <input name="opd_nama" className="form-input" placeholder="Contoh: Dinas Kesehatan" required />
                  </div>
                  <div>
                    <label className="form-label">Nama Inovator / Tim</label>
                    <input name="nama_inovator" className="form-input" placeholder="Nama lengkap atau tim..." required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Judul Inovasi</label>
                  <input name="judul_inovasi" className="form-input" required />
                </div>

                <div className="form-group form-dua">
                  <div>
                    <label className="form-label">Urusan Inovasi</label>
                    <select name="jenis_inovasi" className="form-input" required>
                      <option value="">--Pilih Urusan Inovasi--</option>
                      <option>Pelayanan Publik</option>
                      <option>Tata Kelola Pemerintahan</option>
                      <option>Bentuk Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Tahapan Inovasi</label>
                    <select name="tahapan_inovasi" className="form-input" required>
                      <option value="">--Pilih Tahapan Inovasi--</option>
                      <option value="Inisiatif">Inisiatif (+5 Poin)</option>
                      <option value="Uji Coba">Uji Coba (+10 Poin)</option>
                      <option value="Penerapan">Penerapan (+20 Point)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group form-dua">
                  <div>
                    <label className="form-label">Regulasi / Dasar Hukum Inovasi</label>
                    <select name="regulasi_inovasi" className="form-input" required>
                      <option value="">--Pilih Regulasi Inovasi--</option>
                      <option value="Perbup">Peraturan Daerah / Perbup (+15 Poin)</option>
                      <option value="SK Kepala OPD">SK Kepala OPD (+10 Poin)</option>
                      <option value="SOP">SOP Pelaksanaan (+5 Poin)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Ketersediaan Anggaran Pendukung</label>
                    <select name="anggaran_inovasi" className="form-input" required>
                      <option value="">--Pilih Ketersediaan Anggaran Pendukung--</option>
                      <option value="Ada">Ada Anggaran Khusus (DPA-OPD) (+15 Poin)</option>
                      <option value="Tidak Ada">Tidak Ada Anggaran khusus (+0 Poin)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group form-dua">
                  <div>
                    <label className="form-label">Tanggal Uji Coba</label>
                    <input name="waktu_uji_coba" type="date" className="form-input" required />
                  </div>
                  <div>
                    <label className="form-label">Tanggal Penerapan / Implementasi</label>
                    <input name="waktu_penerapan" type="date" className="form-input" required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Rancang Bangun & Pokok Perubahan (+20 Poin jika &gt;=300 kata)</label>
                  <textarea name="rancang_bangun" className="form-input" style={{ minHeight: 120 }} placeholder="Jelaskan latar belakang, penjaringan ide, pemilihan ide, manfaat, dan dampak inovasi..." required />
                </div>

                <div className="form-group">
                  <label className="form-label">Link Video YouTube Inovasi (+10 Poin)</label>
                  <input name="link_video" type="url" className="form-input" placeholder="https://youtube.com/..." />
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Dokumen Pendukung (SK/SOP/dll) (+20 Poin)</label>
                  <MultiFileUploadField name="dokumen_dukung" label="Klik untuk Upload Dokumen PDF / Gambar" onUbah={() => perbaruiEstimasiIga()} />
                </div>

              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-gold" disabled={isSaving}>
                  {isSaving ? "Sedang Mengirim..." : "Kirim Inovasi ke BAPPERIDA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}

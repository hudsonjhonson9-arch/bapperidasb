import { useState, useEffect, useRef } from "react";
const LOGO_URL = "/logo.png"; 

import {
  MapPin, Phone, Mail, ChevronDown, Menu, X,
  ArrowRight, Users, User, Calendar, FileText, Download, Eye, Search,
  Target, Lightbulb, BarChart2, BookOpen, Globe, Shield, Maximize2
} from "lucide-react";

const NAV = [
  { id: "beranda", label: "Beranda" },
  { id: "profil", label: "Profil" },
  { id: "visi-misi", label: "Visi & Misi" },
  { id: "struktur", label: "Struktur" },
  { id: "program", label: "Program" },
  { id: "dokumen", label: "Dokumen" },
  { id: "berita", label: "Berita" },
  { id: "kontak", label: "Kontak" },
];

const DOKUMEN = [
  {
    kategori: "Perencanaan Jangka Panjang",
    warna: "#0B2447",
    items: [
      { judul: "RPJPD Kabupaten Sumba Barat 2025–2045", tipe: "PDF", ukuran: "4.2 MB", tanggal: "15 Jan 2025", icon: "📘" },
      { judul: "Naskah Akademik RPJPD 2025–2045", tipe: "PDF", ukuran: "2.8 MB", tanggal: "10 Jan 2025", icon: "📄" },
    ]
  },
  {
    kategori: "Perencanaan Jangka Menengah",
    warna: "#1a6b45",
    items: [
      { judul: "RPJMD Kabupaten Sumba Barat 2021–2026", tipe: "PDF", ukuran: "8.7 MB", tanggal: "20 Mar 2021", icon: "📗" },
      { judul: "Perubahan RPJMD 2021–2026 (Revisi)", tipe: "PDF", ukuran: "5.1 MB", tanggal: "12 Jun 2023", icon: "📄" },
      { judul: "Renstra BAPPERIDA 2021–2026", tipe: "PDF", ukuran: "3.4 MB", tanggal: "5 Apr 2021", icon: "📄" },
    ]
  },
  {
    kategori: "Perencanaan Tahunan (RKPD)",
    warna: "#7c3aed",
    items: [
      { judul: "RKPD Kabupaten Sumba Barat Tahun 2026", tipe: "PDF", ukuran: "6.3 MB", tanggal: "30 Apr 2025", icon: "📙" },
      { judul: "RKPD Kabupaten Sumba Barat Tahun 2025", tipe: "PDF", ukuran: "5.9 MB", tanggal: "28 Apr 2024", icon: "📄" },
      { judul: "RKPD Kabupaten Sumba Barat Tahun 2024", tipe: "PDF", ukuran: "5.4 MB", tanggal: "2 Mei 2023", icon: "📄" },
    ]
  },
  {
    kategori: "Evaluasi & Pelaporan",
    warna: "#b45309",
    items: [
      { judul: "Laporan Kinerja (LKjIP) BAPPERIDA 2025", tipe: "PDF", ukuran: "3.1 MB", tanggal: "31 Mar 2026", icon: "📊" },
      { judul: "Laporan Evaluasi RKPD Triwulan IV 2025", tipe: "PDF", ukuran: "2.6 MB", tanggal: "15 Jan 2026", icon: "📄" },
      { judul: "Laporan Evaluasi RPJMD 2021–2026 Akhir", tipe: "PDF", ukuran: "4.8 MB", tanggal: "20 Feb 2026", icon: "📄" },
    ]
  },
  {
    kategori: "Riset & Inovasi",
    warna: "#0369A1",
    items: [
      { judul: "Kajian Potensi Pertanian GIS Sumba Barat 2025", tipe: "PDF", ukuran: "7.2 MB", tanggal: "8 Apr 2026", icon: "🔬" },
      { judul: "Profil Inovasi Daerah Kabupaten Sumba Barat 2025", tipe: "PDF", ukuran: "2.9 MB", tanggal: "22 Des 2025", icon: "💡" },
    ]
  },
  {
    kategori: "Regulasi & Kebijakan",
    warna: "#6B21A8",
    items: [
      { judul: "Perda No. 2/2024 tentang RPJPD 2025–2045", tipe: "PDF", ukuran: "1.8 MB", tanggal: "14 Feb 2024", icon: "⚖️" },
      { judul: "Perbup tentang Kedudukan & Tupoksi BAPPERIDA", tipe: "PDF", ukuran: "1.2 MB", tanggal: "5 Mei 2022", icon: "📜" },
    ]
  },
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
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12 }}>
          ⚠️
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

const ImageUploadField = ({ name, defaultValue, label, required }) => {
  const [url, setUrl] = useState(defaultValue || '');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setUrl(defaultValue || '');
  }, [defaultValue]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file terlalu besar! Maksimal 5MB.');
      return;
    }

    setUploading(true);
    
    // Jika file adalah gambar, lakukan kompresi
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize jika terlalu besar (maks 1200px)
          const MAX_WIDTH = 1200;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Kompresi kualitas ke 0.7
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setUrl(compressedBase64);
          setUploading(false);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      // Jika bukan gambar (dokumen), baca langsung
      const reader = new FileReader();
      reader.onloadend = () => {
        setUrl(reader.result);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {url ? (
          <img src={url} alt="Preview" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, background: '#eee', flexShrink: 0, border: '1px solid #ddd' }} />
        ) : (
          <div style={{ width: 80, height: 60, borderRadius: 4, background: '#f5f5f5', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#aaa', flexShrink: 0 }}>No Image</div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="hidden" name={name} value={url} />
          {required && !url && <input type="hidden" name={`${name}_required`} required />}
          <input 
            type="file" 
            accept={name === 'url' ? ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" : "image/*"}
            onChange={handleFileChange} 
            className="form-input" 
            disabled={uploading}
            style={{ padding: '6px 12px', background: '#fff', cursor: 'pointer' }}
          />
          {uploading ? (
             <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>⏳ Memproses file...</span>
          ) : (
             <span style={{ fontSize: 11, color: '#666' }}>File akan disimpan langsung ke database (Base64). Maks 5MB.</span>
          )}
        </div>
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

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const longPressTimer = useRef(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [dokSearch, setDokSearch] = useState("");
  const [dokFilter, setDokFilter] = useState("Semua");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Security & Session
  const APP_SECRET = "BAPPERIDA_SECURE_TOKEN_2026";
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("bapperida_admin_session") === APP_SECRET);
  const [showLogin, setShowLogin] = useState(false);

  // Database States
  const [beritaList, setBeritaList] = useState([]);
  const [dokumenList, setDokumenList] = useState([]);
  const [programList, setProgramList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // CMS States
  const [showModal, setShowModal] = useState(null); // 'berita' | 'dokumen' | 'layout'
  const [editItem, setEditItem] = useState(null);

  const [isLayoutMode, setIsLayoutMode] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [showOrgZoom, setShowOrgZoom] = useState(false);
  const [selectedBerita, setSelectedBerita] = useState(null);
  const [previewDokumen, setPreviewDokumen] = useState(null);
  const [showAllBeritaModal, setShowAllBeritaModal] = useState(false);
  const [strukturImg, setStrukturImg] = useState(localStorage.getItem("bapperida_struktur_img") || "/struktur.png");

  // Slider State
  const [sliderList, setSliderList] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

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

  // API Config
  const API_BASE = "https://mindcloud.my.id/webhook";
  const api = {
    berita: {
      list: `${API_BASE}/bapperida-berita-list`,
      add: `${API_BASE}/bapperida-berita-add`,
      edit: `${API_BASE}/bapperida-berita-edit`,
      del: `${API_BASE}/bapperida-berita-delete`,
    },
    dokumen: {
      list: `${API_BASE}/bapperida-dokumen-list`,
      add: `${API_BASE}/bapperida-dokumen-add`,
      edit: `${API_BASE}/bapperida-dokumen-edit`,
      del: `${API_BASE}/bapperida-dokumen-delete`,
    },
    slider: {
      list: `${API_BASE}/bapperida-slider-list`,
      add: `${API_BASE}/bapperida-slider-add`,
      edit: `${API_BASE}/bapperida-slider-edit`,
      del: `${API_BASE}/bapperida-slider-delete`,
    },
    program: {
      list: `${API_BASE}/bapperida-program-list`,
      add: `${API_BASE}/bapperida-program-add`,
      edit: `${API_BASE}/bapperida-program-edit`,
      del: `${API_BASE}/bapperida-program-delete`,
    },
    kontak: {
      submit: `${API_BASE}/bapperida-kontak-submit`
    }
  };

  const authFetch = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        "X-App-Token": APP_SECRET
      }
    });
  };

  const fetchData = async () => {
    setLoading(true);
    const errors = [];

    const fetchSafe = async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    };

    const getList = (res) => {
      if (Array.isArray(res)) {
        // Handle n8n allIncomingItems format: [{json: {...}}, ...]
        if (res.length > 0 && res[0] !== null && typeof res[0] === 'object' && 'json' in res[0]) {
          return res.map(item => item.json);
        }
        return res;
      }
      if (res && res.data && Array.isArray(res.data)) return res.data;
      if (res && res.json && Array.isArray(res.json)) return res.json;
      return [];
    };

    // Optimalisasi: Tarik semua data secara PARALEL agar loading 4x lebih cepat
    const results = await Promise.allSettled([
      fetchSafe(api.berita.list),
      fetchSafe(api.dokumen.list),
      fetchSafe(api.slider.list),
      fetchSafe(api.program.list)
    ]);

    // Berita
    if (results[0].status === 'fulfilled') {
      setBeritaList(getList(results[0].value).sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0)));
    } else {
      console.error("Berita fail:", results[0].reason);
      errors.push(`Berita (${results[0].reason.message})`);
    }

    // Dokumen
    if (results[1].status === 'fulfilled') {
      setDokumenList(getList(results[1].value));
    } else {
      console.error("Dokumen fail:", results[1].reason);
      errors.push(`Dokumen (${results[1].reason.message})`);
    }

    // Slider
    if (results[2].status === 'fulfilled') {
      setSliderList(getList(results[2].value));
    } else {
      console.error("Slider fail:", results[2].reason);
      errors.push(`Slider (${results[2].reason.message})`);
    }

    // Program
    if (results[3].status === 'fulfilled') {
      setProgramList(getList(results[3].value).sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0)));
    } else {
      console.error("Program fail:", results[3].reason);
      errors.push(`Program (${results[3].reason.message})`);
    }

    // Hanya set error jika ada yang gagal; hanya reset jika semua sukses
    if (errors.length > 0) {
      setFetchError(`Gagal memuat: ${errors.join(", ")}. Cek CORS & koneksi n8n.`);
    } else {
      setFetchError(null);
    }

    setLoading(false);
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

  const handleLogin = (e) => {
    e.preventDefault();
    const pin = e.target.pin.value;
    if (pin === "2026") { // PIN sederhana untuk demo, bisa diganti
      localStorage.setItem("bapperida_admin_session", APP_SECRET);
      setIsAdmin(true);
      setShowLogin(false);
    } else {
      alert("PIN Salah!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bapperida_admin_session");
    setIsAdmin(false);
    window.location.reload();
  };

  const handleMoveBerita = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const newList = [...beritaList];
    const [movedItem] = newList.splice(fromIdx, 1);
    newList.splice(toIdx, 0, movedItem);
    setBeritaList(newList);
    // Auto-save order if it was a drag or move
    if (isAdmin) saveBeritaOrder(newList);
  };


  const saveBeritaOrder = async (list) => {
    setIsSavingLayout(true);
    try {
      const updates = list.map((item, idx) => {
        const isFeatured = idx === 0; 
        return authFetch(api.berita.edit, {
          method: "POST",
          body: JSON.stringify({ 
            ...item, 
            priority: idx, 
            is_featured: isFeatured,
            col_span: item.col_span || 1,
            row_span: item.row_span || 1
          })
        });
      });
      await Promise.all(updates);
      console.log("Order and Layout saved");
    } catch (e) {
      console.error("Failed to save order", e);
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handlePinBerita = (item) => {
    const fromIdx = beritaList.findIndex(b => b.id === item.id);
    if (fromIdx === -1) return;
    const newList = [...beritaList];
    const [movedItem] = newList.splice(fromIdx, 1);
    newList.unshift(movedItem);
    setBeritaList(newList);
    if (isAdmin) saveBeritaOrder(newList);
  };

  const handleSave = async (type, data) => {
    const endpoint = data.id ? api[type].edit : api[type].add;
    try {
      await authFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(data)
      });
      setShowModal(null);
      setEditItem(null);
      fetchData();
    } catch (e) { 
      console.error("Save error:", e);
      alert("Gagal menyimpan data: " + e.message + "\n\nPastikan n8n sudah aktif dan workflow sudah di-import ulang."); 
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm("Hapus data ini?")) return;
    try {
      await authFetch(api[type].del, {
        method: "POST",
        body: JSON.stringify({ id })
      });
      fetchData();
    } catch (e) { alert("Gagal menghapus data"); }
  };

  const handleKontakSubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    
    try {
      btn.disabled = true;
      btn.innerHTML = 'Mengirim...';
      
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      
      const res = await fetch(api.kontak.submit, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        alert("Pesan Anda telah terkirim. Terima kasih!");
        e.target.reset();
      } else {
        throw new Error();
      }
    } catch (err) {
      alert("Gagal mengirim pesan. Silakan coba lagi nanti.");
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
    const onResize = () => setIsMobile(window.innerWidth < 1024);
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

  return (
    <>
      <style>{`
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
          max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .modal-header { padding: 24px 32px; border-bottom: 1px solid ${C.warmGray}; display: flex; align-items: center; justify-content: space-between; }
        .modal-body { padding: 32px; }
        .modal-footer { padding: 24px 32px; border-top: 1px solid ${C.warmGray}; display: flex; justify-content: flex-end; gap: 12px; }
        
        .form-group { marginBottom: 20px; }
        .form-label { display: block; font-size: 13px; font-weight: 600; color: ${C.navy}; marginBottom: 8px; }
        .form-input {
          width: 100%; background: ${C.offWhite}; border: 1.5px solid ${C.warmGray};
          border-radius: 10px; padding: 12px 16px; color: ${C.navyDark};
          font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s;
        }
        .form-input:focus { border-color: ${C.gold}; }

        .org-wrapper { width: 100%; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; padding-top: 20px; padding-bottom: 80px; display: flex; justify-content: flex-start; }
        .org-container { position: relative; width: 1200px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; padding: 0 40px; }
        .org-spine { position: absolute; top: 100px; bottom: 100px; left: 50%; width: 2.5px; background: #CBD5E1; z-index: 0; transform: translateX(-50%); }
        .org-level-2 { width: 100%; position: relative; display: flex; flex-direction: row; align-items: flex-start; justify-content: center; gap: 0; margin-bottom: 110px; }
        .org-level-3 { width: 100%; position: relative; margin-bottom: 110px; }
        .org-grid { display: grid; gap: 20px; grid-template-columns: repeat(5, 1fr); width: 1120px; margin: 0 auto; }

        .swipe-hint { display: none; }
        @media (max-width: 1024px) {
          .org-container { transform: scale(0.75); transform-origin: top left; margin-bottom: -250px; }
          .swipe-hint { display: flex; align-items: center; justify-content: center; gap: 8px; color: ${C.navy}; font-size: 13px; font-weight: 600; margin-bottom: 24px; animation: pulse 2s infinite; }
        }
        @media (max-width: 768px) {
          .org-container { transform: scale(0.6); margin-bottom: -400px; }
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
            {!isAdmin && (
              <span className="nav-item" onClick={() => setShowLogin(true)} style={{ opacity: 0.5 }}>Login</span>
            )}
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
            {!isAdmin ? (
              <div onClick={() => { setShowLogin(true); setMenuOpen(false); }}
                style={{ padding: "13px 0", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 500, cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Login Admin
              </div>
            ) : (
              <div onClick={() => { handleLogout(); setMenuOpen(false); }}
                style={{ padding: "13px 0", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Keluar Admin
              </div>
            )}
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
              <FadeInImage src={slide.gambar_url} alt={slide.judul} style={{ width: "100%", height: "100%" }} />
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

        {/* Admin Slider Control */}
        {isAdmin && (
          <div style={{ position: "absolute", top: 100, right: 30, zIndex: 10 }}>
            <button className="btn-gold" onClick={() => setShowModal('slider-list')} style={{ padding: "8px 16px", fontSize: 13 }}>⚙️ Kelola Slider Hero</button>
          </div>
        )}

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

      {/* ──── STRUKTUR ORGANISASI ──── */}
      <section id="struktur" style={{ background: C.white, padding: "96px 28px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div className="gold-bar" style={{ margin: "0 auto 20px" }} />
            <p className="eyebrow" style={{ marginBottom: 14 }}>Organisasi</p>
            <h2 className="section-title">Struktur Organisasi BAPPERIDA<br />Kabupaten Sumba Barat</h2>
            <p style={{ fontSize: 15.5, color: C.textMid, marginTop: 14, maxWidth: 600, margin: "14px auto 0" }}>Berdasarkan Peraturan Bupati Sumba Barat tentang Kedudukan, Susunan Organisasi, Tugas dan Fungsi serta Tata Kerja Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah</p>
          </div>

          <div className="org-image-container" style={{ width: "100%", padding: "40px 0", background: "white", display: "flex", justifyContent: "center" }}>
            <img 
              src="/Struktur_Organisasi_BAPPERIDA.png" 
              alt="Struktur Organisasi BAPPERIDA" 
              style={{ 
                maxWidth: "100%", 
                height: "auto", 
                borderRadius: 8,
                cursor: "zoom-in",
                transition: "transform 0.3s ease"
              }}
              onClick={() => setShowOrgZoom(true)}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.01)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            />
          </div>

          {/* Premium Zoom Modal */}
          {showOrgZoom && (
            <div 
              style={{ 
                position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", 
                background: "rgba(11, 36, 71, 0.95)", backdropFilter: "blur(10px)",
                zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "zoom-out", padding: 40, animation: "fadeIn 0.3s ease"
              }}
              onClick={() => setShowOrgZoom(false)}
            >
              <button 
                style={{ position: "absolute", top: 30, right: 30, background: "white", border: "none", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 20, fontWeight: "bold" }}
                onClick={() => setShowOrgZoom(false)}
              >
                ✕
              </button>
              <img 
                src="/Struktur_Organisasi_BAPPERIDA.png" 
                alt="Zoomed" 
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 4, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }} 
              />
            </div>
          )}
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
            {isAdmin && (
              <button className="btn-gold" onClick={() => { setEditItem(null); setShowModal('program'); }} style={{ background: C.navy, color: "white" }}>+ Tambah Program</button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 32 }}>
            {programList.map(p => (
              <div key={p.id} className="program-card" style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
                {isAdmin && (
                  <div style={{ position: "absolute", top: 15, right: 15, display: "flex", gap: 6, zIndex: 20 }}>
                    <button onClick={() => { setEditItem(p); setShowModal('program'); }} className="btn-admin-small" style={{ background: "rgba(255,255,255,0.9)", color: C.navy, border: "none", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer" }}>✎</button>
                    <button onClick={() => handleDelete('program', p.id)} className="btn-admin-small" style={{ background: "rgba(255,100,100,0.1)", color: "#ef4444", border: "none", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer" }}>✕</button>
                  </div>
                )}
                
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
                <div style={{ fontSize: 42, marginBottom: 14 }}>📅</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.navy, marginBottom: 6 }}>Belum ada program tersedia</div>
                <div style={{ fontSize: 14, color: C.textLight }}>Data sedang dimuat atau belum ditambahkan oleh admin.</div>
              </div>
            )}
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
                onChange={e => setDokSearch(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["Semua", ...[...new Set(dokumenList.map(d => d.kategori).filter(Boolean))]].map(kat => (
                  <button key={kat} className={`filter-btn ${dokFilter === kat ? "active" : ""}`} onClick={() => setDokFilter(kat)}>
                    {kat === "Semua" ? "Semua Kategori" : kat}
                  </button>
                ))}
              </div>
              {isAdmin && (
                <button className="btn-gold" onClick={() => { setEditItem(null); setShowModal('dokumen'); }} style={{ background: C.navy, color: "white", padding: "10px 20px" }}>+ Tambah Dokumen</button>
              )}
            </div>
          </div>

          {/* Dokumen Groups */}
          {(() => {
            const categories = [...new Set(dokumenList.map(d => d.kategori))];
            const displayCategories = dokFilter === "Semua" ? categories : [dokFilter];

            return displayCategories.map(cat => {
              const items = dokumenList.filter(d =>
                d.kategori === cat &&
                (dokSearch === "" || d.judul.toLowerCase().includes(dokSearch.toLowerCase()))
              );
              if (items.length === 0) return null;

              return (
                <div key={cat} style={{ marginBottom: 36 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 4, height: 22, background: C.navy, borderRadius: 3 }} />
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>{cat}</h3>
                    <span style={{ background: `${C.navy}14`, color: C.navy, fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20 }}>{items.length} dokumen</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {items.map(dok => (
                      <div key={dok.id} className="dok-card">
                        <div style={{ width: 46, height: 46, borderRadius: 10, background: `${C.navy}12`, border: `1px solid ${C.navy}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                          {dok.icon || "📄"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 600, color: C.navy, marginBottom: 5, lineHeight: 1.4 }}>{dok.judul}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textLight }}>
                              <FileText size={11} /> {dok.tipe || "PDF"}
                            </span>
                            <span style={{ fontSize: 12, color: C.textLight }}>📦 {dok.ukuran || "-"}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textLight }}>
                              <Calendar size={11} /> {dok.tanggal}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          {isAdmin ? (
                            <>
                              <button onClick={() => setPreviewDokumen(dok)} className="dok-btn" style={{ background: `${C.navy}12`, color: C.navy }}><Eye size={13} /> Lihat</button>
                              <button onClick={() => { setEditItem(dok); setShowModal('dokumen'); }} style={{ background: C.navy, color: "white" }} className="dok-btn">Edit</button>
                              <button onClick={() => handleDelete('dokumen', dok.id)} style={{ background: "#ef4444", color: "white" }} className="dok-btn">Hapus</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setPreviewDokumen(dok)} className="dok-btn" style={{ background: `${C.navy}12`, color: C.navy }}><Eye size={13} /> Lihat</button>
                              <button onClick={() => {
                                const link = document.createElement('a');
                                link.href = dok.url;
                                link.download = dok.judul;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }} className="dok-btn" style={{ background: C.navy, color: "white" }}><Download size={13} /> Unduh</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            });
          })()}

          {/* Empty state */}
          {dokumenList.filter(d =>
            (dokFilter === "Semua" || d.kategori === dokFilter) &&
            (dokSearch === "" || d.judul.toLowerCase().includes(dokSearch.toLowerCase()))
          ).length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.textLight }}>
              <div style={{ fontSize: 42, marginBottom: 14 }}>🔍</div>
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
            <span style={{ fontSize: 20 }}>ℹ️</span>
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
              {fetchError && <div style={{ color: "red", fontSize: 13, marginTop: 10 }}>⚠️ {fetchError}</div>}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              {isAdmin && (
                <button 
                  className="btn-gold" 
                  onClick={() => setIsLayoutMode(!isLayoutMode)} 
                  style={{ 
                    background: isLayoutMode ? C.gold : C.navy, 
                    color: "white", 
                    border: `1px solid ${isLayoutMode ? C.gold : C.navy}`,
                    boxShadow: isLayoutMode ? "0 0 15px rgba(201,162,39,0.4)" : "none"
                  }}
                >
                  <Menu size={16} /> {isLayoutMode ? "Simpan Layout" : "Grid Builder"}
                </button>
              )}
              <button className="btn-gold" onClick={() => setShowAllBeritaModal(true)}>Lihat Semua Berita <ArrowRight size={14} /></button>
              {isAdmin && (
                <button className="btn-gold" onClick={() => { setEditItem(null); setShowModal('berita'); }} style={{ background: C.navy, color: "white" }}>+ Tambah Berita</button>
              )}
            </div>
          </div>

          {isLayoutMode && (
            <div style={{ background: `${C.gold}10`, border: `1px dashed ${C.gold}`, borderRadius: 12, padding: "16px 24px", marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, color: C.navy, fontWeight: 600 }}>
                <span style={{ marginRight: 12 }}>🛠️ <b>Mode Grid Builder:</b></span> 
                Gunakan tombol + / - pada setiap item untuk merubah ukuran, atau seret item untuk mengatur urutan.
              </div>
              <button className="btn-gold" onClick={() => setIsLayoutMode(false)} style={{ fontSize: 12, padding: "8px 16px" }}>Selesai</button>
            </div>
          )}

          {/* Unified Magazine Grid Layout */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", 
            gridAutoRows: "minmax(120px, auto)",
            gap: isLayoutMode ? 16 : 32, 
            marginBottom: 60 
          }}>
            {beritaList.slice(0, 12).map((item, idx) => {
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
                  onClick={() => !isLayoutMode && setSelectedBerita(item)} 
                  className={`magazine-item ${isLayoutMode ? 'editing' : ''}`}
                  style={{ 
                    ...gridStyle,
                    position: "relative",
                    cursor: isLayoutMode ? "move" : "pointer", 
                    display: "flex", 
                    flexDirection: "column",
                    transition: "all 0.3s ease",
                    padding: isLayoutMode ? 12 : 0,
                    background: isLayoutMode ? "white" : "white",
                    borderRadius: isLayoutMode ? 16 : 16,
                    boxShadow: isLayoutMode ? "0 10px 30px rgba(0,0,0,0.1)" : "0 4px 20px rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.05)",
                    overflow: "hidden",
                    zIndex: isLayoutMode ? 5 : 1
                  }}
                  draggable={isAdmin}
                  onDragStart={(e) => isAdmin && e.dataTransfer.setData("index", beritaList.indexOf(item))}
                  onDragOver={(e) => isAdmin && e.preventDefault()}
                  onDrop={(e) => {
                    if (!isAdmin) return;
                    const fromIdx = parseInt(e.dataTransfer.getData("index"));
                    handleMoveBerita(fromIdx, beritaList.indexOf(item));
                  }}
                >
                  {isLayoutMode && (
                    <div style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", background: C.navy, color: "white", padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700, zIndex: 20, whiteSpace: "nowrap", boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}>
                      Size: {col} x {row}
                    </div>
                  )}

                  <div style={{ 
                    height: row === 1 ? 180 : 380, 
                    position: "relative", 
                    overflow: "hidden",
                    flexShrink: 0,
                  }}>
                    <div className="berita-thumb-zoom" style={{ position: "absolute", inset: 0 }}>
                      {item.gambar_url ? (
                        <FadeInImage src={item.gambar_url} alt={item.judul} style={{ width: "100%", height: "100%" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${C.navy} 0%, #1e40af 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: row === 1 ? 32 : 48 }}>{item.emoji || "📋"}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }} />
                    <span style={{ position: "absolute", top: 12, left: 12, background: C.gold, color: "white", fontSize: 9, fontWeight: 800, padding: "4px 12px", borderRadius: 4, letterSpacing: "0.05em" }}>{item.kategori.toUpperCase()}</span>
                    
                    {isAdmin && !isLayoutMode && (
                      <div className="admin-actions" style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 5, zIndex: 10 }}>
                        <button onClick={(e) => { e.stopPropagation(); handlePinBerita(item); }} className="btn-admin-small" style={{ background: item.is_featured ? C.gold : "rgba(255,255,255,0.9)", color: item.is_featured ? "white" : C.gold, border: "none", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>📌</button>
                        <button onClick={(e) => { e.stopPropagation(); setEditItem(item); setShowModal('berita'); }} className="btn-admin-small" style={{ background: "rgba(255,255,255,0.9)", color: C.navy, border: "none", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✎</button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "20px 24px" }}>
                    <div style={{ color: C.textLight, fontSize: 11, marginBottom: 8, fontWeight: 500 }}>{item.tanggal}</div>
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
                    
                    {isLayoutMode ? (
                      <div style={{ marginTop: 15, borderTop: "1px solid #eee", paddingTop: 15, display: "flex", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", marginBottom: 5 }}>Lebar (Cols)</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => {
                              const newList = [...beritaList];
                              const i = newList.findIndex(b => b.id === item.id);
                              newList[i] = { ...item, col_span: Math.max(1, col - 1) };
                              setBeritaList(newList);
                              saveBeritaOrder(newList);
                            }} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #ddd", background: "#f8fafc", cursor: "pointer" }}>-</button>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{col}</span>
                            <button onClick={() => {
                              const newList = [...beritaList];
                              const i = newList.findIndex(b => b.id === item.id);
                              newList[i] = { ...item, col_span: Math.min(4, col + 1) };
                              setBeritaList(newList);
                              saveBeritaOrder(newList);
                            }} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #ddd", background: "#f8fafc", cursor: "pointer" }}>+</button>
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", marginBottom: 5 }}>Tinggi (Rows)</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => {
                              const newList = [...beritaList];
                              const i = newList.findIndex(b => b.id === item.id);
                              newList[i] = { ...item, row_span: Math.max(1, row - 1) };
                              setBeritaList(newList);
                              saveBeritaOrder(newList);
                            }} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #ddd", background: "#f8fafc", cursor: "pointer" }}>-</button>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{row}</span>
                            <button onClick={() => {
                              const newList = [...beritaList];
                              const i = newList.findIndex(b => b.id === item.id);
                              newList[i] = { ...item, row_span: Math.min(3, row + 1) };
                              setBeritaList(newList);
                              saveBeritaOrder(newList);
                            }} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #ddd", background: "#f8fafc", cursor: "pointer" }}>+</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {(col > 1 || row > 1) && (
                          <p style={{ fontSize: 13.5, color: C.textMid, lineHeight: 1.6, marginBottom: 12, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{item.konten}</p>
                        )}
                        <div className="read-more-link" style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, color: C.gold, fontSize: 12, fontWeight: 700 }}>
                          Selengkapnya <ArrowRight size={14} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
      {/* ──── SLIDER MODALS ──── */}
      {showModal === 'slider-list' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal-content" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="display" style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>Kelola Slider Hero</h3>
              <button onClick={() => setShowModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLight }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-gold" onClick={() => { setEditItem(null); setShowModal('slider'); }}>+ Tambah Slider</button>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {sliderList.map(item => (
                <div key={item.id} className="card" style={{ padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
                  <img src={item.gambar_url} alt="Slider" style={{ width: 120, height: 70, objectFit: "cover", borderRadius: 8, background: "#eee" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: C.navy }}>{item.judul || "(Tanpa Judul)"}</div>
                    <div style={{ fontSize: 12, color: C.textLight }}>{item.subjudul || "(Tanpa Subjudul)"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setEditItem(item); setShowModal('slider'); }} style={{ background: C.gold, border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Edit</button>
                    <button onClick={() => handleDelete('slider', item.id)} style={{ background: "#ef4444", color: "white", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>Hapus</button>
                  </div>
                </div>
              ))}
              {sliderList.length === 0 && (
                <div style={{ textAlign: "center", padding: 32, color: C.textLight }}>Belum ada slider.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──── MODALS ──── */}
      {(showModal === 'berita' || showModal === 'dokumen' || showModal === 'slider' || showModal === 'program') && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="display" style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>
                {editItem ? "Edit" : "Tambah"} {showModal === 'berita' ? "Berita" : showModal === 'dokumen' ? "Dokumen" : showModal === 'program' ? "Program" : "Slider"}
              </h3>
              <button onClick={() => setShowModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLight }}><X size={20} /></button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const data = Object.fromEntries(fd.entries());
                
                // Merge new form data into existing item to preserve layout fields
                const finalData = editItem ? { ...editItem, ...data } : data;
                
                if (showModal === 'berita') {
                  finalData.is_featured = fd.get("is_featured") === "on";
                }
                handleSave(showModal, finalData);
              }}
            >
              <div className="modal-body">
                {showModal === 'program' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Nama Program / Kegiatan</label>
                      <input name="title" defaultValue={editItem?.title} className="form-input" required />
                    </div>

                    <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label className="form-label">Kategori</label>
                        <input name="cat" defaultValue={editItem?.cat} className="form-input" placeholder="Misal: Perencanaan" required />
                      </div>
                      <div>
                        <label className="form-label">Icon (Emoji)</label>
                        <input name="icon" defaultValue={editItem?.icon || "📐"} className="form-input" />
                      </div>
                    </div>
                    <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label className="form-label">Status</label>
                        <input name="status" defaultValue={editItem?.status || "Berjalan"} className="form-input" required />
                      </div>
                      <div>
                        <label className="form-label">Urutan (Priority)</label>
                        <input type="number" name="priority" defaultValue={editItem?.priority || 0} className="form-input" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Deskripsi Singkat</label>
                      <textarea name="desc" defaultValue={editItem?.desc} className="form-input" style={{ minHeight: 100 }} required />
                    </div>
                  </>
                ) : showModal === 'slider' ? (
                  <>
                    <ImageUploadField name="gambar_url" defaultValue={editItem?.gambar_url} label="Gambar Slider (Wajib)" required={true} />
                    <div className="form-group">
                      <label className="form-label">Judul Teks (Opsional)</label>
                      <input name="judul" defaultValue={editItem?.judul} className="form-input" placeholder="Misal: Inovasi Daerah" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subjudul Teks (Opsional)</label>
                      <input name="subjudul" defaultValue={editItem?.subjudul} className="form-input" placeholder="Misal: Menuju Masyarakat Sejahtera" />
                    </div>
                  </>
                ) : showModal === 'berita' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Judul Berita</label>
                      <input name="judul" defaultValue={editItem?.judul} className="form-input" required />
                    </div>
                    <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label className="form-label">Kategori</label>
                        <select name="kategori" defaultValue={editItem?.kategori} className="form-input">
                          <option>Perencanaan</option>
                          <option>Inovasi</option>
                          <option>Riset</option>
                          <option>Koordinasi</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Emoji / Icon</label>
                        <input name="emoji" defaultValue={editItem?.emoji || "📋"} className="form-input" />
                      </div>
                    </div>
                    <ImageUploadField name="gambar_url" defaultValue={editItem?.gambar_url} label="Gambar Berita (Opsional)" required={false} />
                    <div className="form-group">
                      <label className="form-label">Tanggal</label>
                      <input type="date" name="tanggal" defaultValue={editItem?.tanggal || new Date().toISOString().split('T')[0]} className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Isi Artikel Berita (Lengkap)</label>
                      <textarea name="konten" defaultValue={editItem?.konten} className="form-input" style={{ minHeight: 200, resize: "vertical" }} required />
                    </div>
                    <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="checkbox" name="is_featured" defaultChecked={editItem?.is_featured} id="is_featured" style={{ width: 18, height: 18 }} />
                      <label htmlFor="is_featured" style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 0 }}>Jadikan Berita Unggulan</label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Judul Dokumen</label>
                      <input name="judul" defaultValue={editItem?.judul} className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Kategori</label>
                      <select name="kategori" defaultValue={editItem?.kategori} className="form-input">
                        <option>Perencanaan Jangka Panjang</option>
                        <option>Perencanaan Jangka Menengah</option>
                        <option>Perencanaan Tahunan (RKPD)</option>
                        <option>Evaluasi & Pelaporan</option>
                        <option>Riset & Inovasi</option>
                        <option>Regulasi & Kebijakan</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label className="form-label">Ukuran File (e.g. 2.4 MB)</label>
                        <input name="ukuran" defaultValue={editItem?.ukuran} className="form-input" />
                      </div>
                      <div>
                        <label className="form-label">Icon (Emoji)</label>
                        <input name="icon" defaultValue={editItem?.icon || "📄"} className="form-input" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tanggal Terbit</label>
                      <input type="date" name="tanggal" defaultValue={editItem?.tanggal || new Date().toISOString().split('T')[0]} className="form-input" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">URL atau Upload Dokumen</label>
                      <input name="url" defaultValue={editItem?.url} className="form-input" placeholder="https://..." style={{ marginBottom: 10 }} />
                      <ImageUploadField name="url" defaultValue={editItem?.url} label="Unggah File (Gantikan URL di atas)" required={false} />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(null)} style={{ background: C.warmGray, border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Batal</button>
                <button type="submit" style={{ background: C.gold, border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, color: C.navyDark }}>Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ──── LOGIN MODAL ──── */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="display" style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>Login Admin</h3>
              <button onClick={() => setShowLogin(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLight }}><X size={20} /></button>
            </div>
            <form onSubmit={handleLogin}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Masukkan PIN Keamanan</label>
                  <input type="password" name="pin" className="form-input" placeholder="****" autoFocus required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-gold" style={{ width: "100%", justifyContent: "center" }}>Masuk Panel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──── LOGOUT BUTTON (If Admin) ──── */}
      {isAdmin && (
        <button onClick={handleLogout} style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, background: "#ef4444", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          Keluar Admin
        </button>
      )}
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
                <iframe
                  src={previewDokumen.url}
                  width="100%"
                  height="100%"
                  style={{ border: "none", position: "absolute", inset: 0 }}
                  title="PDF Preview"
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: C.textLight, padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                {beritaList.map(item => (
                  <div key={item.id} onClick={() => { setShowAllBeritaModal(false); setSelectedBerita(item); }} className="card" style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 10, background: `${C.navy}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, overflow: "hidden" }}>
                      {item.gambar_url ? (
                        <FadeInImage src={item.gambar_url} alt={item.judul} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        item.emoji || "📰"
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ background: `${C.navy}14`, color: C.navy, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{item.kategori}</span>
                        <span style={{ color: C.textLight, fontSize: 12 }}>{item.tanggal}</span>
                        {item.is_featured && <span style={{ color: C.gold, fontSize: 11, fontWeight: 700 }}>★ Unggulan</span>}
                      </div>
                      <h4 style={{ fontSize: 15, fontWeight: 600, color: C.navy, lineHeight: 1.4 }}>{item.judul}</h4>
                    </div>
                    <ArrowRight size={18} color={C.textLight} style={{ flexShrink: 0 }} />
                  </div>
                ))}
              </div>
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
                <FadeInImage src={selectedBerita.gambar_url} alt={selectedBerita.judul} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
              ) : (
                <span style={{ fontSize: 120 }}>{selectedBerita.emoji || "📰"}</span>
              )}
              <button onClick={() => setSelectedBerita(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(0,0,0,0.4)", border: "none", color: "white", padding: 8, borderRadius: "50%", cursor: "pointer", backdropFilter: "blur(4px)" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "40px 50px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 20 }}>
                <span style={{ background: `${C.navy}12`, color: C.navy, fontSize: 12, fontWeight: 700, padding: "5px 15px", borderRadius: 20, textTransform: "uppercase" }}>{selectedBerita.kategori}</span>
                <span style={{ color: C.textLight, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><Calendar size={14} /> {selectedBerita.tanggal}</span>
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
      {/* ──── MODAL: LAYOUT EDITOR ──── */}
      {showModal === 'layout' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal-content" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="display" style={{ fontSize: 22, color: C.navy }}>Editor Tata Letak Berita</h3>
              <button onClick={() => setShowModal(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ background: C.offWhite }}>
              <p style={{ fontSize: 14, color: C.textMid, marginBottom: 24 }}>
                Atur tata letak dengan menarik berita atau mengubah ukurannya. 
                {isSavingLayout && <span style={{ marginLeft: 12, color: C.gold, fontSize: 12, fontWeight: 700 }}>● Menyimpan...</span>}
              </p>
              
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(3, 1fr)", 
                gap: 12,
                maxHeight: "60vh",
                overflowY: "auto",
                padding: 4
              }}>
                {beritaList.map((item, idx) => {
                  const size = item.layout_size || (idx === 0 ? 'large' : 'normal');
                  return (
                    <div 
                      key={item.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("index", idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const fromIdx = parseInt(e.dataTransfer.getData("index"));
                        handleMoveBerita(fromIdx, idx);
                      }}
                      style={{ 
                        background: "white", 
                        border: `2px solid ${idx === 0 ? C.gold : C.warmGray}`,
                        borderRadius: 12,
                        padding: 10,
                        cursor: "grab",
                        gridColumn: size === 'wide' || size === 'large' ? "span 2" : "span 1",
                        gridRow: size === 'tall' || size === 'large' ? "span 2" : "span 1",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        transition: "all 0.2s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: `${C.navy}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{item.emoji || "📰"}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.judul}</div>
                      </div>

                      {/* Size Controls */}
                      <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newList = [...beritaList];
                            newList[idx] = { ...item, layout_size: 'normal' };
                            setBeritaList(newList);
                            saveBeritaOrder(newList);
                          }}
                          style={{ fontSize: 8, padding: "3px", borderRadius: 4, background: size === 'normal' ? C.gold : "#f1f5f9", color: size === 'normal' ? "white" : C.textMid, border: "none", cursor: "pointer" }}
                        >Kecil</button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newList = [...beritaList];
                            newList[idx] = { ...item, layout_size: 'wide' };
                            setBeritaList(newList);
                            saveBeritaOrder(newList);
                          }}
                          style={{ fontSize: 8, padding: "3px", borderRadius: 4, background: size === 'wide' ? C.gold : "#f1f5f9", color: size === 'wide' ? "white" : C.textMid, border: "none", cursor: "pointer" }}
                        >Lebar</button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newList = [...beritaList];
                            newList[idx] = { ...item, layout_size: 'tall' };
                            setBeritaList(newList);
                            saveBeritaOrder(newList);
                          }}
                          style={{ fontSize: 8, padding: "3px", borderRadius: 4, background: size === 'tall' ? C.gold : "#f1f5f9", color: size === 'tall' ? "white" : C.textMid, border: "none", cursor: "pointer" }}
                        >Tinggi</button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newList = [...beritaList];
                            newList[idx] = { ...item, layout_size: 'large' };
                            setBeritaList(newList);
                            saveBeritaOrder(newList);
                          }}
                          style={{ fontSize: 8, padding: "3px", borderRadius: 4, background: size === 'large' ? C.gold : "#f1f5f9", color: size === 'large' ? "white" : C.textMid, border: "none", cursor: "pointer" }}
                        >Besar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-gold" onClick={() => setShowModal(null)}>Selesai</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
import { useState, useEffect, useCallback } from "react";
import { api } from "../api";

// Cache daftar per modul + kueri. Pindah tab menampilkan data lama seketika,
// lalu diperbarui di latar belakang kalau umurnya lewat TTL.
const cache = new Map();
const TTL = 30_000;

export function kosongkanCache(modul) {
  for (const k of cache.keys()) if (!modul || k.startsWith(`${modul}?`)) cache.delete(k);
}

// Semua panggilan tulis/baca admin lewat sini: sesi habis (401) diteruskan ke
// shell supaya panel kembali ke layar login, bukan diam dengan tabel kosong.
export async function jalankan(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e.status === 401) window.dispatchEvent(new Event("sesi-habis"));
    throw e;
  }
}

export function useDaftar(modul, { q = "", halaman = 0, ukuran = 15 } = {}) {
  const kunci = `${modul}?q=${q}&o=${halaman * ukuran}&l=${ukuran}`;
  const [versi, setVersi] = useState(0);
  const [state, setState] = useState(() => {
    const ada = cache.get(kunci);
    return { rows: ada?.rows ?? null, total: ada?.total ?? 0, galat: null, memuat: !ada };
  });

  useEffect(() => {
    const ada = cache.get(kunci);
    if (ada) setState({ rows: ada.rows, total: ada.total, galat: null, memuat: false });
    else setState((s) => ({ ...s, memuat: true, galat: null }));
    if (ada && Date.now() - ada.t < TTL) return;

    let batal = false;
    // Jeda singkat hanya untuk pencarian, supaya tiap ketukan tidak jadi request.
    const timer = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ limit: ukuran, offset: halaman * ukuran });
        if (q) p.set("q", q);
        const h = await jalankan(() => api.get(`/${modul}?${p}`));
        if (batal) return;
        cache.set(kunci, { ...h, t: Date.now() });
        setState({ rows: h.rows, total: h.total, galat: null, memuat: false });
      } catch (err) {
        if (!batal) setState((s) => ({ ...s, galat: err.message, memuat: false }));
      }
    }, q ? 250 : 0);
    return () => { batal = true; clearTimeout(timer); };
  }, [kunci, versi, modul, q, halaman, ukuran]);

  const muatUlang = useCallback(() => { kosongkanCache(modul); setVersi((v) => v + 1); }, [modul]);
  return { ...state, muatUlang };
}

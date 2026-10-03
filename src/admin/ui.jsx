import { useState } from "react";
import { useContext } from "react";
import Context from "./cache";

// Warna dari tema.css via CSS variable --*

// Tombol
function Tombol({ children, onClick, type = "button", disabled, kecil }) {
  const warna = disabled ? "var(--abu-panas)" : "var(--emas)";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: warna,
        color: disabled ? "var(--text-medium)" : "var(--navi)",
        border: "none",
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

// Kartu
function Kartu({ children, style }) {
  return (
    <div style={{ background: "var(--putih)", border: "1solid var(--abu-ungu)", borderRadius: 12, padding: 20, ...style }}>
      {children}
    </div>
  );
}

// Kolom
function Kolom({ label, children, hint, wajib }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: var(--text-medium), marginBottom: 6, letterSpacing: "0.02em" }}>
        {label}
        {wajib && <span style={{ color: var(--bahaya) }}> *</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: var(--text-light), marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

// Toast (notifikasi)
function Toast({ ok, teks }) {
  if (!ok && !teks) return null;
  const warna = ok ? "var(--sukses)" : "var(--bahaya)";
  const teksWarna = ok ? "var(--putih)" : "var(--putih)";
  return (
    <div style={{ background: warna, color: teksWarna, padding: "10px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14 }}>
      {teks}
    </div>
  );
}

// Skeleton loader
function Skeleton({ tamanho }) {
  const size = tamanho || "100%";
  return (
    <div style={{ background: "var(--abu-ungu)", borderRadius: 8, height: 12, width: size, animation: "blink 1s infinite" }}>
      &nbsp;
    </div>
  );
}
@keyframes blink { from { opacity: 1; } 50% { opacity: 0.5; } to { opacity: 1; } }
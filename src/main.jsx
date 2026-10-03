import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Tidak memakai react-router: proyek ini hanya punya dua tampilan dan menambah
// dependensi router untuk hal itu berlebihan.
//
// Admin di-import dinamis supaya jadi chunk sendiri. Kalau diimpor langsung di
// sini, kodenya masuk ke bundle utama dan setiap pengunjung situs publik ikut
// mengunduhnya tanpa pernah membukanya.
const Admin = lazy(() => import('./Admin.jsx'))

const diAdmin = window.location.pathname.startsWith('/admin')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontSize: 14, color: '#8898AA' }}>Memuat…</div>}>
      {diAdmin ? <Admin /> : <App />}
    </Suspense>
  </React.StrictMode>,
)

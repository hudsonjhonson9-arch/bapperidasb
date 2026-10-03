import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Frontend memanggil /api/* (server native Express). Tanpa proxy ini,
    // `npm run dev` akan mengembalikan index.html untuk /api dan semua request
    // data berakhir 200 dengan HTML.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
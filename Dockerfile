# Multi-stage: vite hanya dipakai saat build, image akhir tidak membawanya.
# Semua pg dan bcryptjs di sini murni JavaScript, jadi alpine cukup dan
# ukurannya tetap kecil.
FROM node:22-alpine AS build

WORKDIR /app

# Manifest lebih dulu supaya layer install tidak diulang tiap kode berubah.
# --include=dev wajib: vite ada di devDependencies.
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

COPY index.html vite.config.js ./
COPY src ./src

# Vite menyisipkan VITE_* ke bundle saat build, jadi nilainya harus ada di
# tahap ini, bukan hanya saat container berjalan. Dikosongkan supaya build
# tetap jalan kalau lupa diisi; upload Drive akan ditolak GAS sampai
# VITE_GAS_API_KEY dikonfigurasi ulang.
ARG VITE_GAS_WEBAPP_URL=""
ARG VITE_GAS_API_KEY=""
ENV VITE_GAS_WEBAPP_URL=$VITE_GAS_WEBAPP_URL \
    VITE_GAS_API_KEY=$VITE_GAS_API_KEY

RUN npm run build


FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY db ./db
# Hasil build diambil dari tahap build, bukan dibangun ulang di sini.
COPY --from=build /app/dist ./dist

# node:22-alpine sudah punya user 'node'. owned oleh node supaya aplikasi
# tidak butuh root.
RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]

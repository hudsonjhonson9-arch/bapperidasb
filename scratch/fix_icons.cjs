const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix icons in Galeri Inovasi
const gallerySearch = /\{isAdmin && \([\s\S]*?\{isAdmin && \([\s\S]*?\)\}/g;
// Actually just replace the whole section from 1800 to 1840
// But let's be more precise.

// Fix Admin Modal icons
content = content.replace(/🏢 \{inv\.opd_nama\} • 🏷️ \{inv\.jenis_inovasi\}/g, '<Globe size={14} color={C.gold} /> {inv.opd_nama}');
content = content.replace(/👤 Inovator: \{inv\.nama_inovator \|\| "Tim Inovator"\}/g, '<User size={14} /> Inovator: {inv.nama_inovator || "Tim Inovator"}');

// Fix common corrupted emojis
content = content.replace(/ðŸ“„/g, '📄');
content = content.replace(/ðŸ“˜/g, '📘');
content = content.replace(/ðŸ“—/g, '📗');
content = content.replace(/ðŸ“™/g, '📙');
content = content.replace(/ðŸ“Š/g, '📊');
content = content.replace(/ðŸ”¬/g, '🔬');
content = content.replace(/ðŸ’¡/g, '💡');
content = content.replace(/âš–ï¸ /g, '⚖️');
content = content.replace(/ðŸ“œ/g, '📜');

// Fix the duplication at 1820
const duplicationBlock = /\{isAdmin && \([\s\S]*?Buka Dashboard Admin Inovasi \(Review Pending\)[\s\S]*?\}\)[\s\S]*?\}\)\s*\{isAdmin && \(/;
// This is risky. Let's just search for the specific duplicated part.

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed icons and emojis');

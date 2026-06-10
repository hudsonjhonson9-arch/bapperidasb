const fs = require('fs');

let appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

// 1. Fix Imports
if (!content.includes('Settings,')) {
  content = content.replace('Trash2,', 'Trash2, Settings, Star, Package, Clock,');
}

// 2. Fix OrgBox icons
content = content.replace(/Ã°Å¸â€˜Â¤/g, '<User size={28} />');
content = content.replace(/Ã¢Â­Â /g, '<Star size={12} fill="white" />');

// 3. Fix Slider Control
content = content.replace(/Ã¢Å¡â„¢Ã¯Â¸Â /g, '<Settings size={14} style={{marginRight: 6}} />');

// 4. Fix DOKUMEN rendering logic
// Replace the literal \uD83D\uDCE6 text with actual characters or Lucide
content = content.replace(/\\uD83D\\uDCE6/g, '📦'); 
content = content.replace(/\\uD83D\\uDCC4/g, '📄');
content = content.replace(/\\uD83D\\uDCD8/g, '📘');
content = content.replace(/\\uD83D\\uDCD7/g, '📗');
content = content.replace(/\\uD83D\\uDCD9/g, '📙');
content = content.replace(/\\uD83D\\uDCCA/g, '📊');
content = content.replace(/\\uD83D\\uDD2C/g, '🔬');
content = content.replace(/\\uD83D\\uDCA1/g, '💡');
content = content.replace(/\\u2696\\uFE0F/g, '⚖️');
content = content.replace(/\\uD83D\\uDCDC/g, '📜');

// 5. Fix Jam Layanan & Contact dashes
content = content.replace(/Ã¢â‚¬â€œ/g, '-');

// 6. Fix Inovasi Section Duplication / Garbage
content = content.replace(/AAA\.A,A,A\?A,A\?/g, '🔍');

// 7. Fix any remaining ? in icons
content = content.replace(/Ã°Å¸â€ Â /g, '🔍');

// 8. Specific fix for Dokumen List items where I might have messed up curly braces
content = content.replace(/\{dok\.icon \|\| "\\uD83D\\uDCC4"\}/g, '{dok.icon || "📄"}');

// 9. Fix the footer copyright or other areas
content = content.replace(/Ã‚Â©/g, '©');

fs.writeFileSync(appPath, content, 'utf8');
console.log('App.jsx deep cleanup complete.');

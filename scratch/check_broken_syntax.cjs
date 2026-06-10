const fs = require('fs');
const appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

// Find the broken area
const brokenStart = content.indexOf('📄 {d.name}');
if (brokenStart !== -1) {
    const nextDiv = content.indexOf('</div>', brokenStart);
    const afterNextDiv = content.indexOf('</div>', nextDiv + 1);
    const endSection = content.indexOf('✕ Hapus', afterNextDiv);
    
    // We want to replace everything from the end of the dokumen_dukung div to the start of the Hapus button
    const targetString = content.substring(afterNextDiv + 6, endSection);
    
    const correctSection = `
                  <div style={{ display: "flex", gap: 10 }}>
                    {inv.status_approval !== 'Approved' && (
                      <button onClick={() => handleSave('inovasi', { id: inv.id, action: 'approve' }).then(() => {
                        fetchData();
                      })} style={{ background: "green", color: "white", padding: "6px 12px", borderRadius: 4, border: "none", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                        ✓ Approve (Tampilkan di Publik)
                      </button>
                    )}
                    <button onClick={() => `;

    // Wait, let's just use a simpler replacement for the whole footer area
    const footerRegex = /<div style=\{\{ display: "flex", gap: 10 \}\}>[\s\S]*?✕ Hapus/;
    // But my previous regex might have broken the flex div too.
}

// Let's just look at the code again to be 100% sure where it is.
console.log('Current state around line 2500:');
const lines = content.split('\n');
for (let i = 2490; i < 2515; i++) {
    console.log(`${i+1}: ${lines[i]}`);
}

const fs = require('fs');
const appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

const anchor = '📄 {d.name}';
const anchorIdx = content.indexOf(anchor);

if (anchorIdx !== -1) {
    // Find the end of the dokumen loop
    const loopEnd = content.indexOf('))}');
    const divEnd1 = content.indexOf('</div>', loopEnd);
    const divEnd2 = content.indexOf('</div>', divEnd1 + 1);
    
    // The broken part starts after divEnd2
    const hapusBtn = content.indexOf('✕ Hapus');
    const startOfHapusButtonLine = content.lastIndexOf('<button', hapusBtn);
    
    const head = content.substring(0, divEnd2 + 6);
    const tail = content.substring(startOfHapusButtonLine);
    
    const fix = `
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {inv.status_approval !== 'Approved' && (
                      <button onClick={() => handleSave('inovasi', { id: inv.id, action: 'approve' }).then(() => {
                        fetchData();
                      })} style={{ background: "green", color: "white", padding: "6px 12px", borderRadius: 4, border: "none", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                        ✓ Approve (Tampilkan di Publik)
                      </button>
                    )}
                    `;
    
    fs.writeFileSync(appPath, head + fix + tail, 'utf8');
    console.log('Surgical syntax fix applied.');
} else {
    console.log('Anchor not found!');
}

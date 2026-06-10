const fs = require('fs');
const appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

const target = `                    </div>
                      })} style={{ background: "green", color: "white", padding: "6px 12px", borderRadius: 4, border: "none", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                        ✓ Approve (Tampilkan di Publik)
                      </button>
                    )}`;

const replacement = `                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    {inv.status_approval !== 'Approved' && (
                      <button onClick={() => handleSave('inovasi', { id: inv.id, action: 'approve' }).then(() => {
                        fetchData();
                      })} style={{ background: "green", color: "white", padding: "6px 12px", borderRadius: 4, border: "none", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                        ✓ Approve (Tampilkan di Publik)
                      </button>
                    )}`;

content = content.replace(target, replacement);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Syntax error fixed in App.jsx');

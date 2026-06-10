const fs = require('fs');
const appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

const targetRegex = /\{inv\.dokumen_dukung && inv\.dokumen_dukung\.length > 0 && \([\s\S]*?\}\)/;
const replacement = `{inv.link_video && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, marginBottom: 5, textTransform: "uppercase" }}>Video Inovasi:</div>
                      <a href={inv.link_video} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#f43f5e", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", fontWeight: 700 }}>
                         Video YouTube Inovasi
                      </a>
                    </div>
                  )}

                  {inv.dokumen_dukung && inv.dokumen_dukung.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, marginBottom: 8, textTransform: "uppercase" }}>Dokumen Pendukung:</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {inv.dokumen_dukung.map((d, i) => (
                          <a key={i} href={d.url || d.data} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.navy, background: \`\${C.gold}22\`, padding: "4px 10px", borderRadius: 4, textDecoration: "none", fontWeight: 600 }}>
                            📄 {d.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}`;

content = content.replace(targetRegex, replacement);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Admin Inovasi modal updated with video link and fixed document links.');

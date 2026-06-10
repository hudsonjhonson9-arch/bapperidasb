const fs = require('fs');
const appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

// Replace OrgBox component
const orgBoxStart = 'const OrgBox = ({ data, color, isLeader, isBidang }) => {';
const orgBoxEnd = '};';
const orgBoxRegex = /const OrgBox = \(\{ data, color, isLeader, isBidang \}\) => \{[\s\S]*?\n\};/;

const newOrgBox = `const OrgBox = ({ data, color, isLeader, isBidang }) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ 
        width: isLeader ? 260 : 220,
        background: hovered ? "white" : "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        borderRadius: 20,
        overflow: "hidden",
        border: \`1px solid \${hovered ? color : "#e2e8f0"}\`,
        boxShadow: hovered 
          ? \`0 20px 40px \${color}15, 0 1px 3px rgba(0,0,0,0.05)\` 
          : "0 4px 12px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        transform: hovered ? "translateY(-8px) scale(1.02)" : "translateY(0) scale(1)",
        zIndex: hovered ? 10 : 1,
        cursor: "pointer"
      }}>
      <div style={{ 
        background: color, 
        color: "white", 
        padding: "16px", 
        textAlign: "center", 
        position: "relative",
        minHeight: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", opacity: 0.8, textTransform: "uppercase", lineHeight: 1.4 }}>{data.title}</div>
        {hovered && <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 40, height: 3, background: "rgba(255,255,255,0.5)", borderRadius: "2px 2px 0 0" }} />}
      </div>
      <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <div style={{ 
            width: 72, height: 72, borderRadius: "24px", 
            background: hovered ? \`\${color}15\` : "#f8fafc", 
            border: \`2px solid \${hovered ? color : "#f1f5f9"}\`, 
            display: "flex", alignItems: "center", justifyContent: "center", 
            transition: "all 0.4s ease",
            transform: hovered ? "rotate(5deg)" : "rotate(0)"
          }}>
            <User size={32} color={color} />
          </div>
          {isLeader && (
            <div style={{ position: "absolute", top: -5, right: -5, background: C.gold, color: "white", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
              <Star size={12} fill="white" />
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, lineHeight: 1.3, marginBottom: 4 }}>{data.name}</div>
          <div style={{ fontSize: 10, color: C.textLight, fontWeight: 600, letterSpacing: "0.02em" }}>NIP. {data.nip}</div>
        </div>
      </div>
    </div>
  );
};`;

content = content.replace(orgBoxRegex, newOrgBox);

// Fix Slider Control Button too
content = content.replace(/<button className="btn-gold" onClick=\{\(\) => setShowModal\('slider-list'\)\} style=\{\{ padding: "8px 16px", fontSize: 13 \}\}>[\s\S]*?<\/button>/, 
  '<button className="btn-gold" onClick={() => setShowModal(\'slider-list\')} style={{ padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}><Settings size={14} /> Kelola Slider Hero</button>');

fs.writeFileSync(appPath, content, 'utf8');
console.log('OrgBox and Slider Control fixed.');

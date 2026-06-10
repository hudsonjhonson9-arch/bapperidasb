const fs = require('fs');

// --- 1. Fix App.jsx Icons & Encodings ---
let appPath = 'src/App.jsx';
let appContent = fs.readFileSync(appPath, 'utf8');

// Global replacement for common corrupted sequences
const replacements = [
  // DOKUMEN items
  { from: /icon: "ðŸ“˜"/g, to: 'icon: "\\uD83D\\uDCD8"' }, // 📘
  { from: /icon: "ðŸ“„"/g, to: 'icon: "\\uD83D\\uDCC4"' }, // 📄
  { from: /icon: "ðŸ“—"/g, to: 'icon: "\\uD83D\\uDCD7"' }, // 📗
  { from: /icon: "ðŸ“™"/g, to: 'icon: "\\uD83D\\uDCD9"' }, // 📙
  { from: /icon: "ðŸ“Š"/g, to: 'icon: "\\uD83D\\uDCCA"' }, // 📊
  { from: /icon: "ðŸ”¬"/g, to: 'icon: "\\uD83D\\uDD2C"' }, // 🔬
  { from: /icon: "ðŸ’¡"/g, to: 'icon: "\\uD83D\\uDCA1"' }, // 💡
  { from: /icon: "âš–ï¸ "/g, to: 'icon: "\\u2696\\uFE0F"' }, // ⚖️
  { from: /icon: "ðŸ“œ"/g, to: 'icon: "\\uD83D\\uDCDC"' }, // 📜
  
  // Rendering logic icons
  { from: /\{dok\.icon \|\| "ðŸ“„"\}/g, to: '{dok.icon || "\\uD83D\\uDCC4"}' },
  { from: /Ã°Å¸â€œÂ¦/g, to: '\\uD83D\\uDCE6' }, // 📦 (Package/Size)
  { from: /Ã°Å¸â€ Â /g, to: '\\uD83D\\uDD0D' }, // 🔍 (Search)
  { from: /Ã¢Å“Å½/g, to: '<Edit size={14} />' }, // Edit icon
  { from: /Ã¢Å“â€¢/g, to: '<Trash2 size={14} />' }, // Trash icon
  
  // Other potential corruptions seen in screenshot
  { from: /Ã°Å¸â€ºÂ Ã¯Â¸Â /g, to: '\\uD83D\\uDEE0\\uFE0F' }, // 🛠️
  { from: /Ã°Å¸â€™Â¡/g, to: '\\uD83D\\uDCA1' }, // 💡
  
  // Clean up dash corruptions
  { from: /2025â€“2045/g, to: '2025-2045' },
  { from: /2021â€“2026/g, to: '2021-2026' }
];

replacements.forEach(r => {
  appContent = appContent.replace(r.from, r.to);
});

// Ensure Edit and Trash2 are imported if used
if (appContent.includes('<Edit') && !appContent.includes('Edit,')) {
  appContent = appContent.replace('Eye, Search,', 'Eye, Search, Edit, Trash2,');
}

fs.writeFileSync(appPath, appContent, 'utf8');
console.log('Fixed App.jsx icons and encoding (comprehensive).');


// --- 2. Update n8n-bapperida-workflow.json ---
let n8nPath = 'n8n-bapperida-workflow.json';
let n8n = JSON.parse(fs.readFileSync(n8nPath, 'utf8'));

// Add New Webhook Node
const webhookNode = {
  "parameters": {
    "path": "bapperida-inovasi-list",
    "responseMode": "lastNode",
    "options": {}
  },
  "id": "bapperida-inovasi-list-webhook-id",
  "name": "Webhook Inovasi List",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 1,
  "position": [
    -512,
    2200
  ]
};

// Add New DB Node
const dbNode = {
  "parameters": {
    "operation": "executeQuery",
    "query": "SELECT * FROM public.bapperida_inovasi ORDER BY created_at DESC;",
    "options": {}
  },
  "id": "bapperida-inovasi-list-db-id",
  "name": "DB Inovasi List",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2.6,
  "position": [
    -288,
    2200
  ],
  "credentials": {
    "postgres": {
      "id": "vYOiyrTftLtD3zzd",
      "name": "Postgres account"
    }
  }
};

// Push nodes if not already exists
if (!n8n.nodes.find(n => n.name === "Webhook Inovasi List")) {
  n8n.nodes.push(webhookNode);
  n8n.nodes.push(dbNode);
  
  // Add connection
  if (!n8n.connections) n8n.connections = {};
  n8n.connections["Webhook Inovasi List"] = {
    "main": [
      [
        {
          "node": "DB Inovasi List",
          "type": "main",
          "index": 0
        }
      ]
    ]
  };
  console.log('Added bapperida-inovasi-list nodes to n8n workflow.');
}

fs.writeFileSync(n8nPath, JSON.stringify(n8n, null, 2), 'utf8');
console.log('Updated n8n-bapperida-workflow.json');

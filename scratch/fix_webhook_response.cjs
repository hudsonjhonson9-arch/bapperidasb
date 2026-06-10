const fs = require('fs');

// --- 1. Update n8n-bapperida-workflow.json ---
let n8nPath = 'n8n-bapperida-workflow.json';
let n8n = JSON.parse(fs.readFileSync(n8nPath, 'utf8'));

// Add Respond Node for Inovasi List
const respondNode = {
  "parameters": {
    "respondWith": "json",
    "responseBody": "={{ $json }}",
    "options": {}
  },
  "id": "bapperida-inovasi-list-respond-id",
  "name": "Respond Inovasi List",
  "type": "n8n-nodes-base.respondToWebhook",
  "typeVersion": 1,
  "position": [
    -60,
    2200
  ]
};

// Check if nodes exist and update them
let webhook = n8n.nodes.find(n => n.name === "Webhook Inovasi List");
if (webhook) {
  webhook.parameters.responseMode = "responseNode";
} else {
  // Add missing webhook
  n8n.nodes.push({
    "parameters": {
      "path": "bapperida-inovasi-list",
      "responseMode": "responseNode",
      "options": {}
    },
    "id": "bapperida-inovasi-list-webhook-id",
    "name": "Webhook Inovasi List",
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 1,
    "position": [-512, 2200]
  });
}

let dbNode = n8n.nodes.find(n => n.name === "DB Inovasi List");
if (!dbNode) {
  n8n.nodes.push({
    "parameters": {
      "operation": "executeQuery",
      "query": "SELECT * FROM public.bapperida_inovasi ORDER BY created_at DESC;",
      "options": {}
    },
    "id": "bapperida-inovasi-list-db-id",
    "name": "DB Inovasi List",
    "type": "n8n-nodes-base.postgres",
    "typeVersion": 2.6,
    "position": [-288, 2200],
    "credentials": { "postgres": { "id": "vYOiyrTftLtD3zzd", "name": "Postgres account" } }
  });
}

if (!n8n.nodes.find(n => n.name === "Respond Inovasi List")) {
  n8n.nodes.push(respondNode);
}

// Ensure connections
if (!n8n.connections) n8n.connections = {};
n8n.connections["Webhook Inovasi List"] = { "main": [[{ "node": "DB Inovasi List", "type": "main", "index": 0 }]] };
n8n.connections["DB Inovasi List"] = { "main": [[{ "node": "Respond Inovasi List", "type": "main", "index": 0 }]] };

fs.writeFileSync(n8nPath, JSON.stringify(n8n, null, 2), 'utf8');
console.log('n8n workflow updated with proper response node.');


// --- 2. Update App.jsx fetchData fallback ---
let appPath = 'src/App.jsx';
let appContent = fs.readFileSync(appPath, 'utf8');

const oldFetch = 'if (data.inovasi) setInovasiList(data.inovasi);';
const newFetch = `if (data.inovasi) {
        setInovasiList(data.inovasi);
      }
      
      // Always fetch all innovations for Admin Review if separate endpoint exists
      try {
        const invRes = await fetch(\`\${API_BASE}/bapperida-inovasi-list\`, {
          headers: { "X-App-Token": APP_SECRET }
        });
        if (invRes.ok) {
          const invData = await invRes.json();
          const invList = getList(invData);
          if (invList && invList.length > 0) {
            setInovasiList(invList);
          }
        }
      } catch (e) {
        console.warn("Inovasi separate fetch failed, using init data:", e);
      }`;

if (appContent.includes(oldFetch)) {
  appContent = appContent.replace(oldFetch, newFetch);
}

// Also restore the filter in the gallery to prevent Pending items from showing to public
appContent = appContent.replace(
  '{inovasiList.length === 0 ? (',
  "{inovasiList.filter(inv => inv.status_approval === 'Approved').length === 0 ? ("
);
appContent = appContent.replace(
  '{inovasiList.map(inv => (',
  "{inovasiList.filter(inv => inv.status_approval === 'Approved').map(inv => ("
);

fs.writeFileSync(appPath, appContent, 'utf8');
console.log('App.jsx fetchData and filter restored.');

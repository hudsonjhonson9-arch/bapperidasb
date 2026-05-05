const fs = require('fs');
const crypto = require('crypto');

const file = 'n8n-bapperida-workflow.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// Helper to create UUID
const uuid = () => crypto.randomUUID();

// Standard Auth check condition
const authCondition = {
  "conditions": {
    "string": [
      {
        "value1": "={{$json.headers['x-app-token']}}",
        "value2": "BAPPERIDA_SECURE_TOKEN_2026"
      }
    ]
  }
};

// Find postgres credentials ID
const dbNode = data.nodes.find(n => n.type === 'n8n-nodes-base.postgres');
const pgCreds = dbNode.credentials.postgres;

// We will add 3 new webhook flows:
// 1. Metric Edit
// 2. Inovasi Submit (No Auth)
// 3. Inovasi Approve (Auth)

const newNodes = [];
const newConnections = {};

let baseY = 2000; // Place them below existing ones

let respondUnauthorizedId = data.nodes.find(n => n.name === 'Respond Unauthorized')?.id;
if (!respondUnauthorizedId) {
  respondUnauthorizedId = uuid();
  newNodes.push({
    "parameters": {
      "respondWith": "json",
      "responseBody": "{\n  \"error\": \"Unauthorized\"\n}",
      "options": {
        "responseCode": 401
      }
    },
    "id": respondUnauthorizedId,
    "name": "Respond Unauthorized",
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1,
    "position": [ 224, baseY + 1000 ]
  });
}

function addFlow(name, path, query, needsAuth) {
  const webhookId = uuid();
  const authId = needsAuth ? uuid() : null;
  const dbId = uuid();
  const respondSuccessId = data.nodes.find(n => n.name === 'Respond Success').id;

  const webhookNode = {
    "parameters": {
      "httpMethod": "POST",
      "path": path,
      "responseMode": "lastNode",
      "options": { "includeHeaders": true }
    },
    "id": webhookId,
    "name": `Webhook ${name}`,
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 1,
    "position": [0, baseY],
    "webhookId": uuid()
  };
  newNodes.push(webhookNode);

  let nextId = webhookId;

  if (needsAuth) {
    const authNode = {
      "parameters": authCondition,
      "id": authId,
      "name": `Auth ${name}`,
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [224, baseY]
    };
    newNodes.push(authNode);
    newConnections[webhookId] = {
      "main": [ [ { "node": authNode.name, "type": "main", "index": 0 } ] ]
    };
    nextId = authId;
  }

  const dbOpNode = {
    "parameters": {
      "operation": "executeQuery",
      "query": query,
      "options": {}
    },
    "id": dbId,
    "name": `DB ${name}`,
    "type": "n8n-nodes-base.postgres",
    "typeVersion": 2.6,
    "position": [448, baseY],
    "credentials": { "postgres": pgCreds }
  };
  newNodes.push(dbOpNode);

  if (needsAuth) {
    newConnections[nextId] = {
      "main": [
        [ { "node": dbOpNode.name, "type": "main", "index": 0 } ],
        [ { "node": "Respond Unauthorized", "type": "main", "index": 0 } ]
      ]
    };
  } else {
    newConnections[nextId] = {
      "main": [ [ { "node": dbOpNode.name, "type": "main", "index": 0 } ] ]
    };
  }

  newConnections[dbId] = {
    "main": [ [ { "node": "Respond Success", "type": "main", "index": 0 } ] ]
  };

  baseY += 300;
}

// 1. Metric Edit
addFlow("Metric Edit", "bapperida-metric-save", 
  "UPDATE public.bapperida_metrics SET value = '{{$json.body.value ? $json.body.value.replace(/'/g, \"''\") : \"\"}}' WHERE id = '{{$json.body.id}}' RETURNING *;", 
  true
);

// 2. Inovasi Submit
addFlow("Inovasi Submit", "bapperida-inovasi-submit",
  "INSERT INTO public.bapperida_inovasi (opd_nama, judul_inovasi, jenis_inovasi, tahapan_inovasi, rancang_bangun, link_video, dokumen_dukung, skor_iga, kategori_skor) VALUES ('{{$json.body.opd_nama ? $json.body.opd_nama.replace(/'/g, \"''\") : \"\"}}', '{{$json.body.judul_inovasi ? $json.body.judul_inovasi.replace(/'/g, \"''\") : \"\"}}', '{{$json.body.jenis_inovasi || \"\"}}', '{{$json.body.tahapan_inovasi || \"\"}}', '{{$json.body.rancang_bangun ? $json.body.rancang_bangun.replace(/'/g, \"''\") : \"\"}}', '{{$json.body.link_video || \"\"}}', '{{$json.body.dokumen_dukung ? JSON.stringify($json.body.dokumen_dukung) : \"[]\"}}'::jsonb, {{$json.body.skor_iga || 0}}, '{{$json.body.kategori_skor || \"Kurang\"}}') RETURNING *;",
  false
);

// 3. Inovasi Approve
addFlow("Inovasi Approve", "bapperida-inovasi-approve",
  "UPDATE public.bapperida_inovasi SET status_approval = 'Approved' WHERE id = {{$json.body.id}} RETURNING *;",
  true
);

// Delete Flow
addFlow("Inovasi Delete", "bapperida-inovasi-delete",
  "DELETE FROM public.bapperida_inovasi WHERE id = {{$json.body.id}} RETURNING *;",
  true
);

data.nodes.push(...newNodes);
for (const [nodeId, conns] of Object.entries(newConnections)) {
  const nodeName = newNodes.find(n => n.id === nodeId)?.name || data.nodes.find(n => n.id === nodeId)?.name;
  data.connections[nodeName] = conns;
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log("Successfully injected new routes into n8n workflow.");

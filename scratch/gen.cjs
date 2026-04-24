const fs = require('fs');

const entities = [
  { name: 'berita', table: 'bapperida_berita' },
  { name: 'dokumen', table: 'bapperida_dokumen' },
  { name: 'slider', table: 'bapperida_slider' }
];

const nodes = [];
const connections = {};

let idCounter = 1;
const getId = () => `node-${idCounter++}`;
const getPos = (x, y) => [x, y];

let yOffset = 0;

const addNode = (node) => {
  nodes.push(node);
  if (!connections[node.name]) {
    connections[node.name] = { main: [[]] };
  }
};

const connect = (sourceNode, targetNode, outputIndex = 0) => {
  if (!connections[sourceNode.name]) connections[sourceNode.name] = { main: [] };
  while (connections[sourceNode.name].main.length <= outputIndex) {
    connections[sourceNode.name].main.push([]);
  }
  connections[sourceNode.name].main[outputIndex].push({
    node: targetNode.name,
    type: "main",
    index: 0
  });
};

entities.forEach((entity, index) => {
  const y = yOffset;
  
  // 1. LIST (GET)
  const webhookList = {
    parameters: {
      httpMethod: "GET",
      path: `bapperida-${entity.name}-list`,
      responseMode: "lastNode",
      options: {}
    },
    id: getId(),
    name: `Webhook ${entity.name} List`,
    type: "n8n-nodes-base.webhook",
    typeVersion: 1,
    position: getPos(0, y)
  };
  
  const postgresList = {
    parameters: {
      operation: "executeQuery",
      query: `SELECT * FROM ${entity.table} ORDER BY id DESC;`
    },
    id: getId(),
    name: `DB ${entity.name} List`,
    type: "n8n-nodes-base.postgres",
    typeVersion: 2.6,
    position: getPos(200, y),
    credentials: { postgres: { id: "vYOiyrTftLtD3zzd", name: "Postgres account" } }
  };
  
  addNode(webhookList);
  addNode(postgresList);
  connect(webhookList, postgresList);

  // 2. ADD (POST)
  const webhookAdd = {
    parameters: {
      httpMethod: "POST",
      path: `bapperida-${entity.name}-add`,
      responseMode: "lastNode",
      options: {}
    },
    id: getId(),
    name: `Webhook ${entity.name} Add`,
    type: "n8n-nodes-base.webhook",
    typeVersion: 1,
    position: getPos(0, y + 200)
  };

  const authCheckAdd = {
    parameters: {
      conditions: {
        string: [
          {
            value1: "={{$request.headers['x-app-token']}}",
            value2: "BAPPERIDA_SECURE_TOKEN_2026"
          }
        ]
      }
    },
    id: getId(),
    name: `Auth Add ${entity.name}`,
    type: "n8n-nodes-base.if",
    typeVersion: 1,
    position: getPos(200, y + 200)
  };

  const postgresAdd = {
    parameters: {
      operation: "insert",
      schema: { __rl: true, value: "public", mode: "list" },
      table: { __rl: true, value: entity.table, mode: "list" },
      columns: ""
    },
    id: getId(),
    name: `DB ${entity.name} Add`,
    type: "n8n-nodes-base.postgres",
    typeVersion: 2.6,
    position: getPos(400, y + 150),
    credentials: { postgres: { id: "vYOiyrTftLtD3zzd", name: "Postgres account" } }
  };
  
  addNode(webhookAdd);
  addNode(authCheckAdd);
  addNode(postgresAdd);
  connect(webhookAdd, authCheckAdd);
  connect(authCheckAdd, postgresAdd, 0); // true branch

  // 3. EDIT (POST)
  const webhookEdit = {
    parameters: {
      httpMethod: "POST",
      path: `bapperida-${entity.name}-edit`,
      responseMode: "lastNode",
      options: {}
    },
    id: getId(),
    name: `Webhook ${entity.name} Edit`,
    type: "n8n-nodes-base.webhook",
    typeVersion: 1,
    position: getPos(0, y + 400)
  };

  const authCheckEdit = {
    parameters: {
      conditions: {
        string: [
          {
            value1: "={{$request.headers['x-app-token']}}",
            value2: "BAPPERIDA_SECURE_TOKEN_2026"
          }
        ]
      }
    },
    id: getId(),
    name: `Auth Edit ${entity.name}`,
    type: "n8n-nodes-base.if",
    typeVersion: 1,
    position: getPos(200, y + 400)
  };

  const postgresEdit = {
    parameters: {
      operation: "update",
      schema: { __rl: true, value: "public", mode: "list" },
      table: { __rl: true, value: entity.table, mode: "list" },
      updateKey: "id"
    },
    id: getId(),
    name: `DB ${entity.name} Edit`,
    type: "n8n-nodes-base.postgres",
    typeVersion: 2.6,
    position: getPos(400, y + 350),
    credentials: { postgres: { id: "vYOiyrTftLtD3zzd", name: "Postgres account" } }
  };

  addNode(webhookEdit);
  addNode(authCheckEdit);
  addNode(postgresEdit);
  connect(webhookEdit, authCheckEdit);
  connect(authCheckEdit, postgresEdit, 0);

  // 4. DELETE (POST)
  const webhookDel = {
    parameters: {
      httpMethod: "POST",
      path: `bapperida-${entity.name}-delete`,
      responseMode: "lastNode",
      options: {}
    },
    id: getId(),
    name: `Webhook ${entity.name} Delete`,
    type: "n8n-nodes-base.webhook",
    typeVersion: 1,
    position: getPos(0, y + 600)
  };

  const authCheckDel = {
    parameters: {
      conditions: {
        string: [
          {
            value1: "={{$request.headers['x-app-token']}}",
            value2: "BAPPERIDA_SECURE_TOKEN_2026"
          }
        ]
      }
    },
    id: getId(),
    name: `Auth Del ${entity.name}`,
    type: "n8n-nodes-base.if",
    typeVersion: 1,
    position: getPos(200, y + 600)
  };

  const postgresDel = {
    parameters: {
      operation: "delete",
      schema: { __rl: true, value: "public", mode: "list" },
      table: { __rl: true, value: entity.table, mode: "list" },
      deleteKey: "id"
    },
    id: getId(),
    name: `DB ${entity.name} Delete`,
    type: "n8n-nodes-base.postgres",
    typeVersion: 2.6,
    position: getPos(400, y + 550),
    credentials: { postgres: { id: "vYOiyrTftLtD3zzd", name: "Postgres account" } }
  };

  addNode(webhookDel);
  addNode(authCheckDel);
  addNode(postgresDel);
  connect(webhookDel, authCheckDel);
  connect(authCheckDel, postgresDel, 0);

  // Provide a generic 401 Unauthorized node for IF false branches
  const unauthorizedNode = {
    parameters: {
      respondWith: "text",
      responseBody: "Unauthorized",
      options: { responseCode: 401 }
    },
    id: getId(),
    name: `Unauthorized ${entity.name}`,
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1,
    position: getPos(400, y + 750) // placed somewhere neat
  };
  addNode(unauthorizedNode);
  connect(authCheckAdd, unauthorizedNode, 1);
  connect(authCheckEdit, unauthorizedNode, 1);
  connect(authCheckDel, unauthorizedNode, 1);

  yOffset += 1000;
});

const workflow = {
  meta: {
    templateCredsSetupCompleted: true,
    instanceId: "4b55943efb5f219d407bc408d9277d6d643804fc75070b4ed56250fe03c8ea67"
  },
  nodes,
  connections
};

fs.writeFileSync('scratch/workflow.json', JSON.stringify(workflow, null, 2));
console.log('Done');

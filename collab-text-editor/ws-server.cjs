// ws-server.cjs
const http = require('http');
const WebSocket = require('ws');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);

  ws.on('message', (data, isBinary) => {
    if (isBinary) return; // ignore binary frames

    const text = data.toString('utf8');

    // Optionally validate JSON
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }

    // broadcast same text
    clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    });
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`WebSocket server listening on ws://localhost:${PORT}`);
});

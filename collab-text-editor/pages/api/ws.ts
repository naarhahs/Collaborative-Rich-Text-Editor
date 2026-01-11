import type { NextApiRequest, NextApiResponse } from 'next';
import WebSocket, { WebSocketServer as WSWebSocketServer } from 'ws';

const WebSocketServer = (WebSocket as any).Server || WSWebSocketServer;

type NextApiResponseWithSocket = NextApiResponse & {
  socket: any & { server: any & { ws?: any } };
};

const clients = new Set<WebSocket>();

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.ws) {
    res.end();
    return;
  }

  const server = res.socket.server;
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);

    ws.on('message', (data: WebSocket.RawData) => {
      // data can be Buffer, string, ArrayBuffer, etc.
      const text = typeof data === 'string' ? data : data.toString('utf8');

      // optionally validate JSON once here
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        // ignore non-JSON messages
        return;
      }

      // re-broadcast as the same text we received
      clients.forEach((client) => {
        if (client !== ws && (client as any).readyState === (ws as any).OPEN) {
          client.send(text);
        }
      });
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  res.socket.server.ws = wss;
  res.end();
}

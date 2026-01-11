import type { NextApiRequest, NextApiResponse } from 'next';
import { WebSocketServer } from 'ws';

const clients = new Set<any>();

export default function handler(req: NextApiRequest, res: any) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const { socket, head } = res as any;
  if (!socket || !head) {
    res.status(400).end('Not a WebSocket');
    return;
  }

  const wss = new WebSocketServer({ noServer: true });
  wss.handleUpgrade(socket, req as any, head, (ws) => {
    clients.add(ws);
    ws.on('message', (message) => {
      clients.forEach((client) => {
        if (client !== ws && client.readyState === 1) {
          client.send(message.toString());
        }
      });
    });
    ws.on('close', () => clients.delete(ws));
  });
}
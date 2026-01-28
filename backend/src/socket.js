// socket.js - WebSocket server for frontend order display
// This module handles REST API for orders and WebSocket connections for real-time updates

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
// Use centralized database module for concurrency-safe operations
import { getAllOrders, updateOrderStatus } from './database.js';
// Use reliable order broadcaster
import { orderBroadcaster } from './orderBroadcaster.js';

// Create HTTP server with request handler for REST endpoints
export const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /api/orders - Fetch all orders with their items
  if (req.method === 'GET' && req.url === '/api/orders') {
    try {
      // Use centralized database function
      const ordersWithItems = getAllOrders();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ordersWithItems));
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch orders' }));
    }
    return;
  }

  // GET /api/stats - Get server statistics (useful for monitoring)
  if (req.method === 'GET' && req.url === '/api/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connectedClients: orderBroadcaster.getClientCount(),
      queuedOrders: orderBroadcaster.pendingQueue.length,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // PUT /api/orders/:orderNumber/status - Update order status
  if (req.method === 'PUT' && req.url.match(/^\/api\/orders\/[\w-]+\/status$/)) {
    const orderNumber = req.url.split('/')[3];

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { status } = JSON.parse(body);

        // Use centralized database function
        const updated = updateOrderStatus(orderNumber, status);

        if (updated) {
          // Broadcast status update to all clients
          orderBroadcaster.broadcast('order_status_update', {
            orderNumber,
            status,
            updatedAt: new Date().toISOString()
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, orderNumber, status }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Order not found' }));
        }
      } catch (error) {
        console.error('Error updating order:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to update order' }));
      }
    });
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Create WebSocket server
export const wss = new WebSocketServer({ server });

// Use the centralized broadcaster's client management
wss.on('connection', (ws) => {
  console.log('[Socket] Frontend client connected');

  // Register client with broadcaster
  orderBroadcaster.addClient(ws);

  ws.on('message', (data) => {
    const message = data.toString();
    try {
      const parsed = JSON.parse(message);
      handleMessage(ws, parsed);
    } catch {
      ws.send(`Echo: ${message}`);
    }
  });

  ws.on('close', () => {
    // Unregister client from broadcaster
    orderBroadcaster.removeClient(ws);
    console.log('[Socket] Frontend client disconnected');
  });

  ws.on('error', (error) => {
    console.error('[Socket] Client error:', error.message);
    orderBroadcaster.removeClient(ws);
  });

  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected!' }));
});

function handleMessage(ws, data) {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    case 'broadcast':
      orderBroadcaster.broadcast('broadcast', data.payload);
      break;
    case 'get_stats':
      ws.send(JSON.stringify({
        type: 'stats',
        connectedClients: orderBroadcaster.getClientCount(),
        timestamp: Date.now()
      }));
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

// Legacy export for backward compatibility
// This function is now handled by orderBroadcaster
export function broadcastNewOrder(order) {
  return orderBroadcaster.broadcastOrder(order);
}

// Legacy exports for backward compatibility
export const clients = {
  get size() { return orderBroadcaster.getClientCount(); }
};

export function broadcast(type, payload) {
  return orderBroadcaster.broadcast(type, payload);
}

const PORT = process.env.SOCKET_PORT || 8080;

server.listen(PORT, () => {
  console.log(`[Socket] WebSocket server running on ws://localhost:${PORT}`);
  console.log('[Socket] REST API available at http://localhost:' + PORT);
  console.log('[Socket] Waiting for clients to connect...\n');
});

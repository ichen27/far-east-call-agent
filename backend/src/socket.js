// socket.js
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Open database connection for fetching orders
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Open database connection for fetching orders
const db = new Database(join(__dirname, 'fareast.db'));
db.pragma('foreign_keys = ON');

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
      // Fetch all orders
      const orders = db.prepare(`
        SELECT id, order_number, phone_number, status, order_type, total, notes, created_at
        FROM orders
        ORDER BY created_at DESC
      `).all();

      // Fetch items for each order
      const getItems = db.prepare(`
        SELECT item_name, quantity, size, notes as modifications
        FROM order_items
        WHERE order_id = ?
      `);

      const ordersWithItems = orders.map(order => ({
        orderNumber: order.order_number,
        phoneNumber: order.phone_number,
        status: order.status,
        items: getItems.all(order.id).map(item => ({
          name: item.item_name,
          quantity: item.quantity,
          size: item.size || null,
          modifications: item.modifications || ''
        })),
        notes: order.notes || '',
        time: order.created_at,
        total: order.total
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ordersWithItems));
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch orders' }));
    }
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
            
            const updateStmt = db.prepare(`
            UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE order_number = ?
            `);
            
            const result = updateStmt.run(status, orderNumber);
            
            if (result.changes > 0) {
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

export const wss = new WebSocketServer({ server });
export const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);

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
    clients.delete(ws);
    console.log('Client disconnected');
  });

  ws.on('error', console.error);

  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected!' }));
});

function handleMessage(ws, data) {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    case 'broadcast':
      broadcast('broadcast', data.payload);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

// Generic broadcast to all connected clients
export function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Broadcast a new order to all connected clients
 * @param {Object} order - The order data
 * @param {string} order.orderNumber - Unique order ID (e.g., "ORD-20251225-001")
 * @param {string} order.phoneNumber - Customer phone number
 * @param {Array} order.items - Array of order items
 * @param {string} order.items[].name - Item name
 * @param {number} order.items[].quantity - Item quantity
 * @param {string} order.items[].modifications - Special instructions for item
 * @param {string} order.notes - General order notes
 * @param {string} order.time - Order timestamp (ISO string)
 * @param {number} order.total - Order total price
 */
export function broadcastNewOrder(order) {
  const orderData = {
    type: 'new_order',
    payload: {
      orderNumber: order.orderNumber,
      phoneNumber: order.phoneNumber,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        size: item.size || null,
        modifications: item.modifications || ''
      })),
      notes: order.notes || '',
      time: order.time || new Date().toISOString(),
      total: order.total,
      status: order.status
    }
  };

  const message = JSON.stringify(orderData);
  
  let sentCount = 0;
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sentCount++;
    }
  }
  
  console.log(`📡 Order ${order.orderNumber} broadcast to ${sentCount} client(s)`);
  return sentCount;
}


server.listen(8080, () => {
    console.log(`✅ WebSocket server running on ws://localhost:${8080}`);
    console.log('📺 Waiting for clients to connect...\n');
  });
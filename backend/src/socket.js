/**
 * @fileoverview WebSocket server for frontend order display and real-time updates.
 *
 * This module provides:
 * - REST API endpoints for order management (GET orders, PUT status updates)
 * - WebSocket connections for real-time order notifications
 * - Integration with the order broadcaster for reliable message delivery
 *
 * @module socket
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

import {
  getAllOrders,
  updateOrderStatus,
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuCategories,
} from './database.js';
import { orderBroadcaster } from './orderBroadcaster.js';
import config from './config.js';

// ---------------------------------------------------------------------------
// HTTP Server Setup
// ---------------------------------------------------------------------------

/**
 * HTTP server with REST API request handler.
 * Handles order-related API endpoints.
 */
export const server = http.createServer(handleHttpRequest);

/**
 * Handles incoming HTTP requests and routes to appropriate handlers.
 *
 * @param {http.IncomingMessage} req - The HTTP request
 * @param {http.ServerResponse} res - The HTTP response
 */
function handleHttpRequest(req, res) {
  // Set CORS headers for all responses
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route to appropriate handler
  if (req.method === 'GET' && req.url === '/api/orders') {
    handleGetOrders(req, res);
  } else if (req.method === 'GET' && req.url === '/api/stats') {
    handleGetStats(req, res);
  } else if (req.method === 'PUT' && req.url?.match(/^\/api\/orders\/[\w-]+\/status$/)) {
    handleUpdateOrderStatus(req, res);
  }
  // Menu management routes (FAREAST-31)
  else if (req.method === 'GET' && req.url === '/api/menu') {
    handleGetMenuItems(req, res);
  } else if (req.method === 'GET' && req.url === '/api/menu/categories') {
    handleGetMenuCategories(req, res);
  } else if (req.method === 'GET' && req.url?.match(/^\/api\/menu\/\d+$/)) {
    handleGetMenuItem(req, res);
  } else if (req.method === 'POST' && req.url === '/api/menu') {
    handleCreateMenuItem(req, res);
  } else if (req.method === 'PUT' && req.url?.match(/^\/api\/menu\/\d+$/)) {
    handleUpdateMenuItem(req, res);
  } else if (req.method === 'DELETE' && req.url?.match(/^\/api\/menu\/\d+$/)) {
    handleDeleteMenuItem(req, res);
  } else {
    handleNotFound(res);
  }
}

// ---------------------------------------------------------------------------
// HTTP Request Handlers
// ---------------------------------------------------------------------------

/**
 * Sets CORS headers on the response.
 *
 * @param {http.ServerResponse} res - The HTTP response
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Handles GET /api/orders - Fetches all orders with their items.
 *
 * @param {http.IncomingMessage} req - The HTTP request
 * @param {http.ServerResponse} res - The HTTP response
 */
function handleGetOrders(req, res) {
  try {
    const ordersWithItems = getAllOrders();
    sendJsonResponse(res, 200, ordersWithItems);
  } catch (error) {
    console.error('[Socket] Error fetching orders:', error);
    sendJsonResponse(res, 500, { error: 'Failed to fetch orders' });
  }
}

/**
 * Handles GET /api/stats - Returns server statistics for monitoring.
 *
 * @param {http.IncomingMessage} req - The HTTP request
 * @param {http.ServerResponse} res - The HTTP response
 */
function handleGetStats(req, res) {
  sendJsonResponse(res, 200, {
    connectedClients: orderBroadcaster.getClientCount(),
    queuedOrders: orderBroadcaster.pendingQueue.length,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handles PUT /api/orders/:orderNumber/status - Updates an order's status.
 *
 * @param {http.IncomingMessage} req - The HTTP request
 * @param {http.ServerResponse} res - The HTTP response
 */
function handleUpdateOrderStatus(req, res) {
  const orderNumber = req.url.split('/')[3];

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    try {
      const { status } = JSON.parse(body);
      const updated = updateOrderStatus(orderNumber, status);

      if (updated) {
        // Broadcast status update to all connected clients
        orderBroadcaster.broadcast('order_status_update', {
          orderNumber,
          status,
          updatedAt: new Date().toISOString(),
        });

        sendJsonResponse(res, 200, { success: true, orderNumber, status });
      } else {
        sendJsonResponse(res, 404, { error: 'Order not found' });
      }
    } catch (error) {
      console.error('[Socket] Error updating order:', error);
      sendJsonResponse(res, 500, { error: 'Failed to update order' });
    }
  });
}

/**
 * Handles unknown routes with a 404 response.
 *
 * @param {http.ServerResponse} res - The HTTP response
 */
function handleNotFound(res) {
  sendJsonResponse(res, 404, { error: 'Not found' });
}

// ---------------------------------------------------------------------------
// Menu Management Handlers (FAREAST-31)
// ---------------------------------------------------------------------------

/**
 * Handles GET /api/menu - Fetches all menu items.
 *
 * @param {http.IncomingMessage} req - The HTTP request
 * @param {http.ServerResponse} res - The HTTP response
 */
function handleGetMenuItems(req, res) {
  try {
    const items = getAllMenuItems();
    sendJsonResponse(res, 200, items);
  } catch (error) {
    console.error('[Socket] Error fetching menu items:', error);
    sendJsonResponse(res, 500, { error: 'Failed to fetch menu items' });
  }
}

/**
 * Handles GET /api/menu/categories - Fetches all menu categories.
 *
 * @param {http.IncomingMessage} req - The HTTP request
 * @param {http.ServerResponse} res - The HTTP response
 */
function handleGetMenuCategories(req, res) {
  try {
    const categories = getMenuCategories();
    sendJsonResponse(res, 200, categories);
  } catch (error) {
    console.error('[Socket] Error fetching categories:', error);
    sendJsonResponse(res, 500, { error: 'Failed to fetch categories' });
  }
}

/**
 * Handles GET /api/menu/:id - Fetches a single menu item.
 *
 * @param {http.IncomingMessage} req - The HTTP request
 * @param {http.ServerResponse} res - The HTTP response
 */
function handleGetMenuItem(req, res) {
  try {
    const id = parseInt(req.url.split('/')[3], 10);
    const item = getMenuItemById(id);
    if (item) {
      sendJsonResponse(res, 200, item);
    } else {
      sendJsonResponse(res, 404, { error: 'Menu item not found' });
    }
  } catch (error) {
    console.error('[Socket] Error fetching menu item:', error);
    sendJsonResponse(res, 500, { error: 'Failed to fetch menu item' });
  }
}

/**
 * Handles POST /api/menu - Creates a new menu item.
 *
 * @param {http.IncomingMessage} req - The HTTP request
 * @param {http.ServerResponse} res - The HTTP response
 */
function handleCreateMenuItem(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const item = JSON.parse(body);
      if (!item.name || !item.category) {
        sendJsonResponse(res, 400, { error: 'Name and category are required' });
        return;
      }
      const result = createMenuItem(item);
      if (result.success) {
        // Broadcast menu update to all connected clients
        orderBroadcaster.broadcast('menu_updated', { action: 'created', itemId: result.id });
        sendJsonResponse(res, 201, { success: true, id: result.id });
      } else {
        sendJsonResponse(res, 500, { error: result.message });
      }
    } catch (error) {
      console.error('[Socket] Error creating menu item:', error);
      sendJsonResponse(res, 500, { error: 'Failed to create menu item' });
    }
  });
}

/**
 * Handles PUT /api/menu/:id - Updates a menu item.
 *
 * @param {http.IncomingMessage} req - The HTTP request
 * @param {http.ServerResponse} res - The HTTP response
 */
function handleUpdateMenuItem(req, res) {
  const id = parseInt(req.url.split('/')[3], 10);
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const updates = JSON.parse(body);
      const result = updateMenuItem(id, updates);
      if (result.success) {
        // Broadcast menu update to all connected clients
        orderBroadcaster.broadcast('menu_updated', { action: 'updated', itemId: id });
        sendJsonResponse(res, 200, { success: true });
      } else {
        sendJsonResponse(res, 404, { error: result.message });
      }
    } catch (error) {
      console.error('[Socket] Error updating menu item:', error);
      sendJsonResponse(res, 500, { error: 'Failed to update menu item' });
    }
  });
}

/**
 * Handles DELETE /api/menu/:id - Deletes a menu item.
 *
 * @param {http.IncomingMessage} req - The HTTP request
 * @param {http.ServerResponse} res - The HTTP response
 */
function handleDeleteMenuItem(req, res) {
  try {
    const id = parseInt(req.url.split('/')[3], 10);
    const result = deleteMenuItem(id);
    if (result.success) {
      // Broadcast menu update to all connected clients
      orderBroadcaster.broadcast('menu_updated', { action: 'deleted', itemId: id });
      sendJsonResponse(res, 200, { success: true });
    } else {
      sendJsonResponse(res, 404, { error: result.message });
    }
  } catch (error) {
    console.error('[Socket] Error deleting menu item:', error);
    sendJsonResponse(res, 500, { error: 'Failed to delete menu item' });
  }
}

/**
 * Sends a JSON response with the specified status code and data.
 *
 * @param {http.ServerResponse} res - The HTTP response
 * @param {number} statusCode - HTTP status code
 * @param {Object} data - Data to serialize as JSON
 */
function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// WebSocket Server Setup
// ---------------------------------------------------------------------------

/**
 * WebSocket server for real-time frontend updates.
 */
export const wss = new WebSocketServer({ server });

/**
 * Handles new WebSocket connections from frontend clients.
 */
wss.on('connection', (ws) => {
  console.log('[Socket] Frontend client connected');

  // Register client with the broadcaster for order updates
  orderBroadcaster.addClient(ws);

  // Handle incoming messages
  ws.on('message', (data) => {
    const message = data.toString();
    try {
      const parsed = JSON.parse(message);
      handleWebSocketMessage(ws, parsed);
    } catch {
      // Echo non-JSON messages for debugging
      ws.send(`Echo: ${message}`);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    orderBroadcaster.removeClient(ws);
    console.log('[Socket] Frontend client disconnected');
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error('[Socket] Client error:', error.message);
    orderBroadcaster.removeClient(ws);
  });

  // Send welcome message
  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected!' }));
});

/**
 * Handles WebSocket messages from clients.
 *
 * @param {WebSocket} ws - The WebSocket connection
 * @param {Object} data - Parsed message data
 */
function handleWebSocketMessage(ws, data) {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    case 'broadcast':
      orderBroadcaster.broadcast('broadcast', data.payload);
      break;

    case 'get_stats':
      ws.send(
        JSON.stringify({
          type: 'stats',
          connectedClients: orderBroadcaster.getClientCount(),
          timestamp: Date.now(),
        })
      );
      break;

    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

// ---------------------------------------------------------------------------
// Legacy Exports (Backward Compatibility)
// ---------------------------------------------------------------------------

/**
 * Broadcasts a new order to all connected clients.
 * This function delegates to orderBroadcaster for reliable delivery.
 *
 * @param {Object} order - The order to broadcast
 * @returns {Promise<void>}
 * @deprecated Use orderBroadcaster.broadcastOrder() directly
 */
export function broadcastNewOrder(order) {
  return orderBroadcaster.broadcastOrder(order);
}

/**
 * Legacy client count accessor for backward compatibility.
 * @deprecated Use orderBroadcaster.getClientCount() directly
 */
export const clients = {
  get size() {
    return orderBroadcaster.getClientCount();
  },
};

/**
 * Broadcasts a message to all connected clients.
 *
 * @param {string} type - Message type
 * @param {Object} payload - Message payload
 * @returns {void}
 * @deprecated Use orderBroadcaster.broadcast() directly
 */
export function broadcast(type, payload) {
  return orderBroadcaster.broadcast(type, payload);
}

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------

server.listen(config.ports.socket, () => {
  console.log(`[Socket] WebSocket server running on ws://localhost:${config.ports.socket}`);
  console.log(`[Socket] REST API available at http://localhost:${config.ports.socket}`);
  console.log('[Socket] Waiting for clients to connect...\n');
});

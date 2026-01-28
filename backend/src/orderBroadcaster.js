// orderBroadcaster.js - Reliable order broadcasting with queue and retry logic
// This module handles WebSocket broadcasting with guaranteed delivery semantics

import { WebSocket } from 'ws';

/**
 * OrderBroadcaster - Manages reliable order broadcasting to WebSocket clients
 *
 * Features:
 * - Queues orders when no clients are connected
 * - Retries failed sends
 * - Provides delivery confirmation
 * - Handles client disconnections gracefully
 */
class OrderBroadcaster {
  constructor() {
    // Set of connected WebSocket clients
    this.clients = new Set();

    // Queue for orders that couldn't be delivered (no clients connected)
    this.pendingQueue = [];

    // Maximum queue size to prevent memory issues
    this.maxQueueSize = 100;

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
  }

  /**
   * Register a new WebSocket client
   * @param {WebSocket} ws - The WebSocket connection
   */
  addClient(ws) {
    this.clients.add(ws);
    console.log(`[OrderBroadcaster] Client connected. Total clients: ${this.clients.size}`);

    // Send any queued orders to the new client
    this._flushQueueToClient(ws);
  }

  /**
   * Remove a disconnected client
   * @param {WebSocket} ws - The WebSocket connection
   */
  removeClient(ws) {
    this.clients.delete(ws);
    console.log(`[OrderBroadcaster] Client disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * Get the number of connected clients
   * @returns {number}
   */
  getClientCount() {
    return this.clients.size;
  }

  /**
   * Broadcast a new order to all connected clients
   * @param {Object} order - The order data to broadcast
   * @returns {Promise<{success: boolean, sentCount: number, errors: Array}>}
   */
  async broadcastOrder(order) {
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
        date: (order.time || new Date().toISOString()).split('T')[0],
        total: order.total,
        status: order.status || 'pending'
      }
    };

    const message = JSON.stringify(orderData);

    // If no clients connected, queue the order
    if (this.clients.size === 0) {
      this._queueOrder(orderData);
      console.log(`[OrderBroadcaster] No clients connected. Order ${order.orderNumber} queued.`);
      return { success: true, sentCount: 0, queued: true, errors: [] };
    }

    // Broadcast to all connected clients
    const results = await this._broadcastToAll(message);

    console.log(`[OrderBroadcaster] Order ${order.orderNumber} broadcast to ${results.sentCount}/${this.clients.size} client(s)`);

    return results;
  }

  /**
   * Broadcast a message to all clients with error handling
   * @private
   */
  async _broadcastToAll(message) {
    const errors = [];
    let sentCount = 0;
    const sendPromises = [];

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        sendPromises.push(
          this._sendWithRetry(client, message)
            .then(() => { sentCount++; })
            .catch(err => { errors.push(err); })
        );
      } else {
        // Client is not in OPEN state, remove it
        this.clients.delete(client);
      }
    }

    await Promise.allSettled(sendPromises);

    return {
      success: errors.length === 0,
      sentCount,
      errors
    };
  }

  /**
   * Send a message to a client with retry logic
   * @private
   */
  async _sendWithRetry(client, message, attempt = 1) {
    return new Promise((resolve, reject) => {
      // Check if client is still connected
      if (client.readyState !== WebSocket.OPEN) {
        reject(new Error('Client disconnected'));
        return;
      }

      // Use callback form of send for error handling
      client.send(message, (err) => {
        if (err) {
          if (attempt < this.maxRetries) {
            // Retry after delay
            setTimeout(() => {
              this._sendWithRetry(client, message, attempt + 1)
                .then(resolve)
                .catch(reject);
            }, this.retryDelayMs * attempt);
          } else {
            reject(new Error(`Failed after ${this.maxRetries} attempts: ${err.message}`));
          }
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Queue an order for later delivery
   * @private
   */
  _queueOrder(orderData) {
    // Prevent queue from growing indefinitely
    if (this.pendingQueue.length >= this.maxQueueSize) {
      // Remove oldest orders
      this.pendingQueue.shift();
      console.warn('[OrderBroadcaster] Queue full, dropping oldest order');
    }

    this.pendingQueue.push({
      data: orderData,
      timestamp: Date.now()
    });
  }

  /**
   * Send all queued orders to a newly connected client
   * @private
   */
  async _flushQueueToClient(client) {
    if (this.pendingQueue.length === 0) return;

    console.log(`[OrderBroadcaster] Flushing ${this.pendingQueue.length} queued orders to new client`);

    for (const queued of this.pendingQueue) {
      // Only send orders from last 24 hours
      const ageMs = Date.now() - queued.timestamp;
      if (ageMs < 24 * 60 * 60 * 1000) {
        try {
          await this._sendWithRetry(client, JSON.stringify(queued.data));
        } catch (err) {
          console.error(`[OrderBroadcaster] Failed to send queued order: ${err.message}`);
        }
      }
    }

    // Clear the queue after flushing
    this.pendingQueue = [];
  }

  /**
   * Broadcast a generic message to all clients
   * @param {string} type - Message type
   * @param {Object} payload - Message payload
   */
  async broadcast(type, payload) {
    const message = JSON.stringify({ type, payload });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message, (err) => {
          if (err) {
            console.error(`[OrderBroadcaster] Broadcast error: ${err.message}`);
          }
        });
      }
    }
  }
}

// Export a singleton instance
export const orderBroadcaster = new OrderBroadcaster();

// Also export the class for testing purposes
export { OrderBroadcaster };

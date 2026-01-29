/**
 * orderBroadcaster.js - Send orders to Vercel API
 *
 * This module handles sending orders to the Vercel serverless backend
 * which stores them in Postgres and serves them to the frontend.
 */

/**
 * OrderBroadcaster - Sends orders to Vercel API with retry logic
 */
class OrderBroadcaster {
  constructor() {
    // Vercel API URL - configure via environment variable
    this.apiUrl = process.env.VERCEL_API_URL || 'http://localhost:3000';

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
  }

  /**
   * Configure the Vercel API URL
   * @param {string} url - The Vercel API base URL
   */
  setApiUrl(url) {
    this.apiUrl = url;
    console.log(`[OrderBroadcaster] API URL set to: ${url}`);
  }

  /**
   * Send a new order to the Vercel API
   * @param {Object} order - The order data to send
   * @returns {Promise<{success: boolean, orderNumber?: string, error?: string}>}
   */
  async broadcastOrder(order) {
    const orderPayload = {
      phoneNumber: order.phoneNumber,
      total: order.total,
      notes: order.notes || '',
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        size: item.size || null,
        price: item.price || item.unitPrice,
        modifications: item.modifications || ''
      }))
    };

    console.log(`[OrderBroadcaster] Sending order to Vercel API: ${this.apiUrl}/api/orders`);

    try {
      const result = await this._sendWithRetry(orderPayload);
      console.log(`[OrderBroadcaster] Order sent successfully: #${result.orderNumber}`);
      return {
        success: true,
        orderNumber: result.orderNumber
      };
    } catch (error) {
      console.error(`[OrderBroadcaster] Failed to send order:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send order with retry logic
   * @private
   */
  async _sendWithRetry(payload, attempt = 1) {
    try {
      const response = await fetch(`${this.apiUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return {
        orderNumber: data.order?.orderNumber,
        order: data.order
      };
    } catch (error) {
      if (attempt < this.maxRetries) {
        console.log(`[OrderBroadcaster] Retry ${attempt}/${this.maxRetries} after ${this.retryDelayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * attempt));
        return this._sendWithRetry(payload, attempt + 1);
      }
      throw new Error(`Failed after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Health check - verify connection to Vercel API
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.apiUrl}/api/orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export a singleton instance
export const orderBroadcaster = new OrderBroadcaster();

// Also export the class for testing purposes
export { OrderBroadcaster };

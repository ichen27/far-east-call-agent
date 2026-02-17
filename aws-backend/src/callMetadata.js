/**
 * @fileoverview Call Metadata Tracking for Far East Restaurant phone ordering system.
 *
 * Tracks comprehensive call metadata including:
 * - Duration and timestamps
 * - Agent assignments
 * - Call outcomes
 * - Customer information
 * - Performance metrics
 *
 * @module callMetadata
 */

import { CallStates, EndReasons } from './callState.js';

/**
 * Call outcome categories for analytics.
 * @readonly
 * @enum {string}
 */
export const CallOutcomes = {
  ORDER_PLACED: 'order_placed',
  NO_ORDER: 'no_order',
  TRANSFERRED_TO_HUMAN: 'transferred_to_human',
  CUSTOMER_ABANDONED: 'customer_abandoned',
  TECHNICAL_ERROR: 'technical_error',
  TIMEOUT: 'timeout',
};

/**
 * CallMetadata class tracks all relevant information about a call.
 */
export class CallMetadata {
  /**
   * Create a new CallMetadata instance.
   *
   * @param {string} callId - Unique identifier for the call
   * @param {Object} [options={}] - Initial metadata options
   * @param {string} [options.phoneNumber] - Caller's phone number
   * @param {string} [options.agentId] - Assigned agent ID
   * @param {string} [options.source] - Call source (e.g., 'twilio', 'widget')
   */
  constructor(callId, options = {}) {
    if (!callId) {
      throw new Error('callId is required');
    }

    this.callId = callId;

    // Timestamps
    this.timestamps = {
      created: Date.now(),
      queued: null,
      answered: null,
      firstResponse: null,
      ended: null,
    };

    // Duration tracking (in milliseconds)
    this.durations = {
      queueWait: 0,
      ring: 0,
      talk: 0,
      hold: 0,
      total: 0,
    };

    // Call participants
    this.participants = {
      callerId: options.phoneNumber || null,
      callerName: null,
      agentId: options.agentId || null,
      agentName: null,
      transferHistory: [], // Array of agent IDs
    };

    // Call context
    this.context = {
      source: options.source || 'twilio',
      direction: 'inbound',
      priority: 1, // 1 = normal, higher = more urgent
      language: 'en',
      tags: [],
    };

    // Outcome tracking
    this.outcome = {
      status: null, // From CallOutcomes
      orderNumber: null,
      orderTotal: null,
      satisfaction: null, // 1-5 scale if collected
      notes: [],
    };

    // Performance metrics
    this.metrics = {
      messageCount: 0,
      toolCallCount: 0,
      turnCount: 0,
      silentPeriods: 0, // Number of silence detections
      errorCount: 0,
    };

    // Raw data for debugging
    this._rawEvents = [];
  }

  // =========================================================================
  // Timestamp Management
  // =========================================================================

  /**
   * Mark when call entered the queue.
   * @param {number} [timestamp] - Timestamp (defaults to now)
   */
  markQueued(timestamp = Date.now()) {
    this.timestamps.queued = timestamp;
  }

  /**
   * Mark when call was answered.
   * @param {number} [timestamp] - Timestamp (defaults to now)
   */
  markAnswered(timestamp = Date.now()) {
    this.timestamps.answered = timestamp;
    if (this.timestamps.queued) {
      this.durations.queueWait = timestamp - this.timestamps.queued;
    }
    if (this.timestamps.created) {
      this.durations.ring = timestamp - this.timestamps.created;
    }
  }

  /**
   * Mark first agent response time.
   * @param {number} [timestamp] - Timestamp (defaults to now)
   */
  markFirstResponse(timestamp = Date.now()) {
    if (!this.timestamps.firstResponse) {
      this.timestamps.firstResponse = timestamp;
    }
  }

  /**
   * Mark when call ended.
   * @param {number} [timestamp] - Timestamp (defaults to now)
   */
  markEnded(timestamp = Date.now()) {
    this.timestamps.ended = timestamp;
    this.durations.total = timestamp - this.timestamps.created;

    // Calculate talk time (total - queue wait - ring time)
    this.durations.talk = Math.max(
      0,
      this.durations.total - this.durations.queueWait - this.durations.ring - this.durations.hold
    );
  }

  /**
   * Add hold time to the call.
   * @param {number} holdDuration - Duration in milliseconds
   */
  addHoldTime(holdDuration) {
    this.durations.hold += holdDuration;
  }

  // =========================================================================
  // Participant Management
  // =========================================================================

  /**
   * Set caller information.
   * @param {string} phoneNumber - Caller's phone number
   * @param {string} [name] - Caller's name
   */
  setCaller(phoneNumber, name) {
    this.participants.callerId = phoneNumber;
    if (name) {
      this.participants.callerName = name;
    }
  }

  /**
   * Assign an agent to the call.
   * @param {string} agentId - Agent identifier
   * @param {string} [agentName] - Agent name
   */
  assignAgent(agentId, agentName) {
    // Track previous agent in transfer history
    if (this.participants.agentId && this.participants.agentId !== agentId) {
      this.participants.transferHistory.push({
        agentId: this.participants.agentId,
        agentName: this.participants.agentName,
        timestamp: Date.now(),
      });
    }

    this.participants.agentId = agentId;
    this.participants.agentName = agentName || null;
  }

  /**
   * Get the number of transfers that occurred.
   * @returns {number} Number of transfers
   */
  getTransferCount() {
    return this.participants.transferHistory.length;
  }

  // =========================================================================
  // Context Management
  // =========================================================================

  /**
   * Set call priority.
   * @param {number} priority - Priority level (1 = normal, higher = more urgent)
   */
  setPriority(priority) {
    this.context.priority = Math.max(1, Math.min(10, priority)); // Clamp 1-10
  }

  /**
   * Add a tag to the call.
   * @param {string} tag - Tag to add
   */
  addTag(tag) {
    if (!this.context.tags.includes(tag)) {
      this.context.tags.push(tag);
    }
  }

  /**
   * Remove a tag from the call.
   * @param {string} tag - Tag to remove
   */
  removeTag(tag) {
    const index = this.context.tags.indexOf(tag);
    if (index > -1) {
      this.context.tags.splice(index, 1);
    }
  }

  /**
   * Check if call has a tag.
   * @param {string} tag - Tag to check
   * @returns {boolean} True if tag exists
   */
  hasTag(tag) {
    return this.context.tags.includes(tag);
  }

  // =========================================================================
  // Outcome Tracking
  // =========================================================================

  /**
   * Set call outcome status.
   * @param {string} status - Outcome status from CallOutcomes
   */
  setOutcome(status) {
    if (Object.values(CallOutcomes).includes(status)) {
      this.outcome.status = status;
    } else {
      console.warn(`[CallMetadata] Unknown outcome status: ${status}`);
      this.outcome.status = status;
    }
  }

  /**
   * Record order information.
   * @param {string} orderNumber - Order number
   * @param {number} total - Order total
   */
  recordOrder(orderNumber, total) {
    this.outcome.orderNumber = orderNumber;
    this.outcome.orderTotal = total;
    this.outcome.status = CallOutcomes.ORDER_PLACED;
  }

  /**
   * Add a note to the call.
   * @param {string} note - Note text
   */
  addNote(note) {
    this.outcome.notes.push({
      text: note,
      timestamp: Date.now(),
    });
  }

  /**
   * Record customer satisfaction.
   * @param {number} rating - Satisfaction rating (1-5)
   */
  recordSatisfaction(rating) {
    this.outcome.satisfaction = Math.max(1, Math.min(5, rating));
  }

  // =========================================================================
  // Metrics Tracking
  // =========================================================================

  /**
   * Increment message count.
   */
  incrementMessages() {
    this.metrics.messageCount++;
  }

  /**
   * Increment tool call count.
   */
  incrementToolCalls() {
    this.metrics.toolCallCount++;
  }

  /**
   * Increment conversation turn count.
   */
  incrementTurns() {
    this.metrics.turnCount++;
  }

  /**
   * Record a silent period (customer not responding).
   */
  recordSilentPeriod() {
    this.metrics.silentPeriods++;
  }

  /**
   * Record an error.
   */
  recordError() {
    this.metrics.errorCount++;
  }

  // =========================================================================
  // Event Logging
  // =========================================================================

  /**
   * Log a raw event for debugging.
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  logEvent(type, data) {
    this._rawEvents.push({
      type,
      data,
      timestamp: Date.now(),
    });

    // Limit raw events to prevent memory issues
    if (this._rawEvents.length > 1000) {
      this._rawEvents = this._rawEvents.slice(-500);
    }
  }

  // =========================================================================
  // Analytics Helpers
  // =========================================================================

  /**
   * Get average response time (first response after being answered).
   * @returns {number|null} Response time in ms or null if not available
   */
  getFirstResponseTime() {
    if (!this.timestamps.answered || !this.timestamps.firstResponse) {
      return null;
    }
    return this.timestamps.firstResponse - this.timestamps.answered;
  }

  /**
   * Calculate call efficiency score (0-100).
   * Based on talk time, turns, and outcome.
   * @returns {number} Efficiency score
   */
  getEfficiencyScore() {
    let score = 100;

    // Penalize for long queue wait (over 30 seconds)
    if (this.durations.queueWait > 30000) {
      score -= Math.min(20, (this.durations.queueWait - 30000) / 5000);
    }

    // Penalize for too many turns (over 15)
    if (this.metrics.turnCount > 15) {
      score -= Math.min(20, (this.metrics.turnCount - 15) * 2);
    }

    // Penalize for silent periods
    score -= Math.min(15, this.metrics.silentPeriods * 3);

    // Penalize for errors
    score -= Math.min(15, this.metrics.errorCount * 5);

    // Bonus for successful order
    if (this.outcome.status === CallOutcomes.ORDER_PLACED) {
      score += 10;
    }

    // Penalize for no order
    if (this.outcome.status === CallOutcomes.NO_ORDER) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Check if call was successful (order placed).
   * @returns {boolean} True if order was placed
   */
  wasSuccessful() {
    return this.outcome.status === CallOutcomes.ORDER_PLACED;
  }

  // =========================================================================
  // Serialization
  // =========================================================================

  /**
   * Serialize metadata for persistence/analytics.
   * @param {boolean} [includeRawEvents=false] - Whether to include raw events
   * @returns {Object} Serializable metadata object
   */
  toJSON(includeRawEvents = false) {
    const data = {
      callId: this.callId,
      timestamps: { ...this.timestamps },
      durations: { ...this.durations },
      participants: {
        ...this.participants,
        transferHistory: [...this.participants.transferHistory],
      },
      context: {
        ...this.context,
        tags: [...this.context.tags],
      },
      outcome: {
        ...this.outcome,
        notes: [...this.outcome.notes],
      },
      metrics: { ...this.metrics },
      analytics: {
        firstResponseTime: this.getFirstResponseTime(),
        efficiencyScore: this.getEfficiencyScore(),
        transferCount: this.getTransferCount(),
        wasSuccessful: this.wasSuccessful(),
      },
    };

    if (includeRawEvents) {
      data.rawEvents = [...this._rawEvents];
    }

    return data;
  }

  /**
   * Create CallMetadata from serialized data.
   * @param {Object} data - Serialized metadata
   * @returns {CallMetadata} Restored CallMetadata instance
   */
  static fromJSON(data) {
    const metadata = new CallMetadata(data.callId);

    // Restore all fields
    metadata.timestamps = { ...data.timestamps };
    metadata.durations = { ...data.durations };
    metadata.participants = {
      ...data.participants,
      transferHistory: [...(data.participants.transferHistory || [])],
    };
    metadata.context = {
      ...data.context,
      tags: [...(data.context.tags || [])],
    };
    metadata.outcome = {
      ...data.outcome,
      notes: [...(data.outcome.notes || [])],
    };
    metadata.metrics = { ...data.metrics };

    if (data.rawEvents) {
      metadata._rawEvents = [...data.rawEvents];
    }

    return metadata;
  }
}

export default CallMetadata;

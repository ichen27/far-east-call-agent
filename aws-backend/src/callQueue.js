/**
 * @fileoverview Call Queue Management System for Far East Restaurant phone ordering.
 *
 * Implements a priority queue with FIFO ordering within priority levels.
 * Supports:
 * - Multiple priority levels (1-10, higher = more urgent)
 * - FIFO ordering within same priority
 * - Queue position tracking
 * - Estimated wait times
 * - Queue size limits
 * - Event emission for queue changes
 *
 * @module callQueue
 */

import { EventEmitter } from 'events';
import { CallMetadata, CallOutcomes } from './callMetadata.js';

/**
 * Default queue configuration.
 */
const DEFAULT_CONFIG = {
  maxQueueSize: 50,           // Maximum calls in queue
  defaultPriority: 1,          // Default priority for new calls
  estimatedHandleTime: 180000, // 3 minutes average per call
  maxWaitTime: 600000,         // 10 minutes max wait
  abandonedThreshold: 120000,  // 2 minutes before considering abandoned check
};

/**
 * Queue item wrapper that includes priority and timing information.
 */
class QueueItem {
  /**
   * Create a new QueueItem.
   * @param {string} callId - Call identifier
   * @param {number} priority - Priority level (1-10)
   * @param {CallMetadata} [metadata] - Call metadata
   */
  constructor(callId, priority, metadata) {
    this.callId = callId;
    this.priority = priority;
    this.enqueuedAt = Date.now();
    this.metadata = metadata || null;
    this.positionHistory = []; // Track position changes
  }

  /**
   * Get time in queue.
   * @returns {number} Time in milliseconds
   */
  getWaitTime() {
    return Date.now() - this.enqueuedAt;
  }

  /**
   * Record current position in queue.
   * @param {number} position - Current position
   */
  recordPosition(position) {
    this.positionHistory.push({
      position,
      timestamp: Date.now(),
    });
  }
}

/**
 * CallQueue implements a priority-based FIFO queue for managing incoming calls.
 */
export class CallQueue extends EventEmitter {
  /**
   * Create a new CallQueue instance.
   * @param {Object} [config={}] - Configuration options
   * @param {number} [config.maxQueueSize] - Maximum queue size
   * @param {number} [config.defaultPriority] - Default priority (1-10)
   * @param {number} [config.estimatedHandleTime] - Average call handle time (ms)
   * @param {number} [config.maxWaitTime] - Maximum wait time before escalation (ms)
   */
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Priority buckets: Map<priority, QueueItem[]>
    this._buckets = new Map();
    for (let i = 1; i <= 10; i++) {
      this._buckets.set(i, []);
    }

    // Quick lookup by callId
    this._callIndex = new Map();

    // Statistics
    this._stats = {
      totalEnqueued: 0,
      totalDequeued: 0,
      totalAbandoned: 0,
      peakSize: 0,
      totalWaitTime: 0,
    };

    // Active agents (for wait time estimation)
    this._activeAgents = 0;
  }

  // =========================================================================
  // Queue Operations
  // =========================================================================

  /**
   * Add a call to the queue.
   *
   * @param {string} callId - Unique call identifier
   * @param {Object} [options={}] - Enqueue options
   * @param {number} [options.priority] - Priority level (1-10)
   * @param {CallMetadata} [options.metadata] - Call metadata
   * @returns {Object} Result with position and estimated wait time
   * @throws {Error} If queue is full or call already exists
   */
  enqueue(callId, options = {}) {
    if (!callId) {
      throw new Error('callId is required');
    }

    if (this._callIndex.has(callId)) {
      throw new Error(`Call ${callId} is already in queue`);
    }

    if (this.size >= this.config.maxQueueSize) {
      throw new Error('Queue is full');
    }

    const priority = Math.max(1, Math.min(10, options.priority || this.config.defaultPriority));
    const item = new QueueItem(callId, priority, options.metadata);

    // Add to appropriate priority bucket
    this._buckets.get(priority).push(item);
    this._callIndex.set(callId, item);

    // Update stats
    this._stats.totalEnqueued++;
    this._stats.peakSize = Math.max(this._stats.peakSize, this.size);

    // Mark metadata as queued
    if (item.metadata) {
      item.metadata.markQueued();
    }

    // Calculate position and ETA
    const position = this.getPosition(callId);
    const estimatedWait = this.getEstimatedWaitTime(callId);

    // Record initial position
    item.recordPosition(position);

    this.emit('enqueued', {
      callId,
      priority,
      position,
      estimatedWait,
      queueSize: this.size,
      timestamp: Date.now(),
    });

    return { position, estimatedWait, priority };
  }

  /**
   * Remove and return the next call from the queue.
   * Returns the highest priority call that has waited the longest.
   *
   * @returns {QueueItem|null} Next queue item or null if empty
   */
  dequeue() {
    // Check priority buckets from highest to lowest
    for (let priority = 10; priority >= 1; priority--) {
      const bucket = this._buckets.get(priority);
      if (bucket.length > 0) {
        const item = bucket.shift();
        this._callIndex.delete(item.callId);

        // Update stats
        this._stats.totalDequeued++;
        this._stats.totalWaitTime += item.getWaitTime();

        // Mark metadata as answered
        if (item.metadata) {
          item.metadata.markAnswered();
        }

        this.emit('dequeued', {
          callId: item.callId,
          priority: item.priority,
          waitTime: item.getWaitTime(),
          queueSize: this.size,
          timestamp: Date.now(),
        });

        // Update positions for remaining items
        this._updatePositions();

        return item;
      }
    }

    return null;
  }

  /**
   * Remove a specific call from the queue (e.g., customer hung up).
   *
   * @param {string} callId - Call to remove
   * @param {string} [reason='removed'] - Reason for removal
   * @returns {QueueItem|null} Removed item or null if not found
   */
  remove(callId, reason = 'removed') {
    const item = this._callIndex.get(callId);
    if (!item) {
      return null;
    }

    // Find and remove from bucket
    const bucket = this._buckets.get(item.priority);
    const index = bucket.findIndex((i) => i.callId === callId);
    if (index > -1) {
      bucket.splice(index, 1);
    }

    this._callIndex.delete(callId);

    // Update stats
    if (reason === 'abandoned') {
      this._stats.totalAbandoned++;
      if (item.metadata) {
        item.metadata.setOutcome(CallOutcomes.CUSTOMER_ABANDONED);
      }
    }

    this.emit('removed', {
      callId,
      priority: item.priority,
      reason,
      waitTime: item.getWaitTime(),
      queueSize: this.size,
      timestamp: Date.now(),
    });

    // Update positions for remaining items
    this._updatePositions();

    return item;
  }

  /**
   * Peek at the next call without removing it.
   * @returns {QueueItem|null} Next queue item or null if empty
   */
  peek() {
    for (let priority = 10; priority >= 1; priority--) {
      const bucket = this._buckets.get(priority);
      if (bucket.length > 0) {
        return bucket[0];
      }
    }
    return null;
  }

  /**
   * Get a specific call from the queue.
   * @param {string} callId - Call identifier
   * @returns {QueueItem|null} Queue item or null if not found
   */
  get(callId) {
    return this._callIndex.get(callId) || null;
  }

  /**
   * Check if a call is in the queue.
   * @param {string} callId - Call identifier
   * @returns {boolean} True if in queue
   */
  has(callId) {
    return this._callIndex.has(callId);
  }

  /**
   * Clear all calls from the queue.
   * @param {string} [reason='cleared'] - Reason for clearing
   */
  clear(reason = 'cleared') {
    const items = [...this._callIndex.values()];

    for (let i = 1; i <= 10; i++) {
      this._buckets.set(i, []);
    }
    this._callIndex.clear();

    this.emit('cleared', {
      count: items.length,
      reason,
      timestamp: Date.now(),
    });
  }

  // =========================================================================
  // Priority Management
  // =========================================================================

  /**
   * Update the priority of a queued call.
   *
   * @param {string} callId - Call to update
   * @param {number} newPriority - New priority level (1-10)
   * @returns {boolean} True if updated
   */
  updatePriority(callId, newPriority) {
    const item = this._callIndex.get(callId);
    if (!item) {
      return false;
    }

    const clampedPriority = Math.max(1, Math.min(10, newPriority));
    if (clampedPriority === item.priority) {
      return true; // No change needed
    }

    // Remove from old bucket
    const oldBucket = this._buckets.get(item.priority);
    const index = oldBucket.findIndex((i) => i.callId === callId);
    if (index > -1) {
      oldBucket.splice(index, 1);
    }

    // Add to new bucket (at end to maintain FIFO within priority)
    const oldPriority = item.priority;
    item.priority = clampedPriority;
    this._buckets.get(clampedPriority).push(item);

    this.emit('priorityChanged', {
      callId,
      oldPriority,
      newPriority: clampedPriority,
      newPosition: this.getPosition(callId),
      timestamp: Date.now(),
    });

    // Update positions for all items
    this._updatePositions();

    return true;
  }

  /**
   * Escalate priority based on wait time.
   * Calls waiting longer than threshold get priority boost.
   *
   * @param {number} [waitThreshold] - Wait time threshold in ms
   * @param {number} [priorityBoost=1] - How much to increase priority
   */
  escalateByWaitTime(waitThreshold = this.config.maxWaitTime, priorityBoost = 1) {
    const now = Date.now();
    const escalated = [];

    for (const [callId, item] of this._callIndex) {
      if (item.getWaitTime() > waitThreshold && item.priority < 10) {
        this.updatePriority(callId, item.priority + priorityBoost);
        escalated.push(callId);
      }
    }

    if (escalated.length > 0) {
      this.emit('escalated', {
        calls: escalated,
        count: escalated.length,
        timestamp: now,
      });
    }

    return escalated;
  }

  // =========================================================================
  // Position and Wait Time
  // =========================================================================

  /**
   * Get the queue position of a call.
   * Position 1 means the call is next.
   *
   * @param {string} callId - Call to check
   * @returns {number} Position (1-based) or -1 if not found
   */
  getPosition(callId) {
    const item = this._callIndex.get(callId);
    if (!item) {
      return -1;
    }

    let position = 0;

    // Count all items with higher priority
    for (let p = 10; p > item.priority; p--) {
      position += this._buckets.get(p).length;
    }

    // Count items at same priority that were enqueued earlier
    const samePriorityBucket = this._buckets.get(item.priority);
    for (const other of samePriorityBucket) {
      if (other.callId === callId) break;
      position++;
    }

    return position + 1; // 1-based position
  }

  /**
   * Get estimated wait time for a call.
   *
   * @param {string} callId - Call to check
   * @returns {number} Estimated wait in milliseconds
   */
  getEstimatedWaitTime(callId) {
    const position = this.getPosition(callId);
    if (position === -1) {
      return -1;
    }

    // If no agents, return high estimate
    if (this._activeAgents === 0) {
      return position * this.config.estimatedHandleTime;
    }

    // Account for concurrent agents
    return Math.ceil(position / this._activeAgents) * this.config.estimatedHandleTime;
  }

  /**
   * Update positions for all items and emit events for position changes.
   * @private
   */
  _updatePositions() {
    let position = 1;
    for (let priority = 10; priority >= 1; priority--) {
      for (const item of this._buckets.get(priority)) {
        const lastRecorded = item.positionHistory.length > 0
          ? item.positionHistory[item.positionHistory.length - 1].position
          : -1;

        if (lastRecorded !== position) {
          item.recordPosition(position);
          this.emit('positionChanged', {
            callId: item.callId,
            oldPosition: lastRecorded,
            newPosition: position,
            timestamp: Date.now(),
          });
        }
        position++;
      }
    }
  }

  // =========================================================================
  // Agent Management
  // =========================================================================

  /**
   * Update the number of active agents (for wait time estimation).
   * @param {number} count - Number of active agents
   */
  setActiveAgents(count) {
    this._activeAgents = Math.max(0, count);
  }

  /**
   * Get the number of active agents.
   * @returns {number} Active agent count
   */
  getActiveAgents() {
    return this._activeAgents;
  }

  // =========================================================================
  // Queue Properties
  // =========================================================================

  /**
   * Get current queue size.
   * @returns {number} Number of items in queue
   */
  get size() {
    return this._callIndex.size;
  }

  /**
   * Check if queue is empty.
   * @returns {boolean} True if empty
   */
  get isEmpty() {
    return this.size === 0;
  }

  /**
   * Check if queue is full.
   * @returns {boolean} True if at capacity
   */
  get isFull() {
    return this.size >= this.config.maxQueueSize;
  }

  /**
   * Get all calls in priority order.
   * @returns {Array<QueueItem>} Ordered array of queue items
   */
  getAll() {
    const items = [];
    for (let priority = 10; priority >= 1; priority--) {
      items.push(...this._buckets.get(priority));
    }
    return items;
  }

  /**
   * Get calls by priority level.
   * @param {number} priority - Priority level
   * @returns {Array<QueueItem>} Items at that priority
   */
  getByPriority(priority) {
    return [...(this._buckets.get(priority) || [])];
  }

  // =========================================================================
  // Statistics
  // =========================================================================

  /**
   * Get queue statistics.
   * @returns {Object} Queue stats
   */
  getStats() {
    const avgWaitTime = this._stats.totalDequeued > 0
      ? this._stats.totalWaitTime / this._stats.totalDequeued
      : 0;

    // Calculate current wait times
    let currentTotalWait = 0;
    let longestWait = 0;
    for (const item of this._callIndex.values()) {
      const wait = item.getWaitTime();
      currentTotalWait += wait;
      longestWait = Math.max(longestWait, wait);
    }

    return {
      currentSize: this.size,
      peakSize: this._stats.peakSize,
      totalEnqueued: this._stats.totalEnqueued,
      totalDequeued: this._stats.totalDequeued,
      totalAbandoned: this._stats.totalAbandoned,
      abandonRate: this._stats.totalEnqueued > 0
        ? (this._stats.totalAbandoned / this._stats.totalEnqueued * 100).toFixed(2)
        : 0,
      avgWaitTime: Math.round(avgWaitTime),
      currentAvgWait: this.size > 0 ? Math.round(currentTotalWait / this.size) : 0,
      longestCurrentWait: longestWait,
      activeAgents: this._activeAgents,
      priorityDistribution: this._getPriorityDistribution(),
    };
  }

  /**
   * Get distribution of calls across priority levels.
   * @returns {Object} Map of priority to count
   * @private
   */
  _getPriorityDistribution() {
    const dist = {};
    for (let i = 1; i <= 10; i++) {
      const count = this._buckets.get(i).length;
      if (count > 0) {
        dist[i] = count;
      }
    }
    return dist;
  }

  /**
   * Reset statistics.
   */
  resetStats() {
    this._stats = {
      totalEnqueued: 0,
      totalDequeued: 0,
      totalAbandoned: 0,
      peakSize: this.size,
      totalWaitTime: 0,
    };
  }

  // =========================================================================
  // Serialization
  // =========================================================================

  /**
   * Serialize queue state.
   * @returns {Object} Serializable queue state
   */
  toJSON() {
    return {
      config: { ...this.config },
      items: this.getAll().map((item) => ({
        callId: item.callId,
        priority: item.priority,
        enqueuedAt: item.enqueuedAt,
        positionHistory: item.positionHistory,
        metadata: item.metadata ? item.metadata.toJSON() : null,
      })),
      stats: this.getStats(),
      activeAgents: this._activeAgents,
    };
  }
}

export default CallQueue;

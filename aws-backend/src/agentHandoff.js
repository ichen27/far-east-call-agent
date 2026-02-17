/**
 * @fileoverview Agent Handoff Logic for Far East Restaurant phone ordering system.
 *
 * Manages the transfer of calls between agents (AI or human).
 * Supports:
 * - Direct transfers to specific agents
 * - Skill-based routing (e.g., language, expertise)
 * - Warm transfers (with context handoff)
 * - Cold transfers (immediate transfer)
 * - Transfer queues when target agents are busy
 *
 * @module agentHandoff
 */

import { EventEmitter } from 'events';
import { CallStates } from './callState.js';

/**
 * Agent status values.
 * @readonly
 * @enum {string}
 */
export const AgentStatus = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  AWAY: 'away',
  OFFLINE: 'offline',
};

/**
 * Transfer types.
 * @readonly
 * @enum {string}
 */
export const TransferType = {
  COLD: 'cold',     // Immediate transfer, no context
  WARM: 'warm',     // Transfer with context/conversation
  BLIND: 'blind',   // Transfer without waiting for answer
};

/**
 * Transfer result statuses.
 * @readonly
 * @enum {string}
 */
export const TransferResult = {
  SUCCESS: 'success',
  FAILED: 'failed',
  NO_ANSWER: 'no_answer',
  BUSY: 'busy',
  REJECTED: 'rejected',
  TIMEOUT: 'timeout',
};

/**
 * Agent representation for the handoff system.
 */
export class Agent {
  /**
   * Create a new Agent.
   *
   * @param {string} id - Unique agent identifier
   * @param {Object} [options={}] - Agent options
   * @param {string} [options.name] - Agent display name
   * @param {string} [options.type] - Agent type ('ai' or 'human')
   * @param {Array<string>} [options.skills] - Agent skills
   * @param {number} [options.maxConcurrentCalls] - Max concurrent calls
   */
  constructor(id, options = {}) {
    if (!id) {
      throw new Error('Agent id is required');
    }

    this.id = id;
    this.name = options.name || `Agent ${id}`;
    this.type = options.type || 'ai';
    this.skills = options.skills || [];
    this.maxConcurrentCalls = options.maxConcurrentCalls || (this.type === 'ai' ? 50 : 1);

    this._status = AgentStatus.AVAILABLE;
    this._activeCalls = new Set();
    this._stats = {
      totalCalls: 0,
      totalTransfersIn: 0,
      totalTransfersOut: 0,
      totalTalkTime: 0,
    };
  }

  /**
   * Get agent status.
   * @returns {string} Current status
   */
  get status() {
    // Auto-calculate status based on call load
    if (this._status === AgentStatus.OFFLINE || this._status === AgentStatus.AWAY) {
      return this._status;
    }
    if (this._activeCalls.size >= this.maxConcurrentCalls) {
      return AgentStatus.BUSY;
    }
    return AgentStatus.AVAILABLE;
  }

  /**
   * Set agent status manually.
   * @param {string} status - New status
   */
  set status(status) {
    if (Object.values(AgentStatus).includes(status)) {
      this._status = status;
    }
  }

  /**
   * Get current call count.
   * @returns {number} Number of active calls
   */
  get callCount() {
    return this._activeCalls.size;
  }

  /**
   * Check if agent can accept a new call.
   * @returns {boolean} True if can accept
   */
  canAcceptCall() {
    return this.status === AgentStatus.AVAILABLE;
  }

  /**
   * Check if agent has a specific skill.
   * @param {string} skill - Skill to check
   * @returns {boolean} True if has skill
   */
  hasSkill(skill) {
    return this.skills.includes(skill);
  }

  /**
   * Assign a call to this agent.
   * @param {string} callId - Call to assign
   * @returns {boolean} True if assigned
   */
  assignCall(callId) {
    if (!this.canAcceptCall()) {
      return false;
    }
    this._activeCalls.add(callId);
    this._stats.totalCalls++;
    return true;
  }

  /**
   * Remove a call from this agent.
   * @param {string} callId - Call to remove
   * @returns {boolean} True if removed
   */
  removeCall(callId) {
    return this._activeCalls.delete(callId);
  }

  /**
   * Check if agent has a specific call.
   * @param {string} callId - Call to check
   * @returns {boolean} True if has call
   */
  hasCall(callId) {
    return this._activeCalls.has(callId);
  }

  /**
   * Get all active calls.
   * @returns {Array<string>} Array of call IDs
   */
  getActiveCalls() {
    return [...this._activeCalls];
  }

  /**
   * Record transfer in.
   */
  recordTransferIn() {
    this._stats.totalTransfersIn++;
  }

  /**
   * Record transfer out.
   */
  recordTransferOut() {
    this._stats.totalTransfersOut++;
  }

  /**
   * Add talk time to stats.
   * @param {number} duration - Duration in ms
   */
  addTalkTime(duration) {
    this._stats.totalTalkTime += duration;
  }

  /**
   * Get agent statistics.
   * @returns {Object} Agent stats
   */
  getStats() {
    return {
      ...this._stats,
      activeCalls: this.callCount,
      utilizationRate: this.maxConcurrentCalls > 0
        ? (this.callCount / this.maxConcurrentCalls * 100).toFixed(1)
        : 0,
    };
  }

  /**
   * Serialize agent for persistence.
   * @returns {Object} Serializable agent data
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      skills: [...this.skills],
      status: this.status,
      maxConcurrentCalls: this.maxConcurrentCalls,
      activeCalls: [...this._activeCalls],
      stats: this.getStats(),
    };
  }
}

/**
 * Transfer request object.
 */
export class TransferRequest {
  /**
   * Create a new TransferRequest.
   *
   * @param {string} callId - Call to transfer
   * @param {string} fromAgentId - Source agent
   * @param {Object} [options={}] - Transfer options
   * @param {string} [options.toAgentId] - Target agent (for direct transfer)
   * @param {string} [options.skill] - Required skill (for skill-based routing)
   * @param {string} [options.type] - Transfer type (cold/warm/blind)
   * @param {Object} [options.context] - Context to pass to new agent
   * @param {string} [options.reason] - Reason for transfer
   * @param {number} [options.timeout] - Timeout in ms
   */
  constructor(callId, fromAgentId, options = {}) {
    this.id = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.callId = callId;
    this.fromAgentId = fromAgentId;
    this.toAgentId = options.toAgentId || null;
    this.requiredSkill = options.skill || null;
    this.type = options.type || TransferType.COLD;
    this.context = options.context || {};
    this.reason = options.reason || 'transfer requested';
    this.timeout = options.timeout || 30000;

    this.createdAt = Date.now();
    this.status = 'pending';
    this.result = null;
    this.actualToAgentId = null;
  }

  /**
   * Check if transfer has timed out.
   * @returns {boolean} True if timed out
   */
  isTimedOut() {
    return Date.now() - this.createdAt > this.timeout;
  }

  /**
   * Mark transfer as completed.
   * @param {string} result - Transfer result
   * @param {string} [toAgentId] - Actual target agent
   */
  complete(result, toAgentId) {
    this.status = 'completed';
    this.result = result;
    this.actualToAgentId = toAgentId || null;
    this.completedAt = Date.now();
  }

  /**
   * Serialize transfer request.
   * @returns {Object} Serializable transfer data
   */
  toJSON() {
    return {
      id: this.id,
      callId: this.callId,
      fromAgentId: this.fromAgentId,
      toAgentId: this.toAgentId,
      actualToAgentId: this.actualToAgentId,
      requiredSkill: this.requiredSkill,
      type: this.type,
      reason: this.reason,
      status: this.status,
      result: this.result,
      createdAt: this.createdAt,
      completedAt: this.completedAt || null,
      duration: this.completedAt ? this.completedAt - this.createdAt : null,
    };
  }
}

/**
 * AgentHandoff manages transfers between agents.
 */
export class AgentHandoff extends EventEmitter {
  /**
   * Create a new AgentHandoff instance.
   *
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.defaultTimeout] - Default transfer timeout (ms)
   * @param {number} [options.maxPendingTransfers] - Max pending transfers per agent
   */
  constructor(options = {}) {
    super();

    this.config = {
      defaultTimeout: options.defaultTimeout || 30000,
      maxPendingTransfers: options.maxPendingTransfers || 10,
    };

    // Agent registry
    this._agents = new Map();

    // Pending transfer requests
    this._pendingTransfers = new Map();

    // Transfer history
    this._transferHistory = [];

    // Call-to-agent mapping
    this._callAssignments = new Map();
  }

  // =========================================================================
  // Agent Management
  // =========================================================================

  /**
   * Register an agent.
   *
   * @param {Agent|Object} agent - Agent instance or options
   * @returns {Agent} Registered agent
   */
  registerAgent(agent) {
    const agentInstance = agent instanceof Agent
      ? agent
      : new Agent(agent.id, agent);

    this._agents.set(agentInstance.id, agentInstance);

    this.emit('agentRegistered', {
      agentId: agentInstance.id,
      agent: agentInstance.toJSON(),
      timestamp: Date.now(),
    });

    return agentInstance;
  }

  /**
   * Unregister an agent.
   *
   * @param {string} agentId - Agent to unregister
   * @returns {boolean} True if unregistered
   */
  unregisterAgent(agentId) {
    const agent = this._agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Check for active calls
    if (agent.callCount > 0) {
      throw new Error(`Cannot unregister agent ${agentId} with active calls`);
    }

    this._agents.delete(agentId);

    this.emit('agentUnregistered', {
      agentId,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Get an agent by ID.
   * @param {string} agentId - Agent ID
   * @returns {Agent|null} Agent or null
   */
  getAgent(agentId) {
    return this._agents.get(agentId) || null;
  }

  /**
   * Get all registered agents.
   * @returns {Array<Agent>} Array of agents
   */
  getAllAgents() {
    return [...this._agents.values()];
  }

  /**
   * Get available agents.
   * @returns {Array<Agent>} Available agents
   */
  getAvailableAgents() {
    return [...this._agents.values()].filter((a) => a.canAcceptCall());
  }

  /**
   * Get agents with a specific skill.
   * @param {string} skill - Required skill
   * @returns {Array<Agent>} Agents with skill
   */
  getAgentsBySkill(skill) {
    return [...this._agents.values()].filter((a) => a.hasSkill(skill));
  }

  /**
   * Update agent status.
   * @param {string} agentId - Agent ID
   * @param {string} status - New status
   * @returns {boolean} True if updated
   */
  updateAgentStatus(agentId, status) {
    const agent = this._agents.get(agentId);
    if (!agent) {
      return false;
    }

    const oldStatus = agent.status;
    agent.status = status;

    this.emit('agentStatusChanged', {
      agentId,
      oldStatus,
      newStatus: agent.status,
      timestamp: Date.now(),
    });

    return true;
  }

  // =========================================================================
  // Call Assignment
  // =========================================================================

  /**
   * Assign a call to an agent.
   *
   * @param {string} callId - Call to assign
   * @param {string} agentId - Target agent
   * @returns {boolean} True if assigned
   */
  assignCall(callId, agentId) {
    const agent = this._agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.assignCall(callId)) {
      return false;
    }

    this._callAssignments.set(callId, agentId);

    this.emit('callAssigned', {
      callId,
      agentId,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Unassign a call from its agent.
   * @param {string} callId - Call to unassign
   * @returns {boolean} True if unassigned
   */
  unassignCall(callId) {
    const agentId = this._callAssignments.get(callId);
    if (!agentId) {
      return false;
    }

    const agent = this._agents.get(agentId);
    if (agent) {
      agent.removeCall(callId);
    }

    this._callAssignments.delete(callId);

    this.emit('callUnassigned', {
      callId,
      agentId,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Get the agent assigned to a call.
   * @param {string} callId - Call ID
   * @returns {string|null} Agent ID or null
   */
  getAssignedAgent(callId) {
    return this._callAssignments.get(callId) || null;
  }

  // =========================================================================
  // Transfer Operations
  // =========================================================================

  /**
   * Find the best available agent for a transfer.
   *
   * @param {TransferRequest} request - Transfer request
   * @returns {Agent|null} Best matching agent or null
   */
  findBestAgent(request) {
    // If specific agent requested, check if available
    if (request.toAgentId) {
      const agent = this._agents.get(request.toAgentId);
      if (agent && agent.canAcceptCall()) {
        return agent;
      }
      return null;
    }

    // Find by skill
    let candidates = this.getAvailableAgents();

    if (request.requiredSkill) {
      candidates = candidates.filter((a) => a.hasSkill(request.requiredSkill));
    }

    // Exclude source agent
    candidates = candidates.filter((a) => a.id !== request.fromAgentId);

    if (candidates.length === 0) {
      return null;
    }

    // Sort by load (prefer less busy agents)
    candidates.sort((a, b) => {
      const aUtil = a.callCount / a.maxConcurrentCalls;
      const bUtil = b.callCount / b.maxConcurrentCalls;
      return aUtil - bUtil;
    });

    return candidates[0];
  }

  /**
   * Initiate a transfer request.
   *
   * @param {string} callId - Call to transfer
   * @param {string} fromAgentId - Source agent
   * @param {Object} [options={}] - Transfer options
   * @returns {TransferRequest} Transfer request object
   */
  initiateTransfer(callId, fromAgentId, options = {}) {
    // Validate source agent owns the call
    const currentAgent = this._callAssignments.get(callId);
    if (currentAgent !== fromAgentId) {
      throw new Error(`Agent ${fromAgentId} does not own call ${callId}`);
    }

    const request = new TransferRequest(callId, fromAgentId, {
      ...options,
      timeout: options.timeout || this.config.defaultTimeout,
    });

    this._pendingTransfers.set(request.id, request);

    this.emit('transferInitiated', {
      request: request.toJSON(),
      timestamp: Date.now(),
    });

    return request;
  }

  /**
   * Execute a transfer.
   *
   * @param {TransferRequest|string} requestOrId - Transfer request or ID
   * @returns {Object} Transfer result
   */
  async executeTransfer(requestOrId) {
    const request = typeof requestOrId === 'string'
      ? this._pendingTransfers.get(requestOrId)
      : requestOrId;

    if (!request) {
      throw new Error('Transfer request not found');
    }

    // Check for timeout
    if (request.isTimedOut()) {
      request.complete(TransferResult.TIMEOUT);
      this._pendingTransfers.delete(request.id);

      this.emit('transferFailed', {
        request: request.toJSON(),
        reason: 'timeout',
        timestamp: Date.now(),
      });

      return { success: false, result: TransferResult.TIMEOUT };
    }

    // Find target agent
    const targetAgent = this.findBestAgent(request);

    if (!targetAgent) {
      request.complete(TransferResult.BUSY);
      this._pendingTransfers.delete(request.id);

      this.emit('transferFailed', {
        request: request.toJSON(),
        reason: 'no available agent',
        timestamp: Date.now(),
      });

      return { success: false, result: TransferResult.BUSY };
    }

    // Perform transfer
    const sourceAgent = this._agents.get(request.fromAgentId);

    // Remove from source
    if (sourceAgent) {
      sourceAgent.removeCall(request.callId);
      sourceAgent.recordTransferOut();
    }

    // Add to target
    targetAgent.assignCall(request.callId);
    targetAgent.recordTransferIn();

    // Update assignment
    this._callAssignments.set(request.callId, targetAgent.id);

    // Complete request
    request.complete(TransferResult.SUCCESS, targetAgent.id);
    this._pendingTransfers.delete(request.id);
    this._transferHistory.push(request);

    // Limit history size
    if (this._transferHistory.length > 1000) {
      this._transferHistory = this._transferHistory.slice(-500);
    }

    this.emit('transferCompleted', {
      request: request.toJSON(),
      fromAgent: sourceAgent ? sourceAgent.toJSON() : null,
      toAgent: targetAgent.toJSON(),
      timestamp: Date.now(),
    });

    return {
      success: true,
      result: TransferResult.SUCCESS,
      toAgentId: targetAgent.id,
      context: request.context,
    };
  }

  /**
   * Cancel a pending transfer.
   * @param {string} requestId - Transfer request ID
   * @returns {boolean} True if cancelled
   */
  cancelTransfer(requestId) {
    const request = this._pendingTransfers.get(requestId);
    if (!request) {
      return false;
    }

    request.complete(TransferResult.REJECTED);
    this._pendingTransfers.delete(requestId);

    this.emit('transferCancelled', {
      request: request.toJSON(),
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Perform a direct (synchronous) transfer.
   * Combines initiateTransfer and executeTransfer.
   *
   * @param {string} callId - Call to transfer
   * @param {string} fromAgentId - Source agent
   * @param {Object} [options={}] - Transfer options
   * @returns {Object} Transfer result
   */
  async transfer(callId, fromAgentId, options = {}) {
    const request = this.initiateTransfer(callId, fromAgentId, options);
    return this.executeTransfer(request);
  }

  // =========================================================================
  // Statistics
  // =========================================================================

  /**
   * Get transfer statistics.
   * @returns {Object} Transfer stats
   */
  getStats() {
    const history = this._transferHistory;
    const successful = history.filter((r) => r.result === TransferResult.SUCCESS);
    const failed = history.filter((r) => r.result !== TransferResult.SUCCESS);

    const avgTransferTime = successful.length > 0
      ? successful.reduce((sum, r) => sum + (r.completedAt - r.createdAt), 0) / successful.length
      : 0;

    return {
      totalTransfers: history.length,
      successfulTransfers: successful.length,
      failedTransfers: failed.length,
      successRate: history.length > 0
        ? (successful.length / history.length * 100).toFixed(1)
        : 0,
      avgTransferTime: Math.round(avgTransferTime),
      pendingTransfers: this._pendingTransfers.size,
      registeredAgents: this._agents.size,
      availableAgents: this.getAvailableAgents().length,
      activeCallsTotal: [...this._agents.values()].reduce((sum, a) => sum + a.callCount, 0),
    };
  }

  /**
   * Get transfer history.
   * @param {number} [limit=100] - Max records to return
   * @returns {Array<Object>} Transfer history
   */
  getTransferHistory(limit = 100) {
    return this._transferHistory.slice(-limit).map((r) => r.toJSON());
  }

  // =========================================================================
  // Serialization
  // =========================================================================

  /**
   * Serialize handoff state.
   * @returns {Object} Serializable state
   */
  toJSON() {
    return {
      agents: [...this._agents.values()].map((a) => a.toJSON()),
      pendingTransfers: [...this._pendingTransfers.values()].map((r) => r.toJSON()),
      callAssignments: Object.fromEntries(this._callAssignments),
      stats: this.getStats(),
    };
  }
}

export default AgentHandoff;

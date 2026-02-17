/**
 * @fileoverview Call State Machine for Far East Restaurant phone ordering system.
 *
 * Implements a finite state machine for call lifecycle management with proper
 * state transitions and event handling. States follow natural call flow:
 * ringing → connected → (hold ↔ connected) → transferred → ended
 *
 * @module callState
 */

/**
 * Valid call states.
 * @readonly
 * @enum {string}
 */
export const CallStates = {
  RINGING: 'ringing',
  CONNECTED: 'connected',
  HOLD: 'hold',
  TRANSFERRED: 'transferred',
  ENDED: 'ended',
};

/**
 * Valid state transitions map.
 * Defines which states can transition to which other states.
 */
const VALID_TRANSITIONS = {
  [CallStates.RINGING]: [CallStates.CONNECTED, CallStates.ENDED],
  [CallStates.CONNECTED]: [CallStates.HOLD, CallStates.TRANSFERRED, CallStates.ENDED],
  [CallStates.HOLD]: [CallStates.CONNECTED, CallStates.TRANSFERRED, CallStates.ENDED],
  [CallStates.TRANSFERRED]: [CallStates.CONNECTED, CallStates.ENDED],
  [CallStates.ENDED]: [], // Terminal state - no transitions allowed
};

/**
 * Call end reasons for tracking outcomes.
 * @readonly
 * @enum {string}
 */
export const EndReasons = {
  COMPLETED: 'completed',           // Normal call completion
  CUSTOMER_HANGUP: 'customer_hangup', // Customer ended the call
  AGENT_HANGUP: 'agent_hangup',     // Agent ended the call
  TRANSFERRED: 'transferred',       // Call was transferred
  TIMEOUT: 'timeout',               // Call exceeded time limits
  ERROR: 'error',                   // Technical error
  ABANDONED: 'abandoned',           // Customer abandoned in queue
  NO_ANSWER: 'no_answer',           // No one answered
};

/**
 * CallState class implements a state machine for managing call lifecycle.
 * Tracks state transitions, enforces valid transitions, and emits events.
 */
export class CallState {
  /**
   * Create a new CallState instance.
   *
   * @param {string} callId - Unique identifier for the call (e.g., Twilio CallSid)
   * @param {Object} [options={}] - Initial options
   * @param {string} [options.initialState] - Starting state (default: RINGING)
   */
  constructor(callId, options = {}) {
    if (!callId) {
      throw new Error('callId is required');
    }

    this.callId = callId;
    this._state = options.initialState || CallStates.RINGING;
    this._stateHistory = [
      {
        state: this._state,
        timestamp: Date.now(),
        reason: 'initial',
      },
    ];
    this._endReason = null;
    this._listeners = new Map();
    this._metadata = {};
  }

  /**
   * Get current state.
   * @returns {string} Current call state
   */
  get state() {
    return this._state;
  }

  /**
   * Get state history.
   * @returns {Array<Object>} Array of state transitions with timestamps
   */
  get stateHistory() {
    return [...this._stateHistory];
  }

  /**
   * Get end reason (only valid when state is ENDED).
   * @returns {string|null} End reason or null if call hasn't ended
   */
  get endReason() {
    return this._endReason;
  }

  /**
   * Check if call is in a terminal state.
   * @returns {boolean} True if call has ended
   */
  get isEnded() {
    return this._state === CallStates.ENDED;
  }

  /**
   * Check if call is active (connected or on hold).
   * @returns {boolean} True if call is active
   */
  get isActive() {
    return this._state === CallStates.CONNECTED || this._state === CallStates.HOLD;
  }

  /**
   * Check if a transition to a new state is valid.
   *
   * @param {string} newState - Target state
   * @returns {boolean} True if transition is valid
   */
  canTransitionTo(newState) {
    const validNextStates = VALID_TRANSITIONS[this._state] || [];
    return validNextStates.includes(newState);
  }

  /**
   * Transition to a new state.
   *
   * @param {string} newState - Target state
   * @param {Object} [options={}] - Transition options
   * @param {string} [options.reason] - Reason for transition
   * @param {string} [options.endReason] - End reason (only for ENDED state)
   * @returns {boolean} True if transition succeeded
   * @throws {Error} If transition is invalid
   */
  transition(newState, options = {}) {
    if (!Object.values(CallStates).includes(newState)) {
      throw new Error(`Invalid state: ${newState}`);
    }

    if (!this.canTransitionTo(newState)) {
      throw new Error(
        `Invalid transition from ${this._state} to ${newState}. ` +
        `Valid transitions: ${VALID_TRANSITIONS[this._state].join(', ') || 'none'}`
      );
    }

    const previousState = this._state;
    this._state = newState;

    // Record end reason for terminal state
    if (newState === CallStates.ENDED) {
      this._endReason = options.endReason || EndReasons.COMPLETED;
    }

    // Record state transition in history
    this._stateHistory.push({
      state: newState,
      previousState,
      timestamp: Date.now(),
      reason: options.reason || null,
      endReason: this._endReason,
    });

    // Emit state change event
    this._emit('stateChange', {
      callId: this.callId,
      previousState,
      newState,
      reason: options.reason,
      endReason: this._endReason,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Convenience method to connect a ringing call.
   * @param {string} [reason] - Optional reason for connection
   * @returns {boolean} True if successful
   */
  connect(reason) {
    return this.transition(CallStates.CONNECTED, { reason: reason || 'answered' });
  }

  /**
   * Put the call on hold.
   * @param {string} [reason] - Optional reason for hold
   * @returns {boolean} True if successful
   */
  hold(reason) {
    return this.transition(CallStates.HOLD, { reason: reason || 'put on hold' });
  }

  /**
   * Resume a held call.
   * @param {string} [reason] - Optional reason for resuming
   * @returns {boolean} True if successful
   */
  resume(reason) {
    return this.transition(CallStates.CONNECTED, { reason: reason || 'resumed' });
  }

  /**
   * Mark call as transferred.
   * @param {string} [targetAgent] - Agent ID call was transferred to
   * @returns {boolean} True if successful
   */
  transfer(targetAgent) {
    return this.transition(CallStates.TRANSFERRED, {
      reason: targetAgent ? `transferred to ${targetAgent}` : 'transferred',
    });
  }

  /**
   * End the call.
   * @param {string} [endReason] - Reason for ending (from EndReasons)
   * @returns {boolean} True if successful
   */
  end(endReason) {
    return this.transition(CallStates.ENDED, {
      reason: 'call ended',
      endReason: endReason || EndReasons.COMPLETED,
    });
  }

  /**
   * Get time spent in each state (in milliseconds).
   * @returns {Object} Map of state to duration in ms
   */
  getStateDurations() {
    const durations = {};
    const history = this._stateHistory;

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const nextEntry = history[i + 1];
      const endTime = nextEntry ? nextEntry.timestamp : Date.now();
      const duration = endTime - entry.timestamp;

      if (!durations[entry.state]) {
        durations[entry.state] = 0;
      }
      durations[entry.state] += duration;
    }

    return durations;
  }

  /**
   * Get total call duration (from first state to now or end).
   * @returns {number} Duration in milliseconds
   */
  getTotalDuration() {
    if (this._stateHistory.length === 0) return 0;
    const startTime = this._stateHistory[0].timestamp;
    const endTime = this.isEnded
      ? this._stateHistory[this._stateHistory.length - 1].timestamp
      : Date.now();
    return endTime - startTime;
  }

  /**
   * Add event listener.
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  }

  /**
   * Remove event listener.
   * @param {string} event - Event name
   * @param {Function} callback - Callback to remove
   */
  off(event, callback) {
    if (!this._listeners.has(event)) return;
    const callbacks = this._listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit an event to all listeners.
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @private
   */
  _emit(event, data) {
    if (!this._listeners.has(event)) return;
    for (const callback of this._listeners.get(event)) {
      try {
        callback(data);
      } catch (error) {
        console.error(`[CallState] Error in event listener for ${event}:`, error);
      }
    }
  }

  /**
   * Set metadata for the call.
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   */
  setMetadata(key, value) {
    this._metadata[key] = value;
  }

  /**
   * Get metadata for the call.
   * @param {string} [key] - Metadata key (omit to get all metadata)
   * @returns {*} Metadata value or all metadata
   */
  getMetadata(key) {
    if (key === undefined) {
      return { ...this._metadata };
    }
    return this._metadata[key];
  }

  /**
   * Serialize call state for persistence.
   * @returns {Object} Serializable state object
   */
  toJSON() {
    return {
      callId: this.callId,
      state: this._state,
      stateHistory: this._stateHistory,
      endReason: this._endReason,
      metadata: this._metadata,
      totalDuration: this.getTotalDuration(),
      stateDurations: this.getStateDurations(),
    };
  }

  /**
   * Create CallState from serialized data.
   * @param {Object} data - Serialized state data
   * @returns {CallState} Restored CallState instance
   */
  static fromJSON(data) {
    const callState = new CallState(data.callId, { initialState: data.state });
    callState._stateHistory = data.stateHistory || [];
    callState._endReason = data.endReason || null;
    callState._metadata = data.metadata || {};
    return callState;
  }
}

export default CallState;

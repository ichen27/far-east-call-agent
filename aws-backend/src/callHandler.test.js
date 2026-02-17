/**
 * @fileoverview Comprehensive tests for Sprint 2 - Call Handling Features.
 *
 * Tests cover:
 * - Call state machine (CallState)
 * - Call metadata tracking (CallMetadata)
 * - Call queue management (CallQueue)
 * - Agent handoff logic (AgentHandoff)
 *
 * Run with: node --test callHandler.test.js
 * Or: node callHandler.test.js
 *
 * @module callHandler.test
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { CallState, CallStates, EndReasons } from './callState.js';
import { CallMetadata, CallOutcomes } from './callMetadata.js';
import { CallQueue } from './callQueue.js';
import { AgentHandoff, Agent, AgentStatus, TransferType, TransferResult } from './agentHandoff.js';

// ============================================================================
// CallState Tests (10 tests)
// ============================================================================

describe('CallState', () => {
  let callState;

  beforeEach(() => {
    callState = new CallState('call_123');
  });

  test('should initialize with RINGING state', () => {
    assert.strictEqual(callState.state, CallStates.RINGING);
    assert.strictEqual(callState.callId, 'call_123');
    assert.strictEqual(callState.isEnded, false);
  });

  test('should require callId', () => {
    assert.throws(() => new CallState(null), /callId is required/);
    assert.throws(() => new CallState(''), /callId is required/);
  });

  test('should allow valid transition from RINGING to CONNECTED', () => {
    assert.strictEqual(callState.canTransitionTo(CallStates.CONNECTED), true);
    assert.strictEqual(callState.connect(), true);
    assert.strictEqual(callState.state, CallStates.CONNECTED);
  });

  test('should allow valid transition from CONNECTED to HOLD', () => {
    callState.connect();
    assert.strictEqual(callState.canTransitionTo(CallStates.HOLD), true);
    assert.strictEqual(callState.hold(), true);
    assert.strictEqual(callState.state, CallStates.HOLD);
  });

  test('should allow resuming from HOLD to CONNECTED', () => {
    callState.connect();
    callState.hold();
    assert.strictEqual(callState.resume(), true);
    assert.strictEqual(callState.state, CallStates.CONNECTED);
  });

  test('should reject invalid state transition', () => {
    // Cannot go from RINGING directly to HOLD
    assert.strictEqual(callState.canTransitionTo(CallStates.HOLD), false);
    assert.throws(
      () => callState.transition(CallStates.HOLD),
      /Invalid transition from ringing to hold/
    );
  });

  test('should track state history', () => {
    callState.connect();
    callState.hold();
    callState.resume();

    const history = callState.stateHistory;
    assert.strictEqual(history.length, 4);
    assert.strictEqual(history[0].state, CallStates.RINGING);
    assert.strictEqual(history[1].state, CallStates.CONNECTED);
    assert.strictEqual(history[2].state, CallStates.HOLD);
    assert.strictEqual(history[3].state, CallStates.CONNECTED);
  });

  test('should emit stateChange events', () => {
    let emittedEvent = null;
    callState.on('stateChange', (event) => {
      emittedEvent = event;
    });

    callState.connect();

    assert.notStrictEqual(emittedEvent, null);
    assert.strictEqual(emittedEvent.previousState, CallStates.RINGING);
    assert.strictEqual(emittedEvent.newState, CallStates.CONNECTED);
    assert.strictEqual(emittedEvent.callId, 'call_123');
  });

  test('should end call and set end reason', () => {
    callState.connect();
    callState.end(EndReasons.COMPLETED);

    assert.strictEqual(callState.state, CallStates.ENDED);
    assert.strictEqual(callState.endReason, EndReasons.COMPLETED);
    assert.strictEqual(callState.isEnded, true);
  });

  test('should calculate state durations', async () => {
    callState.connect();
    await sleep(50);
    callState.hold();
    await sleep(50);
    callState.resume();
    await sleep(50);
    callState.end();

    const durations = callState.getStateDurations();

    assert.ok(durations[CallStates.RINGING] >= 0);
    assert.ok(durations[CallStates.CONNECTED] >= 50);
    assert.ok(durations[CallStates.HOLD] >= 50);
    assert.ok(callState.getTotalDuration() >= 150);
  });

  test('should serialize and deserialize', () => {
    callState.connect();
    callState.setMetadata('customer', 'John');

    const json = callState.toJSON();
    const restored = CallState.fromJSON(json);

    assert.strictEqual(restored.callId, 'call_123');
    assert.strictEqual(restored.state, CallStates.CONNECTED);
    assert.strictEqual(restored.getMetadata('customer'), 'John');
  });
});

// ============================================================================
// CallMetadata Tests (10 tests)
// ============================================================================

describe('CallMetadata', () => {
  let metadata;

  beforeEach(() => {
    metadata = new CallMetadata('call_456', {
      phoneNumber: '+1234567890',
      agentId: 'agent_001',
    });
  });

  test('should initialize with basic info', () => {
    assert.strictEqual(metadata.callId, 'call_456');
    assert.strictEqual(metadata.participants.callerId, '+1234567890');
    assert.strictEqual(metadata.participants.agentId, 'agent_001');
    assert.ok(metadata.timestamps.created > 0);
  });

  test('should require callId', () => {
    assert.throws(() => new CallMetadata(null), /callId is required/);
  });

  test('should track timestamps', async () => {
    metadata.markQueued();
    await sleep(20);
    metadata.markAnswered();
    await sleep(20);
    metadata.markFirstResponse();
    await sleep(20);
    metadata.markEnded();

    assert.ok(metadata.timestamps.queued > 0);
    assert.ok(metadata.timestamps.answered > metadata.timestamps.queued);
    assert.ok(metadata.timestamps.firstResponse >= metadata.timestamps.answered);
    assert.ok(metadata.timestamps.ended > metadata.timestamps.firstResponse);
  });

  test('should calculate durations', async () => {
    metadata.markQueued();
    await sleep(30);
    metadata.markAnswered();
    await sleep(50);
    metadata.markEnded();

    assert.ok(metadata.durations.queueWait >= 30);
    assert.ok(metadata.durations.total >= 80);
    assert.ok(metadata.durations.talk >= 0);
  });

  test('should track agent transfers', () => {
    metadata.assignAgent('agent_001', 'Sarah');
    metadata.assignAgent('agent_002', 'Mike');

    assert.strictEqual(metadata.participants.agentId, 'agent_002');
    assert.strictEqual(metadata.getTransferCount(), 1);
    assert.strictEqual(metadata.participants.transferHistory[0].agentId, 'agent_001');
  });

  test('should manage tags', () => {
    metadata.addTag('vip');
    metadata.addTag('callback');

    assert.strictEqual(metadata.hasTag('vip'), true);
    assert.strictEqual(metadata.hasTag('regular'), false);

    metadata.removeTag('vip');
    assert.strictEqual(metadata.hasTag('vip'), false);
  });

  test('should record order outcome', () => {
    metadata.recordOrder('ORD-001', 45.99);

    assert.strictEqual(metadata.outcome.status, CallOutcomes.ORDER_PLACED);
    assert.strictEqual(metadata.outcome.orderNumber, 'ORD-001');
    assert.strictEqual(metadata.outcome.orderTotal, 45.99);
    assert.strictEqual(metadata.wasSuccessful(), true);
  });

  test('should track metrics', () => {
    metadata.incrementMessages();
    metadata.incrementMessages();
    metadata.incrementTurns();
    metadata.incrementToolCalls();
    metadata.recordSilentPeriod();
    metadata.recordError();

    assert.strictEqual(metadata.metrics.messageCount, 2);
    assert.strictEqual(metadata.metrics.turnCount, 1);
    assert.strictEqual(metadata.metrics.toolCallCount, 1);
    assert.strictEqual(metadata.metrics.silentPeriods, 1);
    assert.strictEqual(metadata.metrics.errorCount, 1);
  });

  test('should calculate efficiency score', () => {
    metadata.markAnswered();
    metadata.incrementTurns();
    metadata.recordOrder('ORD-001', 25.00);
    metadata.markEnded();

    const score = metadata.getEfficiencyScore();
    assert.ok(score > 0 && score <= 100);
  });

  test('should serialize and deserialize', () => {
    metadata.addTag('test');
    metadata.recordOrder('ORD-002', 30.00);
    metadata.addNote('Customer requested rush');

    const json = metadata.toJSON();
    const restored = CallMetadata.fromJSON(json);

    assert.strictEqual(restored.callId, 'call_456');
    assert.strictEqual(restored.hasTag('test'), true);
    assert.strictEqual(restored.outcome.orderNumber, 'ORD-002');
    assert.strictEqual(restored.outcome.notes.length, 1);
  });
});

// ============================================================================
// CallQueue Tests (12 tests)
// ============================================================================

describe('CallQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new CallQueue({ maxQueueSize: 10 });
  });

  test('should initialize empty queue', () => {
    assert.strictEqual(queue.size, 0);
    assert.strictEqual(queue.isEmpty, true);
    assert.strictEqual(queue.isFull, false);
  });

  test('should enqueue calls with FIFO order', () => {
    queue.enqueue('call_1');
    queue.enqueue('call_2');
    queue.enqueue('call_3');

    assert.strictEqual(queue.size, 3);
    assert.strictEqual(queue.getPosition('call_1'), 1);
    assert.strictEqual(queue.getPosition('call_2'), 2);
    assert.strictEqual(queue.getPosition('call_3'), 3);
  });

  test('should dequeue in FIFO order', () => {
    queue.enqueue('call_1');
    queue.enqueue('call_2');

    const first = queue.dequeue();
    assert.strictEqual(first.callId, 'call_1');

    const second = queue.dequeue();
    assert.strictEqual(second.callId, 'call_2');

    assert.strictEqual(queue.size, 0);
  });

  test('should support priority queuing', () => {
    queue.enqueue('low_priority', { priority: 1 });
    queue.enqueue('high_priority', { priority: 5 });
    queue.enqueue('medium_priority', { priority: 3 });

    // High priority should be first
    const first = queue.dequeue();
    assert.strictEqual(first.callId, 'high_priority');

    // Then medium
    const second = queue.dequeue();
    assert.strictEqual(second.callId, 'medium_priority');

    // Then low
    const third = queue.dequeue();
    assert.strictEqual(third.callId, 'low_priority');
  });

  test('should maintain FIFO within same priority', () => {
    queue.enqueue('p3_first', { priority: 3 });
    queue.enqueue('p3_second', { priority: 3 });
    queue.enqueue('p3_third', { priority: 3 });

    const first = queue.dequeue();
    assert.strictEqual(first.callId, 'p3_first');

    const second = queue.dequeue();
    assert.strictEqual(second.callId, 'p3_second');
  });

  test('should reject duplicate calls', () => {
    queue.enqueue('call_1');
    assert.throws(() => queue.enqueue('call_1'), /already in queue/);
  });

  test('should reject when queue is full', () => {
    for (let i = 0; i < 10; i++) {
      queue.enqueue(`call_${i}`);
    }
    assert.strictEqual(queue.isFull, true);
    assert.throws(() => queue.enqueue('call_overflow'), /Queue is full/);
  });

  test('should remove calls from queue', () => {
    queue.enqueue('call_1');
    queue.enqueue('call_2');
    queue.enqueue('call_3');

    const removed = queue.remove('call_2');
    assert.strictEqual(removed.callId, 'call_2');
    assert.strictEqual(queue.size, 2);
    assert.strictEqual(queue.has('call_2'), false);
  });

  test('should update priority dynamically', () => {
    queue.enqueue('low', { priority: 1 });
    queue.enqueue('medium', { priority: 3 });

    // Boost low priority call
    queue.updatePriority('low', 5);

    // Now low should be first (higher priority)
    const first = queue.dequeue();
    assert.strictEqual(first.callId, 'low');
  });

  test('should estimate wait time', () => {
    queue.setActiveAgents(2);
    queue.enqueue('call_1');
    queue.enqueue('call_2');
    queue.enqueue('call_3');

    const waitTime = queue.getEstimatedWaitTime('call_3');
    assert.ok(waitTime > 0);
  });

  test('should emit events', () => {
    const events = [];
    queue.on('enqueued', (e) => events.push({ type: 'enqueued', ...e }));
    queue.on('dequeued', (e) => events.push({ type: 'dequeued', ...e }));

    queue.enqueue('call_1');
    queue.dequeue();

    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].type, 'enqueued');
    assert.strictEqual(events[1].type, 'dequeued');
  });

  test('should track statistics', () => {
    queue.enqueue('call_1');
    queue.enqueue('call_2');
    queue.dequeue();
    queue.remove('call_2', 'abandoned');

    const stats = queue.getStats();
    assert.strictEqual(stats.totalEnqueued, 2);
    assert.strictEqual(stats.totalDequeued, 1);
    assert.strictEqual(stats.totalAbandoned, 1);
  });
});

// ============================================================================
// AgentHandoff Tests (12 tests)
// ============================================================================

describe('AgentHandoff', () => {
  let handoff;

  beforeEach(() => {
    handoff = new AgentHandoff();
  });

  test('should register agents', () => {
    const agent = handoff.registerAgent({
      id: 'agent_001',
      name: 'Sarah',
      type: 'ai',
      skills: ['english', 'spanish'],
    });

    assert.strictEqual(agent.id, 'agent_001');
    assert.strictEqual(agent.name, 'Sarah');
    assert.strictEqual(agent.hasSkill('english'), true);
    assert.strictEqual(handoff.getAllAgents().length, 1);
  });

  test('should track agent status', () => {
    handoff.registerAgent({ id: 'agent_001' });

    assert.strictEqual(handoff.getAgent('agent_001').status, AgentStatus.AVAILABLE);

    handoff.updateAgentStatus('agent_001', AgentStatus.AWAY);
    assert.strictEqual(handoff.getAgent('agent_001').status, AgentStatus.AWAY);
  });

  test('should find agents by skill', () => {
    handoff.registerAgent({ id: 'agent_001', skills: ['english'] });
    handoff.registerAgent({ id: 'agent_002', skills: ['spanish'] });
    handoff.registerAgent({ id: 'agent_003', skills: ['english', 'mandarin'] });

    const englishAgents = handoff.getAgentsBySkill('english');
    assert.strictEqual(englishAgents.length, 2);
  });

  test('should assign calls to agents', () => {
    handoff.registerAgent({ id: 'agent_001' });
    handoff.assignCall('call_123', 'agent_001');

    assert.strictEqual(handoff.getAssignedAgent('call_123'), 'agent_001');
    assert.strictEqual(handoff.getAgent('agent_001').hasCall('call_123'), true);
  });

  test('should unassign calls', () => {
    handoff.registerAgent({ id: 'agent_001' });
    handoff.assignCall('call_123', 'agent_001');
    handoff.unassignCall('call_123');

    assert.strictEqual(handoff.getAssignedAgent('call_123'), null);
    assert.strictEqual(handoff.getAgent('agent_001').hasCall('call_123'), false);
  });

  test('should initiate transfer request', () => {
    handoff.registerAgent({ id: 'agent_001' });
    handoff.registerAgent({ id: 'agent_002' });
    handoff.assignCall('call_123', 'agent_001');

    const request = handoff.initiateTransfer('call_123', 'agent_001', {
      toAgentId: 'agent_002',
      reason: 'customer request',
    });

    assert.ok(request.id);
    assert.strictEqual(request.callId, 'call_123');
    assert.strictEqual(request.fromAgentId, 'agent_001');
    assert.strictEqual(request.toAgentId, 'agent_002');
  });

  test('should execute successful transfer', async () => {
    handoff.registerAgent({ id: 'agent_001' });
    handoff.registerAgent({ id: 'agent_002' });
    handoff.assignCall('call_123', 'agent_001');

    const result = await handoff.transfer('call_123', 'agent_001', {
      toAgentId: 'agent_002',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.result, TransferResult.SUCCESS);
    assert.strictEqual(result.toAgentId, 'agent_002');
    assert.strictEqual(handoff.getAssignedAgent('call_123'), 'agent_002');
  });

  test('should fail transfer when no agents available', async () => {
    handoff.registerAgent({ id: 'agent_001' });
    handoff.registerAgent({ id: 'agent_002', maxConcurrentCalls: 1 });
    handoff.assignCall('call_123', 'agent_001');
    handoff.assignCall('call_456', 'agent_002'); // Make agent_002 busy

    const result = await handoff.transfer('call_123', 'agent_001', {
      toAgentId: 'agent_002',
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.result, TransferResult.BUSY);
  });

  test('should find best agent by skill', async () => {
    handoff.registerAgent({ id: 'agent_001', skills: ['english'] });
    handoff.registerAgent({ id: 'agent_002', skills: ['mandarin'] });
    handoff.registerAgent({ id: 'agent_003', skills: ['mandarin', 'cantonese'] });
    handoff.assignCall('call_123', 'agent_001');

    const result = await handoff.transfer('call_123', 'agent_001', {
      skill: 'mandarin',
    });

    assert.strictEqual(result.success, true);
    assert.ok(['agent_002', 'agent_003'].includes(result.toAgentId));
  });

  test('should track transfer history', async () => {
    handoff.registerAgent({ id: 'agent_001' });
    handoff.registerAgent({ id: 'agent_002' });
    handoff.assignCall('call_123', 'agent_001');

    await handoff.transfer('call_123', 'agent_001', { toAgentId: 'agent_002' });

    const history = handoff.getTransferHistory();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].callId, 'call_123');
    assert.strictEqual(history[0].result, TransferResult.SUCCESS);
  });

  test('should emit transfer events', async () => {
    const events = [];
    handoff.on('transferInitiated', (e) => events.push('initiated'));
    handoff.on('transferCompleted', (e) => events.push('completed'));

    handoff.registerAgent({ id: 'agent_001' });
    handoff.registerAgent({ id: 'agent_002' });
    handoff.assignCall('call_123', 'agent_001');

    await handoff.transfer('call_123', 'agent_001', { toAgentId: 'agent_002' });

    assert.ok(events.includes('initiated'));
    assert.ok(events.includes('completed'));
  });

  test('should get transfer statistics', async () => {
    handoff.registerAgent({ id: 'agent_001' });
    handoff.registerAgent({ id: 'agent_002' });
    handoff.assignCall('call_123', 'agent_001');
    handoff.assignCall('call_456', 'agent_001');

    await handoff.transfer('call_123', 'agent_001', { toAgentId: 'agent_002' });
    await handoff.transfer('call_456', 'agent_001', { toAgentId: 'agent_002' });

    const stats = handoff.getStats();
    assert.strictEqual(stats.totalTransfers, 2);
    assert.strictEqual(stats.successfulTransfers, 2);
    assert.strictEqual(stats.registeredAgents, 2);
  });
});

// ============================================================================
// Integration Tests (5 tests)
// ============================================================================

describe('Integration', () => {
  test('should handle complete call lifecycle', async () => {
    const queue = new CallQueue();
    const handoff = new AgentHandoff();
    const callState = new CallState('call_001');
    const metadata = new CallMetadata('call_001', { phoneNumber: '+1234567890' });

    // 1. Register agents
    handoff.registerAgent({ id: 'ai_agent', type: 'ai' });
    handoff.registerAgent({ id: 'human_agent', type: 'human', skills: ['escalation'] });

    // 2. Call arrives and enters queue
    queue.enqueue('call_001', { metadata });
    metadata.markQueued();
    assert.strictEqual(queue.size, 1);

    // 3. Call is dequeued and connected
    const queueItem = queue.dequeue();
    callState.connect();
    metadata.markAnswered();
    handoff.assignCall('call_001', 'ai_agent');
    assert.strictEqual(callState.state, CallStates.CONNECTED);

    // 4. Transfer to human
    callState.transfer('human_agent');
    await handoff.transfer('call_001', 'ai_agent', {
      toAgentId: 'human_agent',
      reason: 'customer request',
    });
    assert.strictEqual(handoff.getAssignedAgent('call_001'), 'human_agent');

    // 5. Order placed and call ends
    metadata.recordOrder('ORD-001', 35.50);
    callState.end(EndReasons.COMPLETED);
    metadata.markEnded();
    handoff.unassignCall('call_001');

    assert.strictEqual(callState.isEnded, true);
    assert.strictEqual(metadata.wasSuccessful(), true);
  });

  test('should handle queue overflow gracefully', () => {
    const queue = new CallQueue({ maxQueueSize: 3 });

    queue.enqueue('call_1');
    queue.enqueue('call_2');
    queue.enqueue('call_3');

    assert.strictEqual(queue.isFull, true);
    assert.throws(() => queue.enqueue('call_4'), /Queue is full/);
  });

  test('should handle abandoned calls in queue', () => {
    const queue = new CallQueue();
    const metadata = new CallMetadata('call_001');

    queue.enqueue('call_001', { metadata });
    queue.remove('call_001', 'abandoned');

    const stats = queue.getStats();
    assert.strictEqual(stats.totalAbandoned, 1);
    assert.strictEqual(metadata.outcome.status, CallOutcomes.CUSTOMER_ABANDONED);
  });

  test('should handle multiple concurrent calls', async () => {
    const queue = new CallQueue();
    const handoff = new AgentHandoff();

    handoff.registerAgent({ id: 'agent_001', maxConcurrentCalls: 50 });
    queue.setActiveAgents(1);

    // Simulate 10 concurrent calls
    for (let i = 0; i < 10; i++) {
      queue.enqueue(`call_${i}`);
    }

    assert.strictEqual(queue.size, 10);

    // Process all calls
    while (!queue.isEmpty) {
      const item = queue.dequeue();
      handoff.assignCall(item.callId, 'agent_001');
    }

    assert.strictEqual(handoff.getAgent('agent_001').callCount, 10);
  });

  test('should serialize and restore full state', () => {
    const queue = new CallQueue();
    const handoff = new AgentHandoff();

    handoff.registerAgent({ id: 'agent_001', skills: ['english'] });
    queue.enqueue('call_001', { priority: 3 });
    queue.enqueue('call_002', { priority: 5 });

    // Serialize
    const queueState = queue.toJSON();
    const handoffState = handoff.toJSON();

    // Verify serialization
    assert.strictEqual(queueState.items.length, 2);
    assert.strictEqual(handoffState.agents.length, 1);
    assert.deepStrictEqual(handoffState.agents[0].skills, ['english']);
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Test Runner
// ============================================================================

// Run tests if executed directly
if (process.argv[1].endsWith('callHandler.test.js')) {
  console.log('\n🧪 Running Sprint 2 - Call Handling Tests...\n');
  console.log('=' .repeat(60));

  // Node test runner handles test execution
  // Tests will run automatically with describe/test from node:test
}

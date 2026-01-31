/**
 * @fileoverview Health check utilities for monitoring server status.
 *
 * Provides health check functions for monitoring services like PM2,
 * load balancers, and external health monitoring tools (UptimeRobot, etc.)
 *
 * @module health
 */

import { db } from './database.js';

/**
 * Service start time for uptime calculation.
 */
const serviceStartTime = Date.now();

/**
 * Track last successful database check.
 */
let lastDbCheckTime = null;
let lastDbCheckStatus = 'unknown';

/**
 * Performs a lightweight database health check.
 * Uses a simple SELECT 1 query to verify database connectivity.
 *
 * @returns {Object} Database health status
 */
function checkDatabaseHealth() {
  try {
    const start = Date.now();
    db.prepare('SELECT 1').get();
    const responseTime = Date.now() - start;

    lastDbCheckTime = Date.now();
    lastDbCheckStatus = 'healthy';

    return {
      status: 'healthy',
      responseTime,
      journalMode: db.pragma('journal_mode', { simple: true }),
    };
  } catch (error) {
    lastDbCheckStatus = 'unhealthy';
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

/**
 * Gets the current memory usage of the process.
 *
 * @returns {Object} Memory usage information
 */
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
  };
}

/**
 * Calculates service uptime.
 *
 * @returns {Object} Uptime information
 */
function getUptime() {
  const uptimeMs = Date.now() - serviceStartTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeDays = Math.floor(uptimeHours / 24);

  return {
    milliseconds: uptimeMs,
    seconds: uptimeSeconds,
    formatted: `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
  };
}

/**
 * Performs a comprehensive health check of all system components.
 *
 * @returns {Object} Complete health status
 */
export function getHealthStatus() {
  const dbHealth = checkDatabaseHealth();
  const memory = getMemoryUsage();
  const uptime = getUptime();

  const isHealthy = dbHealth.status === 'healthy';

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    uptime,
    memory,
    database: dbHealth,
  };
}

/**
 * Performs a lightweight liveness check.
 * Used by orchestrators to determine if the process is alive.
 *
 * @returns {Object} Simple liveness status
 */
export function getLivenessStatus() {
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Performs a readiness check.
 * Indicates whether the service is ready to accept requests.
 *
 * @returns {Object} Readiness status
 */
export function getReadinessStatus() {
  const dbHealth = checkDatabaseHealth();
  const isReady = dbHealth.status === 'healthy';

  return {
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealth.status,
    },
  };
}

/**
 * Tracks active connections for graceful shutdown.
 */
export const connectionTracker = {
  connections: new Set(),

  add(conn) {
    this.connections.add(conn);
  },

  remove(conn) {
    this.connections.delete(conn);
  },

  get count() {
    return this.connections.size;
  },

  async closeAll(timeout = 5000) {
    console.log(`[Health] Closing ${this.connections.size} active connections...`);
    const closePromises = Array.from(this.connections).map((conn) => {
      return new Promise((resolve) => {
        if (conn.close) {
          conn.close();
        }
        resolve();
      });
    });

    await Promise.race([
      Promise.all(closePromises),
      new Promise((resolve) => setTimeout(resolve, timeout)),
    ]);

    this.connections.clear();
  },
};

export default {
  getHealthStatus,
  getLivenessStatus,
  getReadinessStatus,
  connectionTracker,
};

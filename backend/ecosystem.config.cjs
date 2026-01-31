/**
 * PM2 Ecosystem Configuration for Far East Restaurant Backend
 *
 * This configuration provides:
 * - Process management with auto-restart on crashes
 * - Cluster mode for load distribution (socket server)
 * - Graceful shutdown handling
 * - Log rotation and management
 * - Memory limit monitoring
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 reload ecosystem.config.cjs --update-env
 *   pm2 stop all
 *
 * For 99% uptime (FAREAST-11):
 * - auto_restart: true - Restarts on crash
 * - max_restarts: 10 - Prevents restart loops
 * - exp_backoff_restart_delay: 100 - Exponential backoff
 * - kill_timeout: 5000 - Graceful shutdown timeout
 *
 * @module ecosystem.config
 */

module.exports = {
  apps: [
    // Voice Agent Server (Twilio WebSocket)
    {
      name: 'fareast-voice',
      script: './src/server.js',
      instances: 1, // Single instance for WebSocket stickiness
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      env: {
        NODE_ENV: 'production',
        VOICE_PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        VOICE_PORT: 3000,
      },
      error_file: './logs/voice-error.log',
      out_file: './logs/voice-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Chat Agent Server (HTTP REST API)
    {
      name: 'fareast-chat',
      script: './src/chat_agent.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      env: {
        NODE_ENV: 'production',
        CHAT_PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        CHAT_PORT: 3001,
      },
      error_file: './logs/chat-error.log',
      out_file: './logs/chat-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // WebSocket Server (Frontend updates & REST API)
    {
      name: 'fareast-socket',
      script: './src/socket.js',
      instances: 1, // Single instance for WebSocket consistency
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '300M',
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 8080,
      },
      env_development: {
        NODE_ENV: 'development',
        SOCKET_PORT: 8080,
      },
      error_file: './logs/socket-error.log',
      out_file: './logs/socket-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],

  // Deployment configuration (optional - for remote deploys)
  deploy: {
    production: {
      user: 'deploy',
      host: 'production-server',
      ref: 'origin/main',
      repo: 'git@github.com:ichen27/far-east-call-agent.git',
      path: '/var/www/fareast',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': '',
    },
  },
};

// test.js - Start the WebSocket server from socket.js
import { server, broadcastNewOrder } from './socket.js';

const PORT = 8080;

server.listen(PORT, () => {
  console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
  console.log('📺 Waiting for clients to connect...\n');
});

// Test: Send a fake order after 5 seconds
setTimeout(() => {
  console.log('🧪 Sending test order...');
  broadcastNewOrder({
    orderNumber: 'ORD-20251225-TEST',
    phoneNumber: '607-555-1234',
    items: [
      { name: "General Tso's Chicken", quantity: 1, modifications: 'Extra spicy' },
      { name: 'Pork Fried Rice', quantity: 2, modifications: '' }
    ],
    notes: 'Test order from test.js',
    time: new Date().toISOString(),
    total: 32.85
  });
}, 5000);
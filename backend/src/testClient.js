// testClient.js - WebSocket client to test order broadcasting
import WebSocket from 'ws';

// Connect to the order WebSocket on port 3000
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('✅ Connected to order stream!');
  console.log('📺 Waiting for orders...\n');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  if (message.type === 'welcome') {
    console.log('👋', message.message);
  } else if (message.type === 'new_order') {
    console.log('\n🔔 ═══════════════════════════════════════');
    console.log('   NEW ORDER RECEIVED!');
    console.log('═══════════════════════════════════════════');
    console.log(`   Order #: ${message.payload.orderNumber}`);
    console.log(`   Phone: ${message.payload.phoneNumber}`);
    console.log(`   Time: ${message.payload.time}`);
    console.log('   Items:');
    message.payload.items.forEach((item, i) => {
      const mods = item.modifications ? ` [${item.modifications}]` : '';
      console.log(`     ${i + 1}. ${item.name} x${item.quantity}${mods}`);
    });
    if (message.payload.notes) {
      console.log(`   Notes: ${message.payload.notes}`);
    }
    console.log(`   Total: $${message.payload.total.toFixed(2)}`);
    console.log('═══════════════════════════════════════════\n');
  } else {
    console.log('📥 Received:', message);
  }
});

ws.on('error', (err) => {
  console.error('Error:', err.message);
});

ws.on('close', () => {
  console.log('Disconnected from order stream');
});
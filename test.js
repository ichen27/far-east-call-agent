const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('Connected!');
};

ws.onmessage = (event) => {
  console.log('Received:', event.data);
};

// Send a test message
ws.send(JSON.stringify({ type: 'ping' }));
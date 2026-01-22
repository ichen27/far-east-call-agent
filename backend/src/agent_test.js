// agent_test.js - Voice chat with OpenAI Realtime API
// Run: node agent_test.js
// Then open: http://localhost:4000

import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

dotenv.config();

const PORT = 4000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Agent instructions
const AGENT_INSTRUCTIONS = `
You are Sarah, a friendly and efficient virtual assistant for Far East Chinese Restaurant.
You are taking phone orders for takeout (NO DELIVERY).

Start by greeting: "Hello! This is Far East Chinese Restaurant. How can I help you today?"

Be concise and efficient. Ask clarifying questions about:
- Size (Pt/Qt/Combination) when applicable  
- Any modifications or special requests

At the end of the order:
1. Summarize the order
2. Give the total price
3. Ask for their phone number
4. Tell them it will be ready in 10-15 minutes

Popular items include:
- General Tso's Chicken: $12.95
- Sesame Chicken: $12.95
- Chicken with Broccoli: Pt $8.15, Qt $12.55
- Pork Fried Rice: Pt $5.95, Qt $9.95
- Chicken Lo Mein: Pt $7.75, Qt $10.95
- Egg Roll: $1.90

Combination plates come with Pork Fried Rice and Egg Roll, around $10.95-$11.15
`;

// HTML page with voice interface
const HTML_PAGE = `
<!DOCTYPE html>
<html>
<head>
  <title>🎤 Voice Agent Test</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #eee;
      padding: 20px;
    }
    h1 { 
      color: #00d9ff; 
      margin-bottom: 10px;
      font-size: 2rem;
    }
    .subtitle {
      color: #888;
      margin-bottom: 30px;
    }
    .status { 
      padding: 10px 20px;
      border-radius: 20px;
      margin-bottom: 30px;
      font-size: 0.9rem;
    }
    .status.connected { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
    .status.disconnected { background: rgba(248, 113, 113, 0.2); color: #f87171; }
    .status.connecting { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
    
    .mic-container {
      position: relative;
      margin-bottom: 30px;
    }
    .mic-btn {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #00d9ff, #0891b2);
      color: white;
      font-size: 3rem;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(0, 217, 255, 0.3);
    }
    .mic-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 30px rgba(0, 217, 255, 0.5);
    }
    .mic-btn.recording {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      animation: pulse 1.5s infinite;
      box-shadow: 0 4px 20px rgba(239, 68, 68, 0.5);
    }
    .mic-btn:disabled {
      background: #444;
      cursor: not-allowed;
      box-shadow: none;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    .visualizer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      height: 60px;
      margin-bottom: 20px;
    }
    .bar {
      width: 6px;
      background: #00d9ff;
      border-radius: 3px;
      transition: height 0.1s ease;
    }
    
    .transcript {
      width: 100%;
      max-width: 600px;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 20px;
      max-height: 300px;
      overflow-y: auto;
    }
    .transcript-item {
      margin: 10px 0;
      padding: 10px 15px;
      border-radius: 8px;
    }
    .transcript-item.user {
      background: rgba(0, 217, 255, 0.1);
      border-left: 3px solid #00d9ff;
    }
    .transcript-item.agent {
      background: rgba(74, 222, 128, 0.1);
      border-left: 3px solid #4ade80;
    }
    .transcript-item .label {
      font-size: 0.75rem;
      color: #888;
      margin-bottom: 5px;
    }
    
    .instructions {
      margin-top: 20px;
      color: #666;
      font-size: 0.85rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>🍜 Far East Voice Agent</h1>
  <p class="subtitle">Talk to our AI ordering assistant</p>
  
  <div class="status connecting" id="status">Connecting...</div>
  
  <div class="visualizer" id="visualizer">
    ${Array(20).fill('<div class="bar" style="height: 5px;"></div>').join('')}
  </div>
  
  <div class="mic-container">
    <button class="mic-btn" id="micBtn" disabled>🎤</button>
  </div>
  
  <div class="transcript" id="transcript"></div>
  
  <p class="instructions">
    Click the microphone and speak to place your order.<br>
    The agent will respond with voice.
  </p>

  <script>
    const micBtn = document.getElementById('micBtn');
    const status = document.getElementById('status');
    const transcript = document.getElementById('transcript');
    const visualizer = document.getElementById('visualizer');
    const bars = visualizer.querySelectorAll('.bar');
    
    let ws;
    let audioContext;
    let mediaStream;
    let processor;
    let isRecording = false;

    // Connect to WebSocket
    function connect() {
      ws = new WebSocket('ws://localhost:${PORT}/voice');
      
      ws.onopen = () => {
        status.textContent = '✅ Connected - Click mic to talk';
        status.className = 'status connected';
        micBtn.disabled = false;
      };
      
      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'audio') {
          // Play audio response
          playAudio(data.audio);
        } else if (data.type === 'transcript') {
          addTranscript(data.role, data.text);
        } else if (data.type === 'error') {
          console.error('Error:', data.message);
          status.textContent = '❌ Error: ' + data.message;
          status.className = 'status disconnected';
        }
      };
      
      ws.onclose = () => {
        status.textContent = '❌ Disconnected - Reconnecting...';
        status.className = 'status disconnected';
        micBtn.disabled = true;
        setTimeout(connect, 2000);
      };
    }

    // Initialize audio context
    async function initAudio() {
      audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }

    // Start recording
    async function startRecording() {
      try {
        if (!audioContext) await initAudio();
        
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
          } 
        });
        
        const source = audioContext.createMediaStreamSource(mediaStream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e) => {
          if (!isRecording) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Visualize audio
          const sum = inputData.reduce((a, b) => a + Math.abs(b), 0);
          const avg = sum / inputData.length;
          updateVisualizer(avg * 10);
          
          // Convert to 16-bit PCM
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          
          // Send as base64
          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
          ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        
        isRecording = true;
        micBtn.classList.add('recording');
        micBtn.textContent = '🔴';
        
        // Tell server we started
        ws.send(JSON.stringify({ type: 'start_recording' }));
        
      } catch (err) {
        console.error('Failed to start recording:', err);
        alert('Please allow microphone access');
      }
    }

    // Stop recording
    function stopRecording() {
      isRecording = false;
      micBtn.classList.remove('recording');
      micBtn.textContent = '🎤';
      
      if (processor) {
        processor.disconnect();
        processor = null;
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
      }
      
      updateVisualizer(0);
      
      // Tell server we stopped
      ws.send(JSON.stringify({ type: 'stop_recording' }));
    }

    // Play audio from base64
    async function playAudio(base64Audio) {
      try {
        if (!audioContext) await initAudio();
        
        // Decode base64 to PCM16
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Convert PCM16 to Float32
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768;
        }
        
        // Create audio buffer and play
        const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        
        // Visualize playback
        const duration = float32.length / 24000 * 1000;
        animatePlayback(duration);
        
      } catch (err) {
        console.error('Failed to play audio:', err);
      }
    }

    function animatePlayback(duration) {
      const start = Date.now();
      const animate = () => {
        const elapsed = Date.now() - start;
        if (elapsed < duration) {
          updateVisualizer(Math.random() * 0.5 + 0.2);
          requestAnimationFrame(animate);
        } else {
          updateVisualizer(0);
        }
      };
      animate();
    }

    function updateVisualizer(level) {
      bars.forEach((bar, i) => {
        const height = Math.max(5, level * 50 * (1 + Math.sin(i * 0.5) * 0.5));
        bar.style.height = height + 'px';
      });
    }

    function addTranscript(role, text) {
      const div = document.createElement('div');
      div.className = 'transcript-item ' + role;
      div.innerHTML = '<div class="label">' + (role === 'user' ? '👤 You' : '🤖 Agent') + '</div>' + text;
      transcript.appendChild(div);
      transcript.scrollTop = transcript.scrollHeight;
    }

    // Mic button handlers
    micBtn.addEventListener('mousedown', startRecording);
    micBtn.addEventListener('mouseup', stopRecording);
    micBtn.addEventListener('mouseleave', () => { if (isRecording) stopRecording(); });
    micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); });
    micBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRecording(); });

    connect();
  </script>
</body>
</html>
`;

// Create HTTP server
const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML_PAGE);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/voice' });

wss.on('connection', async (clientWs) => {
  console.log('🟢 Client connected');
  
  let openaiWs = null;
  let audioBuffer = [];
  
  // Connect to OpenAI Realtime API
  function connectToOpenAI() {
    const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
    
    openaiWs = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    openaiWs.on('open', () => {
      console.log('✅ Connected to OpenAI Realtime API');
      
      // Configure session
      openaiWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: AGENT_INSTRUCTIONS,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: { type: 'server_vad' }
        }
      }));
      
      // Trigger initial greeting
      setTimeout(() => {
        openaiWs.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: 'Hello' }]
          }
        }));
        openaiWs.send(JSON.stringify({ type: 'response.create' }));
      }, 500);
    });

    openaiWs.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        
        switch (event.type) {
          case 'response.audio.delta':
            // Send audio chunk to client
            if (event.delta) {
              clientWs.send(JSON.stringify({ type: 'audio', audio: event.delta }));
            }
            break;
            
          case 'response.audio_transcript.done':
            // Send agent transcript
            if (event.transcript) {
              clientWs.send(JSON.stringify({ 
                type: 'transcript', 
                role: 'agent', 
                text: event.transcript 
              }));
              console.log('🤖 Agent:', event.transcript);
            }
            break;
            
          case 'conversation.item.input_audio_transcription.completed':
            // Send user transcript
            if (event.transcript) {
              clientWs.send(JSON.stringify({ 
                type: 'transcript', 
                role: 'user', 
                text: event.transcript 
              }));
              console.log('👤 User:', event.transcript);
            }
            break;
            
          case 'error':
            console.error('OpenAI error:', event.error);
            clientWs.send(JSON.stringify({ type: 'error', message: event.error?.message || 'Unknown error' }));
            break;
        }
      } catch (err) {
        console.error('Failed to parse OpenAI message:', err);
      }
    });

    openaiWs.on('error', (err) => {
      console.error('❌ OpenAI WebSocket error:', err.message);
      clientWs.send(JSON.stringify({ type: 'error', message: 'OpenAI connection error' }));
    });

    openaiWs.on('close', () => {
      console.log('🔴 OpenAI connection closed');
    });
  }

  connectToOpenAI();

  // Handle messages from browser
  clientWs.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'audio' && openaiWs?.readyState === WebSocket.OPEN) {
        // Forward audio to OpenAI
        openaiWs.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: message.audio
        }));
      } else if (message.type === 'stop_recording' && openaiWs?.readyState === WebSocket.OPEN) {
        // Commit audio buffer when user stops talking
        openaiWs.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      }
    } catch (err) {
      console.error('Failed to process client message:', err);
    }
  });

  clientWs.on('close', () => {
    console.log('🔴 Client disconnected');
    if (openaiWs) {
      openaiWs.close();
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║     🎤 Far East Voice Agent Test Server            ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║   Open in browser: http://localhost:${PORT}           ║
║                                                    ║
║   Hold the microphone button to speak,             ║
║   release to hear the agent respond.               ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
});

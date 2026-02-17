# Far East Call Agent v2 - Improved Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CUSTOMER LAYER                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                              │
│  │ Phone   │  │ Web     │  │ Mobile  │  │ Kiosk   │  (Future)                    │
│  │ Call    │  │ Widget  │  │ App     │  │         │                              │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                              │
└───────┼────────────┼────────────┼────────────┼──────────────────────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TELEPHONY / INGRESS                                    │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────┐          │
│  │ Twilio Voice     │  │ ElevenLabs Widget │  │ WebRTC (Browser)     │          │
│  │ Media Streams    │  │ (Fallback)        │  │ (Future)             │          │
│  └────────┬─────────┘  └─────────┬─────────┘  └──────────┬───────────┘          │
│           │                      │                        │                      │
│           └──────────────────────┼────────────────────────┘                      │
│                                  ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        LOAD BALANCER (nginx/Cloudflare)                  │    │
│  │                     Rate Limiting • DDoS Protection                      │    │
│  └───────────────────────────────────┬─────────────────────────────────────┘    │
└──────────────────────────────────────┼──────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            VOICE AGENT LAYER                                     │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         VOICE AGENT CLUSTER                              │    │
│  │                                                                          │    │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                    │    │
│  │  │ Agent Pod 1 │   │ Agent Pod 2 │   │ Agent Pod N │                    │    │
│  │  │             │   │             │   │             │                    │    │
│  │  │ ┌─────────┐ │   │ ┌─────────┐ │   │ ┌─────────┐ │                    │    │
│  │  │ │Audio    │ │   │ │Audio    │ │   │ │Audio    │ │                    │    │
│  │  │ │Processor│ │   │ │Processor│ │   │ │Processor│ │                    │    │
│  │  │ │(RNNoise)│ │   │ │(RNNoise)│ │   │ │(RNNoise)│ │                    │    │
│  │  │ └────┬────┘ │   │ └────┬────┘ │   │ └────┬────┘ │                    │    │
│  │  │      │      │   │      │      │   │      │      │                    │    │
│  │  │ ┌────▼────┐ │   │ ┌────▼────┐ │   │ ┌────▼────┐ │                    │    │
│  │  │ │Session  │ │   │ │Session  │ │   │ │Session  │ │                    │    │
│  │  │ │Manager  │ │   │ │Manager  │ │   │ │Manager  │ │                    │    │
│  │  │ └────┬────┘ │   │ └────┬────┘ │   │ └────┬────┘ │                    │    │
│  │  │      │      │   │      │      │   │      │      │                    │    │
│  │  │ ┌────▼────┐ │   │ ┌────▼────┐ │   │ ┌────▼────┐ │                    │    │
│  │  │ │Tool     │ │   │ │Tool     │ │   │ │Tool     │ │                    │    │
│  │  │ │Executor │ │   │ │Executor │ │   │ │Executor │ │                    │    │
│  │  │ └─────────┘ │   │ └─────────┘ │   │ └─────────┘ │                    │    │
│  │  └─────────────┘   └─────────────┘   └─────────────┘                    │    │
│  │                                                                          │    │
│  └──────────────────────────────┬───────────────────────────────────────────┘    │
│                                 │                                                │
│  ┌──────────────────────────────┼───────────────────────────────────────────┐    │
│  │                    AI PROVIDER ORCHESTRATOR                               │    │
│  │                                                                           │    │
│  │    ┌─────────────────────────▼────────────────────────────────┐          │    │
│  │    │                   FAILOVER CONTROLLER                     │          │    │
│  │    │   Primary → Secondary → Degraded Mode                     │          │    │
│  │    └─────────────────────────┬────────────────────────────────┘          │    │
│  │                              │                                            │    │
│  │    ┌─────────────┬───────────┼───────────┬─────────────┐                 │    │
│  │    ▼             ▼           ▼           ▼             ▼                 │    │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │    │
│  │ │ OpenAI   │ │ElevenLabs│ │ Deepgram │ │  Groq    │ │ Twilio   │        │    │
│  │ │ Realtime │ │  Agents  │ │  Nova-3  │ │ Whisper  │ │  <Say>   │        │    │
│  │ │(Primary) │ │(Fallback)│ │(STT Alt) │ │(Low Lat) │ │(Degraded)│        │    │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │    │
│  │                                                                           │    │
│  └───────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SESSION & STATE LAYER                                  │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                          REDIS CLUSTER                                   │    │
│  │                                                                          │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │    │
│  │  │ Call Sessions    │  │ Rate Limiting    │  │ Real-time        │       │    │
│  │  │ TTL: 1 hour      │  │ Counters         │  │ Analytics        │       │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘       │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BUSINESS LOGIC LAYER                                    │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Order Service   │  │ Menu Service    │  │ Customer        │                  │
│  │                 │  │                 │  │ Service         │                  │
│  │ • Create order  │  │ • Get items     │  │ • Lookup        │                  │
│  │ • Modify order  │  │ • Price lookup  │  │ • Preferences   │                  │
│  │ • Cancel order  │  │ • Availability  │  │ • History       │                  │
│  │ • Send SMS      │  │ • Specials      │  │ • Loyalty       │                  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                  │
│           │                    │                    │                            │
│           └────────────────────┼────────────────────┘                            │
│                                ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        WRITE-AHEAD LOG (WAL)                             │    │
│  │             Ensures order durability before database commit               │    │
│  └───────────────────────────────────┬─────────────────────────────────────┘    │
│                                      │                                           │
└──────────────────────────────────────┼──────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                             │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                 PRIMARY DATABASE (PostgreSQL / SQLite)                   │    │
│  │                                                                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │   orders    │  │order_items  │  │ menu_items  │  │  customers  │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  │                                                                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │    │
│  │  │order_patterns│ │call_logs    │  │  analytics  │                      │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                      │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATION LAYER                                       │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ SMS (Twilio)    │  │ WebSocket       │  │ Webhook         │                  │
│  │                 │  │ (Frontend)      │  │ (Integrations)  │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                                            │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Order Dashboard │  │ Menu Management │  │ Analytics       │                  │
│  │ (Vue 3)         │  │ (Vue 3)         │  │ (Vue 3)         │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        OBSERVABILITY LAYER                                       │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Prometheus      │  │ Grafana         │  │ PagerDuty       │                  │
│  │ (Metrics)       │  │ (Dashboards)    │  │ (Alerting)      │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                          KEY METRICS                                     │    │
│  │  • Response latency (p50, p95, p99)                                     │    │
│  │  • Order completion rate                                                 │    │
│  │  • AI provider availability                                              │    │
│  │  • Error rates by type                                                   │    │
│  │  • Concurrent call count                                                 │    │
│  │  • Customer sentiment scores                                             │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Deep Dives

### 1. Voice Agent Cluster

The voice agent cluster handles all real-time audio processing and conversation management.

#### Audio Processor
```javascript
/**
 * Audio processing pipeline with noise suppression
 */
class AudioProcessor {
  constructor() {
    this.denoiser = new RNNoiseProcessor();
    this.vadDetector = new WebRTCVAD({ mode: 3 }); // Aggressive mode
  }

  async process(audioChunk) {
    // Step 1: Denoise
    const cleanAudio = await this.denoiser.process(audioChunk);
    
    // Step 2: Voice Activity Detection
    const hasVoice = this.vadDetector.detect(cleanAudio);
    
    // Step 3: Return processed audio with metadata
    return {
      audio: cleanAudio,
      hasVoice,
      timestamp: Date.now(),
      inputLevel: this.calculateRMS(audioChunk),
      outputLevel: this.calculateRMS(cleanAudio)
    };
  }
}
```

#### Session Manager
```javascript
/**
 * Manages conversation state and context
 */
class SessionManager {
  constructor(redis) {
    this.redis = redis;
  }

  async createSession(callSid, config) {
    const session = {
      id: callSid,
      startTime: Date.now(),
      state: 'greeting',
      orderItems: [],
      customerPhone: null,
      language: 'en',
      context: {},
      metrics: {
        turnCount: 0,
        latencies: [],
        errors: []
      }
    };
    
    await this.redis.setex(`session:${callSid}`, 3600, JSON.stringify(session));
    return session;
  }

  async updateSession(callSid, updates) {
    const session = await this.getSession(callSid);
    Object.assign(session, updates);
    await this.redis.setex(`session:${callSid}`, 3600, JSON.stringify(session));
    return session;
  }
}
```

### 2. AI Provider Orchestrator

The failover controller manages multiple AI providers for reliability.

```javascript
/**
 * Multi-provider AI orchestration with failover
 */
class AIProviderOrchestrator {
  constructor() {
    this.providers = [
      { name: 'openai-realtime', priority: 1, healthy: true },
      { name: 'elevenlabs', priority: 2, healthy: true },
      { name: 'twilio-say', priority: 99, healthy: true } // Degraded mode
    ];
    
    this.healthCheckInterval = 30000; // 30 seconds
    this.startHealthChecks();
  }

  async getProvider() {
    // Return highest priority healthy provider
    const available = this.providers
      .filter(p => p.healthy)
      .sort((a, b) => a.priority - b.priority);
    
    if (available.length === 0) {
      throw new Error('No AI providers available');
    }
    
    return available[0];
  }

  async executeWithFailover(operation) {
    for (const provider of this.providers.sort((a, b) => a.priority - b.priority)) {
      if (!provider.healthy) continue;
      
      try {
        return await this.execute(provider.name, operation);
      } catch (error) {
        console.error(`[AI] ${provider.name} failed:`, error.message);
        provider.healthy = false;
        
        // Schedule health check retry
        setTimeout(() => {
          this.checkHealth(provider);
        }, this.healthCheckInterval);
      }
    }
    
    throw new Error('All AI providers exhausted');
  }
}
```

### 3. Order Service with WAL

Ensures no orders are lost even during failures.

```javascript
/**
 * Order service with write-ahead logging for durability
 */
class OrderService {
  constructor(db, walPath = './wal/orders.log') {
    this.db = db;
    this.wal = new WriteAheadLog(walPath);
  }

  async createOrder(orderData) {
    // Step 1: Write to WAL first (survives crashes)
    const walEntry = await this.wal.append({
      type: 'CREATE_ORDER',
      timestamp: Date.now(),
      data: orderData
    });

    try {
      // Step 2: Write to database
      const result = await this.db.createOrderAtomic(orderData);
      
      // Step 3: Mark WAL entry as committed
      await this.wal.commit(walEntry.id);
      
      // Step 4: Trigger notifications
      await this.notifyOrderCreated(result);
      
      return result;
    } catch (error) {
      // Order is still in WAL, will be recovered on restart
      console.error('[Order] Database write failed, order preserved in WAL');
      throw error;
    }
  }

  async recoverFromWAL() {
    const uncommitted = await this.wal.getUncommitted();
    
    for (const entry of uncommitted) {
      console.log(`[Order] Recovering order from WAL: ${entry.id}`);
      await this.createOrder(entry.data);
    }
  }
}
```

### 4. Customer Intelligence Service

Personalization through order history and preferences.

```javascript
/**
 * Customer intelligence for personalized experiences
 */
class CustomerService {
  constructor(db) {
    this.db = db;
  }

  async getCustomerContext(phoneNumber) {
    const profile = await this.db.getCustomerProfile(phoneNumber);
    
    if (!profile) {
      return {
        isNewCustomer: true,
        greeting: 'standard',
        recommendations: []
      };
    }

    // Build context for AI agent
    return {
      isNewCustomer: false,
      orderCount: profile.orderCount,
      preferredLanguage: profile.preferredLanguage,
      lastOrderDate: profile.lastOrderDate,
      favoriteItems: await this.getTopItems(phoneNumber, 3),
      averageOrderValue: profile.averageOrderValue,
      greeting: 'returning',
      recommendations: await this.getRecommendations(phoneNumber)
    };
  }

  async getRecommendations(phoneNumber) {
    // Get items frequently ordered together
    const patterns = await this.db.getOrderPatterns(phoneNumber);
    
    return patterns.map(p => ({
      item: p.itemName,
      confidence: p.frequency / p.totalOrders,
      suggestion: `Based on your usual order, would you like ${p.itemName}?`
    }));
  }
}
```

---

## Data Models

### Enhanced Database Schema

```sql
-- Core tables (existing)
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  order_type TEXT DEFAULT 'pickup',
  total REAL NOT NULL,
  notes TEXT,
  scheduled_pickup_time DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  menu_item_id INTEGER,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  size TEXT,
  unit_price REAL NOT NULL,
  total REAL NOT NULL,
  notes TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- NEW: Customer profiles for personalization
CREATE TABLE customer_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL UNIQUE,
  preferred_language TEXT DEFAULT 'en',
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_order_at DATETIME,
  total_orders INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  average_order_value REAL DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NEW: Customer preferences (learned over time)
CREATE TABLE customer_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  preference_type TEXT NOT NULL, -- 'favorite_item', 'dietary', 'spice_level', etc.
  preference_value TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(id)
);

-- NEW: Call logs for analytics
CREATE TABLE call_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  call_sid TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  started_at DATETIME NOT NULL,
  ended_at DATETIME,
  duration_seconds INTEGER,
  ai_provider TEXT,
  order_id INTEGER,
  transcript TEXT,
  sentiment_score REAL,
  latency_avg_ms REAL,
  latency_p95_ms REAL,
  error_count INTEGER DEFAULT 0,
  transfer_requested BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- NEW: Write-ahead log entries (for recovery)
CREATE TABLE wal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_type TEXT NOT NULL,
  payload TEXT NOT NULL,  -- JSON
  status TEXT DEFAULT 'pending', -- pending, committed, failed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  committed_at DATETIME
);

-- Indexes for performance
CREATE INDEX idx_orders_phone ON orders(phone_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_customer_phone ON customer_profiles(phone_number);
CREATE INDEX idx_call_logs_started ON call_logs(started_at);
```

---

## API Contracts

### Internal Service APIs

#### Order Service
```typescript
interface OrderService {
  // Create new order with WAL protection
  createOrder(data: CreateOrderInput): Promise<Order>;
  
  // Lookup for modifications
  getOrdersByPhone(phone: string): Promise<Order[]>;
  
  // Order modifications
  addItem(orderNumber: string, item: OrderItem): Promise<Order>;
  removeItem(orderNumber: string, itemName: string, qty?: number): Promise<Order>;
  cancelOrder(orderNumber: string): Promise<void>;
}

interface CreateOrderInput {
  phoneNumber: string;
  items: OrderItem[];
  notes?: string;
  totalPrice: number;
  scheduledPickupTime?: string; // ISO datetime
}
```

#### Customer Service
```typescript
interface CustomerService {
  // Get customer context for personalization
  getContext(phone: string): Promise<CustomerContext>;
  
  // Update preferences after order
  updatePreferences(phone: string, order: Order): Promise<void>;
  
  // Get recommendations
  getRecommendations(phone: string): Promise<Recommendation[]>;
}

interface CustomerContext {
  isNewCustomer: boolean;
  preferredLanguage: string;
  orderCount: number;
  favoriteItems: string[];
  lastOrderDate?: Date;
  greeting: 'standard' | 'returning' | 'vip';
}
```

#### Metrics Service
```typescript
interface MetricsService {
  // Record latency measurement
  recordLatency(callSid: string, latencyMs: number): void;
  
  // Record error
  recordError(callSid: string, error: Error): void;
  
  // Get metrics for dashboard
  getMetrics(timeRange: TimeRange): Promise<Metrics>;
}

interface Metrics {
  callVolume: number;
  avgLatency: number;
  p95Latency: number;
  errorRate: number;
  orderCompletionRate: number;
  avgOrderValue: number;
}
```

---

## Deployment Architecture

### Docker Compose (Development)
```yaml
version: '3.8'

services:
  voice-agent:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/fareast
    depends_on:
      - redis
      - db
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://voice-agent:8080
      - VITE_WS_URL=ws://voice-agent:8080
    depends_on:
      - voice-agent

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=fareast
      - POSTGRES_PASSWORD=postgres
    volumes:
      - pg_data:/var/lib/postgresql/data

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  redis_data:
  pg_data:
```

### Kubernetes (Production)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: voice-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: voice-agent
  template:
    metadata:
      labels:
        app: voice-agent
    spec:
      containers:
        - name: voice-agent
          image: fareast/voice-agent:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          env:
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: api-keys
                  key: openai
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                                        │
│ • Cloudflare DDoS protection                                    │
│ • IP allowlisting for admin endpoints                           │
│ • TLS 1.3 for all connections                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: API Security                                            │
│ • Rate limiting (10 calls/min per IP)                           │
│ • Request validation & sanitization                             │
│ • Twilio signature verification                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Application Security                                    │
│ • Prompt injection detection (FAREAST-18)                       │
│ • Topic restriction guardrails (FAREAST-16)                     │
│ • System prompt protection (FAREAST-17)                         │
│ • Credit card number blocking                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Data Security                                           │
│ • Encryption at rest (AES-256)                                  │
│ • PII masking in logs                                           │
│ • Automatic data retention policies                             │
│ • Secure credential storage (Vault/AWS Secrets)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Alerting

### Key Dashboards

#### 1. Real-time Operations Dashboard
- Active calls count
- Calls per minute
- Average response latency (target: <500ms)
- AI provider status

#### 2. Business Metrics Dashboard
- Orders per hour
- Revenue today vs yesterday
- Order completion rate
- Average order value

#### 3. Quality Dashboard
- Customer sentiment trends
- Human transfer rate
- Order modification rate
- Error rate by type

### Alert Rules (PagerDuty)

```yaml
alerts:
  - name: HighLatency
    condition: latency_p95 > 1000ms for 5 minutes
    severity: warning
    
  - name: CriticalLatency
    condition: latency_p95 > 2000ms for 2 minutes
    severity: critical
    
  - name: AIProviderDown
    condition: primary_ai_healthy == false for 1 minute
    severity: critical
    
  - name: HighErrorRate
    condition: error_rate > 5% for 5 minutes
    severity: warning
    
  - name: DatabaseConnectionFailed
    condition: db_connection_failures > 0 for 30 seconds
    severity: critical
```

---

## Testing Strategy

### Test Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │  5%
                    │  (Voice Agent   │
                    │   Tester)       │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │     Integration Tests       │  25%
              │  (API, Database, WebSocket) │
              └──────────────┬──────────────┘
                             │
    ┌────────────────────────┴────────────────────────┐
    │                 Unit Tests                       │  70%
    │  (Services, Utilities, Components)              │
    └─────────────────────────────────────────────────┘
```

### Voice Agent Test Scenarios (Existing)
1. Regular order
2. Impatient customer
3. Rude customer
4. Off-menu request
5. Delivery request (tests rejection)
6. Prompt injection attempt
7. Indecisive customer
8. Complex substitution
9. Specialty item (A1-A8)
10. Allergen/medical questions

### New Test Categories (Recommended)
11. Multi-language conversation
12. Returning customer with preferences
13. Order modification flow
14. AI failover scenario
15. High-latency network conditions

---

## Conclusion

This architecture provides:

1. **Reliability**: Multi-provider failover, WAL for order durability
2. **Scalability**: Stateless agents with Redis session store, PostgreSQL-ready
3. **Observability**: Comprehensive metrics and alerting
4. **Security**: Defense in depth from network to application layer
5. **Intelligence**: Customer personalization and conversation memory

The system can handle 100+ concurrent calls with proper infrastructure while maintaining sub-500ms response latency.

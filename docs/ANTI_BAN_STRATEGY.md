# Anti-Ban Strategy Documentation

## Overview

Dokumen ini menjelaskan strategi untuk menghindari pemblokiran nomor WhatsApp menggunakan **Baileys library** pada Durable Objects.

> ⚠️ **PENTING**: WhatsApp secara aktif mendeteksi dan memblokir nomor yang melakukan automasi tidak natural. Implementasi anti-ban adalah **WAJIB**.

---

## 1. Mengapa Nomor Diblokir?

| Penyebab | Indikator |
|----------|-----------|
| **Pengiriman terlalu cepat** | > 20 pesan/menit tanpa jeda |
| **Pola tidak natural** | Pesan identik ke banyak nomor |
| **Tidak ada interaksi** | Hanya kirim, tidak pernah terima |
| **Laporan spam** | User report nomor sebagai spam |
| **Nomor baru + volume tinggi** | Fresh number langsung blast 1000+ pesan |

---

## 2. Baileys Anti-Ban Features

### 2.1 Presence Update

Baileys menyediakan API untuk mengatur presence (status online/typing):

```typescript
// Set online status
await sock.sendPresenceUpdate('available');

// Set typing indicator
await sock.sendPresenceUpdate('composing', jid);

// Stop typing
await sock.sendPresenceUpdate('paused', jid);

// Set offline
await sock.sendPresenceUpdate('unavailable');
```

### 2.2 Presence Subscribe

Sebelum kirim typing, subscribe ke presence contact:

```typescript
await sock.presenceSubscribe(jid);
```

### 2.3 Read Receipt

Menandai pesan sebagai sudah dibaca:

```typescript
await sock.readMessages([messageKey]);
```

---

## 3. Alur Pengiriman Pesan (Safe)

```
┌─────────────────┐
│  Pesan Disiapkan│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ presenceSubscribe│ ← Subscribe ke contact
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ sendPresence    │ ← 'composing' (sedang mengetik)
│ ('composing')   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Wait: 1-5 detik │ ← Delay natural (based on message length)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ sendMessage()   │ ← Kirim pesan
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ sendPresence    │ ← 'paused' (berhenti mengetik)
│ ('paused')      │
└────────┬────────┘
         │
         ▼
   ┌─────┴─────┐
   │ Ada pesan │
   │  lagi?    │
   └─────┬─────┘
    Ya   │   Tidak
    ▼    │    ▼
┌────────┐   ┌───────┐
│ Wait   │   │ Selesai│
│ 5-30s  │   └───────┘
└───┬────┘
    │
    └──────────► (Loop ke presenceSubscribe)
```

---

## 4. Implementasi dengan Baileys

### 4.1 Core Anti-Ban Function

```typescript
// src/utils/anti-ban.ts

export interface AntiBanConfig {
  enabled: boolean;
  typingMin: number; // seconds
  typingMax: number; // seconds
  sendReadReceipt: boolean;
}

export async function sendWithAntiBan(
  sock: WASocket,
  jid: string,
  message: string | AnyMessageContent,
  config: AntiBanConfig
): Promise<void> {
  // Skip if disabled
  if (!config.enabled) {
    await sock.sendMessage(jid, 
      typeof message === 'string' ? { text: message } : message
    );
    return;
  }
  
  try {
    // 1. Subscribe to presence updates for this contact
    await sock.presenceSubscribe(jid);
    
    // 2. Set ourselves as online
    await sock.sendPresenceUpdate('available');
    
    // 3. Start typing indicator
    await sock.sendPresenceUpdate('composing', jid);
    
    // 4. Calculate natural typing delay
    const messageText = typeof message === 'string' 
      ? message 
      : (message as any).text || '';
    const delay = calculateTypingDelay(messageText, config);
    
    await sleep(delay);
    
    // 5. Send the actual message
    await sock.sendMessage(jid, 
      typeof message === 'string' ? { text: message } : message
    );
    
    // 6. Stop typing indicator
    await sock.sendPresenceUpdate('paused', jid);
    
  } catch (error) {
    console.error('Anti-ban send failed:', error);
    // Fallback to direct send
    await sock.sendMessage(jid, 
      typeof message === 'string' ? { text: message } : message
    );
  }
}

function calculateTypingDelay(
  message: string, 
  config: AntiBanConfig
): number {
  const { typingMin, typingMax } = config;
  
  // Calculate based on message length
  const words = message.split(/\s+/).length;
  const chars = message.length;
  
  // Average typing speed: 40 words/min or 200 chars/min
  const wordBasedMs = (words / 40) * 60 * 1000;
  const charBasedMs = (chars / 200) * 60 * 1000;
  
  // Use average of both methods
  const baseMs = (wordBasedMs + charBasedMs) / 2;
  
  // Clamp to min-max range
  const minMs = typingMin * 1000;
  const maxMs = typingMax * 1000;
  const clampedMs = Math.max(minMs, Math.min(baseMs, maxMs));
  
  // Add ±20% randomness for natural feel
  const randomFactor = 0.8 + Math.random() * 0.4;
  
  return Math.round(clampedMs * randomFactor);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 4.2 Durable Object Integration

```typescript
// src/durable-objects/WhatsAppSession.ts

export class WhatsAppSession {
  private sock: WASocket | null = null;
  private config: AntiBanConfig = {
    enabled: true,
    typingMin: 1,
    typingMax: 3,
    sendReadReceipt: true
  };
  
  async handleSendMessage(request: Request): Promise<Response> {
    const { chatId, message, useAntiBan = true } = await request.json();
    
    if (!this.sock) {
      return Response.json({ error: 'Not connected' }, { status: 400 });
    }
    
    const jid = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
    
    if (useAntiBan && this.config.enabled) {
      await sendWithAntiBan(this.sock, jid, message, this.config);
    } else {
      await this.sock.sendMessage(jid, { text: message });
    }
    
    return Response.json({ success: true });
  }
  
  async handleUpdateConfig(request: Request): Promise<Response> {
    const newConfig = await request.json();
    this.config = { ...this.config, ...newConfig };
    
    // Persist to storage
    await this.state.storage.put('antiBanConfig', this.config);
    
    return Response.json({ success: true, config: this.config });
  }
}
```

### 4.3 Broadcast Queue Consumer

```typescript
// src/queue-handlers/broadcast.ts

export async function handleBroadcastBatch(
  batch: MessageBatch<BroadcastItem>,
  env: Env
): Promise<void> {
  for (const msg of batch.messages) {
    const item = msg.body;
    
    try {
      // Get the Durable Object for this device
      const id = env.WHATSAPP_SESSION.idFromName(item.deviceId);
      const stub = env.WHATSAPP_SESSION.get(id);
      
      // Send with anti-ban enabled
      const response = await stub.fetch(new Request('http://internal/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: item.phone,
          message: item.renderedMessage,
          useAntiBan: true
        })
      }));
      
      if (!response.ok) {
        throw new Error(`Send failed: ${response.status}`);
      }
      
      // Update database status
      await updateCampaignItemStatus(env.DB, item.id, 'sent');
      
      // Wait between messages (rate limiting for blast)
      const gap = calculateMessageGap(item.rateConfig);
      await sleep(gap);
      
      msg.ack();
      
    } catch (error) {
      console.error('Broadcast item failed:', error);
      await updateCampaignItemStatus(env.DB, item.id, 'failed', error.message);
      msg.ack(); // Don't retry, mark as failed
    }
  }
}

function calculateMessageGap(config: RateConfig): number {
  const { minGap, maxGap } = config;
  
  // Random gap between min and max (in seconds)
  let gap = minGap + Math.random() * (maxGap - minGap);
  
  // 10% chance of longer pause (2x) for more natural pattern
  if (Math.random() < 0.1) {
    gap *= 2;
  }
  
  return gap * 1000; // Convert to ms
}

interface RateConfig {
  minGap: number; // seconds
  maxGap: number; // seconds
}
```

---

## 5. Konfigurasi Delay

### 5.1 Per Fitur

| Fitur | Typing Delay | Message Gap | Alasan |
|-------|--------------|-------------|--------|
| **Flow Response** | 1-3 detik | - | Natural reply speed |
| **AI Response** | 3-5 detik | - | Seolah "berpikir" |
| **Blast (Safe)** | 3-5 detik | 30-60 detik | Fresh account |
| **Blast (Normal)** | 2-4 detik | 10-30 detik | Established account |
| **Blast (Fast)** | 1-2 detik | 5-10 detik | Business verified |

### 5.2 Database Schema

```sql
-- Anti-ban config per device
ALTER TABLE devices ADD COLUMN anti_ban_config TEXT DEFAULT '{
  "enabled": true,
  "typingMin": 1,
  "typingMax": 3,
  "sendReadReceipt": true
}';

-- Rate config per campaign
ALTER TABLE campaigns ADD COLUMN rate_config TEXT DEFAULT '{
  "minGap": 10,
  "maxGap": 30
}';
```

---

## 6. UI Settings

### 6.1 Device Anti-Ban Settings

```
Device Settings > Anti-Ban Protection

┌─────────────────────────────────────────────────────┐
│ 🛡️ Anti-Ban Protection                              │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [✓] Enable Typing Simulation                        │
│                                                      │
│     Min Delay: [  1  ] seconds                      │
│     Max Delay: [  3  ] seconds                      │
│                                                      │
│ [✓] Send Read Receipt Before Reply                  │
│                                                      │
│ ─────────────────────────────────────────────────── │
│                                                      │
│ ⚠️ Disabling these features may cause your number   │
│    to be blocked by WhatsApp.                       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 6.2 Campaign Rate Settings

```
Create Campaign > Rate Settings

┌─────────────────────────────────────────────────────┐
│ ⏱️ Sending Speed                                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Speed Preset:                                        │
│ (•) Safe - 30-60 sec gap (Recommended for new #)    │
│ ( ) Normal - 10-30 sec gap                          │
│ ( ) Fast - 5-10 sec gap (Business verified only)    │
│ ( ) Custom                                          │
│                                                      │
│ ─────────── If Custom ───────────                   │
│                                                      │
│ Typing Delay:  [  2  ] - [  4  ] seconds            │
│ Message Gap:   [ 15  ] - [ 30  ] seconds            │
│                                                      │
│ Estimated completion: ~2 hours for 500 contacts     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 7. Monitoring & Alerts

### 7.1 Health Score

Track "health" nomor WhatsApp:

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Success Rate | > 95% | 80-95% | < 80% |
| Response Time | < 5s | 5-15s | > 15s |
| Blocked Contacts | 0 | 1-2/day | > 3/day |

### 7.2 Auto-Pause Campaign

```typescript
// Auto-pause if error rate too high
async function checkCampaignHealth(
  env: Env, 
  campaignId: string
): Promise<void> {
  const stats = await getCampaignStats(env.DB, campaignId);
  
  const errorRate = stats.failed / (stats.sent + stats.failed);
  
  if (errorRate > 0.2) { // > 20% error rate
    await pauseCampaign(env.DB, campaignId);
    await sendAlert(env, {
      type: 'warning',
      message: `Campaign ${campaignId} paused due to high error rate (${errorRate * 100}%)`,
      action: 'Review and adjust settings before resuming'
    });
  }
}
```

### 7.3 Connection Health

```typescript
// Monitor connection in Durable Object
sock.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect } = update;
  
  if (connection === 'close') {
    const reason = (lastDisconnect?.error as any)?.output?.statusCode;
    
    if (reason === DisconnectReason.loggedOut) {
      // User logged out - need to re-scan QR
      await this.notifyDisconnected('logged_out');
    } else if (reason === DisconnectReason.banned) {
      // Number is banned!
      await this.notifyDisconnected('banned');
      await sendAlert(this.env, {
        type: 'critical',
        message: `Device ${this.deviceId} has been BANNED by WhatsApp`,
        action: 'Contact WhatsApp support or use a different number'
      });
    } else {
      // Try to reconnect
      await this.reconnect();
    }
  }
});
```

---

## 8. Best Practices

### Do's ✅

1. **Warm up nomor baru** - Mulai dengan volume rendah (50/hari), naikkan bertahap
2. **Variasikan pesan** - Gunakan template dengan variabel `{{name}}`
3. **Respond ke replies** - Jangan ignore pesan masuk
4. **Gunakan business account** - Lebih toleran untuk broadcast
5. **Set jadwal realistis** - Jangan kirim tengah malam
6. **Monitor health score** - Pause jika error rate tinggi

### Don'ts ❌

1. **Jangan kirim identik** - Hindari pesan 100% sama ke semua orang
2. **Jangan terlalu cepat** - Min 5 detik antar pesan untuk blast
3. **Jangan ignore blocks** - Jika diblokir, stop dan evaluasi
4. **Jangan skip typing** - Selalu gunakan typing simulation
5. **Jangan blast fresh number** - Warm up minimal 1 minggu dulu
6. **Jangan kirim 24/7** - Beri jeda istirahat seperti manusia

---

## 9. Troubleshooting

| Issue | Kemungkinan Penyebab | Solusi |
|-------|---------------------|--------|
| Pesan tidak terkirim | Rate limited | Lambatkan gap, tunggu 1 jam |
| QR terus muncul | Session expired | Scan ulang, cek R2 storage |
| "Logged out" | Banned temporary | Tunggu 24 jam, kurangi volume |
| Banned permanent | Terlalu banyak spam report | Ganti nomor, perbaiki strategi |

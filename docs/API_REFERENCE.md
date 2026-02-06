# API Reference Documentation

## Overview

CloudWA Flow menyediakan REST API untuk semua operasi. API menggunakan JSON untuk request/response dan JWT untuk autentikasi.

---

## 1. Authentication

### 1.1 Login

```http
POST /api/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "usr_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin",
      "tenantId": "ten_456"
    }
  }
}
```

### 1.2 Headers

Semua request yang memerlukan autentikasi harus menyertakan:

```http
Authorization: Bearer <token>
```

---

## 2. Devices (WhatsApp Gateway)

### 2.1 List Devices

```http
GET /api/devices
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "dev_123",
      "phoneNumber": "6281234567890",
      "displayName": "CS Bot",
      "sessionStatus": "connected",
      "connectedAt": "2026-02-06T10:00:00Z"
    }
  ]
}
```

### 2.2 Create Device (Get QR Code)

```http
POST /api/devices
```

**Request:**
```json
{
  "displayName": "My WhatsApp Bot"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dev_123",
    "sessionStatus": "scanning",
    "qrCode": "data:image/png;base64,..."
  }
}
```

### 2.3 Get Device Status

```http
GET /api/devices/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dev_123",
    "phoneNumber": "6281234567890",
    "displayName": "CS Bot",
    "sessionStatus": "connected",
    "antiBanConfig": {
      "enabled": true,
      "typingMin": 1,
      "typingMax": 3
    },
    "aiFallback": {
      "enabled": true,
      "knowledgeBaseIds": ["kb_123", "kb_456"],
      "systemPrompt": "Kamu adalah asisten toko online..."
    }
  }
}
```

### 2.4 Update Device Settings

```http
PATCH /api/devices/:id
```

**Request:**
```json
{
  "displayName": "Updated Name",
  "antiBanConfig": {
    "enabled": true,
    "typingMin": 2,
    "typingMax": 4
  },
  "aiFallback": {
    "enabled": true,
    "knowledgeBaseIds": ["kb_123"]
  }
}
```

### 2.5 Disconnect Device

```http
DELETE /api/devices/:id
```

---

## 3. Flows (Chatbot)

### 3.1 List Flows

```http
GET /api/devices/:deviceId/flows
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "flow_123",
      "name": "Welcome Flow",
      "triggerKeywords": ["halo", "hai", "menu"],
      "isActive": true,
      "version": 3,
      "updatedAt": "2026-02-06T10:00:00Z"
    }
  ]
}
```

### 3.2 Create Flow

```http
POST /api/devices/:deviceId/flows
```

**Request:**
```json
{
  "name": "Welcome Flow",
  "description": "Greet new users",
  "triggerKeywords": ["halo", "hai"],
  "flowJson": {
    "nodes": [
      {
        "id": "start",
        "type": "start",
        "position": { "x": 0, "y": 0 },
        "data": {}
      },
      {
        "id": "msg_1",
        "type": "message",
        "position": { "x": 0, "y": 100 },
        "data": {
          "text": "Halo! Selamat datang 👋",
          "buttons": [
            { "id": "info", "text": "Info Produk" },
            { "id": "order", "text": "Pesan Sekarang" }
          ]
        }
      }
    ],
    "edges": [
      { "source": "start", "target": "msg_1" }
    ]
  }
}
```

### 3.3 Update Flow

```http
PUT /api/devices/:deviceId/flows/:flowId
```

### 3.4 Activate/Deactivate Flow

```http
PATCH /api/devices/:deviceId/flows/:flowId/activate
```

**Request:**
```json
{
  "isActive": true
}
```

### 3.5 Delete Flow

```http
DELETE /api/devices/:deviceId/flows/:flowId
```

---

## 4. Contacts

### 4.1 List Contacts

```http
GET /api/contacts?page=1&limit=50&search=john&tags=vip
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "con_123",
      "phone": "6281234567890",
      "name": "John Doe",
      "tags": ["vip", "customer"],
      "lastContacted": "2026-02-06T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1234
  }
}
```

### 4.2 Import Contacts

```http
POST /api/contacts/import
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: CSV file
- `mapping`: `{"phone": "nomor", "name": "nama"}`

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 150,
    "duplicates": 10,
    "errors": 2
  }
}
```

### 4.3 Create Contact

```http
POST /api/contacts
```

**Request:**
```json
{
  "phone": "6281234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "tags": ["customer"],
  "customAttributes": {
    "company": "ACME Inc"
  }
}
```

---

## 5. Campaigns (Broadcast)

### 5.1 List Campaigns

```http
GET /api/campaigns?status=completed
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "camp_123",
      "name": "Promo Weekend",
      "status": "completed",
      "totalContacts": 1000,
      "sentCount": 980,
      "failedCount": 20,
      "scheduledAt": null,
      "completedAt": "2026-02-06T15:00:00Z"
    }
  ]
}
```

### 5.2 Create Campaign

```http
POST /api/campaigns
```

**Request:**
```json
{
  "name": "Promo Weekend",
  "deviceId": "dev_123",
  "contactIds": ["con_1", "con_2", "con_3"],
  "messageTemplate": "Halo {{name}}! 🎉\n\nPromo spesial weekend diskon 50%!\n\nKunjungi toko kami sekarang.",
  "mediaUrl": "https://r2.cloudwa.app/media/promo.jpg",
  "mediaType": "image",
  "scheduledAt": "2026-02-07T09:00:00Z",
  "rateConfig": {
    "typingDelay": 3,
    "messageGap": 15
  }
}
```

### 5.3 Start Campaign

```http
POST /api/campaigns/:id/start
```

### 5.4 Pause Campaign

```http
POST /api/campaigns/:id/pause
```

### 5.5 Get Campaign Progress

```http
GET /api/campaigns/:id/progress
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "processing",
    "progress": 45,
    "sentCount": 450,
    "failedCount": 5,
    "queuedCount": 545,
    "estimatedCompletion": "2026-02-06T16:30:00Z"
  }
}
```

---

## 6. Knowledge Base (AI/RAG)

### 6.1 List Documents

```http
GET /api/knowledge-base
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "kb_123",
      "filename": "FAQ.pdf",
      "fileType": "pdf",
      "status": "ready",
      "totalChunks": 45,
      "uploadedAt": "2026-02-06T10:00:00Z"
    }
  ]
}
```

### 6.2 Upload Document

```http
POST /api/knowledge-base/upload
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: PDF/TXT file

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "kb_123",
    "filename": "FAQ.pdf",
    "status": "processing"
  }
}
```

### 6.3 Check Processing Status

```http
GET /api/knowledge-base/:id/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ready",
    "totalChunks": 45,
    "processingTime": 12.5
  }
}
```

### 6.4 Query Knowledge Base (Test)

```http
POST /api/knowledge-base/query
```

**Request:**
```json
{
  "question": "Berapa harga produk X?",
  "knowledgeBaseIds": ["kb_123", "kb_456"],
  "topK": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Harga produk X adalah Rp 150.000. Produk ini tersedia dalam 3 varian warna.",
    "sources": [
      {
        "docId": "kb_123",
        "chunkId": "chunk_45",
        "content": "Produk X: Rp 150.000...",
        "score": 0.92
      }
    ]
  }
}
```

### 6.5 Delete Document

```http
DELETE /api/knowledge-base/:id
```

---

## 7. Messages

### 7.1 Get Chat History

```http
GET /api/devices/:deviceId/messages?contact=6281234567890&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg_123",
      "direction": "incoming",
      "content": "Halo, mau tanya produk",
      "timestamp": "2026-02-06T10:00:00Z"
    },
    {
      "id": "msg_124",
      "direction": "outgoing",
      "content": "Halo! Ada yang bisa dibantu?",
      "timestamp": "2026-02-06T10:00:05Z",
      "flowId": "flow_123"
    }
  ]
}
```

### 7.2 Send Message (Manual)

```http
POST /api/devices/:deviceId/messages/send
```

**Request:**
```json
{
  "chatId": "6281234567890@c.us",
  "type": "text",
  "content": "Terima kasih sudah menghubungi kami!"
}
```

---

## 8. Webhooks (Incoming)

### 8.1 WAHA Webhook Handler

```http
POST /api/webhook/waha
X-Api-Key: <WAHA_WEBHOOK_SECRET>
```

**Payload (Message):**
```json
{
  "event": "message",
  "session": "default",
  "payload": {
    "id": "ABCD1234",
    "from": "6281234567890@c.us",
    "body": "Halo",
    "timestamp": 1707200000,
    "hasMedia": false
  }
}
```

**Payload (Session Status):**
```json
{
  "event": "session.status",
  "session": "default",
  "payload": {
    "status": "CONNECTED"
  }
}
```

---

## 9. Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": {
      "field": "phone",
      "value": "invalid"
    }
  }
}
```

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | No permission for resource |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `DEVICE_DISCONNECTED` | 400 | WhatsApp not connected |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 10. Rate Limits

| Endpoint | Limit |
|----------|-------|
| Auth endpoints | 10 req/min |
| API endpoints | 100 req/min |
| Message sending | 50 req/min per device |
| File upload | 10 req/min |

Response header ketika di-limit:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1707200060
```

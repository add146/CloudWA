# CloudWA Flow - Product Requirement Document (PRD)

**Versi:** 1.0  
**Tanggal:** 6 Februari 2026  
**Status:** Draft

---

## 1. Ringkasan Eksekutif

**CloudWA Flow** adalah platform SaaS WhatsApp All-in-One berbasis Cloudflare yang menggabungkan:
- **WhatsApp Gateway** - Koneksi multi-device dengan anti-ban protection
- **Visual Flow Builder** - No-code chatbot builder dengan drag-and-drop
- **AI Assistant (RAG)** - Chatbot cerdas berbasis knowledge base
- **Blast Engine** - Broadcast massal dengan rate limiting

### Target Pengguna

| Segmen | Kebutuhan Utama |
|--------|-----------------|
| **UMKM** | Otomatisasi chat murah tanpa server |
| **Agency** | Multi-tenant untuk kelola banyak klien |
| **Customer Support** | Auto-reply 24/7 |
| **Developer** | Basis kode untuk resell |

---

## 2. Masalah yang Diselesaikan

1. **Biaya Tinggi** → Serverless (bayar per-use, bukan bulanan)
2. **Fragmentasi Tools** → Semua fitur dalam satu platform
3. **Hambatan Teknis** → Visual builder tanpa coding
4. **Risiko Banned** → Anti-ban dengan typing simulation

---

## 3. Fitur MVP

### 3.1 Dashboard SaaS & Multi-Tenancy
- Registrasi & login dengan email/Google
- Manajemen subscription (Free/Pro/Business)
- Isolasi data per tenant
- Role-based access (Admin/Operator)

### 3.2 WhatsApp Gateway
- Scan QR Code untuk connect
- Multi-device support
- Auto-reconnect
- Webhook untuk pesan masuk/keluar
- **Anti-ban protection** (typing simulation, presence)

### 3.3 Visual Flow Builder
- Drag-and-drop nodes
- Tipe nodes: Message, Input, Condition, AI, API Call, Delay
- Trigger by keyword
- Export/import flow JSON
- Test mode sebelum aktivasi

### 3.4 AI Assistant & Knowledge Base (RAG)
- Upload dokumen (PDF/TXT)
- Chunking & embedding otomatis
- Vector search untuk konteks
- LLM generate jawaban natural
- **Hybrid mode**: AI Node dalam Flow + AI Fallback

### 3.5 Blast Engine
- Import kontak (CSV/Excel)
- Template pesan dengan variabel
- Scheduling & rate limiting
- Progress monitoring real-time
- Retry mechanism untuk pesan gagal

---

## 4. User Stories

### Sebagai Pemilik UMKM
- Saya ingin **connect WhatsApp bisnis** tanpa perlu VPS
- Saya ingin **membuat bot FAQ** tanpa coding
- Saya ingin **broadcast promo** ke semua pelanggan

### Sebagai Agency
- Saya ingin **mengelola banyak klien** dalam satu dashboard
- Saya ingin **white-label** aplikasi dengan branding sendiri
- Saya ingin **export laporan** untuk klien

### Sebagai Customer Support
- Saya ingin **bot auto-reply 24/7**
- Saya ingin **escalate ke human** jika bot tidak bisa jawab
- Saya ingin **lihat history chat** per customer

### Sebagai Developer
- Saya ingin **akses API** untuk integrasi custom
- Saya ingin **webhook** untuk event notification
- Saya ingin **JSON editor** untuk advanced flow

---

## 5. Non-Functional Requirements

| Aspek | Requirement |
|-------|-------------|
| **Availability** | 99.9% uptime |
| **Latency** | < 200ms response time |
| **Scalability** | Handle 10K+ concurrent users |
| **Security** | End-to-end encryption, data isolation |
| **Compliance** | GDPR-ready data handling |

---

## 6. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| User Activation | 60% | Complete onboarding |
| Device Connection | 80% | QR scan success |
| Flow Creation | 3 flows/user | Database query |
| Broadcast Delivery | 95% | Campaign reports |
| AI Accuracy | 80% | User feedback |

---

## 7. Timeline

| Phase | Durasi | Deliverable |
|-------|--------|-------------|
| **Foundation** | 2 minggu | Auth, Multi-tenant, Dashboard |
| **Gateway** | 2 minggu | WhatsApp connection, WAHA integration |
| **Flow Builder** | 3 minggu | Visual editor, execution engine |
| **Broadcast** | 2 minggu | Contact management, queue-based blast |
| **AI/RAG** | 2 minggu | Knowledge base, AI-powered replies |
| **Polish** | 1 minggu | UI refinement, testing |

**Total: 12 minggu**

---

## 8. Referensi

- [WAHA WhatsApp HTTP API](https://waha.devlike.pro/docs/overview/introduction/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [React Flow](https://reactflow.dev/)
- [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/)

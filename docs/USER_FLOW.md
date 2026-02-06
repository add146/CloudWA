# User Flow Documentation

## Overview

Dokumen ini menjelaskan alur pengguna (user flow) untuk setiap fitur utama CloudWA Flow.

---

## 1. Onboarding & Setup

```
Landing Page → Daftar → Verifikasi Email → Pilih Paket → Pembayaran → Dashboard
```

### Langkah Detail

| Step | Aksi User | Response Sistem |
|------|-----------|-----------------|
| 1 | Akses landing page | Tampilkan halaman marketing |
| 2 | Klik "Daftar" | Form registrasi (Email, Password, Nama Bisnis) |
| 3 | Submit form | Kirim email verifikasi |
| 4 | Klik link verifikasi | Redirect ke pilih paket |
| 5 | Pilih paket | Tampilkan pembayaran (jika berbayar) |
| 6 | Selesai pembayaran | Redirect ke Dashboard |

---

## 2. Koneksi WhatsApp (Gateway)

```
Dashboard → Tambah Device → Scan QR → Device Connected → Siap Digunakan
```

### Langkah Detail

| Step | Aksi User | Response Sistem |
|------|-----------|-----------------|
| 1 | Klik "Tambah Device" | Generate QR Code via WAHA |
| 2 | Buka WhatsApp HP → Linked Devices | Tampilkan QR di layar |
| 3 | Scan QR Code | Establish connection ke WAHA |
| 4 | Sukses connect | Status "Connected", simpan session ke R2 |
| 5 | Device siap | Aktifkan fitur Flow & Blast |

### Error Handling

| Error | Handling |
|-------|----------|
| QR Expired | Generate ulang QR dengan countdown timer |
| Connection Lost | Auto-reconnect dengan backoff |
| Session Invalid | Prompt user untuk scan ulang |

---

## 3. Membuat Flow (Chatbot)

```
Pilih Device → Buat Flow → Drag Nodes → Connect Edges → Set Trigger → Simpan → Aktifkan
```

### Langkah Detail

| Step | Aksi User | Response Sistem |
|------|-----------|-----------------|
| 1 | Pilih device terkoneksi | Tampilkan list flows |
| 2 | Klik "Buat Flow Baru" | Buka canvas Flow Builder |
| 3 | Drag node dari sidebar | Node muncul di canvas |
| 4 | Hubungkan nodes | Edge (garis) terbentuk |
| 5 | Double-click node | Modal editor muncul |
| 6 | Set trigger keyword | Simpan ke config |
| 7 | Klik "Simpan & Aktifkan" | Flow JSON disimpan, status active |

### Tipe Nodes

| Node | Fungsi | Konfigurasi |
|------|--------|-------------|
| 💬 Message | Kirim pesan teks/media | Text, Image URL, Buttons |
| ❓ Question | Tunggu input user | Variable name, Validation |
| 🔀 Condition | Percabangan logika | If-else rules (JsonLogic) |
| 🤖 AI Reply | Jawaban dari AI/RAG | Knowledge base IDs, System prompt |
| 🌐 API Call | HTTP request external | URL, Method, Headers, Body |
| ⏰ Delay | Jeda sebelum next node | Duration (seconds) |
| 🏷️ Tag User | Assign tag ke kontak | Tag name |

---

## 4. Broadcast Pesan (Blast)

```
Menu Broadcast → Import Kontak → Buat Template → Atur Jadwal → Preview → Kirim → Monitor
```

### Langkah Detail

| Step | Aksi User | Response Sistem |
|------|-----------|-----------------|
| 1 | Klik "Broadcast" | Tampilkan campaign manager |
| 2 | Import kontak (CSV) | Validasi & simpan ke DB |
| 3 | Buat pesan + media | Preview ditampilkan |
| 4 | Set jadwal & rate limit | Konfigurasi delay |
| 5 | Klik "Kirim" | Job masuk ke Cloudflare Queue |
| 6 | Monitor progress | Real-time: sent/pending/failed |

### Rate Limiting Config

| Mode | Typing Delay | Message Gap | Use Case |
|------|--------------|-------------|----------|
| Safe | 3-5 detik | 30-60 detik | Nomor baru, fresh account |
| Normal | 2-4 detik | 10-30 detik | Akun standar |
| Aggressive | 1-2 detik | 5-10 detik | Business verified account |

---

## 5. AI Assistant & Knowledge Base

```
Menu Knowledge Base → Upload Dokumen → Processing → Siap Digunakan → Link ke Flow/Fallback
```

### Langkah Detail

| Step | Aksi User | Response Sistem |
|------|-----------|-----------------|
| 1 | Klik "Knowledge Base" | Tampilkan list dokumen |
| 2 | Upload PDF/TXT | Parsing & extract teks |
| 3 | - | Chunking (500 char/chunk) |
| 4 | - | Generate embedding (BGE-M3) |
| 5 | - | Simpan ke Vectorize + D1 |
| 6a | Drag AI Node ke Flow | Pilih knowledge base |
| 6b | Enable AI Fallback | Setting di device config |
| 7 | User kirim pertanyaan | RAG: search → LLM generate → reply |

### AI Hybrid Mode

| Mode | Kapan Digunakan |
|------|-----------------|
| **AI Node dalam Flow** | Kontrol penuh kapan AI dipanggil |
| **AI Fallback** | Catch-all untuk pesan non-keyword |
| **Hybrid** | Flow untuk keyword, Fallback untuk sisanya |

---

## 6. Flow Diagram Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    USER JOURNEY MAP                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ONBOARDING                                                  │
│  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐      │
│  │Signup│──►│Verify│──►│ Plan │──►│ Pay  │──►│Dashbd│      │
│  └──────┘   └──────┘   └──────┘   └──────┘   └──────┘      │
│                                                    │         │
│  ┌─────────────────────────────────────────────────┼───────┐ │
│  │                                                 ▼       │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────┐ │ │
│  │  │  Gateway  │  │   Flow    │  │  Broadcast│  │  AI  │ │ │
│  │  │  Connect  │  │  Builder  │  │   Blast   │  │ RAG  │ │ │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └──┬───┘ │ │
│  │        │              │              │           │      │ │
│  │        └──────────────┴──────────────┴───────────┘      │ │
│  │                       │                                  │ │
│  │                       ▼                                  │ │
│  │              ┌────────────────┐                         │ │
│  │              │  WAHA Gateway  │                         │ │
│  │              │  (Anti-Ban)    │                         │ │
│  │              └────────────────┘                         │ │
│  │                       │                                  │ │
│  │                       ▼                                  │ │
│  │              ┌────────────────┐                         │ │
│  │              │   WhatsApp     │                         │ │
│  │              └────────────────┘                         │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

# **Cetak Biru Arsitektur Teknis: Ekosistem Aplikasi All-in-One WhatsApp Berbasis Cloudflare Edge**

## **Ringkasan Eksekutif**

Laporan ini menyajikan analisis teknis komprehensif dan panduan implementasi untuk membangun aplikasi "All-in-One" WhatsApp SaaS (Software as a Service) yang menggabungkan fitur Gateway, Visual Flow Builder, AI Chatbot (RAG), dan Blast Engine. Berbeda dengan pendekatan monolitik tradisional yang mengandalkan Virtual Private Server (VPS) dan koneksi persisten, arsitektur yang diusulkan sepenuhnya memanfaatkan infrastruktur *serverless* dan *edge computing* dari Cloudflare.

Pendekatan ini dipilih untuk mengatasi tantangan skalabilitas, latensi, dan biaya operasional. Dengan memanfaatkan Cloudflare Workers (komputasi), D1 (database relasional), R2 (penyimpanan objek), Vectorize (database vektor), dan Queues (pemrosesan asinkron), pengembang dapat menciptakan sistem yang terdistribusi secara global dengan latensi minimal. Laporan ini secara spesifik membedah repositori GitHub terpilih, dokumentasi teknis, dan pola desain yang diperlukan untuk menyatukan komponen-komponen terpisah menjadi satu kesatuan sistem yang kohesif. Fokus utama diberikan pada kompatibilitas runtime (Node.js vs. V8 Isolate), strategi manajemen status (state management) pada lingkungan stateless, dan mekanisme penanganan beban tinggi (high concurrency).

## ---

**1\. Fondasi Infrastruktur SaaS: Arsitektur Edge-Native**

Pondasi dari setiap aplikasi SaaS modern adalah *boilerplate* yang menangani kompleksitas dasar seperti otentikasi, manajemen penyewa (multi-tenancy), penagihan, dan antarmuka pengguna. Dalam konteks Cloudflare, tantangan utamanya adalah memilih kerangka kerja yang kompatibel dengan runtime *Workers* yang berbasis standar web (Web Standards), bukan Node.js tradisional.

### **1.1 Referensi Utama: Cloudflare Workers & Next.js SaaS Template**

Untuk membangun aplikasi SaaS yang kaya fitur namun tetap berperforma tinggi di *edge*, referensi teknis yang paling relevan dan komprehensif adalah repositori yang dikelola oleh **Lubomir Georgiev**. Repositori ini merepresentasikan standar industri saat ini dalam mengadaptasi kerangka kerja Next.js agar dapat berjalan di atas Cloudflare Workers.

* **Repositori Referensi:** LubomirGeorgiev/cloudflare-workers-nextjs-saas-template 1  
* **Komponen Inti Teknologi:**  
  * **Runtime Framework:** Next.js (App Router) yang diadaptasi menggunakan OpenNext.  
  * **Basis Data:** Cloudflare D1 (Serverless SQLite).  
  * **ORM (Object-Relational Mapping):** Drizzle ORM.  
  * **Otentikasi:** Sistem kustom berbasis Cloudflare KV (Key-Value) dan Google SSO.  
  * **Antarmuka Pengguna:** Shadcn/UI dan Tailwind CSS.

### **1.2 Analisis Mendalam Komponen Boilerplate**

Pilihan repositori ini didasarkan pada integrasi mendalamnya dengan ekosistem Cloudflare, yang memecahkan masalah umum seperti "cold start" (waktu inisialisasi server) dan kompatibilitas modul Node.js.

#### **1.2.1 Adaptasi Runtime dengan OpenNext**

Salah satu hambatan terbesar dalam memigrasikan aplikasi Next.js ke Cloudflare Workers adalah ketergantungan Next.js pada API Node.js tertentu yang tidak tersedia secara *native* di V8 Isolate (runtime yang digunakan Workers). Template ini menggunakan pustaka @opennextjs/cloudflare 1 sebagai lapisan kompatibilitas (adapter).

Secara teknis, OpenNext berfungsi dengan melakukan *shim* atau *polyfill* terhadap API Node.js yang esensial, memungkinkan fitur-fitur canggih Next.js seperti Server-Side Rendering (SSR) dan React Server Components (RSC) berjalan di *edge*. Ini sangat krusial untuk aplikasi SaaS "All-in-One" Anda karena memungkinkan dasbor (Flow Builder dan Analytics) dirender di server untuk kecepatan awal, sementara interaksi dinamis ditangani di klien.

Dalam berkas wrangler.jsonc 2, konfigurasi *compatibility flags* menjadi sangat penting. Penggunaan flag nodejs\_compat 4 mengaktifkan dukungan untuk modul inti Node.js seperti AsyncLocalStorage dan EventEmitter yang sering digunakan oleh pustaka pihak ketiga. Tanpa konfigurasi ini, upaya menggabungkan fitur-fitur kompleks akan gagal pada saat *runtime*.

#### **1.2.2 Arsitektur Basis Data: D1 dan Drizzle ORM**

Aplikasi SaaS WhatsApp membutuhkan basis data yang cepat untuk menyimpan profil pengguna, log pesan, dan struktur *flow*. Template ini menggunakan **Cloudflare D1**, yang merupakan basis data SQLite terdistribusi. Berbeda dengan PostgreSQL atau MySQL yang memerlukan koneksi TCP berat (yang mahal dalam lingkungan serverless), D1 beroperasi melalui HTTP/API internal Cloudflare, menghilangkan overhead *connection pooling*.

Penggunaan **Drizzle ORM** 3 adalah keputusan arsitektural yang strategis. Drizzle dikenal memiliki jejak memori (footprint) yang sangat kecil dan waktu *boot* yang cepat dibandingkan Prisma. Dalam konteks aplikasi WhatsApp Gateway yang mungkin menerima ribuan *webhook* per detik, setiap milidetik dalam inisialisasi Worker sangat berharga. Drizzle memungkinkan definisi skema berbasis TypeScript yang ketat, memastikan keamanan tipe data (type safety) dari basis data hingga ke antarmuka pengguna.

**Tabel Perbandingan Strategi ORM pada Cloudflare Workers:**

| Fitur | Drizzle ORM (Direkomendasikan) | Prisma ORM | Implikasi untuk SaaS WA |
| :---- | :---- | :---- | :---- |
| **Ukuran Bundle** | Kecil (\< 50KB) | Besar (\> 10MB dengan Query Engine) | Drizzle memungkinkan deployment lebih cepat dan cold start minimal. |
| **Koneksi** | Native HTTP/D1 Driver | Membutuhkan TCP/Proxy atau WASM | Drizzle berinteraksi langsung dengan D1 tanpa middleware tambahan. |
| **Performa Cold Start** | \< 10ms | \> 200ms \- 500ms | Drizzle lebih responsif untuk webhook real-time. |
| **Migrasi Skema** | SQL Generatif | Migrasi kompleks | Drizzle memudahkan manajemen perubahan skema data pengguna. |

#### **1.2.3 Sistem Otentikasi dan Penyimpanan Sesi**

Alih-alih bergantung pada penyedia otentikasi eksternal (seperti Auth0 atau Clerk) yang menambah latensi jaringan, template ini mengimplementasikan otentikasi lokal menggunakan **Cloudflare KV**.3 KV adalah penyimpanan data kunci-nilai yang direplikasi secara global dengan latensi baca yang sangat rendah.

Mekanisme kerjanya adalah sebagai berikut:

1. Pengguna login melalui Google SSO atau email/password.  
2. Server memvalidasi kredensial dan membuat token sesi unik.  
3. Token disimpan di KV dengan waktu kedaluwarsa (TTL) tertentu.  
4. Pada setiap permintaan API (misalnya, saat mengakses Flow Builder), *middleware* memeriksa validitas token di KV. Karena KV berada di *edge*, pemeriksaan ini terjadi dalam hitungan milidetik, jauh lebih cepat daripada query ke database SQL tradisional.

### **1.3 Implementasi Multi-Tenancy dan Isolasi Data**

Untuk aplikasi "All-in-One", isolasi data antar pengguna (tenant) adalah mandat keamanan. Dalam arsitektur D1, pendekatan yang disarankan adalah **Logikal Separation** (Pemisahan Logis). Setiap tabel dalam database (misalnya, contacts, messages, flows) harus memiliki kolom tenant\_id atau user\_id.

Drizzle ORM memfasilitasi ini melalui fitur *middleware* atau fungsi pembungkus (wrapper functions) yang secara otomatis menyuntikkan klausa WHERE tenant\_id \=? pada setiap *query*. Ini mencegah kebocoran data di mana satu pengguna secara tidak sengaja melihat pesan atau kontak milik pengguna lain.

## ---

**2\. WhatsApp Gateway: Gerbang Konektivitas Tanpa Server**

Komponen Gateway adalah "jantung" dari aplikasi ini, bertanggung jawab untuk menerima pesan masuk dari WhatsApp dan mengirimkan pesan keluar. Terdapat dua pendekatan teknis yang fundamental berbeda: menggunakan API Resmi (WhatsApp Cloud API) atau solusi *grey-hat* (Baileys).

### **2.1 Pendekatan A: WhatsApp Cloud API (Resmi & Stabil)**

Ini adalah jalur yang direkomendasikan untuk aplikasi SaaS komersial karena stabilitas, kepatuhan hukum, dan skalabilitasnya. API ini berbasis HTTP webhook, yang secara alami sangat cocok dengan model eksekusi Cloudflare Workers.

* **Repositori Referensi:** depombo/whatsapp-api-cf-worker 6  
* **Analisis Teknis Repositori:** Repositori depombo menyediakan template minimalis berbasis TypeScript yang berfungsi sebagai *webhook listener*. Keunggulan utamanya adalah desain "zero-dependency" 6, yang berarti tidak ada modul npm berat yang disertakan. Worker ini hanya menggunakan API standar web seperti fetch dan crypto.

#### **2.1.1 Mekanisme Verifikasi Webhook dan Keamanan**

Meta (Facebook) mewajibkan proses verifikasi jabat tangan (*handshake*) saat mendaftarkan URL webhook. Worker harus merespons permintaan GET yang berisi hub.challenge.

Implementasi dalam repositori ini menunjukkan cara menangani parameter *query string* secara efisien menggunakan objek URL standar.

Bagian paling kritis adalah **Validasi Tanda Tangan (Signature Verification)**. Setiap payload POST yang dikirim oleh Meta menyertakan header X-Hub-Signature-256. Worker harus menghitung HMAC-SHA256 dari isi pesan (body) menggunakan *App Secret* dan membandingkannya dengan header tersebut. Dalam lingkungan Node.js biasa, pengembang akan menggunakan modul crypto.createHmac. Namun, di Cloudflare Workers, praktik terbaik adalah menggunakan **Web Crypto API** (crypto.subtle). Repositori depombo mendemonstrasikan penggunaan subtle.importKey, subtle.sign, dan subtle.verify untuk melakukan operasi kriptografi ini tanpa membebani runtime dengan polifil Node.js yang berat.6

#### **2.1.2 Strategi Penanganan Pesan Masuk (Ingestion)**

Worker depombo saat ini berfungsi sebagai "Echo" (memantulkan pesan kembali). Untuk aplikasi "All-in-One", logika ini harus diganti total. Alih-alih memproses pesan secara sinkron (yang berisiko *timeout* jika pemrosesan AI lambat), Worker harus bertindak sebagai **Router**.

**Alur Data yang Disarankan:**

1. Terima Payload POST.  
2. Verifikasi Tanda Tangan (Security).  
3. Ekstrak data penting (Nomor Pengirim, Isi Pesan, ID Pesan).  
4. Kirim data tersebut ke **Cloudflare Queue** (lihat Bagian 5).  
5. Kembalikan respons 200 OK ke Meta segera.

Pemisahan ini memastikan bahwa API Gateway Anda tidak pernah mengalami *bottleneck* atau pemblokiran oleh Meta karena latensi respons yang tinggi.

### **2.2 Pendekatan B: Baileys pada Workers (Eksperimental & Kompleks)**

Baileys adalah pustaka populer untuk menjalankan WhatsApp non-bisnis (emulasi klien Web). Menjalankan Baileys di Cloudflare Workers adalah tantangan teknis tingkat tinggi karena Baileys sangat bergantung pada soket TCP (net module) dan sistem file, yang keduanya tidak didukung secara native atau terbatas di Workers.

* **Repositori Referensi:** rafaelsg-01/whatsapp-cloudflare-workers 8  
* **Analisis Kompatibilitas:**  
  Repositori ini adalah versi modifikasi (fork) dari Baileys asli. Modifikasi ini diperlukan karena keterbatasan lingkungan *edge*.  
  * **Konektivitas TCP:** Workers baru-baru ini memperkenalkan dukungan connect() untuk soket TCP, namun Baileys aslinya dirancang untuk Node.js net.Socket. Repositori ini memanfaatkan *compatibility flag* nodejs\_compat 4 untuk menjembatani kesenjangan ini.  
  * **Penyimpanan Kredensial (AuthState):** Baileys perlu menyimpan kunci enkripsi sesi (creds.json). Di server biasa, ini disimpan di disk. Di Workers, sistem file bersifat *ephemeral* (sementara). Solusinya adalah menulis ulang logika AuthState Baileys untuk membaca dan menulis ke **Cloudflare KV** atau **R2**. Tanpa modifikasi ini, sesi akan hilang setiap kali Worker di-restart, memaksa pengguna memindai kode QR berulang kali.  
* **Risiko Operasional:** Penggunaan rafaelsg-01/whatsapp-cloudflare-workers mengandung risiko stabilitas. Jika WhatsApp mengubah protokol WebSocket-nya, fork ini mungkin terlambat diperbarui dibandingkan repositori utama WhiskeySockets/Baileys.10 Selain itu, ada risiko keamanan paket berbahaya yang menyamar sebagai pustaka WhatsApp.12 Untuk aplikasi SaaS yang serius, disarankan menggunakan pendekatan hibrida: Gunakan **Cloudflare Workers** untuk logika bisnis dan API, tetapi jalankan Baileys di dalam kontainer Docker (misalnya menggunakan **Fly.io** atau **Railway**) yang berkomunikasi dengan Worker melalui HTTP REST API, seperti yang diimplementasikan pada repositori fazer-ai/baileys-api.13

## ---

**3\. Flow Builder: Mesin Logika Visual**

Fitur Flow Builder memungkinkan pengguna non-teknis merancang alur percakapan chatbot secara visual. Ini terdiri dari dua komponen terpisah namun terhubung: Editor Visual (Frontend) dan Mesin Eksekusi (Backend).

### **3.1 Frontend: Editor Visual Berbasis React Flow**

Untuk antarmuka pengguna, standar industri saat ini adalah pustaka **React Flow** (kini @xyflow/react).

* **Repositori Referensi:** Mohammmedrafique/Chatbot-flow-builder 15  
* **Repositori Alternatif:** denishsharma/chatbot-flow-builder-starter-kit 17

**Analisis Struktur Node dan Edge:**

Repositori Chatbot-flow-builder menunjukkan cara membuat *Custom Nodes*. Dalam konteks WhatsApp, Anda perlu membuat tipe node spesifik:

* Send Message Node: Berisi teks atau media.  
* User Input Node: Menunggu balasan pengguna.  
* Condition Node: Percabangan logika (Jika A maka B, jika tidak maka C).  
* API Request Node: Mengambil data dari server eksternal.

Data alur disimpan bukan sebagai gambar, melainkan sebagai objek JSON yang ringan. Fungsi toObject() atau toJSON() dari React Flow menghasilkan struktur data yang terdiri dari array nodes dan edges.18

**Contoh Struktur Data Flow JSON:**

JSON

{  
  "nodes": \[  
    { "id": "start", "type": "message", "data": { "text": "Halo\! Apa kabar?" } },  
    { "id": "input\_1", "type": "question", "data": { "variable": "status\_kabar" } },  
    { "id": "cond\_1", "type": "condition", "data": { "logic": "status\_kabar \== 'baik'" } }  
  \],  
  "edges": \[  
    { "source": "start", "target": "input\_1" },  
    { "source": "input\_1", "target": "cond\_1" }  
  \]  
}

JSON ini kemudian disimpan ke dalam kolom flow\_data di tabel flows pada database **D1**.

### **3.2 Backend: Mesin Eksekusi (The Execution Engine)**

Bagian yang sering terlewatkan dalam tutorial adalah bagaimana *menjalankan* JSON tersebut di server. Repositori visual builder hanya menyediakan UI, bukan logika eksekusinya.

* **Logika Eksekusi:** Ketika pesan masuk diterima oleh Worker, sistem harus:  
  1. Mengambil current\_node\_id pengguna dari **KV** (Session State).  
  2. Memuat JSON Flow yang aktif dari **D1**.  
  3. Menemukan node target berdasarkan current\_node\_id dan input pengguna.  
  4. Mengeksekusi aksi node tersebut (misal: Kirim Pesan).  
  5. Memperbarui current\_node\_id ke node berikutnya di KV.  
* **Evaluasi Logika Dinamis:**  
  Untuk menangani node kondisi (misalnya: "Jika pesan berisi 'Harga'"), Worker tidak boleh menggunakan eval() karena alasan keamanan. Solusi yang disarankan adalah menggunakan pustaka **JsonLogic**.  
  * **Referensi Integrasi:** amitshri05/AS-React-JsonLogic 19 dan dokumentasi json-logic-js.20  
  * **Implementasi:** Worker akan mem-parsing aturan logika yang disimpan dalam JSON node dan mengevaluasinya terhadap input pengguna secara aman.

**Integrasi React Flow Smart Edge:** Untuk meningkatkan pengalaman pengguna pada UI SaaS, integrasi pustaka tisoap/react-flow-smart-edge 21 disarankan. Pustaka ini memastikan garis konektor (edges) tidak menimpa node, membuat diagram alur yang kompleks tetap mudah dibaca dan diedit oleh pengguna.

## ---

**4\. AI Chatbot: Kecerdasan Buatan dengan RAG**

Fitur RAG (Retrieval Augmented Generation) mengubah chatbot statis menjadi asisten cerdas yang dapat menjawab pertanyaan berdasarkan dokumen bisnis pengguna.

### **4.1 Arsitektur RAG Native Cloudflare**

Cloudflare menyediakan tumpukan teknologi AI lengkap yang menghilangkan kebutuhan akan API eksternal (seperti OpenAI atau Pinecone), yang secara drastis mengurangi latensi dan biaya.

* **Repositori Referensi Utama:** kristianfreeman/cloudflare-retrieval-augmented-generation-example 22  
* **Repositori Pendukung (Hybrid Search):** RafalWilinski/cloudflare-rag 24

**Komponen Arsitektur:**

1. **Workers AI:** Platform inferensi *serverless* untuk menjalankan model LLM (seperti Llama-3 atau Mistral) dan model *Embedding* (seperti BGE-Base).  
2. **Vectorize:** Basis data vektor native Cloudflare untuk menyimpan representasi matematis (embedding) dari teks dokumen.  
3. **D1:** Menyimpan teks asli yang terhubung dengan ID vektor.

### **4.2 Alur Kerja Teknis: Ingesti dan Pengambilan**

#### **4.2.1 Ingesti Data (Upload Dokumen)**

Saat pengguna mengunggah PDF atau teks ke SaaS:

1. **Parsing & Chunking:** Worker memecah teks panjang menjadi potongan-potongan kecil (chunks) agar muat dalam konteks LLM. Repositori referensi menggunakan strategi RecursiveCharacterTextSplitter 23 dari LangChain, yang memotong teks berdasarkan paragraf atau kalimat untuk menjaga koherensi semantik.  
2. **Embedding Generation:** Setiap potongan teks dikirim ke Workers AI (model @cf/baai/bge-base-en-v1.5) untuk diubah menjadi vektor.  
3. **Penyimpanan:** Vektor disimpan di Vectorize, sementara teks asli disimpan di D1 dengan referensi ID yang sama.

#### **4.2.2 Pengambilan dan Generasi (Inference)**

Saat pertanyaan masuk dari WhatsApp:

1. Worker mengubah pertanyaan pengguna menjadi vektor.  
2. Melakukan pencarian kesamaan (*cosine similarity*) di Vectorize (env.VECTOR\_INDEX.query()) untuk menemukan potongan teks yang paling relevan.  
3. **Teknik Hybrid Search:** Repositori RafalWilinski 24 menyarankan penggabungan pencarian vektor dengan pencarian teks penuh (Full-Text Search) di D1. Ini penting untuk kueri spesifik seperti kode produk (misal: "SKU-123") yang sering gagal dideteksi oleh pencarian vektor semantik murni.  
4. Konteks yang ditemukan digabungkan dengan *System Prompt* ("Anda adalah asisten yang membantu...") dan dikirim ke model LLM di Workers AI untuk menghasilkan jawaban natural.

## ---

**5\. Blast Engine: Mesin Penyiaran Pesan Skala Besar**

Fitur "Blast" atau penyiaran pesan massal memiliki risiko teknis terbesar: pemblokiran nomor karena melanggar batas kecepatan (rate limits) API WhatsApp.

### **5.1 Arsitektur Antrian (Queuing) dan Rate Limiting**

Penyelesaian masalah ini memerlukan pola desain *Producer-Consumer* yang kuat.

* **Referensi Dokumentasi:** "Handle rate limits with Cloudflare Queues".25  
* **Referensi Implementasi:** vierja/whatsapp\_whisper (lihat deploy.json untuk konfigurasi antrian).26

#### **5.1.1 Pola Producer-Consumer**

Jangan pernah mengirim pesan massal menggunakan loop for sederhana di dalam satu Worker. Waktu eksekusi Worker terbatas, dan jika API WhatsApp lambat merespons, Worker akan mati sebelum tugas selesai.

**Implementasi yang Benar:**

1. **Producer (Pemicu Kampanye):** Saat pengguna menekan "Kirim Blast", Worker Producer mengambil daftar kontak (misal: 5.000 nomor) dari D1. Ia kemudian memecah daftar ini menjadi tugas-tugas kecil dan memasukkannya ke **Cloudflare Queues** secara *batch* (misal: 100 pesan per batch). Operasi ini sangat cepat dan tidak membebani API WhatsApp.  
2. **Consumer (Pengirim):** Worker Consumer berjalan di latar belakang, dipicu oleh masuknya item ke antrian. Di sinilah kontrol kecepatan diterapkan.

#### **5.1.2 Konfigurasi Rate Limiting di wrangler.toml**

Cloudflare Queues memungkinkan pengaturan konkurensi dan kecepatan pemrosesan.27

Ini, TOML

\[\[queues.consumers\]\]  
queue \= "whatsapp-blast-queue"  
max\_batch\_size \= 10      \# Ambil 10 pesan sekaligus  
max\_batch\_timeout \= 5    \# Tunggu maksimal 5 detik  
max\_concurrency \= 5      \# Jalankan maksimal 5 consumer paralel

Dengan konfigurasi ini, Anda dapat menyetel *throughput* sistem agar sesuai dengan Tier akun WhatsApp Business API Anda (misalnya 80 pesan/detik).

#### **5.1.3 Mekanisme Retry dan Dead Letter Queue**

Jika API WhatsApp mengembalikan kode error 429 Too Many Requests, Worker Consumer harus menangkap error ini dan memanggil fungsi batch.retry(). Fungsi ini akan mengembalikan pesan yang gagal ke dalam antrian dengan penundaan waktu (backoff), memastikan tidak ada pesan yang hilang. Pesan yang gagal berulang kali dapat dikirim ke *Dead Letter Queue* khusus untuk dianalisis manual.

## ---

**6\. Integrasi dan Penutup**

### **6.1 Strategi Penyatuan (Integration Strategy)**

Untuk menggabungkan kelima komponen ini menjadi aplikasi "All-in-One", disarankan menggunakan struktur proyek **Monorepo**.

* Gunakan template Next.js SaaS (LubomirGeorgiev) sebagai direktori utama /src.  
* Tempatkan kode Gateway (depombo) di /src/workers/gateway.  
* Tempatkan logika RAG di /src/workers/rag.  
* Gunakan **Service Bindings** (RPC) Cloudflare untuk komunikasi antar Worker. Ini memungkinkan Worker Gateway memanggil fungsi di Worker RAG secara langsung tanpa melalui internet publik, mengurangi latensi dan meningkatkan keamanan.

### **6.2 Kesimpulan**

Membangun aplikasi WhatsApp SaaS All-in-One di atas ekosistem Cloudflare menawarkan keunggulan kompetitif yang signifikan dalam hal biaya dan performa. Dengan memanfaatkan **Drizzle dan D1** untuk data relasional, **KV** untuk status sesi cepat, **Queues** untuk penanganan beban Blast, dan **Workers AI** untuk kecerdasan, pengembang dapat menyajikan pengalaman pengguna yang responsif dan skalabel. Referensi GitHub dan pola arsitektur yang diuraikan dalam laporan ini menyediakan peta jalan teknis yang jelas untuk merealisasikan visi tersebut.

### ---

**Daftar Referensi Data Teknis**

* 1: Arsitektur SaaS Boilerplate & Next.js pada Workers.  
* 6: Implementasi WhatsApp Cloud API Gateway.  
* 8: Implementasi Baileys pada Edge (Eksperimental).  
* 15: Visual Flow Builder Frontend.  
* 19: Logika Eksekusi JSON (JsonLogic).  
* 22: Implementasi RAG & Vectorize.  
* 25: Manajemen Rate Limiting dengan Cloudflare Queues.

#### **Works cited**

1. LubomirGeorgiev/cloudflare-workers-nextjs-saas-template ... \- GitHub, accessed February 6, 2026, [https://github.com/LubomirGeorgiev/cloudflare-workers-nextjs-saas-template](https://github.com/LubomirGeorgiev/cloudflare-workers-nextjs-saas-template)  
2. cloudflare-workers-nextjs-saas-template/wrangler.jsonc at main \- GitHub, accessed February 6, 2026, [https://github.com/LubomirGeorgiev/cloudflare-workers-nextjs-saas-template/blob/main/wrangler.jsonc](https://github.com/LubomirGeorgiev/cloudflare-workers-nextjs-saas-template/blob/main/wrangler.jsonc)  
3. I open-sourced a fully-featured Next.js SaaS Template for Cloudflare Workers \- Reddit, accessed February 6, 2026, [https://www.reddit.com/r/CloudFlare/comments/1i5rr85/i\_opensourced\_a\_fullyfeatured\_nextjs\_saas/](https://www.reddit.com/r/CloudFlare/comments/1i5rr85/i_opensourced_a_fullyfeatured_nextjs_saas/)  
4. Node.js compatibility \- Workers \- Cloudflare Docs, accessed February 6, 2026, [https://developers.cloudflare.com/workers/runtime-apis/nodejs/](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)  
5. A year of improving Node.js compatibility in Cloudflare Workers, accessed February 6, 2026, [https://blog.cloudflare.com/nodejs-workers-2025/](https://blog.cloudflare.com/nodejs-workers-2025/)  
6. depombo/whatsapp-api-cf-worker: WhatsApp Cloud API ... \- GitHub, accessed February 6, 2026, [https://github.com/depombo/whatsapp-api-cf-worker](https://github.com/depombo/whatsapp-api-cf-worker)  
7. wrangler.json \- depombo/whatsapp-api-cf-worker · GitHub, accessed February 6, 2026, [https://github.com/depombo/whatsapp-api-cf-worker/blob/main/wrangler.json](https://github.com/depombo/whatsapp-api-cf-worker/blob/main/wrangler.json)  
8. rafaelsg-01/whatsapp-cloudflare-workers: A version of ... \- GitHub, accessed February 6, 2026, [https://github.com/rafaelsg-01/whatsapp-cloudflare-workers](https://github.com/rafaelsg-01/whatsapp-cloudflare-workers)  
9. whatsapp-cloudflare-workers \- npm Package Security Analysis ..., accessed February 6, 2026, [https://socket.dev/npm/package/whatsapp-cloudflare-workers](https://socket.dev/npm/package/whatsapp-cloudflare-workers)  
10. WhiskeySockets \- GitHub, accessed February 6, 2026, [https://github.com/WhiskeySockets](https://github.com/WhiskeySockets)  
11. Repositories \- WhiskeySockets \- GitHub, accessed February 6, 2026, [https://github.com/orgs/WhiskeySockets/repositories](https://github.com/orgs/WhiskeySockets/repositories)  
12. Malicious WhatsApp API Package on npm Exposes Users' Data : r/pwnhub \- Reddit, accessed February 6, 2026, [https://www.reddit.com/r/pwnhub/comments/1ptabe2/malicious\_whatsapp\_api\_package\_on\_npm\_exposes/](https://www.reddit.com/r/pwnhub/comments/1ptabe2/malicious_whatsapp_api_package_on_npm_exposes/)  
13. fazer-ai/baileys-api: Baileys API for WhatsApp. \- GitHub, accessed February 6, 2026, [https://github.com/fazer-ai/baileys-api](https://github.com/fazer-ai/baileys-api)  
14. fazer.ai \- GitHub, accessed February 6, 2026, [https://github.com/fazer-ai](https://github.com/fazer-ai)  
15. Mohammmedrafique/Chatbot-flow-builder: A React-based ... \- GitHub, accessed February 6, 2026, [https://github.com/Mohammmedrafique/Chatbot-flow-builder](https://github.com/Mohammmedrafique/Chatbot-flow-builder)  
16. Activity · Mohammmedrafique/Chatbot-flow-builder \- GitHub, accessed February 6, 2026, [https://github.com/Mohammmedrafique/Chatbot-flow-builder/activity](https://github.com/Mohammmedrafique/Chatbot-flow-builder/activity)  
17. denishsharma/chatbot-flow-builder-starter-kit \- GitHub, accessed February 6, 2026, [https://github.com/denishsharma/chatbot-flow-builder-starter-kit](https://github.com/denishsharma/chatbot-flow-builder-starter-kit)  
18. ReactFlowJsonObject \- React Flow, accessed February 6, 2026, [https://reactflow.dev/api-reference/types/react-flow-json-object](https://reactflow.dev/api-reference/types/react-flow-json-object)  
19. amitshri05/AS-React-JsonLogic \- GitHub, accessed February 6, 2026, [https://github.com/amitshri05/AS-React-JsonLogic](https://github.com/amitshri05/AS-React-JsonLogic)  
20. JsonLogic, accessed February 6, 2026, [https://jsonlogic.com/](https://jsonlogic.com/)  
21. tisoap/react-flow-smart-edge: Custom Edge for React Flow that never intersects with other nodes \- GitHub, accessed February 6, 2026, [https://github.com/tisoap/react-flow-smart-edge](https://github.com/tisoap/react-flow-smart-edge)  
22. Build a Retrieval Augmented Generation (RAG) AI \- Cloudflare Docs, accessed February 6, 2026, [https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/](https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/)  
23. kristianfreeman/cloudflare-retrieval-augmented-generation ... \- GitHub, accessed February 6, 2026, [https://github.com/kristianfreeman/cloudflare-retrieval-augmented-generation-example](https://github.com/kristianfreeman/cloudflare-retrieval-augmented-generation-example)  
24. RafalWilinski/cloudflare-rag: Fullstack "Chat with your PDFs" RAG (Retrieval Augmented Generation) app built fully on Cloudflare \- GitHub, accessed February 6, 2026, [https://github.com/RafalWilinski/cloudflare-rag](https://github.com/RafalWilinski/cloudflare-rag)  
25. Cloudflare Queues \- Queues & Rate Limits · Cloudflare Queues docs, accessed February 6, 2026, [https://developers.cloudflare.com/queues/tutorials/handle-rate-limits/](https://developers.cloudflare.com/queues/tutorials/handle-rate-limits/)  
26. whatsapp\_whisper/deploy.json at main \- GitHub, accessed February 6, 2026, [https://github.com/vierja/whatsapp\_whisper/blob/main/deploy.json](https://github.com/vierja/whatsapp_whisper/blob/main/deploy.json)  
27. Limits · Cloudflare Queues docs, accessed February 6, 2026, [https://developers.cloudflare.com/queues/platform/limits/](https://developers.cloudflare.com/queues/platform/limits/)
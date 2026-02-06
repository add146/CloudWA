# **Cetak Biru Arsitektur SaaS WhatsApp "All-in-One" Berbasis Serverless: Implementasi Komprehensif Menggunakan Ekosistem Cloudflare**

## **Ringkasan Eksekutif**

Laporan ini menyajikan analisis mendalam dan panduan teknis implementasi untuk membangun platform SaaS (Software as a Service) WhatsApp yang terintegrasi penuh, mencakup fitur Gateway, AI Chatbot, Visual Flow Builder, Broadcast (Blast), dan Asisten Cerdas. Berbeda dengan pendekatan konvensional yang mengandalkan server VPS (Virtual Private Server) yang mahal dan sulit diskalakan, arsitektur yang diusulkan sepenuhnya memanfaatkan infrastruktur *edge computing* dari Cloudflare. Strategi ini mengintegrasikan Cloudflare Workers untuk komputasi serverless, Cloudflare Pages untuk hosting frontend, D1 untuk database relasional di edge, R2 untuk penyimpanan objek, dan Queues untuk manajemen beban kerja asinkron.

Fokus utama dokumen ini adalah memberikan peta jalan teknis yang mendetail untuk menggabungkan berbagai komponen *open-source* yang terfragmentasi menjadi satu kesatuan sistem yang kohesif, aman, dan dapat diskalakan tanpa batas. Analisis ini mencakup desain skema database multi-tenant, strategi manajemen koneksi WhatsApp menggunakan Durable Objects, implementasi mesin eksekusi logika alur percakapan (flow engine), serta integrasi Retrieval-Augmented Generation (RAG) untuk kecerdasan buatan kontekstual. Dengan mengadopsi arsitektur ini, pengembang dapat menghilangkan biaya *idle server*, mengurangi latensi secara drastis, dan menyediakan layanan yang tangguh bagi ribuan pengguna secara simultan.

## ---

**1\. Paradigma Infrastruktur: Transisi ke Cloudflare Native**

Membangun aplikasi SaaS yang kompleks seperti platform otomatisasi WhatsApp di atas jaringan *edge* memerlukan pergeseran fundamental dalam pola pikir arsitektur, dari model monolitik berbasis server menjadi model *event-driven* yang terdistribusi. Tantangan utama dalam ekosistem WhatsApp adalah mempertahankan koneksi WebSocket yang persisten, sebuah karakteristik yang secara tradisional bertentangan dengan sifat *ephemeral* (sementara) dari fungsi serverless. Namun, inovasi dalam ekosistem Cloudflare, khususnya Durable Objects, memungkinkan kita untuk menjembatani kesenjangan ini.1

### **1.1 Komposisi Stack Teknologi**

Arsitektur yang diusulkan tidak hanya sekadar kumpulan layanan, melainkan orkestrasi komponen yang saling berinteraksi dengan presisi tinggi. Pemilihan teknologi didasarkan pada kebutuhan spesifik untuk latensi rendah, biaya operasional minimal, dan ketersediaan tinggi.

| Komponen Fungsional | Layanan Cloudflare | Peran dalam Arsitektur SaaS |
| :---- | :---- | :---- |
| **Pusat Komputasi & Logika** | **Workers & Durable Objects** | Menangani logika bisnis inti, API Gateway, dan protokol koneksi WhatsApp (melalui pustaka Baileys). Durable Objects sangat krusial untuk menjaga state WebSocket yang persisten bagi setiap nomor WhatsApp yang terhubung.2 |
| **Antarmuka & Dashboard** | **Cloudflare Pages** | Menghosting aplikasi frontend (Next.js/React) yang mencakup Dashboard pengguna, Visual Flow Builder, dan halaman pendaratan (landing page). Terintegrasi langsung dengan Workers untuk fungsi backend.4 |
| **Basis Data Relasional** | **D1 (SQLite)** | Menyimpan data terstruktur seperti profil pengguna, konfigurasi tenant, struktur JSON dari chatbot flow, log percakapan, dan daftar kontak. D1 menawarkan konsistensi data di edge dengan replikasi baca global.5 |
| **Penyimpanan Aset** | **R2 (Object Storage)** | Menyimpan file media (gambar, video, dokumen) untuk kampanye broadcast serta file sesi otentikasi WhatsApp (auth credentials) yang bersifat sensitif dan harus persisten.2 |
| **Manajemen Beban Kerja** | **Cloudflare Queues** | Menangani antrean pesan untuk fitur "Blast" atau broadcast massal. Berfungsi sebagai penyangga (buffer) untuk mencegah *rate-limiting* dari WhatsApp dan memastikan pengiriman pesan yang andal tanpa memblokir proses utama.8 |
| **Kecerdasan Buatan** | **Workers AI & Vectorize** | Menjalankan model bahasa besar (LLM) seperti Llama 3 untuk chatbot cerdas dan database vektor untuk fitur RAG (Retrieval-Augmented Generation) guna memberikan jawaban berdasarkan basis pengetahuan bisnis.10 |

### **1.2 Topologi Sistem: Model Hub-and-Spoke Terdistribusi**

Sistem ini dirancang menggunakan pola *Hub-and-Spoke* di mana setiap komponen memiliki tanggung jawab terisolasi namun saling terhubung melalui *Service Bindings* yang memungkinkan komunikasi antar-Worker tanpa overhead HTTP.12

1. **SaaS Hub (Control Plane):** Aplikasi Next.js yang berjalan di Cloudflare Pages. Ini adalah titik masuk bagi pengguna untuk mendaftar, membayar langganan, dan merancang alur percakapan (Flow Builder).  
2. **Gateway Spoke (Connectivity Plane):** Worker khusus yang menampung Durable Objects. Setiap nomor WhatsApp yang didaftarkan oleh pengguna akan memiliki satu instansi Durable Object yang berdedikasi. Ini memastikan isolasi total; jika satu sesi bot mengalami *crash*, bot milik tenant lain tidak akan terpengaruh.1  
3. **Executor Spoke (Logic Plane):** Mesin logika yang menerima *webhook* dari Gateway, membaca konfigurasi alur dari D1, dan mengeksekusi tindakan (seperti mengirim balasan atau memanggil AI).  
4. **Knowledge Spoke (Intelligence Plane):** Sistem yang mengelola ingesti dokumen dan pencarian vektor menggunakan Cloudflare Vectorize untuk memberikan konteks pada AI.14

## ---

**2\. Pondasi SaaS: Manajemen Tenant dan Skema Database**

Langkah pertama dalam merealisasikan sistem ini adalah membangun fondasi manajemen pengguna dan data yang kuat. Mengingat kompleksitas fitur yang diminta, memulai dari nol sangat tidak efisien. Penggunaan *boilerplate* SaaS yang telah teruji dan dimodifikasi untuk kebutuhan spesifik ini adalah strategi yang optimal.

### **2.1 Integrasi Boilerplate SaaS**

Berdasarkan analisis repositori, LubomirGeorgiev/cloudflare-workers-nextjs-saas-template diidentifikasi sebagai titik awal yang paling komprehensif.16 Template ini telah menyediakan integrasi Lucia Auth untuk otentikasi yang aman, Drizzle ORM untuk interaksi database yang *type-safe*, dan struktur proyek monorepo yang mendukung skalabilitas.

Namun, boilerplate ini perlu dimodifikasi secara signifikan untuk mendukung konsep "Device" (perangkat WhatsApp) dan "Flow" (alur percakapan). Modifikasi ini mencakup perluasan skema database dan penambahan API route khusus untuk menangani siklus hidup koneksi WhatsApp.

**Langkah Integrasi Kunci:**

* **Sistem Multi-Tenancy:** Memastikan bahwa setiap *request* ke database D1 selalu menyertakan tenant\_id untuk mencegah kebocoran data antar pengguna. Drizzle ORM memungkinkan kita untuk menetapkan filter global atau *middleware* untuk menegakkan aturan ini secara otomatis.16  
* **Service Bindings:** Mengonfigurasi wrangler.toml untuk menghubungkan Worker utama (SaaS API) dengan Worker sekunder (WhatsApp Gateway dan AI Processor). Ini memungkinkan SaaS API untuk memanggil fungsi internal Gateway (misalnya, startSession atau logout) seolah-olah fungsi tersebut berada di dalam kode yang sama, namun dengan isolasi memori yang aman.12

### **2.2 Desain Skema Database D1 (Extended)**

Database adalah jantung dari aplikasi ini. Skema berikut dirancang untuk mendukung fitur Gateway, Chatbot, dan Blast dalam satu database D1 yang terintegrasi. Penggunaan SQLite di D1 memungkinkan relasi yang kompleks namun tetap memiliki performa tinggi di edge.

| Tabel | Deskripsi & Kolom Kunci | Keterangan Relasi |
| :---- | :---- | :---- |
| tenants | Menyimpan data organisasi/workspace. | *Primary Key* untuk isolasi data. |
| users | Menyimpan kredensial login dan peran (Admin/Operator). | Berelasi *Many-to-One* ke tenants. |
| devices | Merepresentasikan nomor WhatsApp yang terhubung. Kolom: id, tenant\_id, phone\_number, session\_status (CONNECTED, SCANNING, DISCONNECTED), worker\_id (ID Durable Object), webhook\_url. | Satu tenant bisa memiliki banyak device. |
| flows | Menyimpan struktur visual chatbot. Kolom: id, device\_id, trigger\_keyword, flow\_json (Struktur graf dari React Flow), is\_active, version. | Satu device bisa memiliki banyak flow aktif berdasarkan keyword. |
| flow\_sessions | Melacak posisi pengguna dalam alur percakapan. Kolom: id, contact\_phone, flow\_id, current\_node\_id, variables (JSON), last\_interaction. | Menjaga konteks percakapan pengguna ("state"). |
| contacts | CRM sederhana untuk fitur Blast. Kolom: id, tenant\_id, phone, name, tags (array), custom\_attributes (JSON). | Target audiens untuk kampanye. |
| campaigns | Job pengiriman pesan massal. Kolom: id, tenant\_id, status (DRAFT, SCHEDULED, PROCESSING, COMPLETED), total\_messages, success\_count, failed\_count. | Berisi metadata kampanye. |
| campaign\_items | Detail status pengiriman per kontak. Kolom: id, campaign\_id, contact\_id, status (QUEUED, SENT, FAILED), error\_reason. | Log granular untuk reporting. |

### **2.3 Strategi Penyimpanan Sesi (R2 vs KV)**

Salah satu aspek paling kritis dalam gateway WhatsApp berbasis Baileys adalah penyimpanan data sesi (*auth credentials*). Data ini berisi kunci enkripsi yang memungkinkan bot untuk terhubung kembali tanpa perlu memindai kode QR ulang.

Analisis mendalam menunjukkan bahwa **Cloudflare R2** adalah solusi superior dibandingkan Workers KV untuk kasus penggunaan ini.2

* **Ukuran Data:** File sesi Baileys (terutama creds.json dan kunci pre-key) dapat membengkak seiring waktu. KV memiliki batasan ukuran nilai (value size limits) yang ketat (25MB), sedangkan R2 dapat menyimpan objek dalam ukuran gigabyte.  
* **Biaya:** Operasi tulis (write) pada KV relatif mahal dibandingkan R2 Class B operations, terutama untuk bot yang sangat aktif yang terus memperbarui status sesi.  
* **Konsistensi:** R2 menawarkan konsistensi yang kuat (*strong consistency*), yang vital untuk mencegah *race condition* saat sesi diperbarui secara bersamaan.

Implementasinya melibatkan pembuatan *custom auth state* untuk Baileys yang mengimplementasikan fungsi read, write, dan remove menggunakan API env.BUCKET dari R2, menggantikan sistem file lokal standar Node.js.1

## ---

**3\. Modul Gateway WhatsApp: Konektivitas di Edge**

Membangun gateway WhatsApp di lingkungan serverless adalah tantangan teknis terbesar dalam proyek ini. Pustaka standar seperti Baileys dirancang untuk berjalan di Node.js dengan koneksi TCP/WebSocket yang persisten, sementara Cloudflare Workers memiliki batas waktu eksekusi (CPU time limit).

### **3.1 Pemanfaatan Durable Objects untuk Koneksi Persisten**

Solusi untuk keterbatasan ini adalah **Cloudflare Durable Objects (DO)**. DO adalah instansi tunggal dari sebuah kelas JavaScript yang dijamin unik secara global dan dapat mempertahankan state di memori, serta mendukung koneksi WebSocket jangka panjang.1

**Arsitektur Gateway Berbasis DO:**

1. **Inisialisasi:** Ketika pengguna meminta koneksi baru, Worker utama membuat instansi DO baru dengan ID unik yang dipetakan ke tenant\_id.  
2. **Siklus Hidup WebSocket:**  
   * Di dalam metode fetch pada kelas DO, logika Baileys diinisialisasi menggunakan makeWASocket.  
   * Koneksi WebSocket ke server WhatsApp dibuka.  
   * DO memantau *event* koneksi. Jika terputus, DO akan mencoba menyambung kembali menggunakan kredensial yang tersimpan di R2.  
3. **Hibernasi (Cost Optimization):** Menggunakan **WebSocket Hibernation API**, Durable Object dapat "tidur" saat tidak ada lalu lintas data, namun tetap mempertahankan koneksi socket terbuka ke WhatsApp. Ketika pesan masuk, Cloudflare secara otomatis membangunkan DO tersebut tanpa biaya *cold start* penuh. Ini sangat penting untuk menekan biaya operasional SaaS agar tetap kompetitif.3

### **3.2 Adaptasi Pustaka Baileys**

Repositori rafaelsg-01/whatsapp-cloudflare-workers memberikan bukti konsep (PoC) untuk menjalankan Baileys di Workers.1 Namun, untuk produksi, beberapa penyesuaian wajib dilakukan:

* **Penghapusan Dependensi Node.js:** Baileys asli bergantung pada modul net, tls, dan fs dari Node.js. Di lingkungan Workers, ini harus diganti atau di-polyfill. Penggunaan flag nodejs\_compat di wrangler.toml sangat membantu, tetapi abstraksi penyimpanan harus ditulis ulang total untuk menggunakan R2.1  
* **Manajemen QR Code:** QR code yang dihasilkan oleh Baileys harus dikirimkan secara *real-time* ke frontend. Karena Cloudflare Pages bersifat statis, komunikasi ini dilakukan melalui WebSocket sekunder antara browser pengguna (Dashboard) dan Durable Object. Saat DO menghasilkan QR string, ia mengirimkannya ke socket browser untuk dirender menjadi gambar QR.1

## ---

**4\. Modul Visual Flow Builder: Antarmuka Logika Tanpa Kode**

Fitur "All-in-One" menuntut adanya cara bagi pengguna non-teknis untuk merancang alur percakapan bot. Ini direalisasikan melalui integrasi pustaka diagram berbasis React.

### **4.1 Implementasi Frontend dengan React Flow**

Repositori Mohammmedrafique/Chatbot-flow-builder menyediakan komponen dasar UI yang dibutuhkan.19 Sistem ini menggunakan **React Flow**, pustaka yang sangat fleksibel untuk membangun aplikasi berbasis node.19

**Desain Komponen Node:**

Agar sesuai dengan kebutuhan WhatsApp, kita perlu membuat tipe Node kustom (*Custom Nodes*) yang melampaui node standar:

1. **Message Node:** Memiliki input teks, upload gambar (terintegrasi dengan R2 untuk hosting), dan konfigurasi tombol (List/Reply Buttons).  
2. **Input Node:** Node yang menunggu balasan pengguna dan menyimpannya ke dalam variabel (misalnya, {{nama\_pelanggan}}).  
3. **Condition Node:** Node logika percabangan (IF/ELSE). Contoh: Jika input pengguna berisi "Harga", arahkan ke Node A; jika "Lokasi", arahkan ke Node B.  
4. **AI Node:** Node khusus yang mengirimkan konteks percakapan ke modul AI Assistant (Workers AI) dan menampilkan respons yang dihasilkan.  
5. **API Request Node:** Memungkinkan pengguna memanggil API eksternal (webhook) untuk mengambil data dinamis, misalnya cek status resi pengiriman.

### **4.2 Serialisasi dan Penyimpanan Alur**

Saat pengguna menekan tombol "Simpan", graf visual (Nodes dan Edges) harus dikonversi menjadi format JSON yang dapat disimpan di database D1. React Flow menyediakan metode toObject() yang menghasilkan representasi JSON dari seluruh diagram.21

Data JSON ini disimpan di tabel flows dalam kolom flow\_json. Penting untuk memvalidasi integritas JSON di sisi backend sebelum disimpan untuk mencegah *corrupt flow* yang dapat mematikan bot.23

## ---

**5\. Mesin Eksekusi (The Executor): Otak di Balik Bot**

Memiliki desain alur visual (JSON) tidak berguna tanpa mesin yang dapat membacanya dan menjalankannya. Modul ini adalah *interpreter* yang berjalan di Cloudflare Workers. Tidak ada repositori tunggal yang menyediakan ini secara lengkap ("plug-and-play") untuk Cloudflare, sehingga logika ini harus dibangun dengan menggabungkan konsep dari Chatbot-flow-builder 19 dan logika eksekusi serverless.

### **5.1 Logika Eksekusi Event-Driven**

Mesin eksekusi bekerja sebagai *State Machine* yang dipicu oleh pesan masuk (webhook dari Gateway).

**Alur Proses Eksekusi:**

1. **Pemicu:** Pesan masuk diterima (misal: "Halo").  
2. **Pemeriksaan Sesi:** Worker mengecek tabel flow\_sessions di D1. Apakah pengguna ini sedang berada di tengah alur percakapan?  
   * *Jika Tidak:* Cari flows yang memiliki trigger\_keyword cocok dengan pesan ("Halo"). Jika ada, buat sesi baru dan set current\_node\_id ke Node awal.  
   * *Jika Ya:* Ambil current\_node\_id dan flow\_json dari database.  
3. **Evaluasi Node:**  
   * Sistem melihat tipe Node saat ini. Jika Node tersebut mengharapkan input, sistem memvalidasi pesan pengguna.  
   * Jika valid, sistem mencari *Edge* (garis penghubung) yang keluar dari Node tersebut menuju Node berikutnya.  
4. **Eksekusi Aksi (Transisi):**  
   * Sistem berpindah ke Node berikutnya dan menjalankan aksinya (misal: Kirim Pesan).  
   * Aksi ini dilakukan dengan memanggil API internal Gateway (Durable Object) untuk mengirim pesan ke WhatsApp.  
   * Update current\_node\_id di database flow\_sessions.  
5. **Integrasi AI (JSON Mode):** Jika Node berikutnya adalah **AI Node**, Worker akan memanggil model Llama 3 di Workers AI. Di sini, teknik **JSON Mode** pada Workers AI sangat vital. Kita dapat menginstruksikan AI untuk tidak hanya mengobrol, tetapi juga mengembalikan keputusan routing dalam format JSON, memungkinkan AI untuk mengarahkan alur percakapan secara dinamis.24

## ---

**6\. Modul AI Assistant & RAG: Otak Kontekstual**

Fitur "WA Assistant" mengharuskan bot untuk memahami konteks bisnis pengguna, bukan sekadar bot statis. Ini dicapai melalui implementasi RAG (*Retrieval-Augmented Generation*) menggunakan ekosistem AI Cloudflare.

### **6.1 Pipa Ingesti Pengetahuan (Vectorize)**

Pengguna dapat mengunggah dokumen PDF atau teks FAQ ke dashboard. Sistem akan memproses data ini:

1. **Parsing & Chunking:** Worker memecah teks dokumen menjadi potongan-potongan kecil (chunks) yang koheren.  
2. **Embedding:** Setiap potongan dikirim ke model bge-base-en-v1.5 atau bge-m3 (yang mendukung multi-bahasa termasuk Indonesia) di Workers AI untuk diubah menjadi vektor.11  
3. **Indeksasi:** Vektor disimpan di **Cloudflare Vectorize**, database vektor native yang sangat cepat, beserta metadata yang merujuk kembali ke konten asli di D1 atau R2.14

### **6.2 Mekanisme Retrieval dan Generasi Jawaban**

Saat pengguna bertanya pada bot yang mengaktifkan fitur AI:

1. **Query Embedding:** Pertanyaan pengguna diubah menjadi vektor.  
2. **Vector Search:** Sistem mencari di Vectorize untuk menemukan potongan dokumen yang paling relevan (jarak kosinus terdekat).  
3. **Context Assembly:** Potongan teks yang ditemukan digabungkan menjadi "Konteks".  
4. **LLM Inference:** Prompt dikirim ke model **Llama 3** atau model terbaru yang tersedia di Workers AI dengan struktur:"Jawab pertanyaan pengguna berikut berdasarkan konteks yang diberikan. Jika jawaban tidak ada di konteks, katakan Anda tidak tahu. Konteks:. Pertanyaan:."  
5. **Respon:** Jawaban natural dari AI dikirim kembali ke pengguna melalui Gateway.11

## ---

**7\. Modul Blast Engine: Pengiriman Massal Skala Besar**

Fitur "WA Blast" seringkali menjadi titik kegagalan sistem karena keterbatasan *rate limit* WhatsApp dan batas waktu eksekusi server. Solusi tradisional menggunakan *cron job* seringkali macet atau menyebabkan pemblokiran nomor. Solusi Cloudflare adalah menggunakan **Cloudflare Queues**.8

### **7.1 Arsitektur Antrean Asinkron**

Sistem ini memisahkan proses *input* kampanye dan *eksekusi* pengiriman.

1. **Producer (Campaign Manager):**  
   * Saat pengguna mengirim kampanye ke 10.000 kontak, Worker "Producer" tidak mengirim pesan satu per satu.  
   * Sebaliknya, ia memecah daftar kontak menjadi tugas-tugas kecil (jobs) dan memasukkannya ke dalam antrean whatsapp-blast-queue. Proses ini sangat cepat dan UI pengguna tidak akan *freeze*.  
2. **Consumer (Message Sender):**  
   * Cloudflare secara otomatis memanggil Worker "Consumer" untuk memproses item di antrean.  
   * **Batching:** Worker ini dapat dikonfigurasi untuk mengambil misal 50 pesan sekaligus (batch\_size).  
   * **Rate Limiting Cerdas:** Di dalam Consumer, logika kode akan memeriksa kapan terakhir kali nomor ini mengirim pesan. Jika terlalu cepat, Worker dapat menunda eksekusi (*sleep*) atau menjadwalkan ulang pesan tersebut. Ini krusial untuk menjaga kesehatan nomor WhatsApp ("Health Score") agar tidak diblokir.8

### **7.2 Strategi Retry dan Dead Letter Queues**

Jaringan seluler tidak selalu stabil. Jika pengiriman pesan gagal (misal: HTTP Error dari Gateway), Queues memiliki mekanisme **Exponential Backoff** bawaan. Pesan akan dicoba ulang dengan jeda waktu yang semakin lama.9 Jika pesan terus gagal setelah beberapa kali percobaan (misal: nomor tujuan tidak valid), pesan tersebut dipindahkan ke **Dead Letter Queue (DLQ)**. Ini memungkinkan pemilik SaaS untuk menganalisis kegagalan tanpa menghentikan kampanye yang sedang berjalan bagi ribuan kontak lainnya.29

## ---

**8\. Integrasi Kode dan Peta Jalan Pengembangan**

Untuk menyatukan semua komponen ini, berikut adalah panduan langkah demi langkah integrasi repositori yang telah diidentifikasi:

### **Tahap 1: Inisialisasi Proyek Monorepo**

Gunakan LubomirGeorgiev/cloudflare-workers-nextjs-saas-template sebagai basis.

* Konfigurasi wrangler.toml di root proyek untuk mendefinisikan resource:  
  Ini, TOML  
  \[\[d1\_databases\]\]  
  binding \= "DB"  
  database\_name \= "whatsapp-saas-core"  
  database\_id \= "\<ID\_D1\_ANDA\>"

  \[\[r2\_buckets\]\]  
  binding \= "SESSION\_BUCKET"  
  bucket\_name \= "wa-sessions"

  \[\[queues\]\]  
  binding \= "BLAST\_QUEUE"  
  queue\_name \= "campaign-dispatch"  
  consumer \= "src/workers/blast-consumer.ts"

  \[ai\]  
  binding \= "AI"

### **Tahap 2: Implementasi Gateway (Baileys \+ DO)**

Ambil logika inti dari rafaelsg-01/whatsapp-cloudflare-workers.

* Buat file src/do/WhatsAppDevice.ts.  
* Implementasikan kelas DurableObject yang membungkus makeWASocket.  
* Ganti *Auth State* file-system dengan implementasi berbasis R2. Kode harus membaca JSON dari R2 saat inisialisasi dan menyimpan kembali saat ada event creds.update.

### **Tahap 3: Implementasi Flow Builder & Executor**

* Salin komponen UI dari Mohammmedrafique/Chatbot-flow-builder ke folder apps/web/components/flow.  
* Buat endpoint API di Worker utama: POST /api/webhook/incoming.  
* Di dalam handler webhook, tulis logika *switch-case* untuk memproses pesan:  
  * Cek apakah pesan adalah balasan dari kampanye Blast? (Log ke campaign\_items).  
  * Cek apakah pesan memicu keyword Flow? (Jalankan Flow Engine).  
  * Cek apakah pesan ditujukan ke AI Assistant? (Panggil Workers AI).

### **Tahap 4: Deployment**

Gunakan GitHub Actions yang sudah disediakan di template SaaS untuk melakukan deployment otomatis.

* apps/web dideploy ke **Cloudflare Pages**.  
* apps/worker (Gateway & API) dideploy ke **Cloudflare Workers**.  
* Pastikan variabel lingkungan (API Keys, Stripe Secrets) diset di dashboard Cloudflare dan GitHub Secrets.16

## **Kesimpulan**

Arsitektur yang diusulkan ini memberikan solusi *turn-key* untuk membangun SaaS WhatsApp modern. Dengan menghilangkan ketergantungan pada server VPS dan beralih ke model *edge-native* menggunakan Cloudflare Workers, D1, dan Durable Objects, aplikasi ini mendapatkan keuntungan dari skalabilitas instan dan biaya yang mengikuti penggunaan (*pay-as-you-go*). Integrasi repositori yang telah diidentifikasi—boilerplate SaaS untuk manajemen pengguna, Baileys yang dimodifikasi untuk konektivitas, React Flow untuk desain visual, dan Workers AI untuk kecerdasan—membentuk ekosistem yang kohesif yang memenuhi seluruh kebutuhan pengguna: Gateway, Chatbot, Flow Builder, Blast, dan Asisten AI dalam satu platform terpadu.

#### **Works cited**

1. A version of Baileys WhatsApp that works on Cloudflare Workers \- GitHub, accessed February 6, 2026, [https://github.com/rafaelsg-01/whatsapp-cloudflare-workers](https://github.com/rafaelsg-01/whatsapp-cloudflare-workers)  
2. The easiest way to build a modern SaaS application \- The Cloudflare Blog, accessed February 6, 2026, [https://blog.cloudflare.com/workers-for-platforms-ga/](https://blog.cloudflare.com/workers-for-platforms-ga/)  
3. Deploy a real-time chat application · Cloudflare Workers docs, accessed February 6, 2026, [https://developers.cloudflare.com/workers/tutorials/deploy-a-realtime-chat-app/](https://developers.cloudflare.com/workers/tutorials/deploy-a-realtime-chat-app/)  
4. flow-builder · GitHub Topics, accessed February 6, 2026, [https://github.com/topics/flow-builder](https://github.com/topics/flow-builder)  
5. supermemoryai/cloudflare-saas-stack: Quickly make and deploy full-stack apps with database, auth, styling, storage etc. figured out for you. Add all primitives you want. \- GitHub, accessed February 6, 2026, [https://github.com/dhravya/cloudflare-saas-stack](https://github.com/dhravya/cloudflare-saas-stack)  
6. How to Use Cloudflare D1 Database \- OneUptime, accessed February 6, 2026, [https://oneuptime.com/blog/post/2026-01-27-cloudflare-d1-database/view](https://oneuptime.com/blog/post/2026-01-27-cloudflare-d1-database/view)  
7. Authentication · Cloudflare R2 docs, accessed February 6, 2026, [https://developers.cloudflare.com/r2/api/tokens/](https://developers.cloudflare.com/r2/api/tokens/)  
8. Handle rate limits of external APIs \- Queues \- Cloudflare Docs, accessed February 6, 2026, [https://developers.cloudflare.com/queues/tutorials/handle-rate-limits/](https://developers.cloudflare.com/queues/tutorials/handle-rate-limits/)  
9. Batching, Retries and Delays \- Queues \- Cloudflare Docs, accessed February 6, 2026, [https://developers.cloudflare.com/queues/configuration/batching-retries/](https://developers.cloudflare.com/queues/configuration/batching-retries/)  
10. Models · Cloudflare Workers AI docs, accessed February 6, 2026, [https://developers.cloudflare.com/workers-ai/models/](https://developers.cloudflare.com/workers-ai/models/)  
11. Build a Retrieval Augmented Generation (RAG) AI \- Cloudflare Docs, accessed February 6, 2026, [https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/](https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/)  
12. Developing with multiple Workers \- Cloudflare Docs, accessed February 6, 2026, [https://developers.cloudflare.com/workers/development-testing/multi-workers/](https://developers.cloudflare.com/workers/development-testing/multi-workers/)  
13. How Cloudflare verifies the code WhatsApp Web serves to users, accessed February 6, 2026, [https://blog.cloudflare.com/cloudflare-verifies-code-whatsapp-web-serves-users/](https://blog.cloudflare.com/cloudflare-verifies-code-whatsapp-web-serves-users/)  
14. Overview · Cloudflare Vectorize docs, accessed February 6, 2026, [https://developers.cloudflare.com/vectorize/](https://developers.cloudflare.com/vectorize/)  
15. RafalWilinski/cloudflare-rag: Fullstack "Chat with your PDFs" RAG (Retrieval Augmented Generation) app built fully on Cloudflare \- GitHub, accessed February 6, 2026, [https://github.com/RafalWilinski/cloudflare-rag](https://github.com/RafalWilinski/cloudflare-rag)  
16. LubomirGeorgiev/cloudflare-workers-nextjs-saas-template ... \- GitHub, accessed February 6, 2026, [https://github.com/LubomirGeorgiev/cloudflare-workers-nextjs-saas-template](https://github.com/LubomirGeorgiev/cloudflare-workers-nextjs-saas-template)  
17. Professional Next 14 SaaS Boilerplate to develop your new product in a weekend with a powerful and scalable stack. \- Next 14 (FullStack) \- Clerk \- Tailwind CSS, TypeScript \- Prisma \- GitHub, accessed February 6, 2026, [https://github.com/The-SaaS-Factory/next-14-saas-boilerplate](https://github.com/The-SaaS-Factory/next-14-saas-boilerplate)  
18. Itsukichann/Baileys: WhatsApp API Modification By Itsukiichan \- GitHub, accessed February 6, 2026, [https://github.com/Itsukichann/Baileys](https://github.com/Itsukichann/Baileys)  
19. Mohammmedrafique/Chatbot-flow-builder: A React-based ... \- GitHub, accessed February 6, 2026, [https://github.com/Mohammmedrafique/Chatbot-flow-builder](https://github.com/Mohammmedrafique/Chatbot-flow-builder)  
20. React Flow: Node-Based UIs in React, accessed February 6, 2026, [https://reactflow.dev/](https://reactflow.dev/)  
21. Save and Restore \- React Flow, accessed February 6, 2026, [https://reactflow.dev/examples/interaction/save-and-restore](https://reactflow.dev/examples/interaction/save-and-restore)  
22. ReactFlowJsonObject \- React Flow, accessed February 6, 2026, [https://reactflow.dev/api-reference/types/react-flow-json-object](https://reactflow.dev/api-reference/types/react-flow-json-object)  
23. Save and Restore Example \- React Flow, accessed February 6, 2026, [https://v9.reactflow.dev/examples/save-and-restore/](https://v9.reactflow.dev/examples/save-and-restore/)  
24. JSON Mode \- Workers AI \- Cloudflare Docs, accessed February 6, 2026, [https://developers.cloudflare.com/workers-ai/features/json-mode/](https://developers.cloudflare.com/workers-ai/features/json-mode/)  
25. Workers AI now supports structured JSON outputs \- Changelog \- Cloudflare Community, accessed February 6, 2026, [https://community.cloudflare.com/t/workers-ai-workers-ai-now-supports-structured-json-outputs/819668](https://community.cloudflare.com/t/workers-ai-workers-ai-now-supports-structured-json-outputs/819668)  
26. Retrieval Augmented Generation (RAG) · Cloudflare Reference Architecture docs, accessed February 6, 2026, [https://developers.cloudflare.com/reference-architecture/diagrams/ai/ai-rag/](https://developers.cloudflare.com/reference-architecture/diagrams/ai/ai-rag/)  
27. How Queues Works \- Cloudflare Docs, accessed February 6, 2026, [https://developers.cloudflare.com/queues/reference/how-queues-works/](https://developers.cloudflare.com/queues/reference/how-queues-works/)  
28. Retry queries \- D1 \- Cloudflare Docs, accessed February 6, 2026, [https://developers.cloudflare.com/d1/best-practices/retry-queries/](https://developers.cloudflare.com/d1/best-practices/retry-queries/)  
29. Overview · Cloudflare Queues docs, accessed February 6, 2026, [https://developers.cloudflare.com/queues/](https://developers.cloudflare.com/queues/)  
30. Skip the setup: deploy a Workers application in seconds \- The Cloudflare Blog, accessed February 6, 2026, [https://blog.cloudflare.com/deploy-workers-applications-in-seconds/](https://blog.cloudflare.com/deploy-workers-applications-in-seconds/)
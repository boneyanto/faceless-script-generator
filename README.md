# 🎬 Faceless Video Generator (WebCodecs + Real-CUGAN / Real-ESRGAN)

Mesin otomatisasi pembuatan video edukasi animasi doodle (*faceless YouTube video*) dengan integrasi **Master Prompt AI**, **Upscaling AI (Real-CUGAN / Real-ESRGAN)**, dan **WebCodecs Rendering Engine murni tanpa FFmpeg**.

---

## 🌟 Fitur Utama

1. **Full-Canvas Comic Strip Sequential Animation (Whiteboard Drawing Engine)**:
   - **Tampilan Komik Utuh**: Seluruh 1 lembar komik 4-panel tetap tampil di layar dari awal hingga akhir tanpa pemotongan terburu-buru.
   - **Goresan Pensil Bersambung Alami (*8-Connected Contour Walk*)**: Pensil menelusuri kontur asli gambar secara kontinu dengan sapuan kapsul ramping (*capsule stroke clipping*), tanpa efek gelembung/tap-tap kasar.
   - **Sketsa Pensil Grafit Mulus (*GPU Color Dodge Filter*)**: Menghasilkan garis sketsa grafit bergradasi halus dan tajam berbasis akselerasi GPU, tanpa distorsi biner 1-bit.
   - **Urutan Menggambar Komik ($Q_1 \to Q_2 \to Q_3 \to Q_4$)**: Pensil menggambar dan mewarnai Panel 1 ➔ Panel 2 ➔ Panel 3 ➔ Panel 4 secara berurutan. Panel yang sudah selesai tetap tinggal di layar menemani penonton.
   - **Aset Pensil Ramping & Presisi**: Menggunakan pensil grafit minimalis ([assets/pencil.png](file:///Users/f/Documents/OpenCode/faceless-script-generator/assets/pencil.png)) yang proporsional dan tidak menutupi bidang gambar.

2. **Master Prompt Generator (`docs/zapiwala claude code free updated master prompt.txt`)**:
   - Menghasilkan 5 ide topik viral terfokus (1 channel 1 niche).
   - Menghasilkan naskah narasi murni dengan aturan ketat **40–50 kata per paragraf**.
   - Otomatis membuat metadata lengkap (Judul, Deskripsi dengan Sumber Ilmiah Kredibel, Tags SEO, dan Prompt Thumbnail).
   - Menghasilkan prompt gambar 4-panel simetris untuk setiap timestamp.

3. **Fast 2K Image Processing & Adaptive Upscaling**:
   - **Default: Fast 2K Lanczos**: Memproses gambar langsung ke resolusi 2K QHD (`2560x1440`) WebP hanya dalam **0.3 detik per gambar** (30x lebih cepat dibanding neural upscaling 4x), sangat tajam dan presisi untuk kanvas 1080p dengan ruang gerak *camera drift*.
   - **Opsi Real-CUGAN AI Upscaler**: Mendukung mode neural upscaling (`cugan_2x` atau `cugan_4x`) melalui flag perintah atau variabel lingkungan `UPSCALE_MODE`.
   - **Caching Cerdas**: Gambar yang sudah diproses tidak akan diproses ulang.

4. **WebCodecs Rendering Engine (Tanpa FFmpeg untuk Render)**:
   - **`OffscreenCanvas` (Zero-Copy)**: Menggambar frame langsung ke `VideoFrame` H.264 (`avc1.420028`) @ 1080p 30fps pada kecepatan **140+ FPS**.
   - **AudioEncoder**: Menerima audio `vo.mp3` dan meng-encode ke format AAC (`mp4a.40.2`).
   - **Anti-Memory Leak**: Memanggil `.close()` secara eksplisit pada setiap objek `VideoFrame` & `AudioData`.
   - **Backpressure Queue Management**: Mengontrol antrean encoder secara asinkron dengan event `dequeue` agar penggunaan RAM tetap rendah dan stabil.
   - **MP4 Muxing**: Menggabungkan video dan audio langsung di JavaScript menggunakan `mp4-muxer`.

---

## 📁 Struktur Folder Project

Setiap channel dan video memiliki folder terisolasi:

```
faceless-script-generator/
├── README.md
├── render.sh                 # Script bash otomatis sekali jalan (support animasi sketch & zoom_pan)
├── process_images.py         # Skrip Python pemroses upscaling & timeline komik
├── render_engine.mjs         # Engine WebCodecs video renderer (HTML5 Canvas + GPU Color Dodge)
├── assets/                   # Aset visual pendukung
│   └── pencil.png            # Aset pensil grafit ramping transparan
├── docs/                     # Dokumentasi, preset gaya visual, dan master prompt
│   ├── visual_styles_presets.txt
│   └── zapiwala claude code free updated master prompt.txt
├── tools/                    # Binary Real-CUGAN / Real-ESRGAN (gitignored)
│   └── realcugan/
└── channels/                 # Folder Channel (gitignored)
    └── Channel-Name/
        └── video_01_topic/
            ├── images/           # Gambar input (4-panel)
            ├── vo.mp3            # File voiceover audio
            ├── timestamp.lrc     # Stempel waktu lirik/narasi
            ├── script.txt        # Naskah per paragraf 40-50 kata
            ├── metadata.txt      # Judul, deskripsi, tags, prompt thumbnail
            ├── image_prompts.txt # Prompt gambar per timestamp
            ├── upscaled/         # Hasil upscale 2K WebP (otomatis)
            ├── timeline.json     # Metadata timeline rendering (otomatis)
            └── output_video.mp4  # Video final hasil render (otomatis)
```

---

## 🚀 Panduan Cara Pakai

### 1. Prasyarat Sistem
- **Node.js** (v18+) & **pnpm**
- **Python 3.9+**
- macOS (Apple Silicon / Intel) atau Linux dengan Vulkan support

### 2. Persiapan Folder Video
Buat folder untuk video Anda di dalam channel terkait, contoh:
`channel_1/video_01_what_did_ancient_humans_actually_dream_about/`

Letakkan 3 file wajib di dalam folder tersebut:
1. `images/` : Berisi gambar 4-panel (misal: `01_...png`, `02_...png`, dst.)
2. `vo.mp3` : File rekaman suara voiceover.
3. `timestamp.lrc` : File lirik/timestamp bertanda waktu (misal dari Whisper / Descript / Premiere).

### 3. Jalankan Render Sekali Perintah

Cukup jalankan script:

```bash
# Menggunakan Animasi Komik 4-Panel Bertahap (Default)
./render.sh channels/Channel-Name/video_01_topic

# Atau jika ingin mode Zoom & Pan klasik tanpa animasi gambar pensil:
./render.sh channels/Channel-Name/video_01_topic zoom_pan
```

Script akan otomatis:
- Menyiapkan Python `.venv` & dependensi Node.js jika belum ada.
- Menyiapkan gambar ke **Fast 2K Lanczos** (hanya ~0.3 detik/gambar) dengan caching otomatis (bisa override via `UPSCALE_MODE=cugan_2x` atau `cugan_4x`).
- Memproses urutan kontur 4-panel simetris.
- Menyinkronkan durasi berdasarkan `timestamp.lrc` dan `vo.mp3`.
- Merender video menggunakan **WebCodecs API** murni berbasis GPU.
- Menyimpan hasil video ke:
  `channels/Channel-Name/video_01_topic/output_video.mp4`

---

## 🛠️ Perintah Manual (Jika Ingin Dijalankan Terpisah)

1. **Setup Python Virtual Environment:**
   ```bash
   python3 -m venv .venv
   .venv/bin/pip install pillow mutagen requests
   ```

2. **Setup Node.js Dependencies:**
   ```bash
   pnpm install
   pnpm exec playwright install chromium
   ```

3. **Proses Gambar (Upscale & Timeline):**
   ```bash
   TARGET_DIR="channels/Channel-Name/video_01_topic" .venv/bin/python process_images.py
   ```

4. **Render Video (WebCodecs Engine):**
   ```bash
   ANIMATION_MODE=sketch TARGET_DIR="channels/Channel-Name/video_01_topic" node render_engine.mjs
   ```

---

## 📜 Lisensi
MIT License.

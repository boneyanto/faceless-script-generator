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

3. **AI Neural Line Smoothing & Upscaling (Real-CUGAN 2x)**:
   - **Default: Real-CUGAN 2x Neural Upscaler**: Memperbesar ke resolusi 2K+ (`2752x1536`) WebP dengan **penghalusan garis vektor (*ink-pen smoothing*)** dan pembersihan bintik kompresi (*AI Denoising*) otomatis, menghasilkan tampilan kartun yang rapi dan steril.
   - **Caching Cerdas**: Gambar yang sudah diproses Real-CUGAN tidak akan diproses ulang (eksekusi instan 0.0s pada render kedua).
   - **Opsi Alternatif**: Mendukung mode super cepat `fast_2k` (Lanczos 0.3s) atau `cugan_4x` via variabel `UPSCALE_MODE`.

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
`channels/MyChannel/video_01_topic/`

Letakkan file-file berikut di dalam folder tersebut:
1. `images/` : Berisi gambar urut (misal: `[001]_4-panel_symmet.png`, atau format `.webp` / `.jpg`). Mendukung resolusi **Lanskap** maupun **Vertikal**.
2. `vo.mp3` : File rekaman suara narasi / voiceover.
3. Subtitle (Pilih salah satu format):
   - `timestamp.lrc` : File stempel waktu lirik/narasi (otomatis di-paged jika teks panjang).
   - `subtitles.srt` atau `*.srt` : File subtitle standar SubRip.
   - `subtitles.vtt` atau `*.vtt` : File subtitle WebVTT.

---

### 3. Jalankan Render Sekali Perintah

Gunakan script pembantu [`render.sh`](file:///Users/f/Documents/OpenCode/faceless-script-generator/render.sh):

```bash
./render.sh <folder_video> [opsi...]
```

#### 📌 Contoh Perintah Populer:

```bash
# 1. Mode Standar: Animasi Sketsa Pensil Whiteboard + AI Real-CUGAN 2K (Default)
./render.sh "channels/MyChannel/video_01_topic"

# 2. Mode Zoom & Pan Sinematik + Ambient Blurred Background + Subtitle Otomatis
./render.sh "channels/MyChannel/video_01_topic" --zoom

# 3. Preview Cepat (Tanpa Upscaling CUGAN, langsung WebP ~0.05s/img)
./render.sh "channels/MyChannel/video_01_topic" --zoom --fast

# 4. Render dengan File Subtitle Tertentu
./render.sh "channels/MyChannel/video_01_topic" --zoom --subs "channels/MyChannel/video_01_topic/custom.srt"

# 5. Render Tanpa Subtitle
./render.sh "channels/MyChannel/video_01_topic" --zoom --no-subs

# 6. Mode Gambar Tunggal (1 gambar utuh per chunk, bukan 4-panel split)
./render.sh "channels/MyChannel/video_01_topic" --zoom --single

# 7. Paksa Proses Ulang Gambar (Abaikan cache di folder upscaled/)
./render.sh "channels/MyChannel/video_01_topic" --force

# 8. Tambahkan Watermark Teks Otomatis (Langsung menempel tanpa edit ulang)
./render.sh "channels/MyChannel/video_01_topic" --zoom -w "@CorazonBeats"

# 9. Atur Intensitas Zoom Lebih Kuat (misal 8%) dan Pan Drift (2%)
./render.sh "channels/MyChannel/video_01_topic" --zoom --zoom-scale 0.08 --pan-drift 0.02
```

---

### ⚙️ Daftar Opsi Lengkap (`render.sh`)

| Opsi / Flag | Deskripsi |
|---|---|
| **Animasi** | |
| `--sketch` *(Default)* | Animasi sketsa pensil whiteboard menggambar kontur lalu warna muncul bertahap |
| `--zoom`, `--zoom-pan` | Animasi pergerakan kamera sinematik zoom/pan dengan latar belakang *ambient blur* |
| **Tata Letak Panel** | |
| *(Default)* | 4 panel per gambar (2x2 symmetrical grid) |
| `--single` | 1 panel utuh per gambar (bukan 4-panel grid) |
| **Subtitle & Watermark** | |
| *(Default Subtitle)* | Otomatis mendeteksi `.srt`, `.vtt`, atau `.lrc` di folder video |
| `--subs <file>` | Menentukan path file subtitle tertentu secara eksplisit |
| `--no-subs` | Menonaktifkan tampilan subtitle |
| `--watermark <text>`, `-w` | Menambahkan teks watermark semi-transparan (misal: `-w "@NamaChannel"`) |
| **Kamera Zoom & Pan** | |
| `--zoom-scale <val>` | Mengatur intensitas zoom kamera (Default: `0.04` = 4%, misal: `0.08` untuk 8%) |
| `--pan-drift <val>` | Mengatur pergeseran pan kamera (Default: `0.015` = 1.5%) |
| **Kualitas Upscale AI** | |
| *(Default)* | Real-CUGAN 2x AI Neural Upscaler (garis halus dan tajam) |
| `--fast`, `-f` | Tanpa AI Upscaling (paling cepat, konversi WebP langsung ~0.05s) |
| `--fast-2k`, `--2k` | Resampling Lanczos 2K cepat (~0.3s/img) |
| `--cugan-4x` | Real-CUGAN 4K AI Upscale |
| `--force` | Paksa proses ulang gambar meski sudah ada file di `upscaled/` |

---

## 🛠️ Perintah Manual (Jika Ingin Dijalankan Terpisah)

1. **Setup Environment:**
   ```bash
   python3 -m venv .venv
   .venv/bin/pip install pillow mutagen requests
   pnpm install
   pnpm exec playwright install chromium
   ```

2. **Proses Gambar (Upscale & Timeline):**
   ```bash
   TARGET_DIR="channels/MyChannel/video_01_topic" .venv/bin/python process_images.py
   ```

3. **Render Video (WebCodecs Engine):**
   ```bash
   ANIMATION_MODE=zoom_pan TARGET_DIR="channels/MyChannel/video_01_topic" node render_engine.mjs
   ```

---

## 📜 Lisensi
MIT License.

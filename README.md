# 🎬 Faceless Video Generator (WebCodecs + Real-CUGAN / Real-ESRGAN)

Mesin otomatisasi pembuatan video edukasi animasi doodle (*faceless YouTube video*) dengan integrasi **Master Prompt AI**, **Upscaling AI (Real-CUGAN / Real-ESRGAN)**, dan **WebCodecs Rendering Engine murni tanpa FFmpeg**.

---

## 🌟 Fitur Utama

1. **Master Prompt Generator (`zapiwala claude code free updated master prompt.txt`)**:
   - Menghasilkan 5 ide topik viral terfokus (1 channel 1 niche).
   - Menghasilkan naskah narasi murni dengan aturan ketat **40–50 kata per paragraf**.
   - Otomatis membuat metadata lengkap (Judul, Deskripsi dengan Sumber Ilmiah Kredibel, Tags SEO, dan Prompt Thumbnail).
   - Menghasilkan prompt gambar 4-panel simetris untuk setiap timestamp.

2. **AI Upscaling (Real-CUGAN / Real-ESRGAN)**:
   - Meng-upscale gambar doodle 4-panel ke resolusi 4K/5.5K (`5504x3072`) format WebP.
   - Symmetrical 4-Quadrant Cropping: Memotong 1 gambar menjadi 4 sub-panel 16:9 ($2752 \times 1536$) secara otomatis.

3. **WebCodecs Rendering Engine (Tanpa FFmpeg)**:
   - **`OffscreenCanvas` (Zero-Copy)**: Menggambar frame langsung ke `VideoFrame` H.264 (`avc1.420028`) @ 1080p 30fps.
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
├── render.sh                 # Script bash otomatis sekali jalan
├── process_images.py         # Skrip Python pemroses upscaling & cropping panel
├── render_engine.mjs         # Engine WebCodecs video renderer
├── zapiwala claude code...   # Master Prompt generator naskah & metadata
├── tools/                    # Binary Real-CUGAN / Real-ESRGAN (gitignored)
│   └── realcugan/
└── channel_1/                # Folder Channel (gitignored)
    └── video_01_topic/
        ├── images/           # Gambar input (4-panel)
        ├── vo.mp3            # File voiceover audio
        ├── timestamp.lrc     # Stempel waktu lirik/narasi
        ├── script.txt        # Naskah per paragraf 40-50 kata
        ├── metadata.txt      # Judul, deskripsi, tags, prompt thumbnail
        ├── image_prompts.txt # Prompt gambar per timestamp
        ├── upscaled/         # Hasil upscale 4K WebP (otomatis)
        ├── panels/           # Hasil potong 4 panel (otomatis)
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
./render.sh channel_1/video_01_what_did_ancient_humans_actually_dream_about
```

Script akan otomatis:
- Menyiapkan Python `.venv` & dependensi Node.js `pnpm` jika belum ada.
- Menjalankan upscaler Real-CUGAN ke 4K WebP.
- Memotong setiap gambar menjadi 4 sub-panel simetris (total 60 panel).
- Menyinkronkan durasi tiap panel berdasarkan `timestamp.lrc` dan `vo.mp3`.
- Merender video menggunakan **WebCodecs API** tanpa FFmpeg.
- Menyimpan hasil video ke:
  `channel_1/video_01_what_did_ancient_humans_actually_dream_about/output_video.mp4`

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

3. **Proses Gambar (Upscale & Crop):**
   ```bash
   TARGET_DIR="channel_1/video_01_what_did_ancient_humans_actually_dream_about" .venv/bin/python process_images.py
   ```

4. **Render Video (WebCodecs Engine):**
   ```bash
   TARGET_DIR="channel_1/video_01_what_did_ancient_humans_actually_dream_about" node render_engine.mjs
   ```

---

## 📜 Lisensi
MIT License.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.1.0] - 2026-10-02

### Added
- **Zero-RAM Streaming Muxer (`StreamTarget`)**: Aliran MP4 muxing langsung dialirkan ke disk secara real-time via endpoint HTTP chunked stream (`/save-chunk` with random-access file write), menghilangkan risiko Out-of-Memory (OOM) pada video berdurasi panjang.
- **Burned-in Subtitle Engine**: Mendukung parsing format subtitle `.srt`, `.vtt`, dan `.lrc` dengan perataan teks otomatis (*word wrapping*), tipografi bersih, dan latar belakang *pill box* semi-transparan.
- **Watermark Teks**: Opsi menambahkan teks watermark semi-transparan pada video secara otomatis menggunakan flag `--watermark` / `-w`.
- **Mode Panel Tunggal (`--single`)**: Dukungan untuk merender 1 gambar utuh per segmen narasi (lanskap maupun vertikal), melengkapi mode komik 4-panel default.
- **Kontrol Dinamis Kamera**: Dukungan pengaturan rasio zoom (`--zoom-scale`) dan pergeseran kamera (`--pan-drift`) yang dapat disesuaikan lewat CLI.
- **Proteksi Desinkronisasi Visual & Audio**: Pemeriksaan awal (*strict validation*) untuk memastikan kesesuaian jumlah file gambar dengan segmen audio/timeline sebelum proses render dimulai.
- **Dokumentasi Panduan Rewrite**: Menambahkan panduan penulisan naskah komprehensif (`docs/panduan-rewrite-naskah.md`) untuk alur kerja pembuatan naskah anti-plagiarisme yang siap visual.

### Changed
- **CLI Options (`render.sh`)**: Perluasan opsi CLI untuk mendukung pemilihan flag `--fast`, `--cugan-2x`, `--cugan-4x`, `--zoom`, `--sketch`, `--single`, `--subs`, `--no-subs`, `-w`, dan `--force`.
- **Concurrent Audio Encoding**: Pengkodean audio dijalankan secara paralel di background selagi video dirender untuk mempercepat throughput.
- **Fail-Safe Cleanup**: Pembersihan memori GPU/VRAM yang lebih ketat pada canvas browser saat pipeline selesai atau jika terjadi error.
- **Struktur Aset**: Memindahkan contoh gaya visual dari root `image_style_example/` ke direktori terorganisir `docs/image_style_example/`.
- **Aspek Rasio Lanczos 2K & 4K**: Perbaikan kalkulasi penskalaan gambar agar tetap mempertahankan proporsi aspek rasio asli saat upscaling.
- **Dokumentasi `README.md`**: Pembaruan menyeluruh panduan alur kerja dan tabel opsi perintah render.

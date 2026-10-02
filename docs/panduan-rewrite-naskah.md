# Panduan Rewrite Naskah v3 (Anti-Plagiarisme + Siap Visual)

Panduan ini dipakai untuk me-rewrite naskah cerita (misalnya untuk video YT) dan menyusun prompt gambar per paragraf, agar:
- Tidak plagiat dari sumber asli
- Kualitas bahasa tetap bagus, bahkan berpotensi lebih baik dari aslinya
- Siap dipecah jadi visual/shot list tanpa ambiguitas

Urutan kerja: **Fase 0 (registry karakter) → rewrite per batch → verifikasi kuantitatif → prompt gambar → laporan akhir** (detail di Bagian 9 dan 10).

---

## 1. Konsistensi POV (Sudut Pandang)

**Default POV output: orang ketiga** ("dia/nama karakter/he/she/they"), terlepas dari POV naskah asli. Kalau naskah asli ditulis orang pertama ("aku/I"), rewrite tetap dikonversi jadi orang ketiga secara konsisten, bukan dipertahankan sebagai orang pertama.

**Masalah umum:** rewrite tiba-tiba loncat antar kata ganti orang (misal "dia" ke "aku" atau sebaliknya) di paragraf lain tanpa alasan, padahal masih menceritakan karakter/narator yang sama.

Aturan:
1. Identifikasi dulu siapa narator/karakter utama naskah asli. Kalau naskah asli orang pertama, tentukan nama/identitas si "aku" supaya bisa dikonversi jadi kata ganti orang ketiga yang konsisten (misal "aku" → nama karakter atau "dia"). Kalau naskah asli sudah orang ketiga, pertahankan konsistensinya.
2. Setiap paragraf yang menceritakan pikiran/perasaan/tindakan narator **harus** memakai kata ganti orang ketiga, tidak boleh berubah jadi "aku/I/saya" di tengah jalan, walau momennya dramatis, personal, atau butuh gaya puitis.
3. Kata ganti untuk karakter lain harus konsisten sepanjang naskah, jangan tertukar dengan kata ganti narator/karakter utama.
4. Sebelum lanjut ke paragraf berikutnya, cek: apakah kata ganti untuk karakter yang sama masih konsisten dengan paragraf sebelumnya?
5. Setelah selesai, baca ulang tiap paragraf dan tandai pergantian kata ganti yang tidak konsisten (misalnya sisa "I/my/me" yang lupa dikonversi ke "he/his/him" atau "she/her"). Perbaiki sebelum submit.
6. Kalau naskah asli orang pertama punya pola narator yang sesekali menceritakan sudut pandang/pikiran karakter lain di paragraf terpisah, pola pergantian fokus itu dipertahankan **di titik yang sama seperti naskah asli**, tetap dalam kata ganti orang ketiga untuk semua karakter. Jangan ditambah atau dipindah sembarangan oleh proses rewrite.

---

## 2. Anti-Plagiarisme Struktural (bukan cuma ganti kata)

Mengganti kata dengan sinonim saja **tidak cukup**. Kalau struktur kalimat dan urutan ide masih identik, itu tetap berisiko dianggap "close paraphrase".

- Ubah struktur kalimat (gabung dua kalimat pendek jadi satu, atau pecah kalimat panjang jadi dua)
- Ubah urutan klausa dalam kalimat, bukan cuma ganti kata sifat
- Jangan pertahankan pola "subjek-aksi-metafora" yang identik di tiap kalimat kalau itu pola khas naskah asli

---

## 3. Kontrol Kualitas Gaya Bahasa

- **Variasi ritme kalimat**: campur kalimat pendek dan panjang. Jangan biarkan semua kalimat punya ritme dan kepadatan metafora yang sama, karena melelahkan dibaca lama-lama.
- **Variasikan pembuka kalimat**: jangan selalu mulai dengan frasa partisipial/gerund di depan (pola "Gritting her teeth, she...", "Trapped inside..., he...", "Perched upon..., she watched...", "Steeling her resolve..."). Kalau dipakai berulang di hampir tiap paragraf, ritmenya monoton dan menciptakan "tic" gaya baru yang gampang dikenali.
  - **Batas kuantitatif**: **target ideal 10–12% dari total paragraf** boleh dibuka dengan frasa partisipial/gerund, **batas keras maksimal 15%**. Jangan sengaja mepetkan ke 15%; sisakan buffer supaya selisih penghitungan manual saat audit tetap lolos. Sisanya (88%+) dibuka dengan cara lain: langsung dari subjek/nama karakter, dialog, keterangan waktu/tempat, atau kata tanya/seru.
- **Show, don't tell, secukupnya**: satu detail visual kuat per kalimat lebih baik daripada menumpuk 3 metafora sekaligus.
- **Batas metafora/hiperbola**: maksimal **1 frasa metaforis atau hiperbolik per kalimat** (bukan per paragraf). Jangan menumpuk kata penguat berturutan dalam satu kalimat/paragraf (misal "utterly", "completely", "absolutely", "genuinely" dobel-triple berdekatan). Ini indikator purple prose yang sering lolos karena tidak memakai kata arkais.
- **Natural flow**: hindari kata arkais atau akademik berlebihan bila ada frasa yang lebih hidup dan luwes untuk didengar lewat voice-over. Pakai ekspresi komunikatif tanpa merusak esensi cerita.
- **Dialog harus natural**, jangan dibuat lebih puitis dari versi asli kalau itu merusak karakterisasi. Kalau di asli dialognya blak-blakan/tegas, pertahankan nada itu.
- **Batasi kata sifat dramatis yang berulang** (misal: "jagged", "crimson", "molten", "phantom", "ancient", "sharp", "cold", "deep"). Kalau satu kata muncul lebih dari ±8–10 kali di keseluruhan naskah (untuk naskah ~200 paragraf), variasikan dengan sinonim kontekstual, jangan pakai kata yang sama berulang hanya karena "aman".
- **Konsistensi register/diksi dengan genre**: hindari istilah gaul modern, referensi budaya pop kontemporer, atau jargon internet/gaming kasual (misal "wall hacks", "peak comedy", "five-star", "no cap", "built different") kecuali memang ada di naskah asli. Untuk genre fantasy/cultivation/LitRPG, istilah sistem/game yang bagian dari dunia cerita (level, skill, evolution point, blood qi) tetap boleh. Bedakan dengan slang internet kasual yang terasa "keluar dari dunia cerita".

---

## 4. Dinamika Narasi & Pacing (Recap Voice)

Berlaku untuk semua genre (manhwa/manga recap, novel fantasy, sci-fi, thriller, drama) agar narasi tidak kaku seperti terjemahan mesin atau ensiklopedia.

**Cara "lebih bagus dari aslinya" yang realistis** bukan dengan menambah metafora, melainkan lewat pacing yang lebih baik (kalimat/paragraf dipotong di titik yang pas), transisi antar-adegan yang lebih mulus, dan kalimat pembuka/penutup paragraf yang lebih kuat sebagai hook.

1. **Kalimat ke-4 (Punch / Hook), dengan variasi jenis, bukan formula tunggal.**
   - Kalimat terakhir tiap paragraf diprioritaskan menjadi penutup yang berdampak, tapi jenisnya harus divariasikan, bukan selalu quip/celetukan humoris. Selang-seling antara: celetukan batin narator, punchline tajam, reaksi emosional murni tanpa komentar, micro-cliffhanger, pertanyaan retoris, atau aksi singkat yang dibiarkan bicara sendiri.
   - **Batas kuantitatif**: maksimal **±40–50% dari total paragraf** yang boleh ditutup dengan gaya "quip/one-liner humoris/aforisme". Sisanya pakai jenis penutup lain, supaya tidak jadi tic gaya baru (masalah yang sama dengan pembuka partisipial, tapi di posisi penutup).
   - Hindari penutup berupa ringkasan birokratis atau kalimat hambar.
2. **Cadence 4 kalimat** (total tetap 45–55 kata):
   - Kalimat 1 (Hook / Setup): sedang, ~10–14 kata
   - Kalimat 2 & 3 (Action / Detail / Complication): sedang–panjang, ~13–18 kata
   - Kalimat 4 (Climax / Punch / Reaction): pendek & tajam, ~6–10 kata
3. **Pertahankan direct quotes penting.** Dialog yang ikonik, emosional, atau provokatif dari naskah asli wajib dipertahankan sebagai kutipan langsung (`"..."`), jangan diubah seluruhnya jadi narasi pasif/indirect speech yang menghilangkan ketegangan antar-karakter. Batas kutipan pada paragraf yang dipadatkan diatur di Bagian 7.

---

## 5. Preservasi Makna & Nuansa

- Pertahankan **nada karakter** (misalnya narator sarkastik/snarky, heroik, melankolis, dingin). Jangan sampai rewrite membuatnya terdengar terlalu serius/dramatis kalau aslinya humoris.
- Pertahankan **informasi teknis persis**: angka, nama skill/jurus, titel, statistik, istilah dunia cerita (khususnya penting di LitRPG/system novel, karena salah angka bisa jadi plot hole).
  - **Cakupan preservasi**: angka/istilah teknis wajib dipertahankan **beserta konteks kalimat yang membingkainya**. Jangan biarkan angkanya tetap ada tapi keterangan di sekitarnya (jumlah, jarak, level, durasi) berubah jadi deskripsi kualitatif yang kabur (misal "hundreds of signatures" menggantikan penyebutan yang tadinya lebih spesifik). Kalau naskah asli menyebut angka pasti + rincian pendukungnya dalam satu kalimat/paragraf, rewrite juga menyebut keduanya bersamaan.
- Jangan ubah urutan sebab-akibat naskah asli sampai membuat kejadian jadi ambigu.
- Untuk paragraf sumber yang panjang dan harus dipadatkan, batas apa yang wajib dipertahankan mengikuti prioritas di **Bagian 7**.

---

## 6. Spesifikasi Format Output

- Output berupa file **.txt**
- Bahasa: **Inggris** (atau bahasa target yang ditentukan)
- Setiap paragraf terdiri dari **45–55 kata**
- Setiap paragraf dibagi menjadi **tepat 4 kalimat**
- **Jumlah paragraf hasil rewrite harus sama persis dengan jumlah paragraf naskah asli** (contoh: asli 200 paragraf → rewrite 200 paragraf, bukan digabung/dipecah). Ini menjaga tracking 1:1 antara naskah asli, naskah rewrite, dan prompt gambar dari awal sampai akhir.
- Jangan menggabung atau memecah paragraf. Paragraf asli yang lebih panjang dari 55 kata **dipadatkan** sesuai Bagian 7 (kasus normal, bukan pengecualian). Pengecualian hanya untuk paragraf asli yang jauh lebih pendek dari 45 kata dan tidak bisa diperluas tanpa menambah informasi baru: catat dan laporkan di akhir, jangan diisi dengan karangan.

---

## 7. Kompresi Paragraf Sumber yang Lebih Panjang

Jika paragraf naskah asli memiliki jauh lebih banyak kata/kalimat dari 55 kata/4 kalimat, memadatkannya ke 45–55 kata dan 4 kalimat adalah **hasil yang diinginkan**, bukan kegagalan. Jangan memecah paragraf, jangan melonggarkan batas kata, dan jangan menjejalkan semua detail ke 4 kalimat sampai cadence, batas metafora, dan keterbacaan voice-over rusak.

**Prioritas informasi yang dipertahankan (urut dari yang terpenting):**
1. Angka, nama skill/jurus, titel, dan istilah dunia cerita beserta konteks intinya.
2. Aksi kunci dan rantai sebab-akibat yang menggerakkan plot.
3. Satu dialog paling ikonik (maksimal 1 kutipan langsung per paragraf, boleh dipersingkat).
4. Nada karakter.

**Boleh dibuang:** deskripsi atmosfer sekunder, pengulangan ide, detail transisi, dan pikiran batin yang tidak mengubah alur.

**Kalau ada yang tidak muat:** jika angka/istilah penting (prioritas 1) tidak muat, jangan dibuang diam-diam. Catat di laporan akhir beserta nomor paragrafnya.

**Laporan kompresi:** di catatan akhir, sebutkan nomor paragraf yang dipadatkan lebih dari kira-kira 2x panjang aslinya dan ringkas apa yang dibuang, supaya bisa dicek kalau detailnya dibutuhkan di paragraf berikutnya atau di prompt gambar.

---

## 8. Keterbacaan untuk Audio/Video (Voice-Over)

- Kalimat harus enak dibaca dengan suara keras. Hindari kalimat terlalu panjang dengan banyak anak kalimat bersarang.
- Hindari deretan kata yang sulit diucapkan berurutan (tongue-twister effect).
- Pastikan tiap paragraf bisa dibayangkan sebagai satu adegan visual yang jelas, tanpa terlalu banyak imaji berbeda ditumpuk dalam satu kalimat.

---

## 9. Proses Kerja & Verifikasi

**Fase 0: Pemindaian & Ekstraksi Karakter (wajib sebelum rewrite dan prompt gambar).**
1. Pindai seluruh naskah asli dari awal sampai akhir untuk membuat **Character & Form Registry**.
2. Catat dalam tabel: nama karakter, relasi/peran, **semua wujud/fase fisik** (wujud awal, monster/transformasi, pakaian tempur, versi masa lalu, dll), dan ciri visual khas sebagai anchor tetap.
3. Registry dipakai sebagai acuan mutlak dan disimpan di header dokumen prompt gambar supaya konsistensi visual terjaga di seluruh bab/batch.

**Rewrite naskah panjang:**
- Untuk naskah 200+ paragraf, rewrite per batch kecil (20–30 paragraf). Sertakan 1–2 paragraf terakhir dari batch sebelumnya sebagai konteks supaya POV tidak "lupa".
- Setelah tiap batch, cari-ganti cepat sisa "I/my/me" dari naskah asli orang pertama yang lupa dikonversi ke "he/his/him" atau "she/her" (sesuai karakter).
- **Hitung, jangan cuma baca.** Jalankan penghitungan eksplisit per batch (manual dengan bantuan tool atau skrip sederhana). Error kuantitatif (paragraf kurang 1 kalimat, kelebihan beberapa kata) gampang lolos dari pembacaan sekilas, lalu menumpuk dan baru ketahuan di akhir naskah panjang.
- Perbaiki penyimpangan kuantitatif **di level batch**, jangan ditunda sampai naskah selesai, supaya pola yang salah (misalnya kebiasaan membuka paragraf dengan partisipial) tidak keburu jadi kebiasaan di seluruh naskah.

**Self-check kualitatif (sebelum submit):**
- [ ] Ada kalimat yang strukturnya masih terlalu mirip naskah asli (walau kata-katanya sudah diganti)?
- [ ] Ritme kalimat bervariasi, tidak monoton?
- [ ] Nada/karakter narator masih konsisten dengan aslinya?
- [ ] Ada informasi teknis (angka, nama skill/istilah, **beserta konteks kalimatnya**) yang berubah dari asli?
- [ ] Enak dibaca dengan suara keras untuk voice-over?
- [ ] Ada pergantian kata ganti orang (POV) yang tidak konsisten?
- [ ] Ada diksi/istilah gaul modern yang tidak cocok dengan genre/setting?
- [ ] Ada penumpukan lebih dari 1 metafora/hiperbola atau kata penguat dalam satu kalimat?
- [ ] Jenis penutup kalimat ke-4 sudah bervariasi (tidak selalu quip)?
- [ ] Untuk paragraf yang dipadatkan: info prioritas (angka, aksi kunci, sebab-akibat) masih ada, dan yang tidak muat sudah dicatat?

**Verifikasi kuantitatif (dihitung eksplisit per batch):**
- [ ] Jumlah kalimat tiap paragraf = tepat 4?
- [ ] Jumlah kata tiap paragraf = 45–55?
- [ ] Jumlah paragraf rewrite = jumlah paragraf naskah asli?
- [ ] Rasio paragraf berpembuka partisipial/gerund = kisaran 10–12% (maksimal keras 15%)?
- [ ] Rasio paragraf ditutup quip/one-liner/aforisme ≤ ±40–50%?
- [ ] Frekuensi tiap kata sifat dramatis tidak melebihi ±8–10 kemunculan di keseluruhan naskah?

Jika ada yang gagal, revisi dulu sebelum menyerahkan hasil akhir.

**Catatan akhir yang wajib ditampilkan bersama hasil:**
- Paragraf yang berisiko ambigu (POV atau visual), untuk dicek manual.
- Paragraf yang dipadatkan lebih dari ~2x beserta apa yang dibuang.
- Angka/istilah penting yang tidak muat (kalau ada), dengan nomor paragrafnya.
- Paragraf asli yang jauh lebih pendek dari 45 kata (kalau ada).

---

## 10. Prompt Gambar per Paragraf (4 Panel Simetris)

Setelah naskah final lolos self-check, tiap paragraf diubah jadi satu prompt gambar untuk keperluan visual video.

Aturan:
1. **1 paragraf = 1 prompt gambar.** Jangan gabungkan dua paragraf jadi satu prompt, dan jangan pecah satu paragraf jadi lebih dari satu prompt. Karena jumlah paragraf rewrite dipaksa sama persis dengan naskah asli (Bagian 6), jumlah prompt gambar otomatis sama persis dengan jumlah paragraf naskah asli.
2. **Layout 4 panel simetris.** Tiap prompt menghasilkan gambar dengan 4 panel berukuran sama (grid 2x2 atau strip 4 kolom), masing-masing mewakili 1 kalimat dari paragraf, dengan urutan panel mengikuti kalimat 1→2→3→4.
3. **Character & Form Registry (wajib dibuat sebelum prompt).** Pakai registry dari Fase 0 (Bagian 9):
   - Jika suatu karakter memiliki lebih dari satu wujud (wujud manusia masa lalu vs reinkarnasi/monster; armor/mode tempur vs kasual; anak-anak vs dewasa), setiap wujud didaftarkan sebagai entitas terpisah dengan format `[Nama Karakter] ([Wujud/Fase])`, contoh: `Character A (Human Form)`, `Character A (Beast Form)`.
   - Seluruh wujud yang muncul dalam rentang cerita wajib didefinisikan pada bagian visual anchor di header file prompt, bukan hanya satu wujud dominan.
4. **Descriptor jangkar (anchor descriptor).** Sertakan deskripsi visual tetap untuk seluruh elemen yang harus konsisten antar-panel dan antar-prompt. Minimal mencakup:
   - Deskripsi fisik tetap tiap karakter/wujud (ciri wajah, rambut, pakaian khas, proporsi tubuh, atau anatomi non-human untuk monster/makhluk fantasi).
   - Gaya visual/art style tetap sesuai genre (nama style manhwa/anime/comic, teknik rendering, pencahayaan sinematik).
   - Palet warna atau mood atmosfer jika relevan.
   - Descriptor ini didefinisikan di header file prompt lalu ditempel atau dirujuk konsisten di setiap prompt per-paragraf.
5. **Anti-Ambiguous & Zero-Omission Subject Rule (wajib menyebut nama/wujud spesifik di tiap panel).**
   - **Dilarang aksi tanpa subjek atau bagian tubuh tanpa pemilik (No Headless Body Parts).** Jangan menulis aksi, ekspresi, atau bagian tubuh terisolasi tanpa nama pemiliknya (seperti *"Extreme close-up of eyes snapping open..."*, *"Mouth opening wide..."*, *"Fist clenching in anger..."*, *"Looking down in shock..."*). Model gambar membaca seluruh prompt sekaligus, dan bagian tubuh tanpa pemilik akan diisi ciri karakter default dari anchor (misalnya malah menggambar mata karakter wanita padahal adegannya karakter pria).
     - **Salah:** *"Extreme close-up of eyes snapping open in anger."*
     - **Benar:** *"Extreme close-up of Character A (human form)'s eyes snapping open in anger."*
     - **Salah:** *"Mouth opening wide, emitting a buzz."*
     - **Benar:** *"Character A (human form)'s mouth opening wide, emitting a mechanical buzz."*
   - **Dilarang kata benda umum tanpa nama** (*"the boy"*, *"the girl"*, *"teenager"*, *"man"*, *"woman"*, *"figure"*, *"person"*, *"student"*, *"warrior"*, *"sleeper"*, *"speaker"*, *"silhouette"*) jika adegan melibatkan karakter yang sudah diketahui identitasnya.
   - **Kemandirian tiap panel (Panel Self-Sufficiency).** Model gambar tidak punya memori antar-kalimat dalam satu grid. Setiap baris `Panel 1` sampai `Panel 4` harus self-contained. Jangan berasumsi AI "tahu" subjeknya dari panel sebelumnya. Nama karakter beserta wujudnya wajib ditulis eksplisit di panel bersangkutan (contoh: *"Character A (human form) grimacing..."*, *"Character B (beast form) casting a spell..."*).
   - Untuk figuran tanpa nama, sebutkan peran anonimnya secara spesifik tanpa bertabrakan dengan karakter utama (misal: *"anonymous crowd member"*, *"generic imperial guard"*).
6. **Prefiks penomoran.** Tiap prompt diberi nomor urut sesuai urutan paragraf, format `[001]`, `[002]`, dst (atau `Panel-001`, sesuaikan kebutuhan tools), supaya urutan gambar gampang disusun jadi video tanpa tertukar.

Contoh format satu entri prompt:

```
[001] 4-panel symmetric grid (2x2),
Panel 1: [Aksi kalimat 1 - sebutkan nama karakter dan wujudnya secara eksplisit]
Panel 2: [Aksi kalimat 2 - sebutkan nama karakter dan wujudnya secara eksplisit]
Panel 3: [Aksi kalimat 3 - sebutkan nama karakter/lingkungan spesifik tanpa kata ganti ambigu]
Panel 4: [Aksi kalimat 4 - sebutkan nama karakter/reaksi spesifik]
```

# A FOOTBALL FEDERATION SIMULATOR

**A FOOTBALL FEDERATION SIMULATOR** adalah prototype game manajemen dan simulasi liga sepak bola berbasis web. Pemain berperan sebagai kepala federasi/asosiasi yang mengatur kompetisi, membuat peraturan liga, mengelola peserta, dan memajukan musim pertandingan.

Project dikembangkan sebagai aplikasi **HTML, CSS, dan JavaScript vanilla**, sehingga dapat dijalankan langsung melalui browser tanpa framework atau database tambahan. Progres disimpan menggunakan penyimpanan lokal browser (`localStorage`).

## Status Project

Project saat ini berada pada tahap **prototype playable**. Pengguna dapat membuat liga, membagi tim ke beberapa kasta, mengatur kompetisi, mensimulasikan pertandingan, dan melihat perkembangan klasemen serta rating klub.

## Fitur yang Sudah Ada

### Liga dan Musim

- Menu utama dengan opsi **Lanjutkan**, **Game Baru**, dan **Editor Liga**
- Pembuatan liga baru beserta nama liga dan nama seluruh tim
- Minimal 10 tim tanpa batas maksimal
- Pembagian otomatis tim menjadi beberapa divisi/kasta
- Setiap divisi memiliki batas maksimal 20 tim
- Jadwal kandang-tandang antar tim dalam divisi yang sama
- Simulasi seluruh pertandingan berdasarkan pekan
- Fase akhir musim untuk meninjau perpindahan klub dan hasil play-off sebelum rollover
- Konfirmasi musim baru membuat ulang jadwal dan mereset statistik klasemen
- Arsip tiap musim yang menyimpan juara, klasemen akhir, hasil/statistik pertandingan, perpindahan, play-off, serta statistik pemain
- Navigasi antar kasta dengan klasemen, jadwal, dan progres terpisah
- Penyimpanan dan pemuatan game melalui `localStorage`
- Pemulihan hasil akhir yang masih menunggu konfirmasi setelah save dimuat kembali

### Klasemen dan Pertandingan

- Klasemen dengan Main, Menang, Seri, Kalah, GF, GA, GD, dan Poin
- Urutan klasemen berdasarkan Poin dan selisih gol
- Indikator panah pada peringkat untuk menunjukkan kenaikan atau penurunan posisi dari pekan sebelumnya
- Zona promosi dan degradasi pada tabel klasemen
- Informasi form lima pertandingan terakhir
- Rekap kartu kuning dan kartu merah
- Hasil terbaru serta kalender pertandingan
- Riwayat pertandingan per klub
- Penanda hasil pertandingan **Menang**, **Seri**, dan **Kalah**
- Tampilan statistik pertandingan, termasuk penguasaan bola, tembakan, dan xG
- Peringkat klub dalam divisi yang ditampilkan di detail klub

### Detail dan Rating Klub

- Nama, kota, divisi, logo singkatan, dan statistik klub
- Informasi Overall, Serangan, Tengah, Pertahanan, Peluang Menang, Fitness, dan Momentum
- Menu **Rating Tim** yang mengurutkan klub berdasarkan poin rating keseluruhan
- Poin rating awal yang sama untuk seluruh klub pada game baru
- Poin rating diperbarui berdasarkan hasil, kekuatan lawan, dan selisih gol
- Perubahan poin dari pertandingan terakhir ditampilkan di bawah blok peringkat
- Panah **naik**, **turun**, atau **datar** berdasarkan perubahan poin rating
- Detail klub dapat dibuka dari tabel klasemen dan menu Rating Tim
- Tombol kembali di detail klub mengembalikan pengguna ke menu sebelumnya
- Nama klub lawan pada riwayat pertandingan dapat diklik untuk membuka detail klub tersebut

### Pemain dan Skuad

- Data usia dan potensi untuk setiap pemain
- Perkembangan OVR pemain muda serta penurunan kemampuan pemain senior pada rollover musim
- Pensiun pemain pada usia karier yang ditentukan, dengan riwayat pensiun per klub
- Regenerasi pemain untuk mengganti pemain pensiun dan menambah pemain akademi
- Ukuran skuad dijaga sesuai batas, dengan minimal 11 pemain agar klub tetap dapat bertanding
- Detail klub menampilkan OVR, potensi, usia, dan perubahan terakhir setiap pemain
- Ringkasan musim menampilkan perkembangan, pensiun, dan pemain baru
- AI memilih lineup 4-3-3 berdasarkan gabungan rating dan kebugaran pemain
- Kekuatan dan kebugaran sebelas pemain terpilih ikut menentukan simulasi pertandingan
- Pemain inti kehilangan kebugaran setelah tampil, sementara pemain cadangan memulihkan kebugarannya
- Rotasi otomatis dapat mengutamakan pemain yang lebih bugar meski OVR-nya sedikit lebih rendah
- Laporan pertandingan menjelaskan alasan pemilihan lineup dan pemain yang diistirahatkan
- Regenerasi akademi menutup kekurangan kedalaman per lini, maksimal dua pemain baru per klub per musim
- Target kedalaman otomatis adalah 2 penjaga gawang, 6 pemain bertahan, 5 pemain tengah, dan 5 penyerang; tetap mengikuti batas skuad federasi
- Leaderboard pemain lintas kasta untuk gol, assist, clean sheet, kartu kuning, dan kartu merah
- Statistik individu ditambahkan dari event pertandingan dan diarsipkan pada akhir musim

### Perpindahan Divisi dan Play-off

- Simulasi play-off internal dua leg untuk tim kandidat promosi
- Simulasi play-off lintas kasta dua leg untuk pertukaran posisi antar divisi
- Fase akhir musim terpisah: hasil promosi dan play-off dapat ditinjau sebelum rollover
- Agregat imbang dilanjutkan dengan extra time lalu adu penalti, tanpa aturan gol tandang
- Adu penalti berhenti lebih awal jika keunggulan tidak mungkin dikejar, lalu memakai sudden death jika diperlukan
- Penyimpanan hasil play-off, agregat kedua leg, dan pemenang pada laporan liga
- Arsip play-off menyimpan musim asal hasil pertandingan
- Validasi perpindahan menolak klub yang bergerak ganda atau jumlah promosi/degradasi yang tidak seimbang
- Jumlah peserta tiap divisi dipertahankan setelah rollover

### Editor dan Peraturan

- Editor liga untuk mengubah nama liga dan daftar tim
- Penambahan dan penghapusan tim
- Pengaturan peraturan federasi, seperti:
  - Poin kemenangan
  - Poin seri
  - Batas pemain asing
  - Keuntungan tuan rumah
  - Status transfer
  - Standar disiplin
- Pengaturan perpindahan antar divisi per batas kasta
- Validasi aturan promosi, degradasi, jumlah peserta, dan posisi kandidat play-off sebelum disimpan
- Pengaturan bawaan promosi/degradasi menyesuaikan jumlah klub pada liga yang baru dibuat
- Tim dan editor liga dikunci saat musim sedang berlangsung
- Editor dapat digunakan kembali setelah rollover musim selesai

### Tampilan

- Dashboard gelap responsif untuk desktop maupun mobile
- Navigasi ringkasan, tim, peraturan, kalender, laporan, arsip musim, rating, dan editor
- Tampilan klasemen bergaya broadcast
- Tampilan detail klub dengan profil, statistik, lineup, form, dan riwayat pertandingan
- Filter arsip berdasarkan musim dan kasta, statistik pemain per klub, serta halaman hasil pertandingan
- Filter leaderboard berdasarkan kategori statistik dan kasta, dengan pagination untuk seluruh pemain liga

## Pemeriksaan Siklus Musim

Alur musim dan perpindahan divisi sudah diuji di browser dengan skenario:

- Otomatis, internal play-off, dan lintas kasta pada liga 20/5 klub
- Dua batas kasta pada liga tiga divisi (20/20/5 klub)
- Konfigurasi tanpa perpindahan klub untuk memastikan ukuran kasta tetap stabil
- Liga dengan 21 klub untuk memeriksa aturan bawaan divisi terakhir yang berisi satu klub
- Penolakan konfigurasi promosi/degradasi tidak seimbang, posisi play-off yang bentrok, dan klub kandidat yang sama pada dua batas kasta
- Penolakan konflik kandidat sebelum simulasi tanpa mengubah state musim
- Save/load saat hasil akhir menunggu konfirmasi, kemudian rollover musim
- Reset statistik, ukuran divisi, arsip musim play-off, dan posisi klasemen awal musim
- Arsip musim menyimpan klasemen, juara, perpindahan, hasil pertandingan, dan statistik pemain sebelum reset
- Leaderboard mengurutkan semua pemain lintas kasta berdasarkan gol, assist, clean sheet, kartu kuning, atau kartu merah
- Assist dicatat dari event gol; clean sheet diberikan kepada kiper dan pemain bertahan yang tampil saat lawan tidak mencetak gol
- Extra time, adu penalti sudden death, dan penghentian penalti saat skor sudah tak terkejar
- Perkembangan dan penurunan OVR, pensiun, regenerasi pemain, serta batas skuad selama 15 rollover
- Rotasi lineup saat pemain cadangan lebih bugar, pemulihan kebugaran pemain yang tidak tampil, dan statistik penampilan starter
- Laporan alasan keputusan AI pada laporan liga serta persistensinya dalam arsip musim
- Regenerasi skuad berdasarkan kebutuhan lini, batas dua pemain akademi per musim, dan penghentian perekrutan setelah target kedalaman tercapai
- Pencatatan dan arsip statistik gol, assist, clean sheet, kartu, leaderboard kategori, filter kasta, dan pagination
- Pemulihan data usia/potensi pemain saat save lama dimuat

## Menjalankan Tes Regresi

Jalankan project melalui server web lokal, lalu buka `tests/regression.html` dan tekan **Jalankan semua tes**. Runner menggunakan browser dan JavaScript bawaan, tanpa framework atau instalasi dependensi.

Tes mencakup mode promosi/degradasi, rollover beberapa ukuran liga, validasi konfigurasi, save/load dan migrasi save lama, siklus pemain, pemilihan lineup dan rotasi AI, pemulihan kebugaran, regenerasi berdasarkan kedalaman, statistik leaderboard dan arsip multi-musim, pagination, serta navigasi detail klub. Aplikasi tes berjalan di iframe terpisah dan tidak memuat save game pengguna.

## Pengembangan Selanjutnya

Fondasi liga, perpindahan divisi, play-off, arsip musim, rollover musim, siklus pemain, dan AI skuad otomatis sudah tersedia. Langkah berikutnya yang disarankan adalah memperluas manajemen klub dan pasar pemain:

- Transfer pemain, kontrak, dan bursa pemain
- Cedera, skorsing, pelanggaran, serta penyempurnaan manajemen disiplin
- Sistem keuangan, sponsor, pendapatan, gaji, dan anggaran klub
- Sistem reputasi federasi dan kepatuhan klub
- Penyimpanan beberapa slot game
- Export/import data liga
- Visualisasi pertandingan yang lebih mendetail

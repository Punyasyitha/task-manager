# Mini Task Manager

Aplikasi sederhana untuk membuat task, mengubah status task secara berurutan, dan melihat riwayat perubahan (audit log) per task.

Stack: React + TypeScript (frontend), Node.js + Express + TypeScript (backend) dan dites dengan Node.js 22 di dua terminal.

## Cara menjalankan

Butuh Node.js 18 atau lebih baru. Jalankan di dua terminal.

```bash
# Terminal 1: backend (http://localhost:4000)
cd backend
npm install
npm run dev

# Terminal 2: frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173`. Backend harus jalan lebih dulu.

## Arsitektur singkat

- `backend/src/store.ts`: logika domain. Menyimpan task, aturan urutan status, dan audit log. Tidak tahu apa-apa soal HTTP.
- `backend/src/index.ts`: route Express. Memvalidasi input, memanggil `store`, dan mengubah `DomainError` menjadi kode HTTP (400, 404, 422).
- `frontend/src/api.ts`: satu fungsi `call` untuk semua permintaan ke backend, termasuk penanganan pesan error.
- `frontend/src/App.tsx`: tampilan. Riwayat per task muncul sebagai daftar yang dibuka lewat tombol History.

API:

| Method | Path | Fungsi |
|---|---|---|
| GET | `/meta` | Daftar status dan actor |
| GET | `/tasks` | List task |
| POST | `/tasks` | Buat task (`title`, `actor`) |
| PUT | `/tasks/:id/status` | Ubah status (`status`, `actor`) |
| DELETE | `/tasks/:id` | Hapus task (`actor` di body) |
| GET | `/tasks/:id/audit-logs` | Riwayat task, urut kronologis |

## Asumsi

- Actor dipilih dari daftar yang ditulis tetap di backend (dropdown di UI) dan dikirim pada setiap permintaan tulis. Tidak ada autentikasi.
- Task baru selalu dimulai dari `to_do`. Status hanya boleh maju satu langkah: `to_do → pending → in_progress → done`. `done` adalah status akhir.
- Pembuatan dan penghapusan task juga dicatat di audit log (`created`, `deleted`), supaya riwayat lengkap. Soal hanya mewajibkan perubahan status, jadi ini tambahan.
- Log milik task yang sudah dihapus tetap bisa dibaca lewat `/tasks/:id/audit-logs`.
- Update ke status yang sama dianggap berhasil tanpa perubahan (`changed: false`) dan tidak menulis log. Lompatan atau mundur ditolak dengan 422.

## Trade-off

- **Penyimpanan di memori.** Paling sederhana dan tanpa setup, tetapi semua data hilang saat backend restart.
- **Tipe data diduplikasi** antara frontend dan backend, tidak memakai package bersama, karena skala tugas ini kecil.
- **Validasi alur status ada di backend.** Frontend hanya menawarkan tombol "status berikutnya". Backend tetap sumber kebenaran, jadi permintaan langsung ke API pun tetap divalidasi.
- **Alamat API ditulis tetap** (`http://localhost:4000`) di `api.ts`, bukan lewat environment variable.
- **Belum ada test otomatis.** Pengujian dilakukan manual (lihat bagian AI).

## Jika ada waktu lebih

- Simpan data ke Postgres.
- Test otomatis untuk urutan status, idempotency, dan audit log yang tidak bisa diubah.
- Pengecekan versi saat update (misalnya mengirim status yang diharapkan), agar dua pengguna tidak bisa memajukan task yang sama bersamaan.
- Pagination untuk audit log dan penanganan error jaringan yang lebih baik di UI.

## Pertanyaan

**Bagaimana memastikan audit log tidak termodifikasi?**

Di level kode ada empat lapisan:
1. Log hanya ditulis lewat satu fungsi, `appendLog`.
2. Setiap log di-`Object.freeze`, jadi isinya tidak bisa diubah saat program berjalan.
3. `getLogs` mengembalikan salinan, sehingga pemanggil tidak bisa mengubah atau mengosongkan array aslinya.
4. Tidak ada route untuk mengubah atau menghapus log, dan update atau hapus task tidak menyentuh array log.

Perlindungan ini hanya di level aplikasi: siapa pun yang punya akses ke proses atau server masih bisa mengubahnya. Di produksi saya akan memakai tabel database yang hanya boleh `INSERT` (izin `UPDATE` dan `DELETE` dicabut dari user aplikasi), dengan trigger yang menolak perubahan, dan bila perlu hash berantai antar baris untuk mendeteksi manipulasi.

**Bagian mana yang paling berisiko jika dipakai banyak user?**

Pertama, data di memori: hilang saat restart dan tidak bisa dibagi ke beberapa instance server. Kedua, konsistensi saat banyak permintaan bersamaan. Sekarang status dan log berubah dalam satu blok kode sinkron di satu proses Node sehingga aman, tetapi dengan database dibutuhkan transaksi dan update bersyarat (`WHERE status = :status_lama`) agar dua pengguna tidak bisa memajukan task yang sama bersamaan. Ketiga, actor dikirim oleh client sehingga bisa dipalsukan tanpa autentikasi.

**Jika menjadi sistem besar, apa yang di-refactor lebih dulu?**

Lapisan penyimpanan. Saya akan memisahkan `store.ts` menjadi antarmuka repository dan memindahkan perubahan status beserta penulisan log ke satu transaksi database. Bagian ini menjaga konsistensi dan keutuhan audit log, jadi harus benar sebelum fitur ditambah. Berikutnya tipe API bersama dan autentikasi, supaya actor berasal dari sesi, bukan dari input pengguna.

## Penggunaan AI

Saya memakai Claude untuk memandu pengerjaan secara bertahap: merancang model data, menjelaskan konsep (indeks array, `as const`, `Object.freeze`, error HTTP), dan membantu menulis serta memperbaiki kode `store.ts`, route Express, dan komponen React. Saya memvalidasi hasilnya dengan:
- menjalankan skrip tes manual untuk `store.ts` (maju satu langkah, status sama tidak membuat log, lompat dan mundur ditolak, hapus tidak menghapus log);
- mengetes API dengan PowerShell (buat task, ubah status, kirim status sama, lompat status, lihat log);
- mengetes UI di browser (tombol status, hapus, riwayat per task, ganti actor);
- memperbaiki error yang muncul (konfigurasi `tsconfig`, fungsi `call` di `api.ts`).
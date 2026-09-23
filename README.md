# KKM Universitas Almuslim

Aplikasi Next.js 16 dengan basis data MySQL 8 dan penyimpanan berkas Cloudinary.

## Menjalankan dengan Docker

Seluruh konfigurasi MySQL, akun bootstrap, JWT, Cloudinary, Telegram, dan sumber migrasi dibaca langsung dari `.env`.

```bash
docker compose up -d mysql
docker compose build app
docker compose run --rm app npm run db:schema
docker compose run --rm app npm run db:seed
docker compose run --rm app npm run db:verify
docker compose run --rm app npm run db:test
docker compose up -d app
docker compose ps
docker compose logs -f app
```

Aplikasi tersedia di `http://localhost:3000` dan MySQL tersedia hanya dari laptop di `127.0.0.1:3307`. Perintah skema, seed, dan verifikasi dijalankan manual. Data MySQL disimpan permanen pada volume `kkm-umuslim-mysql-data`.

Perintah pengelolaan:

```bash
docker compose stop
docker compose start
docker compose down
docker compose exec app npm run db:verify
docker compose exec app npm run db:test
```

Untuk migrasi data lama, gunakan kredensial Supabase sumber yang tersimpan di `.env`, lalu jalankan pada volume MySQL yang masih kosong:

```bash
docker compose up -d mysql
docker compose build app
docker compose run --rm app npm run db:schema
docker compose run --rm app npm run db:migrate:supabase
docker compose run --rm app npm run db:seed
docker compose run --rm app npm run db:verify
docker compose run --rm app npm run db:test
docker compose up -d app
```

Penghapusan total berikut juga menghapus seluruh data MySQL lokal:

```bash
docker compose down -v
```

## Persyaratan

- Node.js 20 atau lebih baru
- MySQL 8.0.16 atau lebih baru

## Konfigurasi

Seluruh konfigurasi aplikasi berada di `.env`. Koneksi basis data dapat memakai satu `DATABASE_URL` atau variabel `MYSQL_*` terpisah.

```bash
npm install
```

Semua kredensial basis data bersifat server-side dan tidak memakai awalan `NEXT_PUBLIC_`.

## Membuat skema dan akun awal

```bash
npm run db:schema
npm run db:seed
npm run db:verify
npm run db:test
```

`db:schema` membuat seluruh 22 tabel, indeks, check constraint, dan foreign key. `db:seed` membutuhkan `BOOTSTRAP_ADMIN_PASSWORD` dan `BOOTSTRAP_LPPM_PASSWORD` minimal 8 karakter. Akun yang sudah ada tidak ditimpa kecuali `BOOTSTRAP_OVERWRITE_PASSWORDS=true`. `db:test` memvalidasi transaksi, foreign key, unique constraint, check constraint, cascade, dan set-null pada database uji.

## Migrasi satu kali dari basis data lama

Isi `LEGACY_SUPABASE_URL` dan `LEGACY_SUPABASE_SERVICE_ROLE`, terapkan skema MySQL, lalu jalankan:

```bash
npm run db:migrate:supabase
npm run db:verify
```

Migrasi membaca dan menulis seluruh 22 tabel, memperbaiki parent mahasiswa yang hilang agar foreign key valid, serta menghubungkan kembali program, periode, kelompok, gampong, DPL, dokumen, pengaduan, logbook, laporan, dan histori status. Target harus kosong; untuk upsert yang disengaja gunakan `MIGRATION_ALLOW_NONEMPTY=true`.

## Menjalankan aplikasi

```bash
npm run dev
```

Pemeriksaan produksi:

```bash
npm run build
curl http://localhost:3000/api/health
```

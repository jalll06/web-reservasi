# SM Sport Center — versi HTML/CSS/JS + API (Vercel-ready)

Ini adalah hasil konversi dari project PHP (`index.php`, `reservasi.php`, `admin.php`,
`koneksi.php`, `logout.php`, `notification.php`) menjadi:

- **Frontend statis**: `index.html`, `reservasi.html`, `admin.html` + `css/style.css` + `js/*.js`
  (desain Tailwind & Font Awesome dipertahankan 1:1 seperti aslinya).
- **Backend API tunggal**: `api/index.js` — semua endpoint digabung dalam satu file
  serverless function (login, register, admin login, data lapangan, booking, webhook
  Midtrans, dan seluruh aksi admin), supaya file yang perlu di-deploy ke Vercel tidak
  banyak.

PHP session diganti dengan **JWT disimpan di HttpOnly cookie** karena Vercel serverless
function bersifat stateless (tidak bisa pakai `session_start()` seperti PHP).

## Struktur folder

```
├── index.html
├── reservasi.html
├── admin.html
├── css/
│   └── style.css
├── js/
│   ├── common.js       (helper bersama: fetch API, format angka/tanggal, navbar)
│   ├── index.js         (logika halaman beranda)
│   ├── reservasi.js      (logika login/register/booking/riwayat + Midtrans Snap)
│   └── admin.js          (logika login admin + dashboard kelola reservasi)
├── api/
│   └── index.js          (SATU file API untuk semua endpoint, panggil lewat /api?action=...)
├── database/
│   └── schema.sql         (struktur + data awal, sama seperti file .sql yang Anda upload)
├── package.json
├── vercel.json
└── .env.example
```

## 1. Siapkan Database MySQL Online

Vercel adalah hosting cloud, jadi `localhost` (XAMPP/Laragon) di komputer Anda **tidak
bisa diakses** oleh Vercel. Anda perlu MySQL yang online, contoh gratis/murah:

- [Railway](https://railway.app) (MySQL plugin)
- [Aiven](https://aiven.io) (free tier MySQL)
- [Clever Cloud](https://www.clever-cloud.com)
- [PlanetScale](https://planetscale.com) (kompatibel MySQL)

Setelah database online dibuat:
1. Import `database/schema.sql` ke database tersebut (lewat phpMyAdmin/Adminer/CLI
   yang disediakan provider).
2. Catat host, port, user, password, dan nama database.

## 2. Konfigurasi Environment Variables

Salin `.env.example` menjadi acuan, lalu isi di **Vercel Dashboard → Project →
Settings → Environment Variables**:

| Variable | Keterangan |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | Kredensial MySQL online Anda |
| `DB_SSL` | `true` jika provider mewajibkan SSL (kebanyakan iya) |
| `JWT_SECRET` | String acak & rahasia untuk menandatangani token login |
| `MIDTRANS_CLIENT_KEY` / `MIDTRANS_SERVER_KEY` | Key Midtrans (sandbox/produksi) |
| `MIDTRANS_IS_PRODUCTION` | `false` untuk sandbox, `true` untuk live |

> Catatan: `MIDTRANS_CLIENT_KEY` juga dipakai di `reservasi.html` (script Snap.js).
> Jika Anda mengganti key produksi, update juga atribut `data-client-key` di
> `reservasi.html` dan URL `snap.js` (ganti `sandbox` → produksi bila perlu).

## 3. Deploy ke Vercel

**Via Dashboard:**
1. Push folder ini ke repository GitHub/GitLab/Bitbucket.
2. Buka [vercel.com](https://vercel.com) → New Project → import repo tersebut.
3. Vercel otomatis mendeteksi `api/index.js` sebagai serverless function dan file
   HTML/CSS/JS di root sebagai static site — tidak perlu build command khusus.
4. Isi Environment Variables (lihat langkah 2) sebelum/selama proses import.
5. Klik **Deploy**.

**Via CLI:**
```bash
npm install -g vercel
cd sm-sport-center
vercel          # ikuti wizard, lalu isi env vars saat diminta / lewat dashboard
vercel --prod   # deploy ke production
```

## 4. Atur Webhook Notifikasi Midtrans

Di Midtrans Dashboard (Sandbox/Production) → **Settings → Configuration →
Payment Notification URL**, isi dengan:

```
https://domain-anda.vercel.app/api?action=notification
```

Ini menggantikan `notification.php` yang lama.

## 5. Login default

Setelah import `schema.sql`, akun admin (`admin@smsport.com`) sudah tersedia dengan
password ter-hash. `admin.html` juga mendukung auto-provisioning akun
`admin@gmail.com` / `admin123` seperti pada `admin.php` — cukup login dengan email
tersebut dan sistem akan otomatis membuatkannya jika belum ada (perlu ditambahkan
manual bila Anda ingin fitur ini aktif; lihat catatan di `api/index.js`).

## Ringkasan endpoint API (`/api?action=...`)

| Action | Method | Keterangan |
|---|---|---|
| `register` | POST | Daftar akun pelanggan baru |
| `login` | POST | Login (redirect ke admin.html bila role admin) |
| `admin_login` | POST | Login khusus admin |
| `logout` | GET/POST | Hapus cookie sesi |
| `me` | GET | Info user yang sedang login |
| `lapangan` | GET | Status ketersediaan lapangan (query: tanggal, jam_mulai, jam_selesai, jenis) |
| `lapangan_list` | GET | Daftar semua lapangan (untuk dropdown form booking) |
| `riwayat` | GET | Riwayat reservasi user login |
| `booking` | POST | Buat reservasi baru + generate Snap Token Midtrans |
| `payment_status` | GET | Update status reservasi setelah redirect dari Snap |
| `notification` | POST | Webhook server-to-server dari Midtrans |
| `admin_stats` | GET | Statistik dashboard admin |
| `admin_reservasi` | GET | Daftar semua reservasi (filter status) |
| `admin_update_status` | GET | Ubah status reservasi |
| `admin_delete` | GET | Hapus reservasi |

## Catatan penting

- **Keamanan**: `MIDTRANS_SERVER_KEY` hanya dipakai di `api/index.js` (server-side),
  tidak pernah dikirim ke browser.
- **Password lama**: Beberapa baris di `schema.sql` memiliki password **plain text**
  (belum di-hash), sama seperti data asli Anda. Fungsi `verifyPassword()` di
  `api/index.js` tetap mendukungnya sebagai fallback, sama seperti logika PHP asli.
  Disarankan untuk mengganti password tersebut setelah live.
- **Zona waktu**: Perhitungan "WIB" di sisi client menggunakan offset UTC+7 secara
  manual karena serverless function tidak selalu berjalan di timezone Asia/Jakarta.

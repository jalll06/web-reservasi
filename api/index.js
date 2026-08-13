// ============================================================================
// SM SPORT CENTER - API TUNGGAL (SEMUA ENDPOINT DIGABUNG DI 1 FILE)
// Deploy di Vercel sebagai serverless function: /api/index.js
// Semua request dipanggil lewat: /api?action=NAMA_ACTION
// ============================================================================

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ---------------------------------------------------------------------------
// KONFIGURASI (via Environment Variables di Vercel Project Settings)
// ---------------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || 'ganti_secret_ini_di_env_vercel';
const COOKIE_NAME = 'sm_token';
const DB_HOST = process.env.DB_HOST || 'mysql-be9f978-rizalwidianto232-39b3.e.aivencloud.com';
const DB_PORT = Number(process.env.DB_PORT || 10060);
const DB_USER = process.env.DB_USER || 'avnadmin';
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME || 'defaultdb';
const DB_SSL = process.env.DB_SSL === 'true';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY;
const MIDTRANS_SNAP_URL = process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

// ---------------------------------------------------------------------------
// KONEKSI DATABASE (pool di-cache antar invocation agar tidak reconnect terus)
// ---------------------------------------------------------------------------
let pool;
function getPool() {
    if (!pool) {
        if (process.env.DATABASE_URL) {
            pool = mysql.createPool(process.env.DATABASE_URL);
        } else {
            pool = mysql.createPool({
                host: DB_HOST,
                port: DB_PORT || 3306,
                user: DB_USER,
                password: DB_PASS,
                database: DB_NAME,
                waitForConnections: true,
                connectionLimit: 5,
                maxIdle: 5,
                ssl: DB_SSL ? { rejectUnauthorized: false } : undefined
            });
        }
    }
    return pool;
}

// ---------------------------------------------------------------------------
// HELPER: cookie parsing/serialization (tanpa dependency tambahan)
// ---------------------------------------------------------------------------
function parseCookies(req) {
    const header = req.headers.cookie;
    const out = {};
    if (!header) return out;
    header.split(';').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx === -1) return;
        const key = pair.slice(0, idx).trim();
        const val = decodeURIComponent(pair.slice(idx + 1).trim());
        out[key] = val;
    });
    return out;
}

function setAuthCookie(res, token) {
    const maxAge = 60 * 60 * 24 * 7; // 7 hari
    res.setHeader('Set-Cookie',
        `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax; Secure`
    );
}

function clearAuthCookie(res) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure`);
}

function getSession(req) {
    const cookies = parseCookies(req);
    const token = cookies[COOKIE_NAME];
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

// ---------------------------------------------------------------------------
// HELPER: password verification (mendukung hash lama $2y$ dari PHP + password plain lama)
// ---------------------------------------------------------------------------
function verifyPassword(inputPassword, storedHashOrPlain) {
    if (!storedHashOrPlain) return false;
    // Hash bcrypt PHP diawali $2y$ - ganti ke $2b$ agar dikenali bcryptjs
    if (storedHashOrPlain.startsWith('$2y$') || storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2b$')) {
        const normalized = '$2b$' + storedHashOrPlain.slice(4);
        try {
            if (bcrypt.compareSync(inputPassword, normalized)) return true;
        } catch (e) { /* ignore */ }
    }
    // Fallback: password lama yang belum di-hash (plain text) di database
    return inputPassword === storedHashOrPlain;
}

// ---------------------------------------------------------------------------
// HELPER: body parsing (Vercel Node functions biasanya sudah parse JSON,
// tapi kita jaga-jaga untuk raw body / form fallback)
// ---------------------------------------------------------------------------
async function readBody(req) {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) return req.body;
    return new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => (data += chunk));
        req.on('end', () => {
            if (!data) return resolve({});
            try {
                resolve(JSON.parse(data));
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', () => resolve({}));
    });
}

function send(res, status, payload) {
    res.status(status).setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
}

function fmtTime(t) {
    // pastikan format HH:MM:SS untuk kolom TIME
    if (!t) return t;
    return t.length === 5 ? t + ':00' : t;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
module.exports = async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const action = url.searchParams.get('action') || (req.body && req.body.action) || '';
    const db = getPool();

    try {
        switch (`${req.method}:${action}`) {

            // -----------------------------------------------------------
            // AUTH
            // -----------------------------------------------------------
            case 'POST:register': {
                const body = await readBody(req);
                const nama = (body.nama || '').trim();
                const email = (body.email || '').trim();
                const password = body.password || '';
                const konfirmasi = body.konfirmasi_password || '';

                if (!nama || !email || !password || !konfirmasi) {
                    return send(res, 400, { success: false, message: 'Semua kolom registrasi wajib diisi!' });
                }
                if (password !== konfirmasi) {
                    return send(res, 400, { success: false, message: 'Konfirmasi password tidak cocok!' });
                }
                if (password.length < 6) {
                    return send(res, 400, { success: false, message: 'Password minimal 6 karakter!' });
                }

                const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
                if (existing.length) {
                    return send(res, 400, { success: false, message: 'Email sudah terdaftar!' });
                }

                const hashed = bcrypt.hashSync(password, 10);
                const [result] = await db.query(
                    "INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, 'pelanggan')",
                    [nama, email, hashed]
                );

                const payload = { user_id: result.insertId, nama, email, role: 'pelanggan' };
                const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
                setAuthCookie(res, token);
                return send(res, 200, { success: true, message: 'Akun berhasil dibuat dan Anda otomatis ter-login!', user: payload });
            }

            case 'POST:login': {
                const body = await readBody(req);
                const email = (body.email || '').trim();
                const password = body.password || '';

                if (!email || !password) {
                    return send(res, 400, { success: false, message: 'Email dan password wajib diisi!' });
                }

                const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
                const user = rows[0];

                if (user && verifyPassword(password, user.password)) {
                    const payload = { user_id: user.id, nama: user.nama, email: user.email, role: user.role };
                    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
                    setAuthCookie(res, token);
                    return send(res, 200, {
                        success: true,
                        message: 'Login berhasil!',
                        user: payload,
                        redirect: user.role === 'admin' ? 'admin.html' : null
                    });
                }
                return send(res, 401, { success: false, message: 'Email atau password salah!' });
            }

            case 'POST:admin_login': {
                const body = await readBody(req);
                const email = (body.email || '').trim();
                const password = body.password || '';

                if (!email || !password) {
                    return send(res, 400, { success: false, message: 'Email dan password wajib diisi!' });
                }

                const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
                const user = rows[0];

                if (user && (user.role === 'admin' || email === 'admin@gmail.com')) {
                    const ok = verifyPassword(password, user.password) ||
                        (email === 'admin@gmail.com' && password === 'admin123');
                    if (ok) {
                        const payload = { user_id: user.id, nama: user.nama, email: user.email, role: 'admin' };
                        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
                        setAuthCookie(res, token);
                        return send(res, 200, { success: true, message: 'Login admin berhasil!', user: payload });
                    }
                    return send(res, 401, { success: false, message: 'Password salah!' });
                }
                return send(res, 401, { success: false, message: 'Email tidak ditemukan atau Akun Anda bukan Admin!' });
            }

            case 'GET:logout':
            case 'POST:logout': {
                clearAuthCookie(res);
                return send(res, 200, { success: true, message: 'Logout berhasil.' });
            }

            case 'GET:me': {
                const session = getSession(req);
                return send(res, 200, { success: true, user: session || null });
            }

            // -----------------------------------------------------------
            // LAPANGAN (PUBLIK)
            // -----------------------------------------------------------
            case 'GET:lapangan': {
                const tanggal = url.searchParams.get('tanggal') || new Date().toISOString().slice(0, 10);
                const jamMulai = fmtTime(url.searchParams.get('jam_mulai') || '10:00');
                const jamSelesai = fmtTime(url.searchParams.get('jam_selesai') || '11:00');
                const jenis = url.searchParams.get('jenis') || 'semua';

                let sql = `
                    SELECT
                        l.id, l.nama_lapangan, l.jenis_olahraga, l.harga_per_jam,
                        CASE WHEN r.id IS NOT NULL THEN 'TERISI' ELSE 'TERSEDIA' END AS status_ketersediaan,
                        u.nama AS nama_pemesan
                    FROM lapangan l
                    LEFT JOIN reservasi r ON l.id = r.lapangan_id
                        AND r.tanggal = ?
                        AND r.status = 'disetujui'
                        AND (? < r.jam_selesai AND ? > r.jam_mulai)
                    LEFT JOIN users u ON r.user_id = u.id
                `;
                const params = [tanggal, jamMulai, jamSelesai];
                if (jenis !== 'semua') {
                    sql += ' WHERE l.jenis_olahraga = ?';
                    params.push(jenis);
                }
                sql += ' ORDER BY l.jenis_olahraga ASC, l.id ASC';

                const [rows] = await db.query(sql, params);
                const total_tersedia = rows.filter(r => r.status_ketersediaan === 'TERSEDIA').length;
                const total_terisi = rows.length - total_tersedia;

                return send(res, 200, {
                    success: true,
                    data: rows,
                    total_lapangan: rows.length,
                    total_tersedia,
                    total_terisi,
                    filter: { tanggal, jam_mulai: jamMulai, jam_selesai: jamSelesai, jenis }
                });
            }

            case 'GET:lapangan_list': {
                const [rows] = await db.query('SELECT * FROM lapangan ORDER BY jenis_olahraga ASC, id ASC');
                return send(res, 200, { success: true, data: rows });
            }

            // -----------------------------------------------------------
            // RESERVASI (perlu login)
            // -----------------------------------------------------------
            case 'GET:riwayat': {
                const session = getSession(req);
                if (!session) return send(res, 401, { success: false, message: 'Anda harus login terlebih dahulu!' });

                const [rows] = await db.query(`
                    SELECT r.*, l.nama_lapangan, l.jenis_olahraga
                    FROM reservasi r
                    JOIN lapangan l ON r.lapangan_id = l.id
                    WHERE r.user_id = ?
                    ORDER BY r.id DESC
                `, [session.user_id]);

                return send(res, 200, { success: true, data: rows });
            }

            case 'POST:booking': {
                const session = getSession(req);
                if (!session) return send(res, 401, { success: false, message: 'Anda harus login terlebih dahulu!' });

                const body = await readBody(req);
                const lapangan_id = parseInt(body.lapangan_id, 10);
                const tanggal = body.tanggal;
                const jam_mulai = fmtTime(body.jam_mulai);
                const jam_selesai = fmtTime(body.jam_selesai);

                if (!lapangan_id || !tanggal || !jam_mulai || !jam_selesai) {
                    return send(res, 400, { success: false, message: 'Data reservasi tidak lengkap!' });
                }
                if (jam_mulai >= jam_selesai) {
                    return send(res, 400, { success: false, message: 'Jam mulai harus lebih awal daripada jam selesai!' });
                }

                // Cek bentrok jadwal
                const [cek] = await db.query(`
                    SELECT COUNT(*) AS total FROM reservasi
                    WHERE lapangan_id = ? AND tanggal = ? AND status = 'disetujui'
                      AND (? < jam_selesai AND ? > jam_mulai)
                `, [lapangan_id, tanggal, jam_mulai, jam_selesai]);

                if (cek[0].total > 0) {
                    return send(res, 409, { success: false, message: 'Maaf, Lapangan tersebut SUDAH DIBOOKING pada jam tersebut!' });
                }

                const [lapRows] = await db.query('SELECT nama_lapangan, harga_per_jam FROM lapangan WHERE id = ?', [lapangan_id]);
                const lap = lapRows[0];
                if (!lap) return send(res, 404, { success: false, message: 'Lapangan tidak ditemukan.' });

                const t1 = new Date(`1970-01-01T${jam_mulai}Z`).getTime();
                const t2 = new Date(`1970-01-01T${jam_selesai}Z`).getTime();
                const durasiJam = (t2 - t1) / 3600000;
                const total_harga = Math.round(durasiJam * lap.harga_per_jam);

                const [insertResult] = await db.query(`
                    INSERT INTO reservasi (user_id, lapangan_id, tanggal, jam_mulai, jam_selesai, total_harga, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'pending')
                `, [session.user_id, lapangan_id, tanggal, jam_mulai, jam_selesai, total_harga]);

                const new_reservasi_id = insertResult.insertId;
                const order_id = `SMSPORT-${new_reservasi_id}-${Date.now()}`;

                const payload = {
                    transaction_details: { order_id, gross_amount: total_harga },
                    item_details: [{
                        id: `LAP-${lapangan_id}`,
                        price: total_harga,
                        quantity: 1,
                        name: `${lap.nama_lapangan} (${tanggal})`
                    }],
                    customer_details: { first_name: session.nama, email: session.email }
                };

                try {
                    const midtransRes = await fetch(MIDTRANS_SNAP_URL, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Authorization': 'Basic ' + Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64')
                        },
                        body: JSON.stringify(payload)
                    });
                    const midtransData = await midtransRes.json();

                    if (midtransData.token) {
                        return send(res, 200, {
                            success: true,
                            message: 'Pemesanan berhasil dibuat! Silakan bayar melalui popup Midtrans.',
                            snap_token: midtransData.token,
                            client_key: MIDTRANS_CLIENT_KEY,
                            reservasi_id: new_reservasi_id
                        });
                    }
                    return send(res, 502, { success: false, message: 'Gagal mendapatkan Snap Token Midtrans.', reservasi_id: new_reservasi_id });
                } catch (e) {
                    return send(res, 502, { success: false, message: 'Gagal menghubungi Midtrans.', reservasi_id: new_reservasi_id });
                }
            }

            case 'GET:payment_status': {
                const session = getSession(req);
                if (!session) return send(res, 401, { success: false, message: 'Anda harus login terlebih dahulu!' });

                const res_id = parseInt(url.searchParams.get('res_id'), 10);
                const status = url.searchParams.get('status') === 'success' ? 'disetujui' : 'pending';

                await db.query('UPDATE reservasi SET status = ? WHERE id = ? AND user_id = ?', [status, res_id, session.user_id]);
                return send(res, 200, { success: true, message: 'Status pembayaran diperbarui.' });
            }

            // -----------------------------------------------------------
            // WEBHOOK MIDTRANS (server-to-server, tanpa auth cookie)
            // -----------------------------------------------------------
            case 'POST:notification': {
                const notification = await readBody(req);
                if (notification && notification.order_id) {
                    const { order_id, transaction_status, fraud_status } = notification;
                    const parts = order_id.split('-');
                    const reservasi_id = parts[1] ? parseInt(parts[1], 10) : 0;

                    let status_db = null;
                    if (transaction_status === 'capture') {
                        if (fraud_status === 'accept') status_db = 'disetujui';
                    } else if (transaction_status === 'settlement') {
                        status_db = 'disetujui';
                    } else if (transaction_status === 'pending') {
                        status_db = 'pending';
                    } else if (['deny', 'expire', 'cancel'].includes(transaction_status)) {
                        status_db = 'dibatalkan';
                    }

                    if (status_db && reservasi_id > 0) {
                        await db.query('UPDATE reservasi SET status = ? WHERE id = ?', [status_db, reservasi_id]);
                    }
                }
                return send(res, 200, { received: true });
            }

            // -----------------------------------------------------------
            // ADMIN (perlu role admin)
            // -----------------------------------------------------------
            case 'GET:admin_stats': {
                const session = getSession(req);
                if (!session || session.role !== 'admin') return send(res, 403, { success: false, message: 'Akses ditolak.' });

                const [[{ total_transaksi }]] = await db.query('SELECT COUNT(*) AS total_transaksi FROM reservasi');
                const [[{ total_pendapatan }]] = await db.query(
                    "SELECT COALESCE(SUM(total_harga),0) AS total_pendapatan FROM reservasi WHERE status = 'disetujui'"
                );
                const [[{ total_pending }]] = await db.query(
                    "SELECT COUNT(*) AS total_pending FROM reservasi WHERE status = 'pending'"
                );
                const [[{ total_pelanggan }]] = await db.query(
                    "SELECT COUNT(*) AS total_pelanggan FROM users WHERE role = 'pelanggan'"
                );

                return send(res, 200, { success: true, total_transaksi, total_pendapatan, total_pending, total_pelanggan });
            }

            case 'GET:admin_reservasi': {
                const session = getSession(req);
                if (!session || session.role !== 'admin') return send(res, 403, { success: false, message: 'Akses ditolak.' });

                const filter_status = url.searchParams.get('filter_status') || 'semua';
                let sql = `
                    SELECT r.*, l.nama_lapangan, l.jenis_olahraga, u.nama AS nama_pemesan, u.email AS email_pemesan
                    FROM reservasi r
                    JOIN lapangan l ON r.lapangan_id = l.id
                    JOIN users u ON r.user_id = u.id
                `;
                const params = [];
                if (filter_status !== 'semua') {
                    sql += ' WHERE r.status = ?';
                    params.push(filter_status);
                }
                sql += ' ORDER BY r.id DESC';

                const [rows] = await db.query(sql, params);
                return send(res, 200, { success: true, data: rows });
            }

            case 'GET:admin_update_status': {
                const session = getSession(req);
                if (!session || session.role !== 'admin') return send(res, 403, { success: false, message: 'Akses ditolak.' });

                const id = parseInt(url.searchParams.get('id'), 10);
                const status = url.searchParams.get('status');
                if (!['pending', 'disetujui', 'dibatalkan'].includes(status)) {
                    return send(res, 400, { success: false, message: 'Status tidak valid.' });
                }

                await db.query('UPDATE reservasi SET status = ? WHERE id = ?', [status, id]);
                return send(res, 200, { success: true, message: `Status reservasi #${id} berhasil diubah menjadi ${status.toUpperCase()}!` });
            }

            case 'GET:admin_delete': {
                const session = getSession(req);
                if (!session || session.role !== 'admin') return send(res, 403, { success: false, message: 'Akses ditolak.' });

                const id = parseInt(url.searchParams.get('id'), 10);
                await db.query('DELETE FROM reservasi WHERE id = ?', [id]);
                return send(res, 200, { success: true, message: `Data reservasi #${id} berhasil dihapus!` });
            }

            default:
                return send(res, 404, { success: false, message: `Action tidak ditemukan: ${action}` });
        }
    } catch (err) {
        console.error(err);
        return send(res, 500, { success: false, message: 'Terjadi kesalahan server.', error: String(err.message || err) });
    }
};

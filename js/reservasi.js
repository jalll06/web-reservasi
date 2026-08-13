// ============================================================================
// RESERVASI.JS - logika halaman Reservasi & Pembayaran
// ============================================================================

function switchTab(tab) {
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    if (tab === 'login') {
        btnLogin.className = "w-1/2 py-3.5 text-center text-sm font-bold border-b-2 border-emerald-500 text-emerald-400 bg-slate-800";
        btnRegister.className = "w-1/2 py-3.5 text-center text-sm font-bold border-b-2 border-transparent text-slate-400 bg-slate-900/40";
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
    } else {
        btnRegister.className = "w-1/2 py-3.5 text-center text-sm font-bold border-b-2 border-emerald-500 text-emerald-400 bg-slate-800";
        btnLogin.className = "w-1/2 py-3.5 text-center text-sm font-bold border-b-2 border-transparent text-slate-400 bg-slate-900/40";
        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
    }
}

function showAlert(type, message) {
    document.getElementById('alert-area').innerHTML = alertBox(type, escapeHtml(message));
}

function clearAlert() {
    document.getElementById('alert-area').innerHTML = '';
}

function renderRiwayatRow(r) {
    let statusBadge = '';
    if (r.status === 'disetujui') {
        statusBadge = `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold"><i class="fas fa-check-circle mr-1"></i> LUNAS</span>`;
    } else if (r.status === 'pending') {
        statusBadge = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold"><i class="fas fa-clock mr-1"></i> BELUM BAYAR</span>`;
    } else {
        statusBadge = `<span class="bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold">DIBATALKAN</span>`;
    }

    const aksi = r.status === 'pending'
        ? `<a href="#" data-res-id="${r.id}" class="bayar-btn bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-3 py-1.5 rounded-lg text-xs transition-all shadow-md inline-block">Bayar Sekarang</a>`
        : `<span class="text-slate-500 text-[11px]"><i class="fas fa-check text-emerald-400"></i> Selesai</span>`;

    return `
        <tr class="hover:bg-slate-700/30">
            <td class="p-3 font-semibold text-white">${escapeHtml(r.nama_lapangan)}</td>
            <td class="p-3">
                ${formatTanggal(r.tanggal)}<br>
                <span class="text-slate-400">${formatJam(r.jam_mulai)} - ${formatJam(r.jam_selesai)} WIB</span>
            </td>
            <td class="p-3 font-bold text-emerald-400">Rp ${formatRupiah(r.total_harga)}</td>
            <td class="p-3">${statusBadge}</td>
            <td class="p-3">${aksi}</td>
        </tr>
    `;
}

async function loadRiwayat() {
    const area = document.getElementById('riwayat-area');
    const res = await apiCall('riwayat');

    if (!res.success || !res.data || !res.data.length) {
        area.innerHTML = `<div class="bg-slate-900/60 rounded-xl p-8 text-center text-slate-400 text-xs">Belum ada pemesanan.</div>`;
        return;
    }

    area.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-slate-900 text-slate-400 uppercase text-[10px]">
                    <tr>
                        <th class="p-3">Lapangan</th>
                        <th class="p-3">Tanggal & Jam</th>
                        <th class="p-3">Total Harga</th>
                        <th class="p-3">Status Bayar</th>
                        <th class="p-3">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700/50">
                    ${res.data.map(renderRiwayatRow).join('')}
                </tbody>
            </table>
        </div>
    `;

    area.querySelectorAll('.bayar-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const resId = btn.dataset.resId;
            await apiCall('payment_status', { query: { status: 'success', res_id: resId } });
            loadRiwayat();
            loadStats();
        });
    });
}

async function loadLapanganOptions() {
    const select = document.getElementById('b-lapangan');
    const res = await apiCall('lapangan_list');
    if (!res.success) return;

    const params = new URLSearchParams(window.location.search);
    const preselect = params.get('lapangan_id');

    select.innerHTML = res.data.map(lap => `
        <option value="${lap.id}" ${String(lap.id) === preselect ? 'selected' : ''}>
            ${escapeHtml(lap.nama_lapangan)} (Rp ${formatRupiah(lap.harga_per_jam)}/jam)
        </option>
    `).join('');
}

function prefillBookingForm() {
    const params = new URLSearchParams(window.location.search);
    document.getElementById('b-tanggal').value = params.get('tanggal') || todayStr();
    document.getElementById('b-jam-mulai').value = params.get('jam_mulai') || '10:00';
    document.getElementById('b-jam-selesai').value = params.get('jam_selesai') || '11:00';
}

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

async function showMemberArea() {
    document.getElementById('guest-area').classList.add('hidden');
    document.getElementById('member-area').classList.remove('hidden');
    await loadLapanganOptions();
    prefillBookingForm();
    await loadRiwayat();
}

function showGuestArea() {
    document.getElementById('member-area').classList.add('hidden');
    document.getElementById('guest-area').classList.remove('hidden');
    const params = new URLSearchParams(window.location.search);
    switchTab(params.get('tab') === 'register' ? 'register' : 'login');
}

async function renderTopNav() {
    const user = await getSession();
    const adminLink = document.getElementById('admin-link');
    const logoutLink = document.getElementById('logout-link');

    if (user && user.role === 'admin') {
        adminLink.innerHTML = `<a href="admin.html" class="bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-900 text-xs px-3 py-2 rounded-lg font-bold"><i class="fas fa-cog mr-1"></i> Admin Panel</a>`;
    }
    if (user) {
        logoutLink.innerHTML = `<a href="#" onclick="doLogout(); return false;" class="bg-rose-500/20 text-rose-400 text-xs px-3 py-2 rounded-lg"><i class="fas fa-sign-out-alt mr-1"></i> Logout</a>`;
    }
    return user;
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await renderTopNav();

    if (user) {
        await showMemberArea();
    } else {
        showGuestArea();
    }

    // LOGIN
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();
        const form = new FormData(e.target);
        const res = await apiCall('login', {
            method: 'POST',
            body: { email: form.get('email'), password: form.get('password') }
        });

        if (res.success) {
            if (res.redirect) {
                window.location.href = res.redirect;
            } else {
                showAlert('success', res.message);
                window.location.reload();
            }
        } else {
            showAlert('error', res.message);
        }
    });

    // REGISTER
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();
        const form = new FormData(e.target);
        const res = await apiCall('register', {
            method: 'POST',
            body: {
                nama: form.get('nama'),
                email: form.get('email'),
                password: form.get('password'),
                konfirmasi_password: form.get('konfirmasi_password')
            }
        });

        if (res.success) {
            showAlert('success', res.message);
            window.location.reload();
        } else {
            showAlert('error', res.message);
        }
    });

    // BOOKING
    document.getElementById('booking-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();
        const form = new FormData(e.target);
        const res = await apiCall('booking', {
            method: 'POST',
            body: {
                lapangan_id: form.get('lapangan_id'),
                tanggal: form.get('tanggal'),
                jam_mulai: form.get('jam_mulai'),
                jam_selesai: form.get('jam_selesai')
            }
        });

        if (res.success && res.snap_token) {
            showAlert('success', res.message);
            snap.pay(res.snap_token, {
                onSuccess: function () {
                    window.location.href = `reservasi.html?payment_status=success&res_id=${res.reservasi_id}`;
                },
                onPending: function () {
                    alert('Menunggu pembayaran Anda.');
                    window.location.reload();
                },
                onError: function () {
                    alert('Pembayaran gagal!');
                    window.location.reload();
                },
                onClose: function () {
                    window.location.reload();
                }
            });
        } else {
            showAlert('error', res.message || 'Gagal membuat reservasi.');
        }
    });

    // Handle ?payment_status=success&res_id=... di URL (redirect balik dari Snap)
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_status') && params.get('res_id')) {
        await apiCall('payment_status', {
            query: { status: params.get('payment_status'), res_id: params.get('res_id') }
        });
        window.location.href = 'reservasi.html';
    }
});

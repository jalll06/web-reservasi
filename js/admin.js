// ============================================================================
// ADMIN.JS - logika halaman Admin Panel
// ============================================================================

function showAdminAlert(containerId, type, message) {
    document.getElementById(containerId).innerHTML = alertBox(type, escapeHtml(message));
}

async function loadStats() {
    const res = await apiCall('admin_stats');
    if (!res.success) return;
    document.getElementById('s-pendapatan').textContent = formatRupiah(res.total_pendapatan);
    document.getElementById('s-pending').textContent = res.total_pending;
    document.getElementById('s-transaksi').textContent = res.total_transaksi;
    document.getElementById('s-pelanggan').textContent = res.total_pelanggan;
}

function statusBadgeHtml(status) {
    if (status === 'disetujui') {
        return `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold"><i class="fas fa-check-circle mr-1"></i> LUNAS</span>`;
    } else if (status === 'pending') {
        return `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold"><i class="fas fa-clock mr-1"></i> BELUM BAYAR</span>`;
    }
    return `<span class="bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold"><i class="fas fa-times-circle mr-1"></i> DIBATALKAN</span>`;
}

function renderReservasiRow(r) {
    const aksiLunas = r.status !== 'disetujui'
        ? `<button data-id="${r.id}" data-status="disetujui" class="aksi-btn bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-2.5 py-1 rounded text-[11px] transition-all"><i class="fas fa-check"></i> Set Lunas</button>`
        : '';
    const aksiBatal = r.status !== 'dibatalkan'
        ? `<button data-id="${r.id}" data-status="dibatalkan" class="aksi-btn bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-bold px-2.5 py-1 rounded text-[11px] transition-all"><i class="fas fa-ban"></i> Batal</button>`
        : '';

    return `
        <tr class="hover:bg-slate-700/30">
            <td class="p-3">
                <span class="font-bold text-amber-400">#${r.id}</span>
                <div class="font-semibold text-white mt-0.5">${escapeHtml(r.nama_pemesan)}</div>
                <div class="text-[10px] text-slate-400">${escapeHtml(r.email_pemesan)}</div>
            </td>
            <td class="p-3 font-medium text-white">
                ${escapeHtml(r.nama_lapangan)}
                <span class="block text-[10px] text-slate-400 uppercase">${escapeHtml(r.jenis_olahraga)}</span>
            </td>
            <td class="p-3">
                <i class="far fa-calendar-alt text-slate-400 mr-1"></i> ${formatTanggal(r.tanggal)}<br>
                <i class="far fa-clock text-slate-400 mr-1"></i> ${formatJam(r.jam_mulai)} - ${formatJam(r.jam_selesai)}
            </td>
            <td class="p-3 font-extrabold text-emerald-400">Rp ${formatRupiah(r.total_harga)}</td>
            <td class="p-3">${statusBadgeHtml(r.status)}</td>
            <td class="p-3">
                <div class="flex items-center justify-center gap-1.5">
                    ${aksiLunas}
                    ${aksiBatal}
                    <button data-id="${r.id}" class="hapus-btn bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white px-2.5 py-1 rounded text-[11px] transition-all"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `;
}

async function loadReservasiTable() {
    const area = document.getElementById('reservasi-table-area');
    const filter_status = document.getElementById('filter-status').value;

    const res = await apiCall('admin_reservasi', { query: { filter_status } });
    if (!res.success || !res.data || !res.data.length) {
        area.innerHTML = `
            <div class="bg-slate-900/60 rounded-xl p-8 text-center text-slate-400 text-xs">
                <i class="fas fa-inbox text-3xl mb-2 text-slate-600 block"></i>
                Belum ada data transaksi di database.
            </div>`;
        return;
    }

    area.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                        <th class="p-3">ID & Pemesan</th>
                        <th class="p-3">Lapangan</th>
                        <th class="p-3">Tanggal & Jam (WIB)</th>
                        <th class="p-3">Total Harga</th>
                        <th class="p-3">Status Bayar</th>
                        <th class="p-3 text-center">Aksi Manajemen</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700/50">
                    ${res.data.map(renderReservasiRow).join('')}
                </tbody>
            </table>
        </div>
    `;

    area.querySelectorAll('.aksi-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const status = btn.dataset.status;
            const label = status === 'disetujui' ? 'LUNAS' : 'DIBATALKAN';
            if (!confirm(`Tandai pesanan #${id} sebagai ${label}?`)) return;

            const res = await apiCall('admin_update_status', { query: { id, status } });
            if (res.success) {
                showAdminAlert('dashboard-alert', 'success', res.message);
                loadStats();
                loadReservasiTable();
            } else {
                showAdminAlert('dashboard-alert', 'error', res.message);
            }
        });
    });

    area.querySelectorAll('.hapus-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (!confirm(`Hapus permanen reservasi #${id}?`)) return;

            const res = await apiCall('admin_delete', { query: { id } });
            if (res.success) {
                showAdminAlert('dashboard-alert', 'success', res.message);
                loadStats();
                loadReservasiTable();
            } else {
                showAdminAlert('dashboard-alert', 'error', res.message);
            }
        });
    });
}

async function showDashboard(user) {
    document.getElementById('admin-login-view').classList.add('hidden');
    document.getElementById('admin-dashboard-view').classList.remove('hidden');
    document.getElementById('admin-nama').textContent = user.nama;

    await loadStats();
    await loadReservasiTable();

    document.getElementById('filter-status').addEventListener('change', loadReservasiTable);
    document.getElementById('admin-logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await doLogout();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await getSession();

    if (user && user.role === 'admin') {
        showDashboard(user);
        return;
    }

    document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        document.getElementById('admin-alert').innerHTML = '';
        const form = new FormData(e.target);
        const res = await apiCall('admin_login', {
            method: 'POST',
            body: { email: form.get('email'), password: form.get('password') }
        });

        if (res.success) {
            window.location.reload();
        } else {
            showAdminAlert('admin-alert', 'error', res.message);
        }
    });
});

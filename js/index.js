// ============================================================================
// INDEX.JS - logika halaman Beranda
// ============================================================================

function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function getFilterFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return {
        tanggal: params.get('tanggal') || todayStr(),
        jam_mulai: params.get('jam_mulai') || '10:00',
        jam_selesai: params.get('jam_selesai') || '11:00',
        jenis: params.get('jenis') || 'semua'
    };
}

function renderLapanganCard(lap, filter) {
    const isTersedia = lap.status_ketersediaan === 'TERSEDIA';
    const isFutsal = (lap.jenis_olahraga || '').toLowerCase() === 'futsal';

    return `
        <div class="bg-slate-800 border ${isTersedia ? 'border-slate-700 hover:border-emerald-500/50' : 'border-rose-900/50'} rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <span class="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${isFutsal ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'} mb-1">
                            ${escapeHtml((lap.jenis_olahraga || '').toUpperCase())}
                        </span>
                        <h4 class="text-lg font-bold text-white">${escapeHtml(lap.nama_lapangan)}</h4>
                    </div>
                    <div>
                        ${isTersedia ? `
                            <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Tersedia
                            </span>` : `
                            <span class="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-bold px-2.5 py-1 rounded-full">Penuh</span>`}
                    </div>
                </div>

                <div class="bg-slate-900/80 p-3 rounded-lg mb-4 text-xs space-y-1">
                    <div class="flex justify-between text-slate-400">
                        <span>Tarif:</span>
                        <span class="font-bold text-white">Rp ${formatRupiah(lap.harga_per_jam)} / jam</span>
                    </div>
                    ${!isTersedia ? `
                        <div class="flex justify-between text-rose-400 pt-1 border-t border-slate-800">
                            <span>Dipesan Oleh:</span>
                            <span class="font-semibold">${escapeHtml(lap.nama_pemesan)}</span>
                        </div>` : ''}
                </div>
            </div>

            <div>
                ${isTersedia ? `
                    <a href="reservasi.html?lapangan_id=${lap.id}&tanggal=${filter.tanggal}&jam_mulai=${filter.jam_mulai}&jam_selesai=${filter.jam_selesai}"
                       class="block w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-xs text-center transition-colors">
                        <i class="fas fa-calendar-plus mr-1"></i> Pesan Lapangan Ini
                    </a>` : `
                    <button disabled class="w-full bg-slate-700 text-slate-500 font-bold py-2.5 px-4 rounded-lg text-xs cursor-not-allowed">
                        Tidak Tersedia
                    </button>`}
            </div>
        </div>
    `;
}

async function loadLapangan(filter) {
    const grid = document.getElementById('lapangan-grid');
    grid.innerHTML = `<div class="text-slate-400 text-sm">Memuat data lapangan...</div>`;

    const res = await apiCall('lapangan', { query: filter });
    if (!res.success) {
        grid.innerHTML = `<div class="text-rose-400 text-sm">Gagal memuat data lapangan.</div>`;
        return;
    }

    document.getElementById('c-total').textContent = res.total_lapangan;
    document.getElementById('c-tersedia').textContent = res.total_tersedia;
    document.getElementById('c-terisi').textContent = res.total_terisi;
    document.getElementById('slot-info').textContent =
        `${formatTanggal(filter.tanggal)} (${filter.jam_mulai} - ${filter.jam_selesai} WIB)`;

    if (!res.data.length) {
        grid.innerHTML = `<div class="text-slate-400 text-sm">Tidak ada data lapangan.</div>`;
        return;
    }

    grid.innerHTML = res.data.map(lap => renderLapanganCard(lap, filter)).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderNavbarAuth('auth-area');
    updateServerTime();

    const filter = getFilterFromQuery();
    document.getElementById('f-tanggal').value = filter.tanggal;
    document.getElementById('f-jam-mulai').value = filter.jam_mulai;
    document.getElementById('f-jam-selesai').value = filter.jam_selesai;
    document.getElementById('f-jenis').value = filter.jenis;

    loadLapangan(filter);

    document.getElementById('filter-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const newFilter = {
            tanggal: form.get('tanggal'),
            jam_mulai: form.get('jam_mulai'),
            jam_selesai: form.get('jam_selesai'),
            jenis: form.get('jenis')
        };
        const params = new URLSearchParams(newFilter);
        window.location.search = params.toString();
    });
});

// ============================================================================
// COMMON.JS - helper bersama untuk semua halaman
// ============================================================================

const API_BASE = '/api';

async function apiCall(action, { method = 'GET', body = null, query = {} } = {}) {
    const url = new URL(API_BASE, window.location.origin);
    url.searchParams.set('action', action);
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));

    const opts = {
        method,
        credentials: 'include',
        headers: {}
    };
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }

    const res = await fetch(url.toString(), opts);
    let data;
    try {
        data = await res.json();
    } catch (e) {
        data = { success: false, message: 'Respon server tidak valid.' };
    }
    data.__status = res.status;
    return data;
}

function formatRupiah(n) {
    return new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
}

function formatTanggal(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatJam(timeStr) {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
}

function alertBox(type, message) {
    const isError = type === 'error';
    return `
        <div class="${isError ? 'bg-rose-500/10 border-rose-500 text-rose-400' : 'bg-emerald-500/10 border-emerald-500 text-emerald-400'} border px-4 py-3 rounded-xl flex items-center gap-3 mb-4">
            <i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'} text-xl"></i>
            <div>${message}</div>
        </div>
    `;
}

async function getSession() {
    const res = await apiCall('me');
    return res.success ? res.user : null;
}

async function renderNavbarAuth(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const user = await getSession();

    if (user) {
        container.innerHTML = `
            <div class="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
                <div class="text-xs text-right">
                    <p class="font-bold text-emerald-400">${escapeHtml(user.nama)}</p>
                    <p class="text-[10px] text-slate-400 uppercase">${escapeHtml(user.role)}</p>
                </div>
                ${user.role === 'admin' ? `
                    <a href="admin.html" class="bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-900 px-2.5 py-1.5 rounded-lg transition-all text-xs font-bold" title="Panel Admin">
                        <i class="fas fa-cog"></i> Admin
                    </a>` : ''}
                <a href="#" onclick="doLogout(); return false;" class="bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white p-2 rounded-lg transition-all text-xs" title="Logout">
                    <i class="fas fa-sign-out-alt"></i>
                </a>
            </div>
        `;
    } else {
        container.innerHTML = `
            <a href="reservasi.html?tab=login" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-md">
                <i class="fas fa-sign-in-alt"></i> Masuk / Daftar
            </a>
        `;
    }
    return user;
}

async function doLogout() {
    await apiCall('logout', { method: 'POST' });
    window.location.href = 'index.html';
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function updateServerTime() {
    const el = document.getElementById('server-time');
    if (!el) return;
    // If serverTime is available, use it (kept in milliseconds), otherwise fallback to client-based WIB
    let wibDate;
    if (window.__serverTimeSync && typeof window.__serverTimeSync.offsetMillis === 'number') {
        const now = Date.now() + window.__serverTimeSync.offsetMillis;
        wibDate = new Date(now + (7 * 60 * 60000));
    } else {
        const now = new Date();
        const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
        wibDate = new Date(utcMillis + (7 * 60 * 60000));
    }
    const hh = String(wibDate.getHours()).padStart(2, '0');
    const mm = String(wibDate.getMinutes()).padStart(2, '0');
    el.textContent = `${hh}:${mm}`;
}
// Update immediately and then every 30 seconds
updateServerTime();
setInterval(updateServerTime, 1000 * 30);

// Try to fetch server time once to compute offset between client and server.
async function syncServerTime() {
    try {
        const res = await fetch('/api?action=server_time');
        const data = await res.json();
        if (data && data.epoch) {
            const clientNow = Date.now();
            // offset = serverEpoch - clientEpoch
            window.__serverTimeSync = { offsetMillis: data.epoch - clientNow };
            updateServerTime();
        }
    } catch (e) {
        // ignore
    }
}
syncServerTime();

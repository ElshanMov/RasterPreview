// src/services/titiler.logger.ts

/**
 * TiTiler Request Logger — Fetch Interceptor
 * 
 * Import etmək kifayətdir — bütün TiTiler sorğuları avtomatik tutulur.
 * Heç bir başqa faylda dəyişiklik lazım deyil.
 *
 * Console:
 *   TiTilerLog.print()       → tablo
 *   TiTilerLog.stats()       → statistika
 *   TiTilerLog.copy()        → clipboard-a JSON kopyala (Claude-a paste et)
 *   TiTilerLog.download()    → .json fayl yüklə
 *   TiTilerLog.clear()       → təmizlə
 */

// ============================================================================
// Types
// ============================================================================

export interface RequestEntry {
    id: number;
    ts: string;
    type: 'info' | 'statistics' | 'bounds' | 'tile' | 'preview' | 'other';
    url: string;
    status: number | null;
    ok: boolean;
    ms: number;
    sizeKB: number | null;
    error: string | null;
    z?: number;
    x?: number;
    y?: number;
    scale?: string;
    cogUrl?: string;
    bidx?: string;
    rescale?: string;
    resampling?: string;
    buffer?: string;
}

export interface LogSummary {
    exportedAt: string;
    stats: {
        total: number;
        success: number;
        failed: number;
        avgMs: number;
        maxMs: number;
        totalKB: number;
        byType: Record<string, { count: number; avgMs: number }>;
        byZoom: Record<number, { count: number; avgMs: number; failed: number }>;
        byStatus: Record<number, number>;
        slowest: { url: string; ms: number } | null;
    };
    entries: RequestEntry[];
}

// ============================================================================
// Logger Class
// ============================================================================

class TiTilerLogger {
    entries: RequestEntry[] = [];
    private _id = 0;
    private _listeners: Set<() => void> = new Set();
    enabled = true;

    subscribe(fn: () => void) {
        this._listeners.add(fn);
        return () => { this._listeners.delete(fn); };
    }

    private _notify() { this._listeners.forEach(fn => fn()); }

    // ── Log entry əlavə et ──────────────────────────────────
    log(url: string, status: number | null, ok: boolean, ms: number, sizeBytes?: number, error?: string) {
        if (!this.enabled) return;

        const p = this._parse(url);
        const entry: RequestEntry = {
            id: ++this._id,
            ts: new Date().toISOString(),
            type: p.type,
            url,
            status,
            ok,
            ms: Math.round(ms),
            sizeKB: sizeBytes != null ? Math.round(sizeBytes / 1024 * 10) / 10 : null,
            error: error || null,
            z: p.z, x: p.x, y: p.y, scale: p.scale,
            cogUrl: p.cogUrl, bidx: p.bidx, rescale: p.rescale,
            resampling: p.resampling, buffer: p.buffer,
        };
        this.entries.push(entry);
        this._notify();

        // Console: yığcam bir sətir
        const icon = ok ? '✅' : '❌';
        const dc = ms > 2000 ? '#ef4444' : ms > 500 ? '#f59e0b' : '#10b981';
        if (p.type === 'tile') {
            console.log(
                `%c${icon} tile z=${p.z} x=${p.x} y=${p.y} %c${ms}ms %c${status} ${entry.sizeKB ?? '?'}KB`,
                'font-size:10px;color:#6b7280',
                `font-size:10px;font-weight:bold;color:${dc}`,
                `font-size:10px;color:${ok ? '#10b981' : '#ef4444'}`
            );
        } else {
            console.log(`%c${icon} ${p.type} %c${ms}ms %c${status}`, `font-weight:bold;color:${ok ? '#10b981' : '#ef4444'}`, `font-weight:bold;color:${dc}`, 'color:#6b7280');
        }
    }

    // ── URL Parser ──────────────────────────────────────────
    private _parse(url: string) {
        let type: RequestEntry['type'] = 'other';
        let z: number | undefined, x: number | undefined, y: number | undefined, scale: string | undefined;

        if (url.includes('/tiles/')) {
            type = 'tile';
            const m = url.match(/\/tiles\/[^/]+\/(\d+)\/(\d+)\/(\d+)(@\dx)?/);
            if (m) { z = +m[1]; x = +m[2]; y = +m[3]; scale = m[4] || '@1x'; }
        } else if (url.includes('/info')) type = 'info';
        else if (url.includes('/statistics')) type = 'statistics';
        else if (url.includes('/bounds')) type = 'bounds';
        else if (url.includes('/preview')) type = 'preview';

        let cogUrl: string | undefined, bidx: string | undefined, rescale: string | undefined;
        let resampling: string | undefined, buffer: string | undefined;
        try {
            const u = new URL(url, window.location.origin);
            cogUrl = u.searchParams.get('url') || undefined;
            bidx = u.searchParams.getAll('bidx').join(',') || undefined;
            rescale = u.searchParams.getAll('rescale').join(' | ') || undefined;
            resampling = u.searchParams.get('resampling') || undefined;
            buffer = u.searchParams.get('buffer') || undefined;
        } catch { /* */ }

        return { type, z, x, y, scale, cogUrl, bidx, rescale, resampling, buffer };
    }

    // ── Stats ───────────────────────────────────────────────
    getStats() {
        const done = this.entries.filter(e => e.status !== null);
        const durations = done.map(e => e.ms);

        const byType: Record<string, { count: number; avgMs: number }> = {};
        const byZoom: Record<number, { count: number; avgMs: number; failed: number }> = {};
        const byStatus: Record<number, number> = {};

        for (const e of this.entries) {
            if (!byType[e.type]) byType[e.type] = { count: 0, avgMs: 0 };
            byType[e.type].count++;

            if (e.type === 'tile' && e.z != null) {
                if (!byZoom[e.z]) byZoom[e.z] = { count: 0, avgMs: 0, failed: 0 };
                byZoom[e.z].count++;
                if (!e.ok) byZoom[e.z].failed++;
            }

            if (e.status != null) byStatus[e.status] = (byStatus[e.status] || 0) + 1;
        }

        for (const t in byType) {
            const tl = done.filter(e => e.type === t);
            byType[t].avgMs = tl.length ? Math.round(tl.reduce((s, e) => s + e.ms, 0) / tl.length) : 0;
        }
        for (const z in byZoom) {
            const zl = done.filter(e => e.type === 'tile' && e.z === +z);
            byZoom[+z].avgMs = zl.length ? Math.round(zl.reduce((s, e) => s + e.ms, 0) / zl.length) : 0;
        }

        const slowest = done.length ? done.reduce((a, b) => a.ms > b.ms ? a : b) : null;

        return {
            total: this.entries.length,
            success: done.filter(e => e.ok).length,
            failed: done.filter(e => !e.ok).length,
            avgMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
            maxMs: durations.length ? Math.max(...durations) : 0,
            totalKB: Math.round(done.reduce((s, e) => s + (e.sizeKB || 0), 0)),
            byType,
            byZoom,
            byStatus,
            slowest: slowest ? { url: slowest.url, ms: slowest.ms } : null,
        };
    }

    // ── Export data ──────────────────────────────────────────
    toJSON(): string {
        return JSON.stringify({ exportedAt: new Date().toISOString(), stats: this.getStats(), entries: this.entries }, null, 2);
    }

    // ── Console commands ────────────────────────────────────
    print() {
        console.table(this.entries.map(e => ({
            '#': e.id, type: e.type, status: e.status, ms: e.ms,
            z: e.z ?? '-', x: e.x ?? '-', y: e.y ?? '-',
            KB: e.sizeKB ?? '-', err: e.error || '',
        })));
    }

    stats() {
        const s = this.getStats();
        console.log('%c═══ TiTiler Stats ═══', 'color:#6366f1;font-weight:bold');
        console.log(`Total: ${s.total}  ✅ ${s.success}  ❌ ${s.failed}  Avg: ${s.avgMs}ms  Max: ${s.maxMs}ms  ${s.totalKB}KB`);
        if (Object.keys(s.byType).length) { console.log('%cBy Type:', 'font-weight:bold'); console.table(s.byType); }
        if (Object.keys(s.byZoom).length) { console.log('%cBy Zoom:', 'font-weight:bold'); console.table(s.byZoom); }
    }

    async copy() {
        await navigator.clipboard.writeText(this.toJSON());
        console.log('%c📋 Kopyalandı! Claude-a paste edin.', 'color:#10b981;font-weight:bold');
    }

    download() {
        const blob = new Blob([this.toJSON()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `titiler-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    clear() { this.entries = []; this._id = 0; this._notify(); }
}

// ── Singleton ───────────────────────────────────────────────
export const titilerLog = new TiTilerLogger();

if (typeof window !== 'undefined') {
    (window as any).TiTilerLog = titilerLog;
}

// ============================================================================
// Fetch Interceptor — avtomatik, heç bir dəyişiklik lazım deyil
// ============================================================================

const TITILER_PATTERNS = ['/cog/', '/titiler-api/', 'tiles.mmdev.az'];

const _origFetch = window.fetch.bind(window);

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

    if (!titilerLog.enabled || !TITILER_PATTERNS.some(p => url.includes(p))) {
        return _origFetch(input, init);
    }

    const t0 = performance.now();
    try {
        const res = await _origFetch(input, init);
        const ms = performance.now() - t0;
        // Clone — original response toxunulmaz qalır
        res.clone().blob()
            .then(b => titilerLog.log(url, res.status, res.ok, ms, b.size))
            .catch(() => titilerLog.log(url, res.status, res.ok, ms));
        return res;
    } catch (err: any) {
        titilerLog.log(url, 0, false, performance.now() - t0, undefined, err.message);
        throw err;
    }
};

export default titilerLog;
/**
 * RasterTileLayer Component
 * 
 * FAYL YOLU: src/components/map/RasterTileLayer.tsx
 * 
 * ✅ Bbox filtr — kənarda olan tile-lara sorğu getmir
 * ✅ Zoom debounce — sürətli zoom-da UI donmur
 * ✅ Queue limit — max 50 tile gözləyə bilər
 * ✅ AbortController — zoom dəyişdikdə köhnə sorğular ləğv olur
 * ✅ Console logger: TiTilerLog.print()
 */

import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { StacItem } from '../../types/raster.map.type';
import { TitilerService } from '../../services/titiler.service';
import { fetchRescale, toRescaleStrings } from '../../services/statistics.cache';

// ============================================================================
// Types & Constants
// ============================================================================

interface RasterTileLayerProps {
    item: StacItem;
    opacity?: number;
}

const MAX_CONCURRENT = 6;
const MAX_QUEUE = 50;
const TRANSPARENT_TILE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ============================================================================
// Bbox Utilities
// ============================================================================

function tileToBounds(z: number, x: number, y: number): [number, number, number, number] {
    const pow = Math.pow(2, z);
    const minLng = (x / pow) * 360 - 180;
    const maxLng = ((x + 1) / pow) * 360 - 180;
    const n1 = Math.PI - (2 * Math.PI * y) / pow;
    const maxLat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n1) - Math.exp(-n1)));
    const n2 = Math.PI - (2 * Math.PI * (y + 1)) / pow;
    const minLat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n2) - Math.exp(-n2)));
    return [minLng, minLat, maxLng, maxLat];
}

function bboxIntersects(
    a: [number, number, number, number],
    b: [number, number, number, number]
): boolean {
    return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

// ============================================================================
// Tile Logger
// ============================================================================

interface TileLog {
    id: number; z: number; x: number; y: number;
    status: number | null; ms: number; sizeKB: number | null;
    ok: boolean; skipped: boolean; url: string;
}

class TileLogger {
    logs: TileLog[] = [];
    private _id = 0;
    stats = { total: 0, loaded: 0, failed: 0, skipped: 0 };

    add(z: number, x: number, y: number, url: string, status: number | null, ok: boolean, ms: number, size?: number, skipped = false) {
        const entry: TileLog = {
            id: ++this._id, z, x, y, status, ok, skipped,
            ms: Math.round(ms),
            sizeKB: size != null ? Math.round(size / 1024 * 10) / 10 : null,
            url,
        };
        this.logs.push(entry);
        this.stats.total++;
        if (skipped) this.stats.skipped++;
        else if (ok) this.stats.loaded++;
        else this.stats.failed++;

        if (skipped) return;

        const icon = ok ? '✅' : '❌';
        const dc = ms > 1500 ? '#ef4444' : ms > 500 ? '#f59e0b' : '#10b981';
        console.log(
            `%c${icon} tile z=${z} x=${x} y=${y} %c${ms}ms %c${status} ${entry.sizeKB ?? '?'}KB`,
            'font-size:10px;color:#6b7280',
            `font-size:10px;font-weight:bold;color:${dc}`,
            `font-size:10px;color:${ok ? '#10b981' : '#ef4444'}`
        );
    }

    reset() { this.logs = []; this._id = 0; this.stats = { total: 0, loaded: 0, failed: 0, skipped: 0 }; }

    print() {
        console.table(this.logs.filter(l => !l.skipped).map(l => ({
            '#': l.id, z: l.z, x: l.x, y: l.y,
            status: l.status, ms: l.ms, KB: l.sizeKB, ok: l.ok ? '✅' : '❌'
        })));
    }

    printStats() {
        const { total, loaded, failed, skipped } = this.stats;
        const durations = this.logs.filter(l => l.ok && !l.skipped).map(l => l.ms);
        const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
        const max = durations.length ? Math.max(...durations) : 0;
        const totalKB = Math.round(this.logs.reduce((s, l) => s + (l.sizeKB || 0), 0));

        const byZoom: Record<number, { count: number; avg: number; failed: number; skipped: number }> = {};
        for (const l of this.logs) {
            if (!byZoom[l.z]) byZoom[l.z] = { count: 0, avg: 0, failed: 0, skipped: 0 };
            byZoom[l.z].count++;
            if (l.skipped) byZoom[l.z].skipped++;
            else if (!l.ok) byZoom[l.z].failed++;
        }
        for (const z in byZoom) {
            const zLogs = this.logs.filter(l => l.z === +z && l.ok && !l.skipped);
            byZoom[+z].avg = zLogs.length ? Math.round(zLogs.reduce((s, l) => s + l.ms, 0) / zLogs.length) : 0;
        }

        console.log('%c═══ Tile Stats ═══', 'color:#6366f1;font-weight:bold');
        console.log(`Total: ${total} | ✅ ${loaded} | ❌ ${failed} | ⏭️ ${skipped} skipped | Avg: ${avg}ms | Max: ${max}ms | ${totalKB}KB`);
        if (Object.keys(byZoom).length > 0) console.table(byZoom);
    }

    toJSON() { return JSON.stringify({ stats: this.stats, logs: this.logs }, null, 2); }
    async copy() { await navigator.clipboard.writeText(this.toJSON()); console.log('%c📋 Copied!', 'color:#10b981;font-weight:bold'); }
    download() {
        const blob = new Blob([this.toJSON()], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `tile-log-${Date.now()}.json`; a.click();
    }
}

const tileLogger = new TileLogger();
if (typeof window !== 'undefined') (window as any).TiTilerLog = tileLogger;

// ============================================================================
// COG URL Extractor
// ============================================================================

function extractCogUrl(item: StacItem): string | null {
    if (item.assets && typeof item.assets === 'object') {
        for (const [key, value] of Object.entries(item.assets)) {
            const asset = value as any;
            let href = asset?.href || asset?.Href || asset?.url || asset?.URL;
            let type = asset?.type || asset?.Type || '';
            if (typeof asset === 'string') href = asset;

            if (href && typeof href === 'string') {
                const isCogLike =
                    href.endsWith('.tif') || href.endsWith('.tiff') || href.endsWith('.cog') ||
                    href.includes('.tif?') || href.startsWith('s3://') ||
                    href.includes('raster-files') || href.includes('/cog/') ||
                    (type && (type.includes('geotiff') || type.includes('image/tiff') || type.includes('cloud-optimized')));
                const isStacApiUrl = href.includes('/collections/') || href.includes('/items/') || href.includes('/search');

                if (isCogLike || (!isStacApiUrl && key === 'data')) return href;
            }
        }
    }
    return null;
}

// ============================================================================
// Smart TileLayer — Bbox filtr + Queue + AbortController
// ============================================================================

function createSmartTileLayer(
    tileUrl: string,
    options: L.TileLayerOptions = {},
    rasterBbox?: [number, number, number, number]
) {
    let currentController = new AbortController();
    let activeRequests = 0;
    let queuedCount = 0;

    // Queue: fetch gözləyən tile-lar
    const queue: Array<() => void> = [];

    // ✅ MEMORY: Bütün blob URL-ləri izlə
    const activeBlobUrls = new Set<string>();

    function revokeAllBlobs() {
        for (const url of activeBlobUrls) {
            URL.revokeObjectURL(url);
        }
        activeBlobUrls.clear();
    }

    function processQueue() {
        while (queue.length > 0 && activeRequests < MAX_CONCURRENT) {
            const next = queue.shift();
            if (next) next();
        }
    }

    const SmartTileLayer = L.TileLayer.extend({
        createTile(this: any, coords: L.Coords, done: L.DoneCallback): HTMLImageElement {
            const tile = document.createElement('img');
            tile.alt = '';
            tile.setAttribute('role', 'presentation');

            // ✅ BBOX FİLTR
            if (rasterBbox) {
                const tileBounds = tileToBounds(coords.z, coords.x, coords.y);
                if (!bboxIntersects(tileBounds, rasterBbox)) {
                    tileLogger.add(coords.z, coords.x, coords.y, '', null, true, 0, 0, true);
                    tile.src = TRANSPARENT_TILE;
                    done(undefined, tile);
                    return tile;
                }
            }

            // ✅ QUEUE LİMİT — çox tile queue-da gözləyirsə, skip et
            if (queuedCount >= MAX_QUEUE) {
                tile.src = TRANSPARENT_TILE;
                done(undefined, tile);
                return tile;
            }

            const url = tileUrl
                .replace('{z}', String(coords.z))
                .replace('{x}', String(coords.x))
                .replace('{y}', String(coords.y));

            const signal = currentController.signal;
            const t0 = performance.now();

            const doFetch = () => {
                if (signal.aborted) {
                    queuedCount--;
                    tile.src = TRANSPARENT_TILE;
                    done(undefined, tile);
                    return;
                }

                activeRequests++;
                queuedCount--;

                fetch(url, { signal })
                    .then(r => {
                        if (!r.ok) throw new Error(`HTTP ${r.status}`);
                        return r.blob().then(b => ({ b, s: r.status }));
                    })
                    .then(({ b, s }) => {
                        tileLogger.add(coords.z, coords.x, coords.y, url, s, true, performance.now() - t0, b.size);
                        const blobUrl = URL.createObjectURL(b);
                        activeBlobUrls.add(blobUrl);  // ✅ izlə
                        tile.src = blobUrl;
                        done(undefined, tile);
                    })
                    .catch(err => {
                        if (err.name !== 'AbortError') {
                            tileLogger.add(coords.z, coords.x, coords.y, url, 0, false, performance.now() - t0);
                        }
                        tile.src = TRANSPARENT_TILE;
                        done(undefined, tile);
                    })
                    .finally(() => {
                        activeRequests--;
                        processQueue();
                    });
            };

            // Queue-ya əlavə et
            queuedCount++;
            if (activeRequests < MAX_CONCURRENT) {
                doFetch();
            } else {
                queue.push(doFetch);
            }

            return tile;
        },

        _onZoomChange(this: any) {
            currentController.abort();
            currentController = new AbortController();
            queue.length = 0;
            activeRequests = 0;
            queuedCount = 0;
        },

        onAdd(this: any, map: L.Map) {
            map.on('zoomstart', this._onZoomChange, this);

            // ✅ MEMORY: tile DOM-dan çıxanda blob URL sil
            this.on('tileunload', function (e: any) {
                const img = e.tile as HTMLImageElement;
                if (img && img.src && img.src.startsWith('blob:')) {
                    activeBlobUrls.delete(img.src);
                    URL.revokeObjectURL(img.src);
                }
            });

            return L.TileLayer.prototype.onAdd.call(this, map);
        },

        onRemove(this: any, map: L.Map) {
            map.off('zoomstart', this._onZoomChange, this);
            currentController.abort();
            queue.length = 0;
            revokeAllBlobs();  // ✅ layer silindikdə hamısını təmizlə
            return L.TileLayer.prototype.onRemove.call(this, map);
        }
    }) as new (url: string, options?: L.TileLayerOptions) => L.TileLayer;

    return new SmartTileLayer(tileUrl, options);
}

// ============================================================================
// React Component
// ============================================================================

const RasterTileLayer: React.FC<RasterTileLayerProps> = ({ item, opacity = 0.9 }) => {
    const map = useMap();
    const layerRef = useRef<L.TileLayer | null>(null);
    const mountedRef = useRef(true);

    const removeLayer = () => {
        if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    };

    useEffect(() => {
        if (!item) return;
        mountedRef.current = true;

        const loadLayer = async () => {
            removeLayer();
            tileLogger.reset();

            console.log('%c🗺️ RASTER LAYER LOADING', 'color: #10b981; font-weight: bold; font-size: 14px;', '\n   Item:', item.id);

            try {
                const t0 = performance.now();

                // 1) COG URL
                const cogUrl = extractCogUrl(item);
                if (!cogUrl) throw new Error(`COG URL tapılmadı! Item ID: ${item.id}`);
                console.log('%c📦 COG URL:', 'color: #10b981;', cogUrl);

                // 2) /info
                const infoStart = performance.now();
                const info = await TitilerService.getInfo(cogUrl);
                const infoMs = Math.round(performance.now() - infoStart);
                if (!mountedRef.current) return;

                // 3) Rescale — DB API-dən
                const rescaleStart = performance.now();
                const bands = await fetchRescale(cogUrl);
                const rescaleMs = Math.round(performance.now() - rescaleStart);
                if (!mountedRef.current) return;

                let rescale: string[];
                let rescaleSource: string;

                if (bands.length > 0) {
                    const bidx = TitilerService.getBandIndexes(info);
                    rescale = toRescaleStrings(bands, bidx.length);
                    rescaleSource = 'DB API';
                } else {
                    console.log('%c⚠️ DB-də rescale yoxdur, TiTiler fallback...', 'color: #f59e0b;');
                    const statistics = await TitilerService.getStatistics(cogUrl);
                    const bidx = TitilerService.getBandIndexes(info);
                    rescale = TitilerService.calculateRescale(statistics, bidx.length);
                    rescaleSource = 'TiTiler fallback';
                }

                console.log(`%c🎨 Rescale (${rescaleSource}, ${rescaleMs}ms):`, 'color: #6366f1;', rescale);

                // 4) Tile URL
                const bidx = TitilerService.getBandIndexes(info);
                const tileUrl = TitilerService.buildTileUrl(cogUrl, {
                    format: 'png',
                    bidx,
                    rescale,
                });

                // 5) Raster bbox
                const stacBbox = item.bbox as [number, number, number, number] | undefined;

                // 6) Layer
                const layer = createSmartTileLayer(tileUrl, {
                    opacity,
                    minZoom: 0,
                    maxZoom: 22,
                    minNativeZoom: info.minzoom || 0,
                    maxNativeZoom: info.maxzoom || 18,
                    tileSize: 256,
                    crossOrigin: 'anonymous',
                    zIndex: 1000,
                    pane: 'overlayPane',
                    errorTileUrl: TRANSPARENT_TILE,
                }, stacBbox);

                if (!mountedRef.current) return;

                layer.addTo(map);
                layerRef.current = layer;

                // Fit bounds
                if (stacBbox && stacBbox.length === 4) {
                    const [minLng, minLat, maxLng, maxLat] = stacBbox;
                    map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [50, 50], maxZoom: 16 });
                }

                const totalMs = Math.round(performance.now() - t0);
                console.log(
                    '%c✅ Layer hazırdır!', 'color: #10b981; font-weight: bold; font-size: 14px;',
                    `\n   /info: ${infoMs}ms`,
                    `\n   rescale: ${rescaleMs}ms (${rescaleSource})`,
                    `\n   bbox filter: ${stacBbox ? 'ON ✅' : 'OFF ⚠️'}`,
                    `\n   Total: ${totalMs}ms`
                );

            } catch (err: any) {
                console.error('%c❌ LAYER ERROR:', 'color: #ef4444; font-weight: bold;', err.message);
            }
        };

        loadLayer();
        return () => { mountedRef.current = false; removeLayer(); tileLogger.printStats(); };
    }, [item, map]);

    useEffect(() => {
        if (layerRef.current) layerRef.current.setOpacity(opacity);
    }, [opacity]);

    return null;
};

export default RasterTileLayer;
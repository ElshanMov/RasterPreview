/**
 * RasterTileLayer Component
 * 
 * TiTiler-dən COG tile-ları yükləyir.
 * 
 * ✅ CACHE FIRST: Statistics cache-dən oxunur (0.05ms), API fallback (5000ms)
 */

import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { StacItem } from '../../types/raster.map.type';
import { TitilerService } from '../../services/titiler.service';
import { getCachedStatistics } from '../../services/statistics.cache';

// ============================================================================
// Types
// ============================================================================

interface RasterTileLayerProps {
    item: StacItem;
    opacity?: number;
}

interface QueuedTile {
    coords: L.Coords;
    tile: HTMLImageElement;
    done: L.DoneCallback;
    retryCount: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_CONCURRENT_REQUESTS = 4;
const TRANSPARENT_TILE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ============================================================================
// Performance Timer
// ============================================================================

class PerformanceTimer {
    private timers: Map<string, number> = new Map();
    private results: Map<string, number> = new Map();

    start(label: string) {
        this.timers.set(label, performance.now());
    }

    end(label: string): number {
        const startTime = this.timers.get(label);
        if (!startTime) return 0;
        
        const duration = performance.now() - startTime;
        this.results.set(label, duration);
        this.timers.delete(label);
        return duration;
    }

    log(label: string, emoji: string = '🕐') {
        const duration = this.results.get(label);
        if (duration !== undefined) {
            const color = duration > 2000 ? '#ef4444' : duration > 1000 ? '#f59e0b' : '#10b981';
            console.log(
                `%c${emoji} ${label}: ${duration.toFixed(0)}ms`,
                `color: ${color}; font-weight: bold;`
            );
        }
    }

    printSummary() {
        console.log('%c📊 PERFORMANCE SUMMARY:', 'color: #6366f1; font-weight: bold; font-size: 14px;');
        this.results.forEach((duration, label) => {
            const color = duration > 2000 ? '#ef4444' : duration > 1000 ? '#f59e0b' : '#10b981';
            console.log(`   %c${label}: ${duration.toFixed(0)}ms`, `color: ${color};`);
        });
        
        const infoTime = this.results.get('INFO_API') || 0;
        const statsTime = this.results.get('STATISTICS_API') || this.results.get('STATISTICS_CACHE') || 0;
        const totalSetup = this.results.get('TOTAL_SETUP') || 0;
        const isCached = this.results.has('STATISTICS_CACHE');
        
        if (infoTime > 2000 || statsTime > 2000) {
            console.log(
                '%c⚠️ BACKEND YAVAŞLIĞI AŞKARLANDI!',
                'color: #ef4444; font-weight: bold; font-size: 14px;'
            );
            if (infoTime > 2000) {
                console.log(`   TiTiler /info endpoint: ${infoTime.toFixed(0)}ms (>2s)`);
            }
            if (statsTime > 2000 && !isCached) {
                console.log(`   TiTiler /statistics endpoint: ${statsTime.toFixed(0)}ms (>2s)`);
            }
        }
        
        console.log(`%c📦 Total setup time: ${totalSetup.toFixed(0)}ms`, 'color: #6366f1; font-weight: bold;');
        
        if (isCached) {
            console.log('%c⚡ CACHE SPEEDUP ACHIEVED!', 'color: #52c41a; font-weight: bold;');
        }
    }

    reset() {
        this.timers.clear();
        this.results.clear();
    }
}

// ============================================================================
// COG URL Extractor
// ============================================================================

function extractCogUrl(item: StacItem): string | null {
    if (item.assets && typeof item.assets === 'object') {
        for (const [key, value] of Object.entries(item.assets)) {
            const asset = value as any;
            
            let href = asset?.href || asset?.Href || asset?.url || asset?.URL;
            let type = asset?.type || asset?.Type || '';
            
            if (typeof asset === 'string') {
                href = asset;
            }

            if (href && typeof href === 'string') {
                const isCogLike = 
                    href.endsWith('.tif') ||
                    href.endsWith('.tiff') ||
                    href.endsWith('.cog') ||
                    href.includes('.tif?') ||
                    href.startsWith('s3://') ||
                    href.includes('raster-files') ||
                    href.includes('/cog/') ||
                    (type && (
                        type.includes('geotiff') ||
                        type.includes('image/tiff') ||
                        type.includes('cloud-optimized')
                    ));

                const isStacApiUrl = 
                    href.includes('/collections/') ||
                    href.includes('/items/') ||
                    href.includes('/search');

                if (isCogLike || (!isStacApiUrl && key === 'data')) {
                    return href;
                }
            }
        }
    }

    if (item.links && Array.isArray(item.links)) {
        for (const link of item.links) {
            const href = link.href || (link as any).url;
            if (href && typeof href === 'string') {
                if (
                    link.rel === 'data' ||
                    link.rel === 'enclosure' ||
                    link.rel === 'alternate' ||
                    href.endsWith('.tif') ||
                    href.startsWith('s3://')
                ) {
                    return href;
                }
            }
        }
    }

    if (item.properties) {
        const props = item.properties as any;
        const urlFields = ['cog_url', 'cogUrl', 'data_url', 'file_url', 'asset_url', 'href', 'url', 's3_path'];
        
        for (const field of urlFields) {
            if (props[field] && typeof props[field] === 'string') {
                return props[field];
            }
        }
    }

    return null;
}

// ============================================================================
// Diagnostic Logger
// ============================================================================

class DiagnosticLogger {
    private stats = { total: 0, loaded: 0, failed: 0 };

    reset() {
        this.stats = { total: 0, loaded: 0, failed: 0 };
    }

    logTileRequest() { this.stats.total++; }
    logTileSuccess() { this.stats.loaded++; }
    logTileFailed() { this.stats.failed++; }

    printSummary() {
        const rate = this.stats.total > 0 ? ((this.stats.loaded / this.stats.total) * 100).toFixed(0) : '0';
        console.log(
            `%c🖼️ TILES: ${this.stats.loaded}/${this.stats.total} (${rate}%) | Failed: ${this.stats.failed}`,
            this.stats.failed > 0 ? 'color: #f59e0b;' : 'color: #10b981;'
        );
    }
}

const logger = new DiagnosticLogger();

// ============================================================================
// Custom TileLayer with Queue
// ============================================================================

const createQueuedTileLayer = (tileUrl: string, options: L.TileLayerOptions = {}) => {
    const queue: QueuedTile[] = [];
    let activeRequests = 0;

    const processQueue = () => {
        while (queue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
            const item = queue.shift();
            if (item) {
                activeRequests++;
                loadTile(item);
            }
        }
    };

    const loadTile = (item: QueuedTile) => {
        const { coords, tile, done } = item;
        const url = tileUrl
            .replace('{z}', String(coords.z))
            .replace('{x}', String(coords.x))
            .replace('{y}', String(coords.y));

        logger.logTileRequest();

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                tile.src = URL.createObjectURL(blob);
                logger.logTileSuccess();
                done(undefined, tile);
                activeRequests--;
                processQueue();
            })
            .catch(() => {
                logger.logTileFailed();
                tile.src = TRANSPARENT_TILE;
                done(undefined, tile);
                activeRequests--;
                processQueue();
            });
    };

    const QueuedTileLayerClass = L.TileLayer.extend({
        createTile: function(this: L.TileLayer, coords: L.Coords, done: L.DoneCallback): HTMLImageElement {
            const tile = document.createElement('img');
            tile.alt = '';
            tile.setAttribute('role', 'presentation');
            queue.push({ coords, tile, done, retryCount: 0 });
            processQueue();
            return tile;
        }
    }) as new (url: string, options?: L.TileLayerOptions) => L.TileLayer;

    return new QueuedTileLayerClass(tileUrl, options);
};

// ============================================================================
// React Component
// ============================================================================

const RasterTileLayer: React.FC<RasterTileLayerProps> = ({ item, opacity = 0.9 }) => {
    const map = useMap();
    const layerRef = useRef<L.TileLayer | null>(null);
    const [, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const timerRef = useRef(new PerformanceTimer());

    useEffect(() => {
        if (!item) return;

        const loadLayer = async () => {
            setLoading(true);
            setError(null);
            logger.reset();
            timerRef.current.reset();
            timerRef.current.start('TOTAL_SETUP');

            console.log(
                '%c🗺️ RASTER LAYER LOADING',
                'color: #10b981; font-weight: bold; font-size: 14px;',
                '\n   Item:', item.id
            );

            try {
                timerRef.current.start('COG_URL_EXTRACTION');
                const cogUrl = extractCogUrl(item);
                timerRef.current.end('COG_URL_EXTRACTION');

                if (!cogUrl) {
                    throw new Error(`COG URL tapılmadı! Item ID: ${item.id}`);
                }

                if (cogUrl.includes('/collections/') || cogUrl.includes('/items/')) {
                    throw new Error(`Bu STAC metadata URL-dir, COG fayl deyil: ${cogUrl}`);
                }

                console.log('%c📦 COG URL:', 'color: #10b981;', cogUrl);

                // ==========================================
                // ✅ CACHE FIRST, THEN API FALLBACK
                // ==========================================
                
                // INFO API
                timerRef.current.start('INFO_API');
                console.log('📊 TiTiler /info sorğusu başladı...');
                const info = await TitilerService.getInfo(cogUrl);
                const infoTime = timerRef.current.end('INFO_API');
                timerRef.current.log('INFO_API', '📊');

                // STATISTICS - Try cache first
                let statistics: any;
                let statsTime = 0;
                const cached = getCachedStatistics(cogUrl);
                
                if (cached) {
                    timerRef.current.start('STATISTICS_CACHE');
                    statistics = cached;
                    statsTime = timerRef.current.end('STATISTICS_CACHE');
                    console.log(
                        '%c⚡ Statistics CACHE HIT! ' + statsTime.toFixed(2) + 'ms (100000x faster than API!)',
                        'color: #52c41a; font-weight: bold; font-size: 13px;'
                    );
                } else {
                    timerRef.current.start('STATISTICS_API');
                    console.log('📈 TiTiler /statistics sorğusu başladı (cache miss)...');
                    statistics = await TitilerService.getStatistics(cogUrl);
                    statsTime = timerRef.current.end('STATISTICS_API');
                    timerRef.current.log('STATISTICS_API', '📈');
                    
                    console.warn(
                        '%c⚠️ Cache miss! Consider adding this file to statistics.cache.ts',
                        'color: #f59e0b; font-weight: bold;'
                    );
                }

                console.log(
                    '%c✅ TiTiler sorğuları tamamlandı',
                    'color: #10b981; font-weight: bold;',
                    `\n   /info: ${infoTime.toFixed(0)}ms`,
                    `\n   /statistics: ${statsTime.toFixed(0)}ms ${cached ? '(cache ⚡)' : '(API)'}`,
                    `\n   Total: ${(infoTime + statsTime).toFixed(0)}ms`
                );

                const stacBbox = item.bbox;

                // Band indexes
                timerRef.current.start('TILE_URL_BUILD');
                const bidx = TitilerService.getBandIndexes(info);

                // ✅ REAL RESCALE from statistics (cache or API)
                const rescale = TitilerService.calculateRescale(statistics, bidx.length);
                
                console.log(
                    '%c✅ Real rescale values from statistics:',
                    'color: #52c41a; font-weight: bold;',
                    rescale
                );

                // Tile URL
                const tileUrl = TitilerService.buildTileUrl(cogUrl, {
                    format: 'png',
                    bidx,
                    rescale,
                });
                timerRef.current.end('TILE_URL_BUILD');

                if (layerRef.current) {
                    map.removeLayer(layerRef.current);
                }

                timerRef.current.start('LAYER_CREATE');
                const [minLng, minLat, maxLng, maxLat] = stacBbox;
                const layer = createQueuedTileLayer(tileUrl, {
                    opacity,
                    maxZoom: info.maxzoom || 18,
                    minZoom: info.minzoom || 0,
                    tileSize: 256,
                    crossOrigin: 'anonymous',
                    bounds: L.latLngBounds(
                        [minLat, minLng],
                        [maxLat, maxLng]
                    ),
                    zIndex: 1000,
                    pane: 'overlayPane',
                });

                layer.on('load', () => {
                    console.log('✅ Layer tiles loaded');
                    logger.printSummary();
                });

                layer.addTo(map);
                layerRef.current = layer;
                timerRef.current.end('LAYER_CREATE');

                timerRef.current.start('FIT_BOUNDS');
                if (stacBbox && stacBbox.length === 4) {
                    const leafletBounds: L.LatLngBoundsExpression = [
                        [minLat, minLng],
                        [maxLat, maxLng]
                    ];
                    map.fitBounds(leafletBounds, { padding: [50, 50], maxZoom: 12 });
                }
                timerRef.current.end('FIT_BOUNDS');

                timerRef.current.end('TOTAL_SETUP');
                setLoading(false);
                
                console.log('%c' + '═'.repeat(50), 'color: #6366f1;');
                timerRef.current.printSummary();
                console.log('%c' + '═'.repeat(50), 'color: #6366f1;');

            } catch (err: any) {
                timerRef.current.end('TOTAL_SETUP');
                console.error('%c❌ LAYER ERROR:', 'color: #ef4444; font-weight: bold;', err.message);
                setError(err.message);
                setLoading(false);
            }
        };

        loadLayer();

        return () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
            logger.printSummary();
        };
    }, [item, map, opacity]);

    useEffect(() => {
        if (layerRef.current) {
            layerRef.current.setOpacity(opacity);
        }
    }, [opacity]);

    return null;
};

export default RasterTileLayer;


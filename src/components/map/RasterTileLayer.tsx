/**
 * RasterTileLayer Component
 * 
 * TiTiler-dən COG tile-ları yükləyir.
 * 
 * ⚠️ DEVOPS DİAGNOSTİC:
 * Bu komponent S3 connection problemlərini console-da göstərir.
 * "🔴 S3_TIMEOUT" mesajları TiTiler → S3 bağlantı problemini göstərir.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { StacItem } from '../../types/raster.map.type';
import { TitilerService } from '../../services/titiler.service';

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
const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1000, 2000];
const TRANSPARENT_TILE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ============================================================================
// COG URL Extractor - Ən vacib funksiya!
// ============================================================================

function extractCogUrl(item: StacItem): string | null {
    console.log('%c🔍 COG URL EXTRACTION', 'color: #8b5cf6; font-weight: bold;');
    console.log('   Item ID:', item.id);
    console.log('   Collection:', item.collection);
    console.log('   Assets:', item.assets);

    // 1. Assets-dən axtar
    if (item.assets && typeof item.assets === 'object') {
        const assetEntries = Object.entries(item.assets);
        console.log('   Asset keys:', Object.keys(item.assets));

        for (const [key, value] of assetEntries) {
            const asset = value as any;
            
            // ✅ PascalCase VƏ camelCase dəstəyi!
            // Backend "Href" qaytarır, standart STAC "href" istifadə edir
            let href = asset?.href || asset?.Href || asset?.url || asset?.URL;
            let type = asset?.type || asset?.Type || '';
            
            // Əgər asset birbaşa string-dirsə
            if (typeof asset === 'string') {
                href = asset;
            }

            console.log(`   Checking asset["${key}"]:`, { href, type });

            if (href && typeof href === 'string') {
                // COG/TIFF URL-lərini qəbul et
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

                // STAC API URL-lərini rədd et
                const isStacApiUrl = 
                    href.includes('/collections/') ||
                    href.includes('/items/') ||
                    href.includes('/search');

                if (isCogLike || (!isStacApiUrl && key === 'data')) {
                    console.log(`   ✅ Found COG URL in asset["${key}"]:`, href);
                    return href;
                }
            }
        }
    }

    // 2. Links-dən axtar
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
                    console.log('   ✅ Found COG URL in links:', href);
                    return href;
                }
            }
        }
    }

    // 3. Properties-dən axtar
    if (item.properties) {
        const props = item.properties as any;
        const urlFields = ['cog_url', 'cogUrl', 'data_url', 'file_url', 'asset_url', 'href', 'url', 's3_path'];
        
        for (const field of urlFields) {
            if (props[field] && typeof props[field] === 'string') {
                console.log(`   ✅ Found COG URL in properties.${field}:`, props[field]);
                return props[field];
            }
        }
    }

    console.log('   ❌ No COG URL found');
    return null;
}

// ============================================================================
// Diagnostic Logger
// ============================================================================

class DiagnosticLogger {
    private stats = { total: 0, loaded: 0, failed: 0, retried: 0, s3Timeouts: 0 };
    private sessionStart = Date.now();

    reset() {
        this.stats = { total: 0, loaded: 0, failed: 0, retried: 0, s3Timeouts: 0 };
        this.sessionStart = Date.now();
    }

    logTileRequest() { this.stats.total++; }
    logTileSuccess() { this.stats.loaded++; }
    
    logTileRetry(url: string, attempt: number) {
        this.stats.retried++;
        console.warn(`🔄 TILE_RETRY [${attempt}/${MAX_RETRIES}]`, url.substring(0, 80));
    }

    logS3Timeout(url: string, errorDetail: string) {
        this.stats.s3Timeouts++;
        console.error(
            '%c🔴 S3_TIMEOUT - TiTiler S3-ə qoşula bilmir!',
            'color: #ef4444; font-weight: bold; font-size: 14px;',
            '\n\nError:', errorDetail,
            '\n\n⚠️ DEVOPS HƏLL:',
            '\n   • GDAL_HTTP_TIMEOUT=60',
            '\n   • GDAL_HTTP_MAX_RETRY=5'
        );
    }

    logTileFailed(url: string, status: number) {
        this.stats.failed++;
        console.warn(`⚠️ TILE_FAILED [${status}]`, url.substring(0, 60));
    }

    printSummary() {
        const duration = ((Date.now() - this.sessionStart) / 1000).toFixed(1);
        const rate = this.stats.total > 0 ? ((this.stats.loaded / this.stats.total) * 100).toFixed(0) : '0';
        
        console.log(
            `%c📊 TILES: ${this.stats.loaded}/${this.stats.total} (${rate}%) in ${duration}s | Failed: ${this.stats.failed} | S3 Timeouts: ${this.stats.s3Timeouts}`,
            this.stats.s3Timeouts > 0 ? 'color: #ef4444; font-weight: bold;' : 'color: #10b981;'
        );
    }
}

const logger = new DiagnosticLogger();

// ============================================================================
// Custom TileLayer with Queue and Retry
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
        const { coords, tile, done, retryCount } = item;
        const url = tileUrl
            .replace('{z}', String(coords.z))
            .replace('{x}', String(coords.x))
            .replace('{y}', String(coords.y));

        logger.logTileRequest();

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw { status: response.status, body: text };
                    });
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
            .catch((error: any) => {
                const status = error.status || 0;
                const errorBody = error.body || '';
                
                const isS3Timeout = errorBody.includes('not recognized') ||
                                   errorBody.includes('vsis3') ||
                                   errorBody.includes('timeout');

                if (isS3Timeout) {
                    logger.logS3Timeout(url, errorBody);
                }

                if (retryCount < MAX_RETRIES) {
                    const delay = RETRY_DELAYS[retryCount] || 1000;
                    logger.logTileRetry(url, retryCount + 1);
                    
                    setTimeout(() => {
                        queue.unshift({ coords, tile, done, retryCount: retryCount + 1 });
                        activeRequests--;
                        processQueue();
                    }, delay);
                } else {
                    logger.logTileFailed(url, status);
                    tile.src = TRANSPARENT_TILE;
                    done(undefined, tile);
                    activeRequests--;
                    processQueue();
                }
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

    useEffect(() => {
        if (!item) return;

        const loadLayer = async () => {
            setLoading(true);
            setError(null);
            logger.reset();

            console.log(
                '%c🗺️ RASTER LAYER LOADING',
                'color: #10b981; font-weight: bold; font-size: 14px;',
                '\n   Item:', item.id
            );

            try {
                // ✅ COG URL-ni tap
                const cogUrl = extractCogUrl(item);

                if (!cogUrl) {
                    throw new Error(
                        `COG URL tapılmadı!\n` +
                        `Item ID: ${item.id}\n` +
                        `Assets: ${JSON.stringify(item.assets, null, 2)}`
                    );
                }

                // ✅ STAC API URL yoxlaması
                if (cogUrl.includes('/collections/') || cogUrl.includes('/items/')) {
                    throw new Error(`Bu STAC metadata URL-dir, COG fayl deyil: ${cogUrl}`);
                }

                console.log('%c📦 COG URL:', 'color: #10b981; font-weight: bold;', cogUrl);

                // TiTiler-dən metadata al
                console.log('📊 TiTiler-dən metadata alınır...');
                
                // ✅ STAC item-dən bbox istifadə edirik (TiTiler /bounds 500 qaytarır)
                const stacBbox = item.bbox; // [minLng, minLat, maxLng, maxLat]
                console.log('📍 STAC bbox:', stacBbox);
                
                const [info, statistics] = await Promise.all([
                    TitilerService.getInfo(cogUrl),
                    TitilerService.getStatistics(cogUrl).catch(e => {
                        console.warn('Statistics alınmadı:', e.message);
                        return null;
                    })
                ]);

                console.log('✅ TiTiler metadata alındı:', {
                    bands: info.count,
                    size: `${info.width}x${info.height}`,
                    stacBbox
                });

                // Band indexes
                const bidx = TitilerService.getBandIndexes(info);
                console.log('🎨 Bands:', bidx);

                // Rescale
                let rescale: string[] = ['0,255'];
                if (statistics) {
                    rescale = TitilerService.calculateRescale(statistics, bidx.length);
                }
                console.log('📊 Rescale:', rescale);

                // Tile URL
                const tileUrl = TitilerService.buildTileUrl(cogUrl, {
                    format: 'png',
                    bidx,
                    rescale,
                });
                
                console.log('%c🔗 Tile URL:', 'color: #3b82f6; font-weight: bold;', tileUrl.replace('{z}/{x}/{y}', '...'));

                // Köhnə layer-i sil
                if (layerRef.current) {
                    map.removeLayer(layerRef.current);
                }

                // Yeni layer
                const layer = createQueuedTileLayer(tileUrl, {
                    opacity,
                    maxZoom: info.maxzoom || 22,
                    minZoom: info.minzoom || 0,
                    tileSize: 256,
                    crossOrigin: 'anonymous',
                });

                layer.on('load', () => {
                    console.log('✅ Layer loaded');
                    logger.printSummary();
                });

                layer.addTo(map);
                layerRef.current = layer;

                // Fit bounds - STAC item bbox-dan
                // STAC bbox format: [minLng, minLat, maxLng, maxLat]
                if (stacBbox && stacBbox.length === 4) {
                    const [minLng, minLat, maxLng, maxLat] = stacBbox;
                    const leafletBounds: L.LatLngBoundsExpression = [
                        [minLat, minLng],  // SW corner
                        [maxLat, maxLng]   // NE corner
                    ];
                    console.log('🗺️ Fitting to bounds:', leafletBounds);
                    map.fitBounds(leafletBounds, { padding: [50, 50], maxZoom: 16 });
                }

                setLoading(false);
                console.log('%c✅ RASTER LAYER READY', 'color: #10b981; font-weight: bold; font-size: 14px;');

            } catch (err: any) {
                console.error('%c❌ LAYER ERROR:', 'color: #ef4444; font-weight: bold;', err.message);
                console.error('Full error:', err);
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
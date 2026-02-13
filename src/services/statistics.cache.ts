/**
 * Statistics Cache — API-based rescale
 * 
 * FAYL YOLU: src/services/statistics.cache.ts
 * 
 * Axın:
 *   1) Memory cache yoxla (0ms)
 *   2) Cache miss → GET /raster-uploads/rescale?cogPath=xxx (~50ms)
 *   3) Nəticəni memory cache-ə yaz
 *   4) TiTiler /statistics heç vaxt çağırılmır
 */

const API_BASE = import.meta.env.VITE_API_URL;

// ============================================================================
// Types
// ============================================================================

export interface BandRescale {
    band: number;
    percentile2: number;
    percentile98: number;
}

export interface RescaleResponse {
    bands: BandRescale[];
}

// ============================================================================
// Memory Cache
// ============================================================================

const RESCALE_CACHE = new Map<string, BandRescale[]>();

// ============================================================================
// Functions
// ============================================================================

/**
 * Cache-dən rescale dəyərlərini oxu (sync, 0ms)
 */
export function getCachedRescale(cogUrl: string): BandRescale[] | null {
    return RESCALE_CACHE.get(cogUrl) ?? null;
}

/**
 * API-dən rescale dəyərlərini gətir + cache-ə yaz (async)
 * 
 * GET /api/v1/raster-uploads/rescale?cogPath=s3://bucket/path/file.tif
 * Response: { bands: [{ band: 1, percentile2: 243, percentile98: 814 }, ...] }
 */
export async function fetchRescale(cogUrl: string): Promise<BandRescale[]> {
    // 1) Memory cache
    const cached = RESCALE_CACHE.get(cogUrl);
    if (cached) {
        console.log(`%c⚡ Rescale CACHE HIT`, 'color: #52c41a; font-weight: bold;');
        return cached;
    }

    // 2) API call
    const t0 = performance.now();
    try {
        const url = `${API_BASE}/api/v1/raster-uploads/rescale?cogPath=${encodeURIComponent(cogUrl)}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn(`⚠️ Rescale API ${response.status} — fallback istifadə olunacaq`);
            return [];
        }

        const data: RescaleResponse = await response.json();
        const ms = Math.round(performance.now() - t0);

        // 3) Cache-ə yaz
        RESCALE_CACHE.set(cogUrl, data.bands);

        console.log(
            `%c📊 Rescale API: ${ms}ms | ${data.bands.length} band`,
            ms > 200 ? 'color: #f59e0b;' : 'color: #10b981; font-weight: bold;'
        );

        return data.bands;

    } catch (error) {
        console.error('❌ Rescale API xətası:', error);
        return [];
    }
}

/**
 * BandRescale[] → rescale string array (TiTiler üçün)
 * Məs: ["243,814", "338,782", "376,772"]
 */
export function toRescaleStrings(bands: BandRescale[], bandCount: number): string[] {
    const rescales: string[] = [];

    for (let i = 0; i < Math.min(bandCount, 3); i++) {
        const band = bands.find(b => b.band === i + 1);
        if (band && (band.percentile2 !== 0 || band.percentile98 !== 0)) {
            rescales.push(`${Math.floor(band.percentile2)},${Math.ceil(band.percentile98)}`);
        } else {
            rescales.push('0,255');
        }
    }

    return rescales;
}

/**
 * Manually cache rescale (əgər başqa mənbədən gəlirsə)
 */
export function cacheRescale(cogUrl: string, bands: BandRescale[]): void {
    RESCALE_CACHE.set(cogUrl, bands);
}
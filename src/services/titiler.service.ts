/**
 * TiTiler Service
 * 
 * COG (Cloud Optimized GeoTIFF) faylları üçün tile və metadata servisi.
 * Vite proxy vasitəsilə TiTiler backend-ə qoşulur.
 * 
 * Development: /titiler-api → https://tiles.mmdev.az/tiles
 * Production:  https://tiles.mmdev.az/tiles
 */

// ============================================================================
// Configuration
// ============================================================================

// Development-də Vite proxy istifadə edirik
// Production-da birbaşa TiTiler URL
const TITILER_BASE_URL = import.meta.env.DEV 
    ? '/titiler-api'           // Vite proxy: /titiler-api → https://tiles.mmdev.az/tiles
    : 'https://tiles.mmdev.az/tiles';

// COG endpoint path
const COG_PATH = '/cog';

// ============================================================================
// Types
// ============================================================================

export interface CogInfo {
    bounds: [number, number, number, number];  // [minLng, minLat, maxLng, maxLat]
    minzoom: number;
    maxzoom: number;
    band_metadata: Array<[string, Record<string, any>]>;
    band_descriptions: Array<[string, string]>;
    dtype: string;
    nodata_type: string;
    colorinterp: string[];
    count: number;
    width: number;
    height: number;
    driver: string;
    overviews: number[];
}

export interface CogStatistics {
    [band: string]: {
        min: number;
        max: number;
        mean: number;
        stddev: number;
        count: number;
        sum: number;
        percentile_2: number;
        percentile_98: number;
    };
}

export interface TileUrlOptions {
    format?: 'png' | 'jpg' | 'webp';
    bidx?: number[];
    rescale?: string[];
    colormap?: string;
    nodata?: number;
}

// ============================================================================
// Service
// ============================================================================

export const TitilerService = {
    /**
     * COG haqqında metadata al
     */
    getInfo: async (cogUrl: string): Promise<CogInfo> => {
        const url = `${TITILER_BASE_URL}${COG_PATH}/info?url=${encodeURIComponent(cogUrl)}`;
        console.log('📊 TiTiler info request:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const text = await response.text();
            console.error('TiTiler info error:', response.status, text);
            throw new Error(`TiTiler info error: ${response.status} - ${text}`);
        }
        
        const data = await response.json();
        console.log('✅ TiTiler info response:', data);
        return data;
    },

    /**
     * COG bounds al (bbox)
     */
    getBounds: async (cogUrl: string): Promise<[number, number, number, number]> => {
        const url = `${TITILER_BASE_URL}${COG_PATH}/bounds?url=${encodeURIComponent(cogUrl)}`;
        console.log('📍 TiTiler bounds request:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TiTiler bounds error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.bounds;
    },

    /**
     * COG statistikası al
     */
    getStatistics: async (cogUrl: string): Promise<CogStatistics> => {
        const url = `${TITILER_BASE_URL}${COG_PATH}/statistics?url=${encodeURIComponent(cogUrl)}`;
        console.log('📈 TiTiler statistics request:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const text = await response.text();
            console.error('TiTiler statistics error:', response.status, text);
            throw new Error(`TiTiler statistics error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ TiTiler statistics response:', data);
        return data;
    },

    /**
     * Preview URL yarat
     */
    getPreviewUrl: (cogUrl: string, options: TileUrlOptions = {}): string => {
        const params = new URLSearchParams();
        params.append('url', cogUrl);
        
        // Default max_size
        params.append('max_size', '512');
        
        // Band indexes
        if (options.bidx && options.bidx.length > 0) {
            options.bidx.forEach(b => params.append('bidx', String(b)));
        }
        
        // Rescale
        if (options.rescale && options.rescale.length > 0) {
            options.rescale.forEach(r => params.append('rescale', r));
        }
        
        // Format
        const format = options.format || 'png';
        
        return `${TITILER_BASE_URL}${COG_PATH}/preview.${format}?${params.toString()}`;
    },

    /**
     * Tile URL template yarat
     * {z}/{x}/{y} placeholder-ları ilə
     */
    buildTileUrl: (cogUrl: string, options: TileUrlOptions = {}): string => {
        const params = new URLSearchParams();
        params.append('url', cogUrl);
        
        // Band indexes
        if (options.bidx && options.bidx.length > 0) {
            options.bidx.forEach(b => params.append('bidx', String(b)));
        }
        
        // Rescale
        if (options.rescale && options.rescale.length > 0) {
            options.rescale.forEach(r => params.append('rescale', r));
        }
        
        // Colormap
        if (options.colormap) {
            params.append('colormap_name', options.colormap);
        }
        
        // Format
        const format = options.format || 'png';
        
        // TileMatrixSet - WebMercatorQuad standart
        const tileUrl = `${TITILER_BASE_URL}${COG_PATH}/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.${format}?${params.toString()}`;
        
        console.log('🔗 Tile URL template:', tileUrl.replace('{z}/{x}/{y}', '...'));
        return tileUrl;
    },

    /**
     * Band indexes təyin et
     * RGB üçün 1,2,3 və ya 1-band üçün [1]
     */
    getBandIndexes: (info: CogInfo): number[] => {
        const bandCount = info.count || 1;
        
        // 3+ band varsa RGB
        if (bandCount >= 3) {
            return [1, 2, 3];
        }
        
        // Tək band
        return [1];
    },

    /**
     * Rescale dəyərləri hesabla
     * Statistics-dən percentile_2 və percentile_98 istifadə edir
     */
    calculateRescale: (statistics: CogStatistics, bandCount: number = 3): string[] => {
        const rescale: string[] = [];
        
        for (let i = 1; i <= bandCount; i++) {
            const bandKey = `b${i}`;
            const bandStats = statistics[bandKey];
            
            if (bandStats) {
                const low = Math.floor(bandStats.percentile_2 || bandStats.min || 0);
                const high = Math.ceil(bandStats.percentile_98 || bandStats.max || 255);
                rescale.push(`${low},${high}`);
            } else {
                // Default rescale
                rescale.push('0,255');
            }
        }
        
        return rescale;
    },

    /**
     * Tek tile yüklə (test üçün)
     */
    fetchTile: async (cogUrl: string, z: number, x: number, y: number, options: TileUrlOptions = {}): Promise<Blob> => {
        const tileUrlTemplate = TitilerService.buildTileUrl(cogUrl, options);
        const tileUrl = tileUrlTemplate
            .replace('{z}', String(z))
            .replace('{x}', String(x))
            .replace('{y}', String(y));
        
        console.log('🖼️ Fetching tile:', tileUrl);
        
        const response = await fetch(tileUrl);
        
        if (!response.ok) {
            throw new Error(`Tile fetch error: ${response.status}`);
        }
        
        return response.blob();
    }
};

export default TitilerService;
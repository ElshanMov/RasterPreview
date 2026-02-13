/**
 * TiTiler Service
 * 
 * COG (Cloud Optimized GeoTIFF) faylları üçün tile və metadata servisi.
 * 
 * ⚠️ Logger: titiler.logger.ts import edildikdə fetch interceptor
 *    avtomatik bütün sorğuları tutur. Bu faylda dəyişiklik lazım deyil.
 */

const TITILER_BASE_URL = import.meta.env.DEV 
    ? '/titiler-api'
    : 'https://tiles.mmdev.az/tiles';

const COG_PATH = '/cog';

// ============================================================================
// Types
// ============================================================================

export interface CogInfo {
    bounds: [number, number, number, number];
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
    resampling?: 'nearest' | 'bilinear' | 'cubic' | 'cubic_spline' | 'lanczos';
    buffer?: number;
    tileScale?: 1 | 2 | 4;
}

// ============================================================================
// Service
// ============================================================================

export const TitilerService = {
    getInfo: async (cogUrl: string): Promise<CogInfo> => {
        const url = `${TITILER_BASE_URL}${COG_PATH}/info?url=${encodeURIComponent(cogUrl)}`;
        const response = await fetch(url);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`TiTiler info error: ${response.status} - ${text}`);
        }
        return response.json();
    },

    getBounds: async (cogUrl: string): Promise<[number, number, number, number]> => {
        const url = `${TITILER_BASE_URL}${COG_PATH}/bounds?url=${encodeURIComponent(cogUrl)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`TiTiler bounds error: ${response.status}`);
        const data = await response.json();
        return data.bounds;
    },

    getStatistics: async (cogUrl: string): Promise<CogStatistics> => {
        const url = `${TITILER_BASE_URL}${COG_PATH}/statistics?url=${encodeURIComponent(cogUrl)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`TiTiler statistics error: ${response.status}`);
        return response.json();
    },

    getPreviewUrl: (cogUrl: string, options: TileUrlOptions = {}): string => {
        const params = new URLSearchParams();
        params.append('url', cogUrl);
        params.append('max_size', '512');
        if (options.bidx?.length) options.bidx.forEach(b => params.append('bidx', String(b)));
        if (options.rescale?.length) options.rescale.forEach(r => params.append('rescale', r));
        const format = options.format || 'png';
        return `${TITILER_BASE_URL}${COG_PATH}/preview.${format}?${params.toString()}`;
    },

    /**
     * Tile URL template — {z}/{x}/{y}
     * 
     * Keyfiyyət parametrləri:
     *   @2x         → 512×512 tile (retina)
     *   resampling  → bilinear (hamar) vs nearest (pikselləşmiş)
     *   buffer      → kənar artefaktları azaldır
     */
   buildTileUrl: (cogUrl: string, options: TileUrlOptions = {}): string => {
    const params = new URLSearchParams();
    params.append('url', cogUrl);
    if (options.bidx?.length) options.bidx.forEach(b => params.append('bidx', String(b)));
    if (options.rescale?.length) options.rescale.forEach(r => params.append('rescale', r));
    if (options.colormap) params.append('colormap_name', options.colormap);

    params.append('resampling', 'bilinear');
    // buffer SİLİNDİ — kənar tile-larda 404 yaradırdı

    const format = options.format || 'png';
    return `${TITILER_BASE_URL}${COG_PATH}/tiles/WebMercatorQuad/{z}/{x}/{y}.${format}?${params.toString()}`;
    // @${scale}x SİLİNDİ — retina lazım deyil
},
    getBandIndexes: (info: CogInfo): number[] => {
        return (info.count || 1) >= 3 ? [1, 2, 3] : [1];
    },

    calculateRescale: (statistics: CogStatistics, bandCount: number = 3): string[] => {
        const rescale: string[] = [];
        for (let i = 1; i <= bandCount; i++) {
            const bs = statistics[`b${i}`];
            if (bs) {
                rescale.push(`${Math.floor(bs.percentile_2 || bs.min || 0)},${Math.ceil(bs.percentile_98 || bs.max || 255)}`);
            } else {
                rescale.push('0,255');
            }
        }
        return rescale;
    },

    fetchTile: async (cogUrl: string, z: number, x: number, y: number, options: TileUrlOptions = {}): Promise<Blob> => {
        const tileUrl = TitilerService.buildTileUrl(cogUrl, options)
            .replace('{z}', String(z))
            .replace('{x}', String(x))
            .replace('{y}', String(y));
        const response = await fetch(tileUrl);
        if (!response.ok) throw new Error(`Tile fetch error: ${response.status}`);
        return response.blob();
    }
};

export default TitilerService;
/**
 * TiTiler Service
 * 
 * Bu servis TiTiler API ilə əlaqə qurur.
 * 
 * ⚠️ DEVOPS QEYDI: 
 * S3 connection timeout problemləri aşkar edilib.
 * TiTiler deployment-ə aşağıdakı env vars əlavə edilməlidir:
 * 
 * - GDAL_HTTP_TIMEOUT=60
 * - GDAL_HTTP_MAX_RETRY=5
 * - GDAL_HTTP_RETRY_DELAY=1
 * - CPL_VSIL_CURL_CACHE_SIZE=200000000
 */

import axios from 'axios';

// TiTiler base URL - environment-dən və ya default
const TITILER_BASE_URL = import.meta.env.VITE_TITILER_URL || 'https://tiles.mmdev.az';

// TiTiler endpoint prefix (server konfiqurasiyasına görə)
const TITILER_ENDPOINT_PREFIX = '/tiles';

// Axios instance
const titilerAxios = axios.create({
    baseURL: TITILER_BASE_URL,
    timeout: 30000,
});

// ============================================================================
// Types
// ============================================================================

export interface CogInfo {
    bounds: [number, number, number, number];
    minzoom: number;
    maxzoom: number;
    band_metadata: [string, Record<string, any>][];
    band_descriptions: [string, string][];
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
    [bandKey: string]: {
        min: number;
        max: number;
        mean: number;
        std: number;
        count: number;
        sum: number;
        median?: number;
        majority?: number;
        minority?: number;
        unique?: number;
        histogram?: [number[], number[]];
        valid_percent?: number;
        masked_pixels?: number;
        valid_pixels?: number;
        percentile_2?: number;
        percentile_98?: number;
    };
}

export interface CogBounds {
    bounds: [number, number, number, number];
}

export interface TileUrlOptions {
    tileMatrixSetId?: string;
    scale?: number;
    format?: 'png' | 'jpg' | 'webp';
    bidx?: number[];
    rescale?: string[];
    colormap?: string;
    nodata?: number;
    returnMask?: boolean;
}

// ============================================================================
// Service
// ============================================================================

export const TitilerService = {
    /**
     * COG info əldə et
     */
    getInfo: async (cogUrl: string): Promise<CogInfo> => {
        console.log('📊 TiTiler: Getting COG info...');
        const encodedUrl = encodeURIComponent(cogUrl);
        const response = await titilerAxios.get(`${TITILER_ENDPOINT_PREFIX}/cog/info?url=${encodedUrl}`);
        console.log('✅ TiTiler: COG info received', {
            bands: response.data.count,
            size: `${response.data.width}x${response.data.height}`,
            dtype: response.data.dtype
        });
        return response.data;
    },

    /**
     * COG statistics əldə et
     */
    getStatistics: async (cogUrl: string): Promise<CogStatistics> => {
        console.log('📈 TiTiler: Getting COG statistics...');
        const encodedUrl = encodeURIComponent(cogUrl);
        const response = await titilerAxios.get(`${TITILER_ENDPOINT_PREFIX}/cog/statistics?url=${encodedUrl}`);
        console.log('✅ TiTiler: Statistics received');
        return response.data;
    },

    /**
     * COG bounds əldə et
     */
    getBounds: async (cogUrl: string): Promise<CogBounds> => {
        console.log('🗺️ TiTiler: Getting COG bounds...');
        const encodedUrl = encodeURIComponent(cogUrl);
        const response = await titilerAxios.get(`${TITILER_ENDPOINT_PREFIX}/cog/bounds?url=${encodedUrl}`);
        console.log('✅ TiTiler: Bounds received', response.data.bounds);
        return response.data;
    },

    /**
     * Tile URL yarat
     * 
     * ⚠️ VACIB: .png extension MÜTLƏQ lazımdır!
     * Əks halda TiTiler bütün band-ları göndərir və PNG driver xəta verir.
     */
    buildTileUrl: (cogUrl: string, options: TileUrlOptions = {}): string => {
        const {
            tileMatrixSetId = 'WebMercatorQuad',
            scale = 1,
            format = 'png',  // ⚠️ Default PNG - vacibdir!
            bidx,
            rescale,
            colormap,
            nodata,
            returnMask = false,
        } = options;

        const encodedUrl = encodeURIComponent(cogUrl);
        
        // ⚠️ VACIB: .${format} MÜTLƏQ olmalıdır!
        let url = `${TITILER_BASE_URL}${TITILER_ENDPOINT_PREFIX}/cog/tiles/${tileMatrixSetId}/{z}/{x}/{y}@${scale}x.${format}?url=${encodedUrl}`;

        // Band indexes - hər band üçün ayrı bidx parametri
        if (bidx && bidx.length > 0) {
            bidx.forEach(b => {
                url += `&bidx=${b}`;
            });
        }

        // Rescale - hər band üçün ayrı rescale parametri
        if (rescale && rescale.length > 0) {
            rescale.forEach(r => {
                url += `&rescale=${r}`;
            });
        }

        // Colormap
        if (colormap) {
            url += `&colormap_name=${colormap}`;
        }

        // Nodata
        if (nodata !== undefined) {
            url += `&nodata=${nodata}`;
        }

        // Return mask
        if (returnMask) {
            url += `&return_mask=true`;
        }

        return url;
    },

    /**
     * Preview image URL yarat
     */
    buildPreviewUrl: (cogUrl: string, options: {
        width?: number;
        height?: number;
        format?: 'png' | 'jpg' | 'webp';
        bidx?: number[];
        rescale?: string[];
        colormap?: string;
    } = {}): string => {
        const {
            width = 256,
            height = 256,
            format = 'png',
            bidx,
            rescale,
            colormap,
        } = options;

        const encodedUrl = encodeURIComponent(cogUrl);
        let url = `${TITILER_BASE_URL}${TITILER_ENDPOINT_PREFIX}/cog/preview.${format}?url=${encodedUrl}&width=${width}&height=${height}`;

        if (bidx && bidx.length > 0) {
            bidx.forEach(b => {
                url += `&bidx=${b}`;
            });
        }

        if (rescale && rescale.length > 0) {
            rescale.forEach(r => {
                url += `&rescale=${r}`;
            });
        }

        if (colormap) {
            url += `&colormap_name=${colormap}`;
        }

        return url;
    },

    /**
     * Optimal rescale dəyərlərini hesabla
     */
    calculateRescale: (statistics: CogStatistics, bandCount: number = 3): string[] => {
        const rescaleValues: string[] = [];
        const keys = Object.keys(statistics);

        for (let i = 0; i < Math.min(bandCount, keys.length); i++) {
            const bandKey = keys[i];
            const bandStats = statistics[bandKey];

            if (!bandStats) {
                rescaleValues.push('0,255');
                continue;
            }

            // 2%-98% percentile istifadə et (daha yaxşı contrast)
            const low = bandStats.percentile_2 ?? bandStats.min ?? 0;
            const high = bandStats.percentile_98 ?? bandStats.max ?? 255;

            if (low === high) {
                rescaleValues.push('0,255');
            } else {
                rescaleValues.push(`${Math.floor(low)},${Math.ceil(high)}`);
            }
        }

        return rescaleValues;
    },

    /**
     * Band indexes təyin et
     */
    getBandIndexes: (info: CogInfo): number[] => {
        // 3+ band varsa, RGB üçün ilk 3 bandı istifadə et
        if (info.count >= 3) {
            // Colorinterp-ə görə düzgün bandları tap
            if (info.colorinterp) {
                const redIdx = info.colorinterp.findIndex(c => c === 'red') + 1;
                const greenIdx = info.colorinterp.findIndex(c => c === 'green') + 1;
                const blueIdx = info.colorinterp.findIndex(c => c === 'blue') + 1;

                if (redIdx > 0 && greenIdx > 0 && blueIdx > 0) {
                    return [redIdx, greenIdx, blueIdx];
                }
            }
            // Default: ilk 3 band
            return [1, 2, 3];
        }

        // Tək band
        return [1];
    },

    /**
     * Bounds-u Leaflet formatına çevir
     */
    parseBounds: (bounds: CogBounds): [[number, number], [number, number]] | null => {
        if (!bounds || !bounds.bounds) return null;
        const [minX, minY, maxX, maxY] = bounds.bounds;
        return [[minY, minX], [maxY, maxX]];
    }
};

export default TitilerService;
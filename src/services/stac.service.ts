import type { 
    StacSearchPostRequest,
    StacSearchResponse, 
    StacCollection,
    RasterFilterParams,
    BboxCoords
} from '../types/raster.map.type';
import axios from 'axios';

// Development-də proxy istifadə et, production-da birbaşa URL
const STAC_API_URL = import.meta.env.DEV 
    ? '/stac-api'  // Vite proxy vasitəsilə
    : 'http://stac.mmdev.az';

// ==========================================
// Helpers
// ==========================================

/**
 * Bbox koordinatlarını valid WGS84 aralığına normalize edir
 * STAC API tələb edir: lng [-180, 180], lat [-90, 90]
 */
const normalizeBbox = (bbox: BboxCoords): BboxCoords => {
    // Longitude-u [-180, 180] aralığına wrap et
    const wrapLng = (lng: number): number => {
        while (lng > 180) lng -= 360;
        while (lng < -180) lng += 360;
        return lng;
    };
    
    // Latitude-u [-90, 90] aralığına clamp et
    const clampLat = (lat: number): number => {
        return Math.max(-90, Math.min(90, lat));
    };
    
    return {
        minLng: wrapLng(bbox.minLng),
        maxLng: wrapLng(bbox.maxLng),
        minLat: clampLat(bbox.minLat),
        maxLat: clampLat(bbox.maxLat)
    };
};

/**
 * Bbox-un valid olub olmadığını yoxlayır
 */
const isValidBbox = (bbox: BboxCoords): boolean => {
    // Çox böyük bbox-ları reject et (bütün dünya)
    const lngSpan = Math.abs(bbox.maxLng - bbox.minLng);
    const latSpan = Math.abs(bbox.maxLat - bbox.minLat);
    
    // Əgər bbox bütün dünyadan böyükdürsə, sorğu göndərmə
    if (lngSpan > 360 || latSpan > 180) {
        console.log('⚠️ Bbox too large, skipping search');
        return false;
    }
    
    return true;
};

// ==========================================
// Converters
// ==========================================

/**
 * BboxCoords-dan STAC bbox formatına çevir (normalized)
 */
export const bboxCoordsToArray = (bbox: BboxCoords): [number, number, number, number] => {
    const normalized = normalizeBbox(bbox);
    return [normalized.minLng, normalized.minLat, normalized.maxLng, normalized.maxLat];
};

/**
 * UI Filter State-dən POST body-ə çevir
 */
export const buildPostBody = (filters: RasterFilterParams): StacSearchPostRequest => {
    const body: StacSearchPostRequest = {};

    if (filters.collections.length > 0) {
        body.collections = filters.collections;
    }

    if (filters.ids) {
        body.ids = filters.ids.split(',').map(id => id.trim()).filter(Boolean);
    }

    if (filters.bbox) {
        body.bbox = bboxCoordsToArray(filters.bbox);
    }

    // DateTime - STAC API formatını yoxla
    // Bəzi API-lər aralıq qəbul etmir, yalnız tək tarix qəbul edir
    // if (filters.dateRange) {
    //     body.datetime = `${filters.dateRange[0]}/${filters.dateRange[1]}`;
    // }

    body.limit = filters.limit || 50;

    // Query object - yalnız dəyər varsa əlavə et
    const query: Record<string, any> = {};
    if (filters.cloudCover !== null && filters.cloudCover !== undefined) {
        query['eo:cloud_cover'] = { lte: filters.cloudCover };
    }
    if (filters.resolution && filters.resolution[0] !== null && filters.resolution[1] !== null) {
        query['gsd'] = { gte: filters.resolution[0], lte: filters.resolution[1] };
    }
    if (Object.keys(query).length > 0) {
        body.query = query;
    }

    // Sortby - bəzi STAC API-lər dəstəkləmir, ona görə optional
    // if (filters.sortBy) {
    //     body.sortby = [filters.sortBy];
    // }

    if (filters.token) {
        body.token = filters.token;
    }

    return body;
};

// ==========================================
// STAC Service - Real API
// ==========================================

export const StacService = {
    /**
     * POST /search
     * Əsas axtarış metodu - bütün sorğular POST ilə gedir
     */
    search: async (filters: RasterFilterParams): Promise<StacSearchResponse> => {
        // Bbox validation
        if (filters.bbox && !isValidBbox(filters.bbox)) {
            return {
                type: 'FeatureCollection',
                features: [],
                links: [],
                numberMatched: 0,
                numberReturned: 0
            };
        }
        
        const body = buildPostBody(filters);
        
        console.log('🔍 STAC Search POST:', body);
        console.log('📡 URL:', `${STAC_API_URL}/search`);
        
        try {
            const response = await axios.post<StacSearchResponse>(
                `${STAC_API_URL}/search`,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            
            console.log('✅ STAC Response:', response.data);
            
            // STAC API response formatını normalize et
            const data = response.data;
            
            return {
                type: 'FeatureCollection',
                features: data.features || [],
                links: data.links || [],
                context: data.context,
                numberMatched: data.numberMatched ?? data.context?.matched ?? data.features?.length ?? 0,
                numberReturned: data.numberReturned ?? data.context?.returned ?? data.features?.length ?? 0
            };
        } catch (error: any) {
            console.error('❌ STAC Search Error:', error);
            
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Data:', error.response.data);
            }
            
            throw error;
        }
    },

    /**
     * Bbox ilə axtarış - xəritə hərəkət edəndə istifadə olunur
     */
    searchByBbox: async (bbox: BboxCoords, limit: number = 50): Promise<StacSearchResponse> => {
        // Bbox validation
        if (!isValidBbox(bbox)) {
            return {
                type: 'FeatureCollection',
                features: [],
                links: [],
                numberMatched: 0,
                numberReturned: 0
            };
        }
        
        const body: StacSearchPostRequest = {
            bbox: bboxCoordsToArray(bbox),
            limit
        };
        
        console.log('🗺️ STAC Search by Bbox:', body);
        
        try {
            const response = await axios.post<StacSearchResponse>(
                `${STAC_API_URL}/search`,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            
            const data = response.data;
            
            return {
                type: 'FeatureCollection',
                features: data.features || [],
                links: data.links || [],
                context: data.context,
                numberMatched: data.numberMatched ?? data.features?.length ?? 0,
                numberReturned: data.numberReturned ?? data.features?.length ?? 0
            };
        } catch (error: any) {
            console.error('❌ STAC Bbox Search Error:', error);
            throw error;
        }
    },

    /**
     * GET /collections
     */
    getCollections: async (): Promise<StacCollection[]> => {
        console.log('📁 Get Collections from:', `${STAC_API_URL}/collections`);
        
        try {
            const response = await axios.get(`${STAC_API_URL}/collections`);
            
            // Response-un JSON olub olmadığını yoxla
            if (typeof response.data === 'string') {
                console.error('❌ Collections response is HTML, not JSON. Proxy might not be working.');
                return [];
            }
            
            // STAC collections response: { collections: [...] }
            const collections = response.data.collections || response.data || [];
            
            // Array olduğunu yoxla
            if (!Array.isArray(collections)) {
                console.error('❌ Collections is not an array:', collections);
                return [];
            }
            
            console.log('✅ Collections:', collections);
            
            return collections;
        } catch (error: any) {
            console.error('❌ Get Collections Error:', error);
            return [];
        }
    },

    /**
     * GET /collections/{id}
     */
    getCollection: async (id: string): Promise<StacCollection | null> => {
        console.log('📁 Get Collection:', id);
        
        try {
            const response = await axios.get(`${STAC_API_URL}/collections/${id}`);
            return response.data;
        } catch (error) {
            console.error('❌ Get Collection Error:', error);
            return null;
        }
    }
};
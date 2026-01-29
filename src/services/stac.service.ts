import axios from 'axios';
import type { 
    StacSearchGetParams,
    StacSearchPostRequest,
    StacSearchResponse, 
    StacItem, 
    StacCollection,
    RasterFilterParams
} from '../types/raster.map.type';

// ✅ STAC API - Vite proxy vasitəsilə
const STAC_API_URL = '/stac-api';

// ✅ STAC üçün ayrıca axios instance (token lazım deyil)
const stacAxios = axios.create({
    baseURL: STAC_API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * STAC API Service
 * 
 * GET /search  - Sadə sorğular üçün (query string)
 * POST /search - Mürəkkəb sorğular üçün (JSON body)
 * GET /collections - Kolleksiyaları əldə etmək
 */

// ==========================================
// Converters
// ==========================================

/**
 * UI Filter State-dən GET params-a çevir
 */
export const buildGetParams = (filters: RasterFilterParams): StacSearchGetParams => {
    const params: StacSearchGetParams = {};

    if (filters.collections.length > 0) {
        params.collections = filters.collections.join(',');
    }

    if (filters.ids) {
        params.ids = filters.ids;
    }

    if (filters.bbox) {
        params.bbox = `${filters.bbox.minLng},${filters.bbox.minLat},${filters.bbox.maxLng},${filters.bbox.maxLat}`;
    }

    if (filters.dateRange) {
        params.datetime = `${filters.dateRange[0]}/${filters.dateRange[1]}`;
    }

    params.limit = filters.limit;

    // Query as JSON string
    const query: Record<string, any> = {};
    
    // ✅ Data type filter
    if (filters.dataType && filters.dataType !== 'all') {
        query['data_type'] = { eq: filters.dataType };
    }
    
    if (filters.cloudCover !== null) {
        query['eo:cloud_cover'] = { lte: filters.cloudCover };
    }
    if (filters.resolution) {
        query['gsd'] = { gte: filters.resolution[0], lte: filters.resolution[1] };
    }
    if (Object.keys(query).length > 0) {
        params.query = JSON.stringify(query);
    }

    // Sortby as JSON string
    if (filters.sortBy) {
        params.sortby = JSON.stringify([filters.sortBy]);
    }

    if (filters.token) {
        params.token = filters.token;
    }

    return params;
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
        body.bbox = [
            filters.bbox.minLng,
            filters.bbox.minLat,
            filters.bbox.maxLng,
            filters.bbox.maxLat
        ];
    }

    if (filters.dateRange) {
        body.datetime = `${filters.dateRange[0]}/${filters.dateRange[1]}`;
    }

    body.limit = filters.limit;

    // Query object
    const query: Record<string, any> = {};
    
    // ✅ Data type filter
    if (filters.dataType && filters.dataType !== 'all') {
        query['data_type'] = { eq: filters.dataType };
    }
    
    if (filters.cloudCover !== null) {
        query['eo:cloud_cover'] = { lte: filters.cloudCover };
    }
    if (filters.resolution) {
        query['gsd'] = { gte: filters.resolution[0], lte: filters.resolution[1] };
    }
    if (Object.keys(query).length > 0) {
        body.query = query;
    }

    // Sortby array
    if (filters.sortBy) {
        body.sortby = [filters.sortBy];
    }

    if (filters.token) {
        body.token = filters.token;
    }

    return body;
};

/**
 * Filterin mürəkkəbliyinə görə GET və ya POST seçilməsini təyin edir
 */
export const shouldUsePost = (filters: RasterFilterParams): boolean => {
    // Geo filterlər varsa POST istifadə et
    if (filters.bbox) return true;
    
    // Mürəkkəb query varsa POST istifadə et
    if (filters.cloudCover !== null || filters.resolution !== null) return true;
    
    // ✅ Data type filter varsa POST istifadə et
    if (filters.dataType && filters.dataType !== 'all') return true;
    
    // Çoxlu collection varsa POST istifadə et
    if (filters.collections.length > 3) return true;
    
    // Sadə sorğular üçün GET kifayətdir
    return false;
};

// ==========================================
// STAC Service
// ==========================================

export const StacService = {
    /**
     * GET /search
     * Sadə sorğular üçün - query string
     */
    searchGet: async (params: StacSearchGetParams): Promise<StacSearchResponse> => {
        console.log('🔍 STAC Search GET:', params);
        const response = await stacAxios.get('/search', { params });
        console.log('✅ GET Response:', response.data);
        return response.data;
    },

    /**
     * POST /search
     * Mürəkkəb sorğular üçün - JSON body
     */
    searchPost: async (body: StacSearchPostRequest): Promise<StacSearchResponse> => {
        console.log('🔍 STAC Search POST:', body);
        const response = await stacAxios.post('/search', body);
        console.log('✅ POST Response:', response.data);
        return response.data;
    },

    /**
     * Smart search - avtomatik GET və ya POST seçir
     */
    search: async (filters: RasterFilterParams): Promise<StacSearchResponse> => {
        if (shouldUsePost(filters)) {
            const body = buildPostBody(filters);
            return StacService.searchPost(body);
        } else {
            const params = buildGetParams(filters);
            return StacService.searchGet(params);
        }
    },

    /**
     * GET /collections
     */
    getCollections: async (): Promise<StacCollection[]> => {
        console.log('📁 Get Collections');
        const response = await stacAxios.get('/collections');
        console.log('✅ Collections Response:', response.data);
        
        // STAC API { collections: [...] } formatında qaytarır
        if (response.data.collections) {
            return response.data.collections;
        }
        if (Array.isArray(response.data)) {
            return response.data;
        }
        return [];
    },

    /**
     * GET /collections/{id}
     */
    getCollection: async (id: string): Promise<StacCollection | null> => {
        console.log('📁 Get Collection:', id);
        const response = await stacAxios.get(`/collections/${id}`);
        return response.data;
    },

    /**
     * GET /items/{id}
     */
    getItem: async (id: string): Promise<StacItem | null> => {
        console.log('📄 Get Item:', id);
        const response = await stacAxios.get(`/items/${id}`);
        return response.data;
    }
};
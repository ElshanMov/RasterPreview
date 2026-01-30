import axios from 'axios';
import type { 
    StacSearchGetParams,
    StacSearchPostRequest,
    StacSearchResponse, 
    StacItem, 
    StacCollection,
    RasterFilterParams
} from '../types/raster.map.type';

// STAC API - Vite proxy vasitəsilə
const STAC_API_URL = '/stac-api';

// STAC üçün ayrıca axios instance (token lazım deyil)
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

    // GET request-də CQL2 filter dəstəklənmir, ona görə
    // dataType, cloudCover, resolution filterləri yalnız POST-da işləyir

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
 * CQL2-JSON filter yaratmaq
 */
const buildCql2Filter = (filters: RasterFilterParams): Record<string, any> | null => {
    const conditions: Record<string, any>[] = [];

    // Data type filter
    if (filters.dataType && filters.dataType !== 'all') {
        conditions.push({
            op: '=',
            args: [
                { property: 'properties.data_type' },
                filters.dataType
            ]
        });
    }

    // Cloud cover filter
    if (filters.cloudCover !== null && filters.cloudCover < 100) {
        conditions.push({
            op: '<=',
            args: [
                { property: 'properties.eo:cloud_cover' },
                filters.cloudCover
            ]
        });
    }

    // Resolution (GSD) filter
    if (filters.resolution) {
        conditions.push({
            op: '>=',
            args: [
                { property: 'properties.gsd' },
                filters.resolution[0]
            ]
        });
        conditions.push({
            op: '<=',
            args: [
                { property: 'properties.gsd' },
                filters.resolution[1]
            ]
        });
    }

    // Heç bir condition yoxdursa null qaytar
    if (conditions.length === 0) {
        return null;
    }

    // Tək condition varsa birbaşa qaytar
    if (conditions.length === 1) {
        return conditions[0];
    }

    // Çoxlu condition varsa AND ilə birləşdir
    return {
        op: 'and',
        args: conditions
    };
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

    // CQL2-JSON filter
    const cql2Filter = buildCql2Filter(filters);
    if (cql2Filter) {
        (body as any)['filter-lang'] = 'cql2-json';
        (body as any)['filter'] = cql2Filter;
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
 * CQL2-JSON filter yalnız POST ilə işləyir
 */
export const shouldUsePost = (filters: RasterFilterParams): boolean => {
    // CQL2-JSON filter istifadə edilirsə - POST
    if (filters.dataType && filters.dataType !== 'all') return true;
    if (filters.cloudCover !== null && filters.cloudCover < 100) return true;
    if (filters.resolution !== null) return true;
    
    // Geo filterlər varsa POST istifadə et
    if (filters.bbox) return true;
    
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
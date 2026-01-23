import type { 
    StacSearchGetParams,
    StacSearchPostRequest,
    StacSearchResponse, 
    StacItem, 
    StacCollection,
    BboxCoords,
    RasterFilterParams
} from '../types/raster.map.type';
// import api from './_axios';
// import qs from 'qs';

// const API_URL = import.meta.env.VITE_API_URL;
// const STAC_API_URL = import.meta.env.VITE_STAC_API_URL;

/**
 * STAC API Service
 * 
 * GET /stac/search  - Sadə sorğular üçün (query string)
 * POST /stac/search - Mürəkkəb sorğular üçün (JSON body)
 * 
 * TODO: Backend API gələndə mock funksiyalar real API ilə əvəz olunacaq
 */

// ==========================================
// Mock Data
// ==========================================

const MOCK_COLLECTIONS: StacCollection[] = [
    {
        id: 'landsat-8-c2-l2',
        type: 'Collection',
        stac_version: '1.0.0',
        title: 'Landsat 8 Collection 2 Level-2',
        description: 'Landsat 8 OLI/TIRS Collection 2 Level-2 Science Products',
        keywords: ['landsat', 'satellite', 'imagery', 'usgs'],
        license: 'proprietary',
        extent: {
            spatial: { bbox: [[44.0, 38.0, 51.0, 42.0]] },
            temporal: { interval: [['2013-04-11T00:00:00Z', null]] }
        },
        links: []
    },
    {
        id: 'sentinel-2-l2a',
        type: 'Collection',
        stac_version: '1.0.0',
        title: 'Sentinel-2 Level-2A',
        description: 'Sentinel-2 Level-2A Surface Reflectance',
        keywords: ['sentinel', 'copernicus', 'esa', 'satellite'],
        license: 'proprietary',
        extent: {
            spatial: { bbox: [[44.0, 38.0, 51.0, 42.0]] },
            temporal: { interval: [['2015-06-27T00:00:00Z', null]] }
        },
        links: []
    },
    {
        id: 'sentinel-1-grd',
        type: 'Collection',
        stac_version: '1.0.0',
        title: 'Sentinel-1 GRD',
        description: 'Sentinel-1 Ground Range Detected (GRD)',
        keywords: ['sentinel', 'sar', 'radar', 'esa'],
        license: 'proprietary',
        extent: {
            spatial: { bbox: [[44.0, 38.0, 51.0, 42.0]] },
            temporal: { interval: [['2014-10-03T00:00:00Z', null]] }
        },
        links: []
    },
    {
        id: 'dem-azerbaijan',
        type: 'Collection',
        stac_version: '1.0.0',
        title: 'Azerbaijan DEM',
        description: 'Digital Elevation Model for Azerbaijan',
        keywords: ['dem', 'elevation', 'terrain'],
        license: 'CC-BY-4.0',
        extent: {
            spatial: { bbox: [[44.0, 38.0, 51.0, 42.0]] },
            temporal: { interval: [['2020-01-01T00:00:00Z', '2020-12-31T23:59:59Z']] }
        },
        links: []
    }
];

const MOCK_ITEMS: StacItem[] = [
    {
        id: 'LC08_L2SP_168032_20240115_02_T1',
        type: 'Feature',
        stac_version: '1.0.0',
        geometry: {
            type: 'Polygon',
            coordinates: [[[49.2, 40.1], [50.1, 40.1], [50.1, 40.8], [49.2, 40.8], [49.2, 40.1]]]
        },
        bbox: [49.2, 40.1, 50.1, 40.8],
        properties: {
            datetime: '2024-01-15T07:32:45Z',
            created: '2024-01-16T12:00:00Z',
            title: 'Landsat 8 - Abşeron',
            description: 'Bakı və ətraf rayonların görüntüsü',
            'eo:cloud_cover': 8,
            'proj:epsg': 32639,
            'gsd': 30
        },
        links: [{ rel: 'self', href: '/stac/items/LC08_L2SP_168032_20240115_02_T1' }],
        assets: {
            thumbnail: {
                href: 'https://example.com/thumb/LC08_168032_20240115.png',
                type: 'image/png',
                title: 'Thumbnail',
                roles: ['thumbnail']
            },
            visual: {
                href: 's3://landsat/LC08_L2SP_168032_20240115_02_T1_SR.tif',
                type: 'image/tiff; application=geotiff; profile=cloud-optimized',
                title: 'Visual',
                roles: ['visual', 'data']
            }
        },
        collection: 'landsat-8-c2-l2'
    },
    {
        id: 'S2A_MSIL2A_20240220T073611_N0510_R092_T39TUG',
        type: 'Feature',
        stac_version: '1.0.0',
        geometry: {
            type: 'Polygon',
            coordinates: [[[48.5, 39.3], [49.5, 39.3], [49.5, 40.2], [48.5, 40.2], [48.5, 39.3]]]
        },
        bbox: [48.5, 39.3, 49.5, 40.2],
        properties: {
            datetime: '2024-02-20T07:36:11Z',
            created: '2024-02-20T14:00:00Z',
            title: 'Sentinel-2 - Lənkəran',
            description: 'Lənkəran bölgəsi',
            'eo:cloud_cover': 3,
            'proj:epsg': 32639,
            'gsd': 10
        },
        links: [{ rel: 'self', href: '/stac/items/S2A_MSIL2A_20240220T073611' }],
        assets: {
            thumbnail: {
                href: 'https://example.com/thumb/S2A_20240220_T39TUG.png',
                type: 'image/png',
                title: 'Thumbnail',
                roles: ['thumbnail']
            },
            visual: {
                href: 's3://sentinel/S2A_MSIL2A_20240220T073611_TCI.tif',
                type: 'image/tiff; application=geotiff; profile=cloud-optimized',
                title: 'True Color Image',
                roles: ['visual', 'data']
            }
        },
        collection: 'sentinel-2-l2a'
    },
    {
        id: 'LC08_L2SP_167033_20240310_02_T1',
        type: 'Feature',
        stac_version: '1.0.0',
        geometry: {
            type: 'Polygon',
            coordinates: [[[46.2, 40.8], [47.3, 40.8], [47.3, 41.6], [46.2, 41.6], [46.2, 40.8]]]
        },
        bbox: [46.2, 40.8, 47.3, 41.6],
        properties: {
            datetime: '2024-03-10T07:26:18Z',
            created: '2024-03-11T10:00:00Z',
            title: 'Landsat 8 - Şəki-Zaqatala',
            description: 'Şəki və Zaqatala rayonları',
            'eo:cloud_cover': 22,
            'proj:epsg': 32638,
            'gsd': 30
        },
        links: [{ rel: 'self', href: '/stac/items/LC08_L2SP_167033_20240310_02_T1' }],
        assets: {
            thumbnail: {
                href: 'https://example.com/thumb/LC08_167033_20240310.png',
                type: 'image/png',
                title: 'Thumbnail',
                roles: ['thumbnail']
            },
            visual: {
                href: 's3://landsat/LC08_L2SP_167033_20240310_02_T1_SR.tif',
                type: 'image/tiff; application=geotiff; profile=cloud-optimized',
                title: 'Visual',
                roles: ['visual', 'data']
            }
        },
        collection: 'landsat-8-c2-l2'
    },
    {
        id: 'S1A_IW_GRDH_1SDV_20240405T022845',
        type: 'Feature',
        stac_version: '1.0.0',
        geometry: {
            type: 'Polygon',
            coordinates: [[[47.0, 39.0], [48.5, 39.0], [48.5, 40.5], [47.0, 40.5], [47.0, 39.0]]]
        },
        bbox: [47.0, 39.0, 48.5, 40.5],
        properties: {
            datetime: '2024-04-05T02:28:45Z',
            created: '2024-04-05T08:00:00Z',
            title: 'Sentinel-1 - Mil düzü',
            description: 'SAR görüntüsü - Mil düzü',
            'proj:epsg': 32639,
            'gsd': 10
        },
        links: [{ rel: 'self', href: '/stac/items/S1A_IW_GRDH_1SDV_20240405T022845' }],
        assets: {
            thumbnail: {
                href: 'https://example.com/thumb/S1A_20240405.png',
                type: 'image/png',
                title: 'Thumbnail',
                roles: ['thumbnail']
            },
            data: {
                href: 's3://sentinel/S1A_IW_GRDH_1SDV_20240405T022845.tif',
                type: 'image/tiff; application=geotiff; profile=cloud-optimized',
                title: 'GRD Data',
                roles: ['data']
            }
        },
        collection: 'sentinel-1-grd'
    },
    {
        id: 'S2B_MSIL2A_20240512T074609_N0510_R135_T39TUF',
        type: 'Feature',
        stac_version: '1.0.0',
        geometry: {
            type: 'Polygon',
            coordinates: [[[49.5, 40.3], [50.5, 40.3], [50.5, 41.2], [49.5, 41.2], [49.5, 40.3]]]
        },
        bbox: [49.5, 40.3, 50.5, 41.2],
        properties: {
            datetime: '2024-05-12T07:46:09Z',
            created: '2024-05-12T14:00:00Z',
            title: 'Sentinel-2 - Xızı-Quba',
            description: 'Xızı və Quba rayonları',
            'eo:cloud_cover': 15,
            'proj:epsg': 32639,
            'gsd': 10
        },
        links: [{ rel: 'self', href: '/stac/items/S2B_MSIL2A_20240512T074609' }],
        assets: {
            thumbnail: {
                href: 'https://example.com/thumb/S2B_20240512_T39TUF.png',
                type: 'image/png',
                title: 'Thumbnail',
                roles: ['thumbnail']
            },
            visual: {
                href: 's3://sentinel/S2B_MSIL2A_20240512T074609_TCI.tif',
                type: 'image/tiff; application=geotiff; profile=cloud-optimized',
                title: 'True Color Image',
                roles: ['visual', 'data']
            }
        },
        collection: 'sentinel-2-l2a'
    },
    {
        id: 'DEM_AZ_30m_2020',
        type: 'Feature',
        stac_version: '1.0.0',
        geometry: {
            type: 'Polygon',
            coordinates: [[[44.5, 38.5], [50.5, 38.5], [50.5, 42.0], [44.5, 42.0], [44.5, 38.5]]]
        },
        bbox: [44.5, 38.5, 50.5, 42.0],
        properties: {
            datetime: '2020-06-15T00:00:00Z',
            created: '2020-07-01T00:00:00Z',
            title: 'Azerbaijan DEM 30m',
            description: 'Azərbaycanın rəqəmsal yüksəklik modeli',
            'proj:epsg': 4326,
            'gsd': 30
        },
        links: [{ rel: 'self', href: '/stac/items/DEM_AZ_30m_2020' }],
        assets: {
            data: {
                href: 's3://dem/azerbaijan_dem_30m.tif',
                type: 'image/tiff; application=geotiff; profile=cloud-optimized',
                title: 'DEM Data',
                roles: ['data']
            }
        },
        collection: 'dem-azerbaijan'
    }
];

// ==========================================
// Helper Functions
// ==========================================

const bboxIntersects = (
    itemBbox: [number, number, number, number], 
    searchBbox: [number, number, number, number]
): boolean => {
    const [itemMinLng, itemMinLat, itemMaxLng, itemMaxLat] = itemBbox;
    const [searchMinLng, searchMinLat, searchMaxLng, searchMaxLat] = searchBbox;
    
    return !(
        itemMaxLng < searchMinLng || 
        itemMinLng > searchMaxLng || 
        itemMaxLat < searchMinLat || 
        itemMinLat > searchMaxLat
    );
};

const isDateInRange = (itemDate: string, dateRange: string): boolean => {
    const itemDateTime = new Date(itemDate).getTime();
    
    if (dateRange.includes('/')) {
        const [start, end] = dateRange.split('/');
        const startTime = start ? new Date(start).getTime() : 0;
        const endTime = end ? new Date(end).getTime() : Date.now();
        return itemDateTime >= startTime && itemDateTime <= endTime;
    }
    
    const searchDate = new Date(dateRange).toISOString().split('T')[0];
    const itemDateStr = new Date(itemDate).toISOString().split('T')[0];
    return searchDate === itemDateStr;
};

// ==========================================
// Filter Processing (shared between GET/POST)
// ==========================================

const applyFilters = (
    items: StacItem[],
    options: {
        collections?: string[];
        ids?: string[];
        bbox?: [number, number, number, number];
        datetime?: string;
        query?: Record<string, any>;
        sortby?: { field: string; direction: 'asc' | 'desc' }[];
        limit?: number;
    }
): { items: StacItem[]; matched: number } => {
    let filteredItems = [...items];

    // Filter by collections
    if (options.collections && options.collections.length > 0) {
        filteredItems = filteredItems.filter(item => 
            item.collection && options.collections!.includes(item.collection)
        );
    }

    // Filter by IDs
    if (options.ids && options.ids.length > 0) {
        filteredItems = filteredItems.filter(item => 
            options.ids!.includes(item.id)
        );
    }

    // Filter by bbox
    if (options.bbox) {
        filteredItems = filteredItems.filter(item => 
            bboxIntersects(item.bbox, options.bbox!)
        );
    }

    // Filter by datetime
    if (options.datetime) {
        filteredItems = filteredItems.filter(item => 
            isDateInRange(item.properties.datetime, options.datetime!)
        );
    }

    // Filter by query parameters
    if (options.query) {
        if (options.query['eo:cloud_cover']?.lte !== undefined) {
            const maxCloud = options.query['eo:cloud_cover'].lte;
            filteredItems = filteredItems.filter(item => 
                (item.properties['eo:cloud_cover'] ?? 0) <= maxCloud
            );
        }

        if (options.query['gsd']) {
            const { gte: minGsd, lte: maxGsd } = options.query['gsd'];
            filteredItems = filteredItems.filter(item => {
                const gsd = item.properties['gsd'];
                if (!gsd) return true;
                return gsd >= (minGsd || 0) && gsd <= (maxGsd || 1000);
            });
        }
    }

    const matched = filteredItems.length;

    // Sort
    if (options.sortby && options.sortby.length > 0) {
        const { field, direction } = options.sortby[0];
        filteredItems.sort((a, b) => {
            const aVal = a.properties[field] ?? (a as any)[field];
            const bVal = b.properties[field] ?? (b as any)[field];
            
            if (direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });
    }

    // Limit
    const limit = options.limit || 10;
    filteredItems = filteredItems.slice(0, limit);

    return { items: filteredItems, matched };
};

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
     * GET /stac/search
     * Sadə sorğular üçün - query string
     */
    searchGet: async (params: StacSearchGetParams): Promise<StacSearchResponse> => {
        console.log('🔍 STAC Search GET:', params);
        
        // TODO: Real API
        // return await api.get(`${STAC_API_URL}/search`, { params });

        await new Promise(resolve => setTimeout(resolve, 500));

        // Parse params
        const options = {
            collections: params.collections?.split(',').filter(Boolean),
            ids: params.ids?.split(',').filter(Boolean),
            bbox: params.bbox?.split(',').map(Number) as [number, number, number, number] | undefined,
            datetime: params.datetime,
            query: params.query ? JSON.parse(params.query) : undefined,
            sortby: params.sortby ? JSON.parse(params.sortby) : undefined,
            limit: params.limit
        };

        const { items, matched } = applyFilters(MOCK_ITEMS, options);

        console.log(`✅ GET: Found ${matched} items, returning ${items.length}`);

        return {
            type: 'FeatureCollection',
            features: items,
            links: [],
            context: { returned: items.length, limit: params.limit || 10, matched },
            numberMatched: matched,
            numberReturned: items.length
        };
    },

    /**
     * POST /stac/search
     * Mürəkkəb sorğular üçün - JSON body
     */
    searchPost: async (body: StacSearchPostRequest): Promise<StacSearchResponse> => {
        console.log('🔍 STAC Search POST:', body);
        
        // TODO: Real API
        // return await api.post(`${STAC_API_URL}/search`, body);

        await new Promise(resolve => setTimeout(resolve, 500));

        const options = {
            collections: body.collections,
            ids: body.ids,
            bbox: body.bbox,
            datetime: body.datetime,
            query: body.query,
            sortby: body.sortby,
            limit: body.limit
        };

        const { items, matched } = applyFilters(MOCK_ITEMS, options);

        console.log(`✅ POST: Found ${matched} items, returning ${items.length}`);

        return {
            type: 'FeatureCollection',
            features: items,
            links: [],
            context: { returned: items.length, limit: body.limit || 10, matched },
            numberMatched: matched,
            numberReturned: items.length
        };
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
     * GET /stac/collections
     */
    getCollections: async (): Promise<StacCollection[]> => {
        console.log('📁 Get Collections');
        
        // TODO: Real API
        // return await api.get(`${STAC_API_URL}/collections`);

        await new Promise(resolve => setTimeout(resolve, 300));
        return MOCK_COLLECTIONS;
    },

    /**
     * GET /stac/collections/{id}
     */
    getCollection: async (id: string): Promise<StacCollection | null> => {
        console.log('📁 Get Collection:', id);
        
        // TODO: Real API
        // return await api.get(`${STAC_API_URL}/collections/${id}`);

        await new Promise(resolve => setTimeout(resolve, 200));
        return MOCK_COLLECTIONS.find(c => c.id === id) || null;
    },

    /**
     * GET /stac/items/{id}
     */
    getItem: async (id: string): Promise<StacItem | null> => {
        console.log('📄 Get Item:', id);
        
        // TODO: Real API
        // return await api.get(`${STAC_API_URL}/items/${id}`);

        await new Promise(resolve => setTimeout(resolve, 200));
        return MOCK_ITEMS.find(item => item.id === id) || null;
    }
};
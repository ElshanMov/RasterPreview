import axios from 'axios';

const PYGEOAPI_URL = import.meta.env.VITE_PYGEOAPI_URL || 'http://pygeoapi.mmdev.az';

export interface PyGeoAPIFeature {
    type: 'Feature';
    id: string;
    geometry: {
        type: 'Point';
        coordinates: [number, number]; // [lng, lat]
    };
    properties: {
        id: string;
        leaid?: string;
        organization_id?: string;
        stac_datetime?: string;
        properties?: {
            name?: string;
            lat?: number;
            lon?: number;
            [key: string]: any;
        };
        [key: string]: any;
    };
}

export interface PyGeoAPIResponse {
    type: 'FeatureCollection';
    features: PyGeoAPIFeature[];
    numberMatched: number;
    numberReturned: number;
    timeStamp: string;
    links: Array<{
        rel: string;
        href: string;
        type?: string;
        title?: string;
    }>;
}

export interface PyGeoAPISearchParams {
    bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
    limit?: number;
    offset?: number;
    datetime?: string;
    sortby?: string;
}

// Create dedicated axios instance for PyGeoAPI (no auth needed)
const pygeoapi = axios.create({
    baseURL: PYGEOAPI_URL,
    timeout: 30000,
    headers: {
        'Accept': 'application/geo+json',
    },
});

export const PyGeoAPIService = {
    /**
     * Get available collections
     */
    getCollections: async (): Promise<any> => {
        const response = await pygeoapi.get('/collections', {
            params: { f: 'json' }
        });
        return response.data;
    },

    /**
     * Get collection metadata
     */
    getCollection: async (collectionId: string): Promise<any> => {
        const response = await pygeoapi.get(`/collections/${collectionId}`, {
            params: { f: 'json' }
        });
        return response.data;
    },

    /**
     * Search items in a collection with bbox filter
     */
    getItems: async (
        collectionId: string,
        params: PyGeoAPISearchParams = {}
    ): Promise<PyGeoAPIResponse> => {
        const queryParams: Record<string, string> = {
            f: 'json',
        };

        if (params.bbox) {
            queryParams.bbox = params.bbox.join(',');
        }

        if (params.limit) {
            queryParams.limit = params.limit.toString();
        }

        if (params.offset) {
            queryParams.offset = params.offset.toString();
        }

        if (params.datetime) {
            queryParams.datetime = params.datetime;
        }

        if (params.sortby) {
            queryParams.sortby = params.sortby;
        }

        const response = await pygeoapi.get(`/collections/${collectionId}/items`, {
            params: queryParams,
        });

        return response.data;
    },

    /**
     * Get single item by ID
     */
    getItem: async (collectionId: string, itemId: string): Promise<PyGeoAPIFeature> => {
        const response = await pygeoapi.get(`/collections/${collectionId}/items/${itemId}`, {
            params: { f: 'json' }
        });
        return response.data;
    },

    /**
     * Fetch all items with pagination (for large datasets)
     * Warning: Use with caution for very large datasets
     */
    getAllItems: async (
        collectionId: string,
        bbox?: [number, number, number, number],
        maxItems: number = 10000
    ): Promise<PyGeoAPIFeature[]> => {
        const allFeatures: PyGeoAPIFeature[] = [];
        const pageSize = 1000;
        let offset = 0;
        let hasMore = true;

        while (hasMore && allFeatures.length < maxItems) {
            const response = await PyGeoAPIService.getItems(collectionId, {
                bbox,
                limit: pageSize,
                offset,
            });

            allFeatures.push(...response.features);
            offset += pageSize;
            hasMore = response.features.length === pageSize;
        }

        return allFeatures;
    },
};

export default PyGeoAPIService;
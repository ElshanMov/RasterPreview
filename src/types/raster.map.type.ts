// ==========================================
// STAC Search API - GET & POST Types
// ==========================================

// ✅ Data Type - Raster və ya Vector seçimi üçün
export type DataType = 'all' | 'Raster' | 'Vector';

export interface BboxCoords {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

// ==========================================
// GET Request - Query String Parameters
// ==========================================

export interface StacSearchGetParams {
    collections?: string;      // comma-separated: "landsat-8,sentinel-2"
    ids?: string;              // comma-separated: "id1,id2,id3"
    bbox?: string;             // "minLng,minLat,maxLng,maxLat"
    intersects?: string;       // GeoJSON string
    datetime?: string;         // ISO 8601: "2024-01-01T00:00:00Z/2024-12-31T23:59:59Z"
    limit?: number;
    query?: string;            // JSON string
    sortby?: string;           // JSON string
    fields?: string;           // JSON string
    token?: string;
    filter?: string;           // JSON string
}

// ==========================================
// POST Request - JSON Body
// ==========================================

export interface StacSearchPostRequest {
    collections?: string[];
    ids?: string[];
    bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
    intersects?: GeoJSONGeometry;
    datetime?: string;
    limit?: number;
    conf?: Record<string, any>;
    query?: Record<string, any>;
    sortby?: SortBy[];
    fields?: {
        include?: string[];
        exclude?: string[];
    };
    token?: string;
    filter?: Record<string, any>;
    'filter-crs'?: string;
    'filter-lang'?: 'cql-json' | 'cql2-json' | 'cql2-text';
}

export interface SortBy {
    field: string;
    direction: 'asc' | 'desc';
}

export interface GeoJSONGeometry {
    type: 'Point' | 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString';
    coordinates: any;
}

// ==========================================
// Filter UI State
// ==========================================

export interface RasterFilterParams {
    // Basic filters
    bbox: BboxCoords | null;
    dateRange: [string, string] | null;
    collections: string[];
    ids: string;
    searchText: string;
    
    // Data Type filter
    dataType: DataType;
    
    // Advanced filters
    cloudCover: number | null;
    resolution: [number, number] | null;
    
    // Pagination & Sorting
    limit: number;
    sortBy: SortBy | null;
    token: string | null;
}

// ==========================================
// STAC Item Response
// ==========================================

export interface StacItem {
    id: string;
    type: 'Feature';
    stac_version: string;
    stac_extensions?: string[];
    geometry: GeoJSONGeometry;
    bbox: [number, number, number, number];
    properties: StacItemProperties;
    links: StacLink[];
    assets: Record<string, StacAsset>;
    collection?: string;
}

export interface StacItemProperties {
    datetime: string;
    created?: string;
    updated?: string;
    title?: string;
    description?: string;
    'eo:cloud_cover'?: number;
    'proj:epsg'?: number;
    'gsd'?: number;
    // Backend-dən gələcək data_type
    data_type?: 'Raster';
    // Vector-specific properties
    feature_count?: number;
    pipeline_type?: string;
    organization_id?: string;
    [key: string]: any;
}

export interface StacLink {
    rel: string;
    href: string;
    type?: string;
    title?: string;
}

export interface StacAsset {
    // Backend həm kiçik həm böyük hərflə qaytara bilər
    href?: string;
    Href?: string;
    type?: string;
    Type?: string;
    title?: string;
    Title?: string;
    description?: string;
    roles?: string[];
    Roles?: string[];
}

// ==========================================
// STAC Search Response
// ==========================================

export interface StacSearchResponse {
    type: 'FeatureCollection';
    features: StacItem[];
    links: StacLink[];
    context?: {
        returned: number;
        limit: number;
        matched?: number;
    };
    numberMatched?: number;
    numberReturned?: number;
}

// ==========================================
// Collection Types
// ==========================================

export interface StacCollection {
    id: string;
    type: 'Collection';
    stac_version: string;
    title?: string;
    description: string;
    keywords?: string[];
    license: string;
    extent: {
        spatial: {
            bbox: [number, number, number, number][];
        };
        temporal: {
            interval: [string | null, string | null][];
        };
    };
    links: StacLink[];
}

// ==========================================
// TiTiler Integration Types
// ==========================================

export interface RasterTileConfig {
    cogUrl: string;
    tileUrl: string;
    bounds: [number, number, number, number];
    statistics?: {
        [bandKey: string]: {
            min: number;
            max: number;
            percentile_2: number;
            percentile_98: number;
        };
    };
}

export interface SelectedRasterLayer {
    item: StacItem;
    tileConfig: RasterTileConfig | null;
    loading: boolean;
    error: string | null;
}
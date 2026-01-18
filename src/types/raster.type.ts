export interface RasterListItem {
    id: string;
    name: string;
    cogPath: string;
    width: number;
    height: number;
    bands: number;
    srid: number;
    bounds: number[];
    createdAt: string;
    user: string;
}

export interface RasterUpload {
    organizationName: string;
    pixelSize: string;
    fileName: number;
}

export interface RasterPresignedUrlResponse {
    url: string;
    cogPath: string;
}

export interface StacAsset {
    href: string;
    type: string;
    title: string;
    roles: string[];
}

export interface StacLink {
    rel: string;
    href: string;
}

export interface StacItem {
    id: string;
    collection: string;
    geometry: string;
    bbox: number[];
    properties: {
        datetime: string;
        organization_name: string;
        branch_name: string;
    };
    assets: {
        [key: string]: StacAsset;
    };
    links: StacLink[];
}

export interface CompleteUploadRequest {
    stacItem: StacItem;
}
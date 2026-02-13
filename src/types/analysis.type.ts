export interface SpatialAnalysisParamsType {
    Name: string | null;
    Type: number | null;
    Description: string | null;
    Page: number;
    PageSize: number;
}

export interface SpatialAnalysisListItem {
    id: string;
    name: string;
    typeName: string;
    description: string;
    createdAt: Date
}

export interface SpatialAnalysis {
    id: string;
    name: string;
    type: number;
    description: string;
    createdAt: Date;
    source: SpatialAnalysisSource;
    targets: SpatialAnalysisTarget[]
}

export interface SpatialAnalysisCreate {
    name: string;
    type: number;
    description: string;
    source: SpatialAnalysisSource;
    targets: SpatialAnalysisTarget[]
}

export interface SpatialAnalysisUpdate {
    name: string;
    type: number;
    description: string;
    source: SpatialAnalysisSource;
    targets: SpatialAnalysisTarget[]
}

export interface SpatialAnalysisSource {
    organizationId: string;
    layerId: string;
    filters: SpatialAnalysisFilter[]
}

export interface SpatialAnalysisTarget {
    organizationId: string;
    layerId: string;
    filters: SpatialAnalysisFilter[]
}

export interface SpatialAnalysisFilter {
    attribute: string;
    operation: number;
    value: string;
    order: number;
}
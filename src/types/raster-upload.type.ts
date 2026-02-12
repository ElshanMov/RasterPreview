/**
 * Raster Upload Pipeline - Type Definitions
 * 
 * Bu faylda raster upload prosesinin bütün mərhələlərini 
 * izləmək üçün lazım olan tiplər təyin olunub.
 */

// ─── Status Constants ─────────────────────────────────────────
// Hər status UI-da fərqli vizual feedback verir
// (const object + type union — erasableSyntaxOnly uyğunluğu üçün)

export const RasterUploadStatus = {
    Pending: 'Pending',
    Uploading: 'Uploading',
    Uploaded: 'Uploaded',
    Processing: 'Processing',
    CogConverting: 'CogConverting',
    Analyzing: 'Analyzing',
    Success: 'Success',
    PartialSuccess: 'PartialSuccess',
    Failed: 'Failed',
    Stale: 'Stale',
} as const;

export type RasterUploadStatus = (typeof RasterUploadStatus)[keyof typeof RasterUploadStatus];

// ─── Upload Item ──────────────────────────────────────────────
// Hər bir faylın upload prosesi haqqında tam məlumat
export interface RasterUploadItem {
    /** Server-generated UUID (POST /raster-upload/create-dən qayıdan) */
    correlationId: string;

    /** Orijinal fayl adı */
    fileName: string;

    /** Fayl ölçüsü (bytes) */
    fileSize: number;

    /** Hazırkı status */
    status: RasterUploadStatus;

    /** MinIO upload progress (0-100, yalnız Uploading statusunda aktiv) */
    uploadProgress: number;

    /** Hazırkı mərhələ haqqında qısa izahat */
    statusMessage: string;

    /** Xəta baş verdikdə - xəta mesajı */
    errorMessage?: string;

    /** Upload başlama vaxtı */
    startedAt: string;

    /** Proses bitirmə vaxtı */
    completedAt?: string;

    /** COG faylının MinIO yolu (worker tərəfindən set olunur) */
    cogPath?: string;

    /** MinIO-dakı orijinal fayl yolu */
    originalPath?: string;

    /** Retry sayı */
    retryCount: number;
}

// ─── WebSocket Event Payloads ─────────────────────────────────
// SignalR-dan gələn mesajların strukturu

export interface RasterUploadProgressEvent {
    correlationId: string;
    status: RasterUploadStatus;
    message: string;
    cogPath?: string;
    errorMessage?: string;
    statistics?: RasterUploadStatistics;
}

// ─── Statistics (Worker-dən gələn) ────────────────────────────
export interface RasterBandStatistics {
    band: number;
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    nodata: number | null;
    histogram: number[];
}

export interface RasterUploadStatistics {
    bbox: number[];
    crs: string;
    resolution: string;
    width: number;
    height: number;
    bands: number;
    bandStatistics: RasterBandStatistics[];
}

// ─── API Request/Response ─────────────────────────────────────

/** POST /files/raster/pre-signed-url */
export interface FilePresignedUrlRasterRequest {
    organizationName: string;
    fileName: string;
    pixelSize: string;
}

/** POST /files/raster/pre-signed-url response */
export interface FilePresignedUrlRasterResponse {
    url: string;
    path: string;
}

/**
 * POST /raster-upload/create — DB-də upload rekord yaradır.
 * Backend özü set edir: userId (JWT), status (Pending), createdAt, correlationId
 */
export interface RasterUploadCreateRequest {
    organizationId: string;
    branchId: string;
    originalFileName: string;
    rawPath: string;
    cogPath: string;
    fileLength: number;
    fileExtension: string;
}

/** POST /raster-upload/create response */
export interface RasterUploadCreateResponse {
    correlationId: string;
}

/** POST /files/raster/set-raster-metadata — MinIO object-ə correlationId yazır */
export interface RasterFileMetadataRequest {
    path: string;
    correlationId: string;
}

/** PATCH /raster-upload/{correlationId}/status */
export interface UpdateRasterUploadStatusRequest {
    status: RasterUploadStatus;
    errorMessage?: string;
}
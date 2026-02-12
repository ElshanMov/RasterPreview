import api from './_axios';
import type {
    RasterUploadCreateRequest,
    RasterUploadCreateResponse,
    RasterFileMetadataRequest,
    UpdateRasterUploadStatusRequest,
} from '../types/raster-upload.type';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Raster Upload Pipeline Service
 * 
 * Flow:
 * 1. FileService.getRasterFilePresignedUrl() → {url, path}
 * 2. RasterUploadService.createUpload()      → {correlationId}
 * 3. MinIO upload (plain, header-siz)
 * 4. RasterUploadService.setMetadata()       → MinIO object-ə correlationId yazır
 * 5. RasterUploadService.updateStatus()      → status Uploaded
 */
export const RasterUploadService = {

    /**
     * POST /raster-upload/create
     * DB-də RasterUpload rekord yaradır, correlationId qaytarır.
     */
    createUpload: async (data: RasterUploadCreateRequest): Promise<{ data: RasterUploadCreateResponse }> => {
        return await api.post(
            `${API_URL}/pipeline/api/v1/raster-uploads/create`,
            data
        );
    },

    /**
     * POST /files/raster/set-raster-metadata
     * MinIO upload bitdikdən sonra object-ə correlationId metadata yazır.
     * Bu metadata Kafka event-ində worker-ə ötürüləcək.
     */
    setMetadata: async (data: RasterFileMetadataRequest): Promise<void> => {
        await api.post(
            `${API_URL}/pipeline/api/v1/files/raster/set-raster-metadata`,
            data
        );
    },

    /**
     * PATCH /raster-upload/{correlationId}/status
     * MinIO upload + metadata set bitdikdən sonra statusu "Uploaded" etmək.
     */
    updateStatus: async (
    correlationId: string,
    data: UpdateRasterUploadStatusRequest
): Promise<void> => {
    await api.patch(
        `${API_URL}/pipeline/api/v1/raster-uploads/${correlationId}/status`,
        { ...data, correlationId }
    );
},

    /**
     * İstifadəçinin aktiv/son upload-larını almaq.
     * Səhifə refresh olduqda state-i bərpa etmək üçün.
     */
    getMyUploads: async (): Promise<any> => {
        return await api.get(
            `${API_URL}/pipeline/api/v1/raster-uploads/my-uploads`
        );
    },
};
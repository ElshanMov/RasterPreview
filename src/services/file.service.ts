import type { FilePresignedUrlVector } from '../types/file.type';
import api from './_axios';

const API_URL = import.meta.env.VITE_API_URL;

export const FileService = {
    getVectorFilePresignedUrl: async (data: FilePresignedUrlVector): Promise<any> => {
        return await api.post(`${API_URL}/pipeline/api/v1/files/vector/pre-signed-url`, data);
    },
    // ✅ DÜZGÜN BODY STRUCTURE
    getRasterFilePresignedUrl: async (data: {
        organizationName: string;      // ✅ ID, name yox
        fileName: string;
        pixelSize: string;
    }): Promise<any> => {
        console.log('📤 Sending to backend:', data);
        return await api.post(`${API_URL}/pipeline/api/v1/files/raster/pre-signed-url`, data);
    },
     // Complete upload
    completeRasterUpload: async (stacItem: any): Promise<any> => {
        debugger
        return await api.post(`${API_URL}/pipeline/api/v1/files/raster/complete-upload`, {
            stacItem
        });
    }

}
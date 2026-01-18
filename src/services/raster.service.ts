import api from './_axios';
import type { RasterUpload } from '../types/raster.type';

const API_URL = import.meta.env.VITE_API_URL;

export const RasterService = {
    getRasters: async (): Promise<any> => {
        return await api.get(`${API_URL}/raster/api/v1/rasters`);
    },

    getRasterById: async (id: string): Promise<any> => {
        return await api.get(`${API_URL}/raster/api/v1/rasters/${id}`);
    },

    deleteRaster: async (id: string): Promise<any> => {
        return await api.delete(`${API_URL}/raster/api/v1/rasters/${id}`);
    },

    postPresignedUrl: async (rasterUpload: RasterUpload): Promise<any> => {
        return await api.post(`${API_URL}/api/v1/files/raster/pre-signed-url`, {
            rasterUpload
        });
    },

    createRaster: async (data: {
        name: string;
        organizationId: string;
        branchId?: string;
        cogPath: string;
        width: number;
        height: number;
        bands: number;
        srid: string;
        bounds: number[];
    }): Promise<any> => {
        return await api.post(`${API_URL}/raster/api/v1/rasters`, data);
    }
};
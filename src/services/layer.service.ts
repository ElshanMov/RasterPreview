import api from './_axios';

const API_URL = import.meta.env.VITE_API_URL;

export const LayerService = {
  getAllLayers: async (organizationId: string): Promise<any> => {
    return await api.get(`${API_URL}/pipeline/api/v1/layers/${organizationId}/all`);
  }
}
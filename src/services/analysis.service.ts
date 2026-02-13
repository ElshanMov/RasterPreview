import type { SpatialAnalysis, SpatialAnalysisCreate, SpatialAnalysisParamsType, SpatialAnalysisUpdate } from '../types/analysis.type';
import api from './_axios';
import qs from "qs";

const API_URL = import.meta.env.VITE_API_URL;

export const SpatialAnalysisService = {
  getSpatialAnalysisTypes: async (): Promise<any> => {
    return await api.get(`${API_URL}/pipeline/api/v1/spatial-analyses/types`);
  },
  getSpatialAnalysisFilterOperators: async (): Promise<any> => {
    return await api.get(`${API_URL}/pipeline/api/v1/spatial-analyses/filter-operators`);
  },
  getSpatialAnalysisLogicOperators: async (): Promise<any> => {
    return await api.get(`${API_URL}/pipeline/api/v1/spatial-analyses/logic-operators`);
  },
  getSpatialAnalyses: async (params: SpatialAnalysisParamsType): Promise<any> => {
    return await api.get(`${API_URL}/pipeline/api/v1/spatial-analyses`, {
      params,
      paramsSerializer: (params) => {
        return qs.stringify(params);
      },
    });
  },
  getSpatialAnalysis: async (id: string): Promise<SpatialAnalysis> => {
    return await api.get(`${API_URL}/pipeline/api/v1/spatial-analyses/${id}`);
  },
  createSpatialAnalysis: async (data: SpatialAnalysisCreate): Promise<any> => {
    return await api.post(`${API_URL}/pipeline/api/v1/spatial-analyses`, data);
  },
  updateSpatialAnalysis: async (id: string, data: SpatialAnalysisUpdate): Promise<any> => {
    return await api.put(`${API_URL}/pipeline/api/v1/spatial-analyses/${id}`, data);
  }
}
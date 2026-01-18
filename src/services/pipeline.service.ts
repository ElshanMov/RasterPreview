import type { Pipeline, PipelineParamsType } from '../types/pipeline.type';
import api from './_axios';
import qs from "qs";

const API_URL = import.meta.env.VITE_API_URL;

export const PipelineService = {
  getPipelinesDashboard: async (): Promise<any> => {
    return await api.get(`${API_URL}/pipeline/api/v1/pipelines/dashboard`);
  },
  getLatestPipelines: async (limit: number): Promise<any> => {
    return await api.get(`${API_URL}/pipeline/api/v1/pipelines/latest?limit=${limit}`);
  },
  getPipelines: async (params: PipelineParamsType): Promise<any> => {
    return await api.get(`${API_URL}/pipeline/api/v1/pipelines`, {
      params,
      paramsSerializer: (params) => {
        return qs.stringify(params);
      },
    });
  },
  createPipeline: async (data: Pipeline): Promise<any> => {
    return await api.post(`${API_URL}/pipeline/api/v1/pipelines`, data);
  },
  runPipeline: async (id: string): Promise<any> => {
    return await api.patch(`${API_URL}/pipeline/api/v1/pipelines/${id}/run`);
  },
  stopPipeline: async (id: string): Promise<any> => {
    return await api.patch(`${API_URL}/pipeline/api/v1/pipelines/${id}/stop`);
  }
}
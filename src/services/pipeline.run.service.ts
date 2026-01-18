import type { PipelineRunParamsType } from '../types/pipeline.run.type';
import api from './_axios';
import qs from "qs";

const API_URL = import.meta.env.VITE_API_URL;

export const PipelineRunService = {
  getPipelineRuns: async (pipelineId: string | undefined, params: PipelineRunParamsType): Promise<any> => {
    return await api.get(`${API_URL}/pipeline/api/v1/pipelines/${pipelineId}/runs`, {
      params,
      paramsSerializer: (params) => {
        return qs.stringify(params);
      },
    });
  },
}
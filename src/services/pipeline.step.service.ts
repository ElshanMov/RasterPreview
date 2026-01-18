import type { PipelineStepParamsType } from '../types/pipeline.step.type';
import api from './_axios';
import qs from "qs";

const API_URL = import.meta.env.VITE_API_URL;

export const PipelineStepService = {
  getPipelineSteps: async (pipelineRunId: string | undefined, params: PipelineStepParamsType): Promise<any> => {
    return await api.get(`${API_URL}/pipeline/api/v1/pipelines/runs/${pipelineRunId}/steps`, {
      params,
      paramsSerializer: (params) => {
        return qs.stringify(params);
      },
    });
  },
}
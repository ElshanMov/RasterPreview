import type { BranchParamsType } from '../types/branch.type';
import api from './_axios';
import qs from "qs";

const API_URL = import.meta.env.VITE_API_URL;

export const BranchService = {
  getBranches: async (organizationId: string | undefined, params: BranchParamsType): Promise<any> => {
    return await api.get(`http://app.mmdev.az/auth/api/v1/organizations/${organizationId}/branches`, {
      params,
      paramsSerializer: (params) => {
        return qs.stringify(params);
      },
    });
  },
  getAllBranches: async (organizationId: string | undefined): Promise<any> => {
    return await api.get(`http://app.mmdev.az/auth/api/v1/organizations/${organizationId}/branches/all`);
  }
}
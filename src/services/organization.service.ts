import type { OrganizationParamsType } from '../types/organization.type';
import api from './_axios';
import qs from "qs";

const API_URL = import.meta.env.VITE_API_URL;

export const OrganizationService = {
  getOrganizations: async (params: OrganizationParamsType): Promise<any> => {
    return await api.get(`http://app.mmdev.az/auth/api/v1/organizations`, {
      params,
      paramsSerializer: (params) => {
        return qs.stringify(params);
      },
    });
  },
  getAllOrganizations: async (): Promise<any> => {
    return await api.get(`http://app.mmdev.az/auth/api/v1/organizations/all`);
  }
}
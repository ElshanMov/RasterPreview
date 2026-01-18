import api from './_axios';

const API_URL = import.meta.env.VITE_API_URL;

export const AccountService = {
  getAccountProfile: async (): Promise<any> => {
    return await api.get(`${API_URL}/auth/api/v1/accounts/profile`);
  }
}
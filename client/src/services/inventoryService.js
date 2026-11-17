import api from './api';

export const inventoryService = {
  getInventory: async (params = {}) => {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  getLowStock: async () => {
    const response = await api.get('/inventory/low-stock');
    return response.data.products;
  },

  getTransactions: async (params = {}) => {
    const response = await api.get('/inventory/transactions', { params });
    return response.data;
  },

  adjustStock: async (adjustmentData) => {
    const response = await api.post('/inventory/adjustments', adjustmentData);
    return response.data;
  },
};

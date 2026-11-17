import api from './api';

export const dashboardService = {
  getSummary: async () => {
    const response = await api.get('/dashboard/summary');
    return response.data;
  },

  getTopProducts: async (limit = 5) => {
    const response = await api.get('/dashboard/top-products', { params: { limit } });
    return response.data.topProducts;
  },

  getRecentOrders: async (limit = 5) => {
    const response = await api.get('/dashboard/recent-orders', { params: { limit } });
    return response.data.recentOrders;
  },

  getMonthlySales: async () => {
    const response = await api.get('/dashboard/monthly-sales');
    return response.data.monthlySales;
  },
};

import api from './api';

export const customerService = {
  getCustomers: async (params = {}) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  getCustomerById: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data.customer;
  },

  createCustomer: async (data) => {
    const response = await api.post('/customers', data);
    return response.data.customer;
  },

  updateCustomer: async (id, data) => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data.customer;
  },
};

import api from './api';

export const supplierService = {
  getSuppliers: async (params = {}) => {
    const response = await api.get('/suppliers', { params });
    return response.data.suppliers;
  },

  getSupplierById: async (id) => {
    const response = await api.get(`/suppliers/${id}`);
    return response.data.supplier;
  },

  createSupplier: async (data) => {
    const response = await api.post('/suppliers', data);
    return response.data.supplier;
  },

  updateSupplier: async (id, data) => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data.supplier;
  },
};

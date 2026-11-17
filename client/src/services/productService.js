import api from './api';

export const productService = {
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data.product;
  },

  createProduct: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data.product;
  },

  updateProduct: async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data.product;
  },

  toggleStatus: async (id, isActive) => {
    const response = await api.patch(`/products/${id}/status`, { is_active: isActive });
    return response.data.product;
  },
};

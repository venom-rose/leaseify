import axios from 'axios';

// 1. Create a configured Axios instance
const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10s timeout
});

// 2. Request Interceptor: Automatically attach JWT Token from localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('leaseify_token') || 'demo-jwt-token-admin';
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🚀 [AXIOS REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    console.log('📦 [AXIOS PAYLOAD]:', config.data);
    return config;
  },
  (error) => {
    console.error('❌ [AXIOS REQUEST ERROR]:', error);
    return Promise.reject(error);
  }
);

// 3. Response Interceptor: Log responses & handle global errors
API.interceptors.response.use(
  (response) => {
    console.log(`✅ [AXIOS RESPONSE ${response.status}] from ${response.config.url}:`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ [AXIOS RESPONSE ERROR]:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

// 4. Async/Await Product Creation Function
export const createProductWithAxios = async (formData) => {
  try {
    console.log('🔄 [START] Sending Product Data via Axios POST...');

    // Prepare cleaned payload matching backend expectations
    const payload = {
      name: formData.name,
      category: formData.category || 'Furniture',
      pricePerDay: Number(formData.price || formData.pricePerDay),
      securityDeposit: Number(formData.deposit || formData.securityDeposit || 0),
      location: formData.location || 'Main Hub',
      stockQuantity: Number(formData.stock || formData.stockQuantity || 1),
      description: formData.description || `${formData.name} in ${formData.category} available for daily rental.`,
      images: formData.images || [
        formData.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
      ],
    };

    const response = await API.post('/products', payload);

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Product created successfully!',
    };
  } catch (error) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Failed to create product';

    console.error('💥 [CREATE PRODUCT ERROR]:', errorMsg);

    return {
      success: false,
      message: errorMsg,
      status: error.response?.status,
    };
  }
};

export default API;

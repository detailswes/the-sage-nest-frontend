import { api } from '../lib/axiosInstance';

// Custom RTK Query base query that wraps the shared axios instance.
// The instance already handles 401 token refresh and auth headers,
// so all RTK Query endpoints get that for free.
const axiosBaseQuery = async ({ url, method = 'GET', data, params, headers, responseType } = {}) => {
  try {
    const result = await api({ url, method, data, params, headers, responseType });
    return { data: result.data };
  } catch (err) {
    return {
      error: {
        status: err.response?.status,
        data: err.response?.data ?? err.message,
      },
    };
  }
};

export default axiosBaseQuery;

const API_BASE_URL = 'http://localhost:3000/api';

// Helper function to get headers with authentication
const getHeaders = (includeAuth = true) => {
  const headers = {};

  if (includeAuth) {
    const token = localStorage.getItem('firebaseToken');
    if (!token) {
      console.error('No authentication token found');
      throw new Error('No token provided');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Generic fetch function
const fetchData = async (endpoint, options = {}) => {
  try {
    // Don't set Content-Type for FormData, let the browser set it automatically
    const headers = {
      ...getHeaders(options.includeAuth !== false),
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    // Remove Content-Type if it's multipart/form-data as it needs the boundary
    if (headers['Content-Type'] === 'multipart/form-data') {
      delete headers['Content-Type'];
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 401) {
        // Clear token and redirect to login on unauthorized
        localStorage.removeItem('firebaseToken');
        window.location.href = '/login';
      }
      throw new Error(errorData.message || 'Something went wrong');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Specific API methods
export const api = {
  // Auth
  login: (credentials) => 
    fetchData('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      includeAuth: false,
    }),

  register: (userData) => 
    fetchData('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      includeAuth: false,
    }),

  // User
  getUserProfile: () => 
    fetchData('/user/profile'),

  updateUserProfile: (userData) => 
    fetchData('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  // Interviews
  getInterviews: () => 
    fetchData('/interview'),

  getInterviewById: (id) => 
    fetchData(`/interview/${id}`),

  generateQuestion: (interviewId) =>
    fetchData(`/interview/${interviewId}/generate-question`, {
      method: 'POST'
    }),

  createInterview: async (formData) => {
    const token = localStorage.getItem('firebaseToken');
    if (!token) {
      throw new Error('No token provided');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/interview/start`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          localStorage.removeItem('firebaseToken');
          window.location.href = '/login';
        }
        throw new Error(errorData.message || 'Something went wrong');
      }

      const data = await response.json();
      if (data.status !== 'success' || !data.data || !data.data.interviewId) {
        throw new Error('Invalid response from server');
      }
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  submitAnswer: (interviewId, formData) =>
    fetchData(`/interview/${interviewId}/answer`, {
      method: 'POST',
      body: formData,
      headers: {}
    }),

  // Generic methods for custom endpoints
  get: (endpoint) => fetchData(endpoint),
  post: (endpoint, data, options = {}) => 
    fetchData(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      ...options
    }),
  put: (endpoint, data) => 
    fetchData(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (endpoint) => 
    fetchData(endpoint, {
      method: 'DELETE',
    }),
}; 
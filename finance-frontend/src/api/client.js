import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => {
        // Success toasts for mutations (POST/PUT/DELETE)
        if (['post', 'put', 'delete'].includes(response.config.method)) {
            const message = response.data?.message || 'Action completed successfully';
            if (!response.config.url.includes('/auth/login')) {
                toast.success(message);
            }
        }
        return response;
    },
    (error) => {
        const isAuthRequest = error.config?.url?.includes('/auth/login');
        const errorMessage = error.response?.data?.message || error.message || 'Something went wrong';

        if (error.response?.status === 401 && !isAuthRequest) {
            toast.error('Session expired. Please login again.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } else if (error.response?.status === 400 && error.response?.data?.errors) {
            // Handle validation errors
            error.response.data.errors.forEach(err => toast.error(err.message));
        } else {
            toast.error(errorMessage);
        }
        
        return Promise.reject(error);
    }
);

export default apiClient;

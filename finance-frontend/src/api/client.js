import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
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
    (error) => Promise.reject(error)
);

// Response interceptor for error handling and retry logic
apiClient.interceptors.response.use(
    (response) => {
        // Success toasts for mutations (POST/PUT/DELETE)
        if (['post', 'put', 'delete'].includes(response.config.method)) {
            const message = response.data?.message || 'Action completed successfully';
            if (!response.config.url?.includes('/auth/login')) {
                toast.success(message);
            }
        }
        return response;
    },
    async (error) => {
        const { config, response } = error;
        
        // --- Render Cold Start Retry Logic ---
        // If it's a 503 (Service Unavailable) or a network error and we haven't retried yet
        if (config && (!response || response.status === 503) && !config._retry) {
            config._retry = true;
            console.log('Detected potential cold start, retrying request...');
            // Wait 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
            return apiClient(config);
        }

        const isAuthRequest = config?.url?.includes('/auth/login');
        const errorMessage = response?.data?.message || error.message || 'Something went wrong';

        if (response?.status === 401 && !isAuthRequest) {
            toast.error('Session expired. Please login again.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login?reason=session_expired';
        } else if (response?.status === 400 && response?.data?.errors) {
            // Handle validation errors from Zod/Sequelize
            response.data.errors.forEach(err => toast.error(err.message));
        } else {
            toast.error(errorMessage);
        }
        
        return Promise.reject(error);
    }
);

export default apiClient;

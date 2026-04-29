import axios from 'axios';
import { toast } from 'sonner';

if (!process.env.REACT_APP_API_URL) {
    throw new Error('REACT_APP_API_URL environment variable is missing.');
}
const API_BASE_URL = process.env.REACT_APP_API_URL;

/**
 * Checks if a JWT token is expired.
 */
const isTokenExpired = (token) => {
    try {
        if (!token) return true;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch (e) {
        return true;
    }
};

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
        if (response.data && response.data.success === false) {
            throw new Error(response.data.message || 'API failed');
        }
        
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
        
        // Cold Start Retry Logic
        if (config && (!response || response.status === 503) && !config._retry) {
            config._retry = true;
            await new Promise(resolve => setTimeout(resolve, 2000));
            return apiClient(config);
        }

        const isAuthRequest = config?.url?.includes('/auth/login');
        const token = localStorage.getItem('token');

        if (response?.status === 401 && !isAuthRequest) {
            // ONLY logout if the token is actually expired.
            // This prevents random logouts from transient server 401s.
            if (isTokenExpired(token)) {
                toast.error('Session expired. Please login again.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login?reason=session_expired';
            } else {
                console.warn('[API] 401 Unauthorized received, but token is still valid. Ignoring random logout trigger.');
            }
        } else if (response?.status === 400 && response?.data?.errors) {
            response.data.errors.forEach(err => toast.error(err.message));
        } else {
            // Generic error handling
            const errorMessage = response?.data?.message || error.message || 'Something went wrong';
            if (response?.status !== 401) {
                toast.error(errorMessage);
            }
        }
        
        return Promise.reject(error);
    }
);

export default apiClient;

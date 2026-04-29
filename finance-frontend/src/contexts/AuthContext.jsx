import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

// Inactivity threshold: 30 minutes
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'lastActivityAt';

/**
 * Checks if a JWT token is expired by decoding its payload.
 */
const isTokenExpired = (token) => {
    try {
        if (!token) return true;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now();
        const exp = payload.exp * 1000;
        return exp < now;
    } catch (e) {
        return true;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const inactivityTimerRef = useRef(null);

    const normalizeUser = useCallback((u) => {
        if (!u) return null;
        return {
            ...u,
            name: typeof u.name === 'object' ? (u.name.name || u.name.displayName || u.name.label || String(u.name)) : String(u.name || ''),
            role: typeof u.role === 'object' ? (u.role.name || u.role.code || u.role.id || String(u.role)) : String(u.role || ''),
            department: typeof u.department === 'object' ? (u.department.name || u.department.displayName || u.department.label || String(u.department)) : String(u.department || '')
        };
    }, []);

    const logout = useCallback((reason = null) => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        setToken(null);
        setUser(null);

        if (reason === 'session_expired') {
            window.location.href = '/login?reason=session_expired';
        }
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            try {
                if (isTokenExpired(storedToken)) {
                    logout('session_expired');
                } else {
                    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
                    const elapsed = Date.now() - lastActivity;

                    if (elapsed >= INACTIVITY_LIMIT_MS) {
                        logout('session_expired');
                    } else {
                        const parsedUser = JSON.parse(storedUser);
                        const normalizedUser = normalizeUser(parsedUser);
                        setToken(storedToken);
                        setUser(normalizedUser);
                    }
                }
            } catch (error) {
                logout();
            }
        }
        setLoading(false);

        const syncLogout = (e) => {
            if (e.key === 'token' && !e.newValue) {
                logout();
            }
        };
        window.addEventListener('storage', syncLogout);
        return () => window.removeEventListener('storage', syncLogout);
    }, [logout, normalizeUser]);

    useEffect(() => {
        if (!user) return;

        const stamp = () => localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));

        const scheduleLogout = () => {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            stamp();
            inactivityTimerRef.current = setTimeout(() => {
                logout('session_expired');
            }, INACTIVITY_LIMIT_MS);
        };

        const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

        ACTIVITY_EVENTS.forEach(evt =>
            window.addEventListener(evt, scheduleLogout, { passive: true })
        );

        scheduleLogout();

        return () => {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            ACTIVITY_EVENTS.forEach(evt =>
                window.removeEventListener(evt, scheduleLogout)
            );
        };
    }, [user, logout]);

    // Keep-Alive Ping every 10 minutes
    useEffect(() => {
        if (!user || !token) return;

        const pingInterval = setInterval(() => {
            apiClient.get('/auth/me').catch(err => {
                if (err.response?.status === 401 && isTokenExpired(token)) {
                    logout('session_expired');
                }
            });
        }, 10 * 60 * 1000);

        return () => clearInterval(pingInterval);
    }, [user, token, logout]);

    const login = async (email, password, role) => {
        try {
            const response = await apiClient.post('/auth/login', { email, password, role });
            const responseData = response.data;
            const userData = responseData?.user || responseData?.data?.user;
            const userToken = responseData?.token || responseData?.data?.token;

            if (!userData || !userToken) throw new Error('Invalid login response');

            const normalizedUser = normalizeUser(userData);

            localStorage.setItem('token', userToken);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;

            setToken(userToken);
            setUser(normalizedUser);

            return { success: true, user: normalizedUser, token: userToken };
        } catch (error) {
            return {
                success: false,
                error: error.message || error.response?.data?.message || 'Login failed'
            };
        }
    };

    const updateUser = (userData) => {
        const normalizedUpdate = normalizeUser(userData);
        const updatedUser = { ...user, ...normalizedUpdate };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true };
    };

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        hasRole: (role) => user?.role === role,
        hasAnyRole: (roles) => roles.includes(user?.role),
        isAuthenticated: !!user && !!token
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

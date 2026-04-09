import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

// Inactivity threshold: 1 hour
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;

// Local-storage key to track last activity timestamp across tabs
const LAST_ACTIVITY_KEY = 'lastActivityAt';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    // Use a ref for the timeout so we can clear it without re-running effects
    const inactivityTimerRef = useRef(null);

    // ── Logout ──────────────────────────────────────────────────────────────
    // useCallback so its identity is stable and doesn't cause effect re-runs
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

    // ── Restore session on mount ─────────────────────────────────────────────
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            try {
                // Check if the session went stale while the tab was closed
                const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
                const elapsed = Date.now() - lastActivity;

                if (elapsed >= INACTIVITY_LIMIT_MS) {
                    // User was inactive for more than 1 hour before reopening the tab
                    logout('session_expired');
                } else {
                    const parsedUser = JSON.parse(storedUser);
                    setToken(storedToken);
                    setUser(parsedUser);
                }
            } catch (error) {
                console.error('Failed to restore session:', error);
                logout();
            }
        }
        setLoading(false);

        // ── Cross-tab sync: Logout if token is removed in another tab ──
        const syncLogout = (e) => {
            if (e.key === 'token' && !e.newValue) {
                logout();
            }
        };
        window.addEventListener('storage', syncLogout);
        return () => window.removeEventListener('storage', syncLogout);
    }, [logout]);

    // ── Inactivity timer ────────────────────────────────────────────────────
    useEffect(() => {
        // Only run when logged in
        if (!user) return;

        const stamp = () => localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));

        const scheduleLogout = () => {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            stamp();
            inactivityTimerRef.current = setTimeout(() => {
                console.warn('[AuthContext] Logging out due to 1 hour of inactivity.');
                logout('session_expired');
            }, INACTIVITY_LIMIT_MS);
        };

        // Activity events — use passive listeners for performance
        const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'keypress', 'scroll', 'touchstart', 'click'];

        ACTIVITY_EVENTS.forEach(evt =>
            window.addEventListener(evt, scheduleLogout, { passive: true })
        );

        // Start the first countdown
        scheduleLogout();

        return () => {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            ACTIVITY_EVENTS.forEach(evt =>
                window.removeEventListener(evt, scheduleLogout)
            );
        };
        // NOTE: `logout` is stable (useCallback), so this only runs when `user` changes
    }, [user, logout]);

    // ── Login ────────────────────────────────────────────────────────────────
    const login = async (email, password, role) => {
        try {
            const response = await apiClient.post('/auth/login', { email, password, role });
            const { user: userData, token: userToken } = response.data;

            localStorage.setItem('token', userToken);
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));

            setToken(userToken);
            setUser(userData);

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Login failed. Please check your credentials.'
            };
        }
    };

    const updateUser = (userData) => {
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true };
    };

    const hasRole = (role) => user?.role === role;

    const hasAnyRole = (roles) => roles.includes(user?.role);

    const value = {
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        hasRole,
        hasAnyRole,
        isAuthenticated: !!user && !!token
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

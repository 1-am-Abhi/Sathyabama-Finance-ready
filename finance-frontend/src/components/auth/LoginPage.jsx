import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants/roles';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import './LoginPage.css';

const LoginPage = () => {
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState(ROLES.ADMIN);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login } = useAuth();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('reason') === 'session_expired') {
            setError('Session expired due to inactivity. Please login again.');
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(email, password, selectedRole);
            
            if (result.success) {
                // Get the user from local storage or context (AuthContext already sets it)
                const storedUser = JSON.parse(localStorage.getItem('user'));
                const role = storedUser.role;

                const dashboardPaths = {
                    [ROLES.ADMIN]: '/admin/dashboard',
                    [ROLES.FACULTY]: '/faculty/dashboard',
                    [ROLES.FINANCE_OFFICER]: '/finance/dashboard'
                };

                // Use window.location.href for a full refresh to ensure all contexts are clean
                window.location.href = dashboardPaths[role] || '/login';
            } else {
                setError(result.error || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            console.error('Login submission error:', err);
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Left Panel - Header + Login Form */}
            <div className="login-left-panel">
                <div className="left-panel-content">
                    <div className="header-section">
                        <img
                            src="/sathyabama_header.png"
                            alt="Sathyabama Institute of Science and Technology"
                            className="header-image"
                        />
                    </div>

                    <div className="login-form-container">
                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <select
                                    id="role"
                                    value={selectedRole}
                                    onChange={(e) => {
                                        setSelectedRole(e.target.value);
                                        setEmail('');
                                        setPassword('');
                                        setError('');
                                    }}
                                    className="form-select"
                                >
                                    <option value={ROLES.ADMIN}>Admin</option>
                                    <option value={ROLES.FACULTY}>Faculty</option>
                                    <option value={ROLES.FINANCE_OFFICER}>Finance Officer</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="email" className="form-label">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password" className="form-label">Password</label>
                                <div className="password-input-container">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="form-input password-input"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="error-message">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="login-button"
                                disabled={loading}
                            >
                                {loading ? 'LOGGING IN...' : 'LOGIN'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Right Panel - Welcome Message */}
            <div className="login-right-panel hidden md:flex">
                <div className="title-container">
                    <h2 className="system-title">Welcome to Sathyabama Research Management System</h2>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

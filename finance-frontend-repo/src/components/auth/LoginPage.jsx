import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants/roles';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Building2, Lock, Mail } from 'lucide-react';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState(ROLES.ADMIN);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const mockUser = {
                id: 1,
                name: selectedRole === ROLES.ADMIN ? 'Dr. Bharti' :
                    selectedRole === ROLES.FACULTY ? 'Dr. Priya Sharma' : 'Mr. Arun Patel',
                email: email,
                role: selectedRole
            };

            localStorage.setItem('token', 'mock-jwt-token-' + Date.now());
            localStorage.setItem('user', JSON.stringify(mockUser));

            const dashboardPaths = {
                [ROLES.ADMIN]: '/admin/dashboard',
                [ROLES.FACULTY]: '/faculty/dashboard',
                [ROLES.FINANCE_OFFICER]: '/finance/dashboard'
            };

            window.location.href = dashboardPaths[selectedRole];
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-4">
            <div className="absolute inset-0 bg-black opacity-20"></div>
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>

            <Card className="w-full max-w-md relative z-10 shadow-2xl border-0">
                <CardHeader className="space-y-3 pb-6">
                    <div className="flex justify-center mb-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Building2 className="w-9 h-9 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Sathyabama Research Hub
                    </CardTitle>
                    <CardDescription className="text-center text-base">
                        Research & Finance Management Portal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-sm font-semibold">Login As</Label>
                            <select
                                id="role"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value={ROLES.ADMIN}>🎓 Admin (Dean / Research Head)</option>
                                <option value={ROLES.FACULTY}>👨‍🏫 Faculty</option>
                                <option value={ROLES.FINANCE_OFFICER}>💼 Finance Officer</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-11 h-11 shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-11 h-11 shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login to Portal'}
                        </Button>
                    </form>

                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg">
                        <p className="font-semibold text-sm text-gray-800 mb-2">🎯 Demo Access</p>
                        <p className="text-xs text-gray-600">Select a role and use any email/password to login and explore the portal</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LoginPage;

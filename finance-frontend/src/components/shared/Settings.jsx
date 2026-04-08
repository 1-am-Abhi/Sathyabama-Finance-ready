import React, { useState, useEffect, useRef } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants/roles';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { User, Bell, Shield, Server, Upload } from 'lucide-react';
import apiClient from '../../api/client';
import useToast from '../../hooks/useToast';

const Settings = () => {
    const { setLayout } = useLayout();
    const { user, updateUser } = useAuth();
    const { showToast, ToastPortal } = useToast();
    const [profilePhoto, setProfilePhoto] = useState(null);

    // Initialize with user data or defaults
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [department, setDepartment] = useState(user?.department || '');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        setLayout("Settings", "Manage your account and preferences");
        const storedPhoto = localStorage.getItem('profile_photo');
        if (storedPhoto) setProfilePhoto(storedPhoto);
    }, [setLayout]);

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePhoto(reader.result);
                localStorage.setItem('profile_photo', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };



    const handleProfileUpdate = () => {
        try {
            updateUser({ name, email, phone, department });
            showToast('Profile updated successfully!');
        } catch (error) {
            console.error(error);
            showToast('Failed to update profile.', 'error');
        }
    };

    const handlePasswordUpdate = async () => {
        if (!currentPassword || !newPassword) {
            showToast('Please fill in all password fields.', 'warning');
            return;
        }

        try {
            const response = await apiClient.put('/auth/update-password', { currentPassword, newPassword });
            if (response.data.success) {
                showToast('Password updated successfully!');
                setCurrentPassword('');
                setNewPassword('');
            }
        } catch (error) {
            console.error("Error updating password:", error);
            showToast(error.response?.data?.message || 'Failed to update password', 'error');
        }
    };

    return (
        <div className="p-6 max-w-6xl">
            <ToastPortal />
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="flex flex-wrap justify-center md:grid w-full md:grid-cols-4 mb-8 h-auto gap-2">
                    <TabsTrigger value="profile" className="flex-1 flex items-center justify-center gap-2"><User className="w-4 h-4" /> Profile</TabsTrigger>
                    <TabsTrigger value="notifications" className="flex-1 flex items-center justify-center gap-2"><Bell className="w-4 h-4" /> Notifications</TabsTrigger>
                    <TabsTrigger value="security" className="flex-1 flex items-center justify-center gap-2"><Shield className="w-4 h-4" /> Security</TabsTrigger>
                    <TabsTrigger value="system" className="flex-1 flex items-center justify-center gap-2"><Server className="w-4 h-4" /> System</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>Update your public profile details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg relative group">
                                    {profilePhoto ? (
                                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-12 h-12 text-gray-400" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current.click()}>
                                        <Upload className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                    />
                                    <Button onClick={() => fileInputRef.current.click()} variant="outline" className="flex gap-2">
                                        <Upload className="w-4 h-4" /> Upload New Photo
                                    </Button>
                                    <p className="text-xs text-gray-500 mt-2">JPG, GIF or PNG. Max size 2MB.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Full Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <input
                                        type="email"
                                        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Phone</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Department</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button onClick={handleProfileUpdate}>Save Changes</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Notifications</CardTitle>
                            <CardDescription>Choose what emails you receive.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {user?.role === 'ADMIN' ? (
                                <>
                                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                                        <div>
                                            <p className="font-bold text-white italic">New Fund Requests</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic mt-1">Receive alerts when faculty submit new funding proposals.</p>
                                        </div>
                                        <input type="checkbox" className="w-5 h-5 accent-rose-500 rounded-lg cursor-pointer" defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                                        <div>
                                            <p className="font-bold text-white italic">OD Request Submissions</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic mt-1">Get notified of new On-Duty requests awaiting verification.</p>
                                        </div>
                                        <input type="checkbox" className="w-5 h-5 accent-rose-500 rounded-lg cursor-pointer" defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between py-4">
                                        <div>
                                            <p className="font-bold text-white italic">Critical Budget Alerts</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic mt-1">Receive warnings when project budgets exceed thresholds.</p>
                                        </div>
                                        <input type="checkbox" className="w-5 h-5 accent-rose-500 rounded-lg cursor-pointer" defaultChecked />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                                        <div>
                                            <p className="font-bold text-white italic">OD Status Updates</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic mt-1">Receive alerts when your OD requests are approved or rejected.</p>
                                        </div>
                                        <input type="checkbox" className="w-5 h-5 accent-rose-500 rounded-lg cursor-pointer" defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                                        <div>
                                            <p className="font-bold text-white italic">Grant Approvals</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic mt-1">Get notified immediately when your project grants are sanctioned.</p>
                                        </div>
                                        <input type="checkbox" className="w-5 h-5 accent-rose-500 rounded-lg cursor-pointer" defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between py-4">
                                        <div>
                                            <p className="font-bold text-white italic">AI Analysis Completion</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic mt-1">Receive signals when AI-assisted research metrics are optimized.</p>
                                        </div>
                                        <input type="checkbox" className="w-5 h-5 accent-rose-500 rounded-lg cursor-pointer" defaultChecked />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Password</CardTitle>
                            <CardDescription>Change your password.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Current Password</label>
                                <input
                                    type="password"
                                    className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">New Password</label>
                                <input
                                    type="password"
                                    className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <Button onClick={handlePasswordUpdate}>Update Password</Button>
                        </CardContent>
                    </Card>
                </TabsContent>



                <TabsContent value="system" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">Version: 1.0.0</p>
                            <p className="text-sm">Last Backup: {new Date().toLocaleDateString()}</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Settings;

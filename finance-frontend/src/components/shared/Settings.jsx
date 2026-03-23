import React, { useState, useEffect, useRef } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { User, Bell, Shield, Server, Palette, Upload, Moon, Sun } from 'lucide-react';
import apiClient from '../../api/client';

const Settings = () => {
    const { setLayout } = useLayout();
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [profilePhoto, setProfilePhoto] = useState(null);

    // Initialize with user data or defaults
    const [name, setName] = useState(user?.name || 'Dr. Bharathi');
    const [email, setEmail] = useState(user?.email || 'admin@test.com');
    const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
    const [department, setDepartment] = useState(user?.department || 'Administration');

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
            updateUser({
                name,
                email,
                phone,
                department
            });
            alert("Profile updated successfully!");
            // Optional: Force reload if needed, but Context matches
        } catch (error) {
            console.error(error);
            alert("Failed to update profile.");
        }
    };

    const handlePasswordUpdate = async () => {
        if (!currentPassword || !newPassword) {
            alert("Please fill in all password fields.");
            return;
        }

        try {
            const response = await apiClient.put('/auth/update-password', {
                currentPassword,
                newPassword
            });
            
            if (response.data.success) {
                alert("Password updated successfully!");
                setCurrentPassword('');
                setNewPassword('');
            }
        } catch (error) {
            console.error("Error updating password:", error);
            alert(error.response?.data?.message || "Failed to update password");
        }
    };

    return (
        <div className="p-6 max-w-6xl">
            <Tabs defaultValue="profile" className="w-full" onValueChange={setActiveTab}>
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
                            <div className="flex items-center justify-between py-2 border-b">
                                <div>
                                    <p className="font-medium">Fund Requests</p>
                                    <p className="text-sm text-gray-500">Receive emails when new funds are requested.</p>
                                </div>
                                <input type="checkbox" className="toggle" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between py-2 border-b">
                                <div>
                                    <p className="font-medium">Project Approvals</p>
                                    <p className="text-sm text-gray-500">Receive emails when projects are approved.</p>
                                </div>
                                <input type="checkbox" className="toggle" defaultChecked />
                            </div>
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

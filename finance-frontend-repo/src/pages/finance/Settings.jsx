import React from 'react';
import Sidebar from '../../components/shared/Sidebar';
import TopBar from '../../components/shared/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { User, Bell, Lock, Globe } from 'lucide-react';

const Settings = () => {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />

            <div className="flex-1 ml-64">
                <TopBar
                    title="Settings"
                    subtitle="Manage your account preferences and application settings"
                />

                <div className="p-8 max-w-4xl">
                    <div className="grid gap-6">
                        {/* Profile Settings */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="border-b bg-gray-50/50">
                                <div className="flex items-center space-x-2">
                                    <User className="w-5 h-5 text-blue-600" />
                                    <CardTitle className="text-lg">Profile Information</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input id="name" placeholder="Your name" defaultValue="Finance Officer" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" type="email" placeholder="email@example.com" defaultValue="finance@sathyabama.ac.in" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" type="tel" placeholder="+91..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bio">Designation</Label>
                                        <Input id="bio" defaultValue="Senior Finance Officer" />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <Button>Save Changes</Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Security Settings */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="border-b bg-gray-50/50">
                                <div className="flex items-center space-x-2">
                                    <Lock className="w-5 h-5 text-blue-600" />
                                    <CardTitle className="text-lg">Security & Password</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4 max-w-md">
                                    <div className="space-y-2">
                                        <Label htmlFor="current-password">Current Password</Label>
                                        <Input id="current-password" type="password" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-password">New Password</Label>
                                        <Input id="new-password" type="password" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                                        <Input id="confirm-password" type="password" />
                                    </div>
                                    <Button variant="outline">Update Password</Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notifications */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="border-b bg-gray-50/50">
                                <div className="flex items-center space-x-2">
                                    <Bell className="w-5 h-5 text-blue-600" />
                                    <CardTitle className="text-lg">Notifications</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">Email Notifications</p>
                                            <p className="text-sm text-gray-500">Receive emails about fund requests and updates.</p>
                                        </div>
                                        <div className="h-6 w-11 bg-blue-600 rounded-full cursor-pointer relative">
                                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t pt-4">
                                        <div>
                                            <p className="font-medium text-gray-900">System Alerts</p>
                                            <p className="text-sm text-gray-500">Get notified about system maintenance.</p>
                                        </div>
                                        <div className="h-6 w-11 bg-blue-600 rounded-full cursor-pointer relative">
                                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;

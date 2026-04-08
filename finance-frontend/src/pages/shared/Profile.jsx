import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
    User, Mail, Phone, MapPin, Briefcase, Calendar,
    Building2, Award, BookOpen, Edit2, Save, X, Camera
} from 'lucide-react';
import useToast from '../../hooks/useToast';

const Profile = () => {
    const { user, updateUser } = useAuth();
    const { showToast, ToastPortal } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState(localStorage.getItem(`profile_photo_${user?._id || user?.id}`) || '');

    // Profile data - in real app, this would come from API
    // Profile data from user context
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        department: user?.department || '',
        researchCentre: user?.centre || '',
        designation: user?.designation || '',
        employeeId: user?.employeeId || '',
        joiningDate: user?.joiningDate || '',
        officeLocation: user?.officeLocation || '',
        specialization: user?.specialization || '',
        bio: user?.bio || '',
        scopusId: user?.scopusId || '',
        education: user?.education || [],
        achievements: user?.achievements || []
    });

    const [editData, setEditData] = useState(profileData);

    const handleEdit = () => {
        setIsEditing(true);
        setEditData(profileData);
    };

    const handleSave = async () => {
        try {
            console.log("Saving profile data:", editData);
            const response = await apiClient.put('/profile/update', editData);
            
            if (response.data.success) {
                setProfileData(editData);
                updateUser(response.data.user);
                setIsEditing(false);
                showToast('Profile updated successfully!');
            } else {
                showToast('Failed to save changes. Please try again.', 'error');
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            showToast('Error: ' + (error.response?.data?.message || error.message), 'error');
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditData(profileData);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePhoto(reader.result);
                localStorage.setItem(`profile_photo_${user?._id || user?.id}`, reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSyncScopus = async () => {
        try {
            showToast('Syncing with Scopus Database...', 'info');
            const response = await apiClient.post('/profile/sync-scopus');
            if (response.data.success) {
                showToast(`Scopus metrics synced! Journals: ${response.data.data.journals}, Books: ${response.data.data.books}`);
            }
        } catch (error) {
            console.error("Error syncing Scopus:", error);
            showToast('Sync failed: ' + (error.response?.data?.message || 'Check Scopus API Key'), 'error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8">
            <ToastPortal />
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your personal information</p>
                    </div>
                    {!isEditing ? (
                        <Button onClick={handleEdit} className="bg-maroon-600 hover:bg-maroon-700">
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Profile
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button onClick={handleCancel} variant="outline">
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    )}
                </div>

                {/* Profile Photo Card */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            <div className="relative">
                                <div className="w-32 h-32 bg-maroon-600 rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-maroon-100 dark:border-maroon-900 overflow-hidden shadow-lg">
                                    {profilePhoto ? (
                                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()
                                    )}
                                </div>
                                {isEditing && (
                                    <label className="absolute bottom-0 right-0 bg-maroon-600 hover:bg-maroon-700 text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors z-10">
                                        <Camera className="w-5 h-5" />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profileData.name}</h2>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">{profileData.designation}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{profileData.department}</p>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-maroon-100 text-maroon-800 dark:bg-maroon-900/30 dark:text-maroon-300">
                                        <Building2 className="w-4 h-4 mr-1" />
                                        {profileData.researchCentre}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        ID: {profileData.employeeId}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5 text-maroon-600" />
                                Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="name" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <User className="w-4 h-4" />
                                    Full Name
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="name"
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        className="mt-1"
                                    />
                                ) : (
                                    <p className="mt-1 text-gray-900 dark:text-white font-medium">{profileData.name}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="email" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <Mail className="w-4 h-4" />
                                    Email Address
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="email"
                                        type="email"
                                        value={editData.email}
                                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                        className="mt-1"
                                    />
                                ) : (
                                    <p className="mt-1 text-gray-900 dark:text-white font-medium">{profileData.email}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <Phone className="w-4 h-4" />
                                    Phone Number
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="phone"
                                        value={editData.phone}
                                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                        className="mt-1"
                                    />
                                ) : (
                                    <p className="mt-1 text-gray-900 dark:text-white font-medium">{profileData.phone}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="office" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <MapPin className="w-4 h-4" />
                                    Office Location
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="office"
                                        value={editData.officeLocation}
                                        onChange={(e) => setEditData({ ...editData, officeLocation: e.target.value })}
                                        className="mt-1"
                                    />
                                ) : (
                                    <p className="mt-1 text-gray-900 dark:text-white font-medium">{profileData.officeLocation}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Professional Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-maroon-600" />
                                Professional Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <Briefcase className="w-4 h-4" />
                                    Designation
                                </Label>
                                <p className="mt-1 text-gray-900 dark:text-white font-medium">{profileData.designation}</p>
                            </div>

                            <div>
                                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <Building2 className="w-4 h-4" />
                                    Department
                                </Label>
                                <p className="mt-1 text-gray-900 dark:text-white font-medium">{profileData.department}</p>
                            </div>

                            <div>
                                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <Calendar className="w-4 h-4" />
                                    Joining Date
                                </Label>
                                <p className="mt-1 text-gray-900 dark:text-white font-medium">{profileData.joiningDate}</p>
                            </div>

                            <div>
                                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <BookOpen className="w-4 h-4" />
                                    Specialization
                                </Label>
                                {isEditing ? (
                                    <Input
                                        value={editData.specialization}
                                        onChange={(e) => setEditData({ ...editData, specialization: e.target.value })}
                                        className="mt-1"
                                    />
                                ) : (
                                    <p className="mt-1 text-gray-900 dark:text-white font-medium">{profileData.specialization}</p>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <Award className="w-4 h-4 text-orange-500" />
                                    Scopus Author ID
                                </Label>
                                {isEditing ? (
                                    <Input
                                        value={editData.scopusId}
                                        onChange={(e) => setEditData({ ...editData, scopusId: e.target.value })}
                                        className="mt-1 font-mono text-sm"
                                        placeholder="e.g. 5719xxxxx"
                                    />
                                ) : (
                                    <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                                        <p className="text-gray-900 dark:text-white font-medium font-mono">
                                            {profileData.scopusId || 'Not configured'}
                                        </p>
                                        <Button 
                                            size="sm" 
                                            onClick={handleSyncScopus} 
                                            disabled={!profileData.scopusId}
                                            className="bg-orange-500 hover:bg-orange-600 text-white ml-auto"
                                        >
                                            Sync Scopus Insights
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bio */}
                <Card>
                    <CardHeader>
                        <CardTitle>About</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isEditing ? (
                            <Textarea
                                value={editData.bio}
                                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                                rows={4}
                                className="w-full"
                            />
                        ) : (
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{profileData.bio}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Education */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-maroon-600" />
                            Education
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {profileData.education && profileData.education.length > 0 ? (
                                profileData.education.map((edu, index) => (
                                    <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-200 dark:border-slate-800 last:border-0 last:pb-0">
                                        <div className="w-12 h-12 bg-maroon-100 dark:bg-maroon-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Award className="w-6 h-6 text-maroon-600 dark:text-maroon-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{edu.degree || (typeof edu === 'string' ? edu : 'Record')}</h4>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{edu.institution || (typeof edu === 'object' ? 'Institutional Record' : '—')}</p>
                                            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">{edu.year || '—'}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[10px] font-black uppercase text-slate-500 italic">No education records found</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Achievements */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-maroon-600" />
                            Achievements & Awards
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {profileData.achievements && profileData.achievements.length > 0 ? (
                                profileData.achievements.map((achievement, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-maroon-600 rounded-full mt-2 flex-shrink-0"></div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm italic">{achievement.title || achievement}</p>
                                            {achievement.year && <p className="text-[10px] font-black uppercase text-slate-500 italic">{achievement.year}</p>}
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="text-[10px] font-black uppercase text-slate-500 italic">No achievements recorded</li>
                            )}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Profile;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { 
    User, BookOpen, Award, CheckCircle, ArrowRight, Camera, 
    Briefcase, Building2, Calendar, MapPin, Phone, GraduationCap 
} from 'lucide-react';
import apiClient from '../../api/client';
import useToast from '../../hooks/useToast';

const ProfileSetup = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [photo, setPhoto] = useState(null);

    const [formData, setFormData] = useState({
        designation: user?.designation || '',
        employeeId: user?.employeeId || '',
        joiningDate: user?.joiningDate || '',
        phone: user?.phone || '',
        officeLocation: user?.officeLocation || '',
        specialization: user?.specialization || '',
        bio: user?.bio || '',
        education: user?.education && user.education.length > 0 ? user.education : [
            { degree: '', institution: '', year: '' }
        ],
        achievements: user?.achievements && user.achievements.length > 0 ? user.achievements : ['']
    });

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPhoto(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const addEducation = () => {
        setFormData({
            ...formData,
            education: [...formData.education, { degree: '', institution: '', year: '' }]
        });
    };

    const addAchievement = () => {
        setFormData({
            ...formData,
            achievements: [...formData.achievements, '']
        });
    };

    const handleEducationChange = (index, field, value) => {
        const newEdu = [...formData.education];
        newEdu[index][field] = value;
        setFormData({ ...formData, education: newEdu });
    };

    const handleAchievementChange = (index, value) => {
        const newAch = [...formData.achievements];
        newAch[index] = value;
        setFormData({ ...formData, achievements: newAch });
    };

    const handleSubmit = async (shouldNavigate = true) => {
        setIsLoading(true);
        try {
            const response = await apiClient.put('/profile/update', {
                ...formData,
                photo: photo,
                isProfileCompleted: shouldNavigate
            });

            if (response.data.success) {
                updateUser(response.data.user);
                if (shouldNavigate) {
                    navigate('/faculty/dashboard');
                }
            }
        } catch (error) {
            console.error('Profile setup error:', error);
            if (shouldNavigate) {
                showToast('Failed to save profile. Please try again.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full space-y-8">
                <div className="text-center">
                    <div className="bg-maroon-900/40 p-6 rounded-[2rem] border border-white/5 inline-block mb-6">
                        <img src="/sathyabama_header.png" alt="Sathyabama" className="h-12 mx-auto" />
                    </div>
                    <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Welcome, {user?.name}</h1>
                    <p className="text-slate-400 font-bold italic uppercase text-xs tracking-widest mt-2">Let's set up your professional profile</p>
                </div>

                <div className="flex justify-between mb-8 px-4">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black italic transition-all ${step >= s ? 'bg-maroon-600 text-white shadow-lg shadow-maroon-600/30' : 'bg-slate-800 text-slate-500'}`}>
                                {s}
                            </div>
                            <div className={`h-1 w-12 rounded-full hidden sm:block ${step > s ? 'bg-maroon-600' : 'bg-slate-800'}`}></div>
                        </div>
                    ))}
                </div>

                <Card className="bg-slate-900 border-white/5 shadow-2xl rounded-[2rem] overflow-hidden">
                    <CardContent className="p-10">
                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center mb-8">
                                    <div className="relative group">
                                        <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 text-4xl border-2 border-dashed border-white/10 overflow-hidden">
                                            {photo ? (
                                                <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-12 h-12" />
                                            )}
                                        </div>
                                        <label className="absolute bottom-0 right-0 bg-maroon-600 hover:bg-maroon-700 text-white p-2.5 rounded-full cursor-pointer shadow-xl transition-all hover:scale-110">
                                            <Camera className="w-5 h-5" />
                                            <input type="file" onChange={handlePhotoChange} className="hidden" accept="image/*" />
                                        </label>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Professional Photo</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Designation</Label>
                                        <Input 
                                            value={formData.designation}
                                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                            placeholder="e.g. Associate Professor" 
                                            className="bg-slate-800 border-white/5 text-white italic placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Employee ID</Label>
                                        <Input 
                                            value={formData.employeeId}
                                            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                            placeholder="e.g. SIST-CSE-2024" 
                                            className="bg-slate-800 border-white/5 text-white italic placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Joining Date</Label>
                                        <Input 
                                            type="date"
                                            value={formData.joiningDate}
                                            onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                                            className="bg-slate-800 border-white/5 text-white italic placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Office Location</Label>
                                        <Input 
                                            value={formData.officeLocation}
                                            onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                                            placeholder="e.g. Block 2, Room 304" 
                                            className="bg-slate-800 border-white/5 text-white italic placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-maroon-500 italic">Academic Background</Label>
                                        <Button onClick={addEducation} variant="ghost" size="sm" className="text-[10px] font-black uppercase text-slate-400 hover:text-white">
                                            + Add Entry
                                        </Button>
                                    </div>
                                    {formData.education.map((edu, idx) => (
                                        <div key={idx} className="p-6 bg-slate-800/50 rounded-2xl border border-white/5 space-y-4">
                                            <Input 
                                                placeholder="Degree (e.g. Ph.D. in CS)"
                                                value={edu.degree}
                                                onChange={(e) => handleEducationChange(idx, 'degree', e.target.value)}
                                                className="bg-slate-800 border-white/5 text-white italic"
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input 
                                                    placeholder="Institution"
                                                    value={edu.institution}
                                                    onChange={(e) => handleEducationChange(idx, 'institution', e.target.value)}
                                                    className="bg-slate-800 border-white/5 text-white italic"
                                                />
                                                <Input 
                                                    placeholder="Year"
                                                    value={edu.year}
                                                    onChange={(e) => handleEducationChange(idx, 'year', e.target.value)}
                                                    className="bg-slate-800 border-white/5 text-white italic"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Professional Bio</Label>
                                    <Textarea 
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        placeholder="Briefly describe your research focus and experience..."
                                        className="bg-slate-800 border-white/5 text-white italic min-h-[120px]"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-maroon-500 italic">Major Achievements</Label>
                                        <Button onClick={addAchievement} variant="ghost" size="sm" className="text-[10px] font-black uppercase text-slate-400 hover:text-white">
                                            + Add Item
                                        </Button>
                                    </div>
                                    {formData.achievements.map((ach, idx) => (
                                        <Input 
                                            key={idx}
                                            value={ach}
                                            onChange={(e) => handleAchievementChange(idx, e.target.value)}
                                            placeholder="e.g. Best Paper Award 2023"
                                            className="bg-slate-800 border-white/5 text-white italic"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-10 flex gap-4">
                            {step > 1 && (
                                <Button 
                                    onClick={() => setStep(step - 1)}
                                    variant="outline"
                                    className="flex-1 h-14 rounded-xl border-white/10 text-white font-black italic uppercase tracking-widest text-xs"
                                >
                                    Previous
                                </Button>
                            )}
                            <Button 
                                onClick={async () => {
                                    if (step < 3) {
                                        // Save incremental progress
                                        await handleSubmit(false);
                                        setStep(step + 1);
                                    } else {
                                        // Final save and navigate
                                        await handleSubmit(true);
                                    }
                                }}
                                disabled={isLoading}
                                className="flex-1 h-14 bg-maroon-600 hover:bg-maroon-700 text-white rounded-xl font-black italic uppercase tracking-widest text-xs shadow-xl shadow-maroon-600/20"
                            >
                                {isLoading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {step === 3 ? 'Complete Setup' : 'Next Step'} <ArrowRight className="w-4 h-4" />
                                    </div>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center text-slate-600 font-bold italic uppercase text-[9px] tracking-widest">
                    Your data will be visible to institutional heads for collaborative research tracking.
                </p>
            </div>
        </div>
    );
};

export default ProfileSetup;

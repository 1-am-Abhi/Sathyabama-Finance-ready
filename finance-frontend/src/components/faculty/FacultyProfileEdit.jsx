import React, { useState, useEffect } from 'react';
import { X, Camera, User, Phone, Briefcase, GraduationCap, Building, BookOpen, Clock, FileText, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const FacultyProfileEdit = ({ isOpen, onClose, onSave, facultyData }) => {
    const [formData, setFormData] = useState({
        name: '',
        designation: '',
        department: '',
        qualification: '',
        experience: '',
        specialization: '',
        email: '',
        phone: '',
        biography: '',
        profilePhoto: null
    });

    useEffect(() => {
        if (facultyData && isOpen) {
            setFormData({
                name: facultyData.name || '',
                designation: facultyData.designation || '',
                department: facultyData.department || '',
                qualification: facultyData.qualification || '',
                experience: facultyData.experience || '',
                specialization: facultyData.specialization || '',
                email: facultyData.email || '',
                phone: facultyData.phone || '',
                biography: facultyData.biography || '',
                profilePhoto: facultyData.profilePhoto || null
            });
        }
    }, [facultyData, isOpen]);

    if (!isOpen) return null;

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profilePhoto: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scaleIn border border-white/20">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-indigo-900 p-8 md:p-10 text-white relative">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <User className="w-48 h-48" />
                    </div>
                    <div className="flex justify-between items-center relative z-10">
                        <div>
                            <Badge className="bg-white/20 text-white border-0 font-black text-[10px] px-3 py-1 uppercase tracking-widest mb-4">
                                Identity Management
                            </Badge>
                            <h3 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase leading-none">Modify Professional Profile</h3>
                            <p className="text-blue-100/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-3 flex items-center gap-2 italic">
                                <Building className="w-3 h-3" /> Sathyabama Institutional Registry Hub
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all group"
                        >
                            <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 custom-scrollbar">
                    <div className="flex flex-col md:flex-row gap-12 items-start">
                        {/* Photo Section */}
                        <div className="relative group shrink-0 mx-auto md:mx-0">
                            <div className="w-40 h-40 md:w-52 md:h-52 rounded-[3.5rem] bg-gray-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center relative group-hover:scale-105 transition-transform duration-500">
                                {formData.profilePhoto ? (
                                    <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-20 h-20 text-gray-200" />
                                )}
                                <label className="absolute inset-0 bg-blue-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                    <div className="text-center text-white p-4">
                                        <Camera className="w-8 h-8 mx-auto mb-2" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Update Photo</span>
                                    </div>
                                </label>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-4 rounded-[1.5rem] shadow-xl border-4 border-white">
                                <Camera className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="flex-1 w-full space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2 italic">
                                        <User className="w-3 h-3" /> Full Identity Name *
                                    </label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="Dr. Name Here"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2 italic">
                                        <Briefcase className="w-3 h-3" /> Designation Role *
                                    </label>
                                    <input
                                        required
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                        className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="e.g. Professor & Head"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2 italic">
                                        <Building className="w-3 h-3" /> Institutional Department *
                                    </label>
                                    <input
                                        required
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="e.g. Centre for Research"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2 italic">
                                        <GraduationCap className="w-3 h-3" /> Academic Qualification *
                                    </label>
                                    <input
                                        required
                                        value={formData.qualification}
                                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                                        className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                                        placeholder="e.g. Ph.D in AI & Robotics"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2 italic">
                                <Clock className="w-3 h-3 text-indigo-500" /> Teaching/Research Experience
                            </label>
                            <input
                                value={formData.experience}
                                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                                className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                                placeholder="e.g. 15 Years 4 Months"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2 italic">
                                <Phone className="w-3 h-3 text-rose-500" /> Digital Contact Phone
                            </label>
                            <input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                                placeholder="+91 XXXXX XXXXX"
                            />
                        </div>
                    </div>

                    <div className="space-y-8 pt-4 border-t border-gray-100">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2 italic">
                                <BookOpen className="w-3 h-3 text-emerald-500" /> Research Specialization / Area of Expertise
                            </label>
                            <input
                                value={formData.specialization}
                                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                className="w-full bg-gray-50 border-0 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                                placeholder="e.g. Artificial Intelligence, Machine Learning, Computer Vision"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2 italic">
                                <FileText className="w-3 h-3 text-indigo-500" /> Professional Biography / About
                            </label>
                            <textarea
                                value={formData.biography}
                                onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                                rows="4"
                                className="w-full bg-gray-50 border-0 rounded-[2rem] px-8 py-6 font-bold text-gray-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300 leading-relaxed italic"
                                placeholder="Write a brief professional overview..."
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-6 pt-10 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="h-16 px-10 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
                        >
                            Discard Changes
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 h-16 bg-indigo-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 group"
                        >
                            Verify & Save Profile <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FacultyProfileEdit;

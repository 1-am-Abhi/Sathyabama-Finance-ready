import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { User, Building, Mail, Award, Calendar, MapPin, Globe, BookOpen, Edit2, Phone, Clock } from 'lucide-react';

const FacultyDetailsSection = ({ facultyData, onEdit }) => {
    return (
        <Card className="border-0 shadow-xl shadow-blue-100/50 bg-white rounded-[2.5rem] overflow-hidden mb-8 group">
            <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-indigo-900 p-8 md:p-10 text-white relative">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <User className="w-32 h-32" />
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] bg-white/10 backdrop-blur-md border border-white/20 p-1 shrink-0 overflow-hidden shadow-2xl">
                            {facultyData.profilePhoto ? (
                                <img src={facultyData.profilePhoto} alt="Profile" className="w-full h-full object-cover rounded-[2rem]" />
                            ) : (
                                <div className="w-full h-full rounded-[2rem] bg-indigo-500/30 flex items-center justify-center">
                                    <User className="w-12 h-12 text-white" />
                                </div>
                            )}
                        </div>
                        <div>
                            <Badge className="bg-white/20 text-white border-0 font-black text-[10px] px-3 py-1 uppercase tracking-widest mb-4">
                                Identity Verified
                            </Badge>
                            <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none mb-2">{facultyData.name}</h2>
                            <p className="text-blue-100/80 font-bold uppercase tracking-[0.2em] text-[10px] italic flex items-center gap-2">
                                <Building className="w-3 h-3" /> {facultyData.designation} | {facultyData.department}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={onEdit}
                        className="h-14 px-8 bg-white hover:bg-blue-50 text-indigo-900 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-900/40 flex items-center gap-3 transition-all group/btn"
                    >
                        Modify Profile <Edit2 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    </Button>
                </div>
            </div>

            <CardContent className="p-8 md:p-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    <div className="space-y-4 group/item">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover/item:scale-110 transition-transform">
                                <Award className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Qualification</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 leading-relaxed uppercase italic tracking-tight">{facultyData.qualification}</p>
                    </div>

                    <div className="space-y-4 group/item">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover/item:scale-110 transition-transform">
                                <Clock className="w-5 h-5 text-indigo-600" />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Tenure @ Institute</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 leading-relaxed uppercase italic tracking-tight">{facultyData.experience}</p>
                    </div>

                    <div className="space-y-4 group/item">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover/item:scale-110 transition-transform">
                                <BookOpen className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Core Specialization</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 leading-relaxed uppercase italic tracking-tight line-clamp-2">{facultyData.specialization}</p>
                    </div>

                    <div className="space-y-4 group/item">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center group-hover/item:scale-110 transition-transform">
                                <Mail className="w-5 h-5 text-rose-600" />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Digital Access</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-900 tracking-tight lowercase">{facultyData.email}</p>
                            <p className="text-[10px] font-bold text-gray-400 italic flex items-center gap-2">
                                <Phone className="w-3 h-3" /> {facultyData.phone || 'Not Provided'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default FacultyDetailsSection;

import React, { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useLayout } from '../../contexts/LayoutContext';
import {
    Award, TrendingUp, BookOpen,
    ArrowUpRight, Target, Zap
} from 'lucide-react';
import FacultyDetailsSection from '../../components/faculty/FacultyDetailsSection';
import ResearchProjectsGraphs from '../../components/faculty/ResearchProjectsGraphs';
import PublicationsGraphs from '../../components/faculty/PublicationsGraphs';
import ConsultancyGraphs from '../../components/faculty/ConsultancyGraphs';
import FacultyProfileEdit from '../../components/faculty/FacultyProfileEdit';

const FacultyDashboard = () => {
    const { setLayout } = useLayout();

    React.useEffect(() => {
        setLayout("Faculty Dashboard", "Institutional research impact & grant performance monitoring");
    }, [setLayout]);

    // Faculty Data State
    const [facultyData, setFacultyData] = useState({
        name: 'Dr. Aishwarya',
        designation: 'Professor & Head',
        department: 'Centre for Research - Sathyabama',
        qualification: 'Ph.D in AI & Robotics',
        experience: '9 Years 8 Months',
        specialization: 'Artificial Intelligence, Machine Learning, Computer Vision',
        email: 'aishwarya.research@sathyabama.ac.in',
        phone: '+91 98765 43210',
        biography: 'Specialized in deep learning and robotics with over 9 years of research experience.',
        profilePhoto: null,
        office: 'Research Block, Level 4, Room 402'
    });

    const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

    const handleProfileUpdate = (newData) => {
        setFacultyData(prev => ({ ...prev, ...newData }));
        setIsProfileEditOpen(false);
    };

    // Research Impact Metrics
    const metrics = [
        {
            title: 'Scopus Citations',
            value: '1,284',
            trend: '+12%',
            icon: Award,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            subtitle: 'Total citations indexed in Scopus'
        },
        {
            title: 'h-Index (Overall)',
            value: '22',
            trend: '+2',
            icon: Target,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            subtitle: 'Author productivity & impact metric'
        },
        {
            title: 'Impact Factor',
            value: '4.85',
            trend: 'Peak',
            icon: Zap,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            subtitle: 'Highest impact journal achieved'
        }
    ];

    return (
        <div className="min-h-full">
            <div className="p-8 max-w-7xl mx-auto">
                {/* 1. Profile Section */}
                <FacultyDetailsSection
                    facultyData={facultyData}
                    onEdit={() => setIsProfileEditOpen(true)}
                />

                {/* 2. Research Impact Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 italic">
                    {metrics.map((metric, index) => {
                        const Icon = metric.icon;
                        return (
                            <Card key={index} className="border-0 shadow-xl shadow-gray-200/40 bg-white rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-transform">
                                <CardContent className="p-8">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{metric.title}</p>
                                                <Badge className={`${metric.bg} ${metric.color} border-0 text-[8px] font-black px-2 py-0.5`}>
                                                    <ArrowUpRight className="w-2.5 h-2.5 mr-1" /> {metric.trend}
                                                </Badge>
                                            </div>
                                            <h3 className={`text-4xl font-black italic tracking-tighter ${metric.color}`}>
                                                {metric.value}
                                            </h3>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{metric.subtitle}</p>
                                        </div>
                                        <div className={`w-14 h-14 ${metric.bg} ${metric.color} rounded-2xl flex items-center justify-center transition-all group-hover:rotate-12`}>
                                            <Icon className="w-7 h-7" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* 3. Analytics Graphs Section */}
                <div className="space-y-10">
                    <ResearchProjectsGraphs />

                    <div className="grid grid-cols-1 gap-10">
                        <PublicationsGraphs />
                        <ConsultancyGraphs />
                    </div>
                </div>

                {/* Footer Insight */}
                <div className="mt-12 text-center pb-12">
                    <div className="inline-flex items-center gap-4 px-8 py-3 bg-gray-900 text-white rounded-full shadow-2xl animate-bounce-slow italic">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Performance Benchmark: EXCELLENCE (A+)</span>
                    </div>
                </div>
            </div>

            {/* Profile Edit Modal */}
            <FacultyProfileEdit
                isOpen={isProfileEditOpen}
                onClose={() => setIsProfileEditOpen(false)}
                onSave={handleProfileUpdate}
                facultyData={facultyData}
            />
        </div>
    );
};

export default FacultyDashboard;

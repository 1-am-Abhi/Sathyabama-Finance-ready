import React, { useEffect, useState } from 'react';
import { BookOpen, GraduationCap, Users, PenTool, Globe, Award, FileText, ChevronDown } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const AcademicSupportDashboard = () => {
    const { user } = useAuth();
    const [academicData, setAcademicData] = useState(null);
    const [selectedYear, setSelectedYear] = useState('2024-25');
    
    // Using demo data structure matching seedData.js
    const years = ['2024-25', '2023-24', '2022-23'];

    useEffect(() => {
        const storedData = JSON.parse(localStorage.getItem('academicSupportData') || '{}');
        // Retrieve data for specific user and year based on seedData format ("1_2024-25")
        // For demo, if user.id is '1':
        const userId = user?.id || '1';
        const key = `${userId}_${selectedYear}`;
        
        if (storedData[key]) {
            setAcademicData(storedData[key]);
        } else {
            // Null state if no data
            setAcademicData(null);
        }
    }, [selectedYear, user]);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Academic Support & Contributions</h1>
                    <p className="text-gray-500 mt-1">Overview of your teaching, mentoring, and academic activities</p>
                </div>
                
                <div className="relative">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 rounded-lg py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer font-medium text-gray-700 shadow-sm"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>Academic Year {year}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
            </div>

            {!academicData ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <FileText className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Academic Data Found</h3>
                    <p className="text-gray-500 max-w-md">There are no academic support records available for the selected year ({selectedYear}). Please select a different year or update your profile.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Section A: Statistical Data */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Teaching & Mentoring Metrics</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard 
                                icon={<BookOpen className="w-5 h-5 text-blue-600" />} 
                                title="Theory Subjects" 
                                value={academicData.sectionA.theorySubjects} 
                                bg="bg-blue-50" 
                            />
                            <MetricCard 
                                icon={<PenTool className="w-5 h-5 text-indigo-600" />} 
                                title="Practical Subjects" 
                                value={academicData.sectionA.practicalSubjects} 
                                bg="bg-indigo-50" 
                            />
                            <MetricCard 
                                icon={<Users className="w-5 h-5 text-green-600" />} 
                                title="UG Projects Mentored" 
                                value={academicData.sectionA.ugProjects} 
                                bg="bg-green-50" 
                            />
                            <MetricCard 
                                icon={<GraduationCap className="w-5 h-5 text-amber-600" />} 
                                title="PG Projects Mentored" 
                                value={academicData.sectionA.pgProjects} 
                                bg="bg-amber-50" 
                            />
                            <MetricCard 
                                icon={<Users className="w-5 h-5 text-purple-600" />} 
                                title="Internships Guided" 
                                value={academicData.sectionA.internships} 
                                bg="bg-purple-50" 
                            />
                            <MetricCard 
                                icon={<GraduationCap className="w-5 h-5 text-rose-600" />} 
                                title="PhD Scholars (Ongoing)" 
                                value={academicData.sectionA.phdOngoing} 
                                bg="bg-rose-50" 
                            />
                            <MetricCard 
                                icon={<Award className="w-5 h-5 text-emerald-600" />} 
                                title="PhD Scholars (Completed)" 
                                value={academicData.sectionA.phdCompleted} 
                                bg="bg-emerald-50" 
                            />
                            <MetricCard 
                                icon={<FileText className="w-5 h-5 text-cyan-600" />} 
                                title="Exam Duties" 
                                value={academicData.sectionA.examDuty} 
                                bg="bg-cyan-50" 
                            />
                        </div>
                    </div>

                    {/* Section B: Qualitative Data */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Other Contributions & Achievements</h2>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="divide-y divide-gray-100">
                                <DetailRow 
                                    title="International Visits" 
                                    icon={<Globe className="w-5 h-5 text-blue-500" />}
                                    content={academicData.sectionB.internationalVisit} 
                                />
                                <DetailRow 
                                    title="Fellowships & Awards" 
                                    icon={<Award className="w-5 h-5 text-amber-500" />}
                                    content={academicData.sectionB.fellowship} 
                                />
                                <DetailRow 
                                    title="Coordinator Roles" 
                                    icon={<Users className="w-5 h-5 text-indigo-500" />}
                                    content={academicData.sectionB.coordinators} 
                                />
                                <DetailRow 
                                    title="Year Coordinator" 
                                    icon={<GraduationCap className="w-5 h-5 text-emerald-500" />}
                                    content={academicData.sectionB.yearCoordinator} 
                                />
                                <DetailRow 
                                    title="Grants & Reviewer Roles" 
                                    icon={<FileText className="w-5 h-5 text-rose-500" />}
                                    content={academicData.sectionB.grants} 
                                />
                                <DetailRow 
                                    title="Other Contributions" 
                                    icon={<PenTool className="w-5 h-5 text-purple-500" />}
                                    content={academicData.sectionB.anyContribution} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MetricCard = ({ icon, title, value, bg }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-start space-x-4">
        <div className={`p-3 rounded-lg ${bg}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

const DetailRow = ({ title, icon, content }) => {
    if (!content) return null;
    return (
        <div className="p-6 flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3 sm:w-1/4 sm:shrink-0">
                <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                    {icon}
                </div>
                <h3 className="font-medium text-gray-900">{title}</h3>
            </div>
            <div className="text-gray-600 sm:w-3/4">
                <p className="leading-relaxed">{content}</p>
            </div>
        </div>
    );
};

export default AcademicSupportDashboard;

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
    FileText, Layers, Clock,
    Plus, Edit2, Building, Search,
    Book, BookOpen, Lightbulb, Award,
    Presentation, FolderOpen, CheckCircle,
    Briefcase, Filter
} from 'lucide-react';
import TopBar from '../../components/shared/TopBar';
import AcademicWorkModal from '../../components/faculty/NewProjectModal';

const FacultyProjects = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedWork, setSelectedWork] = useState(null);
    const [selectedYear, setSelectedYear] = useState('All');

    const [projects, setProjects] = useState(() => {
        const storedProjects = localStorage.getItem('facultyProjects');
        return storedProjects ? JSON.parse(storedProjects) : [];
    });

    // Save to localStorage whenever projects change
    useEffect(() => {
        localStorage.setItem('facultyProjects', JSON.stringify(projects));
    }, [projects]);

    // Helper: Extract Year from Work
    const getYear = (work) => {
        if (work.year) return Number(work.year);
        if (work.startDate) return new Date(work.startDate).getFullYear();
        return null;
    };

    // Derived Data: Available Years
    const availableYears = useMemo(() => {
        const years = projects.map(getYear).filter(y => y !== null);
        return [...new Set(years)].sort((a, b) => b - a);
    }, [projects]);

    // Derived Data: Filtered Projects
    const filteredProjects = useMemo(() => {
        if (selectedYear === 'All') return projects;
        return projects.filter(p => getYear(p) === Number(selectedYear));
    }, [projects, selectedYear]);

    // Derived Data: Statistics
    const stats = useMemo(() => {
        const data = filteredProjects; // Calculate stats based on FILTERED data (Year-wise)

        const counts = {
            total: data.length,
            books: 0,
            journals: 0,
            projects: 0,
            papers: 0,
            patents: 0,
            projectOngoing: 0,
            projectCompleted: 0
        };

        data.forEach(item => {
            const type = item.type?.toUpperCase();
            if (type === 'BOOK') counts.books++;
            else if (type === 'JOURNAL' || type === 'PUBLICATION') counts.journals++;
            else if (type === 'PROJECT') {
                counts.projects++;
                if (item.status === 'ONGOING') counts.projectOngoing++;
                if (item.status === 'COMPLETED') counts.projectCompleted++;
            }
            else if (type === 'CONFERENCE') counts.papers++;
            else if (type === 'PATENT') counts.patents++;
        });

        return counts;
    }, [filteredProjects]);


    const handleWorkSubmit = (data) => {
        if (modalMode === 'create') {
            setProjects([{ ...data, utilized: 0, progress: 0 }, ...projects]);
        } else {
            setProjects(projects.map(p => p.id === data.id ? { ...p, ...data } : p));
        }
        setIsModalOpen(false);
    };

    const openEditModal = (work) => {
        setSelectedWork(work);
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setSelectedWork(null);
        setModalMode('create');
        setIsModalOpen(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ONGOING': return 'bg-blue-100 text-blue-700';
            case 'COMPLETED': return 'bg-green-100 text-green-700';
            case 'PUBLISHED': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="min-h-full">
            <TopBar title="My Academic Portfolio" subtitle="Manage your research projects and publications" />

            <div className="p-8 max-w-7xl mx-auto space-y-8">

                {/* 1. Header with Year Selector */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Academic Snapshot</h2>
                        <p className="text-sm text-gray-500">Overview of your contributions for {selectedYear}</p>
                    </div>
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                            className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                        >
                            <option value="All">All Years</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* 2. Overall Summary Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard title="Total Works" count={stats.total} icon={Layers} color="text-blue-600" bg="bg-blue-50" />
                    <StatCard title="Books" count={stats.books} icon={Book} color="text-purple-600" bg="bg-purple-50" />
                    <StatCard title="Journals" count={stats.journals} icon={BookOpen} color="text-pink-600" bg="bg-pink-50" />
                    <StatCard title="Projects" count={stats.projects} icon={Briefcase} color="text-indigo-600" bg="bg-indigo-50" />
                    <StatCard title="Conf. Papers" count={stats.papers} icon={Presentation} color="text-orange-600" bg="bg-orange-50" />
                    <StatCard title="Patents" count={stats.patents} icon={Award} color="text-green-600" bg="bg-green-50" />
                </div>

                {/* 3. Category-Wise Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Books & Journals Combined for visual balance or specific logic */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Books & Journals</p>
                            <div className="flex gap-4 mt-2">
                                <div><span className="text-xl font-bold">{stats.books}</span> <span className="text-xs text-gray-400">Books</span></div>
                                <div className="w-px bg-gray-200 h-8"></div>
                                <div><span className="text-xl font-bold">{stats.journals}</span> <span className="text-xs text-gray-400">Journals</span></div>
                            </div>
                        </div>
                        <div className="p-3 bg-fuchsia-50 rounded-lg"><BookOpen className="w-6 h-6 text-fuchsia-600" /></div>
                    </div>

                    {/* Research Projects Detailed */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Research Projects</p>
                            <div className="flex gap-4 mt-2">
                                <div><span className="text-xl font-bold">{stats.projectOngoing}</span> <span className="text-xs text-green-600">Ongoing</span></div>
                                <div className="w-px bg-gray-200 h-8"></div>
                                <div><span className="text-xl font-bold">{stats.projectCompleted}</span> <span className="text-xs text-gray-400">Completed</span></div>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg"><Layers className="w-6 h-6 text-blue-600" /></div>
                    </div>

                    {/* Conference & Patents */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Papers & Patents</p>
                            <div className="flex gap-4 mt-2">
                                <div><span className="text-xl font-bold">{stats.papers}</span> <span className="text-xs text-gray-400">Papers</span></div>
                                <div className="w-px bg-gray-200 h-8"></div>
                                <div><span className="text-xl font-bold">{stats.patents}</span> <span className="text-xs text-gray-400">Patents</span></div>
                            </div>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg"><Lightbulb className="w-6 h-6 text-orange-600" /></div>
                    </div>
                </div>

                {/* 4. Project List Section */}
                <div>
                    <div className="flex justify-between items-center mb-6 mt-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 icon-text-gap">
                                <Layers className="w-5 h-5 inline mr-2 text-blue-600" />
                                Detailed List
                            </h3>
                        </div>
                        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" /> Add New Work
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.length > 0 ? filteredProjects.map((work) => (
                            <Card key={work.id} className="border-0 shadow-sm hover:shadow-md transition-shadow group">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge variant="outline" className="text-[10px] font-bold group-hover:bg-blue-50">
                                            {work.id}
                                        </Badge>
                                        <Badge className={getStatusColor(work.status)}>
                                            {work.status}
                                        </Badge>
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 h-12" title={work.title}>
                                        {work.title}
                                    </h3>
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center text-xs text-gray-500">
                                            <Layers className="w-3.5 h-3.5 mr-2" />
                                            {work.type}
                                        </div>
                                        <div className="flex items-center text-xs text-gray-500">
                                            <Clock className="w-3.5 h-3.5 mr-2" />
                                            {work.type === 'PROJECT' ? `Started: ${work.startDate}` : `Year: ${work.year}`}
                                        </div>
                                        {work.publisher && (
                                            <div className="flex items-center text-xs text-gray-500">
                                                <Building className="w-3.5 h-3.5 mr-2" />
                                                {work.publisher}
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-t pt-4 flex justify-between items-center">
                                        {work.type === 'PROJECT' ? (
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">Budget</p>
                                                <p className="text-sm font-bold text-gray-900">₹{(work.budget / 100000).toFixed(1)}L</p>
                                            </div>
                                        ) : (
                                            <div />
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(work)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                    <Search className="w-6 h-6 text-gray-400" />
                                </div>
                                <h3 className="text-gray-900 font-medium">No projects found for {selectedYear}</h3>
                                <p className="text-gray-500 text-sm mt-1">Try selecting a different year or add a new work.</p>
                            </div>
                        )}

                        {/* Add New Card Placeholder (Only shown if filter matches current year or 'All', or maybe always? 
                            User said 'It should update dynamically when year filter changes.' 
                            Let's keep the placeholder at the end of the list ONLY if we are in 'All' or Current Year to encourage adding recent work.
                            Actually, let's just leave it out of the main grid if filtered, or append it if appropriate.
                            User didn't specify, but standard UX is to show 'Add' always or conditional.
                            I will remove the inline placeholder card and rely on the button, as the grid is now dynamic.
                        */}
                    </div>
                </div>
            </div>

            <AcademicWorkModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleWorkSubmit}
                initialData={selectedWork}
                mode={modalMode}
            />
        </div>
    );
};

// Stateless Components
const StatCard = ({ title, count, icon: Icon, color, bg }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start mb-2">
            <div>
                <p className="text-xs font-medium text-gray-500">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{count}</h3>
            </div>
            <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
            </div>
        </div>
    </div>
);

export default FacultyProjects;

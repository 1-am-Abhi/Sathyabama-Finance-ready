import React, { useState } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import { RESEARCH_CENTRES } from '../../constants/researchCentres';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import apiClient from '../../api/client';
import { FUND_SOURCES } from '../../constants/fundSources';

const CreateProject = () => {
    const { setLayout } = useLayout();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        principalInvestigator: '',
        researchCentre: '',
        budget: '',
        duration: '',
        startDate: '',
        fundingSource: 'PFMS'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                pi: formData.principalInvestigator,
                department: 'Research', // can be dynamic if added
                centre: formData.researchCentre,
                sanctionedBudget: Number(formData.budget),
                fundingSource: formData.fundingSource,
                startDate: formData.startDate,
                status: 'PENDING'
            };
            const response = await apiClient.post('/projects', payload);
            if (response.data.success) {
                alert('Project created successfully!');
                setFormData({ title: '', description: '', principalInvestigator: '', researchCentre: '', budget: '', duration: '', startDate: '', fundingSource: 'PFMS' });
            }
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    React.useEffect(() => {
        setLayout("Create New Project", "Add a new research project to the system");
    }, [setLayout]);

    return (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* ... (rest of the content) */}

                <Card className="dark:bg-slate-900 border-0 shadow-lg">
                    <CardHeader className="border-b dark:border-slate-800">
                        <CardTitle className="dark:text-white">Project Details</CardTitle>
                        <CardDescription className="dark:text-gray-400">Fill in the information below to create a new research project</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="dark:text-gray-300">Project Title *</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Enter project title"
                                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-gray-500"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="dark:text-gray-300">Description *</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Describe the research project objectives and scope"
                                    rows={4}
                                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-gray-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="principalInvestigator" className="dark:text-gray-300">Principal Investigator *</Label>
                                    <Input
                                        id="principalInvestigator"
                                        name="principalInvestigator"
                                        value={formData.principalInvestigator}
                                        onChange={handleChange}
                                        placeholder="Faculty name"
                                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-gray-500"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="researchCentre" className="dark:text-gray-300">Research Centre *</Label>
                                    <select
                                        id="researchCentre"
                                        name="researchCentre"
                                        value={formData.researchCentre}
                                        onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-slate-800 dark:border-slate-700 dark:text-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500 focus-visible:ring-offset-2"
                                        required
                                    >
                                        <option value="">Select Research Centre</option>
                                        {RESEARCH_CENTRES.map((centre) => (
                                            <option key={centre} value={centre}>{centre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="budget" className="dark:text-gray-300">Budget (₹) *</Label>
                                    <Input
                                        id="budget"
                                        name="budget"
                                        type="number"
                                        value={formData.budget}
                                        onChange={handleChange}
                                        placeholder="Enter budget amount"
                                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-gray-500"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="duration" className="dark:text-gray-300">Duration (months) *</Label>
                                    <Input
                                        id="duration"
                                        name="duration"
                                        type="number"
                                        value={formData.duration}
                                        onChange={handleChange}
                                        placeholder="Project duration"
                                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-gray-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="startDate" className="dark:text-gray-300">Start Date *</Label>
                                <Input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fundingSource" className="dark:text-gray-300">Funding Source *</Label>
                                <select
                                    id="fundingSource"
                                    name="fundingSource"
                                    value={formData.fundingSource}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-slate-800 dark:border-slate-700 dark:text-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-500 focus-visible:ring-offset-2"
                                    required
                                >
                                    {FUND_SOURCES.map((source) => (
                                        <option key={source} value={source}>{source}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-4 pt-4 border-t dark:border-slate-800">
                                <Button type="button" variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800">Cancel</Button>
                                <Button type="submit" className="bg-gradient-to-r from-maroon-600 to-maroon-700 hover:from-maroon-700 hover:to-maroon-800">Create Project</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CreateProject;

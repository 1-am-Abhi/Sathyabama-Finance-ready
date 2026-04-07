import React, { useState } from 'react';
import Navbar from '../../components/shared/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';

const CreateProject = () => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        principalInvestigator: '',
        department: '',
        budget: '',
        duration: '',
        startDate: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // TODO: API call to create project
        console.log('Creating project:', formData);
        alert('Project created successfully!');
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
                    <p className="text-gray-600 mt-2">Add a new research project to the system</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                        <CardDescription>Fill in the information below to create a new research project</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Project Title *</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Enter project title"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Describe the research project objectives and scope"
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="principalInvestigator">Principal Investigator *</Label>
                                    <Input
                                        id="principalInvestigator"
                                        name="principalInvestigator"
                                        value={formData.principalInvestigator}
                                        onChange={handleChange}
                                        placeholder="Faculty name"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="department">Department *</Label>
                                    <select
                                        id="department"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        <option value="CSE">Computer Science & Engineering</option>
                                        <option value="ECE">Electronics & Communication</option>
                                        <option value="MECH">Mechanical Engineering</option>
                                        <option value="CIVIL">Civil Engineering</option>
                                        <option value="BIO">Biotechnology</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="budget">Budget (₹) *</Label>
                                    <Input
                                        id="budget"
                                        name="budget"
                                        type="number"
                                        value={formData.budget}
                                        onChange={handleChange}
                                        placeholder="Enter budget amount"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="duration">Duration (months) *</Label>
                                    <Input
                                        id="duration"
                                        name="duration"
                                        type="number"
                                        value={formData.duration}
                                        onChange={handleChange}
                                        placeholder="Project duration"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date *</Label>
                                <Input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="flex justify-end space-x-4 pt-4">
                                <Button type="button" variant="outline">Cancel</Button>
                                <Button type="submit">Create Project</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CreateProject;

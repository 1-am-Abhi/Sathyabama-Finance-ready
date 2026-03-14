import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FileText, DollarSign, Upload, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';

// Mock Data for Projects (Replace with API call)
const MOCK_PROJECTS = [
    { id: 'PROJ-001', title: 'AI for Healthcare', fundingAgency: 'DST', amount: 5000000 },
    { id: 'PROJ-002', title: 'Sustainable Energy', fundingAgency: 'AICTE', amount: 3000000 },
];

const AddRequest = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        projectId: '',
        equipmentName: '',
        quantity: '',
        requestType: 'PURCHASED', // PURCHASED or FUNDING
        requestedAmount: '',
        justification: '',
        billFile: null
    });
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('File size exceeds 5MB');
                return;
            }
            if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
                setError('Invalid file type. Only PDF, JPG, PNG allowed.');
                return;
            }
            setError('');
            setFormData({ ...formData, billFile: file });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        if (!formData.projectId || !formData.equipmentName || !formData.requestedAmount || !formData.billFile) {
            setError('Please fill all mandatory fields');
            return;
        }

        if (formData.requestType === 'FUNDING' && !formData.justification) {
            setError('Justification is required for Funding Requests');
            return;
        }

        // Mock Submission logic
        const newRequest = {
            id: `REQ-${Math.floor(Math.random() * 10000)}`,
            ...formData,
            projectName: MOCK_PROJECTS.find(p => p.id === formData.projectId)?.title,
            status: 'Pending',
            createdAt: new Date().toISOString(),
            approvedAmount: null,
            adminRemarks: ''
        };

        // Save to Local Storage (Mock Backend)
        const existingRequests = JSON.parse(localStorage.getItem('equipmentRequests') || '[]');
        localStorage.setItem('equipmentRequests', JSON.stringify([newRequest, ...existingRequests]));

        navigate('/faculty/equipment/requests');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">New Equipment Financial Request</h1>
                <p className="text-gray-500 text-sm mt-1">Submit a request for equipment purchase or funding release</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Project Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Project *</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={formData.projectId}
                                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none appearance-none bg-white"
                            >
                                <option value="">Select a project...</option>
                                {MOCK_PROJECTS.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.title} ({project.fundingAgency})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Equipment Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Equipment Name *</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.equipmentName}
                                    onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    placeholder="Enter equipment name"
                                />
                            </div>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                            <input
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                placeholder="Qty"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Request Type */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Request Type *</label>
                            <select
                                value={formData.requestType}
                                onChange={(e) => setFormData({ ...formData, requestType: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                            >
                                <option value="PURCHASED">Already Purchased (Reimbursement)</option>
                                <option value="FUNDING">Advance Funding Request</option>
                            </select>
                        </div>

                        {/* Requested Amount */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Requested Amount (₹) *</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="number"
                                    value={formData.requestedAmount}
                                    onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Bill / Quotation *</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 font-medium">
                                {formData.billFile ? formData.billFile.name : 'Click to upload document'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                        </div>
                    </div>

                    {/* Justification - Conditional */}
                    {formData.requestType === 'FUNDING' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Justification *</label>
                            <textarea
                                value={formData.justification}
                                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                                rows="3"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                placeholder="Explain why advance funding is required..."
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => navigate('/faculty/equipment/requests')}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                            Submit Request
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddRequest;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Upload, AlertCircle, FileText, DollarSign, Calendar, User } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const AddRevenueRecord = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        revenueSource: 'Consultancy',
        clientName: '',
        amountGenerated: '',
        revenueDate: '',
        description: '',
        supportingDocument: null
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
            setFormData({ ...formData, supportingDocument: file });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        if (!formData.title || !formData.amountGenerated || !formData.revenueDate) {
            setError('Please fill all mandatory fields (Title, Amount, Date)');
            return;
        }

        const year = new Date(formData.revenueDate).getFullYear();

        // Mock Submission logic
        const newRecord = {
            id: `REV-${Math.floor(Math.random() * 10000)}`,
            ...formData,
            year,
            createdAt: new Date().toISOString()
        };

        // Save to Local Storage (Mock Backend)
        const existingRecords = JSON.parse(localStorage.getItem('revenueRecords') || '[]');
        localStorage.setItem('revenueRecords', JSON.stringify([newRecord, ...existingRecords]));

        navigate('/faculty/revenue/records');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Add Revenue Record</h1>
                <p className="text-gray-500 text-sm mt-1">Record consultancy work, events, or analysis revenue</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Activity / Work Title *</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                placeholder="E.g., Soil Testing for Metro Rail"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Revenue Source */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Revenue Source *</label>
                            <div className="relative">
                                <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={formData.revenueSource}
                                    onChange={(e) => setFormData({ ...formData, revenueSource: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white appearance-none"
                                >
                                    <option value="Consultancy">Consultancy</option>
                                    <option value="Events">Events / Workshops</option>
                                    <option value="Projects">Projects</option>
                                    <option value="Industry">Industry Training</option>
                                    <option value="Analysis">Analysis / Testing</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Client Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Client Name (Optional)</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    placeholder="E.g., CMRL, L&T"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Amount Generated (₹) *</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="number"
                                    value={formData.amountGenerated}
                                    onChange={(e) => setFormData({ ...formData, amountGenerated: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Revenue Received Date *</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={formData.revenueDate}
                                    onChange={(e) => setFormData({ ...formData, revenueDate: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Supporting Document (Optional)</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 font-medium">
                                {formData.supportingDocument ? formData.supportingDocument.name : 'Click to upload proof (Invoice / Receipt)'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Description / Remarks (Optional)</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows="3"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                            placeholder="Additional details about the activity..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => navigate('/faculty/revenue/records')}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                            Save Record
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddRevenueRecord;

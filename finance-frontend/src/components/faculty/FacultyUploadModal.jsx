import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import apiClient from '../../api/client';

const FacultyUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const selected = e.target.files[0];
        if (!selected) return;

        setFile(selected);
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', selected);

        try {
            const res = await apiClient.post('/faculty-upload/preview', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data?.success) {
                setPreview(res.data.data);
            } else {
                setError('Failed to process file preview.');
            }
        } catch (err) {
            console.error('Preview error:', err);
            setError(err.response?.data?.message || 'Error processing file');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!preview) return;
        setUploading(true);
        setError(null);

        try {
            const res = await apiClient.post('/faculty-upload/upload-final', { faculties: preview });
            if (res.data?.success) {
                onUploadSuccess(res.data);
                handleClose();
            } else {
                setError(res.data?.message || 'Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'Error saving faculties');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreview(null);
        setError(null);
        onClose();
    };

    const validCount = preview?.filter(p => p.isValid && !p.isDuplicate).length || 0;
    const invalidCount = preview?.filter(p => !p.isValid).length || 0;
    const duplicateCount = preview?.filter(p => p.isDuplicate).length || 0;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl bg-white rounded-xl shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-6 bg-slate-50 border-b">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Upload className="w-5 h-5 text-indigo-600" /> Upload Faculty Excel
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6">
                    {!file && (
                        <div 
                            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef} 
                                accept=".xlsx, .xls" 
                                onChange={handleFileChange} 
                            />
                            <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 text-indigo-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Click to upload Excel File</h3>
                            <p className="text-sm text-gray-500 mt-2">Required columns: EMAIL ID, NAME OF THE SATFF MEMBE, Department</p>
                        </div>
                    )}

                    {loading && (
                        <div className="py-12 flex flex-col items-center justify-center text-indigo-600">
                            <Loader2 className="w-10 h-10 animate-spin mb-4" />
                            <p className="font-semibold">Processing and AI Cleaning Data...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-3 mb-6">
                            <AlertCircle className="w-5 h-5" />
                            <p className="font-semibold text-sm">{error}</p>
                        </div>
                    )}

                    {preview && !loading && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-emerald-50 rounded-xl">
                                    <p className="text-xs font-bold text-emerald-600 uppercase">Valid Records</p>
                                    <p className="text-2xl font-black text-emerald-700 mt-1">{validCount}</p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-xl">
                                    <p className="text-xs font-bold text-amber-600 uppercase">Duplicates Detected</p>
                                    <p className="text-2xl font-black text-amber-700 mt-1">{duplicateCount}</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-xl">
                                    <p className="text-xs font-bold text-red-600 uppercase">Invalid Emails</p>
                                    <p className="text-2xl font-black text-red-700 mt-1">{invalidCount}</p>
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto border rounded-xl">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 sticky top-0 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-gray-600">Name</th>
                                            <th className="px-4 py-3 font-semibold text-gray-600">Email</th>
                                            <th className="px-4 py-3 font-semibold text-gray-600">Centre</th>
                                            <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {preview.map((row, i) => (
                                            <tr key={i} className={!row.isValid || row.isDuplicate ? 'bg-red-50/30' : ''}>
                                                <td className="px-4 py-3 font-medium">{row.name}</td>
                                                <td className="px-4 py-3 text-gray-600">{row.email}</td>
                                                <td className="px-4 py-3 text-gray-600">{row.department}</td>
                                                <td className="px-4 py-3">
                                                    {row.isDuplicate ? (
                                                        <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-md">Duplicate ({row.duplicateType})</span>
                                                    ) : !row.isValid ? (
                                                        <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-md">Invalid Email</span>
                                                    ) : (
                                                        <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md flex items-center w-fit gap-1"><CheckCircle2 className="w-3 h-3"/> Ready</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={handleClose} disabled={uploading}>Cancel</Button>
                                <Button 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" 
                                    onClick={handleUpload}
                                    disabled={validCount === 0 || uploading}
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                    {uploading ? 'Importing...' : `Import ${validCount} Faculties`}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default FacultyUploadModal;

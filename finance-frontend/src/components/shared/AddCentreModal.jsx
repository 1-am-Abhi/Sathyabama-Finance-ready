import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, Plus, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { useNotifications } from '../../contexts/NotificationContext';

const AddCentreModal = ({ isOpen, onClose, onRefresh }) => {
    const { addNotification } = useNotifications();
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Centre name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiClient.post('/auth/centres', { name: name.trim() });
            if (response.data.success) {
                // Alert the ADMIN role
                try {
                    await addNotification({
                        role: 'ADMIN',
                        title: 'New Centre Registered',
                        message: `Academic registry updated: ${name.trim()} is now active.`,
                        type: 'SUCCESS'
                    });
                } catch (notiError) {
                    console.error('Notification failed but centre was added:', notiError);
                }

                toast.success('Research Centre added successfully');
                setName('');
                onRefresh();
                onClose();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add research centre');
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn border border-gray-100 dark:border-slate-800">
                {/* Header */}
                <div className="bg-indigo-600 p-8 text-white relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold tracking-tight">Add New Centre</h3>
                                <p className="text-white/60 text-[10px] font-medium uppercase tracking-widest mt-0.5">Registration Portal</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Research Centre Name</label>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Centre for Quantum Computing"
                                className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all outline-none font-medium text-gray-700 dark:text-gray-200 text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex items-center gap-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-2xl font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            Create Centre
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default AddCentreModal;

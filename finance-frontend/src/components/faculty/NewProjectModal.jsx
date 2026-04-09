import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Briefcase, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useCentres } from '../../constants/researchCentres';

const AcademicWorkModal = ({ isOpen, onClose, onSubmit, initialData = null, mode = 'create', isSubmitting = false }) => {
    const { centres: dynamicCentres } = useCentres();
    const [formData, setFormData] = useState({
        // Common
        mainType: 'PROJECT',
        title: '',
        year: new Date().getFullYear(),

        // Project Specific
        projectStatus: 'On-Going',
        role: 'PI',
        fundingSource: 'INSTITUTIONAL',
        fundingAgency: '',
        amount: '',
        startDate: '',
        endDate: '',
        description: '',

        // Project Resources
        equipments: [],
        consumables: [],
        patientDetails: {
            count: '',
            category: 'Adult',
            ethicalApproval: false
        },
        verificationScreenshot: null,

        // Publication Specific
        publicationType: 'JOURNAL',
        authorRole: 'First Author',
        publisher: '',
        doi: '',
        indexing: [],
        impactFactor: '',
        abstract: ''
    });

    useEffect(() => {
        if (initialData && mode === 'edit') {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                fundingSource: initialData.fundingSource || initialData.fundingSource || 'INSTITUTIONAL',
                indexing: Array.isArray(initialData.indexing) ? initialData.indexing : (initialData.indexing ? [initialData.indexing] : [])
            }));
        } else if (!initialData) {
            setFormData({
                mainType: 'PROJECT',
                title: '',
                year: new Date().getFullYear(),
                projectStatus: 'On-Going',
                role: 'PI',
                fundingSource: 'INSTITUTIONAL',
                fundingAgency: '',
                amount: '',
                startDate: '',
                endDate: '',
                description: '',
                equipments: [],
                consumables: [],
                patientDetails: { count: '', category: 'Adult', ethicalApproval: false },
                verificationScreenshot: null,
                publicationType: 'JOURNAL',
                authorRole: 'First Author',
                publisher: '',
                doi: '',
                indexing: [],
                impactFactor: '',
                abstract: ''
            });
        }
    }, [initialData, mode, isOpen]);

    if (!isOpen) return null;

    const today = new Date().toISOString().split('T')[0];

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            id: mode === 'edit' ? initialData.id : `WORK-${Math.floor(Math.random() * 10000)}`
        });
    };

    const handleIndexingChange = (e) => {
        const { value, checked } = e.target;
        let updatedIndexing = [...formData.indexing];
        if (checked) {
            updatedIndexing.push(value);
        } else {
            updatedIndexing = updatedIndexing.filter(item => item !== value);
        }
        setFormData({ ...formData, indexing: updatedIndexing });
    };

    // Equipment Handlers
    const addEquipment = () => {
        setFormData({
            ...formData,
            equipments: [...formData.equipments, { name: '', quantity: '', cost: '', vendor: '', description: '' }]
        });
    };

    const removeEquipment = (index) => {
        const updated = formData.equipments.filter((_, i) => i !== index);
        setFormData({ ...formData, equipments: updated });
    };

    const updateEquipment = (index, field, value) => {
        const updated = formData.equipments.map((item, i) => {
            if (i === index) return { ...item, [field]: value };
            return item;
        });
        setFormData({ ...formData, equipments: updated });
    };

    // Consumable Handlers
    const addConsumable = () => {
        setFormData({
            ...formData,
            consumables: [...formData.consumables, { name: '', quantity: '', cost: '', usage: '' }]
        });
    };

    const removeConsumable = (index) => {
        const updated = formData.consumables.filter((_, i) => i !== index);
        setFormData({ ...formData, consumables: updated });
    };

    const updateConsumable = (index, field, value) => {
        const updated = formData.consumables.map((item, i) => {
            if (i === index) return { ...item, [field]: value };
            return item;
        });
        setFormData({ ...formData, consumables: updated });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, verificationScreenshot: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const isJournal = formData.publicationType === 'JOURNAL';
    const isConference = formData.publicationType === 'CONFERENCE';
    const isBook = formData.publicationType === 'BOOK' || formData.publicationType === 'BOOK_CHAPTER';
    const isOther = formData.publicationType === 'OTHERS';

    const getPublisherLabel = () => {
        if (isJournal) return 'Journal Name';
        if (isConference) return 'Conference Name';
        if (isBook) return 'Publisher';
        return 'Publisher / Venue';
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl mx-auto overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold">{mode === 'edit' ? 'Edit Work' : 'Add New Work'}</h3>
                        <p className="text-blue-100 text-xs mt-1">Fill in the details for your academic work</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg" disabled={isSubmitting}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            type="button"
                            onClick={() => setFormData({ ...formData, mainType: 'PROJECT' })}
                            variant={formData.mainType === 'PROJECT' ? 'default' : 'outline'}
                            className="h-12"
                        >
                            <Briefcase className="w-4 h-4 mr-2" /> Research Project
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setFormData({ ...formData, mainType: 'PUBLICATION' })}
                            variant={formData.mainType === 'PUBLICATION' ? 'default' : 'outline'}
                            className="h-12"
                        >
                            <BookOpen className="w-4 h-4 mr-2" /> Publication
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {/* Title */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase italic">Title</label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-100 outline-none italic font-bold"
                                    placeholder={formData.mainType === 'PROJECT' ? "Project Title" : "Paper/Book Title"}
                                    title="Title is required"
                                />
                            </div>
                        </div>

                        {formData.mainType === 'PROJECT' ? (
                            <>
                                {/* Project Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">Status</label>
                                        <select
                                            value={formData.projectStatus}
                                            onChange={(e) => setFormData({ ...formData, projectStatus: e.target.value })}
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold"
                                        >
                                            <option value="On-Going">On-Going</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Under Review">Under Review</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold"
                                        >
                                            <option value="PI">Principal Investigator (PI)</option>
                                            <option value="Co-PI">Co-PI</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase italic">Research Centre *</label>
                                    <select
                                        value={formData.researchCentre || ''}
                                        onChange={(e) => setFormData({ ...formData, researchCentre: e.target.value })}
                                        className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold"
                                        required={formData.mainType === 'PROJECT'}
                                    >
                                        <option value="">Select Research Centre</option>
                                        {dynamicCentres.map(centre => (
                                            <option key={centre} value={centre}>{centre}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* FIX #1 — Funding Source selector (maps to DB-valid ENUM) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">Funding Source *</label>
                                        <select
                                            value={formData.fundingSource}
                                            onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold"
                                        >
                                            <option value="INSTITUTIONAL">Institutional</option>
                                            <option value="PFMS">PFMS</option>
                                            <option value="DIRECTOR">Director Fund</option>
                                            <option value="OTHERS">Other's Fund</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">Funding Agency</label>
                                        <input
                                            value={formData.fundingAgency}
                                            onChange={(e) => setFormData({ ...formData, fundingAgency: e.target.value })}
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold"
                                            placeholder="e.g. DST, AICTE"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold"
                                            placeholder="Budget amount"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                {/* FIX #5, #6 — min date blocks past date selection, colorScheme:light fixes dark mode calendar */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">Start Date</label>
                                        <input
                                            type="date"
                                            min={today}
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold"
                                            style={{ colorScheme: 'light' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">End Date</label>
                                        <input
                                            type="date"
                                            min={formData.startDate || today}
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold"
                                            style={{ colorScheme: 'light' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">Year</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) || 0 })}
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold"
                                            placeholder="YYYY"
                                        />
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                                    <label className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase italic">Screenshot of Mail by Company (Verification) *</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        required={mode === 'create'}
                                    />
                                    {formData.verificationScreenshot && (
                                        <div className="mt-2 relative w-24 h-16 rounded overflow-hidden border">
                                            <img src={formData.verificationScreenshot} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <p className="text-[10px] text-amber-600 dark:text-amber-500 italic">Please upload a screenshot of the official mail from the company for verification.</p>
                                </div>

                                {/* Project Resources Section */}
                                <div className="space-y-4 border-t dark:border-slate-700 pt-4">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-2 italic">
                                        <Briefcase className="w-4 h-4" /> Project Resources
                                    </h4>

                                    {/* Equipments */}
                                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase italic">Equipments</h5>
                                            <Button type="button" size="sm" onClick={addEquipment} className="h-7 text-xs">
                                                <Plus className="w-3 h-3 mr-1" /> Add Equipment
                                            </Button>
                                        </div>
                                        {formData.equipments.length === 0 && (
                                            <p className="text-xs text-gray-400 italic">No equipment added.</p>
                                        )}
                                        {formData.equipments.map((item, index) => (
                                            <div key={index} className="bg-white dark:bg-slate-800 p-3 rounded border dark:border-slate-700 space-y-3 relative">
                                                <button
                                                    type="button"
                                                    onClick={() => removeEquipment(index)}
                                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase italic">Name *</label>
                                                        <input
                                                            required
                                                            value={item.name}
                                                            onChange={(e) => updateEquipment(index, 'name', e.target.value)}
                                                            className="w-full mt-1 px-2 py-1 text-sm border dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded outline-none font-bold italic"
                                                            placeholder="Equipment Name"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase italic">Vendor</label>
                                                        <input
                                                            value={item.vendor}
                                                            onChange={(e) => updateEquipment(index, 'vendor', e.target.value)}
                                                            className="w-full mt-1 px-2 py-1 text-sm border dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded outline-none font-bold italic"
                                                            placeholder="Vendor Name"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase italic">Quantity *</label>
                                                        <input
                                                            type="number"
                                                            required
                                                            value={item.quantity}
                                                            onChange={(e) => updateEquipment(index, 'quantity', e.target.value)}
                                                            className="w-full mt-1 px-2 py-1 text-sm border dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded outline-none font-bold italic"
                                                            placeholder="Qty"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase italic">Est. Cost</label>
                                                        <input
                                                            type="number"
                                                            value={item.cost}
                                                            onChange={(e) => updateEquipment(index, 'cost', e.target.value)}
                                                            className="w-full mt-1 px-2 py-1 text-sm border dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded outline-none font-bold italic"
                                                            placeholder="Amount"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase italic">Description</label>
                                                    <input
                                                        value={item.description}
                                                        onChange={(e) => updateEquipment(index, 'description', e.target.value)}
                                                        className="w-full mt-1 px-2 py-1 text-sm border dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded outline-none font-bold italic"
                                                        placeholder="Brief description..."
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Consumables */}
                                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase italic">Consumables</h5>
                                            <Button type="button" size="sm" onClick={addConsumable} className="h-7 text-xs">
                                                <Plus className="w-3 h-3 mr-1" /> Add Consumable
                                            </Button>
                                        </div>
                                        {formData.consumables.length === 0 && (
                                            <p className="text-xs text-gray-400 italic">No consumables added.</p>
                                        )}
                                        {formData.consumables.map((item, index) => (
                                            <div key={index} className="bg-white dark:bg-slate-800 p-3 rounded border dark:border-slate-700 space-y-3 relative">
                                                <button
                                                    type="button"
                                                    onClick={() => removeConsumable(index)}
                                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="col-span-2">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase italic">Item Name *</label>
                                                        <input
                                                            required
                                                            value={item.name}
                                                            onChange={(e) => updateConsumable(index, 'name', e.target.value)}
                                                            className="w-full mt-1 px-2 py-1 text-sm border dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded outline-none font-bold italic"
                                                            placeholder="Consumable Name"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase italic">Quantity</label>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateConsumable(index, 'quantity', e.target.value)}
                                                            className="w-full mt-1 px-2 py-1 text-sm border dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded outline-none font-bold italic"
                                                            placeholder="Qty"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase italic">Est. Cost</label>
                                                        <input
                                                            type="number"
                                                            value={item.cost}
                                                            onChange={(e) => updateConsumable(index, 'cost', e.target.value)}
                                                            className="w-full mt-1 px-2 py-1 text-sm border dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded outline-none font-bold italic"
                                                            placeholder="Amount"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase italic">Usage Description</label>
                                                    <input
                                                        value={item.usage}
                                                        onChange={(e) => updateConsumable(index, 'usage', e.target.value)}
                                                        className="w-full mt-1 px-2 py-1 text-sm border dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded outline-none font-bold italic"
                                                        placeholder="How will this be used?"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Patient Details (Optional) */}
                                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg space-y-3">
                                        <h5 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase italic">Patient Details (Optional)</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase italic">Number of Patients</label>
                                                <input
                                                    type="number"
                                                    value={formData.patientDetails.count}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        patientDetails: { ...formData.patientDetails, count: e.target.value }
                                                    })}
                                                    className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none font-bold italic"
                                                    placeholder="Count"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase italic">Category</label>
                                                <select
                                                    value={formData.patientDetails.category}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        patientDetails: { ...formData.patientDetails, category: e.target.value }
                                                    })}
                                                    className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none font-bold italic"
                                                >
                                                    <option value="Adult">Adult</option>
                                                    <option value="Pediatric">Pediatric</option>
                                                    <option value="Geriatric">Geriatric</option>
                                                    <option value="Mixed">Mixed</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 mt-2 font-bold italic">
                                            <input
                                                type="checkbox"
                                                id="ethicalApproval"
                                                checked={formData.patientDetails.ethicalApproval}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    patientDetails: { ...formData.patientDetails, ethicalApproval: e.target.checked }
                                                })}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="ethicalApproval" className="text-sm text-gray-700 dark:text-gray-300">Ethical Approval Obtained?</label>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Publication Fields */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">Publication Type</label>
                                        <select
                                            value={formData.publicationType}
                                            onChange={(e) => setFormData({ ...formData, publicationType: e.target.value })}
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none font-bold italic"
                                        >
                                            <option value="JOURNAL">Journal Article</option>
                                            <option value="CONFERENCE">Conference Paper</option>
                                            <option value="BOOK">Book</option>
                                            <option value="BOOK_CHAPTER">Book Chapter</option>
                                            <option value="OTHERS">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">Author Role</label>
                                        <select
                                            value={formData.authorRole}
                                            onChange={(e) => setFormData({ ...formData, authorRole: e.target.value })}
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none font-bold italic"
                                        >
                                            <option value="First Author">First Author</option>
                                            <option value="Corresponding Author">Corresponding Author</option>
                                            <option value="Co-Author">Co-Author</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">Year</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.year}
                                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none font-bold italic"
                                        />
                                    </div>
                                </div>

                                {/* Conditional Fields Based on Type */}
                                {(isJournal || isConference || isBook) && (
                                    <div className="grid grid-cols-2 gap-4 font-bold italic">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase italic mb-2 block">{getPublisherLabel()}</label>
                                            <input
                                                required
                                                value={formData.publisher}
                                                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                                                className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none font-bold italic"
                                                placeholder={`Enter ${getPublisherLabel().toLowerCase()}...`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {isJournal && (
                                    <div className="grid grid-cols-2 gap-4 font-bold italic text-slate-700 dark:text-slate-300">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block italic">Indexing</label>
                                            <div className="flex flex-wrap gap-3">
                                                {['Scopus', 'SCI', 'Web of Science'].map((idx) => (
                                                    <label key={idx} className="flex items-center space-x-2 text-sm italic font-bold">
                                                        <input
                                                            type="checkbox"
                                                            value={idx}
                                                            checked={formData.indexing.includes(idx)}
                                                            onChange={handleIndexingChange}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span>{idx}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase italic">Impact Factor</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.impactFactor}
                                                onChange={(e) => setFormData({ ...formData, impactFactor: e.target.value })}
                                                className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold"
                                                placeholder="e.g. 4.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase italic">DOI</label>
                                            <input
                                                value={formData.doi}
                                                onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                                                className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold"
                                                placeholder="DOI"
                                            />
                                        </div>
                                    </div>
                                )}

                                {isConference && (
                                    <div className="grid grid-cols-1 gap-4 font-bold italic">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase italic">DOI / ISBN</label>
                                            <input
                                                value={formData.doi}
                                                onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                                                className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none font-bold italic"
                                                placeholder="DOI or ISBN"
                                            />
                                        </div>
                                    </div>
                                )}

                                {isBook && (
                                    <div className="grid grid-cols-1 gap-4 font-bold italic">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase italic">ISBN</label>
                                            <input
                                                value={formData.doi}
                                                onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                                                className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none italic font-bold italic"
                                                placeholder="ISBN"
                                            />
                                        </div>
                                    </div>
                                )}

                                {isOther && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase italic">Description</label>
                                        <textarea
                                            required
                                            value={formData.abstract}
                                            onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                                            rows="3"
                                            className="w-full mt-1 px-4 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg outline-none font-bold italic"
                                            placeholder="Enter brief details..."
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 rounded-xl font-bold italic" disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold italic text-white">
                            {isSubmitting ? 'Saving...' : (mode === 'edit' ? 'Update' : 'Add Work')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default AcademicWorkModal;

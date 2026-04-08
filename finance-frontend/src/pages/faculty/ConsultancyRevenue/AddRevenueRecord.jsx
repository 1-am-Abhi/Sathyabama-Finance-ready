import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Upload, AlertCircle, FileText, DollarSign, Calendar, User, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../../components/ui/select';
import { useLayout } from '../../../contexts/LayoutContext';
import apiClient from '../../../api/client';

const AddRevenueRecord = () => {
    const navigate = useNavigate();
    const { setLayout } = useLayout();
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
    const [submitting, setSubmitting] = useState(false);

    React.useEffect(() => {
        setLayout("Revenue Acquisition", "Registration of professional service yields and institutional grants");
    }, [setLayout]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { setError('File size exceeds 5MB'); return; }
            if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { setError('Invalid file format'); return; }
            setError('');
            setFormData({ ...formData, supportingDocument: file });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!formData.title || !formData.amountGenerated || !formData.revenueDate) {
            setError('Incomplete Mission Parameters');
            return;
        }

        try {
            setSubmitting(true);
            const year = new Date(formData.revenueDate).getFullYear();
            
            const payload = {
                year,
                revenueSource: formData.revenueSource,
                amountGenerated: parseFloat(formData.amountGenerated),
                details: `${formData.title} - ${formData.clientName}. ${formData.description}`
            };

            const response = await apiClient.post('/revenue', payload);
            
            if (response.data.success) {
                navigate('/faculty/revenue/records');
            }
        } catch (error) {
            console.error('Error saving revenue record:', error);
            setError(error.response?.data?.message || 'Transmission Failed to Central Archive');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-8 pb-20 max-w-5xl mx-auto">
            <Card className="border-0 shadow-2xl shadow-gray-200/50 rounded-[2.5rem] overflow-hidden bg-white animate-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="p-10 border-b border-gray-50 flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black italic tracking-tighter uppercase text-slate-800">Acquisition Terminal</CardTitle>
                        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Initialize new revenue record for institutional audit</CardDescription>
                    </div>
                    <Button variant="ghost" className="text-slate-400 hover:text-maroon-600 font-black text-[10px] uppercase tracking-widest italic" onClick={() => navigate('/faculty/revenue/records')}>Abort Entry</Button>
                </CardHeader>
                <CardContent className="p-10">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="p-4 bg-maroon-50 text-maroon-600 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest italic animate-bounce">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Activity / Work Title</Label>
                            <div className="relative">
                                <FileText className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="E.G., CYBERSECURITY AUDIT - METRO RAIL"
                                    className="h-16 pl-14 bg-gray-50 border-0 rounded-2xl font-black text-xs italic uppercase tracking-widest outline-none focus:ring-2 focus:ring-maroon-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Revenue Stream</Label>
                                <Select value={formData.revenueSource} onValueChange={(v) => setFormData({ ...formData, revenueSource: v })}>
                                    <SelectTrigger className="h-16 rounded-2xl border-0 bg-gray-50 font-black text-xs italic uppercase tracking-widest">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-0 shadow-xl rounded-2xl bg-white font-black text-xs italic uppercase">
                                        <SelectItem value="Consultancy">Consultancy</SelectItem>
                                        <SelectItem value="Events">Events / Workshops</SelectItem>
                                        <SelectItem value="Internships">Internships / Project Guidance</SelectItem>
                                        <SelectItem value="Projects">Projects</SelectItem>
                                        <SelectItem value="Industry">Industry Training</SelectItem>
                                        <SelectItem value="Analysis">Analysis / Testing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Client Entity</Label>
                                <div className="relative">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <Input
                                        value={formData.clientName}
                                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                        placeholder="E.G., CMRL, L&T, RELIANCE"
                                        className="h-16 pl-14 bg-gray-50 border-0 rounded-2xl font-black text-xs italic uppercase tracking-widest"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Generated Yield (₹)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <Input
                                        type="number"
                                        value={formData.amountGenerated}
                                        onChange={(e) => setFormData({ ...formData, amountGenerated: e.target.value })}
                                        placeholder="0.00"
                                        className="h-16 pl-14 bg-gray-50 border-0 rounded-2xl font-black text-xs italic uppercase tracking-widest"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Acquisition Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <Input
                                        type="date"
                                        value={formData.revenueDate}
                                        onChange={(e) => setFormData({ ...formData, revenueDate: e.target.value })}
                                        className="h-16 pl-14 bg-gray-50 border-0 rounded-2xl font-black text-xs italic uppercase tracking-widest"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Artifact Upload (Verification Proof)</Label>
                            <label className="border-2 border-dashed border-gray-100 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-maroon-50/30 transition-colors cursor-pointer group relative overflow-hidden">
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Upload className="w-10 h-10 text-gray-300 mb-4 group-hover:text-maroon-600 group-hover:scale-110 transition-all" />
                                <p className="text-xs font-black uppercase tracking-widest italic text-slate-600 transition-colors">
                                    {formData.supportingDocument ? formData.supportingDocument.name : 'Click to Transmit Proof (Invoice / Receipt)'}
                                </p>
                                <p className="text-[9px] font-black text-gray-400 mt-2 uppercase italic tracking-tighter">Verified File Types: PDF, JPG, PNG (Max Limit: 5MB)</p>
                            </label>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Audit Remarks / Intelligence</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="SUPPLY SUPPLEMENTARY CONTEXT FOR THE ARCHIVE..."
                                className="min-h-[140px] bg-gray-50 border-0 rounded-[2rem] p-6 font-black text-xs italic uppercase tracking-widest text-slate-800"
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button 
                                type="submit" 
                                disabled={submitting}
                                className="h-16 px-12 bg-maroon-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic shadow-xl shadow-maroon-600/20 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
                            >
                                {submitting ? 'TRANSMITTING...' : 'Finalize Record Entry'} <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AddRevenueRecord;

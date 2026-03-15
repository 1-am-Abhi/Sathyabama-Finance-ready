import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
    Upload, FileText, CheckCircle2, Clock, Search,
    Download, ExternalLink, ShieldCheck,
    Database, HardDrive
} from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';

const FacultyDocuments = () => {
    const { setLayout } = useLayout();

    React.useEffect(() => {
        setLayout("Institutional Archive", "Immutable storage for research compliance and academic artifacts");
    }, [setLayout]);

    const documents = [
        { id: 1, name: 'Project_Proposal_AI_Healthcare.pdf', project: 'AI Healthcare Diagnostics', type: 'PROPOSAL', date: '10 Jan 2024', size: '2.4 MB', status: 'VERIFIED' },
        { id: 2, name: 'Equipment_Invoice_098.pdf', project: 'AI Healthcare Diagnostics', type: 'INVOICE', date: '22 Jan 2024', size: '1.1 MB', status: 'PENDING' },
        { id: 3, name: 'Monthly_Report_Jan.docx', project: 'ML Predictive Analytics', type: 'REPORT', date: '01 Feb 2024', size: '4.5 MB', status: 'VERIFIED' },
        { id: 4, name: 'Utilisation_Cert_Phase1.pdf', project: 'IoT-Based Smart Campus', type: 'CERTIFICATE', date: '15 Dec 2023', size: '1.8 MB', status: 'VERIFIED' },
        { id: 5, name: 'Ethics_Committee_Approval.pdf', project: 'AI Healthcare Diagnostics', type: 'COMPLIANCE', date: '05 Jan 2024', size: '845 KB', status: 'VERIFIED' },
    ];

    const typeColors = {
        PROPOSAL:    'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
        INVOICE:     'bg-amber-500/15 text-amber-300 border border-amber-500/30',
        REPORT:      'bg-blue-500/15 text-blue-300 border border-blue-500/30',
        CERTIFICATE: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
        COMPLIANCE:  'bg-violet-500/15 text-violet-300 border border-violet-500/30',
    };

    return (
        <div className="p-6 space-y-8 pb-20">
            {/* Archive Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Artifacts', value: '1,248', icon: Database, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
                    { label: 'Verified', value: '1,120', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: 'Storage Used', value: '45.2GB', icon: HardDrive, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                    { label: 'Audits Passed', value: '100%', icon: CheckCircle2, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                ].map((stat, i) => (
                    <Card key={i} className={`border ${stat.border} ${stat.bg} ${stat.color}`}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">{stat.label}</p>
                                    <p className="text-3xl font-black mt-2 italic tracking-tighter">{stat.value}</p>
                                </div>
                                <div className={`w-10 h-10 ${stat.bg} border ${stat.border} rounded-xl flex items-center justify-center`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="SEARCH ARCHIVE..."
                        className="w-full h-14 pl-12 pr-6 bg-slate-800/50 border border-white/10 rounded-2xl text-xs font-black italic uppercase tracking-widest outline-none focus:ring-2 focus:ring-rose-500 text-white placeholder:text-slate-500"
                    />
                </div>
                <div className="relative">
                    <input
                        type="file"
                        id="secure-upload-protocol"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files.length > 0) {
                                alert(`Secure upload initiated for: ${e.target.files[0].name}`);
                            }
                        }}
                    />
                    <Button 
                        onClick={() => document.getElementById('secure-upload-protocol').click()}
                        className="h-14 px-8 bg-rose-700 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest italic transition-all"
                    >
                        <Upload className="w-4 h-4 mr-3" /> Secure Upload Protocol
                    </Button>
                </div>
            </div>

            {/* Document Table */}
            <Card className="border border-white/10 bg-slate-800/40 overflow-hidden rounded-[2rem]">
                <CardHeader className="p-8 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black italic tracking-tighter uppercase text-white">Knowledge Ledger</CardTitle>
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mt-1">Found {documents.length} verified artifacts for the current cycle</CardDescription>
                        </div>
                        <Badge className="bg-rose-600 text-white border-0 text-[10px] font-black italic tracking-widest px-3 py-1 uppercase">Audited</Badge>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-slate-400 font-black italic">
                                <th className="px-8 py-5">Artifact Description</th>
                                <th className="px-8 py-5">Project Entity</th>
                                <th className="px-8 py-5">Categorization</th>
                                <th className="px-8 py-5">Audit Status</th>
                                <th className="px-8 py-5 text-right">Interactions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {documents.map((doc) => (
                                <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center group-hover:bg-rose-500/10 group-hover:border-rose-500/30 transition-colors">
                                                <FileText className="w-6 h-6 text-slate-400 group-hover:text-rose-400 transition-colors" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black italic uppercase tracking-tighter text-white line-clamp-1">{doc.name}</p>
                                                <p className="text-[9px] font-black text-slate-500 italic uppercase mt-1">{doc.size} • Encrypted AES-256</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-[10px] font-black italic uppercase text-slate-400 line-clamp-1">{doc.project}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`text-[9px] font-black italic uppercase px-3 py-1 rounded-lg ${typeColors[doc.type] || 'bg-slate-500/15 text-slate-300 border border-slate-500/30'}`}>
                                            {doc.type}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`text-[9px] font-black italic px-3 py-1 rounded-full uppercase tracking-tighter ${
                                            doc.status === 'VERIFIED'
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                        }`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Footer */}
            <div className="flex justify-center pt-4">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-800/50 border border-white/10 rounded-full">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-black text-slate-400 italic uppercase tracking-widest">Institutional Hash: 8E2A7...F91C • SECURED BY ARTIFACT SHIELD</span>
                </div>
            </div>
        </div>
    );
};

export default FacultyDocuments;

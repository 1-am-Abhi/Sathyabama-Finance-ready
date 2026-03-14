import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Upload, FileText, CheckCircle2, Clock, Search, Filter, Download, MoreVertical, ShieldCheck, History, Database, ArrowRight, ExternalLink } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';

const FacultyDocuments = () => {
    const { setLayout } = useLayout();

    React.useEffect(() => {
        setLayout("Digital Archive Governance", "Immutable storage for institutional research compliance");
    }, [setLayout]);

    const documents = [
        { id: 1, name: 'Project_Proposal_AI_Healthcare.pdf', project: 'AI Healthcare Diagnostics', type: 'PROPOSAL', date: '10 Jan 2024', size: '2.4 MB', status: 'VERIFIED' },
        { id: 2, name: 'Equipment_Invoice_098.pdf', project: 'AI Healthcare Diagnostics', type: 'INVOICE', date: '22 Jan 2024', size: '1.1 MB', status: 'PENDING' },
        { id: 3, name: 'Monthly_Report_Jan.docx', project: 'ML Predictive Analytics', type: 'REPORT', date: '01 Feb 2024', size: '4.5 MB', status: 'VERIFIED' },
        { id: 4, name: 'Utilisation_Cert_Phase1.pdf', project: 'IoT-Based Smart Campus', type: 'CERTIFICATE', date: '15 Dec 2023', size: '1.8 MB', status: 'VERIFIED' },
        { id: 5, name: 'Ethics_Committee_Approval.pdf', project: 'AI Healthcare Diagnostics', type: 'COMPLIANCE', date: '05 Jan 2024', size: '845 KB', status: 'VERIFIED' },
    ];

    return (
        <div className="min-h-full">

            <div className="p-8 max-w-7xl mx-auto">

                {/* Header & Global Search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div>
                        <h2 className="text-4xl font-bold text-blue-900 tracking-tight">Digital Archive</h2>
                        <p className="text-sm text-gray-400 font-medium mt-2 flex items-center">
                            <Database className="w-3 h-3 mr-2 text-blue-600" /> Sathyabama Institutional Knowledge Base
                        </p>
                    </div>
                    <div className="flex items-center gap-4 bg-white p-2.5 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50">
                        <div className="relative group">
                            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Execute document search..."
                                className="pl-11 pr-6 py-3 bg-gray-50 border-0 rounded-[1.25rem] text-xs font-medium outline-none focus:ring-4 focus:ring-blue-50 w-72 transition-all placeholder:text-gray-300"
                            />
                        </div>
                        <Button className="h-12 px-8 bg-indigo-900 hover:bg-black text-white font-bold text-xs shadow-xl shadow-indigo-100/50 rounded-2xl flex items-center gap-3">
                            <Upload className="w-4 h-4" /> Secure Upload
                        </Button>
                    </div>
                </div>

                {/* Meta Intelligence Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <Card className="border-0 shadow-lg shadow-blue-100/50 bg-indigo-900 text-white rounded-[2.5rem] overflow-hidden group relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent"></div>
                        <CardContent className="p-10 relative z-10 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 group-hover:rotate-12 transition-transform">
                                    <ShieldCheck className="w-7 h-7" />
                                </div>
                                <Badge className="bg-emerald-500 text-white border-0 font-bold text-xs px-3 uppercase">Audited</Badge>
                            </div>
                            <div className="mt-12">
                                <p className="text-xs font-bold text-blue-200/50 mb-2">Verified Artifacts</p>
                                <h3 className="text-5xl font-bold tracking-tight">12.5k</h3>
                                <p className="text-xs font-medium text-blue-100/40 mt-6 flex items-center gap-2">
                                    <History className="w-3.5 h-3.5" /> Synchronized with central registry
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-white rounded-[2.5rem] overflow-hidden group">
                        <CardContent className="p-10 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                                    <Clock className="w-7 h-7" />
                                </div>
                                <Badge className="bg-orange-50 text-orange-700 font-bold text-xs px-3 uppercase border border-orange-100">Action Required</Badge>
                            </div>
                            <div className="mt-12 text-gray-900">
                                <p className="text-xs font-bold text-gray-400 mb-2">Invoices Pending</p>
                                <h3 className="text-5xl font-bold tracking-tight">03</h3>
                                <button className="text-xs font-bold text-blue-600 mt-6 flex items-center gap-2 hover:gap-3 transition-all">
                                    Resolve Now <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-white rounded-[2.5rem] overflow-hidden group">
                        <CardContent className="p-10 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <FileText className="w-7 h-7" />
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400">Archive Growth</p>
                                    <p className="text-sm font-bold text-blue-600">+12% MoM</p>
                                </div>
                            </div>
                            <div className="mt-10">
                                <div className="flex justify-between items-end mb-4">
                                    <h4 className="text-xs font-bold text-gray-900">Encrypted Capacity</h4>
                                    <span className="text-2xl font-bold tracking-tight text-gray-900">45.2 <span className="text-gray-300 text-sm">GB</span></span>
                                </div>
                                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full w-[45%] rounded-full shadow-lg shadow-blue-100"></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Master Ledger Table */}
                <Card className="border-0 shadow-2xl shadow-gray-200/50 bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="p-10 border-b border-gray-50 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold text-gray-900">Knowledge Ledger</CardTitle>
                            <p className="text-xs text-gray-400 font-medium mt-1">Found 05 indexed artifacts for FY 23-24</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl text-gray-400 hover:bg-gray-50"><Filter className="w-4 h-4" /></Button>
                            <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl text-gray-400 hover:bg-gray-50"><MoreVertical className="w-4 h-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-50">
                                        <th className="px-10 py-6 text-left text-xs font-bold text-gray-400">Artifact Details</th>
                                        <th className="px-10 py-6 text-left text-xs font-bold text-gray-400">Parent Project</th>
                                        <th className="px-10 py-6 text-left text-xs font-bold text-gray-400">Categorization</th>
                                        <th className="px-10 py-6 text-left text-xs font-bold text-gray-400">Archived Date</th>
                                        <th className="px-10 py-6 text-left text-xs font-bold text-gray-400">Audit Status</th>
                                        <th className="px-10 py-6 text-right text-xs font-bold text-gray-400">Interactions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {documents.map((doc) => (
                                        <tr key={doc.id} className="group hover:bg-blue-50/20 transition-all font-medium">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:shadow-lg transition-all group-hover:text-blue-600 text-gray-300">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 group-hover:text-blue-900 transition-colors">{doc.name}</p>
                                                        <p className="text-xs font-medium text-gray-400 mt-1">{doc.size} • Encrypted AES-256</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <p className="text-xs font-medium text-gray-500 max-w-[180px] leading-relaxed">{doc.project}</p>
                                            </td>
                                            <td className="px-10 py-6">
                                                <Badge className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1 border-0">{doc.type}</Badge>
                                            </td>
                                            <td className="px-10 py-6">
                                                <p className="text-xs font-bold text-gray-500">{doc.date}</p>
                                            </td>
                                            <td className="px-10 py-6">
                                                <Badge className={`text-xs font-bold px-4 py-1.5 rounded-full border-0 ${doc.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                                                    }`}>
                                                    {doc.status === 'VERIFIED' ? <ShieldCheck className="w-3 h-3 mr-2 inline" /> : <Clock className="w-3 h-3 mr-2 inline" />}
                                                    {doc.status}
                                                </Badge>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <Button variant="ghost" className="w-10 h-10 p-0 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-white shadow-none hover:shadow-sm border-0"><Download className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" className="w-10 h-10 p-0 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-white shadow-none hover:shadow-sm border-0"><ExternalLink className="w-4 h-4" /></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-16 text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-gray-50 rounded-full border border-gray-100">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-bold text-gray-400">Institutional Hash: 8E2A7...F91C • All artifacts secured</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacultyDocuments;

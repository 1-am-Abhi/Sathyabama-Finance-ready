import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Sparkles, Send, FileText, Download, Library, Search, Target, TrendingUp, Brain } from 'lucide-react';
import AIResultModal from '../../components/shared/AIResultModal';
import { generateFullProposal, getFundingRecommendations } from '../../services/aiService';

const AIProposalGenerator = () => {
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [aiModal, setAiModal] = useState({ open: false, loading: false, result: null });

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setAiModal({ open: true, loading: true, result: null });
        const result = await generateFullProposal(topic);
        setAiModal({ open: true, loading: false, result: result });
    };

    const handleRecommendations = async () => {
        if (!topic.trim()) return;
        setAiModal({ open: true, loading: true, result: null });
        const result = await getFundingRecommendations(topic);
        setAiModal({ open: true, loading: false, result: result });
    };

    const suggestedTopics = [
        "Blockchain for Rural Healthcare",
        "AI-Driven Smart Irrigation",
        "Next-gen Solar Cell Efficiency",
        "Quantum Cryptography in FinTech"
    ];

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-950">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-500/20 rounded-xl">
                                <Sparkles className="w-6 h-6 text-indigo-500" />
                            </div>
                            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-slate-800 dark:text-white">AI Proposal Assistant</h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-xs">Accelerate your research journey with intelligent insights</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Input Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-0 shadow-lg dark:bg-slate-900 rounded-[2rem] overflow-hidden ring-1 ring-slate-200 dark:ring-white/5">
                            <CardHeader className="bg-slate-50 dark:bg-white/5 border-b dark:border-white/5 p-6">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Research Focus</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">What is your research idea?</label>
                                    <div className="relative">
                                        <textarea
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            placeholder="Example: Developing a low-cost IoT-based water purification system for rural areas..."
                                            className="w-full h-32 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none dark:text-white"
                                        />
                                        <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-400 uppercase">AI-Ready Input</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    <Button 
                                        onClick={handleGenerate}
                                        disabled={!topic.trim()}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black italic uppercase tracking-tighter rounded-xl h-14 shadow-lg shadow-indigo-500/20 group"
                                    >
                                        <Brain className="w-5 h-5 mr-2 group-hover:animate-pulse" /> Draft Proposal Outline
                                    </Button>
                                    <Button 
                                        onClick={handleRecommendations}
                                        disabled={!topic.trim()}
                                        variant="outline"
                                        className="border-2 border-indigo-600/30 text-indigo-500 hover:bg-indigo-50 font-black italic uppercase tracking-tighter rounded-xl h-14"
                                    >
                                        <Target className="w-5 h-5 mr-2" /> Find Funding Agencies
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Suggestions */}
                        <div className="flex flex-wrap gap-2">
                            {suggestedTopics.map((t, i) => (
                                <button
                                    key={i}
                                    onClick={() => setTopic(t)}
                                    className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-indigo-500 hover:text-indigo-500 transition-all shadow-sm"
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar Stats/Info */}
                    <div className="space-y-6">
                        <Card className="border-0 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-[2rem] overflow-hidden shadow-xl">
                            <CardContent className="p-8 space-y-6 relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black italic tracking-tighter uppercase">AI Capability</h3>
                                    <p className="text-indigo-100 text-xs font-medium uppercase tracking-widest leading-relaxed">Our models are trained on academic frameworks to ensure high-quality outlines.</p>
                                </div>
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center justify-between border-b border-white/20 pb-2">
                                        <span className="text-[10px] font-black uppercase">Technical Merit</span>
                                        <span className="text-sm font-black italic">98%</span>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-white/20 pb-2">
                                        <span className="text-[10px] font-black uppercase">Citation Accuracy</span>
                                        <span className="text-sm font-black italic">H-Index Ready</span>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-white/20 pb-2">
                                        <span className="text-[10px] font-black uppercase">Institutional Sync</span>
                                        <span className="text-sm font-black italic">Enabled</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pro Tips</h4>
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Keywords increase agency matching precision.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Result Modal */}
            <AIResultModal
                open={aiModal.open}
                loading={aiModal.loading}
                result={aiModal.result}
                onClose={() => setAiModal({ ...aiModal, open: false })}
            />
        </div>
    );
};

export default AIProposalGenerator;

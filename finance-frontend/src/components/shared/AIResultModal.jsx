import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Brain, Sparkles, AlertTriangle, CheckCircle, X } from 'lucide-react';

const AIResultModal = ({ open, loading, result, onClose }) => {
    const [typedText, setTypedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!loading && result?.summary) {
            setTypedText('');
            setCurrentIndex(0);
        }
    }, [loading, result]);

    useEffect(() => {
        if (!loading && result?.summary && currentIndex < result.summary.length) {
            const timeout = setTimeout(() => {
                setTypedText(prev => prev + result.summary[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, 10);
            return () => clearTimeout(timeout);
        }
    }, [loading, result, currentIndex]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <Card className="max-w-3xl w-full border-0 shadow-2xl bg-slate-900 overflow-hidden ring-1 ring-white/10">
                <CardHeader className="border-b border-white/5 bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-3 text-white">
                        <div className="p-2 bg-indigo-500/20 rounded-xl ring-1 ring-indigo-500/30">
                            <Brain className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold italic tracking-tighter uppercase mr-2 flex items-center">
                                Research Intelligence
                            </CardTitle>
                            <CardDescription className="text-slate-400 text-xs italic font-medium uppercase tracking-widest mt-0.5">Automated Intelligence Report</CardDescription>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full h-8 w-8">
                        <X className="w-5 h-5" />
                    </Button>
                </CardHeader>

                <CardContent className="p-8 max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-6">
                            <div className="relative">
                                <div className="w-20 h-20 border-t-2 border-r-2 border-indigo-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Brain className="w-10 h-10 text-indigo-400 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-white font-black italic tracking-tighter uppercase text-lg animate-pulse">Analyzing Data...</p>
                                <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">Please wait while the AI processes your request</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                            {/* Main Typing Summary */}
                            <div className="bg-white/5 rounded-[1.5rem] p-6 border border-white/5 relative group transition-all hover:bg-white/[0.07]">
                                <div className="absolute -top-3 left-6">
                                    <Badge className="bg-indigo-500 text-white border-0 text-[10px] font-black italic uppercase tracking-tighter flex items-center gap-1.5 shadow-lg shadow-indigo-500/20">
                                        <Sparkles className="w-3 h-3" /> {result?.title || 'Report Summary'}
                                    </Badge>
                                </div>
                                <p className="text-slate-200 text-sm leading-relaxed font-medium italic min-h-[4rem]">
                                    {typedText}
                                    <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse" />
                                </p>
                            </div>

                            {/* 1. Key Metrics Grid */}
                            {result?.keyPoints && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {result.keyPoints.map((point, i) => (
                                        <div key={i} className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 group hover:border-indigo-500/30 transition-all">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">{point.label}</p>
                                            <p className="text-lg font-black italic tracking-tighter text-white uppercase">{point.value}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 2. Risk Analysis Specific Details */}
                            {result?.type === 'risk' && (
                                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-amber-400">Security & Feasibility Risk</h4>
                                        <Badge className={`${result.riskLevel === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'} text-slate-900 font-black italic uppercase tracking-tighter text-[10px]`}>{result.riskLevel} RISK</Badge>
                                    </div>
                                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full" style={{ width: result.riskScore }} />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <span>Safe</span>
                                        <span>Extreme ({result.riskScore})</span>
                                    </div>
                                </div>
                            )}

                            {/* 3. Prediction / Probability Specific */}
                            {result?.type === 'prediction' && (
                                <div className="bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 rounded-full border-4 border-fuchsia-500/20 flex items-center justify-center relative">
                                            <div className="absolute inset-0 border-t-4 border-fuchsia-500 rounded-full" style={{ transform: `rotate(${parseInt(result.approvalProbability) * 3.6}deg)` }}></div>
                                            <span className="text-2xl font-black italic text-white">{result.approvalProbability}</span>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-fuchsia-400">Grant Approval Forecast</h4>
                                            <p className="text-xs text-slate-300 italic">{result.impactPrediction}</p>
                                            <p className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-widest">{result.fundingPotential}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 4. Strengths, Weaknesses, Highlights */}
                            {(result?.strengths || result?.weaknesses || result?.highlights || result?.similarAreas) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(result.strengths || result.highlights) && (
                                        <div className="space-y-3">
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4" /> 
                                                {result.type === 'collaborators' ? 'Matched Researchers' : 'Strategic Strengths'}
                                            </h4>
                                            <ul className="space-y-2">
                                                {(result.strengths || result.highlights).map((s, i) => (
                                                    <li key={i} className="text-xs text-slate-300 font-medium italic flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" /> {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {(result.weaknesses || result.similarAreas) && (
                                        <div className="space-y-3">
                                            <h4 className={`text-[11px] font-black uppercase tracking-widest ${result.type === 'duplicate' ? 'text-blue-400' : 'text-amber-400'} flex items-center gap-2`}>
                                                {result.type === 'duplicate' ? <Brain className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                                {result.type === 'duplicate' ? 'Thematic Overlaps' : 'Potential Risks'}
                                            </h4>
                                            <ul className="space-y-2">
                                                {(result.weaknesses || result.similarAreas).map((w, i) => (
                                                    <li key={i} className="text-xs text-slate-300 font-medium italic flex items-center gap-2">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${result.type === 'duplicate' ? 'bg-blue-500/50' : 'bg-amber-500/50'}`} /> {w}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 5. Recommendation Footer */}
                            {result?.recommendation && (
                                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                                            <CheckCircle className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-indigo-400 leading-none mb-1">AI Recommendation</p>
                                            <p className="text-xs text-slate-200 font-bold italic">{result.recommendation}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Confidence Indicator */}
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {result?.confidence && (
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">AI Confidence Score</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${result.confidence}%` }} />
                                                </div>
                                                <span className="text-xs font-black italic text-indigo-400">{result.confidence}%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <Button onClick={onClose} className="bg-indigo-500 hover:bg-indigo-600 text-white font-black italic tracking-tighter uppercase text-xs px-8 rounded-xl h-10 shadow-lg shadow-indigo-500/20">
                                    Understood
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AIResultModal;


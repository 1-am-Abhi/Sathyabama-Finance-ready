import React from 'react';
import { CheckCircle2, Clock, Lock } from 'lucide-react';

const InstallmentStepper = ({ installments, currentPhase }) => {
    return (
        <div className="relative">
            <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-100 -z-0"></div>
            <div className="flex justify-between relative z-10">
                {installments.map((inst, index) => {
                    const isReleased = inst.status === 'RELEASED';
                    const isPending = inst.status === 'PENDING';

                    return (
                        <div key={index} className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm border-4 ${isReleased ? 'bg-emerald-600 border-emerald-50 text-white shadow-emerald-100' :
                                    isPending ? 'bg-blue-600 border-blue-50 text-white shadow-blue-100 animate-pulse' :
                                        'bg-white border-gray-50 text-gray-300'
                                }`}>
                                {isReleased ? <CheckCircle2 className="w-5 h-5" /> :
                                    isPending ? <Clock className="w-5 h-5" /> :
                                        <Lock className="w-4 h-4" />}
                            </div>
                            <div className="mt-4 text-center">
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${isReleased ? 'text-emerald-700' :
                                        isPending ? 'text-blue-700' :
                                            'text-gray-400'
                                    }`}>
                                    Phase 0{inst.phase}
                                </p>
                                <p className="text-[12px] font-bold text-gray-900 mt-1">₹{(inst.amount / 100000).toFixed(1)}L</p>
                                {inst.date && (
                                    <p className="text-[9px] text-gray-400 mt-1 font-medium">{inst.date}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InstallmentStepper;

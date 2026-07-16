import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { io } from 'socket.io-client';

const SystemStatus = () => {
    const [status, setStatus] = useState('Checking...');
    const [indicator, setIndicator] = useState('amber');
    const [dataState, setDataState] = useState('unknown');
    const [socketConnected, setSocketConnected] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await apiClient.get('/status');
                if (response.data.success) {
                    const sys = response.data.data;
                    setStatus(sys.status === 'HEALTHY' ? 'Synced' : 'Degraded');
                    setIndicator(sys.status === 'HEALTHY' ? 'emerald' : 'amber');
                    setDataState(sys.loadTier === 'EMPTY' ? 'No Data' : 'Live');
                }
            } catch (error) {
                setStatus('Offline');
                setIndicator('red');
                setDataState('Error');
            }
        };

        const socket = io(process.env.REACT_APP_API_URL.replace(/\/api\/?$/, ''), {
            auth: { token: localStorage.getItem('token') },
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            setSocketConnected(true);
        });
        socket.on('connect_error', () => setSocketConnected(false));
        socket.on('disconnect', () => setSocketConnected(false));

        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check every 30s
        
        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, []);

    const colors = {
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/20'
    };

    return (
        <div className={`hidden lg:flex items-center gap-2 px-3 py-1 rounded-full border ${colors[indicator]} transition-all duration-500`}>
            <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-current animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest italic">{socketConnected ? 'Connected' : 'Syncing'}</span>
            <span className="w-px h-2 bg-current opacity-20 mx-1" />
            <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70 italic">{dataState}</span>
        </div>
    );
};


export default SystemStatus;

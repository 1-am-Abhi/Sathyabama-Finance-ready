import { useEffect, useRef } from 'react';
import socket from '../socket';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import apiClient from '../api/client';

/**
 * useFinanceSocket
 * Distributed-systems hardened real-time listener.
 * Includes Event Replay (Sync) for eventual consistency across reconnections.
 */
export default function useFinanceSocket(selectedFY) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const lastSyncRef = useRef(Date.now());

    useEffect(() => {
        if (!user || (user.role !== 'FINANCE_OFFICER' && user.role !== 'ADMIN')) {
            return;
        }

        // --- 1. Event Replay Mechanism (Sync) ---
        const performSync = async () => {
            try {
                const since = lastSyncRef.current;

                const res = await apiClient.get('/finance/sync', { params: { since } });
                const missedEvents = res.data?.data || [];

                if (missedEvents.length > 0) {
                    // Refresh the finance datasets for the active FY (targeted, not the whole cache)
                    queryClient.invalidateQueries({ queryKey: ['fundFlow', selectedFY] });
                    queryClient.invalidateQueries({ queryKey: ['pfms', selectedFY] });
                    queryClient.invalidateQueries({ queryKey: ['internships', selectedFY] });
                    queryClient.invalidateQueries({ queryKey: ['financeStats', selectedFY] });
                }
                
                lastSyncRef.current = Date.now();
            } catch (err) {
                console.error('[FinanceSync] Synchronization failed:', err.message);
            }
        };

        // --- 2. Connection Lifecycle Feedback ---
        const onConnect = () => {
            toast.success('✅ Reconnected to live financial stream');
            socket.emit('join-finance');
            performSync(); // Replay any events missed during downtime
        };

        const onDisconnect = (reason) => {
            if (reason === 'io server disconnect' || reason === 'transport close') {
                toast.error('⚠ Connection lost. Attempting to reconnect...');
            }
        };

        // --- 3. Throttled Invalidation Engine ---
        let debounceTimer;
        const triggerThrottledRefresh = (queryKey) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                queryClient.invalidateQueries({ queryKey });
                queryClient.invalidateQueries({ queryKey: ['financeStats', selectedFY] });
                lastSyncRef.current = Date.now();
            }, 800);
        };

        // --- 4. Event Handler ---
        const onFinanceUpdate = (event) => {
            lastSyncRef.current = Date.now();

            switch (event.type) {
                case 'DISBURSEMENT':
                    toast.success(`₹${Number(event.amount).toLocaleString()} disbursed successfully`);
                    triggerThrottledRefresh(['fundFlow', selectedFY]);
                    break;

                case 'PFMS_UPDATE':
                    triggerThrottledRefresh(['pfms', selectedFY]);
                    break;

                case 'APPROVAL':
                    toast.info(`New Fund Request Approved: ${event.projectTitle || 'Record'}`);
                    triggerThrottledRefresh(['fundFlow', selectedFY]);
                    break;

                case 'STAGE_UPDATE':
                    triggerThrottledRefresh(['fundFlow', selectedFY]);
                    break;

                default:
                    triggerThrottledRefresh(['fundFlow', selectedFY]);
                    break;
            }
        };

        // --- 5. Registration ---
        socket.emit('join-finance');
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('finance:update', onFinanceUpdate);

        // --- 6. Cleanup ---
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('finance:update', onFinanceUpdate);
            clearTimeout(debounceTimer);
        };
    }, [selectedFY, user, queryClient]);
}

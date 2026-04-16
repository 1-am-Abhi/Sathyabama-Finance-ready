import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRoutes from './routes';
import { ProjectProvider } from './contexts/ProjectContext';
import { PipelineProvider } from './contexts/PipelineContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { Toaster, toast } from 'sonner';
import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SocketHandler = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    const socket = io(API_URL, {
      auth: {
        token: localStorage.getItem('token') || ''
      }
    });
    
    socket.on('notification', (data) => {

      toast.success(data.message || 'New notification received');
    });
    
    return () => socket.disconnect();
  }, [user]);
  
  return null;
};


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  useEffect(() => {
    // Check system preference or stored theme
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // One-time cleanup of old seeded localStorage data
    localStorage.removeItem('academicSupportData');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors closeButton />
      <AuthProvider>
        <NotificationProvider>
          <ProjectProvider>
            <PipelineProvider>
              <ErrorBoundary>
                <SocketHandler />
                <AppRoutes />
              </ErrorBoundary>
            </PipelineProvider>
          </ProjectProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

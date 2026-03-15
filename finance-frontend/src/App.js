import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRoutes from './routes';
import { ProjectProvider } from './contexts/ProjectContext';
import { seedAllData } from './utils/seedData';

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
    
    // Seed initial data
    seedAllData();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
        <ProjectProvider>
          <AppRoutes />
        </ProjectProvider>
    </QueryClientProvider>
  );
}

export default App;

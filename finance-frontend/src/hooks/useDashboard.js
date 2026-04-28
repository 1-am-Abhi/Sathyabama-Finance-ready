import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

export const useDashboard = (fy) => {
  return useQuery({
    queryKey: ['dashboard', fy],
    queryFn: async () => {
      const res = await api.get('/dashboard', { params: { fy } });
      return res.data.data;
    },
    staleTime: 10000
  });
};

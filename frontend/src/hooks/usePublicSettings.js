import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export default function usePublicSettings() {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api.get('/public/settings').then((response) => response.data),
    staleTime: 60000,
  });
  return data || {};
}

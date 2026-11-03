import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function useModuleAccess() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const query = useQuery({
    queryKey: ['module-access', user?.id],
    queryFn: () => api.get('/users/module-access').then((response) => response.data.disabledModules),
    enabled: Boolean(user && !isSuperAdmin),
    staleTime: 0,
  });

  return {
    disabledModules: isSuperAdmin ? [] : query.data || [],
    isLoading: !isSuperAdmin && query.isLoading,
    isError: !isSuperAdmin && query.isError,
  };
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

const AVAILABLE_WIDGETS = [
  { key: 'active_staff', label: 'Active Staff Card' },
  { key: 'registrations', label: 'Registrations Card' },
  { key: 'messages', label: 'Messages Card' },
  { key: 'products', label: 'Products Card' },
  { key: 'gallery', label: 'Gallery Card' },
];

export default function PermissionSettings() {
  const queryClient = useQueryClient();

  // 1. Fetch user roles
  const { data: roles = ['customer_attender', 'content_editor', 'manager'] } = useQuery({
    queryKey: ['custom-roles-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/roles');
        return Array.isArray(res.data) ? res.data : (res.data?.roles || ['customer_attender', 'content_editor', 'manager']);
      } catch {
        return ['customer_attender', 'content_editor', 'manager'];
      }
    },
  });

  // 2. Fetch permission records matrix
  const { data: databasePermissions = [] } = useQuery({
    queryKey: ['permissions-matrix'],
    queryFn: async () => {
      const res = await api.get('/admin/permissions');
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data?.permissions)) return res.data.permissions;
      if (Array.isArray(res.data?.data)) return res.data.data;
      return [];
    },
  });

  // 3. Mutate toggle state back to database live with optimistic cache updates
  const toggleMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/permissions/toggle', payload),
    onMutate: async (newPermission) => {
      await queryClient.cancelQueries({ queryKey: ['permissions-matrix'] });
      const previousPermissions = queryClient.getQueryData(['permissions-matrix']);

      // Optimistically update based on per-role row schema
      queryClient.setQueryData(['permissions-matrix'], (old = []) => {
        const existingIndex = old.findIndex(
          p => p.role === newPermission.role && p.widget_key === newPermission.widget_key
        );

        const targetValue = newPermission.is_visible ? 1 : 0;

        if (existingIndex > -1) {
          const updated = [...old];
          updated[existingIndex] = {
            ...updated[existingIndex],
            is_visible: targetValue
          };
          return updated;
        } else {
          return [
            ...old,
            {
              role: newPermission.role,
              widget_key: newPermission.widget_key,
              is_visible: targetValue
            }
          ];
        }
      });

      return { previousPermissions };
    },
    onError: (err, newPermission, context) => {
      if (context?.previousPermissions) {
        queryClient.setQueryData(['permissions-matrix'], context.previousPermissions);
      }
    },
    onSettled: () => {
      // Small timeout buffer to allow the remote database write to fully commit 
      // before refetching, preventing race-condition snap-backs.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['permissions-matrix'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }, 600);
    }
  });

  // Check if a widget is set to visible for a specific role
  const checkIsVisible = (role, widgetKey) => {
    const found = databasePermissions.find(
      p => p.role === role && p.widget_key === widgetKey
    );
    
    // If an explicit database record exists, strictly respect its value (0 or 1).
    // This allows all-off configurations to persist correctly without forced fallbacks.
    if (found !== undefined && found !== null && found.is_visible !== undefined && found.is_visible !== null) {
      return Number(found.is_visible) === 1 || found.is_visible === true;
    }
    
    // Default to true only if no record has ever been created or synced yet
    return true;
  };

  const isPending = toggleMutation.isPending || toggleMutation.isLoading;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="font-sans font-bold text-xl text-gray-900 mb-1">Dashboard Component Controller</h2>
      <p className="text-gray-500 text-sm mb-6">Manage what elements custom staff roles can view on their main dashboards.</p>

      <div className="space-y-6">
        {roles.filter(r => r !== 'super_admin').map((roleName) => (
          <div key={roleName} className="border-b border-gray-100 pb-6 last:border-0">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
              Role: {roleName.replace(/_/g, ' ')}
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              {AVAILABLE_WIDGETS.map((widget) => {
                const visible = checkIsVisible(roleName, widget.key);
                return (
                  <div key={widget.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-700 font-medium">{widget.label}</span>
                    <button
                      type="button"
                      disabled={isPending}
                      aria-label={`Toggle ${widget.label} for ${roleName.replace(/_/g, ' ')}`}
                      onClick={() => toggleMutation.mutate({
                        role: roleName,
                        widget_key: widget.key,
                        is_visible: !visible
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        visible ? 'bg-blue-600' : 'bg-gray-300'
                      } ${isPending ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        visible ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

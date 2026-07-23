import React from 'react';
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

  // 1. Fetch user roles & extract string keys if backend returns object arrays
  const { data: roles = ['customer_attender', 'content_editor', 'manager'] } = useQuery({
    queryKey: ['custom-roles-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/roles');
        const raw = Array.isArray(res.data) ? res.data : (res.data?.roles || []);
        
        // Convert [{ id: 'admin' }] or strings to uniform string array
        const extracted = raw.map(r => (typeof r === 'object' && r !== null ? r.id || r.name || r.label : String(r)));
        return extracted.length > 0 ? extracted : ['customer_attender', 'content_editor', 'manager'];
      } catch {
        return ['customer_attender', 'content_editor', 'manager'];
      }
    },
  });

  // 2. Fetch permission records matrix from database
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

  // 3. Mutate toggle state back to backend with array-based updates
  const toggleMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/permissions/toggle', payload),
    onMutate: async ({ widget_key, roleKey, targetState }) => {
      await queryClient.cancelQueries({ queryKey: ['permissions-matrix'] });
      const previousPermissions = queryClient.getQueryData(['permissions-matrix']);

      // Optimistically update widget's allowed_roles array
      queryClient.setQueryData(['permissions-matrix'], (old = []) => {
        return old.map((w) => {
          if (w.widget_key !== widget_key) return w;
          
          const currentRoles = Array.isArray(w.allowed_roles) ? w.allowed_roles : [];
          const newRoles = targetState
            ? [...new Set([...currentRoles, roleKey])]
            : currentRoles.filter(r => r !== roleKey);

          return {
            ...w,
            allowed_roles: newRoles,
            is_visible: newRoles.length > 0
          };
        });
      });

      return { previousPermissions };
    },
    onError: (err, variables, context) => {
      if (context?.previousPermissions) {
        queryClient.setQueryData(['permissions-matrix'], context.previousPermissions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  // Check if a widget is set to visible for a specific role
  const checkIsVisible = (roleKey, widgetKey) => {
    const found = databasePermissions.find(p => p.widget_key === widgetKey);
    if (!found) return true; // Default to visible if no DB rule exists yet
    
    const allowedRoles = Array.isArray(found.allowed_roles) ? found.allowed_roles : [];
    return allowedRoles.includes(roleKey);
  };

  // Handle toggle click
  const handleToggle = (roleKey, widget) => {
    const isCurrentlyVisible = checkIsVisible(roleKey, widget.key);
    const targetState = !isCurrentlyVisible;

    const existingWidget = databasePermissions.find(p => p.widget_key === widget.key);
    const currentRoles = existingWidget && Array.isArray(existingWidget.allowed_roles)
      ? existingWidget.allowed_roles
      : roles;

    const updatedRoles = targetState
      ? [...new Set([...currentRoles, roleKey])]
      : currentRoles.filter(r => r !== roleKey);

    toggleMutation.mutate({
      widget_key: widget.key,
      label: widget.label,
      is_visible: updatedRoles.length > 0,
      allowed_roles: updatedRoles,
      roleKey,
      targetState
    });
  };

  const isPending = toggleMutation.isPending;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="font-sans font-bold text-xl text-gray-900 mb-1">Dashboard Component Controller</h2>
      <p className="text-gray-500 text-sm mb-6">Manage what elements custom staff roles can view on their main dashboards.</p>

      <div className="space-y-6">
        {roles.filter(r => r !== 'super_admin').map((roleKey) => (
          <div key={roleKey} className="border-b border-gray-100 pb-6 last:border-0">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
              Role: {String(roleKey).replace(/_/g, ' ')}
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              {AVAILABLE_WIDGETS.map((widget) => {
                const visible = checkIsVisible(roleKey, widget.key);
                return (
                  <div key={widget.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-700 font-medium">{widget.label}</span>
                    <button
                      type="button"
                      disabled={isPending}
                      aria-label={`Toggle ${widget.label} for ${String(roleKey).replace(/_/g, ' ')}`}
                      onClick={() => handleToggle(roleKey, widget)}
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

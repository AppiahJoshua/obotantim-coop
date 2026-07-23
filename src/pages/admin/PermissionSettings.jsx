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

  // 1. Fetch available roles (Normalizes objects like [{id: 'admin'}] or string arrays)
  const { data: roles = ['customer_attender', 'content_editor', 'manager'] } = useQuery({
    queryKey: ['custom-roles-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/roles');
        const rawData = Array.isArray(res.data) ? res.data : (res.data?.roles || []);
        
        // Extract string IDs if backend returned objects [{id: 'admin', label: 'Admin'}]
        const parsedRoles = rawData.map(r => (typeof r === 'object' && r !== null ? r.id || r.name : r));
        return parsedRoles.length > 0 ? parsedRoles : ['customer_attender', 'content_editor', 'manager'];
      } catch {
        return ['customer_attender', 'content_editor', 'manager'];
      }
    },
  });

  // 2. Fetch widget permission configurations from backend
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

  // 3. Mutate widget allowed_roles array live
  const toggleMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/permissions/toggle', payload),
    onMutate: async ({ widget_key, role, is_visible }) => {
      await queryClient.cancelQueries({ queryKey: ['permissions-matrix'] });
      const previousPermissions = queryClient.getQueryData(['permissions-matrix']);

      // Optimistically update the matching widget's allowed_roles array
      queryClient.setQueryData(['permissions-matrix'], (old = []) => {
        return old.map((widget) => {
          if (widget.widget_key !== widget_key) return widget;

          const currentRoles = Array.isArray(widget.allowed_roles) ? widget.allowed_roles : [];
          let updatedRoles;

          if (is_visible) {
            // Add role to allowed_roles if turning on
            updatedRoles = currentRoles.includes(role) ? currentRoles : [...currentRoles, role];
          } else {
            // Remove role from allowed_roles if turning off
            updatedRoles = currentRoles.filter(r => r !== role);
          }

          return {
            ...widget,
            allowed_roles: updatedRoles,
            is_visible: updatedRoles.length > 0
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
      // Invalidate queries directly without raw setTimeout timers
      queryClient.invalidateQueries({ queryKey: ['permissions-matrix'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  // Check if a widget's allowed_roles array includes the specified role
  const checkIsVisible = (role, widgetKey) => {
    const widget = databasePermissions.find(p => p.widget_key === widgetKey);
    
    // If no record exists yet, default to visible
    if (!widget) return true;

    const allowedRoles = Array.isArray(widget.allowed_roles) ? widget.allowed_roles : [];
    return allowedRoles.includes(role);
  };

  // Toggle handler for individual widget per role
  const handleToggle = (roleName, widget) => {
    const isCurrentlyVisible = checkIsVisible(roleName, widget.key);
    const existingWidget = databasePermissions.find(p => p.widget_key === widget.key);
    const currentRoles = existingWidget && Array.isArray(existingWidget.allowed_roles) 
      ? existingWidget.allowed_roles 
      : roles;

    let updatedRoles;
    if (isCurrentlyVisible) {
      updatedRoles = currentRoles.filter(r => r !== roleName);
    } else {
      updatedRoles = [...new Set([...currentRoles, roleName])];
    }

    toggleMutation.mutate({
      widget_key: widget.key,
      label: widget.label,
      is_visible: updatedRoles.length > 0,
      allowed_roles: updatedRoles,
      role: roleName // kept for optimistic update helper
    });
  };

  // Bulk toggle handler for "All On" / "All Off" per role
  const toggleAllForRole = (roleName, targetState) => {
    AVAILABLE_WIDGETS.forEach((widget) => {
      const isCurrentlyVisible = checkIsVisible(roleName, widget.key);
      if (isCurrentlyVisible !== targetState) {
        handleToggle(roleName, widget);
      }
    });
  };

  const isPending = toggleMutation.isPending;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="font-sans font-bold text-xl text-gray-900 mb-1">Dashboard Component Controller</h2>
      <p className="text-gray-500 text-sm mb-6">Manage what elements custom staff roles can view on their main dashboards.</p>

      <div className="space-y-6">
        {roles.filter(r => r !== 'super_admin').map((roleName) => (
          <div key={roleName} className="border-b border-gray-100 pb-6 last:border-0">
            
            {/* Header with All On / All Off bulk action controls */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Role: {String(roleName).replace(/_/g, ' ')}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => toggleAllForRole(roleName, true)}
                  className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  All On
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => toggleAllForRole(roleName, false)}
                  className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  All Off
                </button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {AVAILABLE_WIDGETS.map((widget) => {
                const visible = checkIsVisible(roleName, widget.key);
                return (
                  <div key={widget.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-700 font-medium">{widget.label}</span>
                    <button
                      type="button"
                      disabled={isPending}
                      aria-label={`Toggle ${widget.label} for ${String(roleName).replace(/_/g, ' ')}`}
                      onClick={() => handleToggle(roleName, widget)}
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

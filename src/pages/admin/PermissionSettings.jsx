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

        if (existingIndex > -1) {
          const updated = [...old];
          updated[existingIndex] = {
            ...updated[existingIndex],
            is_visible: newPermission.is_visible ? 1 : 0
          };
          return updated;
        } else {
          return [
            ...old,
            {
              role: newPermission.role,
              widget_key: newPermission.widget_key,
              is_visible: newPermission.is_visible ? 1 : 0
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
      // Add a small buffer timeout to let the remote database write fully commit 
      // before refetching, preventing race-condition snap-backs.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['permissions-matrix'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }, 600);
    }
  });

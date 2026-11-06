import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/notifications';
import Skeleton from '../ui/Skeleton';

const dateLabel = (value) => new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(value));

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: count = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => getNotifications({ limit: 10 }),
    enabled: open,
  });

  const refreshNotifications = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const readMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: refreshNotifications });
  const readAllMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refreshNotifications });

  const openNotification = (notification) => {
    if (!notification.read_at) readMutation.mutate(notification.id);
    setOpen(false);
    if (notification.action_url?.startsWith('/admin')) navigate(notification.action_url);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${count ? `, ${count} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-10 place-items-center rounded-lg text-gray-600 hover:bg-gray-100"
      >
        <Bell size={19} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs leading-5 text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-dark">Notifications</h2>
              <button
                type="button"
                disabled={!count || readAllMutation.isPending}
                onClick={() => readAllMutation.mutate()}
                className="inline-flex items-center gap-1.5 text-xs text-primary disabled:text-gray-400"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            </header>
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div role="status" aria-label="Loading notifications" className="space-y-3 px-4 py-5">
                  <span className="sr-only">Loading notifications</span>
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ) : data?.data?.length ? data.data.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  className={`block w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${item.read_at ? '' : 'bg-emerald-50/60'}`}
                >
                  <span className="flex items-start gap-2">
                    {!item.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                    <span className={item.read_at ? 'pl-4' : ''}>
                      <span className="block text-sm font-medium text-dark">{item.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-gray-600">{item.body}</span>
                      <time className="mt-1 block text-[11px] text-gray-400">{dateLabel(item.created_at)}</time>
                    </span>
                  </span>
                </button>
              )) : (
                <p className="px-4 py-8 text-center text-sm text-gray-500">You’re all caught up.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, FileText } from 'lucide-react';
import api from '../../api/axios';

// ── Synthesized Web Audio Chime Helper ───────────────────────
const playNotificationChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.15); // B5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(329.63, now); // E4

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch (e) {
    // Browsers block audio until user interaction occurs
  }
};

export default function AdminNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();
  const prevCountRef = useRef(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      try {
        const r = await api.get('/admin/notifications');
        return r.data;
      } catch (err) {
        if (err.response && err.response.status === 401) return [];
        throw err;
      }
    },
    refetchInterval: 15000, // Poll every 15 seconds
  });

  const markAsRead = useMutation({
    mutationFn: (id) => api.put(`/admin/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.put('/admin/notifications/mark-all-read'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  // Calculate current unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Watch for unread count increases and trigger audio chime
  useEffect(() => {
    if (prevCountRef.current === null) {
      prevCountRef.current = unreadCount;
    } else if (unreadCount > prevCountRef.current) {
      playNotificationChime();
      prevCountRef.current = unreadCount;
    } else {
      prevCountRef.current = unreadCount;
    }
  }, [unreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead.mutate(n.id)}
                  className={`p-4 transition-colors cursor-pointer flex gap-3 items-start ${
                    n.is_read ? 'bg-white opacity-75' : 'bg-blue-50/50 hover:bg-blue-50'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
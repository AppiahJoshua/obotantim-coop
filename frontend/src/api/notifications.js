import api from './axios';

export const getNotifications = async ({ limit = 10, unreadOnly = false } = {}) => {
  const { data } = await api.get('/notifications', { params: { limit, unreadOnly } });
  return data;
};

export const getUnreadNotificationCount = async () => {
  const { data } = await api.get('/notifications/unread-count');
  return data.count;
};

export const markNotificationRead = async (id) => {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
};

export const markAllNotificationsRead = async () => {
  const { data } = await api.patch('/notifications/read-all');
  return data;
};

export const getNotificationPreferences = async () => {
  const { data } = await api.get('/notifications/preferences');
  return data;
};

export const saveNotificationPreferences = async (preferences) => {
  const { data } = await api.put('/notifications/preferences', { preferences });
  return data;
};

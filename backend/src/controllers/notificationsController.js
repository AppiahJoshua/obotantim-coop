const pool = require('../config/database');
const auditLog = require('../utils/auditLog');
const { hasModuleAccess } = require('../utils/moduleAccess');
const preferenceEventTypes = ['registration.created', 'contact_message.created'];
const eventModules = {
  'registration.created': 'registrations',
  'contact_message.created': 'messages',
};

const getVisibleEventTypes = (user) => preferenceEventTypes
  .filter((eventType) => hasModuleAccess(user, eventModules[eventType]));

const list = async (req, res, next) => {
  try {
    const visibleEvents = getVisibleEventTypes(req.user);
    if (!visibleEvents.length) return res.json({ data: [], nextBeforeId: null });
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
    const beforeId = Number.parseInt(req.query.beforeId, 10);
    const conditions = ['recipient_user_id = ?'];
    const params = [req.user.id];

    if (req.query.unreadOnly === 'true') conditions.push('read_at IS NULL');
    if (Number.isSafeInteger(beforeId) && beforeId > 0) {
      conditions.push('id < ?');
      params.push(beforeId);
    }
    conditions.push(`event_type IN (${visibleEvents.map(() => '?').join(', ')})`);
    params.push(...visibleEvents);
    params.push(limit);

    const result = await pool.query(
      `SELECT id, event_type, title, body, entity_type, entity_id, action_url, created_at, read_at
       FROM notifications WHERE ${conditions.join(' AND ')}
       ORDER BY id DESC LIMIT ?`,
      params
    );
    res.json({ data: result.rows, nextBeforeId: result.rows.length === limit ? result.rows.at(-1).id : null });
  } catch (error) {
    next(error);
  }
};

const unreadCount = async (req, res, next) => {
  try {
    const visibleEvents = getVisibleEventTypes(req.user);
    if (!visibleEvents.length) return res.json({ count: 0 });
    const result = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications
       WHERE recipient_user_id = ? AND read_at IS NULL
         AND event_type IN (${visibleEvents.map(() => '?').join(', ')})`,
      [req.user.id, ...visibleEvents]
    );
    res.json({ count: Number(result.rows[0].count) });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const visibleEvents = getVisibleEventTypes(req.user);
    if (!visibleEvents.length) return res.status(404).json({ error: 'Notification not found.' });
    const result = await pool.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, NOW())
       WHERE id = ? AND recipient_user_id = ?
         AND event_type IN (${visibleEvents.map(() => '?').join(', ')})`,
      [req.params.id, req.user.id, ...visibleEvents]
    );
    if (!result.rowCount) {
      const existing = await pool.query(
        `SELECT id FROM notifications WHERE id = ? AND recipient_user_id = ?
         AND event_type IN (${visibleEvents.map(() => '?').join(', ')})`,
        [req.params.id, req.user.id, ...visibleEvents]
      );
      if (!existing.rows[0]) return res.status(404).json({ error: 'Notification not found.' });
    }
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const visibleEvents = getVisibleEventTypes(req.user);
    if (!visibleEvents.length) return res.json({ message: 'All notifications marked as read.' });
    await pool.query(
      `UPDATE notifications SET read_at = NOW()
       WHERE recipient_user_id = ? AND read_at IS NULL
         AND event_type IN (${visibleEvents.map(() => '?').join(', ')})`,
      [req.user.id, ...visibleEvents]
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

const getPreferences = async (req, res, next) => {
  try {
    const visibleEvents = getVisibleEventTypes(req.user);
    if (!visibleEvents.length) return res.json([]);
    const result = await pool.query(
      `SELECT event_type, in_app_enabled, email_enabled FROM admin_notification_preferences
       WHERE user_id = ? AND event_type IN (${visibleEvents.map(() => '?').join(', ')})`,
      [req.user.id, ...visibleEvents]
    );
    const saved = new Map(result.rows.map((row) => [row.event_type, row]));
    res.json(preferenceEventTypes.map((eventType) => {
      const preference = saved.get(eventType);
      return {
        event_type: eventType,
        in_app_enabled: preference ? Boolean(preference.in_app_enabled) : true,
        email_enabled: preference ? Boolean(preference.email_enabled) : true,
      };
    }));
  } catch (error) {
    next(error);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const preferences = req.body.preferences;
    const visibleEventTypes = getVisibleEventTypes(req.user);
    if (!Array.isArray(preferences) || preferences.some((preference) =>
      !visibleEventTypes.includes(preference.event_type)
      || typeof preference.in_app_enabled !== 'boolean'
      || typeof preference.email_enabled !== 'boolean'
    )) {
      return res.status(400).json({ error: 'Provide valid preferences for supported notification events.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const preference of preferences) {
        await connection.execute(
          `INSERT INTO admin_notification_preferences (user_id, event_type, in_app_enabled, email_enabled)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE in_app_enabled = VALUES(in_app_enabled), email_enabled = VALUES(email_enabled)`,
          [req.user.id, preference.event_type, preference.in_app_enabled, preference.email_enabled]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await auditLog(req, 'UPDATE_NOTIFICATION_PREFERENCES', 'admin_notification_preferences', req.user.id, { count: preferences.length });
    res.json({ message: 'Notification preferences updated.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { list, unreadCount, markRead, markAllRead, getPreferences, updatePreferences };
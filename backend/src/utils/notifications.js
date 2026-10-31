const pool = require('../config/database');

const enqueueEmail = async ({ recipientEmail, subject, templateName, payload, recipientUserId = null, eventType = null }) => {
  if (!recipientEmail) return;
  await pool.query(
    `INSERT INTO email_outbox (recipient_user_id, event_type, recipient_email, subject, template_name, payload_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [recipientUserId, eventType, recipientEmail, subject, templateName, JSON.stringify(payload)]
  );
};

const notifyStaff = async ({ eventType, title, body, entityType, entityId, actionUrl }) => {
  const staffResult = await pool.query(
    `SELECT u.id, u.email,
      COALESCE(p.in_app_enabled, TRUE) AS in_app_enabled,
      COALESCE(p.email_enabled, TRUE) AS email_enabled
     FROM admin_users u
     LEFT JOIN admin_notification_preferences p ON p.user_id = u.id AND p.event_type = ?
     WHERE u.is_active = TRUE`,
    [eventType]
  );
  const staff = staffResult.rows;
  if (!staff.length) return;

  const inAppRecipients = staff.filter((user) => Boolean(user.in_app_enabled));
  if (inAppRecipients.length) {
    const values = [];
    const placeholders = inAppRecipients.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
    inAppRecipients.forEach((user) => {
      values.push(user.id, eventType, title, body, entityType, entityId, actionUrl);
    });
    await pool.query(
      `INSERT INTO notifications
        (recipient_user_id, event_type, title, body, entity_type, entity_id, action_url)
       VALUES ${placeholders}`,
      values
    );
  }

  await Promise.all(staff.filter((user) => Boolean(user.email_enabled)).map((user) => enqueueEmail({
    recipientEmail: user.email,
    recipientUserId: user.id,
    eventType,
    subject: title,
    templateName: 'staff_alert',
    payload: { title, body, actionUrl },
  })));
};

const safelyNotifyStaff = async (event) => {
  try {
    await notifyStaff(event);
  } catch (error) {
    console.error('Staff notification enqueue failed:', error.message);
  }
};

const safelyEnqueueEmail = async (email) => {
  try {
    await enqueueEmail(email);
  } catch (error) {
    console.error('Email enqueue failed:', error.message);
  }
};

module.exports = { enqueueEmail, notifyStaff, safelyNotifyStaff, safelyEnqueueEmail };
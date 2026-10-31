const pool = require('../config/database');
const auditLog = require('../utils/auditLog');

const settingDefinitions = {
  contact_email: (value) => typeof value === 'string' && value.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  primary_phone: (value) => typeof value === 'string' && value.length <= 40,
  secondary_phone: (value) => typeof value === 'string' && value.length <= 40,
  maintenance_mode: (value) => typeof value === 'boolean',
};

const defaultPublicSettings = {
  contact_email: 'obotanimcoop.1@gmail.com',
  primary_phone: '0241 303 318',
  secondary_phone: '0243 141 539',
  maintenance_mode: false,
};

const isMissingSettingsTable = (error) => error.code === 'ER_NO_SUCH_TABLE';

const getSettings = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT setting_key, setting_value, updated_at FROM settings ORDER BY setting_key');
    const settings = {};
    for (const row of result.rows) {
      let value = row.setting_value;
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch { /* retain stored scalar string */ }
      }
      settings[row.setting_key] = value;
    }
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const entries = Object.entries(req.body.settings || {});
    if (!entries.length || entries.some(([key, value]) => !settingDefinitions[key] || !settingDefinitions[key](value))) {
      return res.status(400).json({ error: 'Provide supported settings with valid values.' });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const [key, value] of entries) {
        await connection.execute(
          `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
          [key, JSON.stringify(value)]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    await auditLog(req, 'UPDATE_SETTINGS', 'settings', null, { keys: entries.map(([key]) => key) });
    res.json({ message: 'Settings updated.' });
  } catch (error) {
    next(error);
  }
};

const getPublicSettings = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT setting_key, setting_value FROM settings
       WHERE setting_key IN ('contact_email', 'primary_phone', 'secondary_phone', 'maintenance_mode')`
    );
    const settings = { ...defaultPublicSettings };
    for (const row of result.rows) {
      let value = row.setting_value;
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch { /* retain stored scalar string */ }
      }
      settings[row.setting_key] = value;
    }
    res.json(settings);
  } catch (error) {
    if (isMissingSettingsTable(error)) {
      console.warn('Settings table is missing. Run `npm run migrate:notifications` from backend to enable saved settings.');
      return res.json(defaultPublicSettings);
    }
    next(error);
  }
};

module.exports = { getSettings, updateSettings, getPublicSettings };

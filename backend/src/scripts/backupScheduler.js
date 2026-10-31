const cron = require('node-cron');
const { backupDatabase } = require('./backupDatabase');

const schedule = process.env.BACKUP_CRON || '0 2 * * *';
if (!cron.validate(schedule)) throw new Error('BACKUP_CRON is not a valid cron expression.');

cron.schedule(schedule, () => {
  backupDatabase().catch((error) => console.error(`Scheduled backup failed: ${error.message}`));
});
console.log(`Daily backup scheduler active (${schedule}).`);

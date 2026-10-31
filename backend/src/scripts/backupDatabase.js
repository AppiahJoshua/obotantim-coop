const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Transform, pipeline } = require('stream');
const { promisify } = require('util');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pipelineAsync = promisify(pipeline);
const backupDirectory = process.env.BACKUP_DIRECTORY || path.join(__dirname, '..', '..', 'backups');

const getKey = () => {
  const value = process.env.BACKUP_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error('BACKUP_ENCRYPTION_KEY must be 64 hexadecimal characters.');
  return Buffer.from(value, 'hex');
};

const encryptedStream = (cipher) => new Transform({
  transform(chunk, encoding, callback) {
    try { callback(null, cipher.update(chunk)); } catch (error) { callback(error); }
  },
  flush(callback) {
    try {
      const final = cipher.final();
      if (final.length) this.push(final);
      this.push(cipher.getAuthTag());
      callback();
    } catch (error) { callback(error); }
  },
});

async function removeExpiredBackups() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const files = await fs.promises.readdir(backupDirectory);
  await Promise.all(files.filter((file) => file.endsWith('.sql.gz.enc')).map(async (file) => {
    const fullPath = path.join(backupDirectory, file);
    const info = await fs.promises.stat(fullPath);
    if (info.mtimeMs < cutoff) await fs.promises.unlink(fullPath);
  }));
}

async function backupDatabase() {
  const required = ['MYSQL_USER', 'MYSQL_DATABASE'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing database configuration: ${missing.join(', ')}`);
  await fs.promises.mkdir(backupDirectory, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(backupDirectory, `${process.env.MYSQL_DATABASE}-${timestamp}.sql.gz.enc`);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const output = fs.createWriteStream(outputPath, { flags: 'wx' });
  output.write(Buffer.from(`OBOTANTIM_BACKUP_V1:${iv.toString('hex')}:`, 'ascii'));

  const dump = spawn(process.env.MYSQLDUMP_PATH || 'mysqldump', [
    '--single-transaction', '--routines', '--events', '--triggers',
    '--host', process.env.MYSQL_HOST || 'localhost',
    '--port', String(process.env.MYSQL_PORT || 3306),
    '--user', process.env.MYSQL_USER,
    process.env.MYSQL_DATABASE,
  ], {
    env: { ...process.env, MYSQL_PWD: process.env.MYSQL_PASSWORD || '' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let stderr = '';
  dump.stderr.setEncoding('utf8');
  dump.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
  const exitResult = new Promise((resolve, reject) => {
    dump.once('error', reject);
    dump.once('close', (code) => code === 0 ? resolve() : reject(new Error(`mysqldump exited ${code}: ${stderr.trim()}`)));
  });

  try {
    await Promise.all([
      pipelineAsync(dump.stdout, zlib.createGzip({ level: 9 }), encryptedStream(cipher), output),
      exitResult,
    ]);
    await removeExpiredBackups();
    console.log(`Encrypted database backup created: ${outputPath}`);
    return outputPath;
  } catch (error) {
    dump.kill();
    output.destroy();
    await fs.promises.unlink(outputPath).catch(() => {});
    throw error;
  }
}

if (require.main === module) {
  backupDatabase().catch((error) => {
    console.error(`Database backup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { backupDatabase, removeExpiredBackups };

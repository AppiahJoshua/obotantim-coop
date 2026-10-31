const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Transform, pipeline } = require('stream');
const { promisify } = require('util');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pipelineAsync = promisify(pipeline);
const MAGIC = 'OBOTANTIM_BACKUP_V1:';

const getKey = () => {
  const value = process.env.BACKUP_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error('BACKUP_ENCRYPTION_KEY must be 64 hexadecimal characters.');
  return Buffer.from(value, 'hex');
};

class AuthenticatedDecryptStream extends Transform {
  constructor(key, iv) {
    super();
    this.ciphertextTail = Buffer.alloc(0);
    this.decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  }
  _transform(chunk, encoding, callback) {
    const combined = Buffer.concat([this.ciphertextTail, chunk]);
    const safeLength = Math.max(0, combined.length - 16);
    this.ciphertextTail = combined.subarray(safeLength);
    try {
      if (safeLength) this.push(this.decipher.update(combined.subarray(0, safeLength)));
      callback();
    } catch (error) { callback(error); }
  }
  _flush(callback) {
    try {
      if (this.ciphertextTail.length !== 16) throw new Error('Backup authentication tag is missing or truncated.');
      this.decipher.setAuthTag(this.ciphertextTail);
      this.push(this.decipher.final());
      callback();
    } catch (error) { callback(error); }
  }
}

async function restoreDatabase(filePath) {
  if (process.env.RESTORE_CONFIRM !== 'YES') throw new Error('Set RESTORE_CONFIRM=YES after verifying the target database; restore overwrites database contents.');
  if (!process.env.MYSQL_DATABASE || !process.env.MYSQL_USER) throw new Error('MYSQL_DATABASE and MYSQL_USER are required.');
  const fullPath = path.resolve(filePath || '');
  if (!filePath || !fs.existsSync(fullPath)) throw new Error('Pass the encrypted backup file path as the first argument.');

  const file = await fs.promises.open(fullPath, 'r');
  const headerLength = Buffer.byteLength(MAGIC) + 24 + 1;
  const header = Buffer.alloc(headerLength);
  const { bytesRead } = await file.read(header, 0, headerLength, 0);
  await file.close();
  const headerText = header.subarray(0, bytesRead).toString('ascii');
  const match = headerText.match(/^OBOTANTIM_BACKUP_V1:([a-f0-9]{24}):$/);
  if (!match) throw new Error('Unrecognized backup format.');

  const mysql = spawn(process.env.MYSQL_PATH || 'mysql', [
    '--host', process.env.MYSQL_HOST || 'localhost',
    '--port', String(process.env.MYSQL_PORT || 3306),
    '--user', process.env.MYSQL_USER,
    process.env.MYSQL_DATABASE,
  ], { env: { ...process.env, MYSQL_PWD: process.env.MYSQL_PASSWORD || '' }, stdio: ['pipe', 'inherit', 'pipe'], windowsHide: true });

  let stderr = '';
  mysql.stderr.setEncoding('utf8');
  mysql.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
  const mysqlExit = new Promise((resolve, reject) => {
    mysql.once('error', reject);
    mysql.once('close', (code) => code === 0 ? resolve() : reject(new Error(`mysql restore exited ${code}: ${stderr.trim()}`)));
  });
  await Promise.all([
    pipelineAsync(
      fs.createReadStream(fullPath, { start: headerLength }),
      new AuthenticatedDecryptStream(getKey(), Buffer.from(match[1], 'hex')),
      zlib.createGunzip(),
      mysql.stdin
    ),
    mysqlExit,
  ]);
  console.log(`Backup restored to database ${process.env.MYSQL_DATABASE}.`);
}

restoreDatabase(process.argv[2]).catch((error) => {
  console.error(`Restore failed: ${error.message}`);
  process.exitCode = 1;
});

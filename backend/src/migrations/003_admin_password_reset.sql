ALTER TABLE admin_users
  ADD COLUMN reset_token_hash VARCHAR(255) NULL,
  ADD COLUMN reset_token_expires_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  recipient_user_id INT NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body VARCHAR(500) NOT NULL,
  entity_type VARCHAR(40),
  entity_id INT,
  action_url VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  KEY idx_notifications_user_unread (recipient_user_id, read_at, created_at),
  CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id)
    REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_notification_preferences (
  user_id INT NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, event_type),
  CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id)
    REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_outbox (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  recipient_user_id INT NULL,
  event_type VARCHAR(80) NULL,
  recipient_email VARCHAR(254) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template_name VARCHAR(80) NOT NULL,
  payload_json JSON NOT NULL,
  status ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  KEY idx_email_outbox_ready (status, next_attempt_at, id),
  KEY idx_email_outbox_processing (status, processed_at),
  CONSTRAINT fk_email_outbox_user FOREIGN KEY (recipient_user_id)
    REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
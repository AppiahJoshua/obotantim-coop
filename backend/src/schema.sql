-- Obotantim Cooperative MySQL schema
-- Run: mysql -u user -p obotantim_coop < schema.sql

CREATE TABLE IF NOT EXISTS admin_users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  reset_token_hash VARCHAR(255) NULL,
  reset_token_expires_at DATETIME NULL,
  mfa_secret VARCHAR(255) NULL,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  token_version INT NOT NULL DEFAULT 0,
  disabled_modules JSON NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'content_editor',
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_admin_users_role CHECK (role IN ('super_admin', 'manager', 'content_editor'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(100) DEFAULT 'piggy-bank',
  interest_rate VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_products_category CHECK (category IN ('savings', 'loans'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  caption VARCHAR(255), image_url VARCHAR(500) NOT NULL, public_id VARCHAR(255),
  category VARCHAR(50) DEFAULT 'general', is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS registrations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tracking_code CHAR(32) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL, phone VARCHAR(20) NOT NULL, email VARCHAR(100),
  ghana_card VARCHAR(50), occupation VARCHAR(100), address TEXT,
  service_type VARCHAR(50) NOT NULL, loan_amount DECIMAL(12,2), notes TEXT,
  photo_url VARCHAR(500), photo_public_id VARCHAR(255), status VARCHAR(20) DEFAULT 'new',
  status_note TEXT, reviewed_by INT, reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_registrations_status (status), KEY idx_registrations_created (created_at DESC),
  CONSTRAINT fk_registrations_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES admin_users(id),
  CONSTRAINT chk_registrations_service CHECK (service_type IN ('loan', 'savings', 'membership')),
  CONSTRAINT chk_registrations_status CHECK (status IN ('new', 'contacted', 'approved', 'completed', 'rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sms_outbox (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phone_number VARCHAR(25) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  status ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  KEY idx_sms_outbox_ready (status, next_attempt_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL, email VARCHAR(100), phone VARCHAR(20), subject VARCHAR(200),
  message TEXT NOT NULL, is_resolved BOOLEAN DEFAULT FALSE, reply TEXT, replied_by INT,
  replied_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_messages_resolved (is_resolved),
  CONSTRAINT fk_messages_replied_by FOREIGN KEY (replied_by) REFERENCES admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS director_message (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  director_name VARCHAR(100) NOT NULL DEFAULT 'Board Director', title VARCHAR(100) DEFAULT 'Board Director',
  message TEXT NOT NULL, photo_url VARCHAR(500), public_id VARCHAR(255),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS testimonials (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL, location VARCHAR(100), message TEXT NOT NULL,
  photo_url VARCHAR(500), public_id VARCHAR(255), is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL, content TEXT NOT NULL, is_published BOOLEAN DEFAULT FALSE,
  published_at DATETIME, created_by INT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_announcements_published (is_published, published_at DESC),
  CONSTRAINT fk_announcements_created_by FOREIGN KEY (created_by) REFERENCES admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT, user_email VARCHAR(100), user_role VARCHAR(20), action VARCHAR(200) NOT NULL,
  resource VARCHAR(100), resource_id INT, details JSON, ip_address VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_user (user_id), KEY idx_audit_created (created_at DESC),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO admin_users (name, email, password, role)
VALUES ('System Administrator', 'admin@obotantimcoop.com', '$2a$12$jAXd12tDV1YEo.DqjbCgQuBU7bbhhhODVwys3aSq6R67FE/F8dvPq', 'super_admin');

INSERT INTO director_message (director_name, title, message)
SELECT 'The Board of Directors', 'Board of Directors',
'On behalf of the Board of Directors and the entire management of Obotantim Cooperative Mutual Support and Social Services Society Limited, I warmly welcome you to our platform. For over a decade, we have been committed to empowering individuals, families, and businesses in Techiman and the broader Bono East Region.

Our cooperative was founded on the principles of mutual support, trust, and collective growth. We believe that when communities work together, they achieve far more than any individual can alone. Through our savings products, loan services, and social support programs, we have supported thousands of members in realizing their dreams — whether building a home, growing a business, funding their children''s education, or securing their retirement.

We invite you to join our growing family. Together, we can build a stronger, more prosperous community for all.'
WHERE NOT EXISTS (SELECT 1 FROM director_message);

INSERT INTO products (category, title, description, icon, interest_rate, sort_order) VALUES
('savings', 'Daakye Savings', 'Plan for your future with our long-term savings account designed to grow your wealth steadily. Competitive interest rates with flexible deposit options.', 'piggy-bank', '12% p.a.', 1),
('savings', 'Daadaa Business', 'Purpose-built savings for traders and business owners. Manage your working capital and earn while you save.', 'briefcase', '10% p.a.', 2),
('savings', 'Mfaso & Normal Susu', 'Traditional susu reimagined — make daily or weekly contributions and access your savings at the end of each cycle.', 'coins', 'Flexible', 3),
('savings', 'Nkakrankakra', 'Our micro-savings product for low-income members. Start with as little as GHS 5 per day.', 'wallet', '8% p.a.', 4),
('loans', 'Trade & Personal Loans', 'Fast, accessible loans for traders and individuals. Minimal documentation with quick approval for members in good standing.', 'hand-coins', '2.5% p.m.', 5),
('loans', 'Pragia & Motor King Financing', 'Specialized financing for commercial vehicle operators — trotros, motor kings, and cargo trucks. Drive your business forward.', 'truck', '2% p.m.', 6),
('loans', 'Education Loans', 'Invest in the future. Our education loans cover tuition, boarding, and related expenses at affordable rates.', 'graduation-cap', '1.5% p.m.', 7),
('loans', 'Group Loans', 'Solidarity lending for groups of 5–20 members. Lower rates, shared accountability, stronger communities.', 'users', '1.8% p.m.', 8);

INSERT INTO testimonials (name, location, message, sort_order) VALUES
('Akosua Mensah', 'Techiman Market', 'I started with the Daakye Savings account two years ago. Today, I have a proper shop and I''m supporting my children''s education. Obotantim changed my life.', 1),
('Kwame Asante', 'Nkoranza Road', 'The group loan helped our market women association buy goods in bulk. We saved 30% on costs and our profits doubled. Truly a blessing.', 2),
('Abena Frimpong', 'Techiman New Town', 'When I needed money urgently for my son''s BECE fees, Obotantim processed my education loan in two days. God bless them.', 3);

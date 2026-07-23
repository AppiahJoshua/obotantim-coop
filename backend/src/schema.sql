-- ============================================================
-- Obotantim Cooperative Complete System Database Schema
-- MySQL / XAMPP / MariaDB (Fully Synchronized & Auto-Provisioned)
-- ============================================================

DROP DATABASE IF EXISTS obotantim_cooperative;

CREATE DATABASE obotantim_cooperative
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE obotantim_cooperative;

-- ── 1. Admin & Staff Users ──────────────────────────────────
CREATE TABLE admin_users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('super_admin','manager','content_editor','staff','teller') NOT NULL DEFAULT 'staff',
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  last_login  TIMESTAMP NULL DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 2. UI Dashboard Permissions (RBAC) ────────────────        
CREATE TABLE dashboard_permissions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    widget_key     VARCHAR(100) NOT NULL UNIQUE,
    label          VARCHAR(100) NOT NULL,
    is_visible     TINYINT(1) NOT NULL DEFAULT 1,
    allowed_roles  JSON DEFAULT NULL,
    updated_by     INT NULL,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 3. Products / Services ───────────────────────────────────
CREATE TABLE products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  category      ENUM('savings','loans') NOT NULL,
  title         VARCHAR(100) NOT NULL,
  description   TEXT,
  icon          VARCHAR(100) DEFAULT 'piggy-bank',
  interest_rate VARCHAR(50),
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 4. Gallery Images ────────────────────────────────────────
CREATE TABLE gallery (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  caption    VARCHAR(255),
  image_url  VARCHAR(500) NOT NULL,
  public_id  VARCHAR(255),
  category   VARCHAR(50) DEFAULT 'general',
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 5. Service Registrations ─────────────────────────────────
CREATE TABLE registrations (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  full_name         VARCHAR(100) NOT NULL,
  phone             VARCHAR(20) NOT NULL,
  gender            VARCHAR(20) DEFAULT NULL,
  email             VARCHAR(100),
  date_of_birth     DATE NULL,
  ghana_card        VARCHAR(50),
  occupation        VARCHAR(100),
  address           TEXT,
  service_type      ENUM('loan','savings','membership') NOT NULL,
  loan_amount       DECIMAL(12,2),
  notes             TEXT,
  photo_url         VARCHAR(500),
  photo_public_id   VARCHAR(255),
  status            ENUM('new','contacted','approved','completed','rejected') NOT NULL DEFAULT 'new',
  status_note       TEXT,
  reviewed_by       INT,
  reviewed_at       TIMESTAMP NULL DEFAULT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 6. Contact Messages ──────────────────────────────────────
CREATE TABLE contact_messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100),
  phone       VARCHAR(20),
  subject     VARCHAR(200),
  message     TEXT NOT NULL,
  is_resolved TINYINT(1) NOT NULL DEFAULT 0,
  reply       TEXT,
  replied_by  INT,
  replied_at  TIMESTAMP NULL DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (replied_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 7. Director's Message ────────────────────────────────────
CREATE TABLE director_message (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  director_name VARCHAR(100) NOT NULL DEFAULT 'Board Director',
  title         VARCHAR(100) DEFAULT 'Board Director',
  message       TEXT NOT NULL,
  photo_url     VARCHAR(500),
  public_id     VARCHAR(255),
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 8. Testimonials ──────────────────────────────────────────
CREATE TABLE testimonials (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  location   VARCHAR(100),
  message    TEXT NOT NULL,
  photo_url  VARCHAR(500),
  public_id  VARCHAR(255),
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 9. Announcements ─────────────────────────────────────────
CREATE TABLE announcements (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  content      TEXT NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  published_at TIMESTAMP NULL DEFAULT NULL,
  created_by   INT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 10. Audit Logs ───────────────────────────────────────────
CREATE TABLE audit_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL,
  user_email  VARCHAR(100) NULL,
  user_role   VARCHAR(50) NULL,
  action      VARCHAR(200) NOT NULL,
  resource    VARCHAR(100) NULL,
  resource_id VARCHAR(100) NULL,
  details     JSON NULL,
  ip_address  VARCHAR(50) NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 11. Members Table ──────────────────────────────────────
CREATE TABLE members (
  member_id           INT AUTO_INCREMENT PRIMARY KEY,
  member_number       VARCHAR(50) NOT NULL UNIQUE,
  first_name          VARCHAR(100) NOT NULL,
  last_name           VARCHAR(100) NOT NULL,
  gender              ENUM('Male','Female','Other') DEFAULT 'Male',
  date_of_birth       DATE NULL,
  national_id         VARCHAR(50) DEFAULT NULL,
  phone               VARCHAR(20) NOT NULL UNIQUE,
  email               VARCHAR(100),
  residential_address TEXT,
  occupation          VARCHAR(100),
  membership_status   ENUM('Active','Inactive','Suspended') NOT NULL DEFAULT 'Active',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 12. Loans Table ────────────────────────────────────────
CREATE TABLE loans (
  loan_id           INT AUTO_INCREMENT PRIMARY KEY,
  loan_number       VARCHAR(50) NOT NULL UNIQUE,
  member_id         INT NOT NULL,
  loan_product_id   INT NULL,
  principal_amount  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  interest_rate     DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  term_months       INT NOT NULL DEFAULT 12,
  application_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approval_date     TIMESTAMP NULL DEFAULT NULL,
  status            VARCHAR(50) DEFAULT 'active',
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 13. Admin Notifications Table ───────────────────────────
CREATE TABLE admin_notifications (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(150) NOT NULL,
  message      TEXT NOT NULL,
  type         VARCHAR(50) DEFAULT 'registration',
  reference_id INT NULL,
  is_read      TINYINT(1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_registrations_status  ON registrations(status);
CREATE INDEX idx_registrations_created ON registrations(created_at);
CREATE INDEX idx_messages_resolved     ON contact_messages(is_resolved);
CREATE INDEX idx_audit_user            ON audit_logs(user_id);
CREATE INDEX idx_audit_created         ON audit_logs(created_at);
CREATE INDEX idx_announcements_pub     ON announcements(is_published, published_at);
CREATE INDEX idx_notifications_unread  ON admin_notifications(is_read, created_at);

-- ── Database Trigger: Auto-Create Notification on Registration ──
DELIMITER //

CREATE TRIGGER trg_auto_notify_admin
AFTER INSERT ON registrations
FOR EACH ROW
BEGIN
    INSERT INTO admin_notifications (title, message, type, reference_id)
    VALUES (
        'New Service Registration',
        CONCAT('A new ', NEW.service_type, ' application has been submitted by ', NEW.full_name, '.'),
        'registration',
        NEW.id
    );
END//

DELIMITER ;

-- ── One-Time Migration: Pull Existing Members ────────────────
INSERT IGNORE INTO members (
    member_number, 
    first_name, 
    last_name, 
    gender,
    date_of_birth,
    national_id,
    phone, 
    email, 
    residential_address, 
    occupation, 
    membership_status,
    created_at
)
SELECT 
    CONCAT('MEM-', LPAD(id + 1000, 6, '0')),
    SUBSTRING_INDEX(full_name, ' ', 1),
    TRIM(SUBSTRING(full_name FROM LOCATE(' ', full_name))),
    COALESCE(gender, 'Male'),
    CASE 
        WHEN date_of_birth IS NULL OR date_of_birth < '1900-01-01' THEN '1990-01-01'
        ELSE date_of_birth
    END,
    ghana_card,
    phone,
    email,
    address,
    occupation,
    'Active',
    created_at
FROM registrations
WHERE service_type = 'membership';

-- ── Seed Data: Default Super Admin ───────────────────────────
INSERT IGNORE INTO admin_users (name, email, password, role)
VALUES (
  'System Administrator',
  'admin@obotantimcoop.com',
  '$2a$12$jAXd12tDV1YEo.DqjbCgQuBU7bbhhhODVwys3aSq6R67FE/F8dvPq',
  'super_admin'
);

-- ── Seed Data: Initial Permissions Setup ─────────────────────
INSERT IGNORE INTO dashboard_permissions (widget_key, label, is_visible) VALUES
('analytics_summary', 'Analytics Overview Card', 1),
('registrations_table', 'Member Registrations Table', 1),
('recent_messages', 'Contact Messages Panel', 1),
('announcements_manager', 'Announcements Posting Card', 1);

-- ── Seed Data: Director Message ──────────────────────────────
INSERT INTO director_message (director_name, title, message)
SELECT
  'The Board of Directors',
  'Board of Directors',
  'On behalf of the Board of Directors and the entire management of Obotantim Cooperative Mutual Support and Social Services Society Limited, I warmly welcome you to our platform. For over a decade, we have been committed to empowering individuals, families, and businesses in Techiman and the broader Bono East Region.\n\nOur cooperative was founded on the principles of mutual support, trust, and collective growth. We believe that when communities work together, they achieve far more than any individual can alone.\n\nWe invite you to join our growing family. Together, we can build a stronger, more prosperous community for all.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM director_message LIMIT 1);

-- ── Seed Data: Default Products ───────────────────────────────
INSERT INTO products (category, title, description, icon, interest_rate, sort_order) VALUES
('savings', 'Daakye Savings',        'Plan for your future with our long-term savings account. Competitive interest rates with flexible deposit options.',          'piggy-bank',    '12% p.a.', 1),
('savings', 'Daadaa Business',       'Purpose-built savings for traders and business owners. Manage working capital and earn while you save.',                     'briefcase',     '10% p.a.', 2),
('savings', 'Mfaso & Normal Susu',  'Traditional susu reimagined — make daily or weekly contributions and access your savings at cycle end.',                      'coins',         'Flexible',  3),
('savings', 'Nkakrankakra',         'Our micro-savings product for low-income members. Start with as little as GHS 5 per day.',                                    'wallet',        '8% p.a.',   4),
('loans',   'Trade & Personal Loans','Fast, accessible loans for traders and individuals. Minimal documentation with quick approval for members in good standing.', 'hand-coins',    '2.5% p.m.', 5),
('loans',   'Pragia & Motor King Financing','Specialized financing for commercial vehicle operators — trotros, motor kings, and cargo trucks.',                    'truck',         '2% p.m.',   6),
('loans',   'Education Loans',       'Cover tuition, boarding, and related expenses at affordable rates.',                                                         'graduation-cap','1.5% p.m.', 7),
('loans',   'Group Loans',           'Solidarity lending for groups of 5–20 members. Lower rates, shared accountability, stronger communities.',                   'users',         '1.8% p.m.', 8);

-- ── Seed Data: Default Testimonials ───────────────────────────
INSERT INTO testimonials (name, location, message, sort_order) VALUES
('Akosua Mensah',  'Techiman Market',    'I started with the Daakye Savings account two years ago. Today, I have a proper shop and I''m supporting my children''s education. Obotantim changed my life.', 1),
('Kwame Asante',   'Nkoranza Road',      'The group loan helped our market women association buy goods in bulk. We saved 30% on costs and our profits doubled. Truly a blessing.',                             2),
('Abena Frimpong', 'Techiman New Town',  'When I needed money urgently for my son''s BECE fees, Obotantim processed my education loan in two days. God bless them.',                                        3);
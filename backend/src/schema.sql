-- Obotantim Cooperative Database Schema
-- Run: psql -U user -d obotantim_coop -f schema.sql

-- Admin Users (internal staff)
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'content_editor'
    CHECK (role IN ('super_admin', 'manager', 'content_editor')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Products / Services
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL CHECK (category IN ('savings', 'loans')),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(100) DEFAULT 'piggy-bank',
  interest_rate VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Gallery Images
CREATE TABLE IF NOT EXISTS gallery (
  id SERIAL PRIMARY KEY,
  caption VARCHAR(255),
  image_url VARCHAR(500) NOT NULL,
  public_id VARCHAR(255),
  category VARCHAR(50) DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Service Registrations (public submissions)
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  ghana_card VARCHAR(50),
  occupation VARCHAR(100),
  address TEXT,
  service_type VARCHAR(50) NOT NULL
    CHECK (service_type IN ('loan', 'savings', 'membership')),
  loan_amount DECIMAL(12,2),
  notes TEXT,
  photo_url VARCHAR(500),
  photo_public_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'approved', 'completed', 'rejected')),
  status_note TEXT,
  reviewed_by INTEGER REFERENCES admin_users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contact Messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  subject VARCHAR(200),
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  reply TEXT,
  replied_by INTEGER REFERENCES admin_users(id),
  replied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Director's Message (single row)
CREATE TABLE IF NOT EXISTS director_message (
  id SERIAL PRIMARY KEY,
  director_name VARCHAR(100) NOT NULL DEFAULT 'Board Director',
  title VARCHAR(100) DEFAULT 'Board Director',
  message TEXT NOT NULL,
  photo_url VARCHAR(500),
  public_id VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100),
  message TEXT NOT NULL,
  photo_url VARCHAR(500),
  public_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Announcements / News
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  created_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  user_email VARCHAR(100),
  user_role VARCHAR(20),
  action VARCHAR(200) NOT NULL,
  resource VARCHAR(100),
  resource_id INTEGER,
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_created ON registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_resolved ON contact_messages(is_resolved);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, published_at DESC);

-- Seed: Default Super Admin (password: Admin@2026!)
INSERT INTO admin_users (name, email, password, role)
VALUES (
  'System Administrator',
  'admin@obotantimcoop.com',
  '$2a$12$jAXd12tDV1YEo.DqjbCgQuBU7bbhhhODVwys3aSq6R67FE/F8dvPq',
  'super_admin'
) ON CONFLICT (email) DO NOTHING;

-- Seed: Default Director Message
INSERT INTO director_message (director_name, title, message)
VALUES (
  'The Board of Directors',
  'Board of Directors',
  'On behalf of the Board of Directors and the entire management of Obotantim Cooperative Mutual Support and Social Services Society Limited, I warmly welcome you to our platform. For over a decade, we have been committed to empowering individuals, families, and businesses in Techiman and the broader Bono East Region.

Our cooperative was founded on the principles of mutual support, trust, and collective growth. We believe that when communities work together, they achieve far more than any individual can alone. Through our savings products, loan services, and social support programs, we have supported thousands of members in realizing their dreams — whether building a home, growing a business, funding their children''s education, or securing their retirement.

We invite you to join our growing family. Together, we can build a stronger, more prosperous community for all.'
) ON CONFLICT DO NOTHING;

-- Seed: Default Products
INSERT INTO products (category, title, description, icon, interest_rate, sort_order) VALUES
('savings', 'Daakye Savings', 'Plan for your future with our long-term savings account designed to grow your wealth steadily. Competitive interest rates with flexible deposit options.', 'piggy-bank', '12% p.a.', 1),
('savings', 'Daadaa Business', 'Purpose-built savings for traders and business owners. Manage your working capital and earn while you save.', 'briefcase', '10% p.a.', 2),
('savings', 'Mfaso & Normal Susu', 'Traditional susu reimagined — make daily or weekly contributions and access your savings at the end of each cycle.', 'coins', 'Flexible', 3),
('savings', 'Nkakrankakra', 'Our micro-savings product for low-income members. Start with as little as GHS 5 per day.', 'wallet', '8% p.a.', 4),
('loans', 'Trade & Personal Loans', 'Fast, accessible loans for traders and individuals. Minimal documentation with quick approval for members in good standing.', 'hand-coins', '2.5% p.m.', 5),
('loans', 'Pragia & Motor King Financing', 'Specialized financing for commercial vehicle operators — trotros, motor kings, and cargo trucks. Drive your business forward.', 'truck', '2% p.m.', 6),
('loans', 'Education Loans', 'Invest in the future. Our education loans cover tuition, boarding, and related expenses at affordable rates.', 'graduation-cap', '1.5% p.m.', 7),
('loans', 'Group Loans', 'Solidarity lending for groups of 5–20 members. Lower rates, shared accountability, stronger communities.', 'users', '1.8% p.m.', 8)
ON CONFLICT DO NOTHING;

-- Seed: Default FAQ items (stored as testimonials table)
-- Seed: Default Testimonials
INSERT INTO testimonials (name, location, message, sort_order) VALUES
('Akosua Mensah', 'Techiman Market', 'I started with the Daakye Savings account two years ago. Today, I have a proper shop and I''m supporting my children''s education. Obotantim changed my life.', 1),
('Kwame Asante', 'Nkoranza Road', 'The group loan helped our market women association buy goods in bulk. We saved 30% on costs and our profits doubled. Truly a blessing.', 2),
('Abena Frimpong', 'Techiman New Town', 'When I needed money urgently for my son''s BECE fees, Obotantim processed my education loan in two days. God bless them.', 3)
ON CONFLICT DO NOTHING;

-- Atende Ja - PostgreSQL schema
-- Generated from the Sequelize models in backend/back-end-gerenciamento de usuarios/src/models.
-- Structure only: this file does not export or insert application/user data.
-- Run against an empty database with:
--   psql -U postgres -d atendeja -f backend/database_schema.sql

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  google_sub TEXT UNIQUE,
  password_reset_token_hash TEXT,
  password_reset_expires_at TIMESTAMP WITH TIME ZONE,
  role TEXT NOT NULL DEFAULT 'cliente',
  cpf TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '(61) 99999-0000',
  profile_image_uri TEXT DEFAULT '',
  service_type TEXT DEFAULT '',
  professional_level TEXT DEFAULT 'profissional',
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  online INTEGER DEFAULT 0,
  latitude REAL DEFAULT -15.7998,
  longitude REAL DEFAULT -47.8645,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  image_key TEXT DEFAULT '',
  image_uri TEXT DEFAULT '',
  online INTEGER DEFAULT 0,
  rating REAL DEFAULT 5,
  level TEXT DEFAULT 'profissional',
  price_label TEXT DEFAULT 'A combinar',
  latitude REAL DEFAULT -15.7998,
  longitude REAL DEFAULT -47.8645,
  district TEXT DEFAULT 'Brasilia',
  services_json TEXT DEFAULT '[]',
  short_bio TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  provider_id TEXT REFERENCES providers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  client_user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  client_name TEXT DEFAULT '',
  service TEXT DEFAULT '',
  status TEXT DEFAULT 'Novo chamado',
  status_flow TEXT DEFAULT 'novo',
  address TEXT DEFAULT '',
  note TEXT DEFAULT '',
  rating INTEGER DEFAULT 0,
  unread_messages INTEGER DEFAULT 0,
  has_photo INTEGER DEFAULT 0,
  photo_label TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  scope TEXT DEFAULT '',
  ref_id TEXT REFERENCES requests(id) ON UPDATE CASCADE ON DELETE SET NULL,
  sender TEXT DEFAULT '',
  text TEXT DEFAULT '',
  image_uri TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  audience TEXT DEFAULT '',
  owner_key TEXT DEFAULT '',
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  date_label TEXT DEFAULT 'Agora',
  status TEXT DEFAULT '',
  request_id TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT favorites_user_id_provider_id_unique UNIQUE (user_id, provider_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON UPDATE CASCADE ON DELETE CASCADE,
  client_user_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  request_id TEXT UNIQUE,
  client_name TEXT DEFAULT '',
  rating INTEGER NOT NULL,
  comment TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  type TEXT DEFAULT 'info',
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  read INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_stats (
  provider_id TEXT PRIMARY KEY REFERENCES providers(id) ON UPDATE CASCADE ON DELETE CASCADE,
  total_requests INTEGER DEFAULT 0,
  completed_requests INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  client_user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inquiries_client_user_id_provider_id_unique UNIQUE (client_user_id, provider_id)
);

CREATE TABLE IF NOT EXISTS inquiry_messages (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON UPDATE CASCADE ON DELETE CASCADE,
  sender TEXT NOT NULL,
  text TEXT DEFAULT '',
  image_uri TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  request_id TEXT,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  image_uri TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_portfolio (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id) ON UPDATE CASCADE ON DELETE CASCADE,
  image_uri TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique ON users (google_sub);
CREATE INDEX IF NOT EXISTS account_sessions_user_id ON account_sessions (user_id);
CREATE INDEX IF NOT EXISTS support_tickets_user_id_created_at ON support_tickets (user_id, created_at);
CREATE INDEX IF NOT EXISTS provider_portfolio_provider_id_created_at ON provider_portfolio (provider_id, created_at);

COMMIT;

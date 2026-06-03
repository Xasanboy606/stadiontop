-- StadionTOP PostgreSQL Schema  (complete)
-- Run: psql -U postgres -f server/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if re-running (order matters for FK)
DROP TABLE IF EXISTS event_bookings       CASCADE;
DROP TABLE IF EXISTS events               CASCADE;
DROP TABLE IF EXISTS matchmaking_posts    CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS notifications        CASCADE;
DROP TABLE IF EXISTS transfers            CASCADE;
DROP TABLE IF EXISTS closed_slots         CASCADE;
DROP TABLE IF EXISTS site_settings        CASCADE;
DROP TABLE IF EXISTS edit_requests        CASCADE;
DROP TABLE IF EXISTS reviews              CASCADE;
DROP TABLE IF EXISTS transactions         CASCADE;
DROP TABLE IF EXISTS bookings             CASCADE;
DROP TABLE IF EXISTS user_roles           CASCADE;
DROP TABLE IF EXISTS profiles             CASCADE;
DROP TABLE IF EXISTS stadiums             CASCADE;
DROP TABLE IF EXISTS users                CASCADE;

-- Drop types
DROP TYPE IF EXISTS app_role CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS payment_kind CASCADE;
DROP TYPE IF EXISTS payment_provider CASCADE;
DROP TYPE IF EXISTS stadium_status CASCADE;

-- Enums
CREATE TYPE app_role AS ENUM ('admin', 'owner', 'user');
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE payment_kind AS ENUM ('deposit', 'full');
CREATE TYPE payment_provider AS ENUM ('click', 'payme', 'uzum');
CREATE TYPE stadium_status AS ENUM ('pending', 'approved', 'rejected');

-- Users (replaces Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  lang TEXT DEFAULT 'uz',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Stadiums
CREATE TABLE stadiums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  size TEXT,
  price_day INTEGER NOT NULL,
  price_night INTEGER NOT NULL,
  facilities TEXT[] DEFAULT '{}',
  has_referee BOOLEAN DEFAULT FALSE,
  has_video BOOLEAN DEFAULT FALSE,
  has_balls BOOLEAN DEFAULT FALSE,
  has_bibs BOOLEAN DEFAULT FALSE,
  images TEXT[] DEFAULT '{}',
  lat NUMERIC,
  lng NUMERIC,
  rating NUMERIC DEFAULT 5,
  reviews INTEGER DEFAULT 0,
  status stadium_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  stadium_id UUID NOT NULL REFERENCES stadiums(id),
  booking_date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  duration INTEGER NOT NULL DEFAULT 1,
  base_price INTEGER NOT NULL,
  addons_price INTEGER NOT NULL DEFAULT 0,
  service_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL,
  payment_kind payment_kind NOT NULL,
  payment_provider payment_provider NOT NULL,
  addons TEXT[] DEFAULT '{}',
  status booking_status DEFAULT 'confirmed',
  short_code TEXT NOT NULL UNIQUE,
  qr_token UUID DEFAULT uuid_generate_v4(),
  verified_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refund_amount INTEGER DEFAULT 0,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  commission_amount INTEGER DEFAULT 0,
  provider payment_provider NOT NULL,
  status TEXT DEFAULT 'success',
  escrow_status TEXT DEFAULT 'held',
  external_ref TEXT,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  stadium_id UUID NOT NULL REFERENCES stadiums(id),
  booking_id UUID REFERENCES bookings(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stadium_id)
);

-- Edit requests
CREATE TABLE edit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supervisor_id UUID NOT NULL REFERENCES users(id),
  stadium_id UUID NOT NULL REFERENCES stadiums(id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_response TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Closed slots (owner manually blocks time slots)
CREATE TABLE closed_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stadium_id UUID NOT NULL REFERENCES stadiums(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  hour SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stadium_id, slot_date, hour)
);

-- Transfers (admin payments to stadium owners)
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stadium_id UUID NOT NULL REFERENCES stadiums(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id),
  admin_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site settings (single-row JSON config)
CREATE TABLE site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events (match viewing events)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  home_team TEXT DEFAULT '',
  away_team TEXT DEFAULT '',
  event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  venue TEXT NOT NULL DEFAULT '',
  district TEXT DEFAULT '',
  price_per_seat INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 100,
  taken INTEGER DEFAULT 0,
  accent TEXT DEFAULT 'from-primary/30 to-primary/10',
  emoji TEXT DEFAULT '🏆',
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event bookings (seats reserved for events)
CREATE TABLE event_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seats INTEGER NOT NULL DEFAULT 1,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matchmaking posts (player/team search board)
CREATE TABLE matchmaking_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('needPlayers', 'challenge')),
  message TEXT NOT NULL,
  contact TEXT NOT NULL,
  district TEXT,
  hour INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_stadium ON bookings(stadium_id, booking_date);
CREATE INDEX idx_stadiums_status ON stadiums(status);
CREATE INDEX idx_stadiums_owner ON stadiums(owner_id);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);
CREATE INDEX idx_reviews_stadium ON reviews(stadium_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_closed_slots ON closed_slots(stadium_id, slot_date);
CREATE INDEX idx_transfers_stadium ON transfers(stadium_id, created_at DESC);
CREATE INDEX idx_matchmaking_created ON matchmaking_posts(created_at DESC);
CREATE INDEX idx_event_bookings_event ON event_bookings(event_id);
CREATE INDEX idx_event_bookings_user ON event_bookings(user_id);

COMMENT ON TABLE users IS 'Auth users — email/password based';
COMMENT ON TABLE stadiums IS 'Football pitches owned by registered owners';
COMMENT ON TABLE bookings IS 'Time slot bookings (booking_date + hour + duration)';
COMMENT ON TABLE transactions IS 'Payment transactions linked to bookings';
COMMENT ON TABLE closed_slots IS 'Hours manually blocked by the stadium owner';
COMMENT ON TABLE transfers IS 'Money transfers from platform to stadium owners';
COMMENT ON TABLE notifications IS 'In-app notifications for all user roles';
COMMENT ON TABLE events IS 'Ticketed match-viewing events';
COMMENT ON TABLE event_bookings IS 'Seat reservations for events';
COMMENT ON TABLE matchmaking_posts IS 'Player/team search bulletin board';
COMMENT ON TABLE site_settings IS 'Single-row CMS config (hero, stats, sections)';

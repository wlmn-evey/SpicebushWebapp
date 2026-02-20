CREATE TABLE IF NOT EXISTS camp_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  registration_open_at TIMESTAMPTZ,
  registration_close_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camp_seasons_year ON camp_seasons(year DESC);
CREATE INDEX IF NOT EXISTS idx_camp_seasons_active ON camp_seasons(is_active);

CREATE TABLE IF NOT EXISTS camp_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES camp_seasons(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  theme_title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  age_range_label TEXT NOT NULL DEFAULT '',
  hours_label TEXT NOT NULL DEFAULT '',
  price_label TEXT NOT NULL DEFAULT '',
  capacity_total INTEGER NOT NULL DEFAULT 0,
  seats_confirmed INTEGER NOT NULL DEFAULT 0,
  seats_held INTEGER NOT NULL DEFAULT 0,
  waitlist_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  limited_threshold INTEGER NOT NULL DEFAULT 4,
  enrollment_url TEXT NOT NULL DEFAULT '',
  waitlist_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  hero_media_slug TEXT,
  registration_open_at TIMESTAMPTZ,
  registration_close_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  sync_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT camp_weeks_capacity_nonnegative CHECK (capacity_total >= 0),
  CONSTRAINT camp_weeks_confirmed_nonnegative CHECK (seats_confirmed >= 0),
  CONSTRAINT camp_weeks_held_nonnegative CHECK (seats_held >= 0),
  CONSTRAINT camp_weeks_threshold_nonnegative CHECK (limited_threshold >= 0),
  CONSTRAINT camp_weeks_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_camp_weeks_season_id ON camp_weeks(season_id);
CREATE INDEX IF NOT EXISTS idx_camp_weeks_dates ON camp_weeks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_camp_weeks_published ON camp_weeks(is_published);
CREATE INDEX IF NOT EXISTS idx_camp_weeks_display_order ON camp_weeks(display_order);

CREATE TABLE IF NOT EXISTS camp_week_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_week_id UUID NOT NULL REFERENCES camp_weeks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  age_range_label TEXT,
  hours_label TEXT,
  price_label TEXT,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camp_week_variants_week_id ON camp_week_variants(camp_week_id);
CREATE INDEX IF NOT EXISTS idx_camp_week_variants_display_order ON camp_week_variants(display_order);

CREATE TABLE IF NOT EXISTS camp_seat_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_week_id UUID NOT NULL REFERENCES camp_weeks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  before_confirmed INTEGER,
  after_confirmed INTEGER,
  before_held INTEGER,
  after_held INTEGER,
  before_capacity INTEGER,
  after_capacity INTEGER,
  note TEXT,
  actor_email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camp_seat_adjustments_week_id ON camp_seat_adjustments(camp_week_id);
CREATE INDEX IF NOT EXISTS idx_camp_seat_adjustments_created_at ON camp_seat_adjustments(created_at DESC);

DROP TRIGGER IF EXISTS trigger_camp_seasons_set_updated_at ON camp_seasons;
CREATE TRIGGER trigger_camp_seasons_set_updated_at
  BEFORE UPDATE ON camp_seasons
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_column();

DROP TRIGGER IF EXISTS trigger_camp_weeks_set_updated_at ON camp_weeks;
CREATE TRIGGER trigger_camp_weeks_set_updated_at
  BEFORE UPDATE ON camp_weeks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_column();

DROP TRIGGER IF EXISTS trigger_camp_week_variants_set_updated_at ON camp_week_variants;
CREATE TRIGGER trigger_camp_week_variants_set_updated_at
  BEFORE UPDATE ON camp_week_variants
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_column();

INSERT INTO settings (key, value)
VALUES
  ('camp_mode_override', to_jsonb('off'::text)),
  ('camp_mode_start_at', to_jsonb(''::text)),
  ('camp_mode_end_at', to_jsonb(''::text)),
  ('camp_mode_timezone', to_jsonb('America/New_York'::text)),
  ('camp_promotions_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

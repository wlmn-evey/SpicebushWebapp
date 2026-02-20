CREATE TABLE IF NOT EXISTS school_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  audience TEXT NOT NULL DEFAULT 'families',
  placement TEXT NOT NULL DEFAULT 'global',
  cta_label TEXT,
  cta_url TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT school_announcements_severity_check
    CHECK (severity IN ('info', 'reminder', 'urgent', 'closure')),
  CONSTRAINT school_announcements_placement_check
    CHECK (placement IN ('global', 'homepage', 'camp', 'coming-soon')),
  CONSTRAINT school_announcements_schedule_check
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_school_announcements_published_window
  ON school_announcements (is_published, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_school_announcements_severity
  ON school_announcements (severity, created_at DESC);

CREATE TABLE IF NOT EXISTS school_schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  reason TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  exception_type TEXT NOT NULL DEFAULT 'closed',
  open_time_decimal NUMERIC(5, 2),
  close_time_decimal NUMERIC(5, 2),
  before_care_offset NUMERIC(5, 2),
  after_care_offset NUMERIC(5, 2),
  linked_announcement_id UUID REFERENCES school_announcements(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT school_schedule_exceptions_type_check
    CHECK (exception_type IN ('closed', 'modified_hours')),
  CONSTRAINT school_schedule_exceptions_date_range_check
    CHECK (end_date >= start_date),
  CONSTRAINT school_schedule_exceptions_time_requirements_check
    CHECK (
      (exception_type = 'closed' AND open_time_decimal IS NULL AND close_time_decimal IS NULL) OR
      (exception_type = 'modified_hours' AND open_time_decimal IS NOT NULL AND close_time_decimal IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_school_schedule_exceptions_published_dates
  ON school_schedule_exceptions (is_published, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_school_schedule_exceptions_linked_announcement
  ON school_schedule_exceptions (linked_announcement_id);

DROP TRIGGER IF EXISTS trigger_school_announcements_set_updated_at ON school_announcements;
CREATE TRIGGER trigger_school_announcements_set_updated_at
  BEFORE UPDATE ON school_announcements
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_column();

DROP TRIGGER IF EXISTS trigger_school_schedule_exceptions_set_updated_at ON school_schedule_exceptions;
CREATE TRIGGER trigger_school_schedule_exceptions_set_updated_at
  BEFORE UPDATE ON school_schedule_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_column();

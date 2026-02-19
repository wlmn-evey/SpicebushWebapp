CREATE TABLE IF NOT EXISTS ad_spend_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spend_date DATE NOT NULL,
  channel TEXT NOT NULL,
  campaign TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_spend_entries_spend_date
  ON ad_spend_entries (spend_date DESC);

CREATE INDEX IF NOT EXISTS idx_ad_spend_entries_campaign
  ON ad_spend_entries ((LOWER(campaign)));

CREATE INDEX IF NOT EXISTS idx_ad_spend_entries_channel
  ON ad_spend_entries ((LOWER(channel)));

DROP TRIGGER IF EXISTS trigger_ad_spend_entries_set_updated_at ON ad_spend_entries;
CREATE TRIGGER trigger_ad_spend_entries_set_updated_at
  BEFORE UPDATE ON ad_spend_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_column();

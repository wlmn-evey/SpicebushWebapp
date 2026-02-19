export interface ContentRow {
  id: string;
  type: string;
  slug: string;
  title: string | null;
  data: Record<string, unknown>;
  status: string | null;
  author_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
  updated_at: string | null;
}

export interface CommunicationMessageRow {
  id: string;
  subject: string;
  message_content: string;
  message_type: string;
  recipient_type: string;
  recipient_count: number | null;
  scheduled_for: string | null;
  sent_at: string | null;
  status: string;
  delivery_stats: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationTemplateRow {
  id: string;
  name: string;
  description: string | null;
  message_type: string;
  subject_template: string;
  content_template: string;
  usage_count: number | null;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactFormSubmissionRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  child_age: string | null;
  tour_interest: boolean;
  attribution: Record<string, unknown> | null;
  session_id: string | null;
  client_id: string | null;
  landing_page: string | null;
  referrer_url: string | null;
  submitted_at: string;
}

export interface AnalyticsEventRow {
  id: string;
  event_name: string;
  event_category: string | null;
  page_path: string | null;
  page_url: string | null;
  referrer_url: string | null;
  session_id: string | null;
  client_id: string | null;
  event_value: number | null;
  properties: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdSpendEntryRow {
  id: string;
  spend_date: string;
  channel: string;
  campaign: string;
  amount: number;
  currency: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaRow {
  id: string;
  filename: string;
  url: string;
  size: number | null;
  type?: string | null;
  metadata?: Record<string, unknown> | null;
  uploaded_by: string | null;
  created_at: string;
}

export type DatabaseTable<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
};

export interface Database {
  public: {
    Tables: {
      content: DatabaseTable<ContentRow>;
      settings: DatabaseTable<SettingRow>;
      communications_messages: DatabaseTable<CommunicationMessageRow>;
      communications_templates: DatabaseTable<CommunicationTemplateRow>;
      contact_form_submissions: DatabaseTable<ContactFormSubmissionRow>;
      analytics_events: DatabaseTable<AnalyticsEventRow>;
      ad_spend_entries: DatabaseTable<AdSpendEntryRow>;
      media: DatabaseTable<MediaRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
    CompositeTypes: Record<string, unknown>;
  };
}

export interface ContentEntry<T = Record<string, unknown>> {
  id: string;
  slug: string;
  collection: string;
  data: T & { title?: string };
  body?: string;
}

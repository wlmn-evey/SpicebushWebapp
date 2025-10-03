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

export interface NewsletterSubscriberRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  subscription_status: string;
  subscription_type: string | null;
  signup_source: string | null;
  signup_page: string | null;
  referral_source: string | null;
  created_at: string;
  updated_at: string;
  unsubscribed_at: string | null;
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

export type SupabaseTable<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
};

export interface Database {
  public: {
    Tables: {
      content: SupabaseTable<ContentRow>;
      settings: SupabaseTable<SettingRow>;
      communications_messages: SupabaseTable<CommunicationMessageRow>;
      communications_templates: SupabaseTable<CommunicationTemplateRow>;
      newsletter_subscribers: SupabaseTable<NewsletterSubscriberRow>;
      media: SupabaseTable<MediaRow>;
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

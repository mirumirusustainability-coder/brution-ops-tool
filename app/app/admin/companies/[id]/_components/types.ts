export type ContactHistoryEntry = {
  date: string;
  time?: string | null;
  content: string;
  author?: string | null;
};

export type ActivityFeedItem = {
  id: string;
  type: 'sales' | 'project';
  project_id?: string;
  project_name?: string;
  content: string;
  author: string;
  created_at: string;
  pinned?: boolean;
};

export type CompanyMetadata = {
  biz_no?: string | null;
  address?: string | null;
  phone?: string | null;
  representative_name?: string | null;
  contact_email?: string | null;
  contract_status?: '계약전' | '리드' | '상담중' | '계약완료' | '진행중' | '완료' | string | null;
  starter_package?: boolean | string | null;
  total_amount?: number | string | null;
  deposit_paid?: boolean | null;
  balance_paid?: boolean | null;
  contract_start?: string | null;
  contract_end?: string | null;
  lead_source?: '지인소개' | 'SNS' | '광고' | '콜드아웃리치' | '기타' | string | null;
  first_contact?: string | null;
  target_launch?: string | null;
  interest_category?: string[] | null;
  interest_category_other?: string | null;
  current_channel?: string[] | null;
  current_channel_other?: string | null;
  target_channel?: string[] | null;
  target_channel_other?: string | null;
  est_order_qty?: string | null;
  pain_point?: string | null;
  client_tier?: '일반' | 'VIP' | '파트너' | string | null;
  internal_notes?: string | null;
  last_contact?: string | null;
  contact_history?: ContactHistoryEntry[] | null;
  activity_feed?: ActivityFeedItem[] | null;
  next_action?: string | null;
  // v3 fields
  homepage_url?: string | null;
  smartstore_url?: string | null;
  coupang_url?: string | null;
  brand_name?: string | null;
  brand_target?: string | null;
  brand_tone?: string | null;
  brand_forbidden?: string | null;
  package_type?: 'starter' | 'standard' | 'premium' | string | null;
  contract_amount?: number | string | null;
  ai_credit_limit?: number | null;
  ai_credit_used?: number | null;
  shortcut_actions?: string[] | null;
  ai_summary?: string | null;
  profile_image_url?: string | null;
  brution_manager?: string | null;
  regular_meeting?: string | null;
  last_communication?: string | null;
};

export type ApiCompany = {
  id: string;
  name: string;
  metadata?: CompanyMetadata | null;
  created_at: string;
  updated_at: string;
};

export type ApiProject = {
  id: string;
  company_id: string;
  name: string | null;
  description?: string | null;
  step?: number | null;
  status?: 'active' | 'completed' | 'paused' | null;
  metadata?: {
    notes?: Array<{ date: string; time?: string | null; author?: string | null; content: string }> | null;
    launch_date?: string | null;
    assignee?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
};

export type ApiProjectWithDrops = {
  id: string;
  name: string | null;
  step?: number | null;
  status?: 'active' | 'completed' | 'paused' | null;
  deliverables?: ApiDeliverable[];
};

export type ApiDeliverableVersion = {
  id: string;
  deliverable_id: string;
  status?: string | null;
  title?: string | null;
};

export type ApiDeliverable = {
  id: string;
  project_id: string;
  company_id: string;
  type: string;
  visibility?: string | null;
  title?: string | null;
  versions?: ApiDeliverableVersion[];
  deliverable_versions?: ApiDeliverableVersion[];
};

export type ApiUser = {
  user_id: string;
  email: string;
  name: string | null;
  role: 'staff_admin' | 'staff_member' | 'client_admin' | 'client_member';
  phone?: string | null;
  job_title?: string | null;
  business_card_url?: string | null;
  company_id: string | null;
  status: 'active' | 'inactive';
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanyMetadata = {
  biz_no?: string | null;
  address?: string | null;
  phone?: string | null;
  representative_name?: string | null;
  contact_email?: string | null;
  contract_status?: '계약전' | '진행중' | '완료' | string | null;
  starter_package?: boolean | null;
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
  created_at: string;
  updated_at: string;
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

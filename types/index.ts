// User Roles
export type UserRole = 'staff_admin' | 'staff_member' | 'client_admin' | 'client_member';

// Version Status
export type VersionStatus = 'draft' | 'in_review' | 'approved' | 'published';

// Deliverable Types
export type DeliverableType = 'keyword' | 'ads' | 'market' | 'brand_identity' | 'naming';

// User
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  mustChangePassword: boolean;
  status: 'active' | 'inactive';
}

// Company
export interface Company {
  id: string;
  name: string;
  maxUsers: number;
  createdAt: string;
}

// Project
export interface Project {
  id: string;
  name: string;
  companyId: string;
  description?: string;
  step: number;
  createdAt: string;
  updatedAt: string;
}

// Project Summary (API)
export interface ProjectSummary {
  id: string;
  name: string;
  companyId: string;
  description?: string | null;
  step: number;
  createdAt: string;
  updatedAt: string;
}

// Project Detail (API)
export interface ProjectDetail extends ProjectSummary {}

// Deliverable
export interface Deliverable {
  id: string;
  projectId: string;
  type: DeliverableType;
  visibility: 'internal' | 'client';
  createdAt: string;
}

// Deliverable Version
export interface DeliverableVersion {
  id: string;
  deliverableId: string;
  versionNo: number;
  status: VersionStatus;
  assetId?: string;
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  createdAt: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
}

// Keyword Analysis Data
export interface KeywordData {
  keyword: string;
  searchVolume?: number;
  productCount?: number;
  category?: string;
  adCost?: number;
  classification: '유지' | '제외' | '확인필요';
  customerNote?: string;
}

// Ad Campaign Data
export interface AdCampaignData {
  id: string;
  campaignName: string;
  targetAudience: string;
  productFeatures: string;
  generationCount: 10 | 20;
  createdAt: string;
}

// Ad Result Item
export interface AdResultItem {
  id: string;
  type: 'headline' | 'body' | 'hook' | 'cta' | 'creative';
  content: string;
  status: '선택' | '보류' | '제외';
  customerEdit?: string;
  customerNote?: string;
}

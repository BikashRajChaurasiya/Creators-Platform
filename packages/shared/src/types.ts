/** Shared transport types: API envelope, pagination, auth payloads. */

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
}

export interface SessionPayload extends AuthUser {
  refreshToken: string;
  accessExpiresAt: number;
}

export interface AuditEntry {
  action: string;
  actorId: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MatchScore {
  creatorId: string;
  name: string;
  score: number; // 0..1
  reasons: string[];
}

export interface ContentAnalysisResult {
  overallScore: number; // 0..1
  checks: {
    videoQuality: number;
    brandCompliance: number;
    logoPlacement: number;
    speechClarity: number;
    sentiment: number; // -1..1
    visualQuality: number;
  };
  flags: string[];
  suggestedActions: string[];
}

export interface GeneratedCopy {
  captions: string[];
  hooks: string[];
  hashtags: string[];
  description: string;
}

export interface Settings {
  commissionPercent: number;
  theme: {
    primaryColor: string;
    accentColor: string;
    logoUrl: string;
    brandName: string;
  };
  maintenanceMode: boolean;
  signupsOpen: boolean;
  emailFrom: string;
}

export const DEFAULT_SETTINGS: Settings = {
  commissionPercent: 15,
  theme: {
    primaryColor: '#1B5E3B',
    accentColor: '#A3E635',
    logoUrl: '',
    brandName: 'UGCNP',
  },
  maintenanceMode: false,
  signupsOpen: true,
  emailFrom: 'UGCNP <no-reply@ugcnp.com>',
};
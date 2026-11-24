import { HttpErrorResponse } from '@angular/common/http';

/** The backend's RateLimitSettings property names; the only limits an admin may change (task 47). */
export type RateLimitName =
  | 'Anonymous'
  | 'SignedIn'
  | 'TrayDevice'
  | 'TenantCeiling'
  | 'AdminAnonymous'
  | 'AdminSignedIn';

export type RateLimitAlgorithm = 'token_bucket' | 'sliding_window';

/** Where an effective value comes from, most specific first. */
export type RateLimitSource = 'tenant' | 'plan' | 'global' | 'appsettings';

export type RateLimitScope = 'global' | 'plan' | 'tenant';

/** The limits a plan or tenant may override; the other three are platform-wide. */
export const PER_TENANT_LIMITS: readonly RateLimitName[] = ['SignedIn', 'TrayDevice', 'TenantCeiling'];

export interface RateLimitSetting {
  perMinute: number;
  /** Absent for sliding-window limits (Anonymous, AdminAnonymous). */
  burst?: number | null;
}

export interface RateLimitBounds {
  minPerMinute: number;
  maxPerMinute: number;
  minBurst?: number | null;
  maxBurst?: number | null;
}

/** A stored override. rowVersion goes back on the next save or removal. */
export interface RateLimitOverride extends RateLimitSetting {
  updatedAt: string;
  updatedByPlatformUserId: string;
  rowVersion: string;
}

/** Fields may be missing instead of null when the API leaves nulls out, so optional throughout. */
export interface EffectiveRateLimit {
  limitName: RateLimitName;
  algorithm: RateLimitAlgorithm;
  override?: RateLimitOverride | null;
  effective: RateLimitSetting;
  effectiveSource: RateLimitSource;
  bounds: RateLimitBounds;
}

export interface GlobalRateLimit extends EffectiveRateLimit {
  appSettings: RateLimitSetting;
}

export interface PlanRateLimit extends EffectiveRateLimit {
  inherited: RateLimitSetting;
  inheritedSource: RateLimitSource;
}

export interface PlanRateLimits {
  subscriptionPlanId: string;
  limits: PlanRateLimit[];
}

export interface TenantRateLimits {
  tenantId: string;
  subscriptionPlanId?: string | null;
  limits: EffectiveRateLimit[];
}

export interface RateLimitChange {
  id: string;
  changedAt: string;
  platformUserId: string;
  platformUserName?: string | null;
  scope: RateLimitScope;
  subscriptionPlanId?: string | null;
  tenantId?: string | null;
  limitName: RateLimitName;
  oldPerMinute?: number | null;
  oldBurst?: number | null;
  newPerMinute?: number | null;
  newBurst?: number | null;
  reason: string;
  correlationId?: string | null;
}

export interface RateLimitChangesPage {
  items: RateLimitChange[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

export interface SetRateLimitRequest {
  perMinute: number;
  burst: number | null;
  reason: string;
  rowVersion: string | null;
}

/** The limiter partition a 429 came from (task 49). */
export type RateLimitRejectionKind =
  | 'User'
  | 'TrayDevice'
  | 'Anonymous'
  | 'AdminAnonymous'
  | 'Admin'
  | 'PreAuthentication';

export interface RateLimitRejectionKindCount {
  kind: RateLimitRejectionKind | string;
  count: number;
}

export interface RateLimitRejectionLimit {
  limitName: RateLimitName;
  perMinute: number;
  burst?: number | null;
}

/** One tenant's 429s. tenantId is null for requests with no tenant (signed-out, pre-sign-in, admin). */
export interface TenantRateLimitRejections {
  tenantId?: string | null;
  tenantName?: string | null;
  totalRejections: number;
  byKind: RateLimitRejectionKindCount[];
  effectiveLimits: RateLimitRejectionLimit[];
}

/** 429s on one API server (scope "instance") in the last `minutes` minutes, top 50 tenants. */
export interface RateLimitRejections {
  scope: 'instance' | string;
  note: string;
  minutes: number;
  generatedAt: string;
  countingSince: string;
  totalRejections: number;
  tenants: TenantRateLimitRejections[];
}

/** The API returns at most this many tenants. */
export const MAX_REJECTION_TENANTS = 50;

export const REJECTION_KIND_LABELS: Record<RateLimitRejectionKind, string> = {
  User: 'Signed-in users',
  TrayDevice: 'Tray devices',
  Anonymous: 'Signed-out visitors',
  AdminAnonymous: 'Admin sign-in page',
  Admin: 'Platform admins',
  PreAuthentication: 'Before sign-in (per IP)',
};

export function rejectionKindLabel(kind: string): string {
  return REJECTION_KIND_LABELS[kind as RateLimitRejectionKind] ?? kind;
}

/** Plain-English labels from the admin-managed rate limits guide. */
export const RATE_LIMIT_LABELS: Record<RateLimitName, { title: string; countedBy: string }> = {
  Anonymous: { title: 'Signed-out visitors', countedBy: 'Each IP address, tenant API' },
  SignedIn: { title: 'Signed-in user', countedBy: 'Each user' },
  TrayDevice: { title: 'Tray app', countedBy: 'Each tray device' },
  TenantCeiling: { title: 'Whole tenant', countedBy: 'All users and devices together' },
  AdminAnonymous: { title: 'Admin sign-in page', countedBy: 'Each IP address, admin API' },
  AdminSignedIn: { title: 'Platform admin', countedBy: 'Each admin' },
};

export const RATE_LIMIT_SOURCE_LABELS: Record<RateLimitSource, string> = {
  tenant: 'Tenant override',
  plan: 'Plan override',
  global: 'Global override',
  appsettings: 'Default (appsettings)',
};

export function hasBurst(limit: { algorithm: RateLimitAlgorithm }): boolean {
  return limit.algorithm === 'token_bucket';
}

/** The message to show for a failed save or removal. */
export function rateLimitErrorMessage(error: HttpErrorResponse, fallback: string): string {
  if (error.status === 409) {
    return 'Someone else changed this limit since you opened it. Close this, reload and try again.';
  }
  const body = error.error as
    | { detail?: string; title?: string; errors?: Record<string, string[] | string> }
    | null
    | undefined;
  const firstFieldError = body?.errors
    ? Object.values(body.errors).flatMap((value) => (Array.isArray(value) ? value : [value]))[0]
    : undefined;
  return body?.detail ?? firstFieldError ?? fallback;
}

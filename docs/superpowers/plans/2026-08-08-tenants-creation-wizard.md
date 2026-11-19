# Tenants Creation Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-step tenant creation wizard at `/tenants/new`, and add a provisioning
activation checklist to the existing `TenantDetail` page so a newly created tenant can be
activated (currently a dead end).

**Architecture:** A single `TenantWizard` route component owns all wizard state (three
`ReactiveFormsModule` form groups, one per data-bearing step) and renders the active step
conditionally — no per-step child components or sub-routes. `TenantDetail` gains a
provisioning-summary fetch and a "Confirm & Activate" action, reusing the existing
`ConfirmationDialog` component exactly as its other status actions already do.

**Tech Stack:** Angular 21 standalone components, signals, `ReactiveFormsModule`,
`i18n-iso-countries` (new dependency, matching the pattern already used in the sibling
tenant-facing app), Jest.

## Global Constraints

- Backend endpoint `GET /admin/v1/subscription-plans` already exists (merged from
  `feature/admin-subscription-plans-list`) — do not re-implement it.
- `commercial_model` is always sent as `"standard"` — no UI field for it (see spec's Step 2).
- Owner Invite is **required**, not skippable (spec decision, confirmed with the user).
- No trial/grace-period override UI — the wizard always omits those fields so the backend falls
  back to the selected plan's defaults.
- `tenants/new` route must be registered **before** `tenants/:id` in `app.routes.ts` — Angular
  matches routes in array order, and `:id` would otherwise swallow the literal `new` segment.
- `TenantDetailDto`/`TenantDetail` model uses explicit snake_case-mapped fields; every other DTO
  touched in this plan (`TenantValidationResponseDto`, `CreateTenantDraftResponseDto`,
  `ProvisioningSummaryDto`, `SubscriptionPlanSummaryDto`) is plain camelCase — match each
  correctly, don't assume one convention everywhere.

---

### Task 1: Data layer — models, services, curated dropdown options

**Files:**
- Modify: `src/app/modules/tenants/data/tenant.model.ts`
- Modify: `src/app/modules/tenants/data/tenants.service.ts`
- Modify: `src/app/modules/tenants/data/tenants.service.spec.ts`
- Modify: `src/app/core/config/api-endpoints.ts`
- Create: `src/app/modules/subscription-plans/data/subscription-plan.model.ts`
- Create: `src/app/modules/subscription-plans/data/subscription-plans.service.ts`
- Create: `src/app/modules/subscription-plans/data/subscription-plans.service.spec.ts`
- Create: `src/app/modules/tenants/utils/tenant-options.ts`
- Modify: `package.json` (add `i18n-iso-countries`)

**Interfaces:**
- Consumes: nothing from other tasks (this is the first task).
- Produces: `TenantValidationResult`, `CreateTenantRequest`, `CreateTenantResult`,
  `ProvisioningSummary` (all exported from `tenant.model.ts`); `TenantsService.validate()`,
  `.create()`, `.getProvisioningSummary()`, `.confirmProvisioning()`; `SubscriptionPlanSummary`
  (from `subscription-plan.model.ts`) and `SubscriptionPlansService.list()`; the curated option
  arrays `INDUSTRY_OPTIONS`, `COMPANY_SIZE_OPTIONS`, `COUNTRY_CODE_OPTIONS`,
  `CURRENCY_CODE_OPTIONS`, `TIMEZONE_OPTIONS` from `tenant-options.ts`. Tasks 2 and 3 import all
  of these by exact name.

- [ ] **Step 1: Install the new dependency**

Run: `npm install i18n-iso-countries`
Expected: `package.json`/`package-lock.json` gain the dependency, no errors.

- [ ] **Step 2: Write the curated dropdown options file**

Create `src/app/modules/tenants/utils/tenant-options.ts`:

```typescript
import * as isoCountries from 'i18n-iso-countries';
import * as isoCountriesEnLocale from 'i18n-iso-countries/langs/en.json';

isoCountries.registerLocale(isoCountriesEnLocale);

export interface SelectOption {
  value: string;
  label: string;
}

export const INDUSTRY_OPTIONS: readonly SelectOption[] = [
  { value: 'office_it', label: 'Office / IT' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'other', label: 'Other' },
];

export const COMPANY_SIZE_OPTIONS: readonly SelectOption[] = [
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
];

const COUNTRY_NAMES_BY_ALPHA2 = isoCountries.getNames('en', { select: 'official' });

/** ISO-3166-1 alpha-3 codes — matches the backend's Country field (NotEmpty, MaxLength(3)). */
export const COUNTRY_CODE_OPTIONS: readonly SelectOption[] = Object.entries(COUNTRY_NAMES_BY_ALPHA2)
  .map(([alpha2, name]) => {
    const alpha3 = isoCountries.alpha2ToAlpha3(alpha2) ?? alpha2;
    return { value: alpha3, label: `${name} (${alpha3})` };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

const CURRENCY_DISPLAY_NAMES = new Intl.DisplayNames(['en'], { type: 'currency' });

export const CURRENCY_CODE_OPTIONS: readonly SelectOption[] = Intl.supportedValuesOf('currency')
  .map((code) => ({ value: code, label: `${code} - ${CURRENCY_DISPLAY_NAMES.of(code)}` }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const TIMEZONE_OPTIONS: readonly SelectOption[] = Intl.supportedValuesOf('timeZone')
  .map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

This file has no service/DI surface (plain constants + a pure function), so there's no unit test
to write for it — its correctness is exercised indirectly through the wizard's own tests in
Task 2.

- [ ] **Step 3: Write the failing subscription-plans data-layer test**

Create `src/app/modules/subscription-plans/data/subscription-plans.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SubscriptionPlansService } from './subscription-plans.service';
import { environment } from '../../../../environments/environment';

describe('SubscriptionPlansService', () => {
  let service: SubscriptionPlansService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SubscriptionPlansService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists subscription plans', () => {
    let result: unknown;
    service.list().subscribe((plans) => (result = plans));

    const req = httpMock.expectOne(`${environment.apiUrl}/subscription-plans`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    const plan = {
      id: 'plan-1',
      name: 'Starter - 51-200',
      code: 'starter_51_200',
      tier: 'starter',
      companySizeRange: '51-200',
      effectiveMonthlyPrice: 7.5,
      effectiveAnnualPrice: 75,
      currency: 'USD',
      isActive: true,
    };
    req.flush([plan]);

    expect(result).toEqual([plan]);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npm test -- subscription-plans.service`
Expected: FAIL — `Cannot find module './subscription-plans.service'` (or `./subscription-plan.model`).

- [ ] **Step 5: Add the `subscriptionPlans` endpoint entry**

In `src/app/core/config/api-endpoints.ts`, add this key to the `API_ENDPOINTS` object, after the
existing `roles` key:

```typescript
  subscriptionPlans: {
    list: '/subscription-plans',
  },
```

- [ ] **Step 6: Write the model and service**

Create `src/app/modules/subscription-plans/data/subscription-plan.model.ts`:

```typescript
export interface SubscriptionPlanSummary {
  id: string;
  name: string;
  code: string;
  tier: string;
  companySizeRange: string;
  effectiveMonthlyPrice: number;
  effectiveAnnualPrice: number;
  currency: string;
  isActive: boolean;
}
```

Create `src/app/modules/subscription-plans/data/subscription-plans.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import { SubscriptionPlanSummary } from './subscription-plan.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionPlansService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(): Observable<SubscriptionPlanSummary[]> {
    return this.http.get<SubscriptionPlanSummary[]>(
      `${this.baseUrl}${API_ENDPOINTS.subscriptionPlans.list}`,
      { withCredentials: true },
    );
  }
}
```

- [ ] **Step 7: Run it to verify it passes**

Run: `npm test -- subscription-plans.service`
Expected: PASS (1 test).

- [ ] **Step 8: Write the failing tenants data-layer tests**

Add these four `it` blocks to `src/app/modules/tenants/data/tenants.service.spec.ts`, after the
existing `'sends the status change action and reason'` test and before the closing `});`:

```typescript
  it('validates with only the provided query params', () => {
    service.validate({ slug: 'acme' }).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/tenants/validate` && r.params.get('slug') === 'acme',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('company_name')).toBe(false);
    req.flush({ valid: true, conflicts: [], warnings: [] });
  });

  it('creates a tenant with a snake_case body and an Idempotency-Key header', () => {
    let result: unknown;
    service
      .create({
        companyName: 'Acme Inc',
        slug: 'acme',
        industryProfile: 'office_it',
        companySizeRange: '51-200',
        legalEntityName: 'Acme Legal LLC',
        registrationNumber: null,
        country: 'USA',
        timezone: 'America/New_York',
        currency: 'USD',
        planId: 'plan-1',
        billingCycle: 'monthly',
        ownerInvite: { email: 'owner@acme.com', firstName: 'Ada', lastName: 'Owner' },
      })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.has('Idempotency-Key')).toBe(true);
    expect(req.request.body).toEqual({
      company_name: 'Acme Inc',
      slug: 'acme',
      industry_profile: 'office_it',
      company_size_range: '51-200',
      legal_entity_name: 'Acme Legal LLC',
      registration_number: null,
      country: 'USA',
      timezone: 'America/New_York',
      currency: 'USD',
      subscription: { plan_id: 'plan-1', billing_cycle: 'monthly', commercial_model: 'standard' },
      owner_invite: { email: 'owner@acme.com', first_name: 'Ada', last_name: 'Owner' },
    });

    const response = { tenantId: 'tenant-1', status: 'provisioning', nextStep: 'owner_invite' };
    req.flush(response);
    expect(result).toEqual(response);
  });

  it('fetches the provisioning summary', () => {
    let result: unknown;
    service.getProvisioningSummary('tenant-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1/provisioning-summary`);
    expect(req.request.method).toBe('GET');
    const summary = {
      tenantId: 'tenant-1',
      status: 'provisioning',
      sections: {
        tenantDetails: { complete: true, summary: {}, missingFields: [] },
        subscription: { complete: true, summary: {}, missingFields: [] },
        modules: { complete: true, summary: {}, missingFields: [] },
        roles: { complete: true, summary: {}, missingFields: [] },
        settings: { complete: true, summary: {}, missingFields: [] },
        ownerInvite: { complete: false, summary: {}, missingFields: ['accepted'] },
      },
      canActivate: false,
      blockingErrors: [],
      warnings: [],
    };
    req.flush(summary);
    expect(result).toEqual(summary);
  });

  it('confirms provisioning', () => {
    service.confirmProvisioning('tenant-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/tenants/tenant-1/provision/confirm`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ confirm: true });
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });
```

- [ ] **Step 9: Run them to verify they fail**

Run: `npm test -- tenants.service`
Expected: FAIL — `service.validate is not a function` (and similarly for `create`,
`getProvisioningSummary`, `confirmProvisioning`).

- [ ] **Step 10: Add the tenants endpoint entries**

In `src/app/core/config/api-endpoints.ts`, replace the existing `tenants` block with:

```typescript
  tenants: {
    list: '/tenants',
    byId: (id: string) => `/tenants/${id}`,
    status: (id: string) => `/tenants/${id}/status`,
    validate: '/tenants/validate',
    provisioningSummary: (id: string) => `/tenants/${id}/provisioning-summary`,
    confirmProvisioning: (id: string) => `/tenants/${id}/provision/confirm`,
  },
```

- [ ] **Step 11: Add the models**

In `src/app/modules/tenants/data/tenant.model.ts`, add at the end of the file:

```typescript
export interface TenantValidationConflict {
  field: string;
  message: string;
}

export interface TenantValidationWarning {
  field: string;
  message: string;
}

export interface TenantValidationResult {
  valid: boolean;
  conflicts: TenantValidationConflict[];
  warnings: TenantValidationWarning[];
}

export interface CreateTenantOwnerInvite {
  email: string;
  firstName: string;
  lastName: string;
}

export interface CreateTenantRequest {
  companyName: string;
  slug: string;
  industryProfile: string;
  companySizeRange: string;
  legalEntityName: string;
  registrationNumber: string | null;
  country: string;
  timezone: string;
  currency: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  ownerInvite: CreateTenantOwnerInvite;
}

export interface CreateTenantResult {
  tenantId: string;
  status: string;
  nextStep: string;
}

export interface ProvisioningSectionStatus {
  complete: boolean;
  summary: Record<string, unknown>;
  missingFields: string[];
}

export interface ProvisioningSections {
  tenantDetails: ProvisioningSectionStatus;
  subscription: ProvisioningSectionStatus;
  modules: ProvisioningSectionStatus;
  roles: ProvisioningSectionStatus;
  settings: ProvisioningSectionStatus;
  ownerInvite: ProvisioningSectionStatus;
}

export interface ProvisioningIssue {
  code: string;
  message: string;
  section: string;
}

export interface ProvisioningSummary {
  tenantId: string;
  status: string;
  sections: ProvisioningSections;
  canActivate: boolean;
  blockingErrors: ProvisioningIssue[];
  warnings: ProvisioningIssue[];
}
```

- [ ] **Step 12: Add the service methods**

In `src/app/modules/tenants/data/tenants.service.ts`, add these imports alongside the existing
ones:

```typescript
import {
  CreateTenantRequest,
  CreateTenantResult,
  ProvisioningSummary,
  TenantValidationResult,
} from './tenant.model';
```

Then add these four methods to the `TenantsService` class, after the existing `changeStatus`
method:

```typescript
  validate(params: {
    slug?: string;
    companyName?: string;
    emailDomain?: string;
    registrationNumber?: string;
    country?: string;
  }): Observable<TenantValidationResult> {
    let httpParams = new HttpParams();
    if (params.slug) httpParams = httpParams.set('slug', params.slug);
    if (params.companyName) httpParams = httpParams.set('company_name', params.companyName);
    if (params.emailDomain) httpParams = httpParams.set('email_domain', params.emailDomain);
    if (params.registrationNumber) {
      httpParams = httpParams.set('registration_number', params.registrationNumber);
    }
    if (params.country) httpParams = httpParams.set('country', params.country);

    return this.http.get<TenantValidationResult>(`${this.baseUrl}${API_ENDPOINTS.tenants.validate}`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  create(request: CreateTenantRequest): Observable<CreateTenantResult> {
    const body = {
      company_name: request.companyName,
      slug: request.slug,
      industry_profile: request.industryProfile,
      company_size_range: request.companySizeRange,
      legal_entity_name: request.legalEntityName,
      registration_number: request.registrationNumber,
      country: request.country,
      timezone: request.timezone,
      currency: request.currency,
      subscription: {
        plan_id: request.planId,
        billing_cycle: request.billingCycle,
        commercial_model: 'standard',
      },
      owner_invite: {
        email: request.ownerInvite.email,
        first_name: request.ownerInvite.firstName,
        last_name: request.ownerInvite.lastName,
      },
    };

    return this.http.post<CreateTenantResult>(`${this.baseUrl}${API_ENDPOINTS.tenants.list}`, body, {
      withCredentials: true,
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
  }

  getProvisioningSummary(id: string): Observable<ProvisioningSummary> {
    return this.http.get<ProvisioningSummary>(
      `${this.baseUrl}${API_ENDPOINTS.tenants.provisioningSummary(id)}`,
      { withCredentials: true },
    );
  }

  confirmProvisioning(id: string): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}${API_ENDPOINTS.tenants.confirmProvisioning(id)}`,
      { confirm: true },
      { withCredentials: true },
    );
  }
```

- [ ] **Step 13: Run the tenants service tests to verify they pass**

Run: `npm test -- tenants.service`
Expected: PASS (all tests, existing + 4 new).

- [ ] **Step 14: Commit**

```bash
git add package.json package-lock.json src/app/modules/tenants/data/tenant.model.ts src/app/modules/tenants/data/tenants.service.ts src/app/modules/tenants/data/tenants.service.spec.ts src/app/modules/tenants/utils/tenant-options.ts src/app/modules/subscription-plans src/app/core/config/api-endpoints.ts
git commit -m "feat: add tenant creation, validation, and provisioning data-layer methods"
```

---

### Task 2: TenantWizard component and its route

**Files:**
- Create: `src/app/modules/tenants/feature/tenant-wizard/tenant-wizard.ts`
- Create: `src/app/modules/tenants/feature/tenant-wizard/tenant-wizard.html`
- Create: `src/app/modules/tenants/feature/tenant-wizard/tenant-wizard.spec.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/modules/tenants/feature/tenants-list/tenants-list.ts`
- Modify: `src/app/modules/tenants/feature/tenants-list/tenants-list.html`
- Modify: `src/app/modules/tenants/feature/tenants-list/tenants-list.spec.ts`

**Interfaces:**
- Consumes: `TenantsService.validate/create` (Task 1), `SubscriptionPlansService.list` (Task 1),
  `SubscriptionPlanSummary` (Task 1), curated option arrays and `slugify` from `tenant-options.ts`
  (Task 1), `PermissionStore.hasPermission('platform.tenants.manage')` (existing),
  `NotificationService.success/error` (existing), `Button`/`Loader`/`ErrorBanner` (existing).
- Produces: route `/tenants/new` rendering `TenantWizard`; a "Create Tenant" button on
  `TenantsList` gated on `platform.tenants.manage`, navigating there.

- [ ] **Step 1: Write the failing wizard test file**

Create `src/app/modules/tenants/feature/tenant-wizard/tenant-wizard.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantWizard } from './tenant-wizard';
import { TenantsService } from '../../data/tenants.service';
import { SubscriptionPlansService } from '../../../subscription-plans/data/subscription-plans.service';
import { NotificationService } from '../../../../core/services/notification.service';

describe('TenantWizard', () => {
  let tenantsService: {
    validate: jest.Mock;
    create: jest.Mock;
  };
  let plansService: { list: jest.Mock };
  let notificationService: { success: jest.Mock; error: jest.Mock };
  let router: { navigate: jest.Mock };

  const plan = {
    id: 'plan-1',
    name: 'Starter - 51-200',
    code: 'starter_51_200',
    tier: 'starter',
    companySizeRange: '51-200',
    effectiveMonthlyPrice: 7.5,
    effectiveAnnualPrice: 75,
    currency: 'USD',
    isActive: true,
  };

  function createComponent() {
    const fixture = TestBed.createComponent(TenantWizard);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    tenantsService = { validate: jest.fn().mockReturnValue(of({ valid: true, conflicts: [], warnings: [] })), create: jest.fn() };
    plansService = { list: jest.fn().mockReturnValue(of([plan])) };
    notificationService = { success: jest.fn(), error: jest.fn() };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [TenantWizard],
      providers: [
        { provide: TenantsService, useValue: tenantsService },
        { provide: SubscriptionPlansService, useValue: plansService },
        { provide: NotificationService, useValue: notificationService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  it('auto-generates the slug from the company name until the slug is edited manually', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['onCompanyNameChanged']('Acme Inc.');
    expect(component['companyForm'].controls.slug.value).toBe('acme-inc');

    component['onSlugChanged']('custom-slug');
    component['onCompanyNameChanged']('Something Else');
    expect(component['companyForm'].controls.slug.value).toBe('custom-slug');
  });

  it('blocks moving to step 2 when the company details form is invalid', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['nextStep']();

    expect(component['currentStep']()).toBe(1);
    expect(component['companyForm'].touched).toBe(true);
  });

  it('advances through all four steps once each step is valid', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['companyForm'].setValue({
      companyName: 'Acme Inc',
      slug: 'acme-inc',
      industryProfile: 'office_it',
      companySizeRange: '51-200',
      legalEntityName: 'Acme Legal LLC',
      registrationNumber: '',
      country: 'USA',
      timezone: 'America/New_York',
      currency: 'USD',
    });
    component['nextStep']();
    expect(component['currentStep']()).toBe(2);

    component['selectPlan']('plan-1');
    component['nextStep']();
    expect(component['currentStep']()).toBe(3);

    component['ownerForm'].setValue({ email: 'owner@acme.com', firstName: 'Ada', lastName: 'Owner' });
    component['nextStep']();
    expect(component['currentStep']()).toBe(4);
  });

  it('submits the combined request and navigates to the new tenant on success', () => {
    tenantsService.create.mockReturnValue(
      of({ tenantId: 'tenant-1', status: 'provisioning', nextStep: 'owner_invite' }),
    );
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['companyForm'].setValue({
      companyName: 'Acme Inc',
      slug: 'acme-inc',
      industryProfile: 'office_it',
      companySizeRange: '51-200',
      legalEntityName: 'Acme Legal LLC',
      registrationNumber: '',
      country: 'USA',
      timezone: 'America/New_York',
      currency: 'USD',
    });
    component['subscriptionForm'].setValue({ planId: 'plan-1', billingCycle: 'monthly' });
    component['ownerForm'].setValue({ email: 'owner@acme.com', firstName: 'Ada', lastName: 'Owner' });

    component['submit']();

    expect(tenantsService.create).toHaveBeenCalledWith({
      companyName: 'Acme Inc',
      slug: 'acme-inc',
      industryProfile: 'office_it',
      companySizeRange: '51-200',
      legalEntityName: 'Acme Legal LLC',
      registrationNumber: null,
      country: 'USA',
      timezone: 'America/New_York',
      currency: 'USD',
      planId: 'plan-1',
      billingCycle: 'monthly',
      ownerInvite: { email: 'owner@acme.com', firstName: 'Ada', lastName: 'Owner' },
    });
    expect(notificationService.success).toHaveBeenCalledWith('Tenant created.');
    expect(router.navigate).toHaveBeenCalledWith(['/tenants', 'tenant-1']);
  });

  it('shows the backend error detail and stays on the review step when create fails', () => {
    tenantsService.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { detail: "slug 'acme-inc' is already taken." } })),
    );
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['companyForm'].setValue({
      companyName: 'Acme Inc',
      slug: 'acme-inc',
      industryProfile: 'office_it',
      companySizeRange: '51-200',
      legalEntityName: 'Acme Legal LLC',
      registrationNumber: '',
      country: 'USA',
      timezone: 'America/New_York',
      currency: 'USD',
    });
    component['subscriptionForm'].setValue({ planId: 'plan-1', billingCycle: 'monthly' });
    component['ownerForm'].setValue({ email: 'owner@acme.com', firstName: 'Ada', lastName: 'Owner' });

    component['submit']();

    expect(component['submitError']()).toBe("slug 'acme-inc' is already taken.");
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('loads active subscription plans on init', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(plansService.list).toHaveBeenCalled();
    expect(component['plans']()).toEqual([plan]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tenant-wizard`
Expected: FAIL — `Cannot find module './tenant-wizard'`.

- [ ] **Step 3: Write the component**

Create `src/app/modules/tenants/feature/tenant-wizard/tenant-wizard.ts`:

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantsService } from '../../data/tenants.service';
import { CreateTenantRequest } from '../../data/tenant.model';
import { SubscriptionPlansService } from '../../../subscription-plans/data/subscription-plans.service';
import { SubscriptionPlanSummary } from '../../../subscription-plans/data/subscription-plan.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import {
  COMPANY_SIZE_OPTIONS,
  COUNTRY_CODE_OPTIONS,
  CURRENCY_CODE_OPTIONS,
  INDUSTRY_OPTIONS,
  TIMEZONE_OPTIONS,
  slugify,
} from '../../utils/tenant-options';

const SLUG_VALIDATION_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-tenant-wizard',
  imports: [ReactiveFormsModule, Button, Loader, ErrorBanner],
  templateUrl: './tenant-wizard.html',
})
export class TenantWizard implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly tenantsService = inject(TenantsService);
  private readonly plansService = inject(SubscriptionPlansService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly industryOptions = INDUSTRY_OPTIONS;
  protected readonly companySizeOptions = COMPANY_SIZE_OPTIONS;
  protected readonly countryOptions = COUNTRY_CODE_OPTIONS;
  protected readonly currencyOptions = CURRENCY_CODE_OPTIONS;
  protected readonly timezoneOptions = TIMEZONE_OPTIONS;

  protected readonly currentStep = signal(1);

  protected readonly companyForm = this.formBuilder.nonNullable.group({
    companyName: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/)]],
    industryProfile: ['office_it', Validators.required],
    companySizeRange: ['1-10', Validators.required],
    legalEntityName: ['', Validators.required],
    registrationNumber: [''],
    country: ['', Validators.required],
    timezone: ['', Validators.required],
    currency: ['', Validators.required],
  });

  protected readonly subscriptionForm = this.formBuilder.nonNullable.group({
    planId: ['', Validators.required],
    billingCycle: this.formBuilder.nonNullable.control<'monthly' | 'annual'>('monthly'),
  });

  protected readonly ownerForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
  });

  protected readonly slugManuallyEdited = signal(false);
  protected readonly slugConflict = signal<string | null>(null);
  private slugValidationTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly plans = signal<SubscriptionPlanSummary[]>([]);
  protected readonly loadingPlans = signal(false);
  protected readonly plansError = signal<string | null>(null);

  protected readonly selectedPlan = computed(
    () => this.plans().find((p) => p.id === this.subscriptionForm.controls.planId.value) ?? null,
  );

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadingPlans.set(true);
    this.plansService.list().subscribe({
      next: (plans) => {
        this.plans.set(plans.filter((p) => p.isActive));
        this.loadingPlans.set(false);
      },
      error: () => {
        this.plansError.set('Could not load subscription plans.');
        this.loadingPlans.set(false);
      },
    });
  }

  protected onCompanyNameChanged(value: string): void {
    this.companyForm.controls.companyName.setValue(value);
    if (!this.slugManuallyEdited()) {
      this.companyForm.controls.slug.setValue(slugify(value));
    }
  }

  protected onSlugChanged(value: string): void {
    this.slugManuallyEdited.set(true);
    this.companyForm.controls.slug.setValue(value);
    this.scheduleSlugValidation(value);
  }

  private scheduleSlugValidation(slug: string): void {
    clearTimeout(this.slugValidationTimer);
    this.slugConflict.set(null);
    if (!slug) {
      return;
    }
    this.slugValidationTimer = setTimeout(() => {
      this.tenantsService.validate({ slug }).subscribe({
        next: (result) => {
          const conflict = result.conflicts.find((c) => c.field === 'slug');
          this.slugConflict.set(conflict ? conflict.message : null);
        },
      });
    }, SLUG_VALIDATION_DEBOUNCE_MS);
  }

  protected selectPlan(planId: string): void {
    this.subscriptionForm.controls.planId.setValue(planId);
  }

  protected nextStep(): void {
    const step = this.currentStep();
    if (step === 1 && this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }
    if (step === 2 && this.subscriptionForm.invalid) {
      this.subscriptionForm.markAllAsTouched();
      return;
    }
    if (step === 3 && this.ownerForm.invalid) {
      this.ownerForm.markAllAsTouched();
      return;
    }
    this.currentStep.set(step + 1);
  }

  protected prevStep(): void {
    this.currentStep.set(Math.max(1, this.currentStep() - 1));
  }

  protected submit(): void {
    this.submitting.set(true);
    this.submitError.set(null);

    const company = this.companyForm.getRawValue();
    const subscription = this.subscriptionForm.getRawValue();
    const owner = this.ownerForm.getRawValue();

    const request: CreateTenantRequest = {
      companyName: company.companyName,
      slug: company.slug,
      industryProfile: company.industryProfile,
      companySizeRange: company.companySizeRange,
      legalEntityName: company.legalEntityName,
      registrationNumber: company.registrationNumber || null,
      country: company.country,
      timezone: company.timezone,
      currency: company.currency,
      planId: subscription.planId,
      billingCycle: subscription.billingCycle,
      ownerInvite: {
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
      },
    };

    this.tenantsService.create(request).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.notificationService.success('Tenant created.');
        this.router.navigate(['/tenants', result.tenantId]);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.submitError.set(error.error?.detail ?? 'Could not create the tenant.');
      },
    });
  }
}
```

- [ ] **Step 4: Write the template**

Create `src/app/modules/tenants/feature/tenant-wizard/tenant-wizard.html`:

```html
<div class="mx-auto flex max-w-3xl flex-col gap-6 rounded-2xl bg-white p-6 shadow-sm">
  <div>
    <h1 class="text-xl font-semibold text-slate-900">Create Tenant</h1>
    <p class="mt-1 text-sm text-slate-500">Step {{ currentStep() }} of 4</p>
  </div>

  @if (currentStep() === 1) {
    <form [formGroup]="companyForm" class="flex flex-col gap-4">
      <div>
        <label class="text-sm font-medium text-slate-700">Company Name</label>
        <input
          type="text"
          [value]="companyForm.controls.companyName.value"
          (input)="onCompanyNameChanged($any($event.target).value)"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label class="text-sm font-medium text-slate-700">Slug</label>
        <input
          type="text"
          [value]="companyForm.controls.slug.value"
          (input)="onSlugChanged($any($event.target).value)"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        @if (slugConflict(); as conflict) {
          <p class="mt-1 text-xs text-red-700">{{ conflict }}</p>
        }
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-slate-700">Industry</label>
          <select formControlName="industryProfile" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            @for (option of industryOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">Company Size</label>
          <select formControlName="companySizeRange" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            @for (option of companySizeOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
      </div>
      <div>
        <label class="text-sm font-medium text-slate-700">Legal Entity Name</label>
        <input type="text" formControlName="legalEntityName" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-sm font-medium text-slate-700">Registration Number (optional)</label>
        <input type="text" formControlName="registrationNumber" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="text-sm font-medium text-slate-700">Country</label>
          <select formControlName="country" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            @for (option of countryOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">Timezone</label>
          <select formControlName="timezone" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            @for (option of timezoneOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">Currency</label>
          <select formControlName="currency" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            @for (option of currencyOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
      </div>
    </form>
  }

  @if (currentStep() === 2) {
    @if (loadingPlans()) {
      <app-loader label="Loading plans…" />
    } @else if (plansError(); as message) {
      <app-error-banner [message]="message" />
    } @else {
      <div class="flex flex-col gap-3">
        @for (plan of plans(); track plan.id) {
          <button
            type="button"
            (click)="selectPlan(plan.id)"
            class="flex items-center justify-between rounded-lg border p-4 text-left"
            [class.border-indigo-600]="selectedPlan()?.id === plan.id"
            [class.border-slate-200]="selectedPlan()?.id !== plan.id"
          >
            <div>
              <p class="font-semibold text-slate-900">{{ plan.name }}</p>
              <p class="text-sm text-slate-500">{{ plan.tier }} · {{ plan.companySizeRange }}</p>
            </div>
            <p class="text-sm text-slate-900">{{ plan.currency }} {{ plan.effectiveMonthlyPrice }}/mo</p>
          </button>
        }
      </div>
      <form [formGroup]="subscriptionForm" class="mt-4 flex gap-4">
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" formControlName="billingCycle" value="monthly" />
          Monthly
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" formControlName="billingCycle" value="annual" />
          Annual
        </label>
      </form>
    }
  }

  @if (currentStep() === 3) {
    <form [formGroup]="ownerForm" class="flex flex-col gap-4">
      <div>
        <label class="text-sm font-medium text-slate-700">Owner Email</label>
        <input type="email" formControlName="email" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-slate-700">First Name</label>
          <input type="text" formControlName="firstName" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="text-sm font-medium text-slate-700">Last Name</label>
          <input type="text" formControlName="lastName" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>
    </form>
  }

  @if (currentStep() === 4) {
    <div class="flex flex-col gap-4 text-sm">
      <div>
        <h2 class="font-semibold text-slate-900">Company Details</h2>
        <p>{{ companyForm.controls.companyName.value }} ({{ companyForm.controls.slug.value }})</p>
        <p>{{ companyForm.controls.legalEntityName.value }} · {{ companyForm.controls.country.value }}</p>
      </div>
      <div>
        <h2 class="font-semibold text-slate-900">Subscription</h2>
        <p>{{ selectedPlan()?.name }} · {{ subscriptionForm.controls.billingCycle.value }}</p>
      </div>
      <div>
        <h2 class="font-semibold text-slate-900">Owner Invite</h2>
        <p>{{ ownerForm.controls.firstName.value }} {{ ownerForm.controls.lastName.value }} · {{ ownerForm.controls.email.value }}</p>
      </div>
      @if (submitError(); as message) {
        <app-error-banner [message]="message" />
      }
    </div>
  }

  <div class="flex justify-between border-t border-slate-100 pt-4">
    @if (currentStep() > 1) {
      <app-button label="Back" variant="secondary" (clicked)="prevStep()" />
    } @else {
      <span></span>
    }
    @if (currentStep() < 4) {
      <app-button label="Next" (clicked)="nextStep()" />
    } @else {
      <app-button label="Create Tenant" variant="indigo" [loading]="submitting()" (clicked)="submit()" />
    }
  </div>
</div>
```

- [ ] **Step 5: Run the wizard tests to verify they pass**

Run: `npm test -- tenant-wizard`
Expected: PASS (6 tests).

- [ ] **Step 6: Register the route (before `tenants/:id`)**

In `src/app/app.routes.ts`, replace:

```typescript
      {
        path: 'tenants',
        loadComponent: () =>
          import('./modules/tenants/feature/tenants-list/tenants-list').then((m) => m.TenantsList),
      },
      {
        path: 'tenants/:id',
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-detail/tenant-detail').then((m) => m.TenantDetailComponent),
      },
```

with:

```typescript
      {
        path: 'tenants',
        loadComponent: () =>
          import('./modules/tenants/feature/tenants-list/tenants-list').then((m) => m.TenantsList),
      },
      {
        path: 'tenants/new',
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-wizard/tenant-wizard').then((m) => m.TenantWizard),
      },
      {
        path: 'tenants/:id',
        loadComponent: () =>
          import('./modules/tenants/feature/tenant-detail/tenant-detail').then((m) => m.TenantDetailComponent),
      },
```

- [ ] **Step 7: Write the failing "Create Tenant" button test**

Read `src/app/modules/tenants/feature/tenants-list/tenants-list.spec.ts` first to find its exact
`createComponent()`/permission-context helpers, then add this test using those same helpers
(mirroring the existing `'hides the Invite Manager button without platform.accounts.manage'`-style
tests already in this codebase's other list specs):

```typescript
  it('shows the Create Tenant link only with platform.tenants.manage', () => {
    permissionStore.setAuthorizationContext(buildAuthContext(['platform.tenants.read']));
    tenantsService.list.mockReturnValue(of({ items: [], total: 0, page: 1, pageSize: 20 }));
    const fixtureWithoutManage = createComponent();
    expect(fixtureWithoutManage.nativeElement.textContent).not.toContain('Create Tenant');

    permissionStore.setAuthorizationContext(
      buildAuthContext(['platform.tenants.read', 'platform.tenants.manage']),
    );
    const fixtureWithManage = createComponent();
    expect(fixtureWithManage.nativeElement.textContent).toContain('Create Tenant');
  });
```

(Adapt the exact mock/helper names to whatever `tenants-list.spec.ts` already uses — it follows
the same `buildAuthContext`/`permissionStore.setAuthorizationContext` shape as every other list
spec in this codebase.)

- [ ] **Step 8: Run it to verify it fails**

Run: `npm test -- tenants-list`
Expected: FAIL — `Create Tenant` text not found (the button doesn't exist yet).

- [ ] **Step 9: Add `canManage` and the button**

In `src/app/modules/tenants/feature/tenants-list/tenants-list.ts`, add this line right after the
existing `canView` computed:

```typescript
  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.tenants.manage'));
```

In `src/app/modules/tenants/feature/tenants-list/tenants-list.html`, inside the header `<div>`
that currently only contains the `<h1>`/`<p>` pair, add a sibling button after it (turning that
container into a flex row matching the `PlatformUsersList` header pattern):

```html
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Tenants</h1>
        <p class="mt-1 text-sm text-slate-500">Manage tenant accounts and their status</p>
      </div>
      @if (canManage()) {
        <a routerLink="/tenants/new">
          <app-button label="Create Tenant" variant="indigo" />
        </a>
      }
    </div>
```

(This replaces the existing plain `<div>` wrapping the `<h1>`/`<p>` pair at the top of the file.)

In `src/app/modules/tenants/feature/tenants-list/tenants-list.ts`, add this import alongside the
existing ones:

```typescript
import { Button } from '../../../../shared/ui/button/button';
```

Then add `Button` to the `imports` array in the `@Component` decorator, alongside the existing
`RouterLink, StatusBadge, Loader, ErrorBanner, EmptyState, Pagination, DatePipe`.

- [ ] **Step 10: Run the tenants-list tests to verify they pass**

Run: `npm test -- tenants-list`
Expected: PASS (all existing tests + the new one).

- [ ] **Step 11: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 12: Commit**

```bash
git add src/app/app.routes.ts src/app/modules/tenants/feature/tenant-wizard src/app/modules/tenants/feature/tenants-list
git commit -m "feat: add Tenants Creation Wizard and its entry point"
```

---

### Task 3: TenantDetail provisioning checklist and activation

**Files:**
- Modify: `src/app/modules/tenants/feature/tenant-detail/tenant-detail.ts`
- Modify: `src/app/modules/tenants/feature/tenant-detail/tenant-detail.html`
- Modify: `src/app/modules/tenants/feature/tenant-detail/tenant-detail.spec.ts`

**Interfaces:**
- Consumes: `TenantsService.getProvisioningSummary/confirmProvisioning` (Task 1),
  `ProvisioningSummary` model (Task 1), existing `ConfirmationDialog` component.
- Produces: nothing further downstream — this is the plan's final task.

- [ ] **Step 1: Read the existing spec file for its helpers**

Read `src/app/modules/tenants/feature/tenant-detail/tenant-detail.spec.ts` in full before writing
new tests, to reuse its exact `tenantsService` mock shape, `permissionStore` setup, and
`createComponent()` helper rather than duplicating or diverging from them.

- [ ] **Step 2: Write the failing provisioning-checklist tests**

Add these tests to `tenant-detail.spec.ts`, adapting the mock service object declared in that
file's `beforeEach` to also include `getProvisioningSummary: jest.fn()` and
`confirmProvisioning: jest.fn()` alongside its existing `getById`/`changeStatus` mocks:

```typescript
  const provisioningTenant = {
    id: 'tenant-1',
    companyName: 'Acme Inc',
    slug: 'acme',
    industryProfile: 'office_it',
    companySizeRange: '51-200',
    status: 'provisioning',
    subscriptionPlanId: 'plan-1',
    settingsJson: null,
    legalEntityName: 'Acme Legal LLC',
    registrationNumber: null,
    country: 'USA',
    currency: 'USD',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
  };

  const incompleteSummary = {
    tenantId: 'tenant-1',
    status: 'provisioning',
    sections: {
      tenantDetails: { complete: true, summary: {}, missingFields: [] },
      subscription: { complete: true, summary: {}, missingFields: [] },
      modules: { complete: true, summary: {}, missingFields: [] },
      roles: { complete: true, summary: {}, missingFields: [] },
      settings: { complete: true, summary: {}, missingFields: [] },
      ownerInvite: { complete: false, summary: {}, missingFields: ['accepted'] },
    },
    canActivate: false,
    blockingErrors: [{ code: 'owner_invite_pending', message: 'Owner has not accepted the invite yet.', section: 'ownerInvite' }],
    warnings: [],
  };

  it('shows the provisioning checklist when the tenant is provisioning', () => {
    tenantsService.getById.mockReturnValue(of(provisioningTenant));
    tenantsService.getProvisioningSummary.mockReturnValue(of(incompleteSummary));

    const fixture = createComponent();

    expect(tenantsService.getProvisioningSummary).toHaveBeenCalledWith('tenant-1');
    expect(fixture.nativeElement.textContent).toContain('Owner has not accepted the invite yet.');
  });

  it('disables Confirm & Activate when canActivate is false', () => {
    tenantsService.getById.mockReturnValue(of(provisioningTenant));
    tenantsService.getProvisioningSummary.mockReturnValue(of(incompleteSummary));

    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['provisioningSummary']()?.canActivate).toBe(false);
  });

  it('activates the tenant and reloads on confirm', () => {
    tenantsService.getById.mockReturnValue(of(provisioningTenant));
    tenantsService.getProvisioningSummary.mockReturnValue(
      of({ ...incompleteSummary, canActivate: true, blockingErrors: [] }),
    );
    tenantsService.confirmProvisioning.mockReturnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const loadTenantSpy = jest.spyOn(component, 'loadTenant');

    component['startActivation']();
    component['confirmActivation']();

    expect(tenantsService.confirmProvisioning).toHaveBeenCalledWith('tenant-1');
    expect(loadTenantSpy).toHaveBeenCalled();
  });

  it('replaces the summary with the 422 response body when confirmation is blocked', () => {
    tenantsService.getById.mockReturnValue(of(provisioningTenant));
    tenantsService.getProvisioningSummary.mockReturnValue(
      of({ ...incompleteSummary, canActivate: true, blockingErrors: [] }),
    );
    const rejectedSummary = { ...incompleteSummary, canActivate: false };
    tenantsService.confirmProvisioning.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: rejectedSummary })),
    );
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component['startActivation']();
    component['confirmActivation']();

    expect(component['provisioningSummary']()).toEqual(rejectedSummary);
  });
```

Add `HttpErrorResponse` and `throwError` to that spec file's imports if not already present
(`import { HttpErrorResponse } from '@angular/common/http';` and `throwError` from `'rxjs'`).

- [ ] **Step 3: Run them to verify they fail**

Run: `npm test -- tenant-detail`
Expected: FAIL — `tenantsService.getProvisioningSummary` is not a mock function / `component['provisioningSummary']` is not a function, etc.

- [ ] **Step 4: Add the component logic**

In `src/app/modules/tenants/feature/tenant-detail/tenant-detail.ts`, add these imports alongside
the existing ones:

```typescript
import { HttpErrorResponse } from '@angular/common/http';
import { ProvisioningSummary } from '../../data/tenant.model';
```

Add these members to the `TenantDetailComponent` class, after the existing `tenant` signal:

```typescript
  protected readonly provisioningSummary = signal<ProvisioningSummary | null>(null);
  protected readonly pendingActivation = signal(false);
  protected readonly activating = signal(false);
```

Replace the existing `loadTenant` method's success branch — change:

```typescript
    this.tenantsService.getById(this.tenantId).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.loading.set(false);
      },
```

to:

```typescript
    this.tenantsService.getById(this.tenantId).subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.loading.set(false);
        this.loadProvisioningSummaryIfNeeded(tenant);
      },
```

Add these new methods at the end of the class, before the closing `}`:

```typescript
  private loadProvisioningSummaryIfNeeded(tenant: TenantDetailModel): void {
    if (tenant.status !== 'provisioning') {
      this.provisioningSummary.set(null);
      return;
    }
    this.tenantsService.getProvisioningSummary(this.tenantId).subscribe({
      next: (summary) => this.provisioningSummary.set(summary),
    });
  }

  protected startActivation(): void {
    this.pendingActivation.set(true);
  }

  protected cancelActivation(): void {
    this.pendingActivation.set(false);
  }

  protected confirmActivation(): void {
    this.pendingActivation.set(false);
    this.activating.set(true);

    this.tenantsService.confirmProvisioning(this.tenantId).subscribe({
      next: () => {
        this.activating.set(false);
        this.notificationService.success('Tenant activated.');
        this.loadTenant();
      },
      error: (error: HttpErrorResponse) => {
        this.activating.set(false);
        if (error.status === 422 && error.error) {
          this.provisioningSummary.set(error.error as ProvisioningSummary);
        } else {
          this.notificationService.error('Could not activate the tenant.');
        }
      },
    });
  }
```

- [ ] **Step 5: Add the template section**

In `src/app/modules/tenants/feature/tenant-detail/tenant-detail.html`, add this block immediately
after the closing `</div>` of the existing `grid grid-cols-2` details section and before the
`@if (availableActions().length > 0)` block:

```html
    @if (t.status === 'provisioning' && provisioningSummary(); as summary) {
      <div class="flex flex-col gap-3 border-t border-slate-100 pt-4">
        <h2 class="text-sm font-semibold text-slate-900">Provisioning Checklist</h2>
        @if (summary.blockingErrors.length > 0) {
          <ul class="list-disc pl-5 text-sm text-red-700">
            @for (issue of summary.blockingErrors; track issue.code) {
              <li>{{ issue.message }}</li>
            }
          </ul>
        }
        <div class="grid grid-cols-2 gap-2 text-sm">
          @for (
            section of [
              { label: 'Tenant Details', status: summary.sections.tenantDetails },
              { label: 'Subscription', status: summary.sections.subscription },
              { label: 'Modules', status: summary.sections.modules },
              { label: 'Roles', status: summary.sections.roles },
              { label: 'Settings', status: summary.sections.settings },
              { label: 'Owner Invite', status: summary.sections.ownerInvite },
            ];
            track section.label
          ) {
            <p [class.text-green-700]="section.status.complete" [class.text-slate-500]="!section.status.complete">
              {{ section.status.complete ? '✓' : '○' }} {{ section.label }}
            </p>
          }
        </div>
        <app-button
          label="Confirm & Activate"
          variant="indigo"
          [disabled]="!summary.canActivate"
          [loading]="activating()"
          (clicked)="startActivation()"
        />
      </div>
    }
```

Add this second `ConfirmationDialog` block right after the existing `@if (pendingAction(); as
action)` block at the bottom of the file:

```html
  @if (pendingActivation()) {
    <app-confirmation-dialog
      [open]="true"
      title="Activate tenant?"
      message="This will activate the tenant and make it available to its users. Continue?"
      confirmLabel="Confirm & Activate"
      confirmVariant="indigo"
      (confirm)="confirmActivation()"
      (cancel)="cancelActivation()"
    />
  }
```

- [ ] **Step 6: Run the tenant-detail tests to verify they pass**

Run: `npm test -- tenant-detail`
Expected: PASS (all existing tests + the 4 new ones).

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 8: Manual smoke check (best effort)**

If a browser session is available: create a tenant through the wizard end-to-end, confirm it
lands on `TenantDetail` in `provisioning` status with the checklist visible, and that "Confirm &
Activate" is disabled until `canActivate` is true. Not blocking if a browser isn't available —
call this out in the completion report if skipped.

- [ ] **Step 9: Commit**

```bash
git add src/app/modules/tenants/feature/tenant-detail
git commit -m "feat: add provisioning checklist and activation to TenantDetail"
```

---

## Self-Review Notes

- **Spec coverage:** all four spec sections are covered — Step 1 (Company Details, Task 2),
  Step 2 (Subscription, Task 2), Step 3 (Owner Invite, Task 2), Step 4 (Review & Create, Task 2),
  and the Provisioning Checklist addition (Task 3). The data layer for all of it is Task 1.
- **No placeholders:** every step has literal code; Task 2 Step 7 explicitly says to read the
  existing spec file first rather than guessing its helper names, since those aren't yet known at
  plan-writing time (matches how the User Profile Drawer plan handled this same situation
  earlier this session).
- **Type consistency:** `CreateTenantRequest`, `ProvisioningSummary`, `SubscriptionPlanSummary`
  and their field names are defined once in Task 1 and referenced identically by name in Tasks 2
  and 3 — checked against every usage above.

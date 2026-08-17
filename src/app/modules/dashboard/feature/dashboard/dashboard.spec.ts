import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NEVER, of, throwError } from 'rxjs';
import { Dashboard } from './dashboard';
import { SessionService } from '../../../../core/auth/session.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { TenantsService, ListTenantsParams } from '../../../tenants/data/tenants.service';
import { InvoicesService, ListInvoicesParams } from '../../../invoices/data/invoices.service';
import { ServiceKeysService } from '../../../system-config/data/service-keys.service';
import { OAuthAppsService } from '../../../system-config/data/oauth-apps.service';
import { PaymentGatewaysService } from '../../../system-config/data/payment-gateways.service';
import { AuditLogsService } from '../../../audit-logs/data/audit-logs.service';

describe('Dashboard', () => {
  let tenantsService: { list: jest.Mock };
  let invoicesService: { list: jest.Mock };
  let serviceKeysService: { list: jest.Mock };
  let oauthAppsService: { list: jest.Mock };
  let paymentGatewaysService: { list: jest.Mock };
  let auditLogsService: { list: jest.Mock };

  function defaultTenantsResponse(params: ListTenantsParams) {
    const total = params.status === 'active' ? 3 : params.status === 'suspended' ? 1 : 5;
    return of({ items: [], total, page: 1, pageSize: params.pageSize });
  }

  function defaultInvoicesResponse(params: ListInvoicesParams) {
    if (params.status === 'open') {
      return of({
        items: [
          { id: 'inv-1', tenantId: 't1', invoiceNumber: 'INV-1', status: 'open', currency: 'USD', totalAmount: 10, dueAt: '2020-01-01T00:00:00Z', createdAt: '2020-01-01T00:00:00Z' },
        ],
        total: 4,
        page: 1,
        pageSize: params.pageSize ?? 100,
      });
    }
    return of({ items: [], total: 10, page: 1, pageSize: params.pageSize ?? 1 });
  }

  function setup(permissions: string[] = []) {
    tenantsService = { list: jest.fn().mockImplementation(defaultTenantsResponse) };
    invoicesService = { list: jest.fn().mockImplementation(defaultInvoicesResponse) };
    serviceKeysService = { list: jest.fn().mockReturnValue(of([])) };
    oauthAppsService = { list: jest.fn().mockReturnValue(of([])) };
    paymentGatewaysService = { list: jest.fn().mockReturnValue(of([])) };
    auditLogsService = { list: jest.fn().mockReturnValue(of([])) };

    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: TenantsService, useValue: tenantsService },
        { provide: InvoicesService, useValue: invoicesService },
        { provide: ServiceKeysService, useValue: serviceKeysService },
        { provide: OAuthAppsService, useValue: oauthAppsService },
        { provide: PaymentGatewaysService, useValue: paymentGatewaysService },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Dashboard);

    const sessionService = TestBed.inject(SessionService);
    sessionService.setSession({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });

    const store = TestBed.inject(PermissionStore);
    store.setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions,
      scopes: {},
      entitlements: [],
    });

    return fixture;
  }

  function clickRefresh(fixture: ReturnType<typeof setup>) {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const refreshButton = buttons.find((btn) => btn.nativeElement.textContent.trim() === 'Refresh');
    refreshButton!.nativeElement.click();
  }

  it('renders loading skeletons while sections load', () => {
    const fixture = setup();
    tenantsService.list.mockReturnValue(NEVER);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-skeleton')).not.toBeNull();
  });

  it('renders tenant metrics from the tenants service', () => {
    const fixture = setup();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Total Tenants');
    expect(text).toContain('5');
    expect(text).toContain('Active Tenants');
    expect(text).toContain('3');
    expect(text).toContain('Suspended Tenants');
    expect(text).toContain('1');
  });

  it('renders invoice metrics from the invoices service', () => {
    const fixture = setup();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Open Invoices');
    expect(text).toContain('4');
    expect(text).toContain('Paid Invoices');
    expect(text).toContain('10');
    expect(text).toContain('Overdue Invoices');
  });

  it('keeps the page usable when one section fails to load', () => {
    const fixture = setup();
    tenantsService.list.mockReturnValue(throwError(() => new Error('network')));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Could not load tenant metrics.');
    expect(text).toContain('Open Invoices');
  });

  it('reloads all sections when refresh is clicked', () => {
    const fixture = setup();
    fixture.detectChanges();

    const tenantsCallsBefore = tenantsService.list.mock.calls.length;
    const invoicesCallsBefore = invoicesService.list.mock.calls.length;

    clickRefresh(fixture);
    fixture.detectChanges();

    expect(tenantsService.list.mock.calls.length).toBeGreaterThan(tenantsCallsBefore);
    expect(invoicesService.list.mock.calls.length).toBeGreaterThan(invoicesCallsBefore);
  });

  it('only shows sections the user has permission for', () => {
    const fixture = setup(['platform.tenants.read']);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Tenants');
    expect(text).not.toContain('Billing');
    expect(text).not.toContain('System Configuration Health');
    expect(text).toContain('Security activity unavailable');
  });

  it('shows an empty state when there is no recent activity', () => {
    const fixture = setup();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No recent activity');
  });
});

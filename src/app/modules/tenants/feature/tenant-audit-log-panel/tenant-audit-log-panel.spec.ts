import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TenantAuditLogPanel } from './tenant-audit-log-panel';
import { TenantAdminService } from '../../data/tenant-admin.service';

describe('TenantAuditLogPanel', () => {
  let tenantAdminService: { listAuditLog: jest.Mock };

  const entry = {
    id: 'entry-1',
    userId: 'user-1',
    userEmail: 'jane@acme.test',
    action: 'tenant.suspended',
    resourceType: 'tenant',
    resourceId: 'tenant-1',
    ipAddress: '10.0.0.1',
    createdAt: '2026-08-17T10:00:00Z',
  };

  function setup() {
    tenantAdminService = { listAuditLog: jest.fn() };

    TestBed.configureTestingModule({
      imports: [TenantAuditLogPanel],
      providers: [{ provide: TenantAdminService, useValue: tenantAdminService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(TenantAuditLogPanel);
    fixture.componentRef.setInput('tenantId', 'tenant-1');
    return fixture;
  }

  it('loads the first page of audit entries on init', () => {
    const fixture = setup();
    tenantAdminService.listAuditLog.mockReturnValue(of({ items: [entry], totalCount: 1, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    expect(tenantAdminService.listAuditLog).toHaveBeenCalledWith('tenant-1', 1, 25);
    expect(fixture.nativeElement.textContent).toContain('tenant.suspended');
    expect(fixture.nativeElement.textContent).toContain('jane@acme.test');
  });

  it('shows an empty state when there are no entries', () => {
    const fixture = setup();
    tenantAdminService.listAuditLog.mockReturnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 25 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No audit entries yet');
  });

  it('shows System for entries without a user', () => {
    const fixture = setup();
    tenantAdminService.listAuditLog.mockReturnValue(
      of({ items: [{ ...entry, userId: null, userEmail: null }], totalCount: 1, page: 1, pageSize: 25 }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('System');
  });

  it('requests the next page on pageChange', () => {
    const fixture = setup();
    tenantAdminService.listAuditLog.mockReturnValue(
      of({ items: [entry], totalCount: 30, page: 1, pageSize: 25 }),
    );
    fixture.detectChanges();

    fixture.componentInstance['goToPage'](2);

    expect(tenantAdminService.listAuditLog).toHaveBeenLastCalledWith('tenant-1', 2, 25);
  });
});

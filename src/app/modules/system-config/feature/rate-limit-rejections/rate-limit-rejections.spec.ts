import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RateLimitRejections } from './rate-limit-rejections';
import { RateLimitsService } from '../../data/rate-limits.service';
import { RateLimitRejections as RateLimitRejectionsData } from '../../data/rate-limit.model';

describe('RateLimitRejections', () => {
  const data: RateLimitRejectionsData = {
    scope: 'instance',
    note: 'Counts from this API server only.',
    minutes: 60,
    generatedAt: '2026-11-24T10:00:00Z',
    countingSince: '2026-11-24T08:00:00Z',
    totalRejections: 31,
    tenants: [
      {
        tenantId: 't1',
        tenantName: 'Acme',
        totalRejections: 26,
        byKind: [
          { kind: 'User', count: 25 },
          { kind: 'TrayDevice', count: 1 },
        ],
        effectiveLimits: [
          { limitName: 'SignedIn', perMinute: 1200, burst: 200 },
          { limitName: 'TrayDevice', perMinute: 300, burst: 60 },
          { limitName: 'TenantCeiling', perMinute: 12000, burst: 3000 },
        ],
      },
      {
        tenantId: null,
        tenantName: null,
        totalRejections: 5,
        byKind: [{ kind: 'PreAuthentication', count: 5 }],
        effectiveLimits: [],
      },
    ],
  };

  let service: { listRejections: jest.Mock };

  function setup(response = of(data)) {
    service = { listRejections: jest.fn().mockReturnValue(response) };
    TestBed.configureTestingModule({
      imports: [RateLimitRejections],
      providers: [provideRouter([]), { provide: RateLimitsService, useValue: service }],
    });
    const fixture = TestBed.createComponent(RateLimitRejections);
    fixture.detectChanges();
    return fixture;
  }

  const text = (fixture: ReturnType<typeof setup>) => fixture.nativeElement.textContent as string;

  it('loads the last hour and says the counts are for this API server only', () => {
    const fixture = setup();
    expect(service.listRejections).toHaveBeenCalledWith(60);
    const note = fixture.nativeElement.querySelector('[data-testid="rejections-scope-note"]') as HTMLElement;
    expect(note.textContent).toContain('This API server only, last 60 minutes, since it last started.');
    expect(text(fixture)).toContain('the ceiling is the likely cause');
  });

  it('lists each limited tenant with its counts by kind and its effective limits', () => {
    const fixture = setup();
    const row = fixture.nativeElement.querySelector('[data-tenant="t1"]') as HTMLElement;
    expect(row.textContent).toContain('Acme');
    expect(row.querySelector('[data-testid="tenant-rejections"]')?.textContent?.trim()).toBe('26');
    expect(row.textContent).toContain('Signed-in users: 25, Tray devices: 1');
    expect(row.textContent).toContain('1200 / min, burst 200');
    expect(row.textContent).toContain('12000 / min, burst 3000');
    expect(row.querySelector('a')?.getAttribute('href')).toBe('/tenants/t1');
  });

  it('shows requests with no tenant as a total, not as a tenant row', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(text(fixture)).toContain('No tenant');
    expect(text(fixture)).toContain('31');
  });

  it('shows an empty state when no tenant was limited', () => {
    const fixture = setup(of({ ...data, totalRejections: 0, tenants: [] }));
    expect(text(fixture)).toContain('No tenant was limited');
    expect(fixture.nativeElement.querySelector('[data-testid="rate-limit-rejections-table"]')).toBeNull();
  });

  it('shows an error with a retry', () => {
    const fixture = setup(throwError(() => new Error('boom')));
    expect(text(fixture)).toContain('Could not load the rejection counts.');
  });
});

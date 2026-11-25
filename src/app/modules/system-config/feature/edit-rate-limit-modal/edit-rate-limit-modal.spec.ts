import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { EditRateLimitModal } from './edit-rate-limit-modal';
import { RateLimitsService } from '../../data/rate-limits.service';
import { EffectiveRateLimit } from '../../data/rate-limit.model';

describe('EditRateLimitModal', () => {
  const signedIn: EffectiveRateLimit = {
    limitName: 'SignedIn',
    algorithm: 'token_bucket',
    override: {
      perMinute: 900,
      burst: 150,
      updatedAt: '2026-11-20T00:00:00Z',
      updatedByPlatformUserId: 'a1',
      rowVersion: 'AAAAAAAAB9E=',
    },
    effective: { perMinute: 900, burst: 150 },
    effectiveSource: 'global',
    bounds: { minPerMinute: 120, maxPerMinute: 3000, minBurst: 30, maxBurst: 500 },
  };
  const anonymous: EffectiveRateLimit = {
    limitName: 'Anonymous',
    algorithm: 'sliding_window',
    effective: { perMinute: 300 },
    effectiveSource: 'appsettings',
    bounds: { minPerMinute: 60, maxPerMinute: 1200 },
  };

  let service: { set: jest.Mock; remove: jest.Mock };

  function setup(limit: EffectiveRateLimit, mode: 'set' | 'remove' = 'set') {
    service = { set: jest.fn().mockReturnValue(of({})), remove: jest.fn().mockReturnValue(of({})) };
    TestBed.configureTestingModule({
      imports: [EditRateLimitModal],
      providers: [{ provide: RateLimitsService, useValue: service }],
    });
    const fixture = TestBed.createComponent(EditRateLimitModal);
    fixture.componentRef.setInput('target', { scope: 'global' });
    fixture.componentRef.setInput('limit', limit);
    fixture.componentRef.setInput('mode', mode);
    fixture.detectChanges();
    return fixture;
  }

  function type(fixture: ReturnType<typeof setup>, testId: string, value: string) {
    const element = fixture.nativeElement.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement;
    element.value = value;
    element.dispatchEvent(new Event('input'));
  }

  function submit(fixture: ReturnType<typeof setup>) {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('starts from the current override and shows the per-server warning', () => {
    const fixture = setup(signedIn);
    const perMinute = fixture.nativeElement.querySelector('[data-testid="rate-limit-per-minute"]') as HTMLInputElement;
    expect(perMinute.value).toBe('900');
    expect(fixture.nativeElement.textContent).toContain('Limits are counted per API server');
  });

  it('blocks Save without a reason', () => {
    const fixture = setup(signedIn);
    type(fixture, 'rate-limit-reason', '   ');
    submit(fixture);
    expect(service.set).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('A reason is required.');
  });

  it.each([
    ['rate-limit-per-minute', '60'],
    ['rate-limit-per-minute', '3060'],
    ['rate-limit-burst', '10'],
    ['rate-limit-burst', '600'],
  ])('blocks Save when %s is %s, outside the bounds', (field, value) => {
    const fixture = setup(signedIn);
    type(fixture, 'rate-limit-reason', 'Import week');
    type(fixture, field, value);
    submit(fixture);
    expect(service.set).not.toHaveBeenCalled();
  });

  it('saves the values, the trimmed reason and the row version, then emits saved', () => {
    const fixture = setup(signedIn);
    const saved = jest.fn();
    fixture.componentInstance.saved.subscribe(saved);
    type(fixture, 'rate-limit-per-minute', '1200');
    type(fixture, 'rate-limit-burst', '200');
    type(fixture, 'rate-limit-reason', '  Import week  ');
    submit(fixture);
    expect(service.set).toHaveBeenCalledWith({ scope: 'global' }, 'SignedIn', {
      perMinute: 1200,
      burst: 200,
      reason: 'Import week',
      rowVersion: 'AAAAAAAAB9E=',
    });
    expect(saved).toHaveBeenCalled();
  });

  it('has no burst field for a sliding-window limit and sends burst null with no row version', () => {
    const fixture = setup(anonymous);
    expect(fixture.nativeElement.querySelector('[data-testid="rate-limit-burst"]')).toBeNull();
    type(fixture, 'rate-limit-per-minute', '600');
    type(fixture, 'rate-limit-reason', 'Busy login page');
    submit(fixture);
    expect(service.set).toHaveBeenCalledWith({ scope: 'global' }, 'Anonymous', {
      perMinute: 600,
      burst: null,
      reason: 'Busy login page',
      rowVersion: null,
    });
  });

  it('shows the API error inline and stays open', () => {
    const fixture = setup(signedIn);
    service.set.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { detail: 'Burst must be at least 30.' } })),
    );
    const saved = jest.fn();
    fixture.componentInstance.saved.subscribe(saved);
    type(fixture, 'rate-limit-reason', 'Import week');
    submit(fixture);
    expect(fixture.nativeElement.textContent).toContain('Burst must be at least 30.');
    expect(saved).not.toHaveBeenCalled();
  });

  it('removes with only a reason', () => {
    const fixture = setup(signedIn, 'remove');
    expect(fixture.nativeElement.querySelector('[data-testid="rate-limit-per-minute"]')).toBeNull();
    type(fixture, 'rate-limit-reason', 'Back to default');
    submit(fixture);
    expect(service.remove).toHaveBeenCalledWith({ scope: 'global' }, 'SignedIn', 'Back to default', 'AAAAAAAAB9E=');
  });
});

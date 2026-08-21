import { TestBed } from '@angular/core/testing';
import { CsrfTokenService } from './csrf-token.service';

const STORAGE_KEY = 'admin_csrf_token';

describe('CsrfTokenService', () => {
  let service: CsrfTokenService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CsrfTokenService);
  });

  it('starts with null when sessionStorage has no stored token', () => {
    expect(service.get()).toBeNull();
  });

  it('picks up a token already present in sessionStorage on construction', () => {
    sessionStorage.setItem(STORAGE_KEY, 'preexisting-token');

    const freshService = TestBed.runInInjectionContext(() => new CsrfTokenService());

    expect(freshService.get()).toBe('preexisting-token');
  });

  it('set(token) stores the token and makes it readable via get()', () => {
    service.set('raw-csrf-token');

    expect(service.get()).toBe('raw-csrf-token');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('raw-csrf-token');
  });

  it('set(null) clears both the signal and sessionStorage', () => {
    service.set('raw-csrf-token');

    service.set(null);

    expect(service.get()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('set("") treats an empty string the same as clearing', () => {
    service.set('raw-csrf-token');

    service.set('');

    expect(service.get()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

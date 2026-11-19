import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProvidersService } from './providers.service';
import { environment } from '../../../../environments/environment';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProvidersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists all provider cards', () => {
    let result: unknown;
    service.list().subscribe((cards) => (result = cards));

    const req = httpMock.expectOne(`${environment.apiUrl}/system-config/providers`);
    expect(req.request.method).toBe('GET');
    const card = {
      id: 'p1',
      providerKey: 'github',
      displayName: 'GitHub',
      providerFamily: 'oauth_app',
      configured: false,
      configurationActive: false,
      lastVerifiedAt: null,
    };
    req.flush([card]);
    expect(result).toEqual([card]);
  });
});

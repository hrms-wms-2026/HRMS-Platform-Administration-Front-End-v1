import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TrayReleasesService } from './tray-releases.service';
import { environment } from '../../../../environments/environment';

describe('TrayReleasesService', () => {
  let service: TrayReleasesService;
  let http: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrayReleasesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists releases with credentials', () => {
    service.list().subscribe();
    const req = http.expectOne(`${base}/tray-releases`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('creates a release', () => {
    const payload = {
      version: '1.2.0',
      channel: 'beta' as const,
      downloadUrl: 'https://x/y.msix',
      sha256: 'a'.repeat(64),
      fileSizeBytes: 10,
      publisher: 'CN=ONEVO',
      minimumWindowsVersion: '10.0.19041.0',
      minSupportedVersion: null,
      releaseNotes: null,
      isActive: false,
    };
    service.create(payload).subscribe();
    const req = http.expectOne(`${base}/tray-releases`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('updates a release by id', () => {
    service.update('abc', { isActive: true }).subscribe();
    const req = http.expectOne(`${base}/tray-releases/abc`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ isActive: true });
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });
});

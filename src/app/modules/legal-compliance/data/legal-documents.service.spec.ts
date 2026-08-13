import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LegalDocumentsService } from './legal-documents.service';
import { environment } from '../../../../environments/environment';

describe('LegalDocumentsService', () => {
  let service: LegalDocumentsService;
  let httpMock: HttpTestingController;

  const detailApi = {
    id: 'doc-1',
    document_type: 'terms',
    version: '1.0',
    title: 'Terms of Service',
    status: 'draft',
    is_required: true,
    block_scope: 'dashboard',
    published_at: null,
    published_by_id: null,
    content_hash: 'abc123',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    content_json: { type: 'doc', content: [] },
    content_html: '<h1>Terms</h1>',
    content_text: 'Terms',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LegalDocumentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists legal documents with filters', () => {
    let result: unknown;
    service.list({ documentType: 'terms', status: 'draft' }).subscribe((items) => (result = items));

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/legal-document-versions` &&
        request.params.get('document_type') === 'terms' &&
        request.params.get('status') === 'draft',
    );
    expect(req.request.method).toBe('GET');
    req.flush([detailApi]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'doc-1',
        documentType: 'terms',
        title: 'Terms of Service',
        status: 'draft',
      }),
    ]);
  });

  it('creates a legal document draft', () => {
    let result: unknown;
    service
      .create({
        documentType: 'terms',
        version: '1.1',
        title: 'Terms of Service',
        contentJson: { type: 'doc', content: [] },
        contentHtml: '<h1>Terms</h1>',
        contentText: 'Terms',
        isRequired: true,
        blockScope: 'dashboard',
      })
      .subscribe((item) => (result = item));

    const req = httpMock.expectOne(`${environment.apiUrl}/legal-document-versions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      document_type: 'terms',
      version: '1.1',
      title: 'Terms of Service',
      content_json: { type: 'doc', content: [] },
      content_html: '<h1>Terms</h1>',
      content_text: 'Terms',
      is_required: true,
      block_scope: 'dashboard',
    });
    req.flush(detailApi);

    expect(result).toEqual(expect.objectContaining({ id: 'doc-1', documentType: 'terms' }));
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { LegalDocumentDetail } from './legal-document-detail';
import { LegalDocumentsService } from '../../data/legal-documents.service';
import { LegalDocumentVersionDetail, UpdateLegalDocumentPayload } from '../../data/legal-document.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

const UNSAFE_HTML = '<h1>Terms</h1><img src=x onerror="window.__legalXss = true"><script>window.__legalXss = true</script>';

function documentWith(contentHtml: string): LegalDocumentVersionDetail {
  return {
    id: 'doc-1',
    documentType: 'terms',
    version: '1.0',
    title: 'Terms of Service',
    status: 'draft',
    isRequired: true,
    blockScope: 'dashboard',
    publishedAt: null,
    publishedById: null,
    contentHash: 'abc123',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    contentJson: {},
    contentHtml,
    contentText: 'Terms',
  };
}

interface DetailActions {
  saveEdit(payload: UpdateLegalDocumentPayload): void;
  confirmPublish(): void;
  confirmArchive(): void;
  errorMessage(): string | null;
  isPublished(): boolean;
  pendingArchive(): boolean;
}

describe('LegalDocumentDetail preview', () => {
  let fixture: ComponentFixture<LegalDocumentDetail>;
  let host: HTMLElement;
  const service = { getById: jest.fn(), update: jest.fn(), publish: jest.fn(), archive: jest.fn() };
  const notifications = { success: jest.fn(), error: jest.fn() };
  const actions = () => fixture.componentInstance as unknown as DetailActions;

  const previewFrame = () => host.querySelector<HTMLIFrameElement>('iframe[title="Legal document preview"]');

  beforeEach(async () => {
    jest.clearAllMocks();
    service.getById.mockReturnValue(of(documentWith(UNSAFE_HTML)));
    await TestBed.configureTestingModule({
      imports: [LegalDocumentDetail],
      providers: [
        { provide: LegalDocumentsService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'doc-1' } } } },
        { provide: PermissionStore, useValue: { hasPermission: () => true } },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LegalDocumentDetail);
    host = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('renders the document in an iframe sandboxed with no permissions', () => {
    const frame = previewFrame();

    expect(frame).not.toBeNull();
    expect(frame!.getAttribute('sandbox')).toBe('');
    expect(frame!.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(frame!.getAttribute('srcdoc')).toContain('<h1>Terms</h1>');
  });

  it('never puts the document HTML into the page itself', () => {
    expect(host.querySelector('img')).toBeNull();
    expect(host.querySelector('h1 + img')).toBeNull();
    expect(host.querySelector('script')).toBeNull();
  });

  it('strips active content from the preview HTML before the iframe gets it', () => {
    const srcdoc = previewFrame()!.getAttribute('srcdoc')!;

    expect(srcdoc).not.toContain('onerror');
    expect(srcdoc).not.toContain('<script');
  });

  it('shows the saved content after an edit', () => {
    const payload = {} as UpdateLegalDocumentPayload;
    service.update.mockReturnValue(of(documentWith('<h1>Edited terms</h1>')));

    actions().saveEdit(payload);
    fixture.detectChanges();

    expect(previewFrame()!.getAttribute('srcdoc')).toContain('<h1>Edited terms</h1>');
  });

  it('shows the published content and the archive action after publishing', () => {
    service.publish.mockReturnValue(of({ ...documentWith('<h1>Published terms</h1>'), status: 'published' as const }));

    actions().confirmPublish();
    fixture.detectChanges();

    expect(actions().isPublished()).toBe(true);
    expect(previewFrame()!.getAttribute('srcdoc')).toContain('<h1>Published terms</h1>');
    expect(notifications.success).toHaveBeenCalledWith('Legal document published.');
    expect(host.textContent).toContain('Archive');
  });

  it('keeps the preview after archiving', () => {
    service.archive.mockReturnValue(of({ ...documentWith('<h1>Terms</h1>'), status: 'archived' as const }));

    actions().confirmArchive();
    fixture.detectChanges();

    expect(actions().pendingArchive()).toBe(false);
    expect(notifications.success).toHaveBeenCalledWith('Legal document archived.');
    expect(previewFrame()!.getAttribute('srcdoc')).toContain('<h1>Terms</h1>');
  });

  it.each([
    [404, 'Legal document version not found.'],
    [500, 'Something went wrong. Please try again.'],
  ])('explains a %i while loading, with no preview', (status, message) => {
    service.getById.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    const failed = TestBed.createComponent(LegalDocumentDetail);
    failed.detectChanges();

    expect((failed.componentInstance as unknown as DetailActions).errorMessage()).toBe(message);
    expect((failed.nativeElement as HTMLElement).querySelector('iframe')).toBeNull();
  });

  describe.each([
    ['saving', () => actions().saveEdit({} as UpdateLegalDocumentPayload), 'update', 'Could not update the legal document.'],
    ['publishing', () => actions().confirmPublish(), 'publish', 'Could not publish the legal document.'],
    ['archiving', () => actions().confirmArchive(), 'archive', 'Could not archive the legal document.'],
  ] as const)('when %s fails', (_name, act, method, fallback) => {
    it('shows the server detail and keeps the old preview', () => {
      service[method].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Server said no' } })));

      act();
      fixture.detectChanges();

      expect(notifications.error).toHaveBeenCalledWith('Server said no');
      expect(previewFrame()!.getAttribute('srcdoc')).toContain('<h1>Terms</h1>');
    });

    it('falls back to its own message without a server detail', () => {
      service[method].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      act();

      expect(notifications.error).toHaveBeenCalledWith(fallback);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LegalDocumentsList } from './legal-documents-list';
import { LegalDocumentsService } from '../../data/legal-documents.service';
import { PermissionStore } from '../../../../core/permissions/permission.store';

describe('LegalDocumentsList', () => {
  let legalDocumentsService: { list: jest.Mock };

  beforeEach(() => {
    legalDocumentsService = {
      list: jest.fn().mockReturnValue(
        of([
          {
            id: 'doc-1',
            documentType: 'terms',
            version: '1.0',
            title: 'Terms of Service',
            status: 'published',
            isRequired: true,
            blockScope: 'dashboard',
            publishedAt: '2026-01-02T00:00:00Z',
            publishedById: 'user-1',
            contentHash: 'abc123',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z',
          },
        ]),
      ),
    };

    TestBed.configureTestingModule({
      imports: [LegalDocumentsList],
      providers: [
        provideRouter([]),
        { provide: LegalDocumentsService, useValue: legalDocumentsService },
        {
          provide: PermissionStore,
          useValue: {
            hasPermission: (code: string) =>
              code === 'platform.compliance.read' || code === 'platform.compliance.manage',
          },
        },
      ],
    }).compileComponents();
  });

  it('loads legal documents on init', () => {
    const fixture = TestBed.createComponent(LegalDocumentsList);
    fixture.detectChanges();

    expect(legalDocumentsService.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Terms of Service');
  });
});

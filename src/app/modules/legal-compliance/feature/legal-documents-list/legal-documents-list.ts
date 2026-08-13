import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { LegalDocumentsService } from '../../data/legal-documents.service';
import {
  LEGAL_DOCUMENT_STATUS_OPTIONS,
  LEGAL_DOCUMENT_TYPE_OPTIONS,
  LegalDocumentVersionSummary,
  legalDocumentStatusTone,
  legalDocumentTypeLabel,
} from '../../data/legal-document.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-legal-documents-list',
  imports: [
    RouterLink,
    DatePipe,
    TitleCasePipe,
    TableSkeleton,
    ErrorBanner,
    EmptyState,
    StatusBadge,
    Button,
  ],
  templateUrl: './legal-documents-list.html',
})
export class LegalDocumentsList implements OnInit {
  private readonly legalDocumentsService = inject(LegalDocumentsService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly documentTypeOptions = LEGAL_DOCUMENT_TYPE_OPTIONS;
  protected readonly statusOptions = LEGAL_DOCUMENT_STATUS_OPTIONS;
  protected readonly legalDocumentTypeLabel = legalDocumentTypeLabel;
  protected readonly legalDocumentStatusTone = legalDocumentStatusTone;

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.compliance.read'));
  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.compliance.manage'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly documents = signal<LegalDocumentVersionSummary[]>([]);
  protected readonly documentTypeFilter = signal('');
  protected readonly statusFilter = signal('');

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadDocuments();
  }

  protected loadDocuments(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.legalDocumentsService
      .list({
        documentType: this.documentTypeFilter() || undefined,
        status: this.statusFilter() || undefined,
      })
      .subscribe({
        next: (documents) => {
          this.documents.set(documents);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Something went wrong. Please try again.');
          this.loading.set(false);
        },
      });
  }

  protected onFilterChange(): void {
    this.loadDocuments();
  }

  protected clearFilters(): void {
    this.documentTypeFilter.set('');
    this.statusFilter.set('');
    this.loadDocuments();
  }
}

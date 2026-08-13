import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { LegalDocumentsService } from '../../data/legal-documents.service';
import {
  LegalDocumentVersionDetail,
  UpdateLegalDocumentPayload,
  legalDocumentStatusTone,
  legalDocumentTypeLabel,
} from '../../data/legal-document.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { PageDetailSkeleton } from '../../../../shared/ui/page-detail-skeleton/page-detail-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmationDialog } from '../../../../shared/ui/confirmation-dialog/confirmation-dialog';
import { LegalDocumentForm } from '../legal-document-form/legal-document-form';

@Component({
  selector: 'app-legal-document-detail',
  imports: [
    DatePipe,
    TitleCasePipe,
    PageDetailSkeleton,
    ErrorBanner,
    StatusBadge,
    Button,
    ConfirmationDialog,
    LegalDocumentForm,
  ],
  templateUrl: './legal-document-detail.html',
})
export class LegalDocumentDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly legalDocumentsService = inject(LegalDocumentsService);
  private readonly notificationService = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly permissionStore = inject(PermissionStore);

  private readonly documentId = this.route.snapshot.paramMap.get('id')!;

  protected readonly legalDocumentTypeLabel = legalDocumentTypeLabel;
  protected readonly legalDocumentStatusTone = legalDocumentStatusTone;

  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.compliance.manage'));

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly publishing = signal(false);
  protected readonly archiving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly document = signal<LegalDocumentVersionDetail | null>(null);
  protected readonly editing = signal(false);
  protected readonly pendingPublish = signal(false);
  protected readonly pendingArchive = signal(false);
  protected readonly previewHtml = signal<SafeHtml | null>(null);

  protected readonly isDraft = computed(() => this.document()?.status === 'draft');
  protected readonly isPublished = computed(() => this.document()?.status === 'published');
  protected readonly readOnly = computed(() => !this.canManage() || !this.isDraft() || !this.editing());

  ngOnInit(): void {
    this.loadDocument();
  }

  protected loadDocument(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.editing.set(false);

    this.legalDocumentsService.getById(this.documentId).subscribe({
      next: (document) => {
        this.document.set(document);
        this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(document.contentHtml));
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.errorMessage.set('Legal document version not found.');
        } else {
          this.errorMessage.set('Something went wrong. Please try again.');
        }
        this.loading.set(false);
      },
    });
  }

  protected startEdit(): void {
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected saveEdit(payload: UpdateLegalDocumentPayload): void {
    this.saving.set(true);

    this.legalDocumentsService.update(this.documentId, payload).subscribe({
      next: (updated) => {
        this.document.set(updated);
        this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(updated.contentHtml));
        this.saving.set(false);
        this.editing.set(false);
        this.notificationService.success('Legal document draft updated.');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not update the legal document.');
      },
    });
  }

  protected startPublish(): void {
    this.pendingPublish.set(true);
  }

  protected cancelPublish(): void {
    this.pendingPublish.set(false);
  }

  protected confirmPublish(): void {
    this.pendingPublish.set(false);
    this.publishing.set(true);

    this.legalDocumentsService.publish(this.documentId).subscribe({
      next: (updated) => {
        this.document.set(updated);
        this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(updated.contentHtml));
        this.publishing.set(false);
        this.editing.set(false);
        this.notificationService.success('Legal document published.');
      },
      error: (error: HttpErrorResponse) => {
        this.publishing.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not publish the legal document.');
      },
    });
  }

  protected startArchive(): void {
    this.pendingArchive.set(true);
  }

  protected cancelArchive(): void {
    this.pendingArchive.set(false);
  }

  protected confirmArchive(): void {
    this.pendingArchive.set(false);
    this.archiving.set(true);

    this.legalDocumentsService.archive(this.documentId).subscribe({
      next: (updated) => {
        this.document.set(updated);
        this.archiving.set(false);
        this.notificationService.success('Legal document archived.');
      },
      error: (error: HttpErrorResponse) => {
        this.archiving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not archive the legal document.');
      },
    });
  }
}

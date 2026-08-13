import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LegalDocumentsService } from '../../data/legal-documents.service';
import { CreateLegalDocumentPayload, UpdateLegalDocumentPayload } from '../../data/legal-document.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { LegalDocumentForm } from '../legal-document-form/legal-document-form';

@Component({
  selector: 'app-legal-document-create',
  imports: [LegalDocumentForm],
  templateUrl: './legal-document-create.html',
})
export class LegalDocumentCreate {
  private readonly router = inject(Router);
  private readonly legalDocumentsService = inject(LegalDocumentsService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly saving = signal(false);

  protected submit(payload: CreateLegalDocumentPayload | UpdateLegalDocumentPayload): void {
    this.saving.set(true);

    this.legalDocumentsService.create(payload as CreateLegalDocumentPayload).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.notificationService.success('Legal document draft created.');
        void this.router.navigate(['/legal-documents', created.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not create the legal document draft.');
      },
    });
  }
}

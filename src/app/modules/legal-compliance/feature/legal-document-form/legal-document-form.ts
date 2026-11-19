import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CreateLegalDocumentPayload,
  LegalDocumentType,
  LegalDocumentVersionDetail,
  UpdateLegalDocumentPayload,
  defaultContentJson,
  htmlToPlainText,
} from '../../data/legal-document.model';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-legal-document-form',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './legal-document-form.html',
})
export class LegalDocumentForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  readonly mode = input<'create' | 'edit'>('create');
  readonly initialValue = input<LegalDocumentVersionDetail | null>(null);
  readonly saving = input(false);
  readonly readOnly = input(false);
  readonly submitted = output<CreateLegalDocumentPayload | UpdateLegalDocumentPayload>();

  protected readonly isCreate = computed(() => this.mode() === 'create');

  protected readonly documentTypeOptions: { value: LegalDocumentType; label: string }[] = [
    { value: 'terms', label: 'Terms of Service' },
    { value: 'privacy_notice', label: 'Privacy Notice' },
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    documentType: ['terms' as LegalDocumentType, Validators.required],
    version: ['', Validators.required],
    title: ['', Validators.required],
    contentHtml: ['', Validators.required],
    isRequired: [true],
    blockScope: ['dashboard', Validators.required],
  });

  protected readonly contentJson = signal<Record<string, unknown>>(defaultContentJson());

  ngOnInit(): void {
    const initial = this.initialValue();
    if (initial) {
      this.form.patchValue({
        documentType: initial.documentType,
        version: initial.version,
        title: initial.title,
        contentHtml: initial.contentHtml,
        isRequired: initial.isRequired,
        blockScope: initial.blockScope,
      });
      this.contentJson.set(initial.contentJson);
    }

    if (this.readOnly()) {
      this.form.disable();
    }
  }

  protected canSubmit(): boolean {
    return this.form.valid && !this.saving() && !this.readOnly();
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const contentHtml = value.contentHtml.trim();
    const contentText = htmlToPlainText(contentHtml);

    if (this.isCreate()) {
      this.submitted.emit({
        documentType: value.documentType,
        version: value.version.trim(),
        title: value.title.trim(),
        contentJson: this.contentJson(),
        contentHtml,
        contentText,
        isRequired: value.isRequired,
        blockScope: value.blockScope,
      });
      return;
    }

    this.submitted.emit({
      title: value.title.trim(),
      contentJson: this.contentJson(),
      contentHtml,
      contentText,
      isRequired: value.isRequired,
      blockScope: value.blockScope,
    });
  }
}

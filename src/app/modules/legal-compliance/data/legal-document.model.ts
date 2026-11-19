export type LegalDocumentType = 'terms' | 'privacy_notice';

export type LegalDocumentStatus = 'draft' | 'published' | 'archived';

export interface LegalDocumentVersionSummary {
  id: string;
  documentType: LegalDocumentType;
  version: string;
  title: string;
  status: LegalDocumentStatus;
  isRequired: boolean;
  blockScope: string;
  publishedAt: string | null;
  publishedById: string | null;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocumentVersionDetail extends LegalDocumentVersionSummary {
  contentJson: Record<string, unknown>;
  contentHtml: string;
  contentText: string;
}

export interface CreateLegalDocumentPayload {
  documentType: LegalDocumentType;
  version: string;
  title: string;
  contentJson: Record<string, unknown>;
  contentHtml: string;
  contentText: string;
  isRequired: boolean;
  blockScope: string;
}

export interface UpdateLegalDocumentPayload {
  title: string;
  contentJson: Record<string, unknown>;
  contentHtml: string;
  contentText: string;
  isRequired: boolean;
  blockScope: string;
}

export interface PublishLegalDocumentPayload {
  publishReason?: string;
}

export const LEGAL_DOCUMENT_TYPE_OPTIONS: { value: LegalDocumentType | ''; label: string }[] = [
  { value: '', label: 'All document types' },
  { value: 'terms', label: 'Terms of Service' },
  { value: 'privacy_notice', label: 'Privacy Notice' },
];

export const LEGAL_DOCUMENT_STATUS_OPTIONS: { value: LegalDocumentStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export function legalDocumentTypeLabel(documentType: string): string {
  switch (documentType) {
    case 'terms':
      return 'Terms of Service';
    case 'privacy_notice':
      return 'Privacy Notice';
    default:
      return documentType;
  }
}

export function legalDocumentStatusTone(status: string): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'published':
      return 'success';
    case 'draft':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function defaultContentJson(): Record<string, unknown> {
  return { type: 'doc', content: [] };
}

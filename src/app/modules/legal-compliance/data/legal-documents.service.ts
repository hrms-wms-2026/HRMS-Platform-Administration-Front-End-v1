import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/config/api-endpoints';
import { environment } from '../../../../environments/environment';
import {
  CreateLegalDocumentPayload,
  LegalDocumentVersionDetail,
  LegalDocumentVersionSummary,
  PublishLegalDocumentPayload,
  UpdateLegalDocumentPayload,
} from './legal-document.model';

interface LegalDocumentVersionSummaryApi {
  id: string;
  document_type: string;
  version: string;
  title: string;
  status: string;
  is_required: boolean;
  block_scope: string;
  published_at: string | null;
  published_by_id: string | null;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

interface LegalDocumentVersionDetailApi extends LegalDocumentVersionSummaryApi {
  content_json: Record<string, unknown>;
  content_html: string;
  content_text: string;
}

export interface ListLegalDocumentsParams {
  documentType?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class LegalDocumentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  list(params: ListLegalDocumentsParams = {}): Observable<LegalDocumentVersionSummary[]> {
    let httpParams = new HttpParams();
    if (params.documentType) {
      httpParams = httpParams.set('document_type', params.documentType);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http
      .get<LegalDocumentVersionSummaryApi[]>(
        `${this.baseUrl}${API_ENDPOINTS.legalDocuments.list}`,
        { params: httpParams, withCredentials: true },
      )
      .pipe(map((items) => items.map((item) => this.mapSummary(item))));
  }

  getById(id: string): Observable<LegalDocumentVersionDetail> {
    return this.http
      .get<LegalDocumentVersionDetailApi>(`${this.baseUrl}${API_ENDPOINTS.legalDocuments.byId(id)}`, {
        withCredentials: true,
      })
      .pipe(map((item) => this.mapDetail(item)));
  }

  create(payload: CreateLegalDocumentPayload): Observable<LegalDocumentVersionDetail> {
    return this.http
      .post<LegalDocumentVersionDetailApi>(
        `${this.baseUrl}${API_ENDPOINTS.legalDocuments.create}`,
        this.toCreateBody(payload),
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapDetail(item)));
  }

  update(id: string, payload: UpdateLegalDocumentPayload): Observable<LegalDocumentVersionDetail> {
    return this.http
      .put<LegalDocumentVersionDetailApi>(
        `${this.baseUrl}${API_ENDPOINTS.legalDocuments.update(id)}`,
        this.toUpdateBody(payload),
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapDetail(item)));
  }

  publish(id: string, payload: PublishLegalDocumentPayload = {}): Observable<LegalDocumentVersionDetail> {
    return this.http
      .post<LegalDocumentVersionDetailApi>(
        `${this.baseUrl}${API_ENDPOINTS.legalDocuments.publish(id)}`,
        { publish_reason: payload.publishReason ?? null },
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapDetail(item)));
  }

  archive(id: string): Observable<LegalDocumentVersionDetail> {
    return this.http
      .post<LegalDocumentVersionDetailApi>(
        `${this.baseUrl}${API_ENDPOINTS.legalDocuments.archive(id)}`,
        {},
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapDetail(item)));
  }

  private mapSummary(item: LegalDocumentVersionSummaryApi): LegalDocumentVersionSummary {
    return {
      id: item.id,
      documentType: item.document_type as LegalDocumentVersionSummary['documentType'],
      version: item.version,
      title: item.title,
      status: item.status as LegalDocumentVersionSummary['status'],
      isRequired: item.is_required,
      blockScope: item.block_scope,
      publishedAt: item.published_at,
      publishedById: item.published_by_id,
      contentHash: item.content_hash,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }

  private mapDetail(item: LegalDocumentVersionDetailApi): LegalDocumentVersionDetail {
    return {
      ...this.mapSummary(item),
      contentJson: item.content_json ?? {},
      contentHtml: item.content_html,
      contentText: item.content_text,
    };
  }

  private toCreateBody(payload: CreateLegalDocumentPayload): Record<string, unknown> {
    return {
      document_type: payload.documentType,
      version: payload.version,
      title: payload.title,
      content_json: payload.contentJson,
      content_html: payload.contentHtml,
      content_text: payload.contentText,
      is_required: payload.isRequired,
      block_scope: payload.blockScope,
    };
  }

  private toUpdateBody(payload: UpdateLegalDocumentPayload): Record<string, unknown> {
    return {
      title: payload.title,
      content_json: payload.contentJson,
      content_html: payload.contentHtml,
      content_text: payload.contentText,
      is_required: payload.isRequired,
      block_scope: payload.blockScope,
    };
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NotificationTemplatesService } from '../../data/notification-templates.service';
import {
  CHANNEL_LABELS,
  NotificationEvent,
  NotificationTemplateContent,
  NotificationTemplateDetail,
  RenderedNotification,
  contentOf,
  emptyContent,
} from '../../data/notification-template.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PageDetailSkeleton } from '../../../../shared/ui/page-detail-skeleton/page-detail-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

type EditorTab = 'email' | 'in_app' | 'tray';
type ContentField = Exclude<keyof NotificationTemplateContent, 'actionKey'>;

/** Where an inserted variable goes when the admin switches tab without focusing a field. */
const TAB_BODY_FIELD: Record<EditorTab, ContentField> = { email: 'emailHtml', in_app: 'inAppBody', tray: 'trayBody' };

/**
 * Create / edit one global notification template. Drafts never affect live sends; Publish makes the draft
 * the live wording. The email preview is server-rendered (same renderer as delivery) and shown only in a
 * sandboxed iframe with scripts disabled - never injected into this page.
 */
@Component({
  selector: 'app-notification-template-editor',
  imports: [RouterLink, DatePipe, Button, StatusBadge, PageDetailSkeleton, ErrorBanner],
  templateUrl: './notification-template-editor.html',
})
export class NotificationTemplateEditor implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(NotificationTemplatesService);
  private readonly toast = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly permissionStore = inject(PermissionStore);

  private readonly routeId = this.route.snapshot.paramMap.get('id') ?? 'new';
  protected readonly isNew = this.routeId === 'new';

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.templates.read'));
  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.templates.manage'));

  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly events = signal<NotificationEvent[]>([]);
  protected readonly detail = signal<NotificationTemplateDetail | null>(null);
  protected readonly eventKey = signal('');
  protected readonly name = signal('');
  readonly content = signal<NotificationTemplateContent>(emptyContent());
  readonly activeTab = signal<EditorTab>('in_app');
  private readonly lastFocused = signal<ContentField>('inAppBody');

  readonly conflict = signal<string | null>(null);
  readonly validationErrors = signal<string[]>([]);
  protected readonly rendered = signal<RenderedNotification | null>(null);
  protected readonly previewHtml = signal<SafeHtml | null>(null);

  protected readonly tabs: { key: EditorTab; label: string }[] = [
    { key: 'email', label: CHANNEL_LABELS.email },
    { key: 'in_app', label: CHANNEL_LABELS.in_app },
    { key: 'tray', label: CHANNEL_LABELS.tray },
  ];

  protected readonly event = computed(() => this.events().find((e) => e.key === this.eventKey()) ?? null);
  protected readonly draft = computed(() => this.detail()?.draft ?? null);
  protected readonly live = computed(() => this.detail()?.activeVersion ?? null);
  protected readonly readOnly = computed(() => !this.canManage());

  ngOnInit(): void {
    if (!this.canView()) return;
    this.service.listEvents().subscribe({ next: (events) => this.events.set(events), error: () => this.events.set([]) });
    if (!this.isNew) this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.get(this.routeId).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load this notification template.');
        this.loading.set(false);
      },
    });
  }

  setTab(tab: string): void {
    this.activeTab.set(tab as EditorTab);
    this.lastFocused.set(TAB_BODY_FIELD[tab as EditorTab]);
  }

  setEventKey(key: string): void {
    this.eventKey.set(key);
  }

  setName(name: string): void {
    this.name.set(name);
  }

  focusField(field: string): void {
    this.lastFocused.set(field as ContentField);
  }

  updateField(field: string, value: string): void {
    this.content.update((c) => ({ ...c, [field]: value }));
  }

  protected setAction(actionKey: string): void {
    this.content.update((c) => ({ ...c, actionKey }));
  }

  insertVariable(key: string): void {
    if (this.readOnly()) return;
    const field = this.lastFocused();
    this.content.update((c) => ({ ...c, [field]: `${c[field] ?? ''}{{${key}}}` }));
  }

  protected placeholder(key: string): string {
    return `{{${key}}}`;
  }

  protected value(field: ContentField): string {
    return this.content()[field] ?? '';
  }

  saveDraft(): void {
    if (this.readOnly() || this.busy()) return;
    this.conflict.set(null);
    this.busy.set(true);

    if (this.isNew) {
      this.service.create({ eventKey: this.eventKey(), name: this.name().trim(), content: this.normalised() }).subscribe({
        next: (created) => {
          this.busy.set(false);
          this.toast.success('Template created as a draft.');
          void this.router.navigate(['/notification-templates', created.id]);
        },
        error: (err: HttpErrorResponse) => this.fail(err, 'Could not create the template.'),
      });
      return;
    }

    this.service.saveDraft(this.routeId, this.normalised(), this.draft()?.revision ?? null).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.busy.set(false);
        this.toast.success('Draft saved. Live notifications are unchanged until you publish.');
      },
      error: (err: HttpErrorResponse) => this.fail(err, 'Could not save the draft.'),
    });
  }

  publish(): void {
    const draft = this.draft();
    if (this.readOnly() || this.busy() || !draft) return;
    this.busy.set(true);
    this.validationErrors.set([]);
    this.service.publish(this.routeId, draft.revision).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.busy.set(false);
        this.toast.success('Published. New notifications use this version.');
      },
      error: (err: HttpErrorResponse) => this.fail(err, 'Could not publish the draft.'),
    });
  }

  preview(): void {
    if (this.isNew) return;
    this.validationErrors.set([]);
    this.service.preview(this.routeId, this.normalised()).subscribe({
      next: (result) => {
        this.validationErrors.set(result.errors);
        this.rendered.set(result.rendered);
        // Trusted only for the sandboxed iframe below: the server validated and encoded it, and the
        // sandbox (no allow-scripts) blocks scripts even if something slipped through.
        this.previewHtml.set(result.rendered ? this.sanitizer.bypassSecurityTrustHtml(result.rendered.emailHtml) : null);
      },
      error: (err: HttpErrorResponse) => this.validationErrors.set([this.problem(err, 'Preview failed.')]),
    });
  }

  protected sendTest(): void {
    if (this.readOnly() || this.isNew) return;
    this.service.sendTest(this.routeId).subscribe({
      next: (result) =>
        result.accepted
          ? this.toast.success(`Test email sent to ${result.recipient}.`)
          : this.toast.error(result.error ?? 'The email provider did not accept the test.'),
      error: (err: HttpErrorResponse) => this.toast.error(this.problem(err, 'Could not send the test email.')),
    });
  }

  restore(versionId: string): void {
    if (this.readOnly() || this.busy()) return;
    this.busy.set(true);
    this.service.restore(this.routeId, versionId).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.busy.set(false);
        this.toast.success('Version copied into a new draft. Publish it to make it live.');
      },
      error: (err: HttpErrorResponse) => this.fail(err, 'Could not restore that version.'),
    });
  }

  private applyDetail(detail: NotificationTemplateDetail): void {
    this.detail.set(detail);
    this.eventKey.set(detail.eventKey);
    this.name.set(detail.name);
    const source = detail.draft ?? detail.activeVersion;
    this.content.set(source ? contentOf(source) : emptyContent());
    this.conflict.set(null);
  }

  /** Empty optional fields go back as null so the server falls back to the in-app copy. */
  private normalised(): NotificationTemplateContent {
    const c = this.content();
    const opt = (v: string | null) => (v && v.trim().length > 0 ? v : null);
    return {
      ...c,
      emailSubject: opt(c.emailSubject), emailHtml: opt(c.emailHtml), emailCss: opt(c.emailCss),
      emailText: opt(c.emailText), trayTitle: opt(c.trayTitle), trayBody: opt(c.trayBody),
    };
  }

  private fail(err: HttpErrorResponse, fallback: string): void {
    this.busy.set(false);
    const message = this.problem(err, fallback);
    if (err.status === 409) {
      this.conflict.set(message);
    } else if (err.status === 422) {
      this.validationErrors.set([message]);
    } else {
      this.toast.error(message);
    }
  }

  private problem(err: HttpErrorResponse, fallback: string): string {
    const body = err.error as { detail?: string; title?: string } | null;
    return body?.detail ?? body?.title ?? fallback;
  }
}

import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
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

const LIVE_PREVIEW_DELAY_MS = 600;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Starting point for an email design. Only what the server-side validator accepts: plain tags, classes, and
 * element/.class rules (inlined when sent). */
const STARTER_CSS = [
  '.wrapper { background-color: #f4f6fb; padding: 24px; font-family: Arial, Helvetica, sans-serif; }',
  '.card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; }',
  '.brand { color: #4f46e5; font-weight: bold; font-size: 13px; letter-spacing: 1px; margin: 0 0 12px; }',
  'h2 { color: #0f172a; font-size: 20px; margin: 0 0 12px; }',
  'p { color: #334155; font-size: 14px; line-height: 1.5; }',
  '.footer { color: #94a3b8; font-size: 12px; margin-top: 24px; }',
].join('\n');

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
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  private tabInitialised = false;
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

  /** Only channels this event really delivers get a tab (built-in events: in-app only). */
  protected readonly visibleTabs = computed(() => {
    const supported = this.event()?.supportedChannels;
    return supported ? this.tabs.filter((t) => supported.includes(t.key)) : this.tabs;
  });

  /** Alternate templates are only used by orchestrator-delivered events. */
  protected readonly creatableEvents = computed(() => this.events().filter((e) => e.customizable));

  /** Seeded copy that no feature raises: editing it changes nothing anyone receives. */
  protected readonly notUsed = computed(() => this.event() !== null && !this.event()!.customizable);

  protected readonly supports = (channel: EditorTab) => this.visibleTabs().some((t) => t.key === channel);

  /** Unsaved edits relative to what the server holds (draft, else live version). */
  readonly isDirty = computed(() => {
    const d = this.detail();
    if (!d) return false;
    const source = d.draft ?? d.activeVersion;
    const baseline = source ? this.normalise(contentOf(source)) : this.normalise(emptyContent());
    return JSON.stringify(this.normalised()) !== JSON.stringify(baseline);
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelLivePreview());
  }

  ngOnInit(): void {
    if (!this.canView()) return;
    this.service.listEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        this.initialiseTab();
      },
      error: () => this.events.set([]),
    });
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
    this.tabInitialised = false;
    this.initialiseTab();
  }

  setName(name: string): void {
    this.name.set(name);
  }

  focusField(field: string): void {
    this.lastFocused.set(field as ContentField);
  }

  updateField(field: string, value: string): void {
    this.content.update((c) => ({ ...c, [field]: value }));
    this.scheduleLivePreview();
  }

  /** Fills a branded HTML + CSS email layout built from the current in-app copy, as a starting point. */
  useStarterLayout(): void {
    if (this.readOnly()) return;
    const c = this.content();
    const html =
      '<div class="wrapper"><div class="card">' +
      '<p class="brand">ONEVO</p>' +
      `<h2>${escapeHtml(c.inAppTitle)}</h2>` +
      `<p>${escapeHtml(c.inAppBody)}</p>` +
      '<p class="footer">You are receiving this because of your notification settings in ONEVO.</p>' +
      '</div></div>';
    this.content.update((current) => ({ ...current, emailHtml: html, emailCss: STARTER_CSS }));
    this.setTab('email');
    this.scheduleLivePreview();
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
    // Publishing sends the saved draft; unsaved edits would be overwritten by the result, so save first.
    if (this.readOnly() || this.busy() || !draft || this.isDirty()) return;
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
    this.cancelLivePreview();
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
    if (this.readOnly() || this.busy() || this.isDirty()) return;
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

  /** Once the preview is open, keep it in step with the editor (debounced; same server renderer as delivery). */
  private scheduleLivePreview(): void {
    if (this.rendered() === null && this.validationErrors().length === 0) return;
    this.cancelLivePreview();
    this.previewTimer = setTimeout(() => {
      this.previewTimer = null;
      this.preview();
    }, LIVE_PREVIEW_DELAY_MS);
  }

  private cancelLivePreview(): void {
    if (this.previewTimer !== null) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
  }

  /** Open on Email when the event sends email - that is where the HTML/CSS design lives. */
  private initialiseTab(): void {
    if (this.tabInitialised || !this.event() || (!this.detail() && !this.isNew)) return;
    this.tabInitialised = true;
    this.setTab(this.supports('email') ? 'email' : (this.visibleTabs()[0]?.key ?? 'in_app'));
  }

  private applyDetail(detail: NotificationTemplateDetail): void {
    this.detail.set(detail);
    this.eventKey.set(detail.eventKey);
    this.name.set(detail.name);
    const source = detail.draft ?? detail.activeVersion;
    this.content.set(source ? contentOf(source) : emptyContent());
    this.conflict.set(null);
    this.initialiseTab();
    if (!this.visibleTabs().some((t) => t.key === this.activeTab())) {
      this.setTab(this.visibleTabs()[0]?.key ?? 'in_app');
    }
  }

  /** Empty optional fields go back as null so the server falls back to the in-app copy. */
  private normalised(): NotificationTemplateContent {
    return this.normalise(this.content());
  }

  private normalise(c: NotificationTemplateContent): NotificationTemplateContent {
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

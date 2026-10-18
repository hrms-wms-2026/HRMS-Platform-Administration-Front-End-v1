import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { NotificationTemplateEditor } from './notification-template-editor';
import { NotificationTemplatesService } from '../../data/notification-templates.service';
import { NotificationTemplateDetail, NotificationTemplateVersion } from '../../data/notification-template.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';

type EditorApi = {
  content(): Record<string, string | null>;
  activeTab(): string;
  setTab(tab: string): void;
  updateField(field: string, value: string): void;
  focusField(field: string): void;
  insertVariable(key: string): void;
  useStarterLayout(): void;
  saveDraft(): void;
  publish(): void;
  preview(): void;
  restore(versionId: string): void;
  conflict(): string | null;
  validationErrors(): string[];
  setEventKey(key: string): void;
  setName(name: string): void;
};

describe('NotificationTemplateEditor', () => {
  let service: Record<string, jest.Mock>;

  const event = {
    key: 'work_approval_requested', module: 'work_management', displayName: 'Work approval requested',
    supportedChannels: ['in_app', 'email', 'tray'], defaultChannels: ['in_app'], requiredChannels: [],
    variables: [{ key: 'actorName', type: 'string', required: true }, { key: 'targetTitle', type: 'string', required: true }],
    recipientRules: ['default'], actionKeys: ['open_related', 'none'], customizable: true,
  };
  const legacyEvent = {
    ...event, key: 'work_sprint_completed', displayName: 'Work sprint completed',
    supportedChannels: ['in_app'], defaultChannels: ['in_app'], customizable: false,
  };

  function version(overrides: Partial<NotificationTemplateVersion> = {}): NotificationTemplateVersion {
    return {
      id: 'ver-2', version: 2, status: 'published', revision: 2, inAppTitle: 'Approval needed',
      inAppBody: '{{actorName}} needs you', emailSubject: null, emailHtml: null, emailCss: null, emailText: null,
      trayTitle: null, trayBody: null, actionKey: 'open_related', createdAt: '2026-10-18T10:00:00Z',
      createdByUserId: null, updatedAt: null, publishedAt: '2026-10-18T10:00:00Z', publishedByUserId: null, ...overrides,
    };
  }

  function detail(draft: NotificationTemplateVersion | null): NotificationTemplateDetail {
    return {
      id: 'tpl-1', code: 'work_approval_requested', eventKey: 'work_approval_requested', name: 'Default', locale: 'en',
      isProductDefault: true, activeVersion: version(), draft,
      versions: [
        ...(draft ? [{ id: draft.id, version: draft.version, status: 'draft', createdAt: draft.createdAt, publishedAt: null, publishedByUserId: null }] : []),
        { id: 'ver-2', version: 2, status: 'published', createdAt: '2026-10-18T10:00:00Z', publishedAt: '2026-10-18T10:00:00Z', publishedByUserId: null },
        { id: 'ver-1', version: 1, status: 'published', createdAt: '2026-10-01T10:00:00Z', publishedAt: '2026-10-01T10:00:00Z', publishedByUserId: null },
      ],
    };
  }

  function setup(opts: { id?: string; draft?: NotificationTemplateVersion | null; permissions?: string[]; eventKey?: string } = {}) {
    const current = { ...detail(opts.draft === undefined ? null : opts.draft), eventKey: opts.eventKey ?? event.key };
    service = {
      listEvents: jest.fn().mockReturnValue(of([event, legacyEvent])),
      get: jest.fn().mockReturnValue(of(current)),
      saveDraft: jest.fn().mockReturnValue(of(current)),
      publish: jest.fn().mockReturnValue(of(current)),
      preview: jest.fn().mockReturnValue(of({ isValid: true, errors: [], sampleVariables: {}, rendered: {
        inAppTitle: 'Approval needed', inAppBody: 'Priya needs you', emailSubject: 'Approval needed',
        emailHtml: '<p>Priya needs you</p>', emailText: 'Priya needs you', trayTitle: 'Approval needed',
        trayBody: 'Priya needs you', actionKey: 'open_related' } })),
      restore: jest.fn().mockReturnValue(of(current)),
      sendTest: jest.fn().mockReturnValue(of({ channel: 'email', recipient: 'a@b.test', accepted: true, error: null })),
      create: jest.fn().mockReturnValue(of({ ...current, id: 'tpl-new' })),
    };
    TestBed.configureTestingModule({
      imports: [NotificationTemplateEditor],
      providers: [
        provideRouter([]),
        { provide: NotificationTemplatesService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: opts.id ?? 'tpl-1' }) } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotificationTemplateEditor);
    TestBed.inject(PermissionStore).setAuthorizationContext({
      userId: 'u1', email: 'admin@example.com', platformRole: 'Platform Super Admin', expiresAt: '', mfaRequired: false,
      permissions: opts.permissions ?? ['platform.templates.read', 'platform.templates.manage'], scopes: {}, entitlements: [],
    });
    fixture.detectChanges();
    return { fixture, editor: fixture.componentInstance as unknown as EditorApi };
  }

  it('edits the draft when one exists, otherwise starts from the live version', () => {
    const withDraft = setup({ draft: version({ id: 'ver-3', version: 3, status: 'draft', revision: 4, inAppTitle: 'Draft title' }) });
    expect(withDraft.editor.content()['inAppTitle']).toBe('Draft title');
    expect(withDraft.fixture.nativeElement.textContent).toContain('Draft');

    TestBed.resetTestingModule();
    const noDraft = setup();
    expect(noDraft.editor.content()['inAppTitle']).toBe('Approval needed');
    expect(noDraft.fixture.nativeElement.textContent).toContain('Published v2');
  });

  it('switches between the Email, In-app and Tray tabs', () => {
    const { fixture, editor } = setup();
    editor.setTab('email');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#emailHtml')).toBeTruthy();
    editor.setTab('tray');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#trayTitle')).toBeTruthy();
  });

  it('inserts a variable placeholder into the last focused field', () => {
    const { editor } = setup();
    editor.focusField('inAppBody');
    editor.insertVariable('targetTitle');

    expect(editor.content()['inAppBody']).toBe('{{actorName}} needs you{{targetTitle}}');
  });

  it('saves a draft with the loaded draft revision, or none when creating the first draft', () => {
    const fresh = setup();
    fresh.editor.updateField('inAppTitle', 'New wording');
    fresh.editor.saveDraft();
    expect(service['saveDraft']).toHaveBeenCalledWith('tpl-1', expect.objectContaining({ inAppTitle: 'New wording' }), null);

    TestBed.resetTestingModule();
    const drafted = setup({ draft: version({ id: 'ver-3', version: 3, status: 'draft', revision: 4 }) });
    drafted.editor.saveDraft();
    expect(service['saveDraft']).toHaveBeenCalledWith('tpl-1', expect.anything(), 4);
  });

  it('reports a revision conflict instead of overwriting', () => {
    const { fixture, editor } = setup({ draft: version({ id: 'ver-3', version: 3, status: 'draft', revision: 4 }) });
    service['saveDraft'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'changed' } })));

    editor.saveDraft();
    fixture.detectChanges();

    expect(editor.conflict()).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Reload');
  });

  it('cannot publish without a draft, and shows validation errors when publishing fails', () => {
    const noDraft = setup();
    noDraft.editor.publish();
    expect(service['publish']).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    const drafted = setup({ draft: version({ id: 'ver-3', version: 3, status: 'draft', revision: 4 }) });
    service['publish'].mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422, error: { detail: "In-app message: variable '{{salary}}' is not available for this event." } })));
    drafted.editor.publish();
    drafted.fixture.detectChanges();

    expect(service['publish']).toHaveBeenCalledWith('tpl-1', 4);
    expect(drafted.fixture.nativeElement.textContent).toContain('salary');
  });

  it('renders the email preview only inside a script-disabled sandboxed iframe', () => {
    const { fixture, editor } = setup();
    editor.preview();
    fixture.detectChanges();

    const frame: HTMLIFrameElement = fixture.nativeElement.querySelector('iframe');
    expect(frame).toBeTruthy();
    expect(frame.getAttribute('sandbox')).toBe('');
    expect(fixture.nativeElement.querySelector('p')?.textContent ?? '').not.toBe('Priya needs you');
    expect(fixture.nativeElement.textContent).toContain('Priya needs you'); // in-app/tray text preview
  });

  it('shows server validation errors from preview before publication', () => {
    const { fixture, editor } = setup();
    service['preview'].mockReturnValue(of({ isValid: false, errors: ["Email CSS: '@import' is not supported."], rendered: null, sampleVariables: {} }));

    editor.preview();
    fixture.detectChanges();

    expect(editor.validationErrors()).toEqual(["Email CSS: '@import' is not supported."]);
    expect(fixture.nativeElement.textContent).toContain('@import');
  });

  it('blocks Publish and Restore while there are unsaved edits, so they are never silently discarded', () => {
    const { fixture, editor } = setup({ draft: version({ id: 'ver-3', version: 3, status: 'draft', revision: 4 }) });

    editor.updateField('inAppTitle', 'Typed but not saved');
    fixture.detectChanges();
    editor.publish();
    editor.restore('ver-1');

    expect(service['publish']).not.toHaveBeenCalled();
    expect(service['restore']).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Save the draft');
    expect(editor.content()['inAppTitle']).toBe('Typed but not saved');
  });

  it('only shows tabs for channels the event actually delivers', () => {
    const { fixture } = setup({ eventKey: 'work_sprint_completed' });
    const tabs = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLElement>).map((t) => t.textContent?.trim());

    expect(tabs).toEqual(['In-app']);
  });

  it('offers only customizable events when creating a template', () => {
    const { fixture } = setup({ id: 'new' });
    const options = Array.from((fixture.nativeElement.querySelector('#eventKey') as HTMLSelectElement).options).map((o) => o.value);

    expect(options).toEqual(['', 'work_approval_requested']);
  });

  it('opens on the Email tab when the event sends email, so the HTML/CSS design is the first thing shown', () => {
    const { editor } = setup();
    expect(editor.activeTab()).toBe('email');
  });

  it('fills a starter HTML + CSS layout from the in-app copy', () => {
    const { fixture, editor } = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Use starter layout');

    editor.useStarterLayout();

    const html = editor.content()['emailHtml'] ?? '';
    const css = editor.content()['emailCss'] ?? '';
    expect(html).toContain('class="card"');
    expect(html).toContain('Approval needed');
    expect(html).toContain('{{actorName}}');
    expect(css).toContain('.card');
    expect(css).not.toMatch(/url\(|@import|<|>/);
  });

  it('refreshes the preview automatically while editing once it has been opened', () => {
    jest.useFakeTimers();
    try {
      const { editor } = setup();
      editor.preview();
      expect(service['preview']).toHaveBeenCalledTimes(1);

      editor.updateField('emailHtml', '<p>{{actorName}} changed</p>');
      editor.updateField('emailHtml', '<p>{{actorName}} changed again</p>');
      jest.advanceTimersByTime(800);

      expect(service['preview']).toHaveBeenCalledTimes(2);
      expect(service['preview']).toHaveBeenLastCalledWith('tpl-1', expect.objectContaining({ emailHtml: '<p>{{actorName}} changed again</p>' }));
    } finally {
      jest.useRealTimers();
    }
  });

  it('says plainly when no feature sends the event', () => {
    const { fixture } = setup({ eventKey: 'work_sprint_completed' });
    expect(fixture.nativeElement.textContent).toContain('No feature sends this notification yet');
  });

  it('restores an old published version into a draft', () => {
    const { editor } = setup();
    editor.restore('ver-1');
    expect(service['restore']).toHaveBeenCalledWith('tpl-1', 'ver-1');
  });

  it('is read-only without manage permission', () => {
    const { fixture } = setup({ permissions: ['platform.templates.read'] });
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .map((b) => b.textContent?.trim());

    expect(buttons).not.toContain('Save Draft');
    expect(buttons).not.toContain('Publish');
    expect(buttons).not.toContain('Send Test');
    expect(buttons).not.toContain('Restore to Draft');
    expect(fixture.nativeElement.querySelector('#emailSubject').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Use starter layout');
  });

  it('creates a template for a registered event and opens it', () => {
    const { editor } = setup({ id: 'new' });
    const router = TestBed.inject(Router);
    const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    editor.setEventKey('work_approval_requested');
    editor.setName('Friendly wording');
    editor.updateField('inAppTitle', 'Hey');
    editor.saveDraft();

    expect(service['create']).toHaveBeenCalledWith(expect.objectContaining({ eventKey: 'work_approval_requested', name: 'Friendly wording' }));
    expect(navigate).toHaveBeenCalledWith(['/notification-templates', 'tpl-new']);
  });
});

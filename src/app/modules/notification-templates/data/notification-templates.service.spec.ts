import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NotificationTemplatesService } from './notification-templates.service';
import { NotificationTemplateContent } from './notification-template.model';
import { environment } from '../../../../environments/environment';

describe('NotificationTemplatesService', () => {
  let service: NotificationTemplatesService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/notification-templates`;

  const content: NotificationTemplateContent = {
    inAppTitle: 'Approval needed',
    inAppBody: '{{actorName}} needs you',
    emailSubject: null,
    emailHtml: null,
    emailCss: null,
    emailText: null,
    trayTitle: null,
    trayBody: null,
    actionKey: 'open_related',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificationTemplatesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists registered events', () => {
    service.listEvents().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/notification-events`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('lists templates filtered by event and search', () => {
    service.list({ eventKey: 'work_approval_requested', search: 'friendly' }).subscribe();
    const req = httpMock.expectOne(`${base}?event_key=work_approval_requested&search=friendly`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('saves a draft with the revision being edited', () => {
    service.saveDraft('tpl-1', content, 3).subscribe();
    const req = httpMock.expectOne(`${base}/tpl-1/draft`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ content, revision: 3 });
    req.flush({});
  });

  it('previews unsaved content', () => {
    service.preview('tpl-1', content, { actorName: 'Priya' }).subscribe();
    const req = httpMock.expectOne(`${base}/tpl-1/preview`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ content, variables: { actorName: 'Priya' } });
    req.flush({ isValid: true, errors: [], rendered: null, sampleVariables: {} });
  });

  it('publishes, restores, test-sends and creates against the admin API', () => {
    service.publish('tpl-1', 2).subscribe();
    const publish = httpMock.expectOne(`${base}/tpl-1/publish`);
    expect(publish.request.body).toEqual({ revision: 2 });
    publish.flush({});

    service.restore('tpl-1', 'ver-1').subscribe();
    httpMock.expectOne(`${base}/tpl-1/versions/ver-1/restore`).flush({});

    service.sendTest('tpl-1').subscribe();
    const test = httpMock.expectOne(`${base}/tpl-1/test`);
    expect(test.request.body).toEqual({ channel: 'email', variables: null });
    test.flush({ channel: 'email', recipient: 'a@b.test', accepted: true, error: null });

    service.create({ eventKey: 'work_approval_requested', name: 'Friendly', content }).subscribe();
    const create = httpMock.expectOne(base);
    expect(create.request.method).toBe('POST');
    create.flush({});
  });
});

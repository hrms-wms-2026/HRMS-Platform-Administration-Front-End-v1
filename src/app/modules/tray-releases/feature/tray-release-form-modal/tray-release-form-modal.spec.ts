import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TrayReleaseFormModal } from './tray-release-form-modal';
import { TrayReleasesService } from '../../data/tray-releases.service';

interface FormModalApi {
  form: FormGroup;
  submit(): void;
}

const modal = (fixture: ComponentFixture<TrayReleaseFormModal>) =>
  fixture.componentInstance as unknown as FormModalApi;

describe('TrayReleaseFormModal', () => {
  let service: { create: jest.Mock };

  function setup() {
    service = { create: jest.fn() };
    TestBed.configureTestingModule({
      imports: [TrayReleaseFormModal],
      providers: [{ provide: TrayReleasesService, useValue: service }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TrayReleaseFormModal);
    fixture.detectChanges();
    return fixture;
  }

  const validValues = {
    version: '1.2.0',
    channel: 'beta',
    downloadUrl: 'https://dl.example.com/onevo-1.2.0.msix',
    sha256: 'A'.repeat(64),
    fileSizeBytes: 1024,
    publisher: 'CN=ONEVO',
    minimumWindowsVersion: '10.0.19041.0',
    minSupportedVersion: '',
    releaseNotes: '',
    isActive: false,
  };

  const submitButton = (fixture: { nativeElement: HTMLElement }) =>
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Create release',
    )!;

  it('is invalid until every required field is valid', () => {
    const fixture = setup();
    const form = modal(fixture).form;
    expect(form.invalid).toBe(true);

    const cases: [string, unknown][] = [
      ['version', '1.2'],
      ['downloadUrl', 'http://insecure.example.com/a.msix'],
      ['sha256', 'xyz'],
      ['fileSizeBytes', 0],
      ['publisher', ''],
      ['minSupportedVersion', '1.x'],
    ];
    for (const [field, bad] of cases) {
      form.reset({ ...validValues });
      form.patchValue({ [field]: bad });
      expect(form.invalid).toBe(true);
    }

    form.reset({ ...validValues });
    expect(form.valid).toBe(true);
  });

  it('submits valid values as inactive by default and emits created', () => {
    const fixture = setup();
    service.create.mockReturnValue(of({}));
    let created = false;
    fixture.componentInstance.created.subscribe(() => (created = true));

    modal(fixture).form.reset({ ...validValues });
    modal(fixture).submit();

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '1.2.0',
        isActive: false,
        minSupportedVersion: null,
        releaseNotes: null,
      }),
    );
    expect(created).toBe(true);
  });

  it('shows a friendly message on 409', () => {
    const fixture = setup();
    service.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    modal(fixture).form.reset({ ...validValues });
    modal(fixture).submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('That version already exists in this channel.');
  });

  it('falls back to the API detail, then a generic message, for other errors', () => {
    const fixture = setup();
    modal(fixture).form.reset({ ...validValues });

    service.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'sha256 must be 64 hex characters.' } })),
    );
    modal(fixture).submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('sha256 must be 64 hex characters.');

    service.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    modal(fixture).submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Could not create the release.');
  });

  it('cancel emits closed without calling create', () => {
    const fixture = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));
    fixture.componentInstance.cancel();
    expect(closed).toBe(true);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('keeps the submit button disabled while the form is invalid', () => {
    const fixture = setup();
    expect(submitButton(fixture).disabled).toBe(true);
  });
});

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RotateServiceKeyModal } from './rotate-service-key-modal';
import { ServiceKeysService } from '../../data/service-keys.service';

describe('RotateServiceKeyModal', () => {
  let serviceKeysService: { rotateKey: jest.Mock };

  function setup() {
    serviceKeysService = { rotateKey: jest.fn() };

    TestBed.configureTestingModule({
      imports: [RotateServiceKeyModal],
      providers: [{ provide: ServiceKeysService, useValue: serviceKeysService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(RotateServiceKeyModal);
    fixture.componentRef.setInput('serviceKey', 'resend');
    fixture.detectChanges();
    return fixture;
  }

  it('renders the service key being rotated', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('resend');
  });

  it('rotates the key with the typed value', () => {
    const fixture = setup();
    serviceKeysService.rotateKey.mockReturnValue(of({}));
    const component = fixture.componentInstance;
    let rotated = false;
    component.rotated.subscribe(() => (rotated = true));

    component['form'].setValue({ apiKey: 'new-secret' });
    component['submit']();

    expect(serviceKeysService.rotateKey).toHaveBeenCalledWith('resend', 'new-secret');
    expect(rotated).toBe(true);
  });

  it('shows the backend error message on failure', () => {
    const fixture = setup();
    serviceKeysService.rotateKey.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'apiKey is required.' } })),
    );
    const component = fixture.componentInstance;
    component['form'].setValue({ apiKey: 'new-secret' });

    component['submit']();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('apiKey is required.');
  });

  it('emits closed on cancel', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component['cancel']();

    expect(closed).toBe(true);
  });
});

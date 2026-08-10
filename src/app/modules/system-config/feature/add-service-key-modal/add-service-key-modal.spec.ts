import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AddServiceKeyModal } from './add-service-key-modal';
import { ServiceKeysService } from '../../data/service-keys.service';

describe('AddServiceKeyModal', () => {
  let serviceKeysService: { listProviders: jest.Mock; create: jest.Mock };

  const providers = [
    { providerKey: 'resend', displayName: 'Resend', configured: false, isActive: true },
    { providerKey: 'sendgrid', displayName: 'SendGrid', configured: true, isActive: true },
  ];

  function setup() {
    serviceKeysService = {
      listProviders: jest.fn().mockReturnValue(of(providers)),
      create: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [AddServiceKeyModal],
      providers: [{ provide: ServiceKeysService, useValue: serviceKeysService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AddServiceKeyModal);
    fixture.detectChanges();
    return fixture;
  }

  it('loads provider options on init', () => {
    const fixture = setup();
    expect(serviceKeysService.listProviders).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Resend');
  });

  it('disables already-configured providers in the dropdown', () => {
    const fixture = setup();
    const options: HTMLOptionElement[] = Array.from(fixture.nativeElement.querySelectorAll('option'));
    const sendgridOption = options.find((o) => o.value === 'sendgrid');
    expect(sendgridOption?.disabled).toBe(true);
  });

  it('creates a service key with the form values', () => {
    const fixture = setup();
    serviceKeysService.create.mockReturnValue(of({}));
    const component = fixture.componentInstance;
    let created = false;
    component.created.subscribe(() => (created = true));

    component['form'].setValue({ serviceKey: 'resend', displayName: 'Resend', apiKey: 'secret' });
    component['submit']();

    expect(serviceKeysService.create).toHaveBeenCalledWith('resend', 'Resend', 'secret');
    expect(created).toBe(true);
  });

  it('shows the backend error detail on conflict', () => {
    const fixture = setup();
    serviceKeysService.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: "A platform service key 'resend' already exists. Use rotate-key to replace its credential." },
          }),
      ),
    );
    const component = fixture.componentInstance;
    component['form'].setValue({ serviceKey: 'resend', displayName: 'Resend', apiKey: 'secret' });

    component['submit']();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('already exists');
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

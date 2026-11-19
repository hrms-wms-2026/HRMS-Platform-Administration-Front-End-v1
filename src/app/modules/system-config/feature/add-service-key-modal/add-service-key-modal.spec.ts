import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AddServiceKeyModal } from './add-service-key-modal';
import { ServiceKeysService } from '../../data/service-keys.service';
import { ServiceKeyProviderOption } from '../../data/service-key.model';

const providers: ServiceKeyProviderOption[] = [
  {
    providerKey: 'resend',
    displayName: 'Resend',
    configured: false,
    isActive: true,
    verificationMode: 'live',
    fields: [
      { name: 'apiKey', label: 'API key', kind: 'secret', required: true, placeholder: null, defaultValue: null, options: [] },
    ],
  },
  {
    providerKey: 'sendgrid',
    displayName: 'SendGrid',
    configured: true,
    isActive: true,
    verificationMode: 'live',
    fields: [
      { name: 'apiKey', label: 'API key', kind: 'secret', required: true, placeholder: null, defaultValue: null, options: [] },
    ],
  },
  {
    providerKey: 'aws_rekognition',
    displayName: 'AWS Rekognition',
    configured: false,
    isActive: true,
    verificationMode: 'live',
    fields: [
      { name: 'accessKeyId', label: 'Access Key ID', kind: 'text', required: true, placeholder: 'AKIA…', defaultValue: null, options: [] },
      { name: 'secretAccessKey', label: 'Secret Access Key', kind: 'secret', required: true, placeholder: null, defaultValue: null, options: [] },
      {
        name: 'region',
        label: 'Region',
        kind: 'select',
        required: true,
        placeholder: null,
        defaultValue: 'eu-west-2',
        options: [{ value: 'eu-west-2', label: 'London' }],
      },
    ],
  },
];

describe('AddServiceKeyModal', () => {
  let serviceKeysService: { listProviders: jest.Mock; create: jest.Mock };

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

  function pick(fixture: ReturnType<typeof setup>, serviceKey: string, displayName: string) {
    fixture.componentInstance['form'].patchValue({ serviceKey, displayName });
    fixture.detectChanges();
  }

  function type(fixture: ReturnType<typeof setup>, id: string, value: string) {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('loads provider options on init', () => {
    const fixture = setup();
    expect(serviceKeysService.listProviders).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Resend');
  });

  it('disables already-configured providers in the dropdown', () => {
    const fixture = setup();
    const options: HTMLOptionElement[] = Array.from(fixture.nativeElement.querySelectorAll('option'));
    expect(options.find((o) => o.value === 'sendgrid')?.disabled).toBe(true);
  });

  it('shows no credential inputs until a provider is picked', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('#add-service-key-apiKey')).toBeNull();
  });

  it('renders the fields of whichever provider is picked', () => {
    const fixture = setup();

    pick(fixture, 'resend', 'Resend');
    expect(fixture.nativeElement.querySelector('#add-service-key-apiKey')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#add-service-key-accessKeyId')).toBeNull();

    pick(fixture, 'aws_rekognition', 'AWS');
    expect(fixture.nativeElement.querySelector('#add-service-key-apiKey')).toBeNull();
    expect(fixture.nativeElement.querySelector('#add-service-key-accessKeyId')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#add-service-key-secretAccessKey')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#add-service-key-region')).not.toBeNull();
  });

  it('cannot submit until the provider’s required fields are filled', () => {
    const fixture = setup();
    pick(fixture, 'aws_rekognition', 'AWS');
    expect(fixture.componentInstance['canSubmit']()).toBe(false);

    type(fixture, 'add-service-key-accessKeyId', 'AKIAEXAMPLE');
    type(fixture, 'add-service-key-secretAccessKey', 'secret-value');

    expect(fixture.componentInstance['canSubmit']()).toBe(true);
  });

  it('creates a single-field key with its field values', () => {
    const fixture = setup();
    serviceKeysService.create.mockReturnValue(of({}));
    let created = false;
    fixture.componentInstance.created.subscribe(() => (created = true));
    pick(fixture, 'resend', 'Resend');
    type(fixture, 'add-service-key-apiKey', 'secret');

    fixture.componentInstance['submit']();

    expect(serviceKeysService.create).toHaveBeenCalledWith('resend', 'Resend', { apiKey: 'secret' });
    expect(created).toBe(true);
  });

  it('creates a multi-field key by sending each field by name, including the default', () => {
    const fixture = setup();
    serviceKeysService.create.mockReturnValue(of({}));
    pick(fixture, 'aws_rekognition', 'AWS');
    type(fixture, 'add-service-key-accessKeyId', ' AKIAEXAMPLE ');
    type(fixture, 'add-service-key-secretAccessKey', 'secret-value');

    fixture.componentInstance['submit']();

    expect(serviceKeysService.create).toHaveBeenCalledWith('aws_rekognition', 'AWS', {
      accessKeyId: 'AKIAEXAMPLE',
      secretAccessKey: 'secret-value',
      region: 'eu-west-2',
    });
  });

  it('does not call the API while required fields are empty', () => {
    const fixture = setup();
    pick(fixture, 'aws_rekognition', 'AWS');

    fixture.componentInstance['submit']();

    expect(serviceKeysService.create).not.toHaveBeenCalled();
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
    pick(fixture, 'resend', 'Resend');
    type(fixture, 'add-service-key-apiKey', 'secret');

    fixture.componentInstance['submit']();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('already exists');
  });

  it('emits closed on cancel', () => {
    const fixture = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.componentInstance['cancel']();

    expect(closed).toBe(true);
  });
});

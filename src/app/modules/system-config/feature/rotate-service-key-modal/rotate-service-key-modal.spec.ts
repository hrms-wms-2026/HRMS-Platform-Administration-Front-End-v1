import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RotateServiceKeyModal } from './rotate-service-key-modal';
import { ServiceKeysService } from '../../data/service-keys.service';
import { ServiceKeyProviderOption } from '../../data/service-key.model';

const apiKeyField = {
  name: 'apiKey',
  label: 'API key',
  kind: 'secret' as const,
  required: true,
  placeholder: null,
  defaultValue: null,
  options: [],
};

const providers: ServiceKeyProviderOption[] = [
  { providerKey: 'resend', displayName: 'Resend', configured: true, isActive: true, verificationMode: 'live', fields: [apiKeyField] },
  { providerKey: 'cloudflare', displayName: 'Cloudflare', configured: true, isActive: true, verificationMode: 'format-only', fields: [apiKeyField] },
  {
    providerKey: 'aws_rekognition',
    displayName: 'AWS Rekognition',
    configured: true,
    isActive: true,
    verificationMode: 'live',
    fields: [
      { name: 'accessKeyId', label: 'Access Key ID', kind: 'text', required: true, placeholder: null, defaultValue: null, options: [] },
      { name: 'secretAccessKey', label: 'Secret Access Key', kind: 'secret', required: true, placeholder: null, defaultValue: null, options: [] },
    ],
  },
];

describe('RotateServiceKeyModal', () => {
  let serviceKeysService: { listProviders: jest.Mock; rotateKey: jest.Mock; verify: jest.Mock };

  function setup(serviceKey = 'resend') {
    serviceKeysService = {
      listProviders: jest.fn().mockReturnValue(of(providers)),
      rotateKey: jest.fn(),
      verify: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [RotateServiceKeyModal],
      providers: [{ provide: ServiceKeysService, useValue: serviceKeysService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(RotateServiceKeyModal);
    fixture.componentRef.setInput('serviceKey', serviceKey);
    fixture.detectChanges();
    return fixture;
  }

  function type(fixture: ReturnType<typeof setup>, id: string, value: string) {
    const input = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('renders the provider being rotated and its fields', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Resend');
    expect(fixture.nativeElement.querySelector('#rotate-service-key-apiKey')).not.toBeNull();
  });

  it('renders every field of a multi-field provider', () => {
    const fixture = setup('aws_rekognition');
    expect(fixture.nativeElement.querySelector('#rotate-service-key-accessKeyId')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#rotate-service-key-secretAccessKey')).not.toBeNull();
  });

  it('does not rotate while a required field is empty', () => {
    const fixture = setup();

    fixture.componentInstance['submit']();

    expect(serviceKeysService.rotateKey).not.toHaveBeenCalled();
  });

  it('rotates a format-only provider without calling verify, then closes', () => {
    const fixture = setup('cloudflare');
    serviceKeysService.rotateKey.mockReturnValue(of({}));
    let rotated = false;
    fixture.componentInstance.rotated.subscribe(() => (rotated = true));
    type(fixture, 'rotate-service-key-apiKey', 'new-secret');

    fixture.componentInstance['submit']();

    expect(serviceKeysService.rotateKey).toHaveBeenCalledWith('cloudflare', { apiKey: 'new-secret' });
    expect(serviceKeysService.verify).not.toHaveBeenCalled();
    expect(rotated).toBe(true);
  });

  it('rotates then verifies a live provider and shows the outcome', () => {
    const fixture = setup('aws_rekognition');
    serviceKeysService.rotateKey.mockReturnValue(of({}));
    serviceKeysService.verify.mockReturnValue(
      of({
        success: true,
        checkedAt: '2026-09-18T00:00:00Z',
        message: 'Connected to Amazon Rekognition.',
        identity: 'onevo-rekognition',
        region: 'eu-west-2',
        service: 'Amazon Rekognition',
      }),
    );
    type(fixture, 'rotate-service-key-accessKeyId', 'AKIAEXAMPLE');
    type(fixture, 'rotate-service-key-secretAccessKey', 'secret-value');

    fixture.componentInstance['submit']();
    fixture.detectChanges();

    expect(serviceKeysService.rotateKey).toHaveBeenCalledWith('aws_rekognition', {
      accessKeyId: 'AKIAEXAMPLE',
      secretAccessKey: 'secret-value',
    });
    expect(serviceKeysService.verify).toHaveBeenCalledWith('aws_rekognition');
    expect(fixture.nativeElement.textContent).toContain('Saved and verified');
    expect(fixture.nativeElement.textContent).toContain('Connected to Amazon Rekognition.');
    expect(fixture.nativeElement.textContent).toContain('onevo-rekognition');
    expect(fixture.nativeElement.textContent).toContain('eu-west-2');
  });

  it('reports a failed provider check without pretending it succeeded', () => {
    const fixture = setup();
    serviceKeysService.rotateKey.mockReturnValue(of({}));
    serviceKeysService.verify.mockReturnValue(
      of({ success: false, checkedAt: '2026-09-18T00:00:00Z', message: 'Resend API rejected the key (401 Unauthorized).' }),
    );
    let rotated = false;
    fixture.componentInstance.rotated.subscribe(() => (rotated = true));
    type(fixture, 'rotate-service-key-apiKey', 'bad-key');

    fixture.componentInstance['submit']();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('provider check failed');
    expect(fixture.nativeElement.textContent).toContain('401 Unauthorized');
    expect(rotated).toBe(false);
  });

  it('shows the backend error message on failure', () => {
    const fixture = setup('cloudflare');
    serviceKeysService.rotateKey.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'API key is required.' } })),
    );
    type(fixture, 'rotate-service-key-apiKey', 'x');

    fixture.componentInstance['submit']();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('API key is required.');
  });

  it('emits closed on cancel', () => {
    const fixture = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.componentInstance['cancel']();

    expect(closed).toBe(true);
  });
});

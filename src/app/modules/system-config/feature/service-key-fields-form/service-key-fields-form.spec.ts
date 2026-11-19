import { TestBed } from '@angular/core/testing';
import { ServiceKeyFieldsForm } from './service-key-fields-form';
import { buildCredentialGroup } from '../../data/service-key-fields';
import { ServiceKeyField } from '../../data/service-key.model';

const fields: ServiceKeyField[] = [
  { name: 'accessKeyId', label: 'Access Key ID', kind: 'text', required: true, placeholder: 'AKIA…', defaultValue: null, options: [] },
  { name: 'secretAccessKey', label: 'Secret Access Key', kind: 'secret', required: true, placeholder: null, defaultValue: null, options: [] },
  {
    name: 'region',
    label: 'Region',
    kind: 'select',
    required: true,
    placeholder: null,
    defaultValue: 'eu-west-2',
    options: [
      { value: 'eu-west-2', label: 'London' },
      { value: 'us-east-1', label: 'N. Virginia' },
    ],
  },
  { name: 'note', label: 'Note', kind: 'text', required: false, placeholder: null, defaultValue: null, options: [] },
];

describe('ServiceKeyFieldsForm', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [ServiceKeyFieldsForm] }).compileComponents();
    const fixture = TestBed.createComponent(ServiceKeyFieldsForm);
    const group = buildCredentialGroup(fields);
    fixture.componentRef.setInput('fields', fields);
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('idPrefix', 'test');
    fixture.detectChanges();
    return { fixture, group };
  }

  it('renders one input per field the backend declared, labelled', () => {
    const { fixture } = setup();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Access Key ID');
    expect(text).toContain('Secret Access Key');
    expect(text).toContain('Region');
    expect(text).toContain('Note (optional)');
  });

  it('masks secret fields and uses a dropdown for select fields', () => {
    const { fixture } = setup();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector<HTMLInputElement>('#test-secretAccessKey')?.type).toBe('password');
    expect(el.querySelector<HTMLInputElement>('#test-accessKeyId')?.type).toBe('text');
    expect(el.querySelectorAll('#test-region option').length).toBe(2);
  });

  it('writes typed values into the form group', () => {
    const { fixture, group } = setup();
    const input = fixture.nativeElement.querySelector('#test-accessKeyId') as HTMLInputElement;

    input.value = 'AKIAEXAMPLE';
    input.dispatchEvent(new Event('input'));

    expect(group.controls['accessKeyId'].value).toBe('AKIAEXAMPLE');
  });
});

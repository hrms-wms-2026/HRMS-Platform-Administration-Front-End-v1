import { buildCredentialGroup, credentialValues } from './service-key-fields';
import { ServiceKeyField } from './service-key.model';

const fields: ServiceKeyField[] = [
  { name: 'accessKeyId', label: 'Access Key ID', kind: 'text', required: true, placeholder: null, defaultValue: null, options: [] },
  { name: 'secretAccessKey', label: 'Secret', kind: 'secret', required: true, placeholder: null, defaultValue: null, options: [] },
  {
    name: 'region',
    label: 'Region',
    kind: 'select',
    required: true,
    placeholder: null,
    defaultValue: 'eu-west-2',
    options: [{ value: 'eu-west-2', label: 'London' }],
  },
  { name: 'note', label: 'Note', kind: 'text', required: false, placeholder: null, defaultValue: null, options: [] },
];

describe('service-key-fields', () => {
  it('builds one control per backend field, seeded with its default', () => {
    const group = buildCredentialGroup(fields);

    expect(Object.keys(group.controls)).toEqual(['accessKeyId', 'secretAccessKey', 'region', 'note']);
    expect(group.controls['region'].value).toBe('eu-west-2');
  });

  it('is invalid until every required field is filled', () => {
    const group = buildCredentialGroup(fields);
    expect(group.valid).toBe(false);

    group.patchValue({ accessKeyId: 'AKIA', secretAccessKey: 'shh' });

    expect(group.valid).toBe(true);
  });

  it('returns trimmed values and omits blanks so the backend can apply its defaults', () => {
    const group = buildCredentialGroup(fields);
    group.patchValue({ accessKeyId: '  AKIA  ', secretAccessKey: 'shh', note: '   ' });

    expect(credentialValues(group)).toEqual({
      accessKeyId: 'AKIA',
      secretAccessKey: 'shh',
      region: 'eu-west-2',
    });
  });
});

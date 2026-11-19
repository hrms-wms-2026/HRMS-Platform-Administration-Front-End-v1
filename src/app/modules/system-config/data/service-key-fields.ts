import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ServiceKeyField } from './service-key.model';

export type CredentialGroup = FormGroup<Record<string, FormControl<string>>>;

/** Builds a form group from the fields the backend declared for a service key. */
export function buildCredentialGroup(fields: ServiceKeyField[]): CredentialGroup {
  const controls: Record<string, FormControl<string>> = {};
  for (const field of fields) {
    controls[field.name] = new FormControl(field.defaultValue ?? '', {
      nonNullable: true,
      validators: field.required ? [Validators.required] : [],
    });
  }
  return new FormGroup(controls);
}

/** Trimmed values keyed by field name, omitting blanks so the backend applies its defaults. */
export function credentialValues(group: CredentialGroup): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(group.getRawValue())) {
    const trimmed = value.trim();
    if (trimmed) {
      values[name] = trimmed;
    }
  }
  return values;
}

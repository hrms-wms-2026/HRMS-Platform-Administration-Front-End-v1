import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CredentialGroup } from '../../data/service-key-fields';
import { ServiceKeyField } from '../../data/service-key.model';

/**
 * Renders the credential inputs a service key needs, straight from the field list the
 * backend returned. It knows nothing about any particular provider.
 */
@Component({
  selector: 'app-service-key-fields-form',
  imports: [ReactiveFormsModule],
  templateUrl: './service-key-fields-form.html',
})
export class ServiceKeyFieldsForm {
  readonly fields = input.required<ServiceKeyField[]>();
  readonly group = input.required<CredentialGroup>();
  readonly idPrefix = input('service-key');

  protected inputType(field: ServiceKeyField): string {
    return field.kind === 'secret' ? 'password' : 'text';
  }
}

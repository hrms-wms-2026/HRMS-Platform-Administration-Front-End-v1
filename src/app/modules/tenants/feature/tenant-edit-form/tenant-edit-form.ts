import { Component, OnInit, input, output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TenantDetail } from '../../data/tenant.model';
import { UpdateTenantPayload } from '../../data/tenant-admin.model';
import { INDUSTRY_OPTIONS } from '../../utils/tenant-options';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-tenant-edit-form',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './tenant-edit-form.html',
})
export class TenantEditForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  readonly tenant = input.required<TenantDetail>();
  readonly saving = input(false);
  readonly submitted = output<UpdateTenantPayload>();
  readonly cancelled = output<void>();

  protected readonly industryOptions = INDUSTRY_OPTIONS;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    industryProfile: ['', Validators.required],
  });

  ngOnInit(): void {
    const tenant = this.tenant();
    this.form.patchValue({
      name: tenant.companyName,
      slug: tenant.slug,
      industryProfile: tenant.industryProfile,
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitted.emit({
      name: value.name.trim(),
      slug: value.slug.trim(),
      industryProfile: value.industryProfile,
    });
  }
}

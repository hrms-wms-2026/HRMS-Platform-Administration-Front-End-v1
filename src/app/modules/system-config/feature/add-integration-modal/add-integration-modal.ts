import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { IntegrationCatalogService } from '../../data/integration-catalog.service';
import { IntegrationConnectionScope } from '../../data/integration-catalog.model';
import { INTEGRATION_CONNECTION_SCOPE_OPTIONS } from '../../data/integration-catalog-options';
import { OAuthAppsService } from '../../data/oauth-apps.service';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-add-integration-modal',
  imports: [ReactiveFormsModule, Button],
  templateUrl: './add-integration-modal.html',
})
export class AddIntegrationModal implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly integrationCatalogService = inject(IntegrationCatalogService);
  private readonly oauthAppsService = inject(OAuthAppsService);

  readonly created = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly oauthProviders = signal<string[]>([]);
  protected readonly scopeOptions = INTEGRATION_CONNECTION_SCOPE_OPTIONS;

  protected readonly form = this.formBuilder.nonNullable.group({
    integrationKey: ['', [Validators.required, Validators.pattern(/^[a-z][a-z0-9_]{0,49}$/)]],
    displayName: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    connectionScope: ['tenant' as IntegrationConnectionScope, Validators.required],
    onevoAppProvider: ['', Validators.required],
    logoUrl: ['', Validators.maxLength(500)],
    isActive: [true],
  });

  ngOnInit(): void {
    this.oauthAppsService.list().subscribe({
      next: (apps) => {
        this.oauthProviders.set(apps.map((app) => app.provider));
        const first = apps[0]?.provider;
        if (first) {
          this.form.patchValue({ onevoAppProvider: first });
        }
      },
      error: () => this.errorMessage.set('Could not load OAuth providers.'),
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();

    this.integrationCatalogService
      .create({
        integrationKey: value.integrationKey.trim().toLowerCase(),
        displayName: value.displayName.trim(),
        description: value.description.trim() || undefined,
        connectionScope: value.connectionScope,
        onevoAppProvider: value.onevoAppProvider,
        logoUrl: value.logoUrl.trim() || undefined,
        isActive: value.isActive,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.created.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(error.error?.detail ?? 'Could not create the integration.');
        },
      });
  }

  protected cancel(): void {
    this.closed.emit();
  }
}

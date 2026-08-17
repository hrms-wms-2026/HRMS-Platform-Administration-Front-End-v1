import { Component, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TenantIntegrationsService } from '../../data/tenant-integrations.service';
import { TenantIntegrationCredential } from '../../data/tenant-integration.model';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-disconnect-tenant-integration-modal',
  imports: [Button],
  templateUrl: './disconnect-tenant-integration-modal.html',
})
export class DisconnectTenantIntegrationModal {
  private readonly tenantIntegrationsService = inject(TenantIntegrationsService);

  readonly credential = input.required<TenantIntegrationCredential>();
  readonly disconnected = output<void>();
  readonly closed = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected confirm(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.tenantIntegrationsService.disconnect(this.credential().id).subscribe({
      next: () => {
        this.loading.set(false);
        this.disconnected.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.detail ?? 'Could not disconnect integration.');
      },
    });
  }

  protected cancel(): void {
    this.closed.emit();
  }
}

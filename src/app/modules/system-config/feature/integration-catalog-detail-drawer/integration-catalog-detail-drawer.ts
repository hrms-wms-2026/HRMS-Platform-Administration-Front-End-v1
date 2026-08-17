import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { IntegrationCatalogService } from '../../data/integration-catalog.service';
import { IntegrationCatalogEntry, IntegrationConnectionScope } from '../../data/integration-catalog.model';
import { INTEGRATION_CONNECTION_SCOPE_OPTIONS } from '../../data/integration-catalog-options';
import { OAuthAppsService } from '../../data/oauth-apps.service';
import { ModuleCatalogService } from '../../../module-catalog/data/module-catalog.service';
import { ModuleCatalogItem } from '../../../module-catalog/data/module-catalog.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { DrawerContentSkeleton } from '../../../../shared/ui/drawer-content-skeleton/drawer-content-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

@Component({
  selector: 'app-integration-catalog-detail-drawer',
  imports: [ReactiveFormsModule, Button, StatusBadge, DrawerContentSkeleton, ErrorBanner],
  templateUrl: './integration-catalog-detail-drawer.html',
})
export class IntegrationCatalogDetailDrawer {
  private readonly formBuilder = inject(FormBuilder);
  private readonly integrationCatalogService = inject(IntegrationCatalogService);
  private readonly oauthAppsService = inject(OAuthAppsService);
  private readonly moduleCatalogService = inject(ModuleCatalogService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  readonly integrationKey = input.required<string>();
  readonly closed = output<void>();
  readonly updated = output<void>();

  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.system_config.manage'),
  );
  protected readonly scopeOptions = INTEGRATION_CONNECTION_SCOPE_OPTIONS;

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly togglingActive = signal(false);
  protected readonly moduleActionKey = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly integration = signal<IntegrationCatalogEntry | null>(null);
  protected readonly oauthProviders = signal<string[]>([]);
  protected readonly modules = signal<ModuleCatalogItem[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    connectionScope: ['tenant' as IntegrationConnectionScope, Validators.required],
    onevoAppProvider: ['', Validators.required],
    logoUrl: ['', Validators.maxLength(500)],
    isActive: [true],
  });

  protected readonly availableModules = computed(() => {
    const linked = new Set(this.integration()?.linkedModuleKeys ?? []);
    return this.modules().filter((module) => module.isActive && !linked.has(module.moduleKey));
  });

  constructor() {
    effect(() => {
      const key = this.integrationKey();
      this.loadIntegration(key);
      this.loadOAuthProviders();
      this.loadModules();
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected save(): void {
    if (this.form.invalid || !this.canManage()) {
      this.form.markAllAsTouched();
      return;
    }

    const key = this.integrationKey();
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);

    this.integrationCatalogService
      .update(key, {
        displayName: value.displayName.trim(),
        description: value.description.trim() || undefined,
        connectionScope: value.connectionScope,
        onevoAppProvider: value.onevoAppProvider,
        logoUrl: value.logoUrl.trim() || undefined,
        isActive: value.isActive,
      })
      .subscribe({
        next: (entry) => {
          this.integration.set(entry);
          this.saving.set(false);
          this.notificationService.success('Integration updated.');
          this.updated.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.errorMessage.set(error.error?.detail ?? 'Could not update the integration.');
        },
      });
  }

  protected toggleActive(): void {
    const entry = this.integration();
    if (!entry || !this.canManage()) {
      return;
    }

    this.togglingActive.set(true);
    this.integrationCatalogService.setActive(entry.integrationKey, !entry.isActive).subscribe({
      next: (updated) => {
        this.integration.set(updated);
        this.form.patchValue({ isActive: updated.isActive });
        this.togglingActive.set(false);
        this.notificationService.success(updated.isActive ? 'Integration activated.' : 'Integration deactivated.');
        this.updated.emit();
      },
      error: () => {
        this.togglingActive.set(false);
        this.notificationService.error('Could not update activation status.');
      },
    });
  }

  protected linkModule(moduleKey: string): void {
    if (!this.canManage()) {
      return;
    }

    this.moduleActionKey.set(moduleKey);
    this.integrationCatalogService.linkModule(this.integrationKey(), moduleKey).subscribe({
      next: () => {
        this.moduleActionKey.set(null);
        this.notificationService.success('Module linked.');
        this.reloadIntegration();
        this.updated.emit();
      },
      error: () => {
        this.moduleActionKey.set(null);
        this.notificationService.error('Could not link module.');
      },
    });
  }

  protected unlinkModule(moduleKey: string): void {
    if (!this.canManage()) {
      return;
    }

    this.moduleActionKey.set(moduleKey);
    this.integrationCatalogService.unlinkModule(this.integrationKey(), moduleKey).subscribe({
      next: () => {
        this.moduleActionKey.set(null);
        this.notificationService.success('Module unlinked.');
        this.reloadIntegration();
        this.updated.emit();
      },
      error: () => {
        this.moduleActionKey.set(null);
        this.notificationService.error('Could not unlink module.');
      },
    });
  }

  private loadIntegration(integrationKey: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.integrationCatalogService.getByKey(integrationKey).subscribe({
      next: (entry) => {
        this.integration.set(entry);
        this.form.patchValue({
          displayName: entry.displayName,
          description: entry.description ?? '',
          connectionScope: entry.connectionScope,
          onevoAppProvider: entry.onevoAppProvider,
          logoUrl: entry.logoUrl ?? '',
          isActive: entry.isActive,
        });
        if (!this.canManage()) {
          this.form.disable();
        } else {
          this.form.enable();
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  private reloadIntegration(): void {
    this.integrationCatalogService.getByKey(this.integrationKey()).subscribe({
      next: (entry) => this.integration.set(entry),
    });
  }

  private loadOAuthProviders(): void {
    this.oauthAppsService.list().subscribe({
      next: (apps) => this.oauthProviders.set(apps.map((app) => app.provider)),
    });
  }

  private loadModules(): void {
    this.moduleCatalogService.list().subscribe({
      next: (modules) => this.modules.set(modules),
    });
  }
}

import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { OAuthAppsService } from '../../data/oauth-apps.service';
import { OAuthApp } from '../../data/oauth-app.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { DrawerContentSkeleton } from '../../../../shared/ui/drawer-content-skeleton/drawer-content-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

@Component({
  selector: 'app-oauth-app-detail-drawer',
  imports: [ReactiveFormsModule, Button, StatusBadge, DrawerContentSkeleton, ErrorBanner],
  templateUrl: './oauth-app-detail-drawer.html',
})
export class OAuthAppDetailDrawer {
  private readonly formBuilder = inject(FormBuilder);
  private readonly oauthAppsService = inject(OAuthAppsService);
  private readonly notificationService = inject(NotificationService);
  protected readonly permissionStore = inject(PermissionStore);

  readonly provider = input.required<string>();
  readonly closed = output<void>();
  readonly updated = output<void>();

  protected readonly canManage = computed(() =>
    this.permissionStore.hasPermission('platform.system_config.manage'),
  );

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly app = signal<OAuthApp | null>(null);

  protected readonly configureForm = this.formBuilder.nonNullable.group({
    appName: [''],
    logoUrl: [''],
    clientId: [''],
    clientSecret: [''],
    privateKey: [''],
  });

  protected readonly rotating = signal(false);
  protected readonly validating = signal(false);

  protected readonly rotateForm = this.formBuilder.nonNullable.group({
    clientSecret: [''],
    privateKey: [''],
  });

  constructor() {
    effect(() => {
      const provider = this.provider();
      this.loadApp(provider);
    });
  }

  private loadApp(provider: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.oauthAppsService.getById(provider).subscribe({
      next: (app) => {
        this.app.set(app);
        this.configureForm.patchValue({
          appName: app.appName ?? '',
          logoUrl: app.logoUrl ?? '',
          clientId: app.clientId ?? '',
        });
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected saveConfiguration(): void {
    this.saving.set(true);
    const raw = this.configureForm.getRawValue();

    this.oauthAppsService
      .configure(this.provider(), {
        appName: raw.appName || undefined,
        logoUrl: raw.logoUrl || undefined,
        clientId: raw.clientId || undefined,
        clientSecret: raw.clientSecret || undefined,
        privateKey: raw.privateKey || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.configureForm.patchValue({ clientSecret: '', privateKey: '' });
          this.notificationService.success('Configuration saved.');
          this.loadApp(this.provider());
          this.updated.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.notificationService.error(error.error?.detail ?? 'Could not save the configuration.');
        },
      });
  }

  protected rotateSecret(): void {
    this.rotating.set(true);
    const { clientSecret, privateKey } = this.rotateForm.getRawValue();

    this.oauthAppsService.rotateSecret(this.provider(), clientSecret, privateKey || undefined).subscribe({
      next: () => {
        this.rotating.set(false);
        this.rotateForm.reset({ clientSecret: '', privateKey: '' });
        this.notificationService.success('Secret rotated.');
        this.loadApp(this.provider());
        this.updated.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.rotating.set(false);
        this.notificationService.error(error.error?.detail ?? 'Could not rotate the secret.');
      },
    });
  }

  protected validateConfiguration(): void {
    this.validating.set(true);
    this.oauthAppsService.validateConfig(this.provider()).subscribe({
      next: (result) => {
        this.validating.set(false);
        if (result.status === 'valid') {
          this.notificationService.success(`Local check: ${result.message}`);
        } else {
          this.notificationService.error(`Local check: ${result.message}`);
        }
        this.loadApp(this.provider());
      },
      error: () => {
        this.validating.set(false);
        this.notificationService.error('Could not validate the configuration.');
      },
    });
  }

  protected toggleActive(): void {
    const current = this.app();
    if (!current) {
      return;
    }
    this.oauthAppsService.setActive(this.provider(), !current.isActive).subscribe({
      next: () => {
        this.notificationService.success(current.isActive ? 'App deactivated.' : 'App activated.');
        this.loadApp(this.provider());
        this.updated.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.notificationService.error(error.error?.detail ?? 'Could not update the app.');
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}

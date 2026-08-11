import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { OAuthAppsService } from '../../data/oauth-apps.service';
import { OAuthApp } from '../../data/oauth-app.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { Loader } from '../../../../shared/ui/loader/loader';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { OAuthAppDetailDrawer } from '../oauth-app-detail-drawer/oauth-app-detail-drawer';

@Component({
  selector: 'app-oauth-apps-list',
  imports: [Loader, ErrorBanner, StatusBadge, DatePipe, OAuthAppDetailDrawer, NgTemplateOutlet],
  templateUrl: './oauth-apps-list.html',
})
export class OAuthAppsList implements OnInit {
  private readonly oauthAppsService = inject(OAuthAppsService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly apps = signal<OAuthApp[]>([]);
  protected readonly selectedProvider = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadApps();
  }

  protected loadApps(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.oauthAppsService.list().subscribe({
      next: (apps) => {
        this.apps.set(apps);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected openDrawer(provider: string): void {
    this.selectedProvider.set(provider);
  }

  protected closeDrawer(): void {
    this.selectedProvider.set(null);
  }

  protected onAppUpdated(): void {
    this.loadApps();
  }
}

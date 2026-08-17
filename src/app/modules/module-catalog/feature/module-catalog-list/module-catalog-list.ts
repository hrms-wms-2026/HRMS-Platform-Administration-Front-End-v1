import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModuleCatalogService } from '../../data/module-catalog.service';
import { ModuleCatalogItem, moduleActiveTone } from '../../data/module-catalog.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-module-catalog-list',
  imports: [RouterLink, TableSkeleton, ErrorBanner, EmptyState, StatusBadge],
  templateUrl: './module-catalog-list.html',
})
export class ModuleCatalogList implements OnInit {
  private readonly moduleCatalogService = inject(ModuleCatalogService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.module_catalog.read'));
  protected readonly moduleActiveTone = moduleActiveTone;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly modules = signal<ModuleCatalogItem[]>([]);

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadModules();
  }

  protected loadModules(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.moduleCatalogService.list().subscribe({
      next: (modules) => {
        this.modules.set(modules);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}

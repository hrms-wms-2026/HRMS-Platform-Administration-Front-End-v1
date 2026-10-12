import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { GlobalAppCatalogService } from '../../data/global-app-catalog.service';
import {
  APPLICATION_CATEGORIES,
  GlobalApplication,
  UpdateGlobalApplicationPayload,
} from '../../data/global-application.model';

type AllocationFilter = 'all' | 'unallocated' | 'allocated';

@Component({
  selector: 'app-global-app-catalog-list',
  imports: [FormsModule, DatePipe, EmptyState, ErrorBanner, TableSkeleton],
  templateUrl: './global-app-catalog-list.html',
})
export class GlobalAppCatalogList implements OnInit {
  private readonly catalog = inject(GlobalAppCatalogService);
  private readonly notifications = inject(NotificationService);
  protected readonly permissions = inject(PermissionStore);

  protected readonly categories = APPLICATION_CATEGORIES;
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly applications = signal<GlobalApplication[]>([]);
  protected readonly selected = signal<GlobalApplication | null>(null);
  protected readonly search = signal('');
  protected readonly allocationFilter = signal<AllocationFilter>('all');

  protected editName = '';
  protected editCategory: string | null = null;
  protected editPublisher = '';
  protected editPublic = true;
  protected editProductive = false;

  protected readonly canView = computed(() => this.permissions.hasPermission('platform.app_catalog.read'));
  protected readonly canManage = computed(() => this.permissions.hasPermission('platform.app_catalog.manage'));
  protected readonly unallocatedCount = computed(() => this.applications().filter((app) => !app.isAllocated).length);
  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const filter = this.allocationFilter();
    return this.applications().filter((app) => {
      if (filter === 'allocated' && !app.isAllocated) return false;
      if (filter === 'unallocated' && app.isAllocated) return false;
      return !query || app.appName.toLowerCase().includes(query) || app.processName.includes(query);
    });
  });

  ngOnInit(): void {
    if (this.canView()) this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.catalog.list().subscribe({
      next: (apps) => {
        this.applications.set(apps);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load detected applications.');
        this.loading.set(false);
      },
    });
  }

  protected select(app: GlobalApplication): void {
    this.selected.set(app);
    this.editName = app.appName;
    this.editCategory = app.category;
    this.editPublisher = app.publisher ?? '';
    this.editPublic = app.isPublic;
    this.editProductive = app.isProductiveDefault;
  }

  protected closeEditor(): void {
    if (!this.saving()) this.selected.set(null);
  }

  protected save(): void {
    const app = this.selected();
    if (!app || !this.canManage()) return;
    const payload: UpdateGlobalApplicationPayload = {
      appName: this.editName.trim(),
      category: this.editCategory || null,
      publisher: this.editPublisher.trim() || null,
      isPublic: this.editPublic,
      isProductiveDefault: this.editProductive,
    };
    this.saving.set(true);
    this.catalog.update(app.id, payload).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.selected.set(updated);
        this.saving.set(false);
        this.notifications.success(updated.isAllocated ? 'Application allocated.' : 'Application saved as unallocated.');
      },
      error: (error) => {
        this.saving.set(false);
        this.notifications.error(error.error?.detail ?? 'Could not save application.');
      },
    });
  }

  protected uploadLogo(event: Event): void {
    const app = this.selected();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!app || !file || !this.canManage()) return;
    this.saving.set(true);
    this.catalog.setLogo(app.id, file).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.selected.set(updated);
        this.saving.set(false);
        this.notifications.success('Application logo updated.');
      },
      error: (error) => {
        this.saving.set(false);
        this.notifications.error(error.error?.detail ?? 'Could not upload logo.');
      },
    });
  }

  protected setFilter(value: string): void {
    this.allocationFilter.set(value as AllocationFilter);
  }

  protected logoUrl(app: GlobalApplication): string {
    return this.catalog.logoUrl(app);
  }

  protected categoryLabel(category: string | null): string {
    return this.categories.find((item) => item.value === category)?.label ?? 'Unallocated';
  }

  private replace(updated: GlobalApplication): void {
    this.applications.update((apps) => apps.map((app) => (app.id === updated.id ? updated : app)));
  }
}

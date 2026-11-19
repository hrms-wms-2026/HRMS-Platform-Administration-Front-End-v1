import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConfigurationTemplatesService } from '../../data/configuration-templates.service';
import { ConfigurationTemplateListResponse } from '../../data/configuration-template.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TableSkeleton } from '../../../../shared/ui/table-skeleton/table-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Button } from '../../../../shared/ui/button/button';
import { Pagination } from '../../../../shared/ui/pagination/pagination';

interface ConfigurationTemplateListFilters {
  templateType: string;
  activeOnly: boolean;
  industryTag: string;
  page: number;
  pageSize: number;
}

@Component({
  selector: 'app-configuration-templates-list',
  imports: [
    RouterLink,
    StatusBadge,
    TableSkeleton,
    ErrorBanner,
    EmptyState,
    Button,
    Pagination,
    FormsModule,
  ],
  templateUrl: './configuration-templates-list.html',
})
export class ConfigurationTemplatesList implements OnInit {
  private readonly templatesService = inject(ConfigurationTemplatesService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.templates.read'));
  protected readonly canManage = computed(() => this.permissionStore.hasPermission('platform.templates.manage'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly templates = signal<ConfigurationTemplateListResponse['items']>([]);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);

  protected readonly templateTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'configuration', label: 'Configuration' },
    { value: 'position_template', label: 'Position Template' },
    { value: 'time_off_policy', label: 'Time Off Policy' },
    { value: 'monitoring_policy', label: 'Monitoring Policy' },
    { value: 'app_allowlist', label: 'App Allowlist' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'data_import_mapping', label: 'Data Import Mapping' },
  ];

  protected readonly filters = signal<ConfigurationTemplateListFilters>({
    templateType: '',
    activeOnly: false,
    industryTag: '',
    page: 1,
    pageSize: 25,
  });

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadTemplates();
  }

  protected loadTemplates(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const f = this.filters();
    this.templatesService
      .list({
        templateType: f.templateType || undefined,
        activeOnly: f.activeOnly,
        industryTag: f.industryTag || undefined,
        page: f.page,
        pageSize: f.pageSize,
      })
      .subscribe({
        next: (response) => {
          this.templates.set(response.items);
          this.totalCount.set(response.totalCount);
          this.page.set(response.page);
          this.pageSize.set(response.pageSize);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Could not load configuration templates. Please try again.');
          this.loading.set(false);
        },
      });
  }

  protected onFilterChange(): void {
    this.filters.update((f) => ({ ...f, page: 1 }));
    this.loadTemplates();
  }

  protected onPageChange(page: number): void {
    this.filters.update((f) => ({ ...f, page }));
    this.loadTemplates();
  }

  protected onPageSizeChange(pageSize: number): void {
    this.filters.update((f) => ({ ...f, page: 1, pageSize }));
    this.loadTemplates();
  }

  protected clearFilters(): void {
    this.filters.set({
      templateType: '',
      activeOnly: false,
      industryTag: '',
      page: 1,
      pageSize: this.pageSize(),
    });
    this.loadTemplates();
  }
}
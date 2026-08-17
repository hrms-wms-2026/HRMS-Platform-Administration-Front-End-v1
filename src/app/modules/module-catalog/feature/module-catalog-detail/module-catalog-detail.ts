import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ModuleCatalogService } from '../../data/module-catalog.service';
import {
  ModuleCatalogDetail as ModuleCatalogDetailModel,
  ModuleFeature,
  ModulePermissionItem,
  moduleActiveTone,
} from '../../data/module-catalog.model';
import { PageDetailSkeleton } from '../../../../shared/ui/page-detail-skeleton/page-detail-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

interface ModuleCatalogDetailView {
  module: ModuleCatalogDetailModel;
  features: ModuleFeature[];
  permissions: ModulePermissionItem[];
}

@Component({
  selector: 'app-module-catalog-detail',
  imports: [RouterLink, DatePipe, PageDetailSkeleton, ErrorBanner, StatusBadge],
  templateUrl: './module-catalog-detail.html',
})
export class ModuleCatalogDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly moduleCatalogService = inject(ModuleCatalogService);

  private readonly moduleKey = this.route.snapshot.paramMap.get('moduleKey')!;

  protected readonly moduleActiveTone = moduleActiveTone;

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly view = signal<ModuleCatalogDetailView | null>(null);

  ngOnInit(): void {
    this.loadModule();
  }

  protected loadModule(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      module: this.moduleCatalogService.getById(this.moduleKey),
      features: this.moduleCatalogService.listFeatures(this.moduleKey),
      permissions: this.moduleCatalogService.listPermissions(this.moduleKey),
    }).subscribe({
      next: (view) => {
        this.view.set(view);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}

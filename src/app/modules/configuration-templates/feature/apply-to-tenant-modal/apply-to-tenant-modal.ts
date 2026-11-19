import { Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { TenantsService } from '../../../tenants/data/tenants.service';
import { TenantListResponse, TenantListItem } from '../../../tenants/data/tenant.model';
import { ConfigurationTemplatesService } from '../../data/configuration-templates.service';
import { Modal } from '../../../../shared/ui/modal/modal';
import { Button } from '../../../../shared/ui/button/button';
import { ListRowsSkeleton } from '../../../../shared/ui/list-rows-skeleton/list-rows-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  status: string;
}

@Component({
  selector: 'app-apply-to-tenant-modal',
  imports: [CommonModule, Modal, Button, ListRowsSkeleton, ErrorBanner, FormsModule],
  templateUrl: './apply-to-tenant-modal.html',
})
export class ApplyToTenantModal implements OnInit {
  private readonly tenantsService = inject(TenantsService);
  private readonly templatesService = inject(ConfigurationTemplatesService);

  readonly open = input.required<boolean>();
  readonly templateId = input.required<string>();
  readonly closed = output<void>();
  readonly applied = output<void>();

  protected readonly search = signal('');
  protected readonly selectedTenantId = signal<string | null>(null);
  protected readonly forceUpdate = signal(false);
  protected readonly loadingTenants = signal(false);
  protected readonly loadingApply = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly tenants = signal<TenantOption[]>([]);
  protected readonly totalTenants = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);

  private readonly searchSubject = new Subject<string>();

  protected readonly canApply = computed(() =>
    this.selectedTenantId() !== null && !this.loadingApply(),
  );

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.page.set(1);
      this.loadTenants(value);
    });

    effect(() => {
      if (this.open()) {
        this.loadTenants(this.search());
      } else {
        this.resetState();
      }
    });
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.searchSubject.next(value);
  }

  private loadTenants(searchValue = ''): void {
    this.loadingTenants.set(true);
    this.errorMessage.set(null);

    this.tenantsService
      .list({
        search: searchValue,
        status: '',
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (response: TenantListResponse) => {
          this.tenants.set(
            response.items.map((t: TenantListItem) => ({
              id: t.id,
              name: t.name,
              slug: t.slug,
              status: t.status,
            })),
          );
          this.totalTenants.set(response.total);
          this.page.set(response.page);
          this.pageSize.set(response.pageSize);
          this.loadingTenants.set(false);
        },
        error: () => {
          this.errorMessage.set('Could not load tenants. Please try again.');
          this.loadingTenants.set(false);
        },
      });
  }

  protected applyToTenant(): void {
    const tenantId = this.selectedTenantId();
    if (!tenantId) return;

    this.loadingApply.set(true);
    this.errorMessage.set(null);

    this.templatesService
      .applyToTenant(tenantId, this.templateId(), this.forceUpdate())
      .subscribe({
        next: (result) => {
          this.loadingApply.set(false);
          if (result.warnings && result.warnings.length > 0) {
            this.errorMessage.set(`Applied with warnings: ${result.warnings.join('; ')}`);
            setTimeout(() => {
              this.applied.emit();
              this.closed.emit();
            }, 3000);
          } else {
            this.applied.emit();
            this.closed.emit();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.loadingApply.set(false);
          this.errorMessage.set(error.error?.detail ?? 'Could not apply template to tenant.');
        },
      });
  }

  protected close(): void {
    this.closed.emit();
  }

  private resetState(): void {
    this.search.set('');
    this.searchSubject.next('');
    this.selectedTenantId.set(null);
    this.forceUpdate.set(false);
    this.tenants.set([]);
    this.totalTenants.set(0);
    this.page.set(1);
    this.errorMessage.set(null);
  }
}
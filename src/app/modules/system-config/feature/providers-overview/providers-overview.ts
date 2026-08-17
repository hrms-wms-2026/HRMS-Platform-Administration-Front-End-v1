import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ProvidersService } from '../../data/providers.service';
import { PlatformProviderCard } from '../../data/provider-card.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { ListRowsSkeleton } from '../../../../shared/ui/list-rows-skeleton/list-rows-skeleton';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

interface ProviderFamilyGroup {
  label: string;
  cards: PlatformProviderCard[];
}

const FAMILY_ORDER: readonly { key: string; label: string }[] = [
  { key: 'oauth_app', label: 'OAuth Apps' },
  { key: 'transactional_email', label: 'Transactional Email' },
  { key: 'infrastructure', label: 'Infrastructure' },
  { key: 'object_storage', label: 'Object Storage' },
  { key: 'ai_verification', label: 'AI Verification' },
  { key: 'payment_gateway', label: 'Payment Gateways' },
];

@Component({
  selector: 'app-providers-overview',
  imports: [ListRowsSkeleton, ErrorBanner, StatusBadge, DatePipe],
  templateUrl: './providers-overview.html',
})
export class ProvidersOverview implements OnInit {
  private readonly providersService = inject(ProvidersService);
  protected readonly permissionStore = inject(PermissionStore);

  protected readonly canView = computed(() => this.permissionStore.hasPermission('platform.system_config.read'));

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly providers = signal<PlatformProviderCard[]>([]);

  protected readonly groupedFamilies = computed<ProviderFamilyGroup[]>(() => {
    const all = this.providers();
    return FAMILY_ORDER.map((family) => ({
      label: family.label,
      cards: all.filter((card) => card.providerFamily === family.key),
    })).filter((group) => group.cards.length > 0);
  });

  ngOnInit(): void {
    if (!this.canView()) {
      return;
    }
    this.loadProviders();
  }

  protected loadProviders(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.providersService.list().subscribe({
      next: (providers) => {
        this.providers.set(providers);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Something went wrong. Please try again.');
        this.loading.set(false);
      },
    });
  }
}

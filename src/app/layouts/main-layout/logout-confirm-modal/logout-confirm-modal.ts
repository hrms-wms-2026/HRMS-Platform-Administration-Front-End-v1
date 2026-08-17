import { Component, computed, input, output } from '@angular/core';
import { Button } from '../../../shared/ui/button/button';
import { StatusBadge } from '../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-logout-confirm-modal',
  imports: [Button, StatusBadge],
  templateUrl: './logout-confirm-modal.html',
  styleUrl: './logout-confirm-modal.css',
})
export class LogoutConfirmModal {
  readonly email = input<string | null>(null);
  readonly platformRole = input<string | null>(null);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly initials = computed(() => {
    const email = this.email();
    return email ? email.slice(0, 2).toUpperCase() : '';
  });

  confirm(): void {
    this.confirmed.emit();
  }

  cancel(): void {
    this.cancelled.emit();
  }
}

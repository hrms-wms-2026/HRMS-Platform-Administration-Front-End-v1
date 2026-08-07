import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionService } from '../../../core/auth/session.service';
import { Button } from '../../../shared/ui/button/button';
import { StatusBadge } from '../../../shared/ui/status-badge/status-badge';
import { LogoutConfirmModal } from '../logout-confirm-modal/logout-confirm-modal';

@Component({
  selector: 'app-navbar',
  imports: [Button, StatusBadge, RouterLink, LogoutConfirmModal],
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);

  protected readonly currentUser = this.sessionService.currentUser;
  protected readonly showLogoutConfirm = signal(false);

  protected onLogoutClicked(): void {
    this.showLogoutConfirm.set(true);
  }

  protected onLogoutCancelled(): void {
    this.showLogoutConfirm.set(false);
  }

  protected onLogoutConfirmed(): void {
    this.showLogoutConfirm.set(false);
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/auth/login'),
      error: () => this.router.navigateByUrl('/auth/login'),
    });
  }
}

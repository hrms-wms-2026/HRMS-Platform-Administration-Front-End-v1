import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionService } from '../../../core/auth/session.service';
import { StatusBadge } from '../../../shared/ui/status-badge/status-badge';
import { LogoutConfirmModal } from '../logout-confirm-modal/logout-confirm-modal';

@Component({
  selector: 'app-profile-menu',
  imports: [RouterLink, StatusBadge, LogoutConfirmModal],
  templateUrl: './profile-menu.html',
})
export class ProfileMenu {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly currentUser = this.sessionService.currentUser;
  protected readonly initials = computed(() => {
    const email = this.currentUser()?.email;
    return email ? email.slice(0, 2).toUpperCase() : '?';
  });

  protected readonly open = signal(false);
  protected readonly showLogoutConfirm = signal(false);

  protected toggleOpen(): void {
    this.open.set(!this.open());
  }

  protected closeMenu(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }

  protected onLogoutClicked(): void {
    this.closeMenu();
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

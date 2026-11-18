import { Component, computed, inject, input } from '@angular/core';
import { ProfileMenu } from '../profile-menu/profile-menu';
import { Breadcrumb } from '../breadcrumb/breadcrumb';
import { MobileNavService } from '../mobile-nav.service';
import { SupportBell } from '../support-bell/support-bell';
import { PermissionStore } from '../../../core/permissions/permission.store';

@Component({
  selector: 'app-navbar',
  imports: [ProfileMenu, Breadcrumb, SupportBell],
  templateUrl: './navbar.html',
})
export class Navbar {
  protected readonly mobileNav = inject(MobileNavService);

  /**
   * F-02: while MFA enrollment is pending only the logo and the profile menu (sign-out) render,
   * so the admin cannot navigate away from MFA setup but is never trapped.
   */
  readonly restricted = input(false);

  private readonly permissionStore = inject(PermissionStore);

  /** The live support bell is for support staff only; everyone else keeps the placeholder. */
  protected readonly showSupportBell = computed(() => this.permissionStore.hasPermission('platform.support.read'));
}

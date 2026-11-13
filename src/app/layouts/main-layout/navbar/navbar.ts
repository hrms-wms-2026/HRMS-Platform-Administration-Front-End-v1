import { Component, computed, inject } from '@angular/core';
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
  private readonly permissionStore = inject(PermissionStore);

  /** The live support bell is for support staff only; everyone else keeps the placeholder. */
  protected readonly showSupportBell = computed(() => this.permissionStore.hasPermission('platform.support.read'));
}

import { Component, inject, input } from '@angular/core';
import { ProfileMenu } from '../profile-menu/profile-menu';
import { Breadcrumb } from '../breadcrumb/breadcrumb';
import { MobileNavService } from '../mobile-nav.service';

@Component({
  selector: 'app-navbar',
  imports: [ProfileMenu, Breadcrumb],
  templateUrl: './navbar.html',
})
export class Navbar {
  protected readonly mobileNav = inject(MobileNavService);

  /**
   * F-02: while MFA enrollment is pending only the logo and the profile menu (sign-out) render,
   * so the admin cannot navigate away from MFA setup but is never trapped.
   */
  readonly restricted = input(false);
}

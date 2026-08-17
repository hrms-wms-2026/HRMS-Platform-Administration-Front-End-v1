import { Component, inject } from '@angular/core';
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
}

import { Component } from '@angular/core';
import { ProfileMenu } from '../profile-menu/profile-menu';
import { Breadcrumb } from '../breadcrumb/breadcrumb';

@Component({
  selector: 'app-navbar',
  imports: [ProfileMenu, Breadcrumb],
  templateUrl: './navbar.html',
})
export class Navbar {}

import { Component } from '@angular/core';
import { ProfileMenu } from '../profile-menu/profile-menu';

@Component({
  selector: 'app-navbar',
  imports: [ProfileMenu],
  templateUrl: './navbar.html',
})
export class Navbar {}
